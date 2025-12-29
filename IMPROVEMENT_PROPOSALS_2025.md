# Pocketbook Improvement Proposals - 2025

**Date:** December 29, 2025
**Status:** Ready for Implementation
**Priority Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Overview

This document outlines 15 prioritized improvement proposals for Pocketbook based on comprehensive codebase review. Proposals are organized by implementation timeline and impact.

**Total Proposals:** 15
- Critical Priority: 3
- High Priority: 4
- Medium Priority: 5
- Low Priority: 3

**Estimated Total Effort:** 12 weeks (1 developer)

---

## Critical Priority Proposals

### Proposal #1: Install Missing Dependencies 🔴

**Priority:** Critical (Blocker)
**Effort:** 5 minutes
**Impact:** Essential for running application
**Status:** Ready to implement

#### Problem
All npm dependencies show as "MISSING" - application cannot run.

```bash
$ npm outdated
Package        Current  Wanted  Latest
@helia/json    MISSING   5.0.3   5.0.3
ethers         MISSING  6.16.0  6.16.0
svelte         MISSING  5.43.3  5.43.3
```

#### Solution
```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0

# Run development server to confirm
npm run dev
```

#### Success Criteria
- [ ] All packages installed in node_modules
- [ ] `npm list` shows no errors
- [ ] `npm run dev` starts successfully
- [ ] Application loads in browser at localhost:3000

#### Implementation Steps
1. Run `npm install` in project root
2. Verify no installation errors
3. Test application startup
4. Commit package-lock.json if updated

---

### Proposal #2: Upgrade Solidity Compiler 🔴

**Priority:** Critical (Security)
**Effort:** 2 hours
**Impact:** Security patches, optimizations, bug fixes
**Status:** Ready to implement

#### Problem
Using Solidity 0.8.0 from April 2021 (3+ years old):
- Missing security patches from 0.8.1 - 0.8.25
- Missing optimization features
- Using workaround `viaIR: false`
- Current version: 0.8.25 (January 2024)

**File:** `hardhat.config.js:5-14`

#### Solution

**Before:**
```javascript
solidity: {
  version: "0.8.0",
  settings: {
    viaIR: false,
  }
}
```

**After:**
```javascript
solidity: {
  version: "0.8.25",
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}
```

#### Implementation Steps

1. **Update hardhat.config.js**
   ```javascript
   module.exports = {
     solidity: {
       version: "0.8.25",
       settings: {
         viaIR: true,
         optimizer: {
           enabled: true,
           runs: 200,
         },
       },
     },
   };
   ```

2. **Update package.json**
   ```json
   {
     "devDependencies": {
       "solc": "^0.8.25"
     }
   }
   ```

3. **Recompile contracts**
   ```bash
   npm run compile:all-contracts
   ```

4. **Run security tests**
   ```bash
   npm run test:security
   ```

5. **Run full test suite**
   ```bash
   npm test
   ```

6. **Update COMPILATION.md** with new compiler version

#### Success Criteria
- [ ] Hardhat config updated to 0.8.25
- [ ] All contracts compile without errors
- [ ] All tests pass
- [ ] No new security warnings
- [ ] Bytecode size within limits
- [ ] Gas usage similar or improved

#### Risks & Mitigations
- **Risk:** Breaking changes in Solidity 0.8.x
  - **Mitigation:** Review changelog, run comprehensive tests
- **Risk:** Increased gas costs
  - **Mitigation:** Compare gas reports before/after

---

### Proposal #3: Implement Lazy Multi-Chain Loading 🔴

**Priority:** Critical (Performance)
**Effort:** 1 week
**Impact:** Reduces initial load from 4-8 minutes to <30 seconds
**Status:** Ready to implement

#### Problem
Application initializes all 8 blockchain networks on connection:
- Sequential loading: 8 × 30-60s = 4-8 minutes
- Blocks UI during initialization
- Wastes resources on unused chains
- Poor user experience

**File:** `src/stores/multichain.js:105-197`

#### Current Behavior
```javascript
// Initializes ALL networks sequentially
for (const network of networks) {
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    await provider.getBlockNumber(); // Blocking!
}
```

#### Solution Architecture

**Phase 1: Immediate Load (Active Chain Only)**
```javascript
async function connectWallet() {
  // 1. Connect to MetaMask
  const activeChainId = await window.ethereum.request({
    method: 'eth_chainId'
  });

  // 2. Load ONLY active chain
  await initializeChain(activeChainId);

  // 3. Queue background loading for other chains
  queueBackgroundChainLoading(otherChainIds);
}
```

**Phase 2: Background Loading (Other Chains)**
```javascript
async function queueBackgroundChainLoading(chainIds) {
  // Load chains in parallel with Promise.allSettled
  const promises = chainIds.map(id =>
    initializeChain(id).catch(err => ({
      chainId: id,
      error: err.message
    }))
  );

  await Promise.allSettled(promises);
}
```

