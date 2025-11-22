# Comprehensive Test Infrastructure - Pocketbook

This document describes the comprehensive test infrastructure for the Pocketbook decentralized identity platform, including fixtures, BDD test suites, and automated reporting.

## Overview

The test infrastructure provides:

1. **Complex User Network Fixtures** - Realistic network of test users with varying interaction levels
2. **Automated Contract Deployment** - Deploys contracts to local Hardhat node
3. **User Network Configuration** - Sends real transactions to configure test data
4. **BDD Test Suites** - Behavior-driven tests for all major features
5. **Comprehensive Reporting** - HTML and Markdown reports with screenshots

## Architecture

```
test/
├── e2e/
│   ├── fixtures/
│   │   ├── deployment.json           # Contract deployment info (generated)
│   │   ├── user-network.json         # Complex user network fixtures
│   │   └── setup-results.json        # User network setup results (generated)
│   ├── helpers/
│   │   ├── test-helpers.js           # Test utility functions
│   │   ├── test-helpers-web3.js      # Web3 specific helpers
│   │   └── generate-report.js        # Report generation script
│   ├── setup/
│   │   ├── global-setup.js           # Playwright global setup
│   │   ├── global-teardown.js        # Playwright global teardown
│   │   ├── deploy-contracts.js       # Contract deployment script
│   │   └── setup-user-network.js     # User network configuration script
│   └── specs/
│       ├── user-claim-flow.bdd.spec.js       # BDD tests for user claiming
│       ├── social-graph-flow.bdd.spec.js     # BDD tests for social features
│       ├── address-claim.spec.js              # Original claim tests
│       ├── social-graph.spec.js               # Original social tests
│       └── ... (other test suites)
├── hardhat/
│   └── AddressClaim.security.test.js  # Contract security tests
└── test_results/                      # Generated reports directory
    ├── test-report.html               # HTML test report
    └── test-report.md                 # Markdown test report
```

## User Network Fixtures

The test infrastructure includes a complex and realistic network of 8 test users:

### User Profiles

| User ID | Interaction Level | Profile Completeness | Social Connections | Trust Score |
|---------|------------------|---------------------|-------------------|-------------|
| user_0_high_interaction | High | Complete (all fields) | 4 following, 3 followers, 2 friends | 95 |
| user_1_high_interaction | High | Complete (all fields) | 3 following, 3 followers, 1 friend | 88 |
| user_2_medium_interaction | Medium | Partial (some fields) | 2 following, 3 followers, 1 friend | 65 |
| user_3_medium_interaction | Medium | Partial (some fields) | 3 following, 2 followers, 0 friends | 58 |
| user_4_low_interaction | Low | Minimal (name + bio) | 1 following, 0 followers, 0 friends | 20 |
| user_5_low_interaction | Low | Minimal (name only) | 2 following, 1 follower, 0 friends | 15 |
| user_6_minimal | Minimal | Name only | 0 following, 0 followers, 0 friends | 0 |
| user_7_unclaimed | None | Unclaimed address | - | 0 |

### Network Statistics

- **Total Users:** 8
- **Claimed Addresses:** 7
- **Unclaimed Addresses:** 1
- **Total Connections:** 15
- **Total Attestations:** 40

## Test Suites

### BDD (Behavior-Driven Development) Tests

All new comprehensive tests follow BDD principles with clear Given-When-Then structure:

#### 1. User Claim Flow (`user-claim-flow.bdd.spec.js`)

**Feature:** User Address Claiming

- **Scenario:** New user claims address with complete profile
  - Given: I am a new user visiting the platform
  - When: I connect wallet and fill out the claim form
  - Then: I should see a success confirmation

- **Scenario:** User with medium interaction claims address
  - Tests partial profile submission

- **Scenario:** User with low interaction claims minimal profile
  - Tests minimal data requirements

- **Scenario:** Verify claimed addresses in explorer
  - Tests explorer view displays all claims

#### 2. Social Graph Flow (`social-graph-flow.bdd.spec.js`)

**Feature:** Social Graph and Network Connections

- **Scenario:** High-interaction user views their social network
  - Validates network visualization
  - Checks connection statistics

- **Scenario:** User follows another user
  - Tests follow functionality
  - Verifies follow state changes

- **Scenario:** User views social graph visualization
  - Tests D3.js visualization rendering

- **Scenario:** User sends friend request
  - Tests friend request functionality

- **Scenario:** View network statistics across all users
  - Validates overall network health

- **Scenario:** User with no connections views empty state
  - Tests graceful handling of empty state

### Traditional Test Suites

The infrastructure also includes the existing comprehensive test suites:

- **explorer.spec.js** - Explorer view and navigation
- **theme.spec.js** - Theme switching functionality
- **address-claim.spec.js** - Address claiming forms
- **multichain.spec.js** - Multi-chain support
- **admin.spec.js** - Admin panel functionality
- **social-graph.spec.js** - Social features
- **reputation.spec.js** - Reputation system
- **privacy.spec.js** - Privacy controls
- **ens.spec.js** - ENS integration
- **ipfs.spec.js** - IPFS storage
- **crosschain.spec.js** - Cross-chain functionality

## Running Tests

### Quick Start

```bash
# Run comprehensive test suite (recommended)
npm run test:comprehensive
```

