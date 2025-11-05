# IPFS Integration Guide

## Overview

Pocketbook integrates IPFS (InterPlanetary File System) for decentralized metadata storage, ensuring censorship resistance and distributed data availability. This integration uses **Helia**, a modern IPFS implementation for JavaScript that runs in both browsers and Node.js.

## Architecture

### Hybrid Storage Model

Pocketbook uses a hybrid approach to metadata storage:

1. **On-Chain Storage**: Critical metadata (name, avatar, social links) stored directly in the smart contract
2. **IPFS Storage**: Extended metadata and large content stored on IPFS, with CID (Content Identifier) stored on-chain
3. **DID Routing**: Decentralized Identifiers (DIDs) map to IPFS CIDs for content discovery

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌─────────────┐  ┌──────────────┐
│  Smart      │  │   IPFS       │
│  Contract   │  │   Network    │
│             │  │              │
│ • Name      │  │ • Extended   │
│ • Avatar    │  │   metadata   │
│ • Links     │  │ • Files      │
│ • IPFS CID◄─┼──┤ • Content    │
│ • DID       │  │              │
└─────────────┘  └──────────────┘
```

## Features

### Core IPFS Functions

#### 1. Upload Metadata
```javascript
import { uploadMetadata } from './utils/ipfs';

const metadata = {
  name: "Alice",
  bio: "Blockchain enthusiast",
  interests: ["DeFi", "NFTs", "DAOs"],
  customData: { ... }
};

const result = await uploadMetadata(metadata);
// Returns: { success: true, cid: "Qm...", metadata: {...} }
```

#### 2. Retrieve Metadata
```javascript
import { retrieveMetadata } from './utils/ipfs';

const result = await retrieveMetadata("QmYourCIDHere");
// Returns: { success: true, metadata: {...}, cid: "Qm..." }
```

#### 3. Upload Files
```javascript
import { uploadFile } from './utils/ipfs';

const file = document.querySelector('input[type="file"]').files[0];
const result = await uploadFile(file);
// Returns: { success: true, cid: "Qm...", size: 12345 }
```

#### 4. Pin Content
```javascript
import { pinContent } from './utils/ipfs';

await pinContent("QmYourCIDHere");
// Pins content locally for persistence
```

### DID-Based IPFS Routing

The integration includes a DID routing system that links Decentralized Identifiers to IPFS content.

#### Store Content with DID Association
```javascript
import { didIPFSRouter } from './utils/ipfs';

const did = "did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
const content = {
  profile: { ... },
  socialGraph: { ... },
  reputation: { ... }
};

const result = await didIPFSRouter.storeWithDID(did, content);
// Returns: { success: true, did: "did:ethr:0x...", cid: "Qm..." }
```

#### Retrieve Content by DID
```javascript
import { didIPFSRouter } from './utils/ipfs';

const did = "did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
const result = await didIPFSRouter.retrieveByDID(did);
// Returns: { success: true, metadata: {...}, cid: "Qm...", did: "did:ethr:0x..." }
```

#### Register DID Mapping from Chain
```javascript
import { didIPFSRouter } from './utils/ipfs';

// After fetching from smart contract
const [did, ipfsCID] = await contract.getDIDRoutingInfo(address);
didIPFSRouter.registerDIDMapping(did, ipfsCID);
```

### Using the IPFS Store (Svelte)

The IPFS store provides reactive state management for IPFS operations.

#### Initialize IPFS
```javascript
import { ipfsStore } from './stores/ipfs';

// Initialize on app startup
await ipfsStore.initialize();
```

#### Upload with State Tracking
```javascript
import { ipfsStore } from './stores/ipfs';

const metadata = { name: "Alice", bio: "Developer" };
const result = await ipfsStore.uploadMetadata(metadata);

if (result.success) {
  console.log(`Uploaded: ${result.cid}`);
}
```

#### Store with DID
```javascript
import { ipfsStore } from './stores/ipfs';

const did = "did:ethr:0x...";
const content = { profile: {...} };

const result = await ipfsStore.storeWithDID(did, content);
```

#### Monitor Upload Progress
```javascript
import { ipfsStore, activeOperations } from './stores/ipfs';

$: if ($activeOperations.uploads > 0) {
  console.log(`${$activeOperations.uploads} uploads in progress`);
}
```

## Smart Contract Integration

### Updated Functions

#### Claim Address with IPFS CID
```solidity
function claimAddress(
    address _address,
    bytes memory _signature,
    string memory _name,
    string memory _avatar,
    string memory _bio,
    string memory _website,
    string memory _twitter,
    string memory _github,
    bytes memory _publicKey,
    bool _isPrivate,
    string memory _ipfsCID  // ← New parameter
) public
```

#### Update Metadata with IPFS CID
```solidity
function updateMetadata(
    string memory _name,
    string memory _avatar,
    string memory _bio,
    string memory _website,
    string memory _twitter,
    string memory _github,
    bytes memory _publicKey,
    bool _isPrivate,
    string memory _ipfsCID  // ← New parameter
) public
```

#### Get IPFS CID
```solidity
function getIPFSCID(address _address) 
    public 
    view 
    returns (string memory)
