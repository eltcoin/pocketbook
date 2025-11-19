# Pocketbook - Decentralized Human Network

<div align="center">
  <p>
    <img src="https://pbs.twimg.com/media/DOZbENEXkAA2EMr.png" width="250" />
  </p>
  <p>
    ✨ Censorship immune, Decentralised Human Network & Identity Platform ✨
  </p>
</div>

## Overview

Pocketbook is a revolutionary decentralized identity platform built on Ethereum that allows users to claim and verify ownership of their blockchain addresses. It creates a censorship-resistant human network where users have complete sovereignty over their digital identity.

### Key Features

- 🎯 **Address Claiming**: Claim any Ethereum address you own and attach verifiable metadata
- 🧩 **Word Handles**: Deterministically mint BIP39 phrases that map directly to your address
- 🔐 **Cryptographic Verification**: All claims are secured by cryptographic signatures proving ownership
- 🌐 **Decentralized Network**: Build your web of trust without central authorities
- 🔒 **Privacy Control**: Choose what's public and what's private with whitelist-based access
- 💼 **Contract Support**: Smart contracts and token addresses can also be claimed
- 🌓 **Night Mode**: Built-in dark theme support with professional styling
- 🔗 **Web3 Integration**: Seamless integration with MetaMask and other Web3 wallets
- 🎨 **Modern UI**: Clean, card-based design with neutral slate palette

## UI Design System

Pocketbook features a modern, professional design system focused on clarity, accessibility, and user experience.

### Design Philosophy

The UI has been completely redesigned to follow contemporary design principles:
- **Matte finish** - No glassmorphism or blur effects for better performance and clarity
- **Card-based layout** - Clean cards with subtle borders and shadows
- **Neutral palette** - Slate-based colors that work across light and dark modes
- **Professional typography** - Inter font family with carefully chosen weights
- **Accessibility first** - High contrast ratios and clear visual hierarchy

### Color Palette

#### Light Mode
- **Background**: `#f8fafc` (slate-50)
- **Cards**: `#ffffff` (white) with `#e2e8f0` (slate-200) borders
- **Text Primary**: `#0f172a` (slate-900)
- **Text Muted**: `#64748b` (slate-500)
- **Accent**: `#f59e0b` (amber-500) for Admin button
- **Borders**: `#e2e8f0` (slate-200)

#### Dark Mode
- **Background**: `#0f172a` (slate-900)
- **Cards**: `#1e293b` (slate-800) with `#334155` (slate-700) borders
- **Text Primary**: `#f1f5f9` (slate-100)
- **Text Muted**: `#94a3b8` (slate-400)
- **Accent**: `#f59e0b` (amber-500) for Admin button
- **Borders**: `#334155` (slate-700)

### Typography

- **Font Family**: Inter, system-ui, -apple-system, sans-serif
- **Headings**: Font weights 600-800 for strong hierarchy
- **Body Text**: Font weight 400-500 for readability
- **Code/Addresses**: Monospace stack - ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace

### Components

#### Cards
- **Border Radius**: 10-12px for modern look
- **Shadow**: `0 1px 3px 0 rgba(0, 0, 0, 0.1)` for subtle depth
- **Hover Shadow**: `0 4px 12px 0 rgba(0, 0, 0, 0.15)` for interactive cards
- **Border**: 1px solid with theme-appropriate colors
- **Spacing**: Consistent padding (1rem to 1.5rem)

#### Buttons
- **Primary**: Dark background (`#0f172a` light, `#f1f5f9` dark) with hover effects
- **Admin**: Amber/gold accent color for distinction
- **Border Radius**: 8-10px
- **Hover Effect**: Slight opacity change and subtle scale
- **Transitions**: Smooth 200ms transitions

#### Interactive Elements
- **Hover Transform**: `translateY(-2px)` for lift effect
- **Focus States**: Clear outline for accessibility
- **Transitions**: All animations use 200-300ms duration
- **Cursor**: Pointer cursor on all interactive elements

### Layout

- **Max Width**: Responsive containers with max-width constraints
- **Spacing**: Consistent margin/padding scale (0.5rem, 1rem, 1.5rem, 2rem, 3rem)
- **Grid**: Modern CSS Grid and Flexbox layouts
- **Responsive**: Mobile-first approach with breakpoints

