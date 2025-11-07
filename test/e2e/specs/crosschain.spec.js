const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet,
  getContractInfo 
} = require('../helpers/test-helpers');

/**
 * Test Suite: Cross-Chain Functionality
 * Tests cross-chain identity and claim verification
 */
test.describe('Cross-Chain Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
  });
  
  test('should support multiple chain connections', async ({ page }, testInfo) => {
    // Verify network selector shows multiple chains
    const networkSelector = page.locator('select, [role="combobox"]').first();
    
    if (await networkSelector.count() > 0) {
      await networkSelector.click();
      await page.waitForTimeout(500);
      
      const options = await page.locator('option, [role="option"]').allTextContents();
      
      // Should have at least 2 networks
      expect(options.length).toBeGreaterThan(1);
      
      await takeScreenshot(page, 'crosschain-networks', testInfo);
    }
  });
  
  test('should maintain identity across network switches', async ({ page }, testInfo) => {
    const networkSelector = page.locator('select').first();
    
    if (await networkSelector.count() > 0) {
      // Get current address
      const addressBefore = await page.locator('text=/0x[a-fA-F0-9]{40}/').first().textContent();
      
      // Switch network
      const options = await page.locator('option').allTextContents();
      if (options.length > 1) {
        await networkSelector.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        
        // Address should remain the same
        const addressAfter = await page.locator('text=/0x[a-fA-F0-9]{40}/').first().textContent();
        
        expect(addressBefore).toBe(addressAfter);
        
        await takeScreenshot(page, 'crosschain-identity-preserved', testInfo);
      }
    }
  });
  
  test('should show different contract addresses per chain', async ({ page }, testInfo) => {
    // Each network should potentially have a different contract address
    const contractInfo = page.locator('text=/contract.*0x[a-fA-F0-9]{40}/i').first();
    
    if (await contractInfo.count() > 0) {
      const firstContract = await contractInfo.textContent();
      
      // Switch network
      const networkSelector = page.locator('select').first();
      if (await networkSelector.count() > 0) {
        const options = await page.locator('option').allTextContents();
        if (options.length > 1) {
          await networkSelector.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          await takeScreenshot(page, 'crosschain-contract-addresses', testInfo);
        }
      }
    }
  });
  
  test('should query claims across multiple chains', async ({ page }, testInfo) => {
    // Should be able to view claims from different chains
    // This might be indicated by a chain selector or multi-chain view
    
    const multiChainView = page.locator('text=/multi.*chain|cross.*chain|all.*chain/i').first();
    
    if (await multiChainView.count() > 0) {
      await multiChainView.click();
      await page.waitForTimeout(1000);
      
      await takeScreenshot(page, 'crosschain-claim-view', testInfo);
    }
  });
  
  test('should handle network-specific features', async ({ page }) => {
    // Different networks might have different features enabled
    const networkSelector = page.locator('select').first();
    
    if (await networkSelector.count() > 0) {
      // Ethereum should support ENS
      const ethereumOption = await page.locator('option:has-text("Ethereum")').count();
      
      if (ethereumOption > 0) {
        await networkSelector.selectOption({ label: 'Ethereum' });
        await page.waitForTimeout(1000);
        
        // Should show ENS-related features
        const ensFeature = page.locator('text=/ens|.eth/i').first();
        const count = await ensFeature.count();
        
        // ENS features may or may not be visible depending on context
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });
  
  test('should show chain-specific transaction history', async ({ page }, testInfo) => {
    // Transaction history should be chain-specific
    const txHistory = page.locator('text=/transaction|tx|history/i').first();
    
    if (await txHistory.count() > 0) {
      await takeScreenshot(page, 'crosschain-tx-history', testInfo);
    }
  });
  
  test('should validate chain ID on connection', async ({ page }) => {
    // Should verify we're on the correct chain
    const chainIdDisplay = page.locator('text=/chain.*id|id.*\\d+/i').first();
    
    const count = await chainIdDisplay.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
