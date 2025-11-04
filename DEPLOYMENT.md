# Deployment Guide

This guide covers deploying the Pocketbook decentralized identity platform.

## Smart Contract Deployment

### Prerequisites

- Node.js v16+
- Hardhat or Truffle
- Test ETH (for testnet) or real ETH (for mainnet)
- Infura/Alchemy API key (optional, for hosted nodes)

### Option 1: Deploy with Hardhat

1. Install Hardhat:
```bash
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
```

2. Create `hardhat.config.js`:
```javascript
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.0",
  networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/${YOUR_INFURA_KEY}`,
      accounts: [YOUR_PRIVATE_KEY]
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${YOUR_INFURA_KEY}`,
      accounts: [YOUR_PRIVATE_KEY]
    }
  }
};
```

3. Create deployment script `scripts/deploy.js`:
```javascript
async function main() {
  const AddressClaim = await ethers.getContractFactory("AddressClaim");
  const addressClaim = await AddressClaim.deploy();
  await addressClaim.deployed();
  
  console.log("AddressClaim deployed to:", addressClaim.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

4. Deploy:
```bash
# Deploy to Goerli testnet
npx hardhat run scripts/deploy.js --network goerli

# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet
```

### Option 2: Deploy with Remix

1. Go to [remix.ethereum.org](https://remix.ethereum.org)
2. Create a new file `AddressClaim.sol`
3. Copy the contract code from `contracts/AddressClaim.sol`
4. Compile with Solidity 0.8.0+
5. Deploy using MetaMask to your chosen network

## Frontend Configuration

1. Update the contract address in `src/stores/ethers.js`:
```javascript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress";
```

2. Verify the ABI matches your deployed contract

3. Configure network settings if needed:
```javascript
const NETWORK_ID = 1; // 1 for mainnet, 5 for Goerli, etc.
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
npm run build
vercel --prod
```

### Option 2: Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist/` directory to Netlify:
```bash
netlify deploy --prod --dir=dist
```

### Option 3: GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

3. Update `vite.config.js` for GitHub Pages:
```javascript
export default defineConfig({
  plugins: [svelte()],
  base: '/pocketbook/' // Your repo name
});
```

4. Deploy:
```bash
npm run deploy
```

### Option 4: IPFS (Fully Decentralized)

1. Build the project:
```bash
npm run build
```

2. Upload to IPFS using Pinata, Fleek, or IPFS Desktop

3. Access via IPFS gateway: `https://ipfs.io/ipfs/YOUR_HASH`

## Environment Variables

Create a `.env` file for sensitive data:

```env
VITE_CONTRACT_ADDRESS=0x...
VITE_NETWORK_ID=1
VITE_INFURA_KEY=your_infura_key
```

Access in code:
```javascript
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
```

## Post-Deployment Checklist

- [ ] Verify contract on Etherscan
- [ ] Test all contract functions
- [ ] Test wallet connection
- [ ] Test claiming process
- [ ] Verify privacy controls work
- [ ] Test on mobile devices
- [ ] Set up monitoring/analytics
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS
- [ ] Test with real users

## Network-Specific Notes

### Mainnet
- High gas fees - optimize contract calls
- Irreversible - test thoroughly first
- Consider using a proxy pattern for upgradeability

### Testnets (Goerli, Sepolia)
- Free test ETH from faucets
- Perfect for testing and demos
- Lower security requirements

### L2 Solutions (Polygon, Arbitrum, Optimism)
- Lower gas fees
- Faster transactions
- Growing ecosystem
- Modify network settings in ethers.js

## Monitoring

Consider setting up:
- **The Graph**: Index blockchain events
- **Dune Analytics**: Track usage metrics
- **Tenderly**: Monitor transactions
- **Google Analytics**: Frontend analytics

## Security Considerations

1. **Contract Audits**: Get professional audit before mainnet
2. **Bug Bounty**: Consider running a bug bounty program
3. **Rate Limiting**: Implement on frontend to prevent spam
4. **Access Control**: Verify all permissions are correct
5. **Upgrade Path**: Plan for contract upgrades if needed

## Cost Estimates

### Deployment (Mainnet)
- Contract deployment: ~$50-200 (depending on gas)
- Verification: Free

### User Operations
- Claim address: ~$10-50 per claim
- Update metadata: ~$10-30 per update
- Privacy operations: ~$5-20 per operation

*Costs vary significantly based on gas prices*

## Support

For deployment issues:
- Check documentation at [DOCUMENTATION.md](./DOCUMENTATION.md)
- Open an issue on GitHub
- Join community discussions

## Next Steps

After deployment:
1. Announce to community
2. Submit to DApp directories
3. Write tutorials and guides
4. Gather user feedback
5. Plan future improvements
