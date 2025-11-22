import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Pocketbook E2E tests
 * Tests run against a local Hardhat node with deployed contracts
 */
export default defineConfig({
  testDir: './test/e2e',
  
  // Maximum time one test can run
  timeout: 60 * 1000,
  
  // Test execution settings
  fullyParallel: false, // Run tests serially to avoid state conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to ensure consistent state
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:3000',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
  },
  
  // Test projects for different scenarios
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // Web server configuration - start dev server before tests
  // Commented out since the test runner script already starts the server
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  //   stdout: 'ignore',
  //   stderr: 'pipe',
  // },
  
  // Global setup and teardown
  // Commented out since the test runner script handles Hardhat and Vite setup
  // globalSetup: require.resolve('./test/e2e/setup/global-setup.cjs'),
  // globalTeardown: require.resolve('./test/e2e/setup/global-teardown.cjs'),
});
