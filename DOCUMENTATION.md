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
- 🔐 **Cryptographic Verification**: All claims are secured by cryptographic signatures proving ownership
- 🌐 **Decentralized Network**: Build your web of trust without central authorities
- 🔒 **Privacy Control**: Choose what's public and what's private with whitelist-based access
- 💼 **Contract Support**: Smart contracts and token addresses can also be claimed
- 🌓 **Night Mode**: Built-in dark theme support
- 🔗 **Web3 Integration**: Seamless integration with MetaMask and other Web3 wallets

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
```

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

## Roadmap

- [x] Multi-chain support (Polygon, BSC, Arbitrum, etc.) - **COMPLETED**
  - Simultaneous multi-chain connectivity
  - Cross-chain claim viewing
  - Network switching with MetaMask
  - Support for 6 mainnets and 2 testnets
- [ ] ENS integration
- [ ] IPFS metadata storage
- [ ] Social graph features
- [ ] Reputation system
- [ ] DID (Decentralized Identifier) support
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
