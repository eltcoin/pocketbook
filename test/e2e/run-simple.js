#!/usr/bin/env node

/**
 * Simple test runner for basic Playwright tests
 * Runs tests without Hardhat setup
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Playwright test runner...\n');

// Use the simple config
const configPath = path.resolve(__dirname, '../playwright.config.simple.js');

try {
  // Run Playwright tests with simple config
  execSync(`npx playwright test --config=${configPath}`, {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit'
  });
  
  console.log('\n✅ Tests completed successfully');
} catch (error) {
  console.error('\n❌ Tests failed');
  process.exit(1);
}
