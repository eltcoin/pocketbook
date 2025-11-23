# CLAUDE.md - AI Assistant Guide for Pocketbook

## Project Overview

**Pocketbook** is a decentralized identity platform built on Ethereum that enables users to claim and verify ownership of blockchain addresses. It creates a censorship-resistant human network with self-sovereign identity capabilities.

### Core Functionality
- **Address Claiming**: Users cryptographically prove ownership and attach metadata to addresses
- **Word Handles**: Deterministic BIP39-based human-readable handles for addresses
- **DID Support**: W3C compliant Decentralized Identifiers (did:ethr)
- **Multi-chain**: Simultaneous support for 8+ blockchain networks
- **Social Graph**: Follow/unfollow, friend requests, decentralized social networking
- **Reputation System**: PGP-style web of trust with Evidence-Based Subjective Logic
- **IPFS Integration**: Decentralized metadata storage with DID-based routing
- **ENS Integration**: Human-readable names with reverse lookup
- **Privacy Controls**: Public/private metadata with viewer whitelists

### Tech Stack
- **Frontend**: Svelte 5 + Vite
- **Smart Contracts**: Solidity 0.8.0/0.8.23
- **Blockchain**: Ethers.js v6
- **Testing**: Hardhat + Playwright
- **Storage**: IPFS (Helia)
- **Build**: Vite 7

## Codebase Structure

```
pocketbook/
├── contracts/              # Solidity smart contracts
│   ├── AddressClaim.sol             # Main identity contract
│   ├── AddressHandleRegistry.sol    # Word handle registry
│   ├── IAddressHandleRegistry.sol   # Interface
│   └── generated/
│       └── Bip39Vocabulary.sol      # Auto-generated BIP39 vocabulary
│
├── src/                   # Frontend source code
│   ├── components/        # Svelte components
│   │   ├── App.svelte              # Root component, routing
│   │   ├── Header.svelte           # Navigation header
│   │   ├── Explorer.svelte         # Address explorer/claim UI
│   │   ├── AddressView.svelte      # Individual address details
│   │   ├── AddressClaim.svelte     # Claim creation form
│   │   ├── AdminPanel.svelte       # Admin/deployment tools
│   │   ├── SocialGraph.svelte      # Social graph UI
│   │   ├── Reputation.svelte       # Reputation system UI
│   │   ├── AnimatedBackground.svelte  # Canvas star field
│   │   ├── Icon.svelte             # SVG icon system
│   │   ├── Toast.svelte            # Notification system
│   │   └── NetworkSelector.svelte  # Chain selector
│   │
│   ├── stores/           # Svelte stores (state management)
│   │   ├── multichain.js          # Multi-chain provider & contract store
│   │   ├── theme.js               # Dark/light mode
│   │   ├── ipfs.js                # IPFS instance management
│   │   └── toast.js               # Toast notifications
│   │
│   ├── utils/            # Utility functions
│   │   ├── router.js              # URL-based routing
│   │   ├── claimParser.js         # Parse on-chain claim data
│   │   ├── wordhandles.js         # Handle encoding/decoding
│   │   ├── reputation.js          # EBSL algorithm
│   │   ├── socialGraph.js         # Social graph utilities
│   │   ├── ens.js                 # ENS resolution
│   │   ├── ipfs.js                # IPFS operations
│   │   ├── crypto.js              # Cryptographic utilities
│   │   ├── encryption.js          # Encryption/decryption
│   │   └── blockchainExplorer.js  # External explorer links
│   │
│   ├── config/           # Configuration files
│   │   ├── networks.js            # Multi-chain network configs
│   │   ├── addressClaimArtifact.js     # Contract ABI/bytecode
│   │   ├── handleRegistryArtifact.js   # Handle registry ABI/bytecode
│   │   ├── handleRegistryABI.js        # Handle registry ABI
│   │   └── bip39VocabularyArtifact.js  # BIP39 vocabulary ABI/bytecode
│   │
│   └── main.js           # Entry point
│
├── scripts/              # Build & deployment scripts
│   ├── compile-contract.cjs          # Compile AddressClaim
│   ├── compile-handle-registry.cjs   # Compile handle contracts
│   ├── setup-test-env.sh             # E2E test setup
│   ├── run-all-tests-web3.sh         # Run all Web3 tests
│   └── utils/                        # Script utilities
│
├── test/                 # Test suites
│   ├── hardhat/          # Smart contract tests
│   │   └── AddressClaim.security.test.js
│   ├── e2e/              # Playwright E2E tests
│   │   ├── specs/        # Test specifications
│   │   ├── setup/        # Global setup/teardown
│   │   └── helpers/      # Test helpers
│   ├── socialGraph.test.js    # Social graph unit tests
│   └── reputation.test.js     # Reputation system unit tests
│
├── docs/                 # Documentation
│   ├── ENS_INTEGRATION.md
│   ├── IPFS_INTEGRATION.md
│   ├── REPUTATION_SYSTEM.md
│   ├── SOCIAL_GRAPH.md
│   └── D3_GRAPH_EXPLORER.md
│
├── public/               # Static assets
│   └── wordlists/
│       └── bip39-english.txt    # BIP39 word list
│
├── .env.example          # Environment variable template
├── package.json          # Dependencies & scripts
├── vite.config.js        # Vite configuration
├── hardhat.config.js     # Hardhat configuration
├── playwright.config.js  # Playwright E2E config
└── README.md            # User-facing documentation
```

