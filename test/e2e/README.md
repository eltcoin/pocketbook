# Playwright E2E Test Suite

Comprehensive end-to-end tests for the Pocketbook decentralized identity platform.

## Overview

This test suite validates all functional components of the Pocketbook platform including:

- **Explorer View**: Main interface and navigation
- **Address Claiming**: Complete claim workflow
- **Multi-Chain Support**: Network switching and cross-chain functionality
- **Admin Panel**: Contract deployment interface
- **Social Graph**: Follow/unfollow and friend request features
- **Reputation System**: Trust scoring and attestations
- **Privacy Controls**: Privacy settings and viewer management
- **ENS Integration**: Name resolution and reverse lookup
- **IPFS Storage**: Decentralized metadata storage
- **Theme Switching**: Light/dark mode
- **Cross-Chain**: Identity preservation across networks

## Prerequisites

- Node.js 20.x or later
- npm or yarn
- Chromium browser (installed automatically by Playwright)

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run with UI (interactive mode)
```bash
npm run test:e2e:ui
```

### Run in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug mode
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

```
test/e2e/
├── setup/
│   ├── global-setup.js       # Starts Hardhat node and deploys contracts
│   ├── global-teardown.js    # Stops Hardhat node
│   └── deploy-contracts.js   # Contract deployment script
├── fixtures/
│   └── deployment.json       # Generated: Contract addresses and test accounts
├── helpers/
│   └── test-helpers.js       # Utility functions for tests
└── specs/
    ├── explorer.spec.js      # Explorer view tests
    ├── theme.spec.js         # Theme switching tests
    ├── address-claim.spec.js # Address claiming tests
    ├── multichain.spec.js    # Multi-chain support tests
    ├── admin.spec.js         # Admin panel tests
    ├── social-graph.spec.js  # Social features tests
    ├── reputation.spec.js    # Reputation system tests
    ├── privacy.spec.js       # Privacy controls tests
    ├── ens.spec.js           # ENS integration tests
    ├── ipfs.spec.js          # IPFS storage tests
    └── crosschain.spec.js    # Cross-chain functionality tests
```

## Test Flow

1. **Global Setup**
   - Starts local Hardhat node on port 8545
   - Deploys AddressClaim contract with test fixtures
   - Saves deployment info to `fixtures/deployment.json`

2. **Test Execution**
   - Starts Vite dev server on port 3000
   - Injects mock Ethereum provider
   - Runs test specs in order
   - Captures screenshots on failures
   - Generates HTML report

3. **Global Teardown**
   - Stops Hardhat node
   - Cleans up temporary files

## Test Features

### Wallet Mocking
Tests use a mock Ethereum provider that simulates MetaMask:
- Pre-configured test accounts from Hardhat
- Mock signing and transaction sending
- Network switching simulation

### Screenshot Capture
Screenshots are automatically taken:
- On test failures
- At key verification points
- Saved to `screenshots/e2e/`

### Cross-Chain Testing
Tests verify:
- Multiple network support
- Identity preservation across chains
- Chain-specific features
- Contract address management

### Test Reports
Generated reports include:
- Test pass/fail status
- Execution time
- Screenshots and videos
- Error traces
- HTML viewer at `playwright-report/index.html`

## Configuration

Configuration is in `playwright.config.js`:
- Test timeout: 60 seconds
- Browser: Chromium
- Viewport: 1280x720
- Retries: 2 (in CI), 0 (local)
- Workers: 1 (serial execution)

## Debugging

### View browser during tests
```bash
npm run test:e2e:headed
```

### Step through tests
```bash
npm run test:e2e:debug
```

### Check specific test
```bash
npx playwright test specs/explorer.spec.js
```

### View last run report
```bash
npm run test:e2e:report
```

## CI/CD Integration

Tests can be run in CI environments:
```bash
CI=true npm run test:e2e
```

This enables:
- Automatic retries (2x)
- No browser reuse
- Strict failure mode

## Troubleshooting

### Hardhat node fails to start
- Check port 8545 is not in use
- Ensure contracts compile successfully
- Verify Hardhat is installed

### Browser installation fails
- Run manually: `npx playwright install chromium`
- Check disk space
- Verify network connectivity

### Tests timeout
- Increase timeout in `playwright.config.js`
- Check dev server is running
- Verify Hardhat node is accessible

### Mock wallet not working
- Check `test-helpers.js` mock implementation
- Verify wallet is injected before page load
- Review browser console logs

## Coverage

Current test coverage includes:
- ✅ UI component rendering
- ✅ Navigation and routing
- ✅ Wallet connection flow
- ✅ Theme switching
- ✅ Multi-chain support
- ✅ Form validation
- ✅ Visual regression (screenshots)
- ⚠️ Contract interactions (mocked)
- ⚠️ IPFS integration (requires setup)
- ⚠️ ENS resolution (requires mainnet fork)

## Future Enhancements

- [ ] Add contract interaction tests with real transactions
- [ ] Implement IPFS node for storage tests
- [ ] Fork mainnet for ENS testing
- [ ] Add performance benchmarks
- [ ] Visual diff testing
- [ ] Accessibility audits
- [ ] Mobile viewport testing

## Contributing

When adding new tests:
1. Create spec file in `test/e2e/specs/`
2. Use helper functions from `test-helpers.js`
3. Include descriptive test names
4. Add screenshots for visual verification
5. Update this README with new coverage

## License

MIT