#### Implementation Plan

**Step 1: Refactor multichain.js**

Create new functions:
```javascript
// Initialize single chain
async function initializeChain(chainId, options = {}) {
  const network = networks.find(n => n.chainId === chainId);
  if (!network) return null;

  const provider = new ethers.JsonRpcProvider(
    network.rpcUrl,
    network.chainId,
    options.providerOptions
  );

  // Only await if foreground loading
  if (options.foreground) {
    await provider.getBlockNumber();
  }

  return provider;
}

// Queue background loading
function queueBackgroundChainLoading(chainIds) {
  setTimeout(async () => {
    const promises = chainIds.map(id =>
      initializeChain(id, { foreground: false })
    );
    await Promise.allSettled(promises);
    // Update store when complete
    chainsInitialized.set(true);
  }, 0);
}
```

**Step 2: Update connectWallet()**
```javascript
export async function connectWallet() {
  // Get active chain from MetaMask
  const chainIdHex = await window.ethereum.request({
    method: 'eth_chainId'
  });
  const activeChainId = parseInt(chainIdHex, 16);

  // Initialize ONLY active chain
  const activeProvider = await initializeChain(activeChainId, {
    foreground: true
  });

  // Update store
  primaryChainId.set(activeChainId);

  // Queue other chains for background loading
  const otherChainIds = networks
    .map(n => n.chainId)
    .filter(id => id !== activeChainId);

  queueBackgroundChainLoading(otherChainIds);

  return { success: true, chainId: activeChainId };
}
```

**Step 3: Add Loading Progress UI**

Create `LoadingProgress.svelte`:
```svelte
<script>
  import { derived } from 'svelte/store';
  import { multiChainStore } from '../stores/multichain';

  const progress = derived(multiChainStore, $store => {
    const total = 8;
    const loaded = Object.keys($store.chains).length;
    return { loaded, total, percent: (loaded / total) * 100 };
  });
</script>

{#if $progress.loaded < $progress.total}
  <div class="loading-progress">
    <p>Loading networks: {$progress.loaded}/{$progress.total}</p>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {$progress.percent}%"></div>
    </div>
  </div>
{/if}
```

**Step 4: Add Chain Status Indicator**
```javascript
// Add to multichain store
export const chainStatus = writable({
  1: 'loading',      // Ethereum
  137: 'loaded',     // Polygon (active)
  56: 'loading',     // BSC
  // ...
});
```

#### Success Criteria
- [ ] Active chain loads in <5 seconds
- [ ] UI responsive during background loading
- [ ] All chains eventually load
- [ ] Progress indicator shows loading status
- [ ] Error handling for failed chains
- [ ] No degradation in functionality

#### Testing Requirements
1. Unit tests for chain initialization
2. E2E test for wallet connection speed
3. Test error scenarios (network failures)
4. Test chain switching during background load
5. Performance benchmark comparison

#### Files to Modify
- `src/stores/multichain.js` - Core loading logic
- `src/components/Header.svelte` - Loading UI
- `src/components/LoadingBar.svelte` - Progress indicator
- `test/e2e/specs/multichain.spec.js` - Add performance tests

---

## High Priority Proposals

### Proposal #4: Add ENS Caching Layer 🟠

**Priority:** High (Performance)
**Effort:** 3 days
**Impact:** Reduces redundant RPC calls by 80-90%
**Status:** Ready to implement

#### Problem
Every ENS lookup hits the RPC provider without caching:
- Multiple lookups for same address on navigation
- Redundant network calls
- Slower UX
- Higher RPC costs

**File:** `src/utils/ens.js:40-57`

#### Solution

**Create ENS Cache Manager:**
```javascript
// src/utils/ensCache.js

class ENSCache {
  constructor(ttlMinutes = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000; // Convert to ms
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  clear() {
    this.cache.clear();
  }

  // Clear cache on network change
  clearOnNetworkChange(chainId) {
    if (this.lastChainId && this.lastChainId !== chainId) {
      this.clear();
    }
    this.lastChainId = chainId;
  }
}

export const ensCache = new ENSCache(5); // 5-minute TTL
```

**Update ens.js:**
```javascript
import { ensCache } from './ensCache';

export async function lookupENSName(address, provider) {
  // Check cache first
  const cached = ensCache.get(`name:${address.toLowerCase()}`);
  if (cached !== null) {
    return cached;
  }

  try {
    const ensName = await provider.lookupAddress(address);

    // Cache result (including null)
    ensCache.set(`name:${address.toLowerCase()}`, ensName);

    return ensName;
  } catch (error) {
    console.error('ENS lookup error:', error);
    return null;
  }
}

export async function resolveENSName(ensName, provider) {
  // Check cache first
  const cached = ensCache.get(`addr:${ensName.toLowerCase()}`);
  if (cached !== null) {
    return cached;
  }

  try {
    const address = await provider.resolveName(ensName);

    // Cache bidirectionally
    if (address) {
      ensCache.set(`addr:${ensName.toLowerCase()}`, address);
      ensCache.set(`name:${address.toLowerCase()}`, ensName);
    }

    return address;
  } catch (error) {
    console.error('ENS resolution error:', error);
    return null;
  }
}
```