## Smart Contracts Architecture

### AddressClaim.sol
**Primary contract for identity management (1100+ lines)**

**Key Structures:**
- `Metadata`: Name, avatar, bio, social links, PGP signature, IPFS CID, privacy settings
- `Claim`: Links address to metadata, signature, timestamps, DID document
- `DIDDocument`: W3C DID standard implementation with service endpoints
- `SocialGraph`: Following/followers/friends relationships
- `Attestation`: Reputation attestations with trust levels

**Critical Functions:**
- `claimAddress()`: Create new identity claim (with reentrancy guard)
- `updateMetadata()`: Update claim metadata
- `revokeClaim()`: Delete claim and clear state
- `followUser()`, `unfollowUser()`, `sendFriendRequest()`, etc.: Social graph
- `createAttestation()`, `revokeAttestation()`: Reputation system
- DID management: `addServiceEndpoint()`, `addAlsoKnownAs()`, etc.

**Security Features:**
- ReentrancyGuard on critical state-changing functions
- Signature malleability prevention (v/s value validation)
- Privacy access controls (viewer whitelists)
- Proper array cleanup on revocation ([H-01] fix)
- DID mapping cleanup ([M-01] fix)

### AddressHandleRegistry.sol
**Deterministic word handle system**

**Key Features:**
- Maps addresses to BIP39-encoded byte handles
- One handle per address, globally unique
- Immutable vocabulary parameters (length, hash)
- `claim()`: Mint a handle
- `release()`: Release handle back to pool
- Validation ensures handles use valid vocabulary indices

### Contract Deployment
- Uses solc 0.8.23 with IR optimizer (200 runs) for production
- Uses solc 0.8.0 without IR for Hardhat testing (compatibility)
- Compilation scripts: `npm run compile:contract`, `npm run compile:handle-registry`
- Bytecode stored in `.env` variables for deployment from frontend

## Frontend Architecture

### State Management (Svelte Stores)

**multichain.js** - Core application state
```javascript
{
  primaryAddress: string,      // Connected wallet address
  primaryChainId: number,       // Active chain ID
  primarySigner: Signer,        // Ethers signer
  connected: boolean,           // Wallet connection status
  chains: {                     // Multi-chain providers
    [chainId]: {
      provider: JsonRpcProvider,
      contract: Contract,
      networkConfig: Object,
      isAvailable: boolean
    }
  },
  initializedChains: number[],
  pendingFriendRequests: { sent: [], received: [] },
  trustScore: number,
  reputationSummary: Object
}
```

