/**
 * Utility function to parse claim data from smart contract response
 * @param {Array} claim - Raw claim data array from contract
 * @returns {Object} Parsed claim object with named properties
 */
export function parseClaimData(claim) {
  if (!claim || !Array.isArray(claim)) {
    return null;
  }

  return {
    claimant: claim[0],
    name: claim[1],
    avatar: claim[2],
    bio: claim[3],
    website: claim[4],
    twitter: claim[5],
    github: claim[6],
    claimTime: claim[7],
    isActive: claim[8],
    isPrivate: claim[9]
  };
}