#### Implementation Steps
1. Create `src/utils/ensCache.js`
2. Update `src/utils/ens.js` to use cache
3. Add cache clearing on network change
4. Add cache stats for debugging
5. Write unit tests for cache logic
6. Add E2E tests to verify caching works

#### Success Criteria
- [ ] Cache hit rate > 80% in typical usage
- [ ] TTL configurable (default 5 minutes)
- [ ] Cache cleared on network change
- [ ] No stale data shown to users
- [ ] Unit tests cover all cache operations

---

### Proposal #5: Split Large Components 🟠

**Priority:** High (Maintainability)
**Effort:** 2 weeks
**Impact:** Improved testability, maintainability, reusability
**Status:** Ready to implement

#### Problem
Three components exceed 1,400 lines each:
- `Explorer.svelte`: 2,093 LOC
- `AddressView.svelte`: 1,558 LOC
- `AddressClaim.svelte`: 1,411 LOC

**Issues:**
- Single Responsibility Principle violation
- Hard to test individual features
- Difficult to maintain
- Poor code reusability

#### Solution

**Component Splitting Strategy:**

### Phase 1: Split Explorer.svelte (2,093 → ~500 LOC)

**Before:** Single 2,093-line component
**After:** 4 focused components

```
Explorer.svelte (500 LOC)
├── ExplorerStats.svelte (200 LOC)
├── RecentClaims.svelte (400 LOC)
├── SearchBar.svelte (150 LOC)
└── ClaimCard.svelte (150 LOC)
```

**New file structure:**
```svelte
<!-- Explorer.svelte (Main orchestrator) -->
<script>
  import ExplorerStats from './explorer/ExplorerStats.svelte';
  import RecentClaims from './explorer/RecentClaims.svelte';
  import SearchBar from './explorer/SearchBar.svelte';

  let searchQuery = '';
  let claims = [];
  let stats = {};
</script>

<div class="explorer">
  <SearchBar bind:value={searchQuery} on:search={handleSearch} />
  <ExplorerStats {stats} />
  <RecentClaims {claims} />
</div>
```

**ExplorerStats.svelte:**
```svelte
<script>
  export let stats = {
    totalClaims: 0,
    totalAddresses: 0,
    networksActive: 0
  };
</script>

<div class="stats-grid">
  <div class="stat-card">
    <h3>{stats.totalClaims}</h3>
    <p>Total Claims</p>
  </div>
  <!-- ... -->
</div>
```

### Phase 2: Split AddressView.svelte (1,558 → ~500 LOC)

**New structure:**
```
AddressView.svelte (500 LOC)
├── AddressProfile.svelte (300 LOC)
├── AddressTransactions.svelte (400 LOC)
├── AddressSocialGraph.svelte (300 LOC)
└── AddressMetadata.svelte (200 LOC)
```

### Phase 3: Split AddressClaim.svelte (1,411 → ~500 LOC)

**New structure:**
```
AddressClaim.svelte (500 LOC)
├── ClaimForm.svelte (400 LOC)
├── HandleSelector.svelte (350 LOC)
├── PrivacyControls.svelte (250 LOC)
└── FormValidation.js (100 LOC utility)
```

#### Implementation Plan

**Week 1: Explorer Component**
- Day 1-2: Extract ExplorerStats
- Day 3-4: Extract RecentClaims + ClaimCard
- Day 5: Extract SearchBar, integrate all

**Week 2: AddressView Component**
- Day 1-2: Extract AddressProfile
- Day 3-4: Extract AddressTransactions
- Day 5: Extract metadata displays

#### Success Criteria
- [ ] All components < 500 LOC
- [ ] Each component has single responsibility
- [ ] Unit tests for each new component
- [ ] No functionality lost
- [ ] Performance same or better
- [ ] Code reusability improved

#### Files to Create
- `src/components/explorer/ExplorerStats.svelte`
- `src/components/explorer/RecentClaims.svelte`
- `src/components/explorer/SearchBar.svelte`
- `src/components/explorer/ClaimCard.svelte`
- `src/components/address/AddressProfile.svelte`
- `src/components/address/AddressTransactions.svelte`
- `src/components/address/AddressSocialGraph.svelte`
- `src/components/claim/ClaimForm.svelte`
- `src/components/claim/HandleSelector.svelte`
- `src/components/claim/PrivacyControls.svelte`

---

### Proposal #6: Add Store Unit Tests 🟠

**Priority:** High (Quality)
**Effort:** 1 week
**Impact:** Catch bugs earlier, enable safe refactoring
**Status:** Ready to implement

