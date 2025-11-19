/**
 * AddressClaim contract artifact configuration
 *
 * Replace `bytecode` with the compiled output of contracts/AddressClaim.sol
 * or point the build to supply it via `VITE_ADDRESS_CLAIM_BYTECODE`.
 */

export const addressClaimABI = [
  "function claimAddress(address _address, bytes memory _signature, string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, bool _isPrivate) public",
  "function updateMetadata(string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, bool _isPrivate) public",
  "function getClaim(address _address) public view returns (address claimant, string memory name, string memory avatar, string memory bio, string memory website, string memory twitter, string memory github, uint256 claimTime, bool isActive, bool isPrivate)",
  "function isClaimed(address) public view returns (bool)",
  "function addViewer(address _viewer) public",
  "function removeViewer(address _viewer) public",
  "function revokeClaim() public",
  "function getTotalClaims() public view returns (uint256)",
  "function getClaimedAddressesCount() public view returns (uint256)",
  "function getClaimedAddresses(uint256 offset, uint256 limit) public view returns (address[] memory)",
  "function getClaimedAddressesPaginated(uint256 offset, uint256 limit) public view returns (address[] memory addresses, uint256 total)",
  "event AddressClaimed(address indexed claimedAddress, address indexed claimant, uint256 timestamp)",
  "event MetadataUpdated(address indexed claimedAddress, uint256 timestamp)"
];

export const addressClaimBytecode = (import.meta.env.VITE_ADDRESS_CLAIM_BYTECODE || '').trim();

export function hasDeployableArtifact() {
  return typeof addressClaimBytecode === 'string' && addressClaimBytecode.startsWith('0x') && addressClaimBytecode.length > 2;
}
