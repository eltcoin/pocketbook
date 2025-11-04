// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AddressClaim
 * @dev Decentralized identity and metadata management for Ethereum addresses
 * Users can claim addresses and attach signed metadata
 */
contract AddressClaim {
    
    struct Metadata {
        string name;
        string avatar;
        string bio;
        string website;
        string twitter;
        string github;
        bytes publicKey;
        uint256 timestamp;
        bool isPrivate;
        address[] allowedViewers; // Whitelist for private metadata
    }
    
    struct Claim {
        address claimant;
        bytes signature;
        Metadata metadata;
        uint256 claimTime;
        bool isActive;
    }
    
    // Mapping from address to claim
    mapping(address => Claim) public claims;
    
    // Mapping to track if address is claimed
    mapping(address => bool) public isClaimed;
    
    // Events
    event AddressClaimed(address indexed claimedAddress, address indexed claimant, uint256 timestamp);
    event MetadataUpdated(address indexed claimedAddress, uint256 timestamp);
    event ClaimRevoked(address indexed claimedAddress, uint256 timestamp);
    event ViewerAdded(address indexed claimedAddress, address indexed viewer);
    event ViewerRemoved(address indexed claimedAddress, address indexed viewer);
    
    /**
     * @dev Claim an address with signed metadata
     * @param _address The address being claimed
     * @param _signature Signature proving ownership
     * @param _name Display name
     * @param _avatar Avatar URL or IPFS hash
     * @param _bio Biography
     * @param _website Website URL
     * @param _twitter Twitter handle
     * @param _github Github username
     * @param _publicKey Public key for encryption
     * @param _isPrivate Whether metadata is private
     */
    function claimAddress(
        address _address,
        bytes memory _signature,
        string memory _name,
        string memory _avatar,
        string memory _bio,
        string memory _website,
        string memory _twitter,
        string memory _github,
        bytes memory _publicKey,
        bool _isPrivate
    ) public {
        require(_address == msg.sender, "Can only claim your own address");
        require(!isClaimed[_address], "Address already claimed");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        Metadata memory metadata = Metadata({
            name: _name,
            avatar: _avatar,
            bio: _bio,
            website: _website,
            twitter: _twitter,
            github: _github,
            publicKey: _publicKey,
            timestamp: block.timestamp,
            isPrivate: _isPrivate,
            allowedViewers: new address[](0)
        });
        
        claims[_address] = Claim({
            claimant: msg.sender,
            signature: _signature,
            metadata: metadata,
            claimTime: block.timestamp,
            isActive: true
        });
        
        isClaimed[_address] = true;
        
        emit AddressClaimed(_address, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Update metadata for a claimed address
     */
    function updateMetadata(
        string memory _name,
        string memory _avatar,
        string memory _bio,
        string memory _website,
        string memory _twitter,
        string memory _github,
        bytes memory _publicKey,
        bool _isPrivate
    ) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(claims[msg.sender].claimant == msg.sender, "Not the claimant");
        
        Claim storage claim = claims[msg.sender];
        claim.metadata.name = _name;
        claim.metadata.avatar = _avatar;
        claim.metadata.bio = _bio;
        claim.metadata.website = _website;
        claim.metadata.twitter = _twitter;
        claim.metadata.github = _github;
        claim.metadata.publicKey = _publicKey;
        claim.metadata.timestamp = block.timestamp;
        claim.metadata.isPrivate = _isPrivate;
        
        emit MetadataUpdated(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Add viewer to whitelist for private metadata
     */
    function addViewer(address _viewer) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(claims[msg.sender].metadata.isPrivate, "Metadata is not private");
        
        claims[msg.sender].metadata.allowedViewers.push(_viewer);
        
        emit ViewerAdded(msg.sender, _viewer);
    }
    
    /**
     * @dev Remove viewer from whitelist
     * Note: For production with large whitelists, consider using a mapping for O(1) lookups
     */
    function removeViewer(address _viewer) public {
        require(isClaimed[msg.sender], "Address not claimed");
        
        address[] storage viewers = claims[msg.sender].metadata.allowedViewers;
        for (uint i = 0; i < viewers.length; i++) {
            if (viewers[i] == _viewer) {
                viewers[i] = viewers[viewers.length - 1];
                viewers.pop();
                emit ViewerRemoved(msg.sender, _viewer);
                break;
            }
        }
    }
    
    /**
     * @dev Revoke claim
     */
    function revokeClaim() public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(claims[msg.sender].claimant == msg.sender, "Not the claimant");
        
        claims[msg.sender].isActive = false;
        isClaimed[msg.sender] = false;
        
        emit ClaimRevoked(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get claim info for an address
     */
    function getClaim(address _address) public view returns (
        address claimant,
        string memory name,
        string memory avatar,
        string memory bio,
        string memory website,
        string memory twitter,
        string memory github,
        uint256 claimTime,
        bool isActive,
        bool isPrivate
    ) {
        require(isClaimed[_address], "Address not claimed");
        
        Claim memory claim = claims[_address];
        
        // Check if caller can view private metadata
        if (claim.metadata.isPrivate) {
            require(
                msg.sender == _address || 
                isAllowedViewer(_address, msg.sender),
                "Not authorized to view private metadata"
            );
        }
        
        return (
            claim.claimant,
            claim.metadata.name,
            claim.metadata.avatar,
            claim.metadata.bio,
            claim.metadata.website,
            claim.metadata.twitter,
            claim.metadata.github,
            claim.claimTime,
            claim.isActive,
            claim.metadata.isPrivate
        );
    }
    
    /**
     * @dev Check if viewer is allowed to see private metadata
     */
    function isAllowedViewer(address _address, address _viewer) public view returns (bool) {
        address[] memory viewers = claims[_address].metadata.allowedViewers;
        for (uint i = 0; i < viewers.length; i++) {
            if (viewers[i] == _viewer) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Get public key for address (for encryption)
     */
    function getPublicKey(address _address) public view returns (bytes memory) {
        require(isClaimed[_address], "Address not claimed");
        return claims[_address].metadata.publicKey;
    }
    
    /**
     * @dev Verify signature for claim
     */
    function verifySignature(
        address _address,
        bytes memory _signature,
        bytes32 _messageHash
    ) public pure returns (bool) {
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(_messageHash);
        return recoverSigner(ethSignedMessageHash, _signature) == _address;
    }
    
    function getEthSignedMessageHash(bytes32 _messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }
    
    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }
    
    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        
        // Normalize v value to 27 or 28 for Ethereum signatures
        if (v < 27) {
            v += 27;
        }
    }
}
