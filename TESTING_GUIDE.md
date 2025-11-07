# Quick Start Guide: Running Playwright Tests

## Prerequisites

Before running the tests, ensure you have:

1. **Node.js 20.x or later** installed
2. **Network access** to download Playwright browsers
3. **Port 3000** available for dev server
4. **Port 8545** available for Hardhat node (full tests only)

## Installation

```bash
# Install project dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

### Quick Tests (No Hardhat Required)

Run basic UI tests against the dev server only:

```bash
# Run all tests with simple config
npx playwright test --config=playwright.config.simple.js
```

### Full Tests (With Hardhat)

Run complete integration tests with local blockchain:

```bash
# Run all tests with full setup
npm run test:e2e
```

### Interactive Mode

```bash
# Launch Playwright UI for test development
npm run test:e2e:ui
```

### Headed Mode (See Browser)

```bash
# Run tests with visible browser
npm run test:e2e:headed
```

### Debug Mode

```bash
# Run tests with debugger
npm run test:e2e:debug
```

### Specific Tests

```bash
# Run single test file
npx playwright test test/e2e/specs/explorer.spec.js

# Run tests matching pattern
npx playwright test --grep "theme"
```

## Viewing Reports

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

Or open directly:

```bash
open playwright-report/index.html
```

## Test Output

Tests generate several artifacts:

- **Screenshots**: `screenshots/e2e/*.png`
- **Videos**: `test-results/*/video.webm` (on failure)
- **Traces**: `test-results/*/trace.zip` (on failure)
- **Reports**: `playwright-report/index.html`

## Troubleshooting

### "Executable doesn't exist" Error

Install Playwright browsers:

```bash
npx playwright install chromium
```

### "Port already in use" Error

Stop existing dev server or set `reuseExistingServer: true` in config.

### "Hardhat node failed to start"

Ensure port 8545 is free:

```bash
lsof -ti:8545 | xargs kill -9
```

### Tests Timeout

Increase timeout in test files or config:

```javascript
test.setTimeout(60000); // 60 seconds
```

### Network Issues

Use simple config to skip Hardhat:

```bash
npx playwright test --config=playwright.config.simple.js
```

## Writing New Tests

1. Create spec file in `test/e2e/specs/`
2. Import helpers:
   ```javascript
   const { test, expect } = require('@playwright/test');
   const { setupWallet, connectWallet } = require('../helpers/test-helpers');
   ```
3. Add test:
   ```javascript
   test('my test', async ({ page }) => {
     await setupWallet(page);
     await page.goto('/');
     await connectWallet(page);
     // Your test code
   });
   ```

## CI/CD Integration

For continuous integration:

```bash
# Set CI environment variable
CI=true npm run test:e2e

# This enables:
# - 2 retries on failure
# - No server reuse
# - Strict failure mode
```

## Next Steps

After running tests:

1. Review test report
2. Check screenshots for visual issues
3. Fix any failing tests
4. Update tests as features change
5. Add new tests for new features

## Support

- See `test/e2e/README.md` for detailed documentation
- Check `TEST_REPORT.md` for implementation details
- Review test files for examples

---

**Ready to test?** Run `npm run test:e2e` to start!
