<div align="center">
  <p>
    <img src="https://pbs.twimg.com/media/DOZbENEXkAA2EMr.png" width="250" />
  </p>
  <p>
    ✨ Censorship immune, Decentralised Human Network & Identity Platform ✨
  </p>
</div>

## Overview

Pocketbook is a revolutionary decentralized identity platform that enables users to claim and verify ownership of their Ethereum addresses. Built with Svelte and Solidity, it creates a censorship-resistant human network where you have complete sovereignty over your digital identity.

### 🚀 Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and connect your MetaMask wallet to get started!

### ✨ Features

- 🎯 **Address Claiming** - Prove ownership and attach verified metadata to any address
- 🔐 **Cryptographic Security** - All claims signed and verified on-chain
- 🆔 **DID Support** - W3C compliant Decentralized Identifiers (did:ethr) for self-sovereign identity
- 🏷️ **ENS Integration** - Use human-readable names (name.eth) instead of addresses with full ENS resolution and reverse lookup
- 🌐 **Multi-Chain Support** - Simultaneous connectivity to Ethereum, Polygon, BSC, Arbitrum, Optimism, and Avalanche
- 🔗 **Cross-Chain Identity** - View and manage claims across multiple blockchain networks
- 📦 **IPFS Storage** - Decentralized metadata storage with DID-based content routing
- 🔒 **Privacy Controls** - Choose what's public and whitelist private viewers
- 🌓 **Dark Mode** - Beautiful UI with light and dark themes
- 💼 **Contract Support** - Claim smart contract and token addresses
- 🔌 **Interoperability** - DID-based identity works across decentralized platforms
- 👥 **Social Graph** - Follow/unfollow users, send friend requests, and build your decentralized network
- 🔑 **PGP Signatures** - Add PGP signatures for additional cryptographic verification
- 🏆 **Reputation System** - PGP-style web of trust with Evidence-Based Subjective Logic for computing trustworthiness

### 📚 Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for comprehensive guides on:
- Architecture and design
- Smart contract deployment
- Frontend development
- Security best practices
- Contributing guidelines

See [docs/ENS_INTEGRATION.md](./docs/ENS_INTEGRATION.md) for ENS integration details:
- ENS name resolution and reverse lookup
- Supported networks and features
- API reference and usage examples

See [docs/IPFS_INTEGRATION.md](./docs/IPFS_INTEGRATION.md) for IPFS storage details:
- Decentralized metadata storage
- DID-based content routing
- Extensibility for future features
- API reference and examples

See [docs/REPUTATION_SYSTEM.md](./docs/REPUTATION_SYSTEM.md) for reputation system details:
- PGP-style web of trust with keysigning attestations
- Evidence-Based Subjective Logic algorithm
- On-chain attestations with off-chain reputation calculation
- API reference and mathematical foundations

### 🏗️ Tech Stack

- **Frontend**: Svelte + Vite
- **Blockchain**: Solidity + Ethers.js
- **Crypto**: Web Crypto API for encryption

### 📸 Screenshots

Pocketbook features a modern, professional design with a clean card-based interface and beautiful light/dark modes.

#### Explorer View - Light Mode
Browse and discover claimed addresses with a modern, clean interface featuring neutral slate colors and subtle shadows.

![Pocketbook Explorer Light Mode](https://github.com/user-attachments/assets/41145dfb-1c68-4240-ba8e-2afacceecdf6)

*Modern card-based explorer with statistics dashboard, search functionality, and recent claims feed*

#### Explorer View - Dark Mode
Comfortable dark theme with enhanced contrast and professional styling.

![Dark Mode Explorer](https://github.com/user-attachments/assets/eaa8beb0-32bb-4c75-85d6-96378d704202)

*Dark mode featuring #0f172a background with #1e293b cards and subtle borders for excellent readability*

#### Claim Address Page - Dark Mode
Streamlined claiming interface with clear visual hierarchy and modern form design.

![Claim Address Page Dark](https://github.com/user-attachments/assets/a6e824f9-14ad-49ab-8dfa-eef9de98225b)

#### Claim Address Page - Light Mode
Clean, professional claim interface with proper spacing and matte card design.

![Claim Address Page Light](https://github.com/user-attachments/assets/bbe8bca6-3faa-4221-b3a3-b74f7c5d87a5)

#### Admin Panel
Professional admin interface for contract deployment across multiple networks.

![Admin Panel](https://github.com/user-attachments/assets/56ef8b1b-0bf4-40be-abae-1cb2d241c3bc)

### 🎨 Design System

The UI features a modern design system with:

- **Color Palette**: 
  - Light mode: `#f8fafc` background with `#ffffff` cards
  - Dark mode: `#0f172a` background with `#1e293b` cards
  - Clean slate-based neutral colors throughout
  
- **Typography**: Modern Inter font family with refined weights (600-800) and improved spacing

- **Components**: 
  - Matte cards with 10-12px border radius
  - Subtle shadows: `0 1px 3px` for elevation
  - Smooth hover effects with `translateY(-2px)` transforms
  - Solid, accessible buttons with proper contrast
  
- **Visual Effects**:
  - No glassmorphism or blur effects
  - Clean borders (`1px solid`) with proper color hierarchy
  - Professional spacing and layout
  - Enhanced monospace font stack for addresses

---

Built with ❤️ for a decentralized future
