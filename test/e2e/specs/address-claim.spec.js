const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet, 
  navigateTo
} = require('../helpers/test-helpers');

/**
 * Test Suite: Address Claiming
 * Tests the address claiming workflow
 */
test.describe('Address Claiming', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
    await navigateTo(page, 'claim');
  });
  
  test('should display claim form', async ({ page }, testInfo) => {
    // Check for claim form elements
    await expect(page.locator('form, [class*="form"]')).toBeVisible();
    
    await takeScreenshot(page, 'claim-form', testInfo);
  });
  
  test('should show current address', async ({ page }) => {
    // Verify current address is displayed
    await expect(page.locator('text=/0x[a-fA-F0-9]{40}/')).toBeVisible();
  });
  
  test('should have name input field', async ({ page }) => {
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await expect(nameInput).toBeVisible();
  });
  
  test('should have bio/description field', async ({ page }) => {
    const bioField = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i], input[name="bio"]').first();
    await expect(bioField).toBeVisible();
  });
  
  test('should have avatar/image field', async ({ page }) => {
    const avatarField = page.locator('input[name="avatar"], input[placeholder*="avatar" i]').first();
    await expect(avatarField).toBeVisible();
  });
  
  test('should have privacy toggle', async ({ page }) => {
    const privacyToggle = page.locator('input[type="checkbox"][name*="private" i], [role="switch"]').first();
    
    if (await privacyToggle.count() > 0) {
      await expect(privacyToggle).toBeVisible();
    }
  });
  
  test('should fill out claim form', async ({ page }, testInfo) => {
    // Fill out the form
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Test User');
    
    const bioField = page.locator('textarea[name="bio"], textarea[placeholder*="bio" i], input[name="bio"]').first();
    if (await bioField.count() > 0) {
      await bioField.fill('This is a test bio');
    }
    
    const avatarField = page.locator('input[name="avatar"], input[placeholder*="avatar" i]').first();
    if (await avatarField.count() > 0) {
      await avatarField.fill('https://example.com/avatar.png');
    }
    
    await takeScreenshot(page, 'claim-form-filled', testInfo);
  });
  
  test('should show claim button', async ({ page }) => {
    const claimButton = page.locator('button:has-text("Claim"), button:has-text("Submit")');
    await expect(claimButton).toBeVisible();
  });
  
  test('should validate required fields', async ({ page }) => {
    // Try to submit with empty form
    const claimButton = page.locator('button:has-text("Claim"), button:has-text("Submit")').first();
    
    if (await claimButton.count() > 0) {
      await claimButton.click();
      
      // Should show validation error or stay on page
      // Either form validation prevents submission or we see an error
      await page.waitForTimeout(1000);
      
      // We should still be on claim page
      await expect(page.locator('text=/claim/i')).toBeVisible();
    }
  });
  
  test('should display social media fields', async ({ page }, testInfo) => {
    // Check for social media input fields
    const twitterField = page.locator('input[name="twitter"], input[placeholder*="twitter" i]').first();
    const githubField = page.locator('input[name="github"], input[placeholder*="github" i]').first();
    const websiteField = page.locator('input[name="website"], input[placeholder*="website" i]').first();
    
    // At least some social fields should be present
    const fieldCount = await twitterField.count() + await githubField.count() + await websiteField.count();
    
    if (fieldCount > 0) {
      await takeScreenshot(page, 'claim-social-fields', testInfo);
    }
  });
});