**Key Store Functions:**
- `connectWallet()`: Initialize MetaMask connection
- `switchNetwork(chainId)`: Switch primary chain
- `initializeAllChains()`: Create providers for all supported networks
- `getContract(chainId)`: Get contract instance for specific chain
- `claimAddress()`, `updateMetadata()`: Contract interactions
- `followUser()`, `createAttestation()`: Social/reputation functions

### Routing System

**router.js** - Simple URL-based routing
- Routes: `/` (explorer), `/claim`, `/explore/:address`, `/admin`
- `navigate(path)`: Programmatic navigation with history API
- `currentRoute`: Derived store with view and params
- Supports browser back/forward buttons via popstate

### Component Architecture

**App.svelte** - Root component
- Manages routing state
- Renders Header + current view (Explorer/AddressClaim/AddressView/AdminPanel)
- Handles theme switching
- Includes AnimatedBackground, Toast, LoadingBar

**Explorer.svelte** - Main explorer view (unified with claim page)
- Shows network statistics (total claims, users, attestations)
- Lists claimed addresses with handles, ENS
- Search functionality
- Claim form integrated
- Tabs for "Explore" and "Your Claims"

**AddressView.svelte** - Individual address details
- Displays full claim metadata
- Shows social graph (followers, following, friends)
- Reputation score visualization
- Transaction history tabs
- ENS name display
- IPFS metadata fetching

**Key Design Patterns:**
- Event-driven communication (`dispatch('viewChange', { view, address })`)
- Reactive statements for state updates (`$: if (condition) { ... }`)
- Store subscriptions with `$storeVariableName` syntax
- Async/await with try-catch for blockchain operations
- Toast notifications for user feedback

### Styling System

**Design Principles:**
- Matte finish (no glassmorphism post recent redesign)
- Card-based layout with subtle shadows
- Neutral slate palette (light) / dark slate (dark mode)
- Professional Inter typography
- SVG icon system (Icon.svelte) - 12 Material-inspired icons

**Color Palette:**
```css
/* Light Mode */
--background: #f8fafc (slate-50)
--card: #ffffff with #e2e8f0 borders
--text-primary: #0f172a (slate-900)
--text-muted: #64748b (slate-500)

/* Dark Mode */
--background: #0f172a (slate-900)
--card: #1e293b (slate-800) with #334155 borders
--text-primary: #f1f5f9 (slate-100)
--text-muted: #94a3b8 (slate-400)

/* Legacy accent colors (may still be in some components) */
--accent-primary: #3b82f6 (blue)
--accent-secondary: #8b5cf6 (purple)
```

**Responsive Design:**
- Mobile-first approach
- Breakpoint at 768px
- Flexible grid/flexbox layouts
- Touch-friendly buttons (min 44px)

## Development Workflows

### Initial Setup
```bash
npm install                      # Install dependencies
cp .env.example .env            # Create environment file
npm run compile:all-contracts   # Compile smart contracts
npm run dev                     # Start dev server (localhost:3000)
```

### Contract Development
```bash
npm run compile:contract         # Compile AddressClaim.sol
npm run compile:handle-registry  # Compile AddressHandleRegistry.sol
npm run compile:all-contracts    # Compile all contracts

npm test                         # Run Hardhat tests
npm run test:security            # Run security-focused tests
```

**Contract Compilation Process:**
1. Scripts download solc 0.8.23 if not cached
2. Compile contracts with IR optimizer (200 runs)
3. Generate ABI + bytecode JSON artifacts in `build/`
4. Auto-update `.env` with bytecode for deployment
5. Refresh config files in `src/config/`

### Frontend Development
```bash
npm run dev          # Dev server with hot reload (port 3000)
npm run build        # Production build
npm run preview      # Preview production build
```

