#!/usr/bin/env node

const path = require('path');
const { compileContract } = require('./utils/contractCompiler.cjs');
const { generateBip39Vocabulary } = require('./utils/generateBip39Vocabulary.cjs');

const rootDir = path.resolve(__dirname, '..');

async function main() {
  const updated = generateBip39Vocabulary({ rootDir });
  if (updated) {
    console.log('✓ Generated contracts/generated/Bip39Vocabulary.sol');
  }

  await compileContract({
    contractFile: path.join('contracts', 'AddressHandleRegistry.sol'),
    contractName: 'AddressHandleRegistry',
    artifactFileName: 'AddressHandleRegistry.json',
    bytecodeEnvVar: 'VITE_HANDLE_REGISTRY_BYTECODE',
    rootDir
  });

  await compileContract({
    contractFile: path.join('contracts', 'generated', 'Bip39Vocabulary.sol'),
    contractName: 'Bip39Vocabulary',
    artifactFileName: 'Bip39Vocabulary.json',
    bytecodeEnvVar: 'VITE_BIP39_VOCABULARY_BYTECODE',
    rootDir
  });
}

main().catch((error) => {
  console.error(error.message || error);
  if (error.message && error.message.includes('Failed to load Solidity compiler')) {
    console.error('Ensure you have network access or install solc@0.8.x locally.');
  }
  process.exit(1);
});
