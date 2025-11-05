/**
 * Social Graph Utilities
 * Helper functions for social graph operations
 */

/**
 * Format social graph data from contract response
 * @param {Array} following - Array of addresses being followed
 * @param {Array} followers - Array of follower addresses  
 * @param {Array} friends - Array of friend addresses
 * @returns {Object} Formatted social graph data
 */
export function formatSocialGraph(following, followers, friends) {
  return {
    following: following || [],
    followers: followers || [],
    friends: friends || [],
    followingCount: following?.length || 0,
    followersCount: followers?.length || 0,
    friendsCount: friends?.length || 0
  };
}

/**
 * Check if two addresses are mutually connected
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @param {Object} socialGraph1 - Social graph of address1
 * @param {Object} socialGraph2 - Social graph of address2
 * @returns {boolean} True if mutually following
 */
export function areMutuallyConnected(address1, address2, socialGraph1, socialGraph2) {
  const addr1Lower = address1.toLowerCase();
  const addr2Lower = address2.toLowerCase();
  
  const address1FollowsAddress2 = socialGraph1.following.some(
    addr => addr.toLowerCase() === addr2Lower
  );
  const address2FollowsAddress1 = socialGraph2.following.some(
    addr => addr.toLowerCase() === addr1Lower
  );
  
  return address1FollowsAddress2 && address2FollowsAddress1;
}

/**
 * Get common followers between two addresses
 * @param {Object} socialGraph1 - Social graph of first address
 * @param {Object} socialGraph2 - Social graph of second address
 * @returns {Array} Array of common follower addresses
 */
export function getCommonFollowers(socialGraph1, socialGraph2) {
  const followers1Set = new Set(
    socialGraph1.followers.map(addr => addr.toLowerCase())
  );
  
  return socialGraph2.followers.filter(
    addr => followers1Set.has(addr.toLowerCase())
  );
}

/**
 * Get common friends between two addresses
 * @param {Object} socialGraph1 - Social graph of first address
 * @param {Object} socialGraph2 - Social graph of second address
 * @returns {Array} Array of common friend addresses
 */
export function getCommonFriends(socialGraph1, socialGraph2) {
  const friends1Set = new Set(
    socialGraph1.friends.map(addr => addr.toLowerCase())
  );
  
  return socialGraph2.friends.filter(
    addr => friends1Set.has(addr.toLowerCase())
  );
}

/**
 * Calculate social graph statistics
 * @param {Object} socialGraph - Social graph data
 * @returns {Object} Statistics object
 */
export function calculateSocialStats(socialGraph) {
  // Calculate unique connections (avoiding double-counting mutual follows)
  const allConnections = new Set();
  
  // Add all followers
  socialGraph.followers.forEach(addr => allConnections.add(addr.toLowerCase()));
  
  // Add all following
  socialGraph.following.forEach(addr => allConnections.add(addr.toLowerCase()));
  
  // Add all friends (already mutual, but ensure no duplicates)
  socialGraph.friends.forEach(addr => allConnections.add(addr.toLowerCase()));
  
  const totalConnections = allConnections.size;
  
  const mutualFollows = socialGraph.following.filter(addr =>
    socialGraph.followers.some(f => f.toLowerCase() === addr.toLowerCase())
  ).length;
  
  return {
    totalConnections,
    mutualFollows,
    followRatio: socialGraph.followersCount > 0 
      ? socialGraph.followingCount / socialGraph.followersCount 
      : 0,
    friendRatio: socialGraph.followingCount > 0
      ? socialGraph.friendsCount / socialGraph.followingCount
      : 0
  };
}

/**
 * Check relationship type between two addresses
 * @param {string} userAddress - Current user's address
 * @param {string} targetAddress - Target address to check
 * @param {Object} userSocialGraph - Current user's social graph
 * @param {Object} targetSocialGraph - Target's social graph
 * @returns {Object} Relationship information
 */
export function getRelationshipType(userAddress, targetAddress, userSocialGraph, targetSocialGraph) {
  const userAddrLower = userAddress.toLowerCase();
  const targetAddrLower = targetAddress.toLowerCase();
  
  const isFollowing = userSocialGraph.following.some(
    addr => addr.toLowerCase() === targetAddrLower
  );
  const isFollower = userSocialGraph.followers.some(
    addr => addr.toLowerCase() === targetAddrLower
  );
  const isFriend = userSocialGraph.friends.some(
    addr => addr.toLowerCase() === targetAddrLower
  );
  
  return {
    isFollowing,
    isFollower,
    isFriend,
    isMutual: isFollowing && isFollower,
    relationshipType: isFriend ? 'friend' : 
                     (isFollowing && isFollower) ? 'mutual' :
                     isFollowing ? 'following' :
                     isFollower ? 'follower' : 'none'
  };
}

/**
 * Sort addresses by a specific metric
 * @param {Array} addresses - Array of addresses
 * @param {Object} socialGraphs - Map of address to social graph
 * @param {string} sortBy - Sort metric ('followers', 'following', 'friends')
 * @returns {Array} Sorted array of addresses
 */
export function sortByMetric(addresses, socialGraphs, sortBy = 'followers') {
  return addresses.sort((a, b) => {
    const graphA = socialGraphs[a.toLowerCase()] || { followers: [], following: [], friends: [] };
    const graphB = socialGraphs[b.toLowerCase()] || { followers: [], following: [], friends: [] };
    
    switch (sortBy) {
      case 'followers':
        return graphB.followers.length - graphA.followers.length;
      case 'following':
        return graphB.following.length - graphA.following.length;
      case 'friends':
        return graphB.friends.length - graphA.friends.length;
      default:
        return 0;
    }
  });
}

/**
 * Validate PGP signature format with enhanced checks
 * @param {string} signature - PGP signature to validate
 * @returns {boolean} True if signature format is valid
 */
export function validatePGPSignature(signature) {
  if (!signature || signature.trim() === '') {
    return true; // Empty signature is valid (optional field)
  }
  
  const trimmed = signature.trim();
  
  // Check for required PGP headers and footers
  const hasBeginHeader = trimmed.includes('-----BEGIN PGP SIGNATURE-----');
  const hasEndFooter = trimmed.includes('-----END PGP SIGNATURE-----');
  
  if (!hasBeginHeader || !hasEndFooter) {
    return false;
  }
  
  // Check that header comes before footer
  const headerIndex = trimmed.indexOf('-----BEGIN PGP SIGNATURE-----');
  const footerIndex = trimmed.indexOf('-----END PGP SIGNATURE-----');
  
  if (headerIndex >= footerIndex) {
    return false;
  }
  
  // Extract the content between header and footer
  const content = trimmed.substring(
    headerIndex + '-----BEGIN PGP SIGNATURE-----'.length,
    footerIndex
  ).trim();
  
  // Basic check: content should not be empty and should contain base64-like characters
  if (content.length === 0) {
    return false;
  }
  
  // Check if content looks like base64 (alphanumeric, +, /, =, and whitespace)
  const base64Pattern = /^[A-Za-z0-9+/=\s\n\r]+$/;
  if (!base64Pattern.test(content)) {
    return false;
  }
  
  return true;
}

/**
 * Format PGP signature for display
 * @param {string} signature - PGP signature
 * @param {number} maxLength - Maximum length to display
 * @returns {string} Formatted signature
 */
export function formatPGPSignature(signature, maxLength = null) {
  if (!signature) {
    return 'No PGP signature provided';
  }
  
  if (maxLength && signature.length > maxLength) {
    return signature.substring(0, maxLength) + '...';
  }
  
  return signature;
}