**Adding a New Feature:**
1. Create/modify Svelte component in `src/components/`
2. Add state to appropriate store if needed
3. Wire up to router if new page
4. Add contract interactions via multichain store
5. Update types/interfaces as needed
6. Write E2E tests in `test/e2e/specs/`

### Testing
```bash
# Unit tests (Hardhat)
npm test                    # All contract tests
npm run test:security       # Security-specific tests

# E2E tests (Playwright)
npm run test:e2e            # All E2E tests
npm run test:e2e:headed     # Run with browser UI
npm run test:e2e:ui         # Interactive UI mode
npm run test:e2e:debug      # Debug mode
npm run test:e2e:simple     # Simple config (no Web3)
npm run test:e2e:web3       # All Web3 tests (comprehensive)
npm run test:e2e:report     # View test report

# Setup for E2E
npm run test:setup          # Deploy contracts to Hardhat network
```

## Multi-Chain Support

### Network Configuration
**File:** `src/config/networks.js`

**Supported Networks:**
- Ethereum Mainnet (chainId: 1)
- Polygon (137)
- BNB Smart Chain (56)
- Arbitrum One (42161)
- Optimism (10)
- Avalanche C-Chain (43114)
- Sepolia Testnet (11155111)
- Polygon Mumbai (80001)

**Each Network Config:**
```javascript
{
  chainId: number,
  chainIdHex: string,
  name: string,
  shortName: string,
  rpcUrl: string,
  blockExplorer: string,
  nativeCurrency: { name, symbol, decimals },
  contractAddress: string,           // AddressClaim address
  handleRegistryAddress: string,     // Handle registry address
  isTestnet?: boolean
}
```

### Adding a New Chain
1. Add config to `NETWORKS` object in `src/config/networks.js`
2. Add env variables to `.env.example` and `.env`:
   - `VITE_CONTRACT_ADDRESS_<NETWORK>`
   - `VITE_HANDLE_REGISTRY_ADDRESS_<NETWORK>`
3. Deploy contracts to new chain
4. Update env with deployed addresses
5. Test multi-chain view and switching

### Multi-Chain Pattern
- App maintains **simultaneous providers** for all chains
- Primary wallet connects to one chain (active network)
- Read-only providers for other chains
- UI shows data from all chains in multi-chain views
- Users switch network to interact with specific chain

## Environment Configuration

### Required Environment Variables

**.env file structure:**
```bash
# Contract Bytecode (auto-populated by compile scripts)
VITE_ADDRESS_CLAIM_BYTECODE=0x...
VITE_HANDLE_REGISTRY_BYTECODE=0x...
VITE_BIP39_VOCABULARY_BYTECODE=0x...

# Deployed Contract Addresses (per network)
VITE_CONTRACT_ADDRESS_ETHEREUM=0x...
VITE_CONTRACT_ADDRESS_POLYGON=0x...
VITE_CONTRACT_ADDRESS_BSC=0x...
VITE_CONTRACT_ADDRESS_ARBITRUM=0x...
VITE_CONTRACT_ADDRESS_OPTIMISM=0x...
VITE_CONTRACT_ADDRESS_AVALANCHE=0x...
VITE_CONTRACT_ADDRESS_SEPOLIA=0x...
VITE_CONTRACT_ADDRESS_MUMBAI=0x...

# Handle Registry Addresses (per network)
VITE_HANDLE_REGISTRY_ADDRESS_ETHEREUM=0x...
VITE_HANDLE_REGISTRY_ADDRESS_POLYGON=0x...
# ... (same pattern for all networks)
```

**Important:**
- Never commit `.env` to version control
- Use `.env.example` as template
- `import.meta.env.VITE_*` to access in frontend
- Vite only exposes vars prefixed with `VITE_`

## Key Conventions & Patterns

### Code Organization
- **One component per file** in `src/components/`
- **Stores** are separate from components
- **Utils** are pure functions, no side effects
- **Config** files for constants and network data

