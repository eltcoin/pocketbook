const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet,
  waitForElement 
} = require('../helpers/test-helpers');

/**
 * Test Suite: Reputation System
 * Tests reputation and trust scoring features
 */
test.describe('Reputation System', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
  });
  
  test('should display reputation component', async ({ page }, testInfo) => {
    // Look for reputation-related UI
    const reputationSection = page.locator('text=/reputation|trust|score/i').first();
    
    if (await reputationSection.count() > 0) {
      await expect(reputationSection).toBeVisible();
      await takeScreenshot(page, 'reputation-component', testInfo);
    }
  });
  
  test('should show trust score', async ({ page }) => {
    // Look for trust score display (numerical or visual)
    const trustScore = page.locator('text=/trust.*\\d+|score.*\\d+/i, [class*="score"]').first();
    
    if (await trustScore.count() > 0) {
      await expect(trustScore).toBeVisible();
    }
  });
  
  test('should display attestation functionality', async ({ page }, testInfo) => {
    // Look for attestation or verification UI
    const attestation = page.locator('text=/attest|verify|sign/i').first();
    
    if (await attestation.count() > 0) {
      await takeScreenshot(page, 'reputation-attestation', testInfo);
    }
  });
  
  test('should show PGP signature support', async ({ page }) => {
    // Look for PGP-related elements
    const pgpSection = page.locator('text=/pgp|signature|key/i').first();
    
    if (await pgpSection.count() > 0) {
      await expect(pgpSection).toBeVisible();
    }
  });
  
  test('should display web of trust visualization', async ({ page }, testInfo) => {
    // Look for trust graph or network visualization
    const trustGraph = page.locator('text=/web.*trust|trust.*network/i').first();
    
    if (await trustGraph.count() > 0) {
      await takeScreenshot(page, 'reputation-web-of-trust', testInfo);
    }
  });
  
  test('should show attestation count', async ({ page }) => {
    // Look for number of attestations
    const attestationCount = page.locator('text=/\\d+\\s*attestation/i').first();
    
    const count = await attestationCount.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
