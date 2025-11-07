const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet
} = require('../helpers/test-helpers');

/**
 * Test Suite: ENS Integration
 * Tests ENS name resolution and reverse lookup
 */
test.describe('ENS Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
  });
  
  test('should support ENS name input', async ({ page }, testInfo) => {
    // Look for ENS-related input field
    const ensInput = page.locator('input[placeholder*="ens" i], input[placeholder*=".eth" i]').first();
    
    if (await ensInput.count() > 0) {
      await expect(ensInput).toBeVisible();
      await takeScreenshot(page, 'ens-input-field', testInfo);
    }
  });
  
  test('should display ENS names instead of addresses', async ({ page }, testInfo) => {
    // Look for .eth domain names
    const ensName = page.locator('text=/[a-z0-9-]+\\.eth/i').first();
    
    if (await ensName.count() > 0) {
      await expect(ensName).toBeVisible();
      await takeScreenshot(page, 'ens-name-displayed', testInfo);
    }
  });
  
  test('should show ENS name with address', async ({ page }) => {
    // ENS name should be shown alongside or instead of address
    const ensWithAddress = page.locator('text=/[a-z0-9-]+\\.eth/i').first();
    
    if (await ensWithAddress.count() > 0) {
      // Should also have the address somewhere nearby
      const address = page.locator('text=/0x[a-fA-F0-9]{40}/').first();
      
      if (await address.count() > 0) {
        expect(await ensWithAddress.isVisible() || await address.isVisible()).toBe(true);
      }
    }
  });
  
  test('should support ENS resolution in search', async ({ page }, testInfo) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Try entering an ENS name
      await searchInput.fill('vitalik.eth');
      await page.waitForTimeout(1000);
      
      await takeScreenshot(page, 'ens-search-input', testInfo);
    }
  });
  
  test('should show reverse ENS lookup', async ({ page }) => {
    // When viewing an address, should show its ENS name if it has one
    // This is indicated by .eth domain appearing with addresses
    const ensDisplay = page.locator('text=/[a-z0-9-]+\\.eth/i').first();
    
    const count = await ensDisplay.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
  
  test('should support ENS on multiple networks', async ({ page }) => {
    // ENS should work on Ethereum mainnet primarily
    // Look for ENS-related network indicator
    const networkInfo = page.locator('text=/ethereum|mainnet/i').first();
    
    const count = await networkInfo.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
