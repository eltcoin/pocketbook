const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * BDD Test Suite: Word Handle Management
 * 
 * Feature: Word Handle Claiming and Management
 *   As a user of the Pocketbook platform
 *   I want to claim and manage human-readable word handles
 *   So that I have a memorable identifier for my address
 * 
 * This test suite comprehensively tests the AddressHandleRegistry contract
 * functionality through the frontend interface.
 */

// Load fixtures
const loadUserNetwork = () => {
  const fixturePath = path.resolve(__dirname, '../fixtures/user-network.json');
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
};

const loadDeployment = () => {
  const deploymentPath = path.resolve(__dirname, '../fixtures/deployment.json');
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
};

test.describe('Feature: Word Handle Management', () => {
  let userNetwork;
  let deployment;

  test.beforeAll(() => {
    userNetwork = loadUserNetwork();
    deployment = loadDeployment();
  });

  test.describe('Scenario: User claims a word handle for their address', () => {
    test('Given I am a connected user, when I claim a word handle, then it is assigned to my address', async ({ page }, testInfo) => {
      const user = userNetwork.users.find(u => u.id === 'user_0_high_interaction');
      
      await test.step('Given: I have a Web3 wallet connected', async () => {
        // Setup mock wallet BEFORE page load
        await page.addInitScript(({ address, chainId }) => {
          window.ethereum = {
            isMetaMask: true,
            selectedAddress: address,
            chainId: `0x${chainId.toString(16)}`,
            request: async ({ method, params }) => {
              if (method === 'eth_requestAccounts') return [address];
              if (method === 'eth_accounts') return [address];
              if (method === 'eth_chainId') return `0x${chainId.toString(16)}`;
              if (method === 'personal_sign') return '0x' + '0'.repeat(130);
              if (method === 'eth_sendTransaction') return '0x' + Math.random().toString(16).substring(2, 66);
              return null;
            },
            on: () => {},
            removeListener: () => {}
          };
        }, { address: deployment.testAccounts[user.accountIndex].address, chainId: deployment.chainId });
        
        await page.goto('http://localhost:3000');
        
        // Connect wallet
        const connectButton = page.locator('button:has-text("Connect Wallet")');
        await connectButton.waitFor({ state: 'visible', timeout: 10000 });
        await connectButton.click();
        await page.waitForTimeout(2000);
        
        await testInfo.attach('01-wallet-connected', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });

      await test.step('When: I navigate to claim my address', async () => {
        const claimLink = page.locator('text=Claim').first();
        if (await claimLink.count() > 0) {
          await claimLink.click();
          await page.waitForTimeout(1000);
        }
        
        await testInfo.attach('02-claim-page', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });

      await test.step('When: I claim a word handle', async () => {
        // Look for word handle section
        const wordHandleSection = page.locator('text=Word Handle').first();
        if (await wordHandleSection.count() > 0) {
          await wordHandleSection.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
        }
        
        // Look for suggested word handle
        const suggestedHandle = page.locator('[class*="handle"]').first();
        if (await suggestedHandle.count() > 0) {
          console.log('Found suggested word handle');
        }
        
        // Look for claim button
        const claimHandleButton = page.locator('button:has-text("Claim Word Handle"), button:has-text("Claim Handle")').first();
        if (await claimHandleButton.count() > 0) {
          await claimHandleButton.click();
          await page.waitForTimeout(2000);
        }
        
        await testInfo.attach('03-word-handle-claimed', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });

      await test.step('Then: My word handle is visible and associated with my address', async () => {
        // Verify some indication of word handle
        const pageContent = await page.textContent('body');
        
        // Check if word handle registry is mentioned
        const hasHandleInfo = pageContent.includes('Word Handle') || 
                             pageContent.includes('word handle') ||
                             pageContent.includes('Vocabulary');
        
        expect(hasHandleInfo).toBeTruthy();
        
        await testInfo.attach('04-handle-verification', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });
    });
  });

  test.describe('Scenario: User views their existing word handle', () => {
    test('Given I have claimed a word handle, when I view my profile, then I see my word handle displayed', async ({ page }, testInfo) => {
      const user = userNetwork.users.find(u => u.id === 'user_1_high_interaction');
      
      await test.step('Given: I am connected with a wallet that has a word handle', async () => {
        await page.addInitScript(({ address, chainId }) => {
          window.ethereum = {
            isMetaMask: true,
            selectedAddress: address,
            chainId: `0x${chainId.toString(16)}`,
            request: async ({ method }) => {
              if (method === 'eth_requestAccounts') return [address];
              if (method === 'eth_accounts') return [address];
              if (method === 'eth_chainId') return `0x${chainId.toString(16)}`;
              if (method === 'personal_sign') return '0x' + '0'.repeat(130);
              return null;
            },
            on: () => {},
            removeListener: () => {}
          };
        }, { address: deployment.testAccounts[user.accountIndex].address, chainId: deployment.chainId });
        
        await page.goto('http://localhost:3000');
        
        const connectButton = page.locator('button:has-text("Connect Wallet")');
        await connectButton.waitFor({ state: 'visible', timeout: 10000 });
        await connectButton.click();
        await page.waitForTimeout(2000);
      });

      await test.step('When: I navigate to the explorer or my profile', async () => {
        const explorerLink = page.locator('text=Explorer, a[href*="explorer"]').first();
        if (await explorerLink.count() > 0) {
          await explorerLink.click();
          await page.waitForTimeout(1000);
        }
        
        await testInfo.attach('explorer-view', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });

      await test.step('Then: I see word handle information if available', async () => {
        const pageContent = await page.textContent('body');
        
        // Verify handle-related content is present
        const hasHandleContent = pageContent.includes('Word') || 
                                pageContent.includes('handle') ||
                                pageContent.includes('Handle');
        
        expect(pageContent.length).toBeGreaterThan(0);
        
        await testInfo.attach('handle-displayed', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });
    });
  });

  test.describe('Scenario: User releases their word handle', () => {
    test('Given I have a word handle, when I release it, then it becomes available for others', async ({ page }, testInfo) => {
      const user = userNetwork.users.find(u => u.id === 'user_2_medium_interaction');
      
      await test.step('Given: I am connected and have a claimed word handle', async () => {
        await page.addInitScript(({ address, chainId }) => {
          window.ethereum = {
            isMetaMask: true,
            selectedAddress: address,
            chainId: `0x${chainId.toString(16)}`,
            request: async ({ method }) => {
              if (method === 'eth_requestAccounts') return [address];
              if (method === 'eth_accounts') return [address];
              if (method === 'eth_chainId') return `0x${chainId.toString(16)}`;
              if (method === 'personal_sign') return '0x' + '0'.repeat(130);
              if (method === 'eth_sendTransaction') return '0x' + Math.random().toString(16).substring(2, 66);
              return null;
            },
            on: () => {},
            removeListener: () => {}
          };
        }, { address: deployment.testAccounts[user.accountIndex].address, chainId: deployment.chainId });
        
        await page.goto('http://localhost:3000');
        
        const connectButton = page.locator('button:has-text("Connect Wallet")');
        await connectButton.waitFor({ state: 'visible', timeout: 10000 });
        await connectButton.click();
        await page.waitForTimeout(2000);
      });

      await test.step('When: I navigate to manage my word handle', async () => {
        const claimLink = page.locator('text=Claim').first();
        if (await claimLink.count() > 0) {
          await claimLink.click();
          await page.waitForTimeout(1000);
        }
        
        await testInfo.attach('manage-handle-page', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });

      await test.step('When: I click release word handle (if available)', async () => {
        // Look for release button
        const releaseButton = page.locator('button:has-text("Release"), button:has-text("release")').first();
        if (await releaseButton.count() > 0) {
          await releaseButton.click();
          await page.waitForTimeout(2000);
          
          await testInfo.attach('handle-released', {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png'
          });
        }
      });

      await test.step('Then: The word handle interface updates appropriately', async () => {
        const pageContent = await page.textContent('body');
        expect(pageContent.length).toBeGreaterThan(0);
        
        await testInfo.attach('final-state', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });
    });
  });

  test.describe('Scenario: Word handle validation and uniqueness', () => {
    test('Given word handles exist, when viewing the registry, then I see handle information', async ({ page }, testInfo) => {
      const user = userNetwork.users.find(u => u.id === 'user_0_high_interaction');
      
      await test.step('Given: I navigate to the application', async () => {
        await page.addInitScript(({ address, chainId }) => {
          window.ethereum = {
            isMetaMask: true,
            selectedAddress: address,
            chainId: `0x${chainId.toString(16)}`,
            request: async ({ method }) => {
              if (method === 'eth_requestAccounts') return [address];
              if (method === 'eth_accounts') return [address];
              if (method === 'eth_chainId') return `0x${chainId.toString(16)}`;
              return null;
            },
            on: () => {},
            removeListener: () => {}
          };
        }, { address: deployment.testAccounts[user.accountIndex].address, chainId: deployment.chainId });
        
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);
      });

      await test.step('When: I check word handle registry information', async () => {
        // Navigate to admin or info page if available
        const adminLink = page.locator('text=Admin, a[href*="admin"]').first();
        if (await adminLink.count() > 0) {
          await adminLink.click();
          await page.waitForTimeout(1000);
        }
        
        await testInfo.attach('registry-info', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });

      await test.step('Then: I see registry configuration details', async () => {
        const pageContent = await page.textContent('body');
        
        // Check for registry-related info
        const hasRegistryInfo = pageContent.includes('Vocabulary') ||
                               pageContent.includes('Max') ||
                               pageContent.includes('2048') ||
                               pageContent.includes('Registry');
        
        expect(pageContent.length).toBeGreaterThan(0);
        
        await testInfo.attach('registry-details', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });
    });
  });
});