#### Problem
No unit tests for critical state management logic:
- `multichain.js`: 1,200 LOC - 0 unit tests
- `ethers.js`: 240 LOC - 0 unit tests
- `ipfs.js`: 600 LOC - 0 unit tests
- `theme.js`: 60 LOC - 0 unit tests

**Impact:** Logic bugs only caught by slow E2E tests

#### Solution

**Add Vitest for Unit Testing:**

```bash
npm install -D vitest @testing-library/svelte happy-dom
```

**Configure vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.spec.js',
      ],
    },
  },
});
```

#### Test Examples

**multichain.test.js:**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { multiChainStore } from '../src/stores/multichain';
import { ethers } from 'ethers';

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn(),
    BrowserProvider: vi.fn(),
    Contract: vi.fn(),
  }
}));

describe('multichain store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const state = get(multiChainStore);
    expect(state.primaryChainId).toBeNull();
    expect(state.chains).toEqual({});
  });

  it('should connect wallet successfully', async () => {
    // Mock window.ethereum
    global.window = {
      ethereum: {
        request: vi.fn().mockResolvedValue('0x1')
      }
    };

    const result = await multiChainStore.connectWallet();

    expect(result.success).toBe(true);
    expect(result.chainId).toBe(1);
  });

  it('should handle connection errors', async () => {
    global.window = {
      ethereum: {
        request: vi.fn().mockRejectedValue(new Error('User rejected'))
      }
    };

    const result = await multiChainStore.connectWallet();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  // ... 30+ more tests
});
```

**ens.test.js:**
```javascript
import { describe, it, expect, vi } from 'vitest';
import { resolveENSName, lookupENSName, isENSName } from '../src/utils/ens';

describe('ENS utilities', () => {
  it('should detect ENS names correctly', () => {
    expect(isENSName('vitalik.eth')).toBe(true);
    expect(isENSName('0x123...')).toBe(false);
    expect(isENSName('alice.xyz')).toBe(true);
  });

  it('should resolve ENS names', async () => {
    const mockProvider = {
      resolveName: vi.fn().mockResolvedValue('0x123...abc')
    };

    const address = await resolveENSName('vitalik.eth', mockProvider);

    expect(address).toBe('0x123...abc');
    expect(mockProvider.resolveName).toHaveBeenCalledWith('vitalik.eth');
  });

  // ... 10+ more tests
});
```

#### Test Coverage Goals

| Store/Utility | Target Coverage | Test Count |
|---------------|----------------|------------|
| multichain.js | 80% | 40 tests |
| ethers.js | 85% | 15 tests |
| ipfs.js | 75% | 20 tests |
| ens.js | 90% | 12 tests |
| reputation.js | 85% | 25 tests |
| wordhandles.js | 80% | 10 tests |
| crypto.js | 90% | 8 tests |
| theme.js | 95% | 5 tests |

**Total:** ~135 unit tests

#### Implementation Plan

**Week 1:**
- Day 1: Setup Vitest, configure
- Day 2: Write multichain.js tests (40)
- Day 3: Write ethers.js tests (15)
- Day 4: Write ipfs.js tests (20)
- Day 5: Write utility tests (60)

#### Success Criteria
- [ ] Vitest configured and running
- [ ] 80%+ code coverage for stores
- [ ] All tests passing
- [ ] CI/CD integration
- [ ] npm test runs both unit + E2E tests

---

### Proposal #7: Implement EIP-712 Typed Data Signing 🟠

**Priority:** High (Security)
**Effort:** 4 days
**Impact:** Prevents signature replay attacks
**Status:** Ready to implement

#### Problem
Current signing uses plain messages without domain separation:
```javascript
export async function signMessage(message, signer) {
  const signature = await signer.signMessage(message);
  return signature;
}
```

**Risks:**
- Signature replay across different domains
- No chain ID verification
- No nonce to prevent replay

**File:** `src/utils/crypto.js:9-17`

#### Solution

Implement EIP-712 typed data signing with domain separation.

**Create eip712.js:**
```javascript
// src/utils/eip712.js

/**
 * EIP-712 domain separator
 */
export function getDomain(contractAddress, chainId) {
  return {
    name: 'Pocketbook',
    version: '1',
    chainId: chainId,
    verifyingContract: contractAddress,
  };
}

/**
 * Claim signature types
 */
export const CLAIM_TYPES = {
  ClaimAddress: [
    { name: 'address', type: 'address' },
    { name: 'name', type: 'string' },
    { name: 'avatar', type: 'string' },
    { name: 'bio', type: 'string' },
    { name: 'website', type: 'string' },
    { name: 'twitter', type: 'string' },
    { name: 'github', type: 'string' },
    { name: 'publicKey', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' },
  ],
};

/**
 * Sign claim using EIP-712
 */
export async function signClaim(claimData, signer, contractAddress, chainId) {
  const domain = getDomain(contractAddress, chainId);

  const value = {
    address: claimData.address,
    name: claimData.name,
    avatar: claimData.avatar || '',
    bio: claimData.bio || '',
    website: claimData.website || '',
    twitter: claimData.twitter || '',
    github: claimData.github || '',
    publicKey: claimData.publicKey || '',
    nonce: claimData.nonce,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const signature = await signer.signTypedData(domain, CLAIM_TYPES, value);

  return {
    signature,
    timestamp: value.timestamp,
  };
}

/**
 * Verify EIP-712 signature (off-chain check)
 */
export function verifyClaimSignature(
  claimData,
  signature,
  contractAddress,
  chainId
) {
  const domain = getDomain(contractAddress, chainId);

  const value = {
    address: claimData.address,
    name: claimData.name,
    // ... same as above
  };

  const recoveredAddress = ethers.verifyTypedData(
    domain,
    CLAIM_TYPES,
    value,
    signature
  );

  return recoveredAddress.toLowerCase() === claimData.address.toLowerCase();
}
```