### Visual Improvements

- **No Backdrop Filters**: Removed for better performance and compatibility
- **Solid Backgrounds**: Clean, matte finish throughout
- **Consistent Shadows**: Uniform shadow system for elevation
- **Better Contrast**: Improved text contrast ratios for accessibility
- **Professional Icons**: Emoji icons with proper sizing and spacing

## Architecture

### Smart Contract (`contracts/AddressClaim.sol`)

The core smart contract provides:
- **Address claiming** with cryptographic proof
- **Metadata storage** on-chain
- **Privacy controls** with whitelist functionality
- **Signature verification** for authenticity
- **Event emission** for indexing and tracking

### Frontend (Svelte Application)

Built with modern web technologies:
- **Svelte**: Reactive UI framework
- **Ethers.js**: Ethereum interaction library
- **Vite**: Fast build tool and dev server
- **Web Crypto API**: For encryption/decryption

## Project Structure

```
pocketbook/
├── contracts/              # Solidity smart contracts
│   └── AddressClaim.sol   # Main claiming contract
├── src/
│   ├── components/        # Svelte components
│   │   ├── Header.svelte
│   │   ├── Explorer.svelte
│   │   ├── AddressClaim.svelte
│   │   └── AddressView.svelte
│   ├── stores/           # Svelte stores for state management
│   │   ├── ethers.js     # Web3 connection management
│   │   └── theme.js      # Theme management
│   ├── utils/            # Utility functions
│   │   ├── crypto.js     # Cryptographic utilities
│   │   └── encryption.js # Encryption utilities
│   ├── App.svelte        # Main app component
│   └── main.js           # Application entry point
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── svelte.config.js      # Svelte configuration
└── package.json          # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js v16 or higher
- MetaMask or compatible Web3 wallet
- (Optional) Deployed AddressClaim contract

### Installation

1. Clone the repository:
```bash
git clone https://github.com/eltcoin/pocketbook.git
cd pocketbook
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## Usage

### 1. Connect Your Wallet

Click "Connect Wallet" in the header to connect your MetaMask or compatible Web3 wallet.

### 2. Claim Your Address

1. Navigate to "Claim Address"
2. Fill in your metadata:
   - Display name (required)
   - Avatar (emoji or URL)
   - Biography
   - Website
   - Social media handles
3. Choose privacy settings
4. Sign the transaction to claim your address

### 3. View Claimed Addresses

Use the Explorer to browse recently claimed addresses or search for specific addresses.

### 4. Privacy Management

For private metadata:
- Toggle "Make metadata private" when claiming
- Use "Manage Privacy" to add/remove whitelisted viewers
- Only you and whitelisted addresses can view private metadata

## Smart Contract Development

### Deploying the Contract

The AddressClaim contract needs to be deployed to an Ethereum network:

```solidity
// Example deployment with Hardhat
const AddressClaim = await ethers.getContractFactory("AddressClaim");
const addressClaim = await AddressClaim.deploy();
await addressClaim.deployed();
console.log("AddressClaim deployed to:", addressClaim.address);
```

Update the contract address in `src/stores/ethers.js`:

```javascript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress";
```

### Contract Methods

#### Claim an Address
```solidity
function claimAddress(
    address _address,
    bytes memory _signature,
    string memory _name,
    // ... other metadata fields
    bool _isPrivate
) public
```

#### Update Metadata
```solidity
function updateMetadata(
    string memory _name,
    // ... other metadata fields
    bool _isPrivate
) public
```

#### Privacy Management
```solidity
function addViewer(address _viewer) public
function removeViewer(address _viewer) public
```

## Security Features

### Cryptographic Verification

All claims are verified through:
1. **Message Signing**: Users sign a message with their private key
2. **Signature Verification**: The contract verifies the signature matches the claimed address
3. **On-Chain Storage**: All data is stored immutably on the blockchain

### Privacy Protection

- **Encrypted Metadata**: Optional encryption using public/private key pairs
- **Whitelist Access**: Control who can view your private information
- **No Central Authority**: Fully decentralized verification

### Best Practices

- Never share your private keys
- Verify contract addresses before interacting
- Review all transactions before signing
- Keep your metadata up-to-date
- Regularly review your privacy whitelist

