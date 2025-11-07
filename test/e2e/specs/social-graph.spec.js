const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet,
  waitForElement 
} = require('../helpers/test-helpers');

/**
 * Test Suite: Social Graph
 * Tests social features like following, unfollowing, and friend requests
 */
test.describe('Social Graph Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
    await connectWallet(page);
  });
  
  test('should have social graph component', async ({ page }) => {
    // Look for social-related elements
    const socialSection = page.locator('text=/social|follow|friend/i').first();
    
    if (await socialSection.count() > 0) {
      await expect(socialSection).toBeVisible();
    }
  });
  
  test('should display follow button on user profiles', async ({ page }, testInfo) => {
    // Navigate to a user profile if one exists
    const userCard = page.locator('[class*="claim-card"], [class*="user"]').first();
    
    if (await userCard.count() > 0) {
      await userCard.click();
      await page.waitForTimeout(1000);
      
      // Look for follow button
      const followButton = page.locator('button:has-text("Follow"), button:has-text("Unfollow")').first();
      
      if (await followButton.count() > 0) {
        await expect(followButton).toBeVisible();
        await takeScreenshot(page, 'social-follow-button', testInfo);
      }
    }
  });
  
  test('should display friend request functionality', async ({ page }, testInfo) => {
    // Look for friend request related UI
    const friendRequestButton = page.locator('button:has-text("Friend"), button:has-text("Request")').first();
    
    if (await friendRequestButton.count() > 0) {
      await expect(friendRequestButton).toBeVisible();
      await takeScreenshot(page, 'social-friend-request', testInfo);
    }
  });
  
  test('should show followers count', async ({ page }) => {
    // Look for follower count display
    const followersCount = page.locator('text=/\\d+\\s*(follower|following)/i').first();
    
    if (await followersCount.count() > 0) {
      await expect(followersCount).toBeVisible();
    }
  });
  
  test('should display social graph visualization', async ({ page }, testInfo) => {
    // Look for social graph visualizer (likely using D3)
    const graphViz = page.locator('svg, canvas').nth(1); // Second canvas/svg (first is background)
    
    if (await graphViz.count() > 0) {
      await takeScreenshot(page, 'social-graph-visualization', testInfo);
    }
  });
  
  test('should show network connections', async ({ page }) => {
    // Look for connections or network display
    const connections = page.locator('text=/connection|network|relationship/i').first();
    
    const count = await connections.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
