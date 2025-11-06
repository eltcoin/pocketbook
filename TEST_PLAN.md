# AddressClaim Contract Test Plan

## Overview

This document provides a comprehensive test plan for validating the security fixes implemented in the AddressClaim.sol contract. The tests are designed to verify all 6 security fixes from the audit report and ensure robust contract behavior.

## Test Environment Setup

### Prerequisites
- Node.js 20.x or later
- Hardhat testing framework
- Ethers.js v6.x

### Installation
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### Configuration
Tests are located in `test/hardhat/AddressClaim.security.test.js` and can be run with:
```bash
npm test
npm run test:security
```

## Test Suites

### 1. [H-01] Stale Private Viewer List Persistence

**Objective**: Verify that the allowedViewers array is properly cleared on claim revocation and reclaim.

#### Test Case 1.1: Clear viewers on revocation
- **Setup**: 
  - Claim address with private metadata
  - Add viewer to allowedViewers
- **Action**:
  - Revoke claim
  - Reclaim same address
- **Expected**: Previous viewer cannot access new private data
- **Validation**: 
  - `isAllowedViewer()` returns false for previous viewer
  - `getClaim()` from previous viewer reverts with "Not authorized"

#### Test Case 1.2: Fresh claim state
- **Setup**:
  - Claim, add viewer, revoke
- **Action**: Reclaim address
- **Expected**: allowedViewers array is empty
- **Validation**: No viewers have access to new claim

---

### 2. [M-01] Revoked DIDs Remain Resolvable

**Objective**: Ensure DID-to-address mapping is deleted on revocation.

#### Test Case 2.1: DID deletion on revocation
- **Setup**: Claim address and get DID
- **Action**: Revoke claim
- **Expected**: DID no longer resolves
- **Validation**: `resolveDID()` reverts with "DID not found"

#### Test Case 2.2: Stale DID after reclaim
- **Setup**: 
  - Claim address (get DID1)
  - Revoke
  - Reclaim (get DID2)
- **Expected**: 
  - Old DID1 does not resolve
  - New DID2 resolves correctly
- **Validation**: 
  - `resolveDID(DID1)` reverts
  - `resolveDID(DID2)` returns correct address

---

### 3. [L-01] DID Document Arrays Accumulate Stale Entries

**Objective**: Verify all DID document arrays are cleared on reclaim.

#### Test Case 3.1: Service endpoints cleared
- **Setup**:
  - Claim and add service endpoints
  - Revoke and reclaim
- **Expected**: No old service endpoints exist
- **Validation**: `getServiceEndpoints()` returns empty array

#### Test Case 3.2: AlsoKnownAs cleared
- **Setup**:
  - Claim and add alternative identifiers
  - Revoke and reclaim
- **Expected**: No old alsoKnownAs entries exist
- **Validation**: `getAlsoKnownAs()` returns empty array

#### Test Case 3.3: Public keys fresh
- **Setup**:
  - Claim with publicKey1
  - Revoke and reclaim with publicKey2
- **Expected**: Only publicKey2 exists
- **Validation**: `getDIDPublicKeys()` returns array with only new key

#### Test Case 3.4: Context array fresh
- **Setup**: Revoke and reclaim
- **Expected**: Standard 2 context entries only
- **Validation**: DID document has correct initialization

---

### 4. [L-02] Missing Service ID Uniqueness Checks

**Objective**: Ensure service endpoint IDs are unique.

#### Test Case 4.1: Prevent duplicate IDs
- **Setup**: Claim address
- **Action**: 
  - Add service endpoint "messaging"
  - Attempt to add another "messaging" endpoint
- **Expected**: Second add fails
- **Validation**: Reverts with "Service endpoint with this ID already exists"

#### Test Case 4.2: Allow different IDs
- **Setup**: Claim address
- **Action**: Add multiple endpoints with different IDs
- **Expected**: All succeed
- **Validation**: `getServiceEndpoints()` returns all endpoints

#### Test Case 4.3: Allow reuse after removal
- **Setup**: 
  - Claim and add "messaging"
  - Remove "messaging"
- **Action**: Add "messaging" again
- **Expected**: Succeeds
- **Validation**: New endpoint exists with correct data

---

### 5. [I-01] Inconsistent Privacy Enforcement

**Objective**: Verify getPublicKey enforces privacy settings.

#### Test Case 5.1: Private key access control
- **Setup**: Claim with private metadata
- **Action**: Unauthorized user calls `getPublicKey()`
- **Expected**: Call fails
- **Validation**: Reverts with "Not authorized to view private metadata"

#### Test Case 5.2: Owner access
- **Setup**: Claim with private metadata
- **Action**: Owner calls `getPublicKey()`
- **Expected**: Returns public key
- **Validation**: Correct key returned

#### Test Case 5.3: Authorized viewer access
- **Setup**:
  - Claim with private metadata
  - Add viewer
- **Action**: Viewer calls `getPublicKey()`
- **Expected**: Returns public key
- **Validation**: Viewer can access key

#### Test Case 5.4: Public access to non-private
- **Setup**: Claim with isPrivate=false
- **Action**: Any user calls `getPublicKey()`
- **Expected**: Returns public key
- **Validation**: Anyone can access non-private key

---

### 6. [I-02] Signature Malleability Checks

**Objective**: Validate signature malleability prevention.

