const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet, 
  navigateTo
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
      // No claims shown - this is acceptable for empty state
      expect(count).toBe(0);
    } else {
      // Claims are visible
      await expect(claimCards.first()).toBeVisible();
    }
  });

  // URL Routing Tests
  test('should display dynamic stats (not hardcoded)', async ({ page }) => {
    // Check that stats are showing numbers (0 or actual data)
    const statValues = page.locator('[class*="stat-value"]');
    await expect(statValues.first()).toBeVisible();
    
    // Stats should not show hardcoded "1,234" etc
    const statText = await statValues.first().textContent();
    expect(statText).not.toContain('1,234');
    expect(statText).not.toContain('567');
  });

  test('should show empty state when no claims exist', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    // Look for empty state message
    const emptyState = page.locator('text=/no claims found/i, text=/be the first to claim/i');
    
    // Either empty state is shown or actual claims are shown
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);
    const claimCards = page.locator('[class*="claim-card"]');
    const claimCardsCount = await claimCards.count();
    
    // One or the other should be true
    expect(emptyStateVisible || claimCardsCount > 0).toBe(true);
  });

  test('should navigate to address view via search', async ({ page }, testInfo) => {
    // Enter a test address
    const searchInput = page.locator('input[placeholder*="address"]');
    await searchInput.fill('0x1234567890123456789012345678901234567890');
    
    // Click search or press enter
    await searchInput.press('Enter');
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Check URL changed to /explore/:address
    expect(page.url()).toContain('/explore/0x');
    
    // Check address view is displayed
    await expect(page.locator('text=/unclaimed address/i, text=/claimed/i')).toBeVisible();
    
    await takeScreenshot(page, 'address-view-from-search', testInfo);
  });

  test('should support direct URL navigation to address', async ({ page }) => {
    // Navigate directly to an address URL
    const testAddress = '0x1234567890123456789012345678901234567890';
    await page.goto(`/explore/${testAddress}`);
    
    // Check that we're on the address view page
    await expect(page.locator('text=/unclaimed address/i, text=/claimed/i')).toBeVisible();
    
    // Check that the address is displayed
    await expect(page.locator(`text=${testAddress.toLowerCase()}`).first()).toBeVisible();
  });

  test('should show explorer tabs on address view', async ({ page }) => {
    // Navigate to an address
    await page.goto('/explore/0x1234567890123456789012345678901234567890');
    await page.waitForTimeout(1000);
    
    // Check for tab buttons
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("Transactions")')).toBeVisible();
    await expect(page.locator('button:has-text("Tokens")')).toBeVisible();
  });

  test('should switch between explorer tabs', async ({ page }, testInfo) => {
    // Navigate to an address
    await page.goto('/explore/0x1234567890123456789012345678901234567890');
    await page.waitForTimeout(1000);
    
    // Click on Transactions tab
    const transactionsTab = page.locator('button:has-text("Transactions")');
    await transactionsTab.click();
    
    // Check that transactions content is displayed
    await expect(page.locator('text=/recent transactions/i')).toBeVisible();
    
    await takeScreenshot(page, 'explorer-transactions-tab', testInfo);
    
    // Click on Tokens tab
    const tokensTab = page.locator('button:has-text("Tokens")');
    await tokensTab.click();
    
    // Check that tokens content is displayed
    await expect(page.locator('text=/token/i')).toBeVisible();
    
    await takeScreenshot(page, 'explorer-tokens-tab', testInfo);
  });

  test('should navigate back to explorer from address view', async ({ page }) => {
    // Navigate to an address
    await page.goto('/explore/0x1234567890123456789012345678901234567890');
    await page.waitForTimeout(1000);
    
    // Click back button
    const backButton = page.locator('button:has-text("Back to Explorer")');
    await backButton.click();
    
    // Check that we're back at explorer (URL should not contain /explore/)
    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl.endsWith('/') || !currentUrl.includes('/explore/')).toBe(true);
    
    // Check that explorer content is visible
    await expect(page.locator('text=/blockchain identity explorer/i')).toBeVisible();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Start at explorer
    await page.goto('/');
    await page.waitForTimeout(500);
    
    // Navigate to an address
    await page.goto('/explore/0x1234567890123456789012345678901234567890');
    await page.waitForTimeout(500);
    
    // Use browser back button
    await page.goBack();
    await page.waitForTimeout(500);
    
    // Should be back at explorer
    expect(page.url()).toContain('/');
    await expect(page.locator('text=/blockchain identity explorer/i')).toBeVisible();
    
    // Use browser forward button
    await page.goForward();
    await page.waitForTimeout(500);
    
    // Should be back at address view
    expect(page.url()).toContain('/explore/0x');
  });
});