## Web of Trust

The platform enables building a decentralized web of trust:

1. **Verifiable Identity**: Cryptographically proven ownership
2. **Reputation Building**: Track claims and interactions
3. **Network Effects**: Connect with other verified addresses
4. **Trustless Verification**: No intermediaries required

## Multi-Chain Support

Pocketbook supports simultaneous connections to multiple blockchain networks, allowing users to interact with claims across different chains seamlessly.

### Supported Networks

#### Mainnets
- **Ethereum** - The original smart contract platform
- **Polygon** - Low-cost, high-speed layer 2 solution
- **BNB Smart Chain (BSC)** - Binance's EVM-compatible blockchain
- **Arbitrum One** - Optimistic rollup scaling solution
- **Optimism** - Another optimistic rollup for Ethereum
- **Avalanche** - High-throughput blockchain platform

#### Testnets
- **Sepolia** - Ethereum testnet
- **Polygon Mumbai** - Polygon testnet

### Features

1. **Simultaneous Multi-Chain Connectivity**
   - Connect to all configured networks at once
   - View claims across all chains simultaneously
   - No need to manually switch networks to see data

2. **Cross-Chain Claim Viewing**
   - See if an address has been claimed on multiple networks
   - Compare claim data across chains
   - Unified view of multi-chain identity

3. **Network Switching**
   - Easy switching between networks via MetaMask
   - Automatic network addition if not configured
   - Primary network indicator in the UI

4. **Per-Network Contract Deployment**
   - Each network can have its own contract address
   - Configured via environment variables
   - Graceful handling of networks without deployed contracts

### Configuration

Configure contract addresses for each network in your `.env` file:

```bash
# Ethereum Mainnet
VITE_CONTRACT_ADDRESS_ETHEREUM=0xYourContractAddressHere

# Polygon
VITE_CONTRACT_ADDRESS_POLYGON=0xYourContractAddressHere

# BSC
VITE_CONTRACT_ADDRESS_BSC=0xYourContractAddressHere

# Arbitrum
VITE_CONTRACT_ADDRESS_ARBITRUM=0xYourContractAddressHere

# Optimism
VITE_CONTRACT_ADDRESS_OPTIMISM=0xYourContractAddressHere

# Avalanche
VITE_CONTRACT_ADDRESS_AVALANCHE=0xYourContractAddressHere

# Testnets
VITE_CONTRACT_ADDRESS_SEPOLIA=0xYourContractAddressHere
VITE_CONTRACT_ADDRESS_MUMBAI=0xYourContractAddressHere

# Optional Word Handle Registries
VITE_HANDLE_REGISTRY_ADDRESS_ETHEREUM=0xYourRegistryAddressHere
VITE_HANDLE_REGISTRY_ADDRESS_POLYGON=0xC61D976eF7E66D8c247233daC439Ca06137b0904
VITE_HANDLE_REGISTRY_ADDRESS_BSC=0xde16Caf38e556A12f9f64d0E76bc0EbFc731ac1f
VITE_HANDLE_REGISTRY_ADDRESS_SEPOLIA=0xYourRegistryAddressHere
```

To enable word handles on a network, deploy `AddressHandleRegistry.sol` with the desired vocabulary parameters and set the corresponding `VITE_HANDLE_REGISTRY_ADDRESS_*` value. The UI automatically detects the registry, loads the BIP39 English word list, and exposes handle suggestion/claiming flows.

### Word Handle Registry

- `AddressHandleRegistry.sol` validates deterministic handle encodings and guarantees uniqueness per wallet.
- Handles are encoded as `[length:uint8] + length * uint16` indices pointing into the shared vocabulary (BIP39 by default).
- The front-end loads the vocabulary from `public/wordlists/bip39-english.txt`, suggests phrases via a deterministic SHA-256 PRNG, and calls `multiChainStore.claimHandleOnPrimaryChain()` / `releaseHandleOnPrimaryChain()` for mutations.
- Read helpers (`getHandleForAddress`, `isHandleTakenOnChain`) feed the explorer grid and the address detail view so every handle stays in sync across the multi-chain experience.

### Architecture

The multi-chain system uses two key stores:

1. **multiChainStore** - Main store for managing multiple blockchain connections
   - Maintains separate providers for each network
   - Handles primary wallet connection via MetaMask
   - Provides methods to query across all chains

