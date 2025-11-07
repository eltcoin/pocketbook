const fs = require('fs');
const path = require('path');

// Constants
const MOCK_SIGNATURE_LENGTH = 130; // 65 bytes * 2 hex chars (r + s + v)

/**
 * Load deployment information from fixtures
 */
function loadDeployment() {
  const deploymentPath = path.resolve(__dirname, '../fixtures/deployment.json');
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment file not found. Did global setup run?');
  }
  
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

/**
 * Get MetaMask-compatible wallet configuration
 */
function getWalletConfig(accountIndex = 0) {
  const deployment = loadDeployment();
  const account = deployment.testAccounts[accountIndex];
  
  return {
    address: account.address,
    privateKey: account.privateKey,
    chainId: deployment.chainId,
    rpcUrl: deployment.networkUrl
  };
}

/**
 * Get contract deployment information
 */
function getContractInfo() {
  const deployment = loadDeployment();
  
  return {
    address: deployment.contractAddress,
    chainId: deployment.chainId,
    rpcUrl: deployment.networkUrl
  };
}

/**
 * Setup MetaMask in Playwright page
 * Note: This is a simulation since we can't actually use MetaMask extension in tests
 * We'll need to mock wallet connections or use a custom provider
 */
async function setupWallet(page, accountIndex = 0) {
  const wallet = getWalletConfig(accountIndex);
  const contract = getContractInfo();
  
  // Inject ethereum provider mock
  await page.addInitScript(({ wallet, contract }) => {
    // Create a mock ethereum provider
    window.ethereum = {
      isMetaMask: true,
      selectedAddress: wallet.address,
      chainId: `0x${contract.chainId.toString(16)}`,
      networkVersion: contract.chainId.toString(),
      
      request: async ({ method, params }) => {
        console.log('Mock Ethereum request:', method, params);
        
        switch (method) {
          case 'eth_requestAccounts':
            return [wallet.address];
          
          case 'eth_accounts':
            return [wallet.address];
          
          case 'eth_chainId':
            return `0x${contract.chainId.toString(16)}`;
          
          case 'wallet_switchEthereumChain':
            return null;
          
          case 'wallet_addEthereumChain':
            return null;
          
          case 'personal_sign':
            // Simple mock signature - in real tests, we'd need proper signing
            return '0x' + '0'.repeat(MOCK_SIGNATURE_LENGTH);
          
          case 'eth_sendTransaction':
            // Mock transaction hash
            return '0x' + Math.random().toString(16).substring(2, 66);
          
          default:
            throw new Error(`Unsupported method: ${method}`);
        }
      },
      
      on: (event, callback) => {
        console.log('Mock Ethereum event listener:', event);
        // Store callbacks for later triggering if needed
        if (!window._ethereumCallbacks) {
          window._ethereumCallbacks = {};
        }
        if (!window._ethereumCallbacks[event]) {
          window._ethereumCallbacks[event] = [];
        }
        window._ethereumCallbacks[event].push(callback);
      },
      
      removeListener: (event, callback) => {
        console.log('Mock Ethereum remove listener:', event);
      }
    };
  }, { wallet, contract });
}

/**
 * Wait for element to be visible and stable
 */
async function waitForElement(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
  // Wait a bit for any animations
  await page.waitForTimeout(300);
}

/**
 * Take a screenshot with a descriptive name
 */
async function takeScreenshot(page, name, testInfo) {
  const screenshotsDir = path.resolve(__dirname, '../../../screenshots/e2e');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(screenshotsDir, filename);
  
  await page.screenshot({ path: filepath, fullPage: true });
  
  // Also attach to test report if testInfo is provided
  if (testInfo) {
    await testInfo.attach(name, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
  }
  
  return filepath;
}

/**
 * Connect wallet in the UI
 */
async function connectWallet(page) {
  // Click connect wallet button
  await page.click('button:has-text("Connect Wallet")');
  
  // Wait for connection to complete
  await page.waitForSelector('text=/0x[a-fA-F0-9]{40}/', { timeout: 5000 });
  
  // Small delay to ensure state updates
  await page.waitForTimeout(500);
}

/**
 * Navigate to a specific view
 */
async function navigateTo(page, view) {
  const viewMap = {
    explorer: 'text=Explorer',
    claim: 'text=Claim',
    admin: 'text=Admin'
  };
  
  if (viewMap[view]) {
    await page.click(viewMap[view]);
    await page.waitForTimeout(500);
  }
}

/**
 * Toggle theme (light/dark mode)
 */
async function toggleTheme(page) {
  // Find and click the theme toggle button
  await page.click('button[aria-label*="theme"], button:has-text("☀️"), button:has-text("🌙")');
  await page.waitForTimeout(300);
}

module.exports = {
  loadDeployment,
  getWalletConfig,
  getContractInfo,
  setupWallet,
  waitForElement,
  takeScreenshot,
  connectWallet,
  navigateTo,
  toggleTheme
};
