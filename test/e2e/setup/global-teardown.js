const fs = require('fs');
const path = require('path');

/**
 * Global teardown for Playwright tests
 * Stops Hardhat local node
 */
module.exports = async function globalTeardown() {
  console.log('\n🧹 Cleaning up Hardhat node...');
  
  const pidFile = path.resolve(__dirname, '../../../.hardhat-node.pid');
  
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
      process.kill(pid, 'SIGTERM');
      fs.unlinkSync(pidFile);
      console.log('✅ Hardhat node stopped');
    } catch (error) {
      console.warn('⚠️  Could not stop Hardhat node:', error.message);
    }
  }
  
  console.log('✅ Global teardown complete');
};