### Naming Conventions
- **Components**: PascalCase (e.g., `AddressView.svelte`)
- **Stores**: camelCase with 'Store' suffix (e.g., `multiChainStore`)
- **Functions**: camelCase (e.g., `connectWallet`, `claimAddress`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `ZERO_ADDRESS`)
- **Contract functions**: camelCase matching Solidity

### Error Handling
```javascript
try {
  const tx = await contract.claimAddress(...);
  await tx.wait();
  toastStore.show('Success!', 'success');
} catch (error) {
  console.error('Error claiming:', error);
  let message = 'Transaction failed';
  if (error.code === 'ACTION_REJECTED') {
    message = 'Transaction rejected';
  }
  toastStore.show(message, 'error');
}
```

### Async Patterns
- Use `async/await` consistently
- Always `await tx.wait()` for transaction confirmations
- Show loading states during async operations
- Provide user feedback via toast notifications

### State Updates
```javascript
// Reactive statements for side effects
$: if ($multiChainStore.connected) {
  loadClaimData();
}

// Update stores
multiChainStore.updateState({ connected: true });

// Subscribe to stores
const unsubscribe = multiChainStore.subscribe(value => {
  // Handle updates
});
onDestroy(unsubscribe);
```

### Contract Interaction Pattern
```javascript
import { multiChainStore } from '../stores/multichain';
import { toastStore } from '../stores/toast';

async function claimAddress() {
  try {
    const store = get(multiChainStore);
    if (!store.connected) {
      toastStore.show('Connect wallet first', 'error');
      return;
    }

    const tx = await store.primaryContract.claimAddress(...args);
    toastStore.show('Transaction submitted', 'info');

    await tx.wait();
    toastStore.show('Address claimed!', 'success');

    // Refresh state
    await loadClaims();
  } catch (error) {
    console.error(error);
    toastStore.show('Failed to claim address', 'error');
  }
}
```

## Word Handles System

### Overview
- Deterministic, BIP39-based handles for addresses
- Encoded as bytes: `[length][index1_hi][index1_lo][index2_hi][index2_lo]...`
- Registry contract ensures uniqueness
- Vocabulary: 2048 words (BIP39 English)
- Max length: configurable (typically 3-4 words)

### Files
- `contracts/AddressHandleRegistry.sol`: On-chain registry
- `public/wordlists/bip39-english.txt`: Word vocabulary
- `src/utils/wordhandles.js`: Encoding/decoding utilities

### Usage Pattern
```javascript
import { encodeHandle, decodeHandle, generateHandles } from '../utils/wordhandles';

// Generate suggested handles for address
const suggestions = await generateHandles(address, networkConfig, 5);
// Returns: ['swift-river-moon', 'bright-eagle-wind', ...]

// Encode handle to bytes
const handleBytes = encodeHandle(['swift', 'river', 'moon']);

// Claim handle
await handleRegistry.claim(handleBytes);

// Decode bytes to words
const words = decodeHandle(handleBytes); // ['swift', 'river', 'moon']
```

## IPFS Integration

### Implementation
- Uses Helia (modern IPFS library)
- DID-based content routing
- Store extended metadata off-chain
- CID stored on-chain in `Metadata.ipfsCID`

### Files
- `src/stores/ipfs.js`: Helia instance management
- `src/utils/ipfs.js`: IPFS operations (add, get, pin)
- `docs/IPFS_INTEGRATION.md`: Full documentation

### Usage
```javascript
import { ipfsStore } from '../stores/ipfs';

// Add data to IPFS
const cid = await ipfsStore.addData({ extraField: 'value' });

// Retrieve data
const data = await ipfsStore.getData(cid);

// Store CID on-chain
await contract.updateMetadata(..., cid);
```

## Social Graph & Reputation

### Social Graph
**Contract Functions:**
- `followUser(address)`: Follow another user
- `unfollowUser(address)`: Unfollow
- `sendFriendRequest(address)`: Send friend request
- `acceptFriendRequest(address)`: Accept request
- `getSocialGraph(address)`: Get following/followers/friends

