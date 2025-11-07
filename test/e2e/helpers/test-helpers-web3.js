const fs = require('fs');
const path = require('path');

// Constants
const MOCK_SIGNATURE_LENGTH = 130; // 65 bytes * 2 hex chars (r + s + v)

// Check if we should use real Web3 or mock
const USE_REAL_WEB3 = process.env.USE_REAL_WEB3 === 'true';

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
 * Setup Web3 provider - can be real or mock
 */
async function setupWallet(page, accountIndex = 0) {
  const wallet = getWalletConfig(accountIndex);
  const contract = getContractInfo();
  
  if (USE_REAL_WEB3) {
    // Inject real Web3 provider using ethers.js
    await page.addInitScript(async ({ wallet, contract }) => {
      // Import ethers from CDN
      const ethersScript = document.createElement('script');
      ethersScript.src = 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js';
      document.head.appendChild(ethersScript);
      
      await new Promise(resolve => {
        ethersScript.onload = resolve;
      });
      
      // Create real provider
      const provider = new ethers.providers.JsonRpcProvider(contract.rpcUrl);
      const signer = new ethers.Wallet(wallet.privateKey, provider);
      
      // Create ethereum object that mimics MetaMask
      window.ethereum = {
        isMetaMask: true,
        selectedAddress: wallet.address,
        chainId: `0x${contract.chainId.toString(16)}`,
        networkVersion: contract.chainId.toString(),
        
        // Real provider methods
        request: async ({ method, params }) => {
          console.log('Real Web3 request:', method, params);
          
          switch (method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
              return [wallet.address];
            
            case 'eth_chainId':
              return `0x${contract.chainId.toString(16)}`;
            
            case 'eth_blockNumber':
              return await provider.getBlockNumber();
            
            case 'eth_getBalance':
              const balance = await provider.getBalance(params[0]);
              return balance.toHexString();
            
            case 'personal_sign':
              // Real signature using ethers
              const signature = await signer.signMessage(params[0]);
              return signature;
            
            case 'eth_sendTransaction':
              // Real transaction
              const tx = await signer.sendTransaction(params[0]);
              return tx.hash;
            
            case 'eth_call':
              return await provider.call(params[0]);
            
            case 'eth_estimateGas':
              const estimate = await provider.estimateGas(params[0]);
              return estimate.toHexString();
            
            case 'wallet_switchEthereumChain':
            case 'wallet_addEthereumChain':
              return null;
            
            default:
              throw new Error(`Unsupported method: ${method}`);
          }
        },
        
        on: (event, callback) => {
          if (!window._ethereumCallbacks) {
            window._ethereumCallbacks = {};
          }
          if (!window._ethereumCallbacks[event]) {
            window._ethereumCallbacks[event] = [];
          }
          window._ethereumCallbacks[event].push(callback);
        },
        
        removeListener: (event, callback) => {
          // Remove listener implementation
        }
      };
    }, { wallet, contract });
  } else {
    // Use mock provider (original implementation)
    await page.addInitScript(({ wallet, contract }) => {
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
              return '0x' + '0'.repeat(MOCK_SIGNATURE_LENGTH);
            
            case 'eth_sendTransaction':
              return '0x' + Math.random().toString(16).substring(2, 66);
            
            default:
              throw new Error(`Unsupported method: ${method}`);
          }
        },
        
        on: (event, callback) => {
          if (!window._ethereumCallbacks) {
            window._ethereumCallbacks = {};
          }
          if (!window._ethereumCallbacks[event]) {
            window._ethereumCallbacks[event] = [];
          }
          window._ethereumCallbacks[event].push(callback);
        },
        
        removeListener: (event, callback) => {
          // Remove listener
        }
      };
    }, { wallet, contract });
  }
}

/**
 * Wait for element to be visible and stable
 */
async function waitForElement(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
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
  await page.click('button:has-text("Connect Wallet")');
  await page.waitForSelector('text=/0x[a-fA-F0-9]{40}/', { timeout: 5000 });
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
  toggleTheme,
  USE_REAL_WEB3
};