**Update Smart Contract:**

Add EIP-712 verification to AddressClaim.sol:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract AddressClaim {
    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 private constant CLAIM_TYPEHASH = keccak256(
        "ClaimAddress(address addr,string name,string avatar,string bio,string website,string twitter,string github,string publicKey,uint256 nonce,uint256 timestamp)"
    );

    mapping(address => uint256) public nonces;

    function getDomainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256("Pocketbook"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));
    }

    function verifySignature(
        address _address,
        string memory _name,
        // ... other params
        uint256 _nonce,
        uint256 _timestamp,
        bytes memory _signature
    ) internal view returns (bool) {
        bytes32 structHash = keccak256(abi.encode(
            CLAIM_TYPEHASH,
            _address,
            keccak256(bytes(_name)),
            // ... other fields
            _nonce,
            _timestamp
        ));

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            getDomainSeparator(),
            structHash
        ));

        address signer = recoverSigner(digest, _signature);
        return signer == _address && _nonce == nonces[_address];
    }

    function claimAddress(
        // ... params
        uint256 _nonce,
        uint256 _timestamp,
        bytes memory _signature
    ) public {
        require(
            verifySignature(_address, _name, ..., _nonce, _timestamp, _signature),
            "Invalid signature"
        );

        // Prevent replay
        nonces[msg.sender]++;

        // ... rest of claim logic
    }
}
```

#### Implementation Steps

1. Create `src/utils/eip712.js`
2. Update `AddressClaim.sol` with EIP-712 verification
3. Update `AddressClaim.svelte` to use new signing
4. Update contract ABI after recompilation
5. Write unit tests for EIP-712 functions
6. Write E2E tests for signature verification
7. Update documentation

#### Success Criteria
- [ ] EIP-712 signing implemented
- [ ] Domain separation includes contract + chain ID
- [ ] Nonce prevents replay attacks
- [ ] Contract validates signatures correctly
- [ ] All tests pass
- [ ] No breaking changes to existing claims

---

## Medium Priority Proposals

### Proposal #8: Implement Unified Error Handling 🟡

**Priority:** Medium (UX)
**Effort:** 1 week
**Impact:** Consistent user experience, better debugging
**Status:** Ready to implement

#### Problem
Inconsistent error handling throughout codebase:
- 175 console.log statements
- Mix of alerts, silent failures, console errors
- No unified notification system

#### Solution

**Create Toast Notification System:**

```javascript
// src/stores/toast.js (Already exists! - extend it)

import { writable } from 'svelte/store';

export const toasts = writable([]);

let nextId = 1;

export function addToast(message, type = 'info', duration = 5000) {
  const id = nextId++;

  toasts.update(all => [
    ...all,
    { id, message, type, duration }
  ]);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

export function removeToast(id) {
  toasts.update(all => all.filter(t => t.id !== id));
}

// Convenience functions
export const toast = {
  success: (msg, duration) => addToast(msg, 'success', duration),
  error: (msg, duration) => addToast(msg, 'error', duration),
  warning: (msg, duration) => addToast(msg, 'warning', duration),
  info: (msg, duration) => addToast(msg, 'info', duration),
};
```

**Create Error Handler Utility:**

```javascript
// src/utils/errorHandler.js

import { toast } from '../stores/toast';

export class AppError extends Error {
  constructor(message, type = 'error', options = {}) {
    super(message);
    this.type = type;
    this.code = options.code;
    this.context = options.context;
    this.userMessage = options.userMessage || message;
  }
}

/**
 * Handle errors with consistent UX
 */
export function handleError(error, context = '') {
  // Log for debugging
  console.error(`[${context}]`, error);

  // Determine user-friendly message
  let userMessage = 'An error occurred';

  if (error instanceof AppError) {
    userMessage = error.userMessage;
  } else if (error.code === 'ACTION_REJECTED') {
    userMessage = 'Transaction was rejected';
  } else if (error.code === 'NETWORK_ERROR') {
    userMessage = 'Network connection failed';
  } else if (error.message) {
    userMessage = error.message;
  }

  // Show toast notification
  toast.error(userMessage);

  // Return error for further handling if needed
  return error;
}

/**
 * Async error wrapper
 */
export async function tryAsync(fn, context = '') {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    throw error;
  }
}
```

**Usage Example:**

```javascript
// Before
try {
  const result = await contract.claimAddress(...);
  console.log('Success!');
} catch (error) {
  console.error('Error claiming:', error);
  alert('Failed: ' + error.message);
}