2. **Derived Stores**
   - `availableChains` - Lists all accessible networks
   - `primaryNetwork` - Information about the currently active network

### Usage Examples

#### Query Claims Across All Chains

```javascript
import { multiChainStore } from './stores/multichain';

// Get claims for an address across all configured chains
const claims = await multiChainStore.getClaimsAcrossChains('0xYourAddress');

// claims = [
//   { chainId: 1, network: 'Ethereum', claim: {...} },
//   { chainId: 137, network: 'Polygon', claim: {...} }
// ]
```

#### Check Specific Chain

```javascript
// Check if an address is claimed on a specific chain
const result = await multiChainStore.checkClaimOnChain(137, '0xYourAddress');

if (result.success && result.isClaimed) {
  console.log('Address is claimed on Polygon');
}
```

#### Get Chain-Specific Contract

```javascript
// Get contract instance for a specific chain
const polygonContract = multiChainStore.getChainContract(137);

// Use the contract for read operations
const claim = await polygonContract.getClaim('0xYourAddress');
```

## DID (Decentralized Identifier) Support

Pocketbook now supports W3C-compliant Decentralized Identifiers (DIDs) following the **did:ethr** method specification.

### What are DIDs?

DIDs are a new type of identifier that enables verifiable, self-sovereign digital identity. A DID identifies any subject (e.g., a person, organization, thing, data model, abstract entity, etc.) that the controller of the DID decides to identify.

### DID Format

Each claimed address in Pocketbook automatically receives a DID:

```
did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

Format: `did:ethr:<ethereum-address>`

### DID Document

Every claimed address has an associated DID Document containing:

- **DID identifier** - The unique DID string
- **Controller** - The address that controls this DID
- **Public Keys** - Verification keys for authentication
- **Service Endpoints** - Endpoints for services (messaging, profile, etc.)
- **Alternative Identifiers** - Other identifiers (ENS names, other DIDs)
- **Timestamps** - Creation and last update times

### DID Functions

#### Resolve a DID to Address

```javascript
const address = await contract.resolveDID("did:ethr:0x...");
```

#### Get DID Document

```javascript
const [did, controller, created, updated] = await contract.getDIDDocument(address);
```

#### Get Public Keys

```javascript
const publicKeys = await contract.getDIDPublicKeys(address);
```

#### Add Service Endpoint

```javascript
// Add a messaging service
await contract.addServiceEndpoint(
  "messaging",           // Service ID
  "MessagingService",    // Service type
  "https://msg.example.com/inbox"  // Endpoint URL
);
```

#### Get Service Endpoints

```javascript
const [ids, types, endpoints] = await contract.getServiceEndpoints(address);
```

#### Add Alternative Identifier

```javascript
// Link an ENS name
await contract.addAlsoKnownAs("alice.eth");

// Link another DID
await contract.addAlsoKnownAs("did:key:z6Mk...");
```

### Benefits of DID Support

1. **Self-Sovereign Identity** - You control your identity without intermediaries
2. **Interoperability** - Works across different blockchain platforms and applications
3. **Verifiable Credentials** - Enables issuing and verifying credentials
4. **Privacy-Preserving** - Selective disclosure of information
5. **Standards-Based** - Compliant with W3C DID specification

### Use Cases

- **Cross-Platform Identity** - Use the same DID across multiple dApps
- **Verifiable Claims** - Issue and verify credentials about the DID
- **Service Discovery** - Link to messaging, profile, or other services
- **Identity Aggregation** - Connect multiple identifiers (ENS, other DIDs)
- **Authentication** - Prove control of the DID cryptographically

### DID Resolution

DIDs can be resolved to retrieve the associated address and DID Document:

```javascript
// Resolve DID to address
const address = await contract.resolveDID("did:ethr:0x...");

