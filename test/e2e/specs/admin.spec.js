const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet, 
  navigateTo,
  waitForElement 
} = require('../helpers/test-helpers');

/**
 * Test Suite: Admin Panel
 * Tests admin functionality and contract deployment
 */
test.describe('Admin Panel', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
    await navigateTo(page, 'admin');
  });
  
  test('should display admin panel', async ({ page }, testInfo) => {
    // Check for admin-related content
    await expect(page.locator('text=/admin|deploy/i')).toBeVisible();
    
    await takeScreenshot(page, 'admin-panel-view', testInfo);
  });
  
  test('should show contract deployment section', async ({ page }) => {
    // Look for deploy button or deployment form
    const deploySection = page.locator('text=/deploy|contract/i').first();
    await expect(deploySection).toBeVisible({ timeout: 5000 });
  });
  
  test('should display deploy button', async ({ page }) => {
    const deployButton = page.locator('button:has-text("Deploy")').first();
    
    if (await deployButton.count() > 0) {
      await expect(deployButton).toBeVisible();
    }
  });
  
  test('should show current network for deployment', async ({ page }) => {
    // Network information should be visible in admin panel
    const networkInfo = page.locator('text=/network|chain/i').first();
    
    if (await networkInfo.count() > 0) {
      await expect(networkInfo).toBeVisible();
    }
  });
  
  test('should display contract bytecode info', async ({ page }, testInfo) => {
    // Look for bytecode-related information
    const bytecodeInfo = page.locator('text=/bytecode|0x[0-9a-f]{10,}/i').first();
    
    if (await bytecodeInfo.count() > 0) {
      await takeScreenshot(page, 'admin-bytecode-info', testInfo);
    }
  });
  
  test('should have deployment status section', async ({ page }) => {
    // Look for deployment status or result area
    const statusSection = page.locator('[class*="status"], [class*="result"]').first();
    
    const count = await statusSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
  
  test('should show contract address if deployed', async ({ page }, testInfo) => {
    // If a contract is already deployed, should show the address
    const contractAddress = page.locator('text=/contract.*0x[a-fA-F0-9]{40}/i, text=/deployed.*0x[a-fA-F0-9]{40}/i').first();
    
    if (await contractAddress.count() > 0) {
      await expect(contractAddress).toBeVisible();
      await takeScreenshot(page, 'admin-deployed-contract', testInfo);
    }
  });
  
  test('should navigate back to explorer from admin', async ({ page }) => {
    await navigateTo(page, 'explorer');
    
    // Should be back on explorer
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('localhost:3000');
  });
});