// After
import { handleError, tryAsync } from './utils/errorHandler';
import { toast } from './stores/toast';

try {
  const result = await contract.claimAddress(...);
  toast.success('Address claimed successfully!');
} catch (error) {
  handleError(error, 'claimAddress');
}

// Or with wrapper
await tryAsync(async () => {
  const result = await contract.claimAddress(...);
  toast.success('Address claimed successfully!');
}, 'claimAddress');
```

#### Implementation Steps

1. Enhance existing `toast.js` store
2. Create `errorHandler.js` utility
3. Replace console.log with proper logging
4. Replace alerts with toast notifications
5. Add error recovery flows
6. Write unit tests
7. Update documentation

#### Success Criteria
- [ ] All console.log replaced with logging
- [ ] All alerts replaced with toasts
- [ ] Consistent error messages
- [ ] Error recovery flows implemented
- [ ] User always knows when something fails

---

### Proposal #9: Add Performance Monitoring 🟡

**Priority:** Medium (Observability)
**Effort:** 4 days
**Impact:** Identify bottlenecks, track improvements
**Status:** Ready to implement

#### Solution

**Create Performance Monitor:**

```javascript
// src/utils/performance.js

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  /**
   * Start timing an operation
   */
  start(operationName) {
    this.metrics.set(operationName, {
      startTime: performance.now(),
      endTime: null,
      duration: null,
    });
  }

  /**
   * End timing and record duration
   */
  end(operationName) {
    const metric = this.metrics.get(operationName);
    if (!metric) return;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log slow operations (>1s)
    if (metric.duration > 1000) {
      console.warn(`Slow operation: ${operationName} took ${metric.duration}ms`);
    }

    return metric.duration;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    const results = {};
    this.metrics.forEach((value, key) => {
      results[key] = value.duration;
    });
    return results;
  }

  /**
   * Export metrics report
   */
  exportReport() {
    const metrics = this.getMetrics();
    return {
      timestamp: new Date().toISOString(),
      metrics,
      slowOperations: Object.entries(metrics)
        .filter(([_, duration]) => duration > 1000)
        .map(([name, duration]) => ({ name, duration })),
    };
  }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * Decorator for async functions
 */
export function measurePerformance(operationName) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      perfMonitor.start(operationName);
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        perfMonitor.end(operationName);
      }
    };

    return descriptor;
  };
}
```

**Usage:**

```javascript
import { perfMonitor } from './utils/performance';

// Manual timing
perfMonitor.start('chainInit');
await initializeChain(chainId);
perfMonitor.end('chainInit');

// Get report
const report = perfMonitor.exportReport();
console.table(report.metrics);
```

#### Metrics to Track

1. **Chain Initialization**
   - Time per chain
   - Total initialization time
   - Parallel vs sequential

2. **Contract Calls**
   - Read operations (getClaim, etc.)
   - Write operations (claimAddress, etc.)
   - RPC call frequency

3. **UI Responsiveness**
   - Component render time
   - Navigation time
   - Search response time

4. **Network Calls**
   - ENS lookups
   - IPFS retrievals
   - RPC calls

#### Success Criteria
- [ ] Performance monitoring in all critical paths
- [ ] Dashboard showing key metrics
- [ ] Alerts for slow operations (>1s)
- [ ] Baseline established for improvements

---

### Proposal #10: Improve Address Input Validation 🟡

**Priority:** Medium (UX)
**Effort:** 2 days
**Impact:** Better user feedback, fewer errors
**Status:** Ready to implement

#### Problem
No real-time validation or helpful error messages for address input.

#### Solution

**Create Address Validator Component:**

```svelte
<!-- AddressInput.svelte -->
<script>
  import { ethers } from 'ethers';
  import { isENSName } from '../utils/ens';

  export let value = '';
  export let onValidAddress = null;

  let validationState = 'idle'; // idle, validating, valid, invalid
  let validationMessage = '';

  $: validateInput(value);

  async function validateInput(input) {
    if (!input) {
      validationState = 'idle';
      validationMessage = '';
      return;
    }

    validationState = 'validating';

    // Check if it's an address
    if (ethers.isAddress(input)) {
      validationState = 'valid';
      validationMessage = 'Valid Ethereum address';
      if (onValidAddress) onValidAddress(input);
      return;
    }

    // Check if it's an ENS name
    if (isENSName(input)) {
      validationMessage = 'ENS name detected, resolving...';
      // Resolution happens elsewhere
      validationState = 'valid';
      return;
    }

    // Invalid
    validationState = 'invalid';
    validationMessage = 'Invalid address or ENS name';
  }
