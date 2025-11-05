# ENS (Ethereum Name Service) Integration

## Overview

Pocketbook now supports ENS (Ethereum Name Service) integration, enabling users to use human-readable names (like `vitalik.eth`) instead of cryptographic addresses. This makes the platform more user-friendly and accessible.

## Features

### 1. ENS Name Resolution
- **Search by ENS name**: Enter an ENS name (e.g., `alice.eth`) in the Explorer search bar to resolve it to an Ethereum address
- **Automatic resolution**: The system automatically detects ENS name format and resolves it using the ENS registry
- **Error handling**: Clear error messages when ENS names cannot be resolved

### 2. Reverse ENS Lookup
- **Address to name**: Automatically looks up ENS names for Ethereum addresses
- **Display ENS names**: Shows ENS names alongside addresses throughout the application
- **Cached lookups**: Efficient caching to minimize redundant network requests

### 3. ENS Display in UI
- **Explorer page**: Search supports both addresses and ENS names with updated placeholder text
- **Address View**: Displays ENS name badge when available for both claimed and unclaimed addresses
- **Claim Address**: Shows ENS name for connected wallet address

## How to Use

### Searching by ENS Name

1. Navigate to the Explorer page
2. Enter an ENS name in the search bar (e.g., `vitalik.eth`, `alice.eth`)
3. Click "Search" or press Enter
4. The system will resolve the ENS name and navigate to the address page

### Viewing ENS Names

When viewing an address that has an associated ENS name:
- A purple badge with the 🏷️ icon displays the ENS name
- The badge appears below the address on the address view page
- ENS names are shown in monospace font for consistency

### Claim Address with ENS

When claiming an address:
1. Connect your wallet
2. If your address has an ENS name, it will be displayed automatically
3. The ENS name appears in a highlighted info box on the claim form

## Technical Details

### Supported Networks

ENS integration works on the following networks:
- **Ethereum Mainnet** (Chain ID: 1) - Primary ENS network
- **Sepolia Testnet** (Chain ID: 11155111) - For testing
- **Goerli Testnet** (Chain ID: 5) - For testing (deprecated but supported)

### ENS Utility Functions

The `src/utils/ens.js` module provides the following functions:

#### `resolveENSName(ensName, provider)`
Resolves an ENS name to an Ethereum address.

```javascript
import { resolveENSName } from './utils/ens';

const address = await resolveENSName('vitalik.eth', provider);
// Returns: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" or null
```

#### `lookupENSName(address, provider)`
Performs reverse ENS lookup to get the name for an address.

```javascript
import { lookupENSName } from './utils/ens';

const ensName = await lookupENSName('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', provider);
// Returns: "vitalik.eth" or null
```

#### `resolveAddressOrENS(input, provider)`
Universal resolver that handles both addresses and ENS names.

```javascript
import { resolveAddressOrENS } from './utils/ens';

const result = await resolveAddressOrENS('vitalik.eth', provider);
// Returns: { address: "0x...", ensName: "vitalik.eth" }
```

#### `isENSName(input)`
Checks if a string looks like an ENS name.

```javascript
import { isENSName } from './utils/ens';

isENSName('vitalik.eth');  // true
isENSName('0x123...');      // false
```

#### `isENSSupported(provider)`
Checks if the current network supports ENS.

```javascript
import { isENSSupported } from './utils/ens';

const supported = await isENSSupported(provider);
// Returns: true on mainnet, Sepolia, Goerli
```

#### `getENSAvatar(nameOrAddress, provider)`
Retrieves the ENS avatar URL for a name or address.

```javascript
import { getENSAvatar } from './utils/ens';

const avatarUrl = await getENSAvatar('vitalik.eth', provider);
// Returns: Avatar URL or null
```

#### `getENSTextRecord(ensName, provider, key)`
Retrieves ENS text records (url, email, description, etc.).

```javascript
import { getENSTextRecord } from './utils/ens';

const url = await getENSTextRecord('vitalik.eth', provider, 'url');
const email = await getENSTextRecord('vitalik.eth', provider, 'email');
```

### Implementation Details

1. **Provider Requirement**: ENS resolution requires a connected provider (ethers.js BrowserProvider)
2. **Network Detection**: The system automatically detects the current network and enables/disables ENS features accordingly
3. **Graceful Degradation**: If ENS is unavailable or a name cannot be resolved, the application continues to work with addresses
4. **Error Handling**: All ENS functions include try-catch blocks and return null on errors rather than throwing

### Integration Points

ENS integration is implemented in the following components:

- **Explorer.svelte**: ENS name search and resolution
- **AddressView.svelte**: ENS name display for viewed addresses
- **AddressClaim.svelte**: ENS name display for connected wallet
- **App.svelte**: ENS name propagation between views

## Best Practices

1. **Always provide fallback**: Display addresses even when ENS names are available
2. **Handle loading states**: ENS resolution can take time, show loading indicators
3. **Cache results**: Store resolved names to avoid redundant lookups
4. **Validate input**: Check if input is ENS name before attempting resolution
5. **Network awareness**: Only attempt ENS operations on supported networks

## Future Enhancements

Potential improvements for ENS integration:

- [ ] ENS name registration interface
- [ ] ENS avatar display in profile cards
- [ ] ENS text records display (URL, Twitter, GitHub, etc.)
- [ ] Subdomain support
- [ ] ENS name suggestions/autocomplete
- [ ] Multiple ENS name support for single address
- [ ] ENS content hash resolution
- [ ] Off-chain ENS support (CCIP-Read)

## Resources

- [ENS Documentation](https://docs.ens.domains/)
- [Ethers.js ENS Provider](https://docs.ethers.org/v6/api/providers/#Provider-resolveName)
- [ENS Public Resolver](https://docs.ens.domains/contract-api-reference/publicresolver)
- [ENS Standards](https://docs.ens.domains/ens-improvement-proposals)

## Troubleshooting

### ENS name not resolving
- Ensure you're connected to a supported network (Mainnet, Sepolia, Goerli)
- Verify the ENS name is registered and properly configured
- Check browser console for error messages

### Reverse lookup returns null
- Not all addresses have reverse ENS records set
- The address owner must explicitly set the reverse record
- Verify the network supports ENS

### Search not working
- Ensure wallet is connected (some features require provider)
- Check that the network is supported
- Verify input format (name.eth for ENS names)

## Support

For issues or questions about ENS integration, please:
1. Check this documentation
2. Review the ENS utility code in `src/utils/ens.js`
3. Open an issue on GitHub with details about the problem
