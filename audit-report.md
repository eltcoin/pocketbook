# AddressClaim.sol Audit Report

## Scope
- Repository: `pocketbook`
- Commit: `c0ba7322929028a898411b43a5dedb2a08bd6246`
- Files reviewed: `contracts/AddressClaim.sol`
- Compiler target: Solidity `0.8.23` (standard JSON compilation with `viaIR: true`)
- Techniques: Manual review, static analysis, targeted compilation using `scripts/compile-contract.js`

## Summary
| Severity | Count |
| --- | --- |
| High | 1 |
| Medium | 1 |
| Low | 2 |
| Informational | 2 |

The contract delivers comprehensive identity, metadata, and social graph features, but several state-management concerns can leak private data or leave stale identifiers reachable after revocation. Addressing the findings below will materially improve end-user safety and data hygiene.

## Findings

### [H-01] Stale private viewer list persists after claim revocation
- **Context:** `claimAddress`, `_initializeDIDDocument`, `revokeClaim`, `getClaim`, `isAllowedViewer`
- **Description:** `claimAddress` reuses the existing storage slot (`Claim storage newClaim = claims[_address];`) without clearing dynamic arrays such as `metadata.allowedViewers`. When a claimant revokes and subsequently re-claims the address, the previous viewer whitelist is still present. Anyone whitelisted before revocation retains access to new private metadata even though the user intended to start fresh.
- **Impact:** High. Users cannot reliably revoke historic viewers, defeating the privacy guarantees provided by the `isPrivate` flag.
- **Recommendation:** Explicitly reset sensitive dynamic arrays when onboarding a fresh claim (e.g., delete `metadata.allowedViewers`, zero out prior DID arrays) or deploy a new storage slot for each claim cycle.

### [M-01] Revoked DIDs remain resolvable via `resolveDID`
- **Context:** `claimAddress`, `revokeClaim`, `resolveDID`
- **Description:** `revokeClaim` sets `isClaimed` to `false` but leaves `didToAddress[did]` populated. Integrators using `resolveDID` continue to receive a supposedly valid mapping after revocation, even though the claim is no longer active.
- **Impact:** Medium. Downstream consumers may treat the DID as live, enabling identity spoofing or stale trust after a user intentionally exits the system.
- **Recommendation:** During revocation (and when re-initialising), delete the DID entry from `didToAddress` and clear the DID document so consumers cannot resolve stale identifiers.

### [L-01] DID document arrays accumulate stale entries across claim cycles
- **Context:** `_initializeDIDDocument`, `addServiceEndpoint`, `addAlsoKnownAs`
- **Description:** Reclaiming an address pushes new entries onto `context`, `publicKeys`, `serviceEndpoints`, and `alsoKnownAs` without clearing historical data. Service endpoints removed in the new lifecycle may still be present because the array was never reset.
- **Impact:** Low. Data grows unbounded and may expose outdated service endpoints, but does not directly break access controls.
- **Recommendation:** Clear DID document arrays when (re)initialising a claim to avoid stale entries.

### [L-02] Missing uniqueness checks for DID service identifiers
- **Context:** `addServiceEndpoint`
- **Description:** The function blindly appends new `ServiceEndpoint` structs. Duplicate `_serviceId` values coexist, making it ambiguous which endpoint is authoritative and increasing the chance of outdated endpoints being returned.
- **Impact:** Low. Duplicates can confuse off-chain resolvers but do not let attackers seize control.
- **Recommendation:** Enforce unique IDs (using a mapping or validating before push) to maintain canonical service definitions.

### [I-01] Privacy flag inconsistently enforced
- **Context:** `getPublicKey`, `getIPFSCID`, `getPGPSignature`
- **Description:** While most getters honour the `isPrivate` flag, `getPublicKey` always returns the stored key. If the public key is intended to be private until a viewer is granted, this leaks data.
- **Recommendation:** Clarify intended visibility. If the key should be protected, reuse the private-viewer guard applied elsewhere.

### [I-02] Signature verification lacks malleability checks
- **Context:** `verifySignature`, `splitSignature`
- **Description:** Recovered signatures are not validated for canonical `s` values. Although this does not currently break functionality, enforcing `s <= secp256k1n/2` and `v ∈ {27,28}` is a best practice to avoid malleable signatures propagating through integrators.
- **Recommendation:** Clamp `s` and validate `v` before calling `ecrecover`.

## Positive Observations
- Functions guarding metadata updates correctly ensure self-ownership and emit rich events for off-chain indexing.
- Social graph management maintains reciprocal state (followers/following, friends) and tracks attestations for revocation, reducing the risk of dangling relationships.

## Testing Performed
- `node scripts/compile-contract.js` (Solidity `0.8.23`, `viaIR: true`)

## Limitations
- No automated fuzzing or formal verification executed.
- Gas cost and UI/UX considerations were outside the scope of this review.