// Get full DID Document
const doc = await contract.getDIDDocument(address);
```

### Integration with Other Systems

The did:ethr method is widely supported in the decentralized identity ecosystem, including:

- **uPort** - Mobile self-sovereign identity
- **Veramo** - DID and verifiable credentials framework
- **Ceramic Network** - Decentralized data network
- **3Box** - Distributed user data network
- **Sovrin** - Self-sovereign identity network

## IPFS Metadata Storage

Pocketbook integrates IPFS (InterPlanetary File System) for decentralized, censorship-resistant metadata storage. This hybrid approach combines the security of on-chain storage with the flexibility and scalability of IPFS.

### Architecture

The system uses a **hybrid storage model**:

1. **On-Chain**: Critical metadata (name, avatar, social links, IPFS CID)
2. **IPFS**: Extended metadata, large content, and future features (social graph, reputation)
3. **DID Routing**: Decentralized identifiers map to IPFS content for discovery

### Key Features

#### Content Storage
- **Upload to IPFS**: Store JSON metadata and files
- **Content Addressing**: Retrieve content by CID (Content Identifier)
- **Gateway Fallback**: Automatic fallback to public IPFS gateways
- **Pinning**: Local and remote pinning support for persistence

#### DID-Based Routing
```javascript
// Store content with DID association
const did = "did:ethr:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
const result = await didIPFSRouter.storeWithDID(did, metadata);

// Retrieve content by DID
const content = await didIPFSRouter.retrieveByDID(did);
```

#### Smart Contract Integration
- `getIPFSCID(address)` - Get IPFS CID for an address
- `getDIDRoutingInfo(address)` - Get both DID and IPFS CID
- Events: `IPFSMetadataStored`, `IPFSMetadataUpdated`

### Extensibility

The IPFS integration is designed for future features:

```javascript
// Generic storage interface
import { ipfsStorage } from './utils/ipfs';

// Social graph
await ipfsStorage.store('social-graph', socialGraphData);

// Reputation system
await ipfsStorage.store('reputation', reputationData);

// Retrieve typed data
const result = await ipfsStorage.retrieve(cid);
// Returns: { dataType, data, timestamp, cid }
```

### Usage Example

```javascript
// 1. Upload extended metadata to IPFS
const extendedMetadata = {
  name: "Alice",
  interests: ["DeFi", "NFTs"],
  projects: [...]
};

const { cid } = await ipfsStore.uploadMetadata(extendedMetadata);

// 2. Store CID on-chain when claiming address
await contract.claimAddress(
  address, signature, name, avatar, bio,
  website, twitter, github, publicKey, isPrivate,
  cid  // IPFS CID
);

// 3. Later, retrieve full profile
const [did, ipfsCID] = await contract.getDIDRoutingInfo(address);
const { metadata } = await ipfsStore.retrieveMetadata(ipfsCID);
```

### Documentation

For complete IPFS integration documentation, see [docs/IPFS_INTEGRATION.md](./docs/IPFS_INTEGRATION.md), which includes:

- Complete API reference
- DID routing system details
- Smart contract integration
- Extensibility patterns
- Pinning service integration
- Security considerations
- Performance optimization

## Roadmap

- [x] Multi-chain support (Polygon, BSC, Arbitrum, etc.) - **COMPLETED**
  - Simultaneous multi-chain connectivity
  - Cross-chain claim viewing
  - Network switching with MetaMask
  - Support for 6 mainnets and 2 testnets
- [x] DID (Decentralized Identifier) support - **COMPLETED**
  - W3C compliant did:ethr identifiers
  - DID Document management
  - Service endpoint registration
  - Alternative identifier linking
- [x] IPFS metadata storage - **COMPLETED**
  - Decentralized content storage with Helia
  - DID-based IPFS routing for content discovery
  - Hybrid on-chain + IPFS storage model
  - Pin management and gateway fallback
  - Extensible storage interface for future features
  - See [docs/IPFS_INTEGRATION.md](./docs/IPFS_INTEGRATION.md) for details
- [ ] ENS integration
- [ ] Social graph features (IPFS-ready)
- [ ] Reputation system (IPFS-ready)
- [ ] Verifiable credentials issuance
- [ ] Mobile app
- [ ] Browser extension

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- ELTCOIN community for the original vision
- Ethereum Foundation for the blockchain infrastructure
- Svelte team for the excellent framework
- All contributors and early adopters

## Contact

- Project: [https://github.com/eltcoin/pocketbook](https://github.com/eltcoin/pocketbook)
- Issues: [https://github.com/eltcoin/pocketbook/issues](https://github.com/eltcoin/pocketbook/issues)

---

Built with ❤️ for a decentralized future
