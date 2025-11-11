#!/usr/bin/env node

const path = require('path');
const { compileContract } = require('./utils/contractCompiler');

const rootDir = path.resolve(__dirname, '..');

compileContract({
  contractFile: path.join('contracts', 'AddressClaim.sol'),
  contractName: 'AddressClaim',
  artifactFileName: 'AddressClaim.json',
  bytecodeEnvVar: 'VITE_ADDRESS_CLAIM_BYTECODE',
  rootDir
})
  .catch((error) => {
    console.error(error.message || error);
    if (error.message && error.message.includes('Failed to load Solidity compiler')) {
      console.error('Ensure you have network access or install solc@0.8.x locally.');
    }
    process.exit(1);
  });
