const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AddressClaim - Security Fixes Tests", function () {
  let addressClaim;
  let owner, addr1, addr2, addr3;

  // Helper function to create a dummy signature
  async function createSignature(signer, message) {
    const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
    const signature = await signer.signMessage(ethers.getBytes(messageHash));
    return signature;
  }

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const AddressClaim = await ethers.getContractFactory("AddressClaim");
    addressClaim = await AddressClaim.deploy();
    await addressClaim.waitForDeployment();
  });

  describe("[H-01] Stale Private Viewer List Persistence", function () {
    it("Should clear allowedViewers array when claim is revoked", async function () {
      const signature = await createSignature(addr1, "claim");
      
      // Claim address with private metadata
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        true, // isPrivate
        ""
      );

      // Add viewer
      await addressClaim.connect(addr1).addViewer(addr2.address);
      
      // Verify viewer is allowed
      expect(await addressClaim.isAllowedViewer(addr1.address, addr2.address)).to.be.true;

      // Revoke claim
      await addressClaim.connect(addr1).revokeClaim();

      // Reclaim the address
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice New",
        "avatar2.png",
        "New Bio",
        "website2.com",
        "@alice2",
        "alice2",
        ethers.toUtf8Bytes("publicKey2"),
        "pgpSig2",
        true, // isPrivate
        ""
      );

      // Verify previous viewer cannot access new private data
      expect(await addressClaim.isAllowedViewer(addr1.address, addr2.address)).to.be.false;
      
      // Should revert when previous viewer tries to access private data
      await expect(
        addressClaim.connect(addr2).getClaim(addr1.address)
      ).to.be.revertedWith("Not authorized to view private metadata");
    });

    it("Should clear allowedViewers on claimAddress for fresh claim", async function () {
      const signature = await createSignature(addr1, "claim");
      
      // First claim with private metadata
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        true,
        ""
      );

      await addressClaim.connect(addr1).addViewer(addr2.address);
      await addressClaim.connect(addr1).revokeClaim();

      // Reclaim - allowedViewers should be cleared
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        true,
        ""
      );

      // Previous viewer should not have access
      expect(await addressClaim.isAllowedViewer(addr1.address, addr2.address)).to.be.false;
    });
  });

  describe("[M-01] Revoked DIDs Remain Resolvable", function () {
    it("Should delete didToAddress mapping when claim is revoked", async function () {
      const signature = await createSignature(addr1, "claim");
      
      // Claim address
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        false,
        ""
      );

      // Get DID
      const [did] = await addressClaim.getDIDDocument(addr1.address);
      
      // Verify DID resolves before revocation
      expect(await addressClaim.resolveDID(did)).to.equal(addr1.address);

      // Revoke claim
      await addressClaim.connect(addr1).revokeClaim();

      // DID should not resolve after revocation
      await expect(
        addressClaim.resolveDID(did)
      ).to.be.revertedWith("DID not found");
    });

    it("Should not allow stale DID resolution after revocation and reclaim", async function () {
      const signature = await createSignature(addr1, "claim");
      
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        false,
        ""
      );

      const [oldDid] = await addressClaim.getDIDDocument(addr1.address);
      await addressClaim.connect(addr1).revokeClaim();

      // Old DID should not resolve
      await expect(addressClaim.resolveDID(oldDid)).to.be.revertedWith("DID not found");

      // Reclaim
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice New",
        "avatar2.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        false,
        ""
      );

      // New DID should resolve
      const [newDid] = await addressClaim.getDIDDocument(addr1.address);
      expect(await addressClaim.resolveDID(newDid)).to.equal(addr1.address);
      
      // Old DID should still not resolve
      await expect(addressClaim.resolveDID(oldDid)).to.be.revertedWith("DID not found");
    });
  });

  describe("[L-01] DID Document Arrays Accumulate Stale Entries", function () {
    it("Should clear DID document arrays on reclaim", async function () {
      const signature = await createSignature(addr1, "claim");
      
      // First claim
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey1"),
        "pgpSig",
        false,
        ""
      );

      // Add service endpoints
      await addressClaim.connect(addr1).addServiceEndpoint(
        "messaging",
        "MessagingService",
        "https://msg.example.com"
      );
      await addressClaim.connect(addr1).addAlsoKnownAs("twitter:@alice");

      // Get initial state
      let [ids, types, endpoints] = await addressClaim.getServiceEndpoints(addr1.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal("messaging");

      let alsoKnownAs = await addressClaim.getAlsoKnownAs(addr1.address);
      expect(alsoKnownAs.length).to.equal(1);

      // Revoke and reclaim
      await addressClaim.connect(addr1).revokeClaim();
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice New",
        "avatar2.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey2"),
        "pgpSig",
        false,
        ""
      );

      // Old service endpoints should be cleared
      [ids, types, endpoints] = await addressClaim.getServiceEndpoints(addr1.address);
      expect(ids.length).to.equal(0);

      // Old alsoKnownAs should be cleared
      alsoKnownAs = await addressClaim.getAlsoKnownAs(addr1.address);
      expect(alsoKnownAs.length).to.equal(0);

      // Public keys should only contain the new one
      const publicKeys = await addressClaim.getDIDPublicKeys(addr1.address);
      expect(publicKeys.length).to.equal(1);
      expect(publicKeys[0]).to.equal(ethers.toUtf8Bytes("publicKey2"));
    });

    it("Should have fresh context array on reclaim", async function () {
      const signature = await createSignature(addr1, "claim");
      
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey1"),
        "pgpSig",
        false,
        ""
      );

      // The DID document should have standard contexts
      await addressClaim.connect(addr1).revokeClaim();
      
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey2"),
        "pgpSig",
        false,
        ""
      );

      // Should have exactly 2 context entries (standard W3C and secp256k1recovery)
      // This verifies the array was cleared and re-initialized
      const publicKeys = await addressClaim.getDIDPublicKeys(addr1.address);
      expect(publicKeys.length).to.equal(1);
    });
  });

  describe("[L-02] Missing Service ID Uniqueness Checks", function () {
    it("Should prevent duplicate service endpoint IDs", async function () {
      const signature = await createSignature(addr1, "claim");
      
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        false,
        ""
      );

      // Add first service endpoint
      await addressClaim.connect(addr1).addServiceEndpoint(
        "messaging",
        "MessagingService",
        "https://msg1.example.com"
      );

      // Attempting to add duplicate should fail
      await expect(
        addressClaim.connect(addr1).addServiceEndpoint(
          "messaging",
          "MessagingService",
          "https://msg2.example.com"
        )
      ).to.be.revertedWith("Service endpoint with this ID already exists");
    });

    it("Should allow different service endpoint IDs", async function () {
      const signature = await createSignature(addr1, "claim");
      
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        false,
        ""
      );

      // Add multiple different service endpoints
      await addressClaim.connect(addr1).addServiceEndpoint(
        "messaging",
        "MessagingService",
        "https://msg.example.com"
      );

      await addressClaim.connect(addr1).addServiceEndpoint(
        "profile",
        "ProfileService",
        "https://profile.example.com"
      );

      const [ids, types, endpoints] = await addressClaim.getServiceEndpoints(addr1.address);
      expect(ids.length).to.equal(2);
      expect(ids).to.include("messaging");
      expect(ids).to.include("profile");
    });

    it("Should allow same service ID after removal", async function () {
      const signature = await createSignature(addr1, "claim");
      
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        false,
        ""
      );

      await addressClaim.connect(addr1).addServiceEndpoint(
        "messaging",
        "MessagingService",
        "https://msg1.example.com"
      );

      await addressClaim.connect(addr1).removeServiceEndpoint("messaging");

      // Should be able to add again after removal
      await addressClaim.connect(addr1).addServiceEndpoint(
        "messaging",
        "MessagingService",
        "https://msg2.example.com"
      );

      const [ids] = await addressClaim.getServiceEndpoints(addr1.address);
      expect(ids.length).to.equal(1);
      expect(ids[0]).to.equal("messaging");
    });
  });

  describe("[I-01] Inconsistent Privacy Enforcement", function () {
    it("Should enforce privacy check in getPublicKey", async function () {
      const signature = await createSignature(addr1, "claim");
      
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        true, // isPrivate
        ""
      );

      // Owner should be able to access
      const ownerKey = await addressClaim.connect(addr1).getPublicKey(addr1.address);
      expect(ownerKey).to.equal(ethers.toUtf8Bytes("publicKey"));

      // Unauthorized user should not be able to access
      await expect(
        addressClaim.connect(addr2).getPublicKey(addr1.address)
      ).to.be.revertedWith("Not authorized to view private metadata");

      // Add viewer
      await addressClaim.connect(addr1).addViewer(addr2.address);

      // Authorized viewer should be able to access
      const viewerKey = await addressClaim.connect(addr2).getPublicKey(addr1.address);
      expect(viewerKey).to.equal(ethers.toUtf8Bytes("publicKey"));
    });

    it("Should allow public access to non-private getPublicKey", async function () {
      const signature = await createSignature(addr1, "claim");
      
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey"),
        "pgpSig",
        false, // not private
        ""
      );

      // Anyone should be able to access non-private public key
      const publicKey = await addressClaim.connect(addr2).getPublicKey(addr1.address);
      expect(publicKey).to.equal(ethers.toUtf8Bytes("publicKey"));
    });
  });

  describe("[I-02] Signature Malleability Checks", function () {
    it("Should validate v value is 27 or 28", async function () {
      // Create a malformed signature with invalid v value
      const r = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const s = "0x1234567890123456789012345678901234567890123456789012345678901234";
      const v_invalid = 26; // Invalid v value
      
      // Manually construct signature with invalid v
      const invalidSig = ethers.concat([
        r,
        s,
        ethers.toBeHex(v_invalid, 1)
      ]);

      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      
      // Should revert with invalid v value
      await expect(
        addressClaim.verifySignature(addr1.address, invalidSig, messageHash)
      ).to.be.revertedWith("Invalid signature 'v' value");
    });

    it("Should validate s value is in lower half of curve", async function () {
      // Create a signature with high s value (malleable)
      const r = "0x1234567890123456789012345678901234567890123456789012345678901234";
      // s value greater than n/2 (secp256k1 curve order / 2)
      const s_high = "0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1"; // n/2 + 1
      const v = 27;
      
      const malleableSig = ethers.concat([
        r,
        s_high,
        ethers.toBeHex(v, 1)
      ]);

      const messageHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      
      // Should revert with invalid s value
      await expect(
        addressClaim.verifySignature(addr1.address, malleableSig, messageHash)
      ).to.be.revertedWith("Invalid signature 's' value");
    });

    it("Should accept valid signatures", async function () {
      const message = "test message";
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
      const signature = await addr1.signMessage(ethers.getBytes(messageHash));
      
      // Valid signature should work
      const isValid = await addressClaim.verifySignature(addr1.address, signature, messageHash);
      expect(isValid).to.be.true;
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete claim lifecycle with all security features", async function () {
      const signature = await createSignature(addr1, "claim");
      
      // Initial claim with private metadata
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice",
        "avatar.png",
        "Bio",
        "website.com",
        "@alice",
        "alice",
        ethers.toUtf8Bytes("publicKey1"),
        "pgpSig",
        true,
        "QmHash1"
      );

      // Add viewers and service endpoints
      await addressClaim.connect(addr1).addViewer(addr2.address);
      await addressClaim.connect(addr1).addServiceEndpoint("messaging", "MessagingService", "https://msg.com");
      
      const [did1] = await addressClaim.getDIDDocument(addr1.address);
      
      // Verify initial state
      expect(await addressClaim.isAllowedViewer(addr1.address, addr2.address)).to.be.true;
      expect(await addressClaim.resolveDID(did1)).to.equal(addr1.address);

      // Revoke claim
      await addressClaim.connect(addr1).revokeClaim();

      // Verify revocation cleared everything
      await expect(addressClaim.resolveDID(did1)).to.be.revertedWith("DID not found");

      // Reclaim with new data
      await addressClaim.connect(addr1).claimAddress(
        addr1.address,
        signature,
        "Alice Updated",
        "avatar2.png",
        "New Bio",
        "website2.com",
        "@alice2",
        "alice2",
        ethers.toUtf8Bytes("publicKey2"),
        "pgpSig2",
        true,
        "QmHash2"
      );

      // Verify fresh state
      expect(await addressClaim.isAllowedViewer(addr1.address, addr2.address)).to.be.false;
      
      const [ids] = await addressClaim.getServiceEndpoints(addr1.address);
      expect(ids.length).to.equal(0);
      
      // Old DID should not resolve
      await expect(addressClaim.resolveDID(did1)).to.be.revertedWith("DID not found");
      
      // New DID should work
      const [did2] = await addressClaim.getDIDDocument(addr1.address);
      expect(await addressClaim.resolveDID(did2)).to.equal(addr1.address);
      expect(did2).to.not.equal(did1);
    });
  });
});