</script>

<div class="address-input">
  <input
    type="text"
    bind:value
    placeholder="0x... or name.eth"
    class:valid={validationState === 'valid'}
    class:invalid={validationState === 'invalid'}
  />

  {#if validationMessage}
    <p class="validation-message {validationState}">
      {validationMessage}
    </p>
  {/if}
</div>

<style>
  input.valid {
    border-color: #10b981;
  }

  input.invalid {
    border-color: #ef4444;
  }

  .validation-message.valid {
    color: #10b981;
  }

  .validation-message.invalid {
    color: #ef4444;
  }
</style>
```

#### Success Criteria
- [ ] Real-time validation feedback
- [ ] Clear error messages
- [ ] Distinguishes between format types
- [ ] Visual indicators (colors)

---

### Proposal #11: Optimize Wordlist Loading 🟡

**Priority:** Medium (Performance)
**Effort:** 1 day
**Impact:** Eliminate 50KB network request
**Status:** Ready to implement

#### Problem
BIP39 wordlist (2048 words) fetched from network on every handle operation.

**File:** `src/utils/wordhandles.js:19-38`

#### Solution

**Pre-bundle wordlist in JavaScript:**

```javascript
// scripts/bundle-wordlist.js
const fs = require('fs');

const wordlist = fs.readFileSync('./public/wordlists/bip39-english.txt', 'utf-8')
  .split('\n')
  .map(w => w.trim())
  .filter(w => w.length > 0);

const output = `// Auto-generated from bip39-english.txt
export const BIP39_WORDLIST = ${JSON.stringify(wordlist, null, 2)};
`;

fs.writeFileSync('./src/config/bip39Wordlist.js', output);
console.log(`Bundled ${wordlist.length} words`);
```

**Update wordhandles.js:**

```javascript
// Before
let cachedWordlistPromise = null;
export async function loadWordlist() {
  if (!cachedWordlistPromise) {
    cachedWordlistPromise = fetch('/wordlists/bip39-english.txt')...
  }
  return cachedWordlistPromise;
}

// After
import { BIP39_WORDLIST } from '../config/bip39Wordlist';

export function loadWordlist() {
  return BIP39_WORDLIST; // Instant, no network call!
}
```

**Add to build process:**

```json
{
  "scripts": {
    "prebuild": "node scripts/bundle-wordlist.js",
    "build": "vite build"
  }
}
```

#### Success Criteria
- [ ] No network request for wordlist
- [ ] Instant handle generation
- [ ] Bundle size increase < 20KB
- [ ] Automated in build process

---

### Proposal #12: Add Reputation UI 🟡

**Priority:** Medium (Feature)
**Effort:** 1 week
**Impact:** Makes reputation system usable
**Status:** Ready to implement

#### Problem
Reputation system fully implemented but has no UI:
- Cannot create attestations from UI
- Cannot view reputation scores
- Cannot see trust paths

**File:** `src/utils/reputation.js` (465 LOC) - fully implemented algorithm

#### Solution

**Create Reputation Components:**

1. **ReputationScore.svelte** - Display score badge
2. **AttestationForm.svelte** - Create attestations
3. **AttestationList.svelte** - View attestations
4. **TrustGraph.svelte** - Visualize trust paths

**Example - ReputationScore.svelte:**

```svelte
<script>
  import { calculateReputation, getReputationSummary } from '../utils/reputation';

  export let address;
  export let attestations = [];
  export let graph = {};
  export let observerAddress = null;

  let reputation = null;
  let loading = true;

  $: loadReputation(address, attestations, graph, observerAddress);

  async function loadReputation(addr, atts, g, observer) {
    loading = true;

    const result = calculateReputation(addr, atts, g, observer);
    const summary = getReputationSummary(result);

    reputation = summary;
    loading = false;
  }
</script>

{#if loading}
  <div class="reputation-loading">Loading reputation...</div>
{:else if reputation}
  <div class="reputation-score" class:trusted={reputation.score > 60}>
    <div class="score">{reputation.score}</div>
    <div class="category">{reputation.category}</div>
    <div class="details">
      <span>{reputation.directCount} direct</span>
      <span>{reputation.transitiveCount} transitive</span>
    </div>
  </div>
{/if}
```

#### Implementation Steps

1. Create reputation components
2. Integrate into AddressView
3. Add attestation creation to UI
4. Add trust path visualization
5. Write E2E tests
6. Update documentation

#### Success Criteria
- [ ] Users can create attestations from UI
- [ ] Reputation scores visible on profiles
- [ ] Trust paths visualized
- [ ] Mobile-responsive design

---

## Low Priority Proposals

### Proposal #13: Add Service Worker for Offline Support 🟢

**Priority:** Low (Enhancement)
**Effort:** 3 days
**Impact:** Better offline experience
**Status:** Future consideration

#### Solution
- Cache static assets
- Cache BIP39 wordlist
- Offline claim browsing
- Background sync for pending transactions

---

### Proposal #14: Implement Component Snapshot Testing 🟢

**Priority:** Low (Quality)
**Effort:** 2 days
**Impact:** Prevent visual regressions
**Status:** Future consideration

#### Solution
- Add snapshot tests for all components
- Detect unintended UI changes
- Visual regression testing

---

### Proposal #15: Create Performance Dashboard 🟢

**Priority:** Low (Observability)
**Effort:** 1 week
**Impact:** Monitor application health
**Status:** Future consideration

#### Solution
- Real-time performance metrics
- Historical trend analysis
- User session replays
- Error tracking integration

---

## Implementation Priority Matrix

| Proposal | Priority | Effort | Impact | ROI | Start Week |
|----------|----------|--------|--------|-----|------------|
| #1 - Install Dependencies | 🔴 Critical | 5 min | Critical | ⭐⭐⭐⭐⭐ | Week 0 |
| #2 - Upgrade Solidity | 🔴 Critical | 2 hours | High | ⭐⭐⭐⭐⭐ | Week 1 |
| #3 - Lazy Chain Loading | 🔴 Critical | 1 week | Very High | ⭐⭐⭐⭐⭐ | Week 1 |
| #4 - ENS Caching | 🟠 High | 3 days | High | ⭐⭐⭐⭐ | Week 2 |
| #5 - Split Components | 🟠 High | 2 weeks | Medium | ⭐⭐⭐⭐ | Week 3 |
| #6 - Store Unit Tests | 🟠 High | 1 week | High | ⭐⭐⭐⭐ | Week 5 |
| #7 - EIP-712 Signing | 🟠 High | 4 days | High | ⭐⭐⭐⭐ | Week 6 |
| #8 - Error Handling | 🟡 Medium | 1 week | Medium | ⭐⭐⭐ | Week 7 |
| #9 - Performance Monitoring | 🟡 Medium | 4 days | Medium | ⭐⭐⭐ | Week 8 |
| #10 - Input Validation | 🟡 Medium | 2 days | Medium | ⭐⭐⭐ | Week 9 |
| #11 - Wordlist Optimization | 🟡 Medium | 1 day | Low | ⭐⭐ | Week 9 |
| #12 - Reputation UI | 🟡 Medium | 1 week | Medium | ⭐⭐⭐ | Week 10 |
| #13 - Service Worker | 🟢 Low | 3 days | Low | ⭐⭐ | Week 11 |
| #14 - Snapshot Tests | 🟢 Low | 2 days | Low | ⭐⭐ | Week 11 |
| #15 - Performance Dashboard | 🟢 Low | 1 week | Low | ⭐⭐ | Week 12 |

**Total Timeline:** 12 weeks for full implementation

---

## Quick Wins (Week 1)

**Immediate impact with minimal effort:**

1. ✅ Install dependencies (5 minutes)
2. ✅ Upgrade Solidity compiler (2 hours)
3. ✅ Bundle BIP39 wordlist (1 day)
4. ✅ Add ENS caching (3 days)

**Impact:** Eliminates blocker, improves security, better performance

---

## Success Metrics

### Performance Metrics
- [ ] Initial load time: 4-8 min → <30 sec (93% improvement)
- [ ] ENS cache hit rate: >80%
- [ ] RPC call reduction: 50-60%
- [ ] Time to interactive: <3 seconds

### Quality Metrics
- [ ] Code coverage: 0% → 80%
- [ ] Component size: All <500 LOC
- [ ] Test count: 81 E2E + 135 unit = 216 total
- [ ] Zero console.log in production

### Security Metrics
- [ ] EIP-712 signatures: 100% of claims
- [ ] Replay attack prevention: ✅
- [ ] Solidity version: 0.8.25 (latest)

### UX Metrics
- [ ] User error clarity: 100% (no silent failures)
- [ ] Loading feedback: All async operations
- [ ] Input validation: Real-time on all forms

---

## Conclusion

These 15 proposals provide a comprehensive roadmap for improving Pocketbook across all dimensions:
- **Performance:** 4x-10x faster initial load
- **Security:** EIP-712, latest Solidity
- **Quality:** 80% test coverage, better maintainability
- **UX:** Consistent errors, real-time validation, loading feedback

**Recommended Start:**
1. Week 0: Install dependencies (blocker)
2. Week 1: Upgrade Solidity + lazy chain loading
3. Week 2-3: ENS caching + component splitting
4. Week 4-6: Unit tests + EIP-712 signing

This foundation enables all subsequent improvements.

**Next Steps:**
- Review and approve proposals
- Prioritize based on business needs
- Create implementation issues
- Begin Week 0 quick wins

---

**Document Version:** 1.0
**Last Updated:** December 29, 2025
**Status:** Ready for Review