```

#### Get DID Routing Info
```solidity
function getDIDRoutingInfo(address _address) 
    public 
    view 
    returns (string memory did, string memory ipfsCID)
```

### Events

```solidity
event IPFSMetadataStored(
    address indexed claimedAddress, 
    string ipfsCID, 
    uint256 timestamp
);

event IPFSMetadataUpdated(
    address indexed claimedAddress, 
    string ipfsCID, 
    uint256 timestamp
);
```

## Complete Workflow Example

### 1. Claim Address with IPFS Metadata

```javascript
import { ethersStore } from './stores/ethers';
import { ipfsStore } from './stores/ipfs';

// Prepare basic metadata
const basicMetadata = {
  name: "Alice",
  avatar: "👩‍💻",
  bio: "Blockchain developer",
  website: "https://alice.dev",
  twitter: "alice_dev",
  github: "alice"
};

// Prepare extended metadata for IPFS
const extendedMetadata = {
  ...basicMetadata,
  interests: ["DeFi", "NFTs", "DAOs"],
  skills: ["Solidity", "JavaScript", "Rust"],
  projects: [
    { name: "Project A", url: "https://..." },
    { name: "Project B", url: "https://..." }
  ],
  customFields: {
    location: "Decentralized",
    languages: ["English", "Spanish"]
  }
};

// Upload extended metadata to IPFS
const uploadResult = await ipfsStore.uploadMetadata(extendedMetadata);

if (!uploadResult.success) {
  console.error("IPFS upload failed:", uploadResult.error);
  return;
}

const ipfsCID = uploadResult.cid;
console.log(`Metadata uploaded to IPFS: ${ipfsCID}`);

// Sign message for address ownership proof
const message = `I am claiming ${address}`;
const signature = await ethersStore.signMessage(message);

// Call smart contract with IPFS CID
const contract = $ethersStore.contract;
const tx = await contract.claimAddress(
  address,
  signature,
  basicMetadata.name,
  basicMetadata.avatar,
  basicMetadata.bio,
  basicMetadata.website,
  basicMetadata.twitter,
  basicMetadata.github,
  "0x", // publicKey
  false, // isPrivate
  ipfsCID // IPFS CID
);

await tx.wait();
console.log("Address claimed with IPFS metadata!");
```

### 2. Retrieve Full Profile with DID Routing

```javascript
import { ethersStore } from './stores/ethers';
import { ipfsStore } from './stores/ipfs';

async function getFullProfile(address) {
  const contract = $ethersStore.contract;
  
  // Get DID and IPFS CID from contract
  const [did, ipfsCID] = await contract.getDIDRoutingInfo(address);
  
  // Register mapping for future lookups
  ipfsStore.registerDIDMapping(did, ipfsCID);
  
  // Retrieve extended metadata from IPFS
  const ipfsResult = await ipfsStore.retrieveMetadata(ipfsCID);
  
  if (ipfsResult.success) {
    return {
      did,
      onChain: await contract.getClaim(address),
      ipfs: ipfsResult.metadata,
      fullProfile: {
        ...ipfsResult.metadata,
        did
      }
    };
  }
  
  return null;
}

// Usage
const profile = await getFullProfile("0x...");
console.log(profile.fullProfile);
```

### 3. Using DID for Content Discovery

```javascript
import { didIPFSRouter } from './utils/ipfs';
import { ethersStore } from './stores/ethers';

async function discoverContentByDID(did) {
  // Try cache first
  let content = await didIPFSRouter.retrieveByDID(did);
  
  if (!content.success) {
    // Cache miss - resolve from chain
    const address = did.replace('did:ethr:', '');
    const contract = $ethersStore.contract;
    
    const [resolvedDID, ipfsCID] = await contract.getDIDRoutingInfo(address);
    
    // Register and retry
    didIPFSRouter.registerDIDMapping(did, ipfsCID);
    content = await didIPFSRouter.retrieveByDID(did);
  }
  
  return content;
}

// Usage
const did = "did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
const content = await discoverContentByDID(did);
```

## Extensibility for Future Features

The IPFS integration is designed for extensibility. Use the `IPFSStorage` class for future features:

### Social Graph Storage

```javascript
import { ipfsStorage } from './utils/ipfs';

