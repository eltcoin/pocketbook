const { test, expect } = require('@playwright/test');
const { 
  setupWallet, 
  takeScreenshot, 
  connectWallet, 
  toggleTheme,
  waitForElement 
} = require('../helpers/test-helpers');

/**
 * Test Suite: Theme Switching
 * Tests light/dark mode functionality
 */
test.describe('Theme Switching', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupWallet(page);
    await page.goto('/');
  });
  
  test('should start in light mode by default', async ({ page }, testInfo) => {
    // Check if body or main element doesn't have dark class
    const main = page.locator('main');
    const hasDarkClass = await main.evaluate(el => el.classList.contains('dark'));
    
    // Default should be light mode (no dark class)
    expect(hasDarkClass).toBe(false);
    
    await takeScreenshot(page, 'theme-light-mode', testInfo);
  });
  
  test('should toggle to dark mode', async ({ page }, testInfo) => {
    // Toggle theme
    await toggleTheme(page);
    
    // Verify dark mode is active
    const main = page.locator('main');
    const hasDarkClass = await main.evaluate(el => el.classList.contains('dark'));
    
    expect(hasDarkClass).toBe(true);
    
    await takeScreenshot(page, 'theme-dark-mode', testInfo);
  });
  
  test('should toggle back to light mode', async ({ page }, testInfo) => {
    // Toggle to dark
    await toggleTheme(page);
    await page.waitForTimeout(300);
    
    // Toggle back to light
    await toggleTheme(page);
    
    // Verify light mode is active
    const main = page.locator('main');
    const hasDarkClass = await main.evaluate(el => el.classList.contains('dark'));
    
    expect(hasDarkClass).toBe(false);
    
    await takeScreenshot(page, 'theme-light-mode-restored', testInfo);
  });
  
  test('should persist theme preference', async ({ page, context }) => {
    // Toggle to dark mode
    await toggleTheme(page);
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Verify dark mode is still active
    const main = page.locator('main');
    const hasDarkClass = await main.evaluate(el => el.classList.contains('dark'));
    
    expect(hasDarkClass).toBe(true);
  });
  
  test('should update all components when theme changes', async ({ page }, testInfo) => {
    await connectWallet(page);
    
    // Toggle to dark mode
    await toggleTheme(page);
    
    // Verify header has dark styling
    // slate-900 RGB color (15, 23, 42) is the dark mode background
    const SLATE_900_RGB = '15, 23, 42';
    const header = page.locator('header');
    const headerHasDark = await header.evaluate((el, darkColor) => 
      el.classList.contains('dark') || 
      getComputedStyle(el).backgroundColor.includes(darkColor)
    , SLATE_900_RGB);
    
    await takeScreenshot(page, 'theme-dark-all-components', testInfo);
  });
});
