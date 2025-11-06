#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const requireFromString = require('require-from-string');
const solc = require('solc');

const rootDir = path.resolve(__dirname, '..');
const contractDir = path.join(rootDir, 'contracts');
const contractFile = path.join(contractDir, 'AddressClaim.sol');

if (!fs.existsSync(contractFile)) {
  console.error('Contract file not found at', contractFile);
  process.exit(1);
}

const source = fs.readFileSync(contractFile, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'AddressClaim.sol': {
      content: source
    }
  },
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

const TARGET_SOLC_VERSION = '0.8.23';
const FALLBACK_REMOTE_SOLC_VERSION = 'v0.8.23+commit.f704f362';
const SOLC_RELEASES_URL = 'https://binaries.soliditylang.org/bin/list.json';
const SOLC_BIN_BASE_URL = 'https://binaries.soliditylang.org/bin/';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode } = res;
        if (statusCode !== 200) {
          res.resume();
          reject(new Error(`Request to ${url} failed with status code ${statusCode}`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });
        res.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
      })
      .on('error', (error) => {
        reject(new Error(`Failed to request ${url}: ${error.message || error}`));
      });
  });
}

async function fetchJson(url) {
  try {
    const rawData = await fetchText(url);
    return JSON.parse(rawData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON from ${url}: ${error.message || error}`);
    }
    throw error;
  }
}

function extractVersionFromPath(assetPath) {
  if (typeof assetPath !== 'string') {
    return null;
  }

  const prefix = 'soljson-';
  const suffix = '.js';
  if (!assetPath.startsWith(prefix) || !assetPath.endsWith(suffix)) {
    return null;
  }

  return assetPath.slice(prefix.length, -suffix.length);
}

async function resolveCompilerVersion(preferredVersion) {
  if (!preferredVersion) {
    return FALLBACK_REMOTE_SOLC_VERSION;
  }

  if (preferredVersion.includes('+commit.')) {
    return preferredVersion.startsWith('v') ? preferredVersion : `v${preferredVersion}`;
  }

  try {
    const metadata = await fetchJson(SOLC_RELEASES_URL);
    const releasePath = metadata?.releases?.[preferredVersion];
    if (releasePath) {
      const version = extractVersionFromPath(releasePath);
      if (version) {
        return version;
      }
    }

    const availableReleases = metadata?.releases ? Object.entries(metadata.releases) : [];
    const fallbackRelease = availableReleases
      .filter(([version]) => version.startsWith('0.8.'))
      .sort((a, b) => {
        const [majorA, minorA, patchA] = a[0].split('.').map(Number);
        const [majorB, minorB, patchB] = b[0].split('.').map(Number);
        return majorB - majorA || minorB - minorA || patchB - patchA;
      })
      .map(([, asset]) => extractVersionFromPath(asset))
      .find(Boolean);

    if (fallbackRelease) {
      console.warn(`Falling back to Solidity compiler ${fallbackRelease}`);
      return fallbackRelease;
    }
  } catch (error) {
    console.warn(`Unable to resolve Solidity release metadata: ${error.message || error}`);
  }

  console.warn(`Using fallback Solidity compiler ${FALLBACK_REMOTE_SOLC_VERSION}`);
  return FALLBACK_REMOTE_SOLC_VERSION;
}

async function loadRemoteCompiler(resolvedVersion) {
  const assetUrl = `${SOLC_BIN_BASE_URL}soljson-${resolvedVersion}.js`;

  try {
    const source = await fetchText(assetUrl);
    const soljson = requireFromString(source, `soljson-${resolvedVersion}.js`);

    if (typeof soljson.addFunction === 'function') {
      const originalAddFunction = soljson.addFunction.bind(soljson);
      soljson.addFunction = (func, signature) => originalAddFunction(func, signature || 'viii');
    }

    if (typeof soljson.removeFunction === 'function') {
      soljson.removeFunction = soljson.removeFunction.bind(soljson);
    }

    if (typeof solc.setupMethods === 'function') {
      return solc.setupMethods(soljson);
    }

    if (soljson && typeof soljson.compile === 'function') {
      return soljson;
    }

    throw new Error('Downloaded compiler is missing the expected compile interface.');
  } catch (error) {
    throw new Error(`Error retrieving binary from ${assetUrl}: ${error.message || error}`);
  }
}

async function loadCompiler() {
  try {
    const version = typeof solc.version === 'function' ? solc.version() : null;
    if (version && version.startsWith('0.8')) {
      return solc;
    }
  } catch (error) {
    // Ignore and attempt remote load
  }

  const resolvedVersion = await resolveCompilerVersion(TARGET_SOLC_VERSION);
  console.log(`Loading Solidity compiler ${resolvedVersion}...`);

  try {
    return await loadRemoteCompiler(resolvedVersion);
  } catch (error) {
    throw new Error(`Failed to load Solidity compiler ${resolvedVersion}: ${error.message || error}`);
  }
}

async function main() {
  const compiler = await loadCompiler();

  let compiled;
  try {
    compiled = JSON.parse(compiler.compile(JSON.stringify(input)));
  } catch (error) {
    throw new Error(`Compilation failed: ${error.message || error}`);
  }

  if (compiled.errors && compiled.errors.length > 0) {
    compiled.errors.forEach((err) => {
      const message = err.formattedMessage || err.message || 'Unknown compilation message';
      if (err.severity === 'error') {
        console.error(message.trim());
      } else {
        console.warn(message.trim());
      }
    });

    const hasError = compiled.errors.some((err) => err.severity === 'error');
    if (hasError) {
      throw new Error('Compilation produced errors. See details above.');
    }
  }

  const contractOutput = compiled.contracts?.['AddressClaim.sol']?.AddressClaim;

  if (!contractOutput) {
    throw new Error('AddressClaim contract artifact not found in compilation output.');
  }

  const bytecode = contractOutput.evm?.bytecode?.object;

  if (!bytecode || bytecode.length === 0) {
    throw new Error('Bytecode not generated for AddressClaim contract.');
  }

  const prefixedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;

  const buildDir = path.join(rootDir, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const artifactPath = path.join(buildDir, 'AddressClaim.json');
  const artifact = {
    contractName: 'AddressClaim',
    abi: contractOutput.abi || [],
    bytecode: prefixedBytecode
  };

  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

  const envCandidates = ['.env.local', '.env'].map((file) => path.join(rootDir, file));
  let envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
  if (!envPath) {
    envPath = envCandidates[0];
  }

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const existingLines = envContent ? envContent.split(/\r?\n/) : [];
  const filteredLines = existingLines.filter((line) => !line.startsWith('VITE_ADDRESS_CLAIM_BYTECODE='));

  if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1] !== '') {
    filteredLines.push('');
  }

  filteredLines.push(`VITE_ADDRESS_CLAIM_BYTECODE=${prefixedBytecode}`);

  const newEnvContent = `${filteredLines.join('\n').replace(/\n+$/, '')}\n`;
  fs.writeFileSync(envPath, newEnvContent, 'utf8');

  console.log(`✓ Contract compiled: ${path.relative(rootDir, artifactPath)}`);
  console.log(`✓ Updated ${path.relative(rootDir, envPath)} with VITE_ADDRESS_CLAIM_BYTECODE`);
  console.log(`Bytecode length: ${prefixedBytecode.length} characters`);
}

main().catch((error) => {
  console.error(error.message || error);
  if (error.message && error.message.includes('Failed to load Solidity compiler')) {
    console.error('Ensure you have network access or install solc@0.8.x locally.');
  }
  process.exit(1);
});
