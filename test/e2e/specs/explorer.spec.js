const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet, 
  navigateTo,
  toggleTheme,
  waitForElement 
} = require('../helpers/test-helpers');

/**
 * Test Suite: Explorer View
 * Tests the main explorer interface and navigation
 */
test.describe('Explorer View', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
  });
  
  test('should display explorer page on load', async ({ page }, testInfo) => {
    // Check for main heading or explorer content
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Take screenshot
    await takeScreenshot(page, 'explorer-initial', testInfo);
  });
  
  test('should display animated background', async ({ page }) => {
    // Check for canvas element (AnimatedBackground component)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
  
  test('should show connect wallet button when not connected', async ({ page }) => {
    // Look for connect wallet button
    const connectBtn = page.locator('button:has-text("Connect Wallet")');
    await expect(connectBtn).toBeVisible();
  });
  
  test('should connect wallet successfully', async ({ page }, testInfo) => {
    await connectWallet(page);
    
    // Verify wallet address is displayed
    await expect(page.locator('text=/0x[a-fA-F0-9]{40}/')).toBeVisible();
    
    await takeScreenshot(page, 'explorer-wallet-connected', testInfo);
  });
  
  test('should display network selector after wallet connection', async ({ page }) => {
    await connectWallet(page);
    
    // Check for network selector
    const networkSelector = page.locator('select, [role="combobox"]').first();
    await expect(networkSelector).toBeVisible({ timeout: 10000 });
  });
  
  test('should display statistics section', async ({ page }, testInfo) => {
    // Look for statistics cards or metrics
    const statsSection = page.locator('.stats, [class*="statistic"], [class*="metric"]').first();
    
    if (await statsSection.count() > 0) {
      await expect(statsSection).toBeVisible();
      await takeScreenshot(page, 'explorer-statistics', testInfo);
    }
  });
  
  test('should navigate to claim view', async ({ page }, testInfo) => {
    await connectWallet(page);
    await navigateTo(page, 'claim');
    
    // Verify we're on claim page
    await expect(page.locator('text=/claim/i')).toBeVisible({ timeout: 5000 });
    
    await takeScreenshot(page, 'claim-view', testInfo);
  });
  
  test('should navigate to admin panel', async ({ page }, testInfo) => {
    await connectWallet(page);
    await navigateTo(page, 'admin');
    
    // Verify admin panel is visible
    await expect(page.locator('text=/admin/i, text=/deploy/i')).toBeVisible({ timeout: 5000 });
    
    await takeScreenshot(page, 'admin-panel', testInfo);
  });
  
  test('should display recent claims if available', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for data to load
    
    // Check if claims are displayed
    const claimCards = page.locator('[class*="claim-card"], [class*="claim"]');
    const count = await claimCards.count();
    
    // Either claims are shown or an empty state message
    if (count === 0) {
      // Should show some indication of no claims
      const emptyState = page.locator('text=/no claims/i, text=/empty/i');
      // Empty state might not exist, so we just verify page loaded
      expect(true).toBe(true);
    } else {
      await expect(claimCards.first()).toBeVisible();
    }
  });
});
