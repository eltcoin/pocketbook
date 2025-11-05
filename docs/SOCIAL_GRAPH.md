# Social Graph Features

## Overview

Pocketbook now includes a comprehensive social graph system that enables users to build and maintain decentralized social connections. Users can follow others, send friend requests, and create a network of trusted connections across all supported blockchain networks.

## Features

### Following/Unfollowing

- **Follow users**: Connect with other claimed addresses by following them
- **Unfollow users**: Remove connections at any time
- **Asymmetric relationships**: Following doesn't require mutual consent
- **Cross-chain support**: Social connections work across all supported networks

### Friend Connections

- **Friend requests**: Send friend requests to establish mutual connections
- **Request acceptance**: Accept incoming friend requests to become friends
- **Mutual relationship**: Friendships are bidirectional and require both parties' consent
- **Friend management**: Remove friends when needed

### Social Graph Display

- **Followers list**: View all addresses following you
- **Following list**: See all addresses you follow
- **Friends list**: Display mutual friend connections
- **Interaction statistics**: Track your social network metrics

## Smart Contract Functions

### Following Functions

```solidity
// Follow a user
function followUser(address _userToFollow) public

// Unfollow a user
function unfollowUser(address _userToUnfollow) public

// Check if one user follows another
function isFollowing(address _user1, address _user2) public view returns (bool)
```

### Friend Functions

```solidity
// Send a friend request
function sendFriendRequest(address _to) public

// Accept a friend request
function acceptFriendRequest(address _from) public

// Remove a friend
function removeFriend(address _friend) public

// Check if two users are friends
function areFriends(address _user1, address _user2) public view returns (bool)

// Check for pending friend request
function hasPendingFriendRequest(address _from, address _to) public view returns (bool)
```

### Social Graph Queries

```solidity
// Get complete social graph for an address
function getSocialGraph(address _address) public view returns (
    address[] memory following,
    address[] memory followers,
    address[] memory friends
)
```

## Events

The contract emits the following events for social interactions:

```solidity
event UserFollowed(address indexed follower, address indexed followee, uint256 timestamp)
event UserUnfollowed(address indexed follower, address indexed followee, uint256 timestamp)
event FriendRequestSent(address indexed from, address indexed to, uint256 timestamp)
event FriendRequestAccepted(address indexed from, address indexed to, uint256 timestamp)
event FriendRemoved(address indexed user1, address indexed user2, uint256 timestamp)
```

## Frontend Components

### SocialGraph Component

The `SocialGraph.svelte` component provides a complete UI for social interactions:

- **Action buttons**: Follow/unfollow, send/accept friend requests
- **Tabbed interface**: Switch between followers, following, and friends views
- **Interactive lists**: Click on addresses to view their profiles
- **Real-time updates**: Automatically refreshes after social actions

### AddressView Integration

The social graph is automatically displayed on address profile pages:

- Shows social network statistics
- Provides interaction buttons for non-owners
- Updates in real-time after actions

## Usage Examples

### Following a User

```javascript
import { multiChainStore } from '../stores/multichain';

// Get contract instance
const contract = $multiChainStore.chains[$multiChainStore.primaryChainId]?.contract;

// Follow a user
const tx = await contract.followUser(targetAddress);
await tx.wait();
```

### Sending a Friend Request

```javascript
// Send friend request
const tx = await contract.sendFriendRequest(targetAddress);
await tx.wait();
```

### Accepting a Friend Request

```javascript
// Accept friend request
const tx = await contract.acceptFriendRequest(fromAddress);
await tx.wait();
```

### Querying Social Graph

```javascript
// Get social graph data
const result = await contract.getSocialGraph(address);
const socialGraph = {
  following: result[0],
  followers: result[1],
  friends: result[2]
};
```

## Utility Functions

The `src/utils/socialGraph.js` file provides helper functions:

- `formatSocialGraph()` - Format raw contract data
- `areMutuallyConnected()` - Check mutual following
- `getCommonFollowers()` - Find shared followers
- `getCommonFriends()` - Find shared friends
- `calculateSocialStats()` - Compute statistics
- `getRelationshipType()` - Determine relationship status
- `sortByMetric()` - Sort addresses by social metrics

## PGP Signatures

Users can add PGP signatures to their profiles for additional cryptographic verification:

### Smart Contract Support

```solidity
// PGP signature is stored in the Metadata struct
struct Metadata {
    string name;
    string avatar;
    string bio;
    string website;
    string twitter;
    string github;
    bytes publicKey;
    string pgpSignature;  // PGP signature field
    uint256 timestamp;
    bool isPrivate;
    address[] allowedViewers;
    string ipfsCID;
}

// Get PGP signature for an address
function getPGPSignature(address _address) public view returns (string memory)
```

### Adding PGP Signature

When claiming an address, users can optionally add their PGP signature in the claim form. The signature should be in standard PGP format:

```
-----BEGIN PGP SIGNATURE-----

[signature content]
-----END PGP SIGNATURE-----
```

### Validation

The utility function `validatePGPSignature()` checks for proper PGP signature format:

```javascript
import { validatePGPSignature } from '../utils/socialGraph';

const isValid = validatePGPSignature(signature);
```

## Privacy Considerations

- Social connections are public and visible on-chain
- Friend requests are transparent and can be queried by anyone
- Use privacy controls on metadata separately from social connections
- Consider the public nature of blockchain data when building your network

## Best Practices

1. **Start with following**: Begin by following users you trust before sending friend requests
2. **Verify identities**: Check profiles and metadata before accepting friend requests
3. **Manage connections**: Regularly review your followers and friends
4. **Build gradually**: Grow your network organically over time
5. **Cross-chain consistency**: Remember that social graphs may differ across chains

## Future Enhancements

Potential future features for the social graph:

- Groups and communities
- Reputation scores
- Social activity feeds
- Recommendations based on mutual connections
- Private messaging through encrypted channels
- Trust scores and verification levels

## Security Notes

- All social interactions require gas fees
- Malicious users cannot force connections (except following)
- Friend relationships require mutual consent
- Users have full control over their connections
- No centralized authority can modify the social graph

## Multi-Chain Support

Social graph features work across all supported networks:

- Ethereum Mainnet
- Polygon
- Binance Smart Chain
- Arbitrum
- Optimism
- Avalanche

Each chain maintains its own independent social graph, allowing users to have different connections on different networks.