**Frontend:**
- `SocialGraph.svelte`: UI component
- `src/utils/socialGraph.js`: Helper functions

### Reputation System
**Algorithm:** Evidence-Based Subjective Logic (EBSL)
- Attestations: Trust level 0-100
- PGP-style web of trust
- Transitive trust calculation
- On-chain attestations, off-chain computation

**Files:**
- `src/utils/reputation.js`: EBSL implementation
- `Reputation.svelte`: UI component
- `docs/REPUTATION_SYSTEM.md`: Full spec

**Key Functions:**
```javascript
calculateReputation(address, attestations) // Returns trust score
getReputationSummary(address, attestations) // Returns detailed breakdown
```

## Common Tasks

### Deploy Contract to New Network
```bash
# 1. Ensure contracts are compiled
npm run compile:all-contracts

# 2. Update .env with network RPC if needed
# 3. Use AdminPanel in UI:
#    - Connect wallet to target network
#    - Click "Deploy AddressClaim Contract"
#    - Copy deployed address
# 4. Update .env with address
VITE_CONTRACT_ADDRESS_<NETWORK>=0x...
# 5. Restart dev server
```

### Add New Metadata Field
```solidity
// 1. Update AddressClaim.sol Metadata struct
struct Metadata {
    // ... existing fields
    string newField;
}

// 2. Update claimAddress() and updateMetadata() parameters
// 3. Recompile: npm run compile:contract
// 4. Update frontend forms to include new field
// 5. Update parseClaim in claimParser.js
// 6. Test thoroughly
```

### Debug Transaction Failures
```javascript
// Enable verbose logging in multichain store
console.log('Transaction params:', {
  address: _address,
  signature: _signature,
  // ... all params
});

// Check gas estimation
const gasEstimate = await contract.estimateGas.claimAddress(...args);
console.log('Gas estimate:', gasEstimate.toString());

// Manual gas limit
const tx = await contract.claimAddress(...args, {
  gasLimit: 500000
});

// Check revert reason
try {
  await tx.wait();
} catch (error) {
  console.error('Revert reason:', error.reason);
  console.error('Error code:', error.code);
}
```

### Run Full Test Suite
```bash
# 1. Run Hardhat contract tests
npm test

# 2. Setup E2E environment (deploys contracts locally)
npm run test:setup

# 3. Run all E2E tests
npm run test:e2e:web3

# 4. View results
npm run test:e2e:report
```

## Best Practices for AI Assistants

### When Making Changes

1. **Always read files before editing**
   - Understand current implementation
   - Check for dependencies and imports
   - Note existing patterns and conventions

2. **Maintain consistency**
   - Follow existing code style
   - Use same naming conventions
   - Match error handling patterns
   - Keep component structure similar

3. **Consider multi-chain implications**
   - New features should work across all networks
   - Test with different chain IDs
   - Handle network-specific configurations

4. **Security-first mindset**
   - Contract changes require security audit
   - Validate all user inputs
   - Use reentrancy guards on state changes
   - Clear arrays/mappings on deletion
   - Check access controls

5. **Test thoroughly**
   - Write unit tests for utils
   - Add E2E tests for UI flows
   - Test contract changes in Hardhat
   - Verify multi-chain scenarios

### Understanding Context

**Before implementing features:**
- Check `DOCUMENTATION.md` for architecture overview
- Read relevant docs in `docs/` directory
- Review existing similar implementations
- Understand contract-frontend interaction patterns

**When debugging:**
- Check browser console for errors
- Review transaction traces in MetaMask
- Use Hardhat console.log in contracts
- Check contract events via ethers listeners

### Code Quality

**Writing Svelte components:**
- Use reactive statements (`$:`) appropriately
- Unsubscribe from stores in `onDestroy`
- Keep components focused and single-purpose
- Extract complex logic to utils
- Use TypeScript-style JSDoc for functions

**Writing contract code:**
- Follow Solidity style guide
- Add NatSpec comments (`@dev`, `@param`, `@return`)
- Emit events for all state changes
- Use checks-effects-interactions pattern
- Optimize for gas when reasonable