This single command will:
1. ✅ Compile smart contracts
2. ✅ Start Hardhat local node
3. ✅ Deploy contracts
4. ✅ Configure user network
5. ✅ Start dev server
6. ✅ Run all E2E tests
7. ✅ Generate HTML/Markdown reports
8. ✅ Clean up resources

### Individual Components

```bash
# Deploy contracts to local network
npm run test:setup-network

# Generate test reports
npm run test:generate-report

# Run E2E tests only
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test test/e2e/specs/user-claim-flow.bdd.spec.js
```

### Manual Setup

If you need to run components separately:

```bash
# 1. Start Hardhat node
npx hardhat node

# 2. Deploy contracts (in another terminal)
npx hardhat run test/e2e/setup/deploy-contracts.js --network localhost

# 3. Setup user network
npx hardhat run test/e2e/setup/setup-user-network.js --network localhost

# 4. Start dev server
npm run dev

# 5. Run tests (in another terminal)
npm run test:e2e

# 6. Generate reports
npm run test:generate-report
```

## Test Reports

After running tests, reports are generated in `test_results/`:

### HTML Report (`test-report.html`)

Interactive HTML report featuring:
- **Executive dashboard** with pass/fail metrics
- **Test suite results** with status indicators
- **User network overview** with interaction levels
- **Screenshot gallery** showing test execution
- **Test execution metadata**

**View:** `open test_results/test-report.html`

### Markdown Report (`test-report.md`)

Text-based report including:
- Executive summary
- Test results table
- User network statistics
- Test suite breakdown
- Screenshot list
- Conclusion and recommendations

**View:** `cat test_results/test-report.md`

### Playwright Report

Built-in Playwright HTML report:

```bash
npm run test:e2e:report
```

## Screenshots

All test runs capture screenshots at key states:

- **Location:** `screenshots/e2e/`
- **Format:** PNG
- **Naming:** Descriptive names with timestamps
- **Attached to:** HTML reports for easy review

Screenshots are captured:
- ✅ At each BDD test step
- ✅ On test failures
- ✅ At key verification points
- ✅ For visual regression testing

## Test Data Configuration

### Modifying User Network

Edit `test/e2e/fixtures/user-network.json` to:
- Add/remove test users
- Change interaction levels
- Modify social connections
- Update profile data

### Adding New Test Users

```json
{
  "id": "user_8_new",
  "accountIndex": 8,
  "interactionLevel": "high",
  "profile": {
    "name": "New User",
    "bio": "Description",
    ...
  },
  "socialConnections": {
    "following": [],
    "followers": [],
    "friends": []
  },
  ...
}
```

## Writing New Tests

### BDD Test Template

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature: Your Feature Name', () => {
  
  test.describe('Scenario: Your scenario description', () => {
    
    test('Given/When/Then description', async ({ page }, testInfo) => {
      
      await test.step('Given: Setup condition', async () => {
        // Setup code
        await testInfo.attach('step-name', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png'
        });
      });

      await test.step('When: Action taken', async () => {
        // Action code
      });

      await test.step('Then: Expected outcome', async () => {
        // Assertion code
        expect(something).toBeTruthy();
      });
    });
  });
});
```

## Continuous Integration

### CI Configuration

```yaml
# .github/workflows/test.yml
- name: Install dependencies
  run: npm install

- name: Install Playwright browsers
  run: npx playwright install chromium

- name: Run comprehensive tests
  run: npm run test:comprehensive

- name: Upload test reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: |
      test_results/
      screenshots/
      playwright-report/
```

## Troubleshooting

### Common Issues

**Playwright browsers not installed:**
```bash
npx playwright install chromium
```

**Hardhat compilation fails:**
```bash
npx hardhat clean
npx hardhat compile
```

**Port already in use (3000 or 8545):**
```bash
# Kill processes on port
lsof -ti:3000 | xargs kill -9
lsof -ti:8545 | xargs kill -9
```

**Tests timing out:**
- Increase timeout in `playwright.config.js`
- Check if dev server and Hardhat node are running
- Verify network connectivity

## Best Practices

1. **Always run comprehensive test suite before commits:**
   ```bash
   npm run test:comprehensive
   ```

2. **Review screenshots for visual regressions:**
   - Check `screenshots/e2e/` after test runs
   - Compare against baseline screenshots

3. **Keep user fixtures realistic:**
   - Use varying interaction levels
   - Include edge cases (empty profiles, no connections)

4. **Write descriptive test names:**
   - Use Given-When-Then format
   - Be specific about what's being tested

5. **Capture screenshots at key points:**
   - Before and after important actions
   - At assertion points
   - On failures (automatic)

## Performance

### Test Execution Time

- **Full comprehensive suite:** ~5-10 minutes
- **E2E tests only:** ~2-5 minutes
- **Single test file:** ~30-60 seconds

### Optimization Tips

- Run tests in parallel when possible
- Use `test:e2e:simple` for quick UI validation
- Cache Playwright browsers
- Use fast SSD for node_modules

## Contributing

When adding new test infrastructure:

1. Follow existing patterns and conventions
2. Use BDD format for feature tests
3. Add appropriate fixtures if needed
4. Update this README
5. Ensure comprehensive test suite passes

## License

MIT - See LICENSE file

## Support

For issues or questions:
- Check this README
- Review existing test files for examples
- Check Playwright documentation: https://playwright.dev
- Review Hardhat documentation: https://hardhat.org

---

**Generated by Pocketbook Test Infrastructure**
