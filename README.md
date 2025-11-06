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

### 🔨 Compile the Contract

```bash
npm run compile:contract
```

This command compiles `contracts/AddressClaim.sol`, writes the artifact to `build/AddressClaim.json`, and updates `VITE_ADDRESS_CLAIM_BYTECODE` in your local `.env` file so the admin deploy panel can access the bytecode. Ensure you have Solidity `0.8.x` available (the script fetches it automatically when online).

### ✨ Features

- 🎯 **Address Claiming** - Prove ownership and attach verified metadata to any address
- 🔐 **Cryptographic Security** - All claims signed and verified on-chain
- 🆔 **DID Support** - W3C compliant Decentralized Identifiers (did:ethr) for self-sovereign identity
- 🏷️ **ENS Integration** - Use human-readable names (name.eth) instead of addresses with full ENS resolution and reverse lookup
- 🌐 **Multi-Chain Support** - Simultaneous connectivity to Ethereum, Polygon, BSC, Arbitrum, Optimism, and Avalanche
- 🔗 **Cross-Chain Identity** - View and manage claims across multiple blockchain networks
- 📦 **IPFS Storage** - Decentralized metadata storage with DID-based content routing
- 🔒 **Privacy Controls** - Choose what's public and whitelist private viewers
- 🌓 **Modern UI** - Polished interface with animated backgrounds, modern icons, and vibrant accent colors
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

Pocketbook features a modern, polished design with animated backgrounds, professional SVG icons, and vibrant accent colors that bring the interface to life.

#### Explorer View - Light Mode
Browse and discover claimed addresses with animated star field background, gradient statistics, and modern icon system.

![Pocketbook Explorer Light Mode](https://github.com/user-attachments/assets/154866cc-80e0-4f03-94bc-9a42db0078bc)

*Modern interface featuring animated 3D star field, blue-to-purple gradient statistics, and glass-morphism effects on cards*

#### Explorer View - Dark Mode
Stunning dark theme with enhanced star visibility and accent-colored interactive elements.

![Dark Mode Explorer](https://github.com/user-attachments/assets/6fd1a223-b63d-44fd-adec-f66978cc0997)

*Dark mode with brighter stars, semi-transparent cards with backdrop blur, and vibrant blue (#3b82f6) accent colors*

#### Explorer View - Light Mode (Alternative View)
Additional view showing the clean, professional interface with subtle star animations.

![Light Mode Alternative](https://github.com/user-attachments/assets/4153ddb5-d225-480d-974a-5903970d8efc)

*Light mode with visible animated stars in the background and clean card layouts*

> **Note**: Screenshots show the wallet disconnected state. When a wallet is connected, the "Connect Wallet" button is replaced with a network selector dropdown and a wallet address display with disconnect option, all styled with the same modern icon system and accent colors.

### 🎨 Design System

The UI features a modern, polished design system with:

- **Animated Background**: 
  - Canvas-based 3D star field with 200 stars moving toward viewer
  - Adaptive opacity: 30% in light mode, 80% in dark mode
  - Subtle parallax depth effect for visual interest
  
- **Color Palette**: 
  - **Accent Primary**: `#3b82f6` (Blue) - Buttons, CTAs, interactive elements
  - **Accent Secondary**: `#8b5cf6` (Purple) - Feature highlights, decorative elements
  - Light mode: `#f8fafc` background with semi-transparent cards
  - Dark mode: `#0f172a` background with `#1e293b` cards
  - Gradient effects: Blue-to-purple gradients on statistics
  
- **Icon System**:
  - Custom SVG icon component with 12 Material Design-inspired icons
  - Replaced all emoji icons with professional vector glyphs
  - Crisp, scalable icons with proper accessibility attributes
  - Icons: compass, id-card, tools, sun, moon, wallet, sign-out, globe, search, shield, network, lock, check
  
- **Typography**: Modern Inter font family with refined weights (600-800) and improved spacing

- **Components**: 
  - Glass-morphism cards with `backdrop-filter: blur(10px)`
  - Semi-transparent backgrounds: `rgba(255, 255, 255, 0.8)` for light, `rgba(30, 41, 59, 0.8)` for dark
  - Border radius: 10-12px for cards, 8px for buttons
  - Shadows: `0 1px 3px` for cards, `0 4px 12px rgba(59, 130, 246, 0.3)` on hover
  - Smooth hover effects with `translateY(-2px)` transforms
  - Accent-colored borders on interactive elements
  
- **Visual Effects**:
  - Gradient text effects on statistics using `background-clip: text`
  - Color-coded hover states with accent borders
  - Smooth transitions and animations throughout
  - Enhanced monospace font stack for addresses
  - Professional spacing and visual hierarchy

---

Built with ❤️ for a decentralized future