#### Test Case 6.1: Invalid v value
- **Setup**: Create signature with v=26
- **Action**: Call `verifySignature()`
- **Expected**: Validation fails
- **Validation**: Reverts with "Invalid signature 'v' value"

#### Test Case 6.2: High s value
- **Setup**: Create signature with s > n/2
- **Action**: Call `verifySignature()`
- **Expected**: Validation fails
- **Validation**: Reverts with "Invalid signature 's' value"

#### Test Case 6.3: Valid signature
- **Setup**: Create proper signature
- **Action**: Call `verifySignature()`
- **Expected**: Returns true
- **Validation**: Signature validates successfully

---

### 7. Integration Tests

**Objective**: Verify complete claim lifecycle with all security features.

#### Test Case 7.1: Full lifecycle
- **Setup**: Fresh contract
- **Actions**:
  1. Claim with private metadata
  2. Add viewers
  3. Add service endpoints
  4. Add alsoKnownAs
  5. Verify state
  6. Revoke claim
  7. Verify cleanup
  8. Reclaim with new data
  9. Verify fresh state
- **Expected**: All security features work together
- **Validation**:
  - Old viewers removed
  - Old DID not resolvable
  - New DID resolvable
  - Service endpoints cleared
  - Fresh state established

---

## Additional Security Tests

### Test Case 8.1: Reentrancy Protection
- **Objective**: Verify nonReentrant modifier on critical functions
- **Target Functions**: `claimAddress()`, `revokeClaim()`
- **Method**: Attempt reentrant call during execution
- **Expected**: Second call fails with "ReentrancyGuard: reentrant call"

### Test Case 8.2: Access Control
- **Objective**: Verify only claimant can modify their claim
- **Actions**:
  - User A claims address
  - User B attempts to revoke User A's claim
- **Expected**: User B's attempt fails
- **Validation**: Reverts with "Not the claimant"

### Test Case 8.3: State Consistency
- **Objective**: Ensure isClaimed and isActive are consistent
- **Actions**: Various claim/revoke operations
- **Expected**: Flags always match actual state
- **Validation**: Query state before and after each operation

---

## Gas Optimization Tests

### Test Case 9.1: Array clearing efficiency
- **Objective**: Measure gas cost of clearing large arrays
- **Setup**: Claim with 50 viewers
- **Action**: Revoke claim
- **Measurement**: Gas used for revocation
- **Acceptance**: < 500k gas for 50 viewers

### Test Case 9.2: Service endpoint lookup
- **Objective**: Measure gas cost of uniqueness check
- **Setup**: Add 20 service endpoints
- **Action**: Add 21st endpoint
- **Measurement**: Gas used for uniqueness validation
- **Acceptance**: Linear relationship with number of endpoints

---

## Edge Cases

### Test Case 10.1: Empty arrays
- **Scenario**: Reclaim without adding any data first
- **Expected**: No errors, clean initialization

### Test Case 10.2: Maximum data
- **Scenario**: Claim with maximum-length strings
- **Expected**: Successful claim within gas limits

### Test Case 10.3: Zero address handling
- **Scenario**: Attempt to add zero address as viewer
- **Expected**: Appropriate validation (implementation-dependent)

### Test Case 10.4: Same data reclaim
- **Scenario**: Revoke and reclaim with identical data
- **Expected**: Fresh state despite same values

---

## Test Execution Guidelines

### Running Tests
```bash
# Run all tests
npm test

# Run only security tests
npm run test:security

# Run with gas reporting
REPORT_GAS=true npm test

# Run with coverage
npm run coverage
```

### Success Criteria
- All test cases pass
- No revert messages unexpectedly
- Gas costs within acceptable limits
- 100% code coverage on security-critical functions

### Continuous Integration
Tests should be run:
- On every commit
- Before merging to main branch
- On pull requests
- Before production deployment

---

## Manual Testing Checklist

For deployment validation:
- [ ] Deploy to testnet
- [ ] Create test claims with all data types
- [ ] Verify privacy controls work
- [ ] Test viewer management
- [ ] Test DID resolution
- [ ] Test claim revocation and reclaim
- [ ] Verify event emissions
- [ ] Check gas costs
- [ ] Validate with block explorer

---

## Test Data

### Valid Test Inputs
```javascript
const testClaim = {
  name: "Alice",
  avatar: "ipfs://QmHash",
  bio: "Test user",
  website: "https://example.com",
  twitter: "@alice",
  github: "alice",
  publicKey: ethers.toUtf8Bytes("publicKey123"),
  pgpSignature: "-----BEGIN PGP SIGNATURE-----...",
  isPrivate: true,
  ipfsCID: "QmHash123"
};
```

### Invalid Test Inputs
```javascript
const invalidClaim = {
  name: "",  // Empty name should fail
  // ... other fields
};
```

---

## Reporting

Test results should include:
- Pass/fail status for each test case
- Gas consumption per transaction
- Coverage metrics
- Any unexpected behaviors
- Performance benchmarks

---

## Maintenance

This test plan should be updated when:
- New security fixes are implemented
- Contract functionality is extended
- Audit recommendations are added
- Edge cases are discovered
- Gas optimization changes are made

---

## References

- Original Audit Report: `audit-report.md`
- Post-Fix Audit Report: `audit-contract-post-fix.md`
- Security Fixes Summary: `SECURITY_FIXES_SUMMARY.md`
- Test Implementation: `test/hardhat/AddressClaim.security.test.js`
