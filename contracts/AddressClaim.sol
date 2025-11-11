// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 */
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/**
 * @title AddressClaim
 * @dev Decentralized identity and metadata management for Ethereum addresses
 * Users can claim addresses and attach signed metadata
 * Supports W3C DID (Decentralized Identifier) standard with did:ethr method
 */
contract AddressClaim is ReentrancyGuard {
    
    struct Metadata {
        string name;
        string avatar;
        string bio;
        string website;
        string twitter;
        string github;
        bytes publicKey;
        string pgpSignature; // PGP signature for additional verification
        uint256 timestamp;
        bool isPrivate;
        address[] allowedViewers; // Whitelist for private metadata
        string ipfsCID; // IPFS Content Identifier for extended metadata
    }
    
    struct SocialGraph {
        address[] following;      // Addresses this user follows
        address[] followers;      // Addresses following this user
        address[] friends;        // Mutual connections
        mapping(address => bool) isFollowing;
        mapping(address => bool) isFollower;
        mapping(address => bool) isFriend;
        mapping(address => bool) friendRequestSent;
        mapping(address => bool) friendRequestReceived;
    }
    
    struct ServiceEndpoint {
        string id;           // Service ID (e.g., "messaging", "profile")
        string serviceType;  // Service type (e.g., "MessagingService", "IdentityHub")
        string endpoint;     // Service endpoint URL or address
        bool isActive;
    }
    
    struct DIDDocument {
        string did;                      // DID identifier (e.g., "did:ethr:0x...")
        string[] context;                // JSON-LD context
        address controller;              // DID controller (owner)
        bytes[] publicKeys;              // Array of public keys for verification
        string[] alsoKnownAs;           // Alternative identifiers
        ServiceEndpoint[] serviceEndpoints;
        uint256 created;
        uint256 updated;
    }
    
    struct Claim {
        address claimant;
        bytes signature;
        Metadata metadata;
        uint256 claimTime;
        bool isActive;
        DIDDocument didDocument;  // DID Document for this claim
    }
    
    struct Attestation {
        address attester;        // Address making the attestation
        address subject;         // Address being attested to
        uint8 trustLevel;        // Trust level (0-100)
        string comment;          // Optional comment about the attestation
        bytes signature;         // PGP-style signature of the attestation
        uint256 timestamp;       // When the attestation was made
        bool isActive;           // Whether the attestation is still valid
    }
    
    // Mapping from address to claim
    mapping(address => Claim) public claims;
    
    // Mapping to track if address is claimed
    mapping(address => bool) public isClaimed;

    // Active claim tracking
    uint256 public totalActiveClaims;
    address[] private activeClaimedAddresses;
    mapping(address => uint256) private activeClaimIndex; // 1-based index
    
    // Mapping from DID string to address (for DID resolution)
    mapping(string => address) public didToAddress;
    
    // Social graph mappings
    mapping(address => SocialGraph) private socialGraphs;
    
    // Reputation attestations: attester => subject => Attestation
    mapping(address => mapping(address => Attestation)) public attestations;
    
    // Track all attestations given by an address
    mapping(address => address[]) private attestationsGiven;
    
    // Track all attestations received by an address
    mapping(address => address[]) private attestationsReceived;
    
    // Events
    event AddressClaimed(address indexed claimedAddress, address indexed claimant, uint256 timestamp);
    event MetadataUpdated(address indexed claimedAddress, uint256 timestamp);
    event ClaimRevoked(address indexed claimedAddress, uint256 timestamp);
    event ViewerAdded(address indexed claimedAddress, address indexed viewer);
    event ViewerRemoved(address indexed claimedAddress, address indexed viewer);
    event DIDCreated(address indexed claimedAddress, string did, uint256 timestamp);
    event DIDUpdated(address indexed claimedAddress, string did, uint256 timestamp);
    event ServiceEndpointAdded(address indexed claimedAddress, string serviceId, uint256 timestamp);
    event ServiceEndpointRemoved(address indexed claimedAddress, string serviceId, uint256 timestamp);
    event IPFSMetadataStored(address indexed claimedAddress, string ipfsCID, uint256 timestamp);
    event IPFSMetadataUpdated(address indexed claimedAddress, string ipfsCID, uint256 timestamp);
    event UserFollowed(address indexed follower, address indexed followee, uint256 timestamp);
    event UserUnfollowed(address indexed follower, address indexed followee, uint256 timestamp);
    event FriendRequestSent(address indexed from, address indexed to, uint256 timestamp);
    event FriendRequestAccepted(address indexed from, address indexed to, uint256 timestamp);
    event FriendRemoved(address indexed user1, address indexed user2, uint256 timestamp);
    event AttestationCreated(address indexed attester, address indexed subject, uint8 trustLevel, uint256 timestamp);
    event AttestationRevoked(address indexed attester, address indexed subject, uint256 timestamp);
    event AttestationUpdated(address indexed attester, address indexed subject, uint8 trustLevel, uint256 timestamp);

    function _addActiveClaimant(address _address) internal {
        require(activeClaimIndex[_address] == 0, "Already tracked");
        activeClaimedAddresses.push(_address);
        activeClaimIndex[_address] = activeClaimedAddresses.length; // 1-based
        totalActiveClaims += 1;
    }

    function _removeActiveClaimant(address _address) internal {
        uint256 index = activeClaimIndex[_address];
        if (index == 0) {
            return;
        }

        uint256 arrayIndex = index - 1;
        uint256 lastIndex = activeClaimedAddresses.length - 1;
        if (arrayIndex != lastIndex) {
            address lastAddress = activeClaimedAddresses[lastIndex];
            activeClaimedAddresses[arrayIndex] = lastAddress;
            activeClaimIndex[lastAddress] = index;
        }

        activeClaimedAddresses.pop();
        activeClaimIndex[_address] = 0;

        if (totalActiveClaims > 0) {
            totalActiveClaims -= 1;
        }
    }
    
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
     * @param _pgpSignature PGP signature for additional verification
     * @param _isPrivate Whether metadata is private
     * @param _ipfsCID IPFS Content Identifier for extended metadata (optional)
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
        string memory _pgpSignature,
        bool _isPrivate,
        string memory _ipfsCID
    ) public nonReentrant {
        require(_address == msg.sender, "Can only claim your own address");
        require(!isClaimed[_address], "Address already claimed");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        // Create claim storage reference
        Claim storage newClaim = claims[_address];
        
        // [H-01] Clear allowedViewers array from any previous claim
        while (newClaim.metadata.allowedViewers.length > 0) {
            newClaim.metadata.allowedViewers.pop();
        }
        
        newClaim.claimant = msg.sender;
        newClaim.signature = _signature;
        newClaim.claimTime = block.timestamp;
        newClaim.isActive = true;

        // Initialize metadata
        newClaim.metadata.name = _name;
        newClaim.metadata.avatar = _avatar;
        newClaim.metadata.bio = _bio;
        newClaim.metadata.website = _website;
        newClaim.metadata.twitter = _twitter;
        newClaim.metadata.github = _github;
        newClaim.metadata.publicKey = _publicKey;
        newClaim.metadata.pgpSignature = _pgpSignature;
        newClaim.metadata.timestamp = block.timestamp;
        newClaim.metadata.isPrivate = _isPrivate;
        newClaim.metadata.ipfsCID = _ipfsCID;
        
        // Initialize DID Document
        string memory did = string(abi.encodePacked("did:ethr:", toHexString(_address)));
        _initializeDIDDocument(_address, did, _publicKey);
        
        isClaimed[_address] = true;
        didToAddress[did] = _address;
        _addActiveClaimant(_address);

        emit AddressClaimed(_address, msg.sender, block.timestamp);
        emit DIDCreated(_address, did, block.timestamp);
        
        // Emit IPFS event if CID is provided
        if (bytes(_ipfsCID).length > 0) {
            emit IPFSMetadataStored(_address, _ipfsCID, block.timestamp);
        }
    }
    
    /**
     * @dev Internal function to initialize DID Document
     */
    function _initializeDIDDocument(
        address _address,
        string memory _did,
        bytes memory _publicKey
    ) internal {
        DIDDocument storage doc = claims[_address].didDocument;
        
        // [L-01] Clear DID document arrays from any previous claim
        while (doc.context.length > 0) {
            doc.context.pop();
        }
        while (doc.publicKeys.length > 0) {
            doc.publicKeys.pop();
        }
        while (doc.serviceEndpoints.length > 0) {
            doc.serviceEndpoints.pop();
        }
        while (doc.alsoKnownAs.length > 0) {
            doc.alsoKnownAs.pop();
        }
        
        doc.did = _did;
        doc.controller = msg.sender;
        doc.created = block.timestamp;
        doc.updated = block.timestamp;
        
        // Add context
        doc.context.push("https://www.w3.org/ns/did/v1");
        doc.context.push("https://w3id.org/security/suites/secp256k1recovery-2020/v2");
        
        // Add public key
        doc.publicKeys.push(_publicKey);
    }
    
    /**
     * @dev Update metadata for a claimed address
     * @param _ipfsCID IPFS Content Identifier for extended metadata (optional)
     */
    function updateMetadata(
        string memory _name,
        string memory _avatar,
        string memory _bio,
        string memory _website,
        string memory _twitter,
        string memory _github,
        bytes memory _publicKey,
        string memory _pgpSignature,
        bool _isPrivate,
        string memory _ipfsCID
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
        claim.metadata.pgpSignature = _pgpSignature;
        claim.metadata.timestamp = block.timestamp;
        claim.metadata.isPrivate = _isPrivate;
        claim.metadata.ipfsCID = _ipfsCID;
        
        emit MetadataUpdated(msg.sender, block.timestamp);
        
        // Emit IPFS event if CID is provided
        if (bytes(_ipfsCID).length > 0) {
            emit IPFSMetadataUpdated(msg.sender, _ipfsCID, block.timestamp);
        }
    }
    
    /**
     * @dev Add viewer to whitelist for private metadata
     */
    function addViewer(address _viewer) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(claims[msg.sender].metadata.isPrivate, "Metadata is not private");
        
        // Prevent duplicate viewers
        address[] storage viewers = claims[msg.sender].metadata.allowedViewers;
        for (uint i = 0; i < viewers.length; i++) {
            if (viewers[i] == _viewer) {
                revert("Viewer already added");
            }
        }
        viewers.push(_viewer);
        
        emit ViewerAdded(msg.sender, _viewer);
    }
    
    /**
     * @dev Remove viewer from whitelist
     * Note: For production with large whitelists, consider using a mapping for O(1) lookups
     */
    function removeViewer(address _viewer) public {
        require(isClaimed[msg.sender], "Address not claimed");
        
        address[] storage viewers = claims[msg.sender].metadata.allowedViewers;
        bool found = false;
        for (uint i = 0; i < viewers.length; i++) {
            if (viewers[i] == _viewer) {
                viewers[i] = viewers[viewers.length - 1];
                viewers.pop();
                emit ViewerRemoved(msg.sender, _viewer);
                found = true;
                break;
            }
        }
        require(found, "Viewer not found");
    }
    
    /**
     * @dev Revoke claim
     */
    function revokeClaim() public nonReentrant {
        require(isClaimed[msg.sender], "Address not claimed");
        require(claims[msg.sender].claimant == msg.sender, "Not the claimant");
        
        // [H-01] Clear allowedViewers array on revocation
        while (claims[msg.sender].metadata.allowedViewers.length > 0) {
            claims[msg.sender].metadata.allowedViewers.pop();
        }
        
        // [M-01] Delete DID mapping to prevent stale DID resolution
        string memory did = claims[msg.sender].didDocument.did;
        delete didToAddress[did];

        claims[msg.sender].isActive = false;
        isClaimed[msg.sender] = false;
        _removeActiveClaimant(msg.sender);

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

    function getTotalClaims() public view returns (uint256) {
        return totalActiveClaims;
    }

    function getClaimedAddressesCount() public view returns (uint256) {
        return activeClaimedAddresses.length;
    }

    function getClaimedAddressesPaginated(uint256 offset, uint256 limit) public view returns (address[] memory addresses, uint256 total) {
        uint256 totalAddresses = activeClaimedAddresses.length;
        total = totalAddresses;

        if (limit == 0 || offset >= totalAddresses) {
            return (new address[](0), totalAddresses);
        }

        uint256 end = offset + limit;
        if (end > totalAddresses) {
            end = totalAddresses;
        }

        uint256 sliceLength = end - offset;
        addresses = new address[](sliceLength);
        for (uint256 i = 0; i < sliceLength; i++) {
            addresses[i] = activeClaimedAddresses[offset + i];
        }
    }

    function getClaimedAddresses(uint256 offset, uint256 limit) external view returns (address[] memory) {
        (address[] memory addresses, ) = getClaimedAddressesPaginated(offset, limit);
        return addresses;
    }
    
    /**
     * @dev Get PGP signature for an address
     * @param _address Address to get PGP signature for
     * @return pgpSignature The PGP signature
     */
    function getPGPSignature(address _address) public view returns (string memory) {
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
        
        return claim.metadata.pgpSignature;
    }
    
    /**
     * @dev Get IPFS CID for an address's metadata
     * @param _address Address to get IPFS CID for
     * @return ipfsCID The IPFS Content Identifier
     */
    function getIPFSCID(address _address) public view returns (string memory) {
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
        
        return claim.metadata.ipfsCID;
    }
    
    /**
     * @dev Get DID and IPFS CID for routing
     * @param _address Address to get routing info for
     * @return did The DID identifier
     * @return ipfsCID The IPFS Content Identifier
     */
    function getDIDRoutingInfo(address _address) public view returns (
        string memory did,
        string memory ipfsCID
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
            claim.didDocument.did,
            claim.metadata.ipfsCID
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
        
        Claim memory claim = claims[_address];
        
        // [I-01] Check if caller can view private metadata
        if (claim.metadata.isPrivate) {
            require(
                msg.sender == _address || 
                isAllowedViewer(_address, msg.sender),
                "Not authorized to view private metadata"
            );
        }
        
        return claim.metadata.publicKey;
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
        
        // [I-02] Signature malleability check: validate v and s values
        // v must be 27 or 28
        require(v == 27 || v == 28, "Invalid signature 'v' value");
        
        // s must be in the lower half of the curve order to prevent malleability
        // secp256k1 curve order n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
        // s must be <= n/2
        require(uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0, "Invalid signature 's' value");
    }
    
    /**
     * @dev Resolve a DID to its corresponding address
     * @param _did The DID to resolve (e.g., "did:ethr:0x...")
     * @return The address associated with the DID
     */
    function resolveDID(string memory _did) public view returns (address) {
        address resolvedAddress = didToAddress[_did];
        require(resolvedAddress != address(0), "DID not found");
        return resolvedAddress;
    }
    
    /**
     * @dev Get DID Document for an address
     * @param _address The address to get DID Document for
     * @return did The DID identifier
     * @return controller The DID controller
     * @return created Creation timestamp
     * @return updated Last update timestamp
     */
    function getDIDDocument(address _address) public view returns (
        string memory did,
        address controller,
        uint256 created,
        uint256 updated
    ) {
        require(isClaimed[_address], "Address not claimed");
        
        DIDDocument storage doc = claims[_address].didDocument;
        return (doc.did, doc.controller, doc.created, doc.updated);
    }
    
    /**
     * @dev Get public keys from DID Document
     * @param _address The address to get public keys for
     * @return Array of public keys
     */
    function getDIDPublicKeys(address _address) public view returns (bytes[] memory) {
        require(isClaimed[_address], "Address not claimed");
        return claims[_address].didDocument.publicKeys;
    }
    
    /**
     * @dev Add a service endpoint to DID Document
     * @param _serviceId Service identifier
     * @param _serviceType Type of service
     * @param _endpoint Service endpoint URL
     */
    function addServiceEndpoint(
        string memory _serviceId,
        string memory _serviceType,
        string memory _endpoint
    ) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(claims[msg.sender].claimant == msg.sender, "Not the claimant");
        
        // [L-02] Check for duplicate service IDs to maintain uniqueness
        // Use storage reference for gas efficiency in loop and push operations
        ServiceEndpoint[] storage endpoints = claims[msg.sender].didDocument.serviceEndpoints;
        for (uint i = 0; i < endpoints.length; i++) {
            require(
                keccak256(bytes(endpoints[i].id)) != keccak256(bytes(_serviceId)),
                "Service endpoint with this ID already exists"
            );
        }
        
        ServiceEndpoint memory newService = ServiceEndpoint({
            id: _serviceId,
            serviceType: _serviceType,
            endpoint: _endpoint,
            isActive: true
        });
        
        endpoints.push(newService);
        claims[msg.sender].didDocument.updated = block.timestamp;
        
        emit ServiceEndpointAdded(msg.sender, _serviceId, block.timestamp);
        emit DIDUpdated(msg.sender, claims[msg.sender].didDocument.did, block.timestamp);
    }
    
    /**
     * @dev Remove a service endpoint from DID Document
     * @param _serviceId Service identifier to remove
     */
    function removeServiceEndpoint(string memory _serviceId) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(claims[msg.sender].claimant == msg.sender, "Not the claimant");
        
        ServiceEndpoint[] storage endpoints = claims[msg.sender].didDocument.serviceEndpoints;
        bool found = false;
        
        for (uint i = 0; i < endpoints.length; i++) {
            if (keccak256(bytes(endpoints[i].id)) == keccak256(bytes(_serviceId))) {
                // Move last element to current position and remove last
                endpoints[i] = endpoints[endpoints.length - 1];
                endpoints.pop();
                found = true;
                break;
            }
        }
        
        require(found, "Service endpoint not found");
        claims[msg.sender].didDocument.updated = block.timestamp;
        
        emit ServiceEndpointRemoved(msg.sender, _serviceId, block.timestamp);
        emit DIDUpdated(msg.sender, claims[msg.sender].didDocument.did, block.timestamp);
    }
    
    /**
     * @dev Get service endpoints for an address
     * @param _address The address to get service endpoints for
     * @return ids Array of service endpoint IDs
     * @return types Array of service types
     * @return endpoints Array of service endpoint URLs
     */
    function getServiceEndpoints(address _address) public view returns (
        string[] memory ids,
        string[] memory types,
        string[] memory endpoints
    ) {
        require(isClaimed[_address], "Address not claimed");
        
        ServiceEndpoint[] storage services = claims[_address].didDocument.serviceEndpoints;
        uint activeCount = 0;
        
        // Count active services
        for (uint i = 0; i < services.length; i++) {
            if (services[i].isActive) {
                activeCount++;
            }
        }
        
        // Create arrays
        ids = new string[](activeCount);
        types = new string[](activeCount);
        endpoints = new string[](activeCount);
        
        // Populate arrays
        uint index = 0;
        for (uint i = 0; i < services.length; i++) {
            if (services[i].isActive) {
                ids[index] = services[i].id;
                types[index] = services[i].serviceType;
                endpoints[index] = services[i].endpoint;
                index++;
            }
        }
        
        return (ids, types, endpoints);
    }
    
    /**
     * @dev Add an alternative identifier (alsoKnownAs) to DID Document
     * @param _identifier Alternative identifier (e.g., ENS name, other DID)
     */
    function addAlsoKnownAs(string memory _identifier) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(claims[msg.sender].claimant == msg.sender, "Not the claimant");
        
        claims[msg.sender].didDocument.alsoKnownAs.push(_identifier);
        claims[msg.sender].didDocument.updated = block.timestamp;
        
        emit DIDUpdated(msg.sender, claims[msg.sender].didDocument.did, block.timestamp);
    }
    
    /**
     * @dev Get alternative identifiers for an address
     * @param _address The address to get alternative identifiers for
     * @return Array of alternative identifiers
     */
    function getAlsoKnownAs(address _address) public view returns (string[] memory) {
        require(isClaimed[_address], "Address not claimed");
        return claims[_address].didDocument.alsoKnownAs;
    }
    
    /**
     * @dev Convert address to hex string (for DID construction)
     * @param _address Address to convert
     * @return Hex string representation
     */
    function toHexString(address _address) internal pure returns (string memory) {
        bytes memory buffer = new bytes(42);
        buffer[0] = '0';
        buffer[1] = 'x';
        
        for (uint i = 0; i < 20; i++) {
            uint8 value = uint8(uint160(_address) >> (8 * (19 - i)));
            buffer[2 + i * 2] = getHexChar(value / 16);
            buffer[3 + i * 2] = getHexChar(value % 16);
        }
        
        return string(buffer);
    }
    
    /**
     * @dev Get hex character for value
     * @param _value Value to convert (0-15)
     * @return Hex character
     */
    function getHexChar(uint8 _value) internal pure returns (bytes1) {
        if (_value < 10) {
            return bytes1(uint8(48 + _value)); // '0'-'9'
        } else {
            return bytes1(uint8(87 + _value)); // 'a'-'f'
        }
    }
    
    // ============ Social Graph Functions ============
    
    /**
     * @dev Follow another user
     * @param _userToFollow Address to follow
     */
    function followUser(address _userToFollow) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(isClaimed[_userToFollow], "Target address not claimed");
        require(msg.sender != _userToFollow, "Cannot follow yourself");
        require(!socialGraphs[msg.sender].isFollowing[_userToFollow], "Already following");
        
        // Add to follower's following list
        socialGraphs[msg.sender].following.push(_userToFollow);
        socialGraphs[msg.sender].isFollowing[_userToFollow] = true;
        
        // Add to followee's followers list
        socialGraphs[_userToFollow].followers.push(msg.sender);
        socialGraphs[_userToFollow].isFollower[msg.sender] = true;
        
        emit UserFollowed(msg.sender, _userToFollow, block.timestamp);
    }
    
    /**
     * @dev Unfollow a user
     * @param _userToUnfollow Address to unfollow
     */
    function unfollowUser(address _userToUnfollow) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(socialGraphs[msg.sender].isFollowing[_userToUnfollow], "Not following this user");
        
        // Remove from follower's following list
        _removeFromArray(socialGraphs[msg.sender].following, _userToUnfollow);
        socialGraphs[msg.sender].isFollowing[_userToUnfollow] = false;
        
        // Remove from followee's followers list
        _removeFromArray(socialGraphs[_userToUnfollow].followers, msg.sender);
        socialGraphs[_userToUnfollow].isFollower[msg.sender] = false;
        
        emit UserUnfollowed(msg.sender, _userToUnfollow, block.timestamp);
    }
    
    /**
     * @dev Send a friend request
     * @param _to Address to send friend request to
     */
    function sendFriendRequest(address _to) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(isClaimed[_to], "Target address not claimed");
        require(msg.sender != _to, "Cannot send friend request to yourself");
        require(!socialGraphs[msg.sender].isFriend[_to], "Already friends");
        require(!socialGraphs[msg.sender].friendRequestSent[_to], "Friend request already sent");
        require(!socialGraphs[_to].friendRequestSent[msg.sender], "Friend request already received");
        
        socialGraphs[msg.sender].friendRequestSent[_to] = true;
        socialGraphs[_to].friendRequestReceived[msg.sender] = true;
        
        emit FriendRequestSent(msg.sender, _to, block.timestamp);
    }
    
    /**
     * @dev Accept a friend request
     * @param _from Address that sent the friend request
     */
    function acceptFriendRequest(address _from) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(socialGraphs[msg.sender].friendRequestReceived[_from], "No friend request from this user");
        require(!socialGraphs[msg.sender].isFriend[_from], "Already friends");
        
        // Clear friend request flags
        socialGraphs[msg.sender].friendRequestReceived[_from] = false;
        socialGraphs[_from].friendRequestSent[msg.sender] = false;
        
        // Add to friends lists
        socialGraphs[msg.sender].friends.push(_from);
        socialGraphs[msg.sender].isFriend[_from] = true;
        
        socialGraphs[_from].friends.push(msg.sender);
        socialGraphs[_from].isFriend[msg.sender] = true;
        
        emit FriendRequestAccepted(msg.sender, _from, block.timestamp);
    }
    
    /**
     * @dev Remove a friend
     * @param _friend Address to remove from friends
     */
    function removeFriend(address _friend) public {
        require(isClaimed[msg.sender], "Address not claimed");
        require(socialGraphs[msg.sender].isFriend[_friend], "Not friends with this user");
        
        // Remove from user's friends list
        _removeFromArray(socialGraphs[msg.sender].friends, _friend);
        socialGraphs[msg.sender].isFriend[_friend] = false;
        
        // Remove from friend's friends list
        _removeFromArray(socialGraphs[_friend].friends, msg.sender);
        socialGraphs[_friend].isFriend[msg.sender] = false;
        
        emit FriendRemoved(msg.sender, _friend, block.timestamp);
    }
    
    /**
     * @dev Get social graph data for an address
     * @param _address Address to get social graph for
     * @return following Array of addresses being followed
     * @return followers Array of follower addresses
     * @return friends Array of friend addresses
     */
    function getSocialGraph(address _address) public view returns (
        address[] memory following,
        address[] memory followers,
        address[] memory friends
    ) {
        require(isClaimed[_address], "Address not claimed");
        return (
            socialGraphs[_address].following,
            socialGraphs[_address].followers,
            socialGraphs[_address].friends
        );
    }
    
    /**
     * @dev Check if user1 is following user2
     */
    function isFollowing(address _user1, address _user2) public view returns (bool) {
        return socialGraphs[_user1].isFollowing[_user2];
    }
    
    /**
     * @dev Check if two users are friends
     */
    function areFriends(address _user1, address _user2) public view returns (bool) {
        return socialGraphs[_user1].isFriend[_user2];
    }
    
    /**
     * @dev Check if there's a pending friend request from user1 to user2
     */
    function hasPendingFriendRequest(address _from, address _to) public view returns (bool) {
        return socialGraphs[_from].friendRequestSent[_to];
    }
    
    /**
     * @dev Internal helper to remove address from array
     * @return success True if element was found and removed
     */
    function _removeFromArray(address[] storage array, address element) internal returns (bool) {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == element) {
                array[i] = array[array.length - 1];
                array.pop();
                return true;
            }
        }
        return false;
    }
    
    // ============ Reputation Attestation Functions ============
    
    /**
     * @dev Create or update a trust attestation for another user
     * @param _subject Address being attested to
     * @param _trustLevel Trust level (0-100)
     * @param _comment Optional comment about the attestation
     * @param _signature PGP-style signature of the attestation
     */
    function createAttestation(
        address _subject,
        uint8 _trustLevel,
        string memory _comment,
        bytes memory _signature
    ) public {
        require(isClaimed[msg.sender], "Attester address not claimed");
        require(isClaimed[_subject], "Subject address not claimed");
        require(msg.sender != _subject, "Cannot attest to yourself");
        require(_trustLevel <= 100, "Trust level must be 0-100");
        
        bool isUpdate = attestations[msg.sender][_subject].isActive;
        
        // Create or update attestation
        attestations[msg.sender][_subject] = Attestation({
            attester: msg.sender,
            subject: _subject,
            trustLevel: _trustLevel,
            comment: _comment,
            signature: _signature,
            timestamp: block.timestamp,
            isActive: true
        });
        
        // Track attestations if new
        if (!isUpdate) {
            attestationsGiven[msg.sender].push(_subject);
            attestationsReceived[_subject].push(msg.sender);
            emit AttestationCreated(msg.sender, _subject, _trustLevel, block.timestamp);
        } else {
            emit AttestationUpdated(msg.sender, _subject, _trustLevel, block.timestamp);
        }
    }
    
    /**
     * @dev Revoke a trust attestation
     * @param _subject Address to revoke attestation for
     */
    function revokeAttestation(address _subject) public {
        require(attestations[msg.sender][_subject].isActive, "No active attestation found");
        
        attestations[msg.sender][_subject].isActive = false;
        
        // Remove from tracking arrays
        _removeFromArray(attestationsGiven[msg.sender], _subject);
        _removeFromArray(attestationsReceived[_subject], msg.sender);
        
        emit AttestationRevoked(msg.sender, _subject, block.timestamp);
    }
    
    /**
     * @dev Get attestation from attester to subject
     * @param _attester Address of the attester
     * @param _subject Address of the subject
     * @return attester Address making the attestation
     * @return subject Address being attested to
     * @return trustLevel Trust level (0-100)
     * @return comment Comment about the attestation
     * @return timestamp When the attestation was made
     * @return isActive Whether the attestation is active
     */
    function getAttestation(address _attester, address _subject) public view returns (
        address attester,
        address subject,
        uint8 trustLevel,
        string memory comment,
        uint256 timestamp,
        bool isActive
    ) {
        Attestation memory att = attestations[_attester][_subject];
        return (
            att.attester,
            att.subject,
            att.trustLevel,
            att.comment,
            att.timestamp,
            att.isActive
        );
    }
    
    /**
     * @dev Get all attestations given by an address
     * @param _attester Address of the attester
     * @return Array of addresses that have been attested to
     */
    function getAttestationsGiven(address _attester) public view returns (address[] memory) {
        return attestationsGiven[_attester];
    }
    
    /**
     * @dev Get all attestations received by an address
     * @param _subject Address of the subject
     * @return Array of addresses that have given attestations
     */
    function getAttestationsReceived(address _subject) public view returns (address[] memory) {
        return attestationsReceived[_subject];
    }
    
    /**
     * @dev Get signature for an attestation
     * @param _attester Address of the attester
     * @param _subject Address of the subject
     * @return Signature bytes
     */
    function getAttestationSignature(address _attester, address _subject) public view returns (bytes memory) {
        require(attestations[_attester][_subject].isActive, "No active attestation found");
        return attestations[_attester][_subject].signature;
    }
}
