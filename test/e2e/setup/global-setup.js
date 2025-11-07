const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Global setup for Playwright tests
 * Starts Hardhat local node and deploys test contracts
 */
module.exports = async function globalSetup() {
  console.log('🚀 Starting Hardhat local node...');
  
  // Start Hardhat node
  const hardhatProcess = spawn('npx', ['hardhat', 'node'], {
    cwd: path.resolve(__dirname, '../../..'),
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Store PID for cleanup
  const pidFile = path.resolve(__dirname, '../../../.hardhat-node.pid');
  fs.writeFileSync(pidFile, hardhatProcess.pid.toString());
  
  // Wait for Hardhat node to be ready
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Hardhat node failed to start in time'));
    }, 30000);
    
    hardhatProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Started HTTP and WebSocket JSON-RPC server')) {
        clearTimeout(timeout);
        console.log('✅ Hardhat node started successfully');
        resolve();
      }
    });
    
    hardhatProcess.stderr.on('data', (data) => {
      console.error('Hardhat error:', data.toString());
    });
    
    hardhatProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    
    hardhatProcess.on('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Hardhat node exited with code ${code}`));
      }
    });
  });
  
  // Give it a moment to fully initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('🔧 Deploying test contracts...');
  
  // Deploy contracts using Hardhat
  const deployProcess = spawn('npx', ['hardhat', 'run', 'test/e2e/setup/deploy-contracts.js', '--network', 'localhost'], {
    cwd: path.resolve(__dirname, '../../..'),
    stdio: 'inherit'
  });
  
  await new Promise((resolve, reject) => {
    deployProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Test contracts deployed');
        resolve();
      } else {
        reject(new Error(`Contract deployment failed with code ${code}`));
      }
    });
    
    deployProcess.on('error', reject);
  });
  
  console.log('✅ Global setup complete\n');
};