const socialGraph = {
  following: ["did:ethr:0x...", "did:ethr:0x..."],
  followers: ["did:ethr:0x...", "did:ethr:0x..."],
  connections: [...]
};

const result = await ipfsStorage.store('social-graph', socialGraph);
// Returns: { success: true, cid: "Qm..." }
```

### Reputation System Storage

```javascript
import { ipfsStorage } from './utils/ipfs';

const reputation = {
  score: 95,
  endorsements: [...],
  reviews: [...],
  achievements: [...]
};

const result = await ipfsStorage.store('reputation', reputation);
```

### Retrieve Typed Data

```javascript
import { ipfsStorage } from './utils/ipfs';

const result = await ipfsStorage.retrieve(cid);
// Returns: { success: true, dataType: 'social-graph', data: {...}, cid: "Qm..." }
```

## Gateway Configuration

By default, the integration uses public IPFS gateways with automatic fallback:

1. `https://ipfs.io/ipfs/`
2. `https://cloudflare-ipfs.com/ipfs/`
3. `https://gateway.pinata.cloud/ipfs/`

### Custom Gateway Configuration

To use custom gateways or local nodes, modify `src/utils/ipfs.js`:

```javascript
const IPFS_CONFIG = {
  gateways: [
    'https://your-custom-gateway.com/ipfs/',
    'https://ipfs.io/ipfs/'
  ],
  timeout: 30000
};
```

## Pinning Services

For production deployments, integrate with pinning services for data persistence:

- **Pinata** - https://pinata.cloud
- **Infura IPFS** - https://infura.io/product/ipfs
- **Web3.Storage** - https://web3.storage
- **Filebase** - https://filebase.com

### Example: Pinata Integration

```javascript
async function pinToPinata(cid) {
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_KEY;
  
  const url = `https://api.pinata.cloud/pinning/pinByHash`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': pinataApiKey,
      'pinata_secret_api_key': pinataSecretKey
    },
    body: JSON.stringify({
      hashToPin: cid,
      pinataMetadata: {
        name: `pocketbook-${cid}`
      }
    })
  });
  
  return await response.json();
}
```

## Performance Considerations

### Caching

The IPFS store includes automatic caching:

```javascript
// Cached retrieval (default)
const result = await ipfsStore.retrieveMetadata(cid, null, true);

// Force refresh
const result = await ipfsStore.retrieveMetadata(cid, null, false);

// Clear cache
ipfsStore.clearCache();
```

### Lazy Loading

Load IPFS content only when needed:

```javascript
// Show basic info immediately (from chain)
const basicInfo = await contract.getClaim(address);
displayBasicInfo(basicInfo);

// Load extended info in background
const ipfsCID = await contract.getIPFSCID(address);
if (ipfsCID) {
  ipfsStore.retrieveMetadata(ipfsCID).then(result => {
    if (result.success) {
      displayExtendedInfo(result.metadata);
    }
  });
}
```

## Security Considerations

1. **Content Verification**: Always verify content authenticity using on-chain signatures
2. **Privacy**: Sensitive data should be encrypted before uploading to IPFS
3. **CID Validation**: Validate CID format before retrieval
4. **Gateway Trust**: Use multiple gateways for redundancy
5. **Size Limits**: Be mindful of content size (recommended < 10MB per object)

## Troubleshooting

### IPFS Node Not Starting

If Helia fails to initialize:

```javascript
// Check browser compatibility
if (!window.indexedDB) {
  console.error('IndexedDB not available - IPFS may not work');
}

// Try with error handling
try {
  await ipfsStore.initialize();
} catch (error) {
  console.error('IPFS initialization failed:', error);
  // Fall back to gateway-only mode
}
```

### Content Not Found

If content retrieval fails:

1. Verify CID format is correct
2. Check if content is pinned
3. Try different gateways
4. Wait for DHT propagation (can take a few minutes)

### Performance Issues

For slow IPFS operations:

1. Use local IPFS node instead of browser node
2. Pre-load frequently accessed content
3. Implement aggressive caching
4. Use CDN-backed gateways

## API Reference

See the complete API documentation in:
- `src/utils/ipfs.js` - Core IPFS functions
- `src/stores/ipfs.js` - IPFS store interface

## Future Enhancements

- [ ] Support for IPFS cluster deployment
- [ ] Integration with ENS contenthash
- [ ] Encrypted private metadata on IPFS
- [ ] Automatic pinning service integration
- [ ] IPFS pubsub for real-time updates
- [ ] Content addressing for assets (images, videos)
- [ ] Support for IPLD (InterPlanetary Linked Data)

---

*For questions or issues, please open a GitHub issue.*