**Writing tests:**
- Descriptive test names
- Arrange-Act-Assert pattern
- Test both success and failure cases
- Mock external dependencies when possible
- Use fixtures for consistent state

### Common Pitfalls to Avoid

❌ **Don't:**
- Modify `.env` files directly (they're gitignored) - update `.env.example` instead
- Add dependencies without checking bundle size impact
- Change contract ABIs without recompiling
- Skip transaction confirmations (`tx.wait()`)
- Hardcode chain IDs or addresses in components
- Use `any` types or suppress TypeScript errors
- Forget to update related documentation

✅ **Do:**
- Use environment variables for configuration
- Handle loading and error states in UI
- Provide clear user feedback via toasts
- Follow existing patterns for new features
- Update documentation when changing APIs
- Write meaningful commit messages
- Test on multiple networks before PRs

## Git Workflow

### Branch Naming
- Feature branches: `claude/feature-description-<session-id>`
- All Claude Code work uses `claude/` prefix
- Session ID must match for successful pushes

### Commit Messages
```bash
# Good commit messages
git commit -m "Add multi-chain explorer view with network stats"
git commit -m "Fix reentrancy vulnerability in claimAddress function"
git commit -m "Update reputation calculation to handle edge cases"

# Bad commit messages
git commit -m "fix stuff"
git commit -m "WIP"
git commit -m "asdf"
```

### Pull Request Process
1. Ensure all tests pass
2. Update relevant documentation
3. Add clear PR description with:
   - What changed
   - Why it changed
   - How to test
   - Screenshots if UI changes
4. Link to related issues
5. Request review from maintainers

## Performance Considerations

### Frontend
- Lazy load large components
- Debounce search inputs
- Paginate long lists (addresses, transactions)
- Cache blockchain queries when possible
- Minimize re-renders with reactive statements

### Contracts
- Batch operations where possible
- Use events instead of storing redundant data
- Avoid loops over unbounded arrays
- Pack struct variables efficiently
- Consider gas costs in design decisions

### IPFS
- Pin frequently accessed content
- Implement retry logic for failures
- Show loading states for slow retrievals
- Cache retrieved data in local storage

## Resources

### Documentation
- `README.md`: User-facing project overview
- `DOCUMENTATION.md`: Comprehensive architecture guide
- `docs/ENS_INTEGRATION.md`: ENS implementation details
- `docs/IPFS_INTEGRATION.md`: IPFS storage guide
- `docs/REPUTATION_SYSTEM.md`: EBSL algorithm spec
- `docs/SOCIAL_GRAPH.md`: Social features guide
- `DEPLOYMENT.md`: Deployment procedures
- `TESTING_GUIDE.md`: Testing best practices

### External Resources
- [Svelte 5 Docs](https://svelte.dev/docs)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [Solidity Docs](https://docs.soliditylang.org/)
- [Hardhat Docs](https://hardhat.org/docs)
- [Playwright Docs](https://playwright.dev/)
- [W3C DID Spec](https://www.w3.org/TR/did-core/)

### Key Files for Reference
- `src/stores/multichain.js`: Core state & blockchain interactions
- `contracts/AddressClaim.sol`: Main contract logic
- `src/App.svelte`: Routing and app structure
- `src/config/networks.js`: Multi-chain configuration
- `test/e2e/helpers/test-helpers-web3.js`: E2E testing patterns

## Conclusion

This guide should help AI assistants understand the Pocketbook codebase structure, conventions, and development workflows. When in doubt:

1. **Read the code** - The codebase is well-structured and documented
2. **Follow patterns** - Consistency is key
3. **Test thoroughly** - Both unit and E2E tests
4. **Ask questions** - If requirements are unclear
5. **Document changes** - Update relevant docs

Remember: This is a decentralized identity platform handling user data and cryptographic operations. Security, privacy, and user experience are paramount.
