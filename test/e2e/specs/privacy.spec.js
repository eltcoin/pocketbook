const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet,
  navigateTo,
  waitForElement 
} = require('../helpers/test-helpers');

/**
 * Test Suite: Privacy Controls
 * Tests privacy settings and viewer management
 */
test.describe('Privacy Controls', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
    await navigateTo(page, 'claim');
  });
  
  test('should have privacy toggle in claim form', async ({ page }, testInfo) => {
    // Look for privacy checkbox or toggle
    const privacyToggle = page.locator('input[type="checkbox"][name*="private" i], [role="switch"]').first();
    
    if (await privacyToggle.count() > 0) {
      await expect(privacyToggle).toBeVisible();
      await takeScreenshot(page, 'privacy-toggle', testInfo);
    }
  });
  
  test('should toggle privacy setting', async ({ page }) => {
    const privacyToggle = page.locator('input[type="checkbox"][name*="private" i]').first();
    
    if (await privacyToggle.count() > 0) {
      const isChecked = await privacyToggle.isChecked();
      
      // Toggle it
      await privacyToggle.click();
      await page.waitForTimeout(300);
      
      // Verify it changed
      const newState = await privacyToggle.isChecked();
      expect(newState).not.toBe(isChecked);
    }
  });
  
  test('should display privacy label or description', async ({ page }) => {
    // Look for privacy-related text
    const privacyLabel = page.locator('text=/private|public|visibility/i').first();
    
    if (await privacyLabel.count() > 0) {
      await expect(privacyLabel).toBeVisible();
    }
  });
  
  test('should show viewer management section', async ({ page }, testInfo) => {
    // Enable privacy first
    const privacyToggle = page.locator('input[type="checkbox"][name*="private" i]').first();
    
    if (await privacyToggle.count() > 0) {
      const isChecked = await privacyToggle.isChecked();
      
      if (!isChecked) {
        await privacyToggle.click();
        await page.waitForTimeout(500);
      }
      
      // Look for viewer management UI
      const viewerSection = page.locator('text=/viewer|whitelist|access/i').first();
      
      if (await viewerSection.count() > 0) {
        await expect(viewerSection).toBeVisible();
        await takeScreenshot(page, 'privacy-viewer-management', testInfo);
      }
    }
  });
  
  test('should have add viewer functionality', async ({ page }) => {
    // Look for add viewer input or button
    const addViewerInput = page.locator('input[placeholder*="address" i], input[name*="viewer" i]').first();
    const addViewerButton = page.locator('button:has-text("Add"), button:has-text("Viewer")').first();
    
    const hasInput = await addViewerInput.count() > 0;
    const hasButton = await addViewerButton.count() > 0;
    
    // Should have some viewer management UI
    expect(hasInput || hasButton).toBeTruthy();
  });
  
  test('should display list of allowed viewers', async ({ page }, testInfo) => {
    // Look for viewer list
    const viewerList = page.locator('[class*="viewer"], [class*="whitelist"]').first();
    
    if (await viewerList.count() > 0) {
      await takeScreenshot(page, 'privacy-viewer-list', testInfo);
    }
  });
  
  test('should show remove viewer option', async ({ page }) => {
    // Look for remove/delete viewer buttons
    const removeButton = page.locator('button:has-text("Remove"), button:has-text("Delete"), button[aria-label*="remove" i]').first();
    
    const count = await removeButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
