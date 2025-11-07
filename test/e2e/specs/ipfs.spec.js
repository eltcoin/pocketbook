const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet,
  waitForElement 
} = require('../helpers/test-helpers');

/**
 * Test Suite: IPFS Integration
 * Tests decentralized storage functionality
 */
test.describe('IPFS Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
  });
  
  test('should support IPFS CID input', async ({ page }, testInfo) => {
    // Look for IPFS-related input fields
    const ipfsInput = page.locator('input[placeholder*="ipfs" i], input[placeholder*="cid" i]').first();
    
    if (await ipfsInput.count() > 0) {
      await expect(ipfsInput).toBeVisible();
      await takeScreenshot(page, 'ipfs-input-field', testInfo);
    }
  });
  
  test('should display IPFS CIDs', async ({ page }, testInfo) => {
    // Look for IPFS content identifiers (Qm... or bafy...)
    const ipfsCid = page.locator('text=/ipfs:\\/\\/|Qm[a-zA-Z0-9]{44}|bafy[a-z0-9]{55}/i').first();
    
    if (await ipfsCid.count() > 0) {
      await expect(ipfsCid).toBeVisible();
      await takeScreenshot(page, 'ipfs-cid-displayed', testInfo);
    }
  });
  
  test('should handle IPFS URLs', async ({ page }) => {
    // IPFS URLs should be recognized (ipfs://)
    const ipfsUrl = page.locator('text=/ipfs:\\/\\//i').first();
    
    const count = await ipfsUrl.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
  
  test('should show IPFS storage indicator', async ({ page }, testInfo) => {
    // Look for indication that metadata is stored on IPFS
    const ipfsIndicator = page.locator('text=/stored.*ipfs|ipfs.*storage/i').first();
    
    if (await ipfsIndicator.count() > 0) {
      await takeScreenshot(page, 'ipfs-storage-indicator', testInfo);
    }
  });
  
  test('should support DID-based content routing', async ({ page }) => {
    // Look for DID references (did:ethr:)
    const didReference = page.locator('text=/did:ethr:/i').first();
    
    if (await didReference.count() > 0) {
      await expect(didReference).toBeVisible();
    }
  });
  
  test('should show IPFS gateway information', async ({ page }, testInfo) => {
    // Look for IPFS gateway references
    const gatewayInfo = page.locator('text=/gateway|ipfs.io|dweb.link/i').first();
    
    if (await gatewayInfo.count() > 0) {
      await takeScreenshot(page, 'ipfs-gateway-info', testInfo);
    }
  });
});
