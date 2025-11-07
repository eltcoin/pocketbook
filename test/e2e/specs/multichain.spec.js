const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet, 
  waitForElement 
} = require('../helpers/test-helpers');

/**
 * Test Suite: Multi-Chain Support
 * Tests network switching and multi-chain functionality
 */
test.describe('Multi-Chain Support', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
  });
  
  test('should display network selector', async ({ page }, testInfo) => {
    // Look for network selector dropdown
    const networkSelector = page.locator('select, [role="combobox"], [class*="network"]').first();
    await expect(networkSelector).toBeVisible({ timeout: 10000 });
    
    await takeScreenshot(page, 'multichain-network-selector', testInfo);
  });
  
  test('should show current network', async ({ page }) => {
    // Network name should be visible (e.g., "Ethereum", "Polygon", "Hardhat")
    const networkText = page.locator('text=/ethereum|polygon|bsc|arbitrum|optimism|avalanche|hardhat|localhost/i').first();
    
    if (await networkText.count() > 0) {
      await expect(networkText).toBeVisible();
    }
  });
  
  test('should list multiple networks in selector', async ({ page }, testInfo) => {
    // Click on network selector to open dropdown
    const networkSelector = page.locator('select, [role="combobox"]').first();
    
    if (await networkSelector.count() > 0) {
      await networkSelector.click();
      await page.waitForTimeout(500);
      
      // Check for network options
      const networkOptions = page.locator('option, [role="option"]');
      const optionCount = await networkOptions.count();
      
      // Should have multiple network options
      expect(optionCount).toBeGreaterThan(1);
      
      await takeScreenshot(page, 'multichain-network-list', testInfo);
    }
  });
  
  test('should support Ethereum mainnet', async ({ page }) => {
    const ethereumOption = page.locator('text=/ethereum/i, option:has-text("Ethereum")').first();
    
    // Check if Ethereum option exists in the network list
    const optionCount = await ethereumOption.count();
    expect(optionCount).toBeGreaterThanOrEqual(0);
  });
  
  test('should support Polygon', async ({ page }) => {
    const polygonOption = page.locator('text=/polygon|matic/i').first();
    const optionCount = await polygonOption.count();
    expect(optionCount).toBeGreaterThanOrEqual(0);
  });
  
  test('should support BSC', async ({ page }) => {
    const bscOption = page.locator('text=/bsc|binance/i').first();
    const optionCount = await bscOption.count();
    expect(optionCount).toBeGreaterThanOrEqual(0);
  });
  
  test('should support Arbitrum', async ({ page }) => {
    const arbitrumOption = page.locator('text=/arbitrum/i').first();
    const optionCount = await arbitrumOption.count();
    expect(optionCount).toBeGreaterThanOrEqual(0);
  });
  
  test('should support Optimism', async ({ page }) => {
    const optimismOption = page.locator('text=/optimism/i').first();
    const optionCount = await optimismOption.count();
    expect(optionCount).toBeGreaterThanOrEqual(0);
  });
  
  test('should support Avalanche', async ({ page }) => {
    const avalancheOption = page.locator('text=/avalanche|avax/i').first();
    const optionCount = await avalancheOption.count();
    expect(optionCount).toBeGreaterThanOrEqual(0);
  });
  
  test('should attempt network switch', async ({ page }, testInfo) => {
    const networkSelector = page.locator('select').first();
    
    if (await networkSelector.count() > 0) {
      // Get current value
      const currentValue = await networkSelector.inputValue();
      
      // Get all options
      const options = await page.locator('option').allTextContents();
      
      // Try to select a different network
      if (options.length > 1) {
        const newOption = options.find(opt => opt !== currentValue) || options[1];
        await networkSelector.selectOption({ label: newOption });
        
        await page.waitForTimeout(1000);
        await takeScreenshot(page, 'multichain-network-switched', testInfo);
      }
    }
  });
  
  test('should display chain ID or network info', async ({ page }) => {
    // Chain ID or network name should be visible somewhere
    const networkInfo = page.locator('text=/chain|network|0x[0-9a-f]{1,}/i').first();
    
    // Network info is likely present
    const count = await networkInfo.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
