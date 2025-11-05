# Reputation System

## Overview

The Pocketbook reputation system implements a decentralized web of trust based on PGP-style keysigning attestations combined with Evidence-Based Subjective Logic for reputation calculation. This approach provides a mathematically rigorous way to compute trust and reputation in a decentralized network without requiring on-chain computation.

## Key Concepts

### PGP-Style Web of Trust

The system is inspired by the PGP (Pretty Good Privacy) web of trust model where:
- Users attest to the trustworthiness of other users
- Trust is transitive: if Alice trusts Bob, and Bob trusts Carol, Alice can derive some level of trust in Carol
- Multiple attestations provide stronger evidence than single attestations
- Trust levels can vary (0-100 scale)

### Evidence-Based Subjective Logic

The reputation calculation uses Subjective Logic, a formal framework for representing and reasoning with uncertain beliefs. Key concepts:

**Opinion**: A tuple (belief, disbelief, uncertainty, base rate) that represents an agent's opinion about a proposition:
- `belief`: The degree of belief that the proposition is true (0-1)
- `disbelief`: The degree of belief that the proposition is false (0-1)
- `uncertainty`: The degree of uncertainty about the proposition (0-1)
- `base rate`: Prior probability in the absence of evidence (0-1)
- Constraint: `belief + disbelief + uncertainty = 1`

**Operations**:
- **Cumulative Fusion**: Combines multiple independent opinions about the same proposition
- **Discounting**: Reduces the strength of an opinion based on the trust in the source
- **Transitive Trust**: Calculates trust through chains of relationships

## Architecture

### On-Chain Components

#### Attestation Structure
```solidity
struct Attestation {
    address attester;        // Address making the attestation
    address subject;         // Address being attested to
    uint8 trustLevel;        // Trust level (0-100)
    string comment;          // Optional comment
    bytes signature;         // PGP-style signature
    uint256 timestamp;       // When created
    bool isActive;           // Current status
}
```

#### Storage
- `attestations[attester][subject]`: Mapping of attestations
- `attestationsGiven[address]`: List of attestations an address has given
- `attestationsReceived[address]`: List of attestations an address has received

#### Functions

**Creating Attestations**
```solidity
function createAttestation(
    address _subject,
    uint8 _trustLevel,
    string memory _comment,
    bytes memory _signature
) public
```

**Revoking Attestations**
```solidity
function revokeAttestation(address _subject) public
```

**Querying Attestations**
```solidity
function getAttestation(address _attester, address _subject) 
    public view returns (...)

function getAttestationsGiven(address _attester) 
    public view returns (address[] memory)

function getAttestationsReceived(address _subject) 
    public view returns (address[] memory)
```

### Off-Chain Components

#### Reputation Calculation (`src/utils/reputation.js`)

The reputation system computes scores off-chain using the Evidence-Based Subjective Logic algorithm. This avoids expensive on-chain computation while maintaining transparency through on-chain attestation storage.

**Core Functions**:

1. **trustLevelToOpinion(trustLevel, weight)**
   - Converts a trust level (0-100) to a subjective logic opinion
   - Higher trust → higher belief
   - Lower trust → higher disbelief

2. **fuseOpinions(opinion1, opinion2)**
   - Combines multiple opinions using cumulative fusion
   - Reduces uncertainty as more evidence is gathered

3. **discountOpinion(opinion, trustFactor)**
   - Discounts an opinion by a trust factor
   - Used for transitive trust calculations

4. **calculateReputation(address, directAttestations, attestationGraph, observerAddress, options)**
   - Main function for computing reputation
   - Combines direct and transitive trust
   - Returns score (0-100), opinion components, and path details

## Usage

### Creating an Attestation

From JavaScript/Svelte:
```javascript
import { multiChainStore } from './stores/multichain';

async function attestToUser(subjectAddress, trustLevel, comment = '') {
  const contract = $multiChainStore.chains[$multiChainStore.primaryChainId]?.contract;
  
  // Create a signature (PGP-style) - simplified example
  const message = `I attest to ${subjectAddress} with trust level ${trustLevel}`;
  const signature = await signer.signMessage(message);
  
  const tx = await contract.createAttestation(
    subjectAddress,
    trustLevel,
    comment,
    signature
  );
  
  await tx.wait();
}
```

### Computing Reputation

```javascript
import { 
  calculateReputation, 
  getReputationSummary,
  buildAttestationGraph 
} from './utils/reputation';

async function getReputationForAddress(address, observerAddress = null) {
  // 1. Fetch all attestations from the contract
  const allAttestations = await fetchAllAttestations();
  
  // 2. Build attestation graph
  const graph = buildAttestationGraph(allAttestations);
  
  // 3. Get direct attestations for this address
  const directAttestations = allAttestations.filter(
    att => att.subject.toLowerCase() === address.toLowerCase() && att.isActive
  );
  
  // 4. Calculate reputation
  const reputation = calculateReputation(
    address,
    directAttestations,
    graph,
    observerAddress,
    {
      maxPathDepth: 3,      // Maximum trust chain length
      maxPaths: 10,         // Maximum paths to consider
      transitiveWeight: 0.5, // Weight for transitive trust
      minTrustLevel: 50     // Minimum trust to follow path
    }
  );
  
  // 5. Get summary
  const summary = getReputationSummary(reputation);
  
  return {
    score: summary.score,           // 0-100
    category: summary.category,     // e.g., "Highly Trusted"
    confidence: summary.confidence, // How certain we are
    directCount: summary.directCount,
    transitiveCount: summary.transitiveCount,
    opinion: reputation.opinion
  };
}
```

## Reputation Calculation Details

### Direct Reputation

Direct reputation is calculated from attestations directly made to an address:

1. Convert each attestation's trust level to an opinion
2. Fuse all opinions together using cumulative fusion
3. Multiple attestations reduce uncertainty and strengthen the reputation

Example:
- Alice attests to Bob at 80%: `opinion = (0.8, 0.2, 0.0, 0.5)`
- Carol attests to Bob at 90%: `opinion = (0.9, 0.1, 0.0, 0.5)`
- Fused: Higher belief, lower uncertainty

### Transitive Reputation

Transitive reputation considers indirect trust through paths:

1. Find trust paths from observer to target (using BFS)
2. For each path, calculate transitive opinion:
   - Start with first edge opinion
   - Discount each subsequent edge by previous trust level
3. Combine transitive opinions with direct opinions

Example path: Alice → Bob → Carol
- Alice trusts Bob at 90%: `opinion1 = (0.9, 0.1, 0.0, 0.5)`
- Bob trusts Carol at 80%: `opinion2 = (0.8, 0.2, 0.0, 0.5)`
- Transitive: Discount opinion2 by 90% = weaker trust in Carol

### Personalized vs. Global Reputation

**Personalized** (with observerAddress):
- Includes transitive trust from observer's perspective
- Different observers may see different reputation scores
- Reflects the observer's web of trust

**Global** (without observerAddress):
- Based only on direct attestations
- Same for all viewers
- Objective measure of received trust

## Reputation Categories

Based on the final score (0-100):
- **Highly Trusted**: 80-100
- **Trusted**: 60-79
- **Neutral**: 40-59
- **Low Trust**: 20-39
- **Untrusted**: 0-19

## Security Considerations

### On-Chain Security
- **Gas Costs**: Creating attestations costs gas, preventing spam
- **Self-Attestation Prevention**: Contract prevents users from attesting to themselves
- **Ownership Verification**: Only the attester can revoke their attestations
- **Claimed Addresses Only**: Both attester and subject must have claimed addresses

### Off-Chain Security
- **Computation Transparency**: All calculations are deterministic and verifiable
- **No Trusted Parties**: Anyone can compute reputation from on-chain data
- **Path Limits**: Depth and count limits prevent computation explosion
- **Sybil Resistance**: Multiple fake identities don't automatically increase reputation

### Attack Vectors and Mitigations

**Sybil Attack**: Creating many fake identities to boost reputation
- Mitigation: Transitive trust is discounted, making long chains weak
- Mitigation: Require minimum trust levels to follow paths
- Mitigation: Gas costs make creating many identities expensive

**Collusion**: Group of users artificially boosting each other's reputation
- Mitigation: Observers can see the attestation graph and judge for themselves
- Mitigation: Personalized reputation reflects observer's own web of trust
- Mitigation: Transparency allows community to identify collusion

**Reputation Bombing**: Many low-trust attestations to damage reputation
- Mitigation: Fusion algorithm handles conflicting evidence
- Mitigation: Positive and negative evidence are balanced
- Mitigation: Attacker identities can be identified and ignored

## Performance Considerations

### On-Chain
- **Storage**: O(n²) worst case where n is number of users (each user attests to each other)
- **Gas Costs**: Creating/updating attestations requires blockchain transaction
- **Queries**: Reading attestations is free (view functions)

### Off-Chain
- **Path Finding**: O(V + E) using BFS where V = vertices, E = edges
- **Path Limit**: Limits prevent exponential growth in dense networks
- **Caching**: Reputation scores can be cached and updated when attestations change
- **Batch Processing**: Can compute reputation for multiple addresses in parallel

## Future Enhancements

### Short-term
- [ ] UI components for creating and viewing attestations
- [ ] Reputation visualization dashboard
- [ ] Attestation history and activity feed
- [ ] Export/import attestations across chains

### Medium-term
- [ ] Reputation decay over time (older attestations worth less)
- [ ] Weighted trust categories (technical, financial, social)
- [ ] Multi-dimensional reputation (different aspects)
- [ ] Privacy-preserving attestations (zero-knowledge proofs)

### Long-term
- [ ] zkML-based on-chain reputation computation
- [ ] Cross-chain reputation aggregation
- [ ] Reputation-based smart contract access control
- [ ] Decentralized reputation oracle

## Mathematical Background

The reputation system is based on:

**Jøsang's Subjective Logic**: A formal logic for reasoning with uncertain beliefs
- Book: "Subjective Logic: A Formalism for Reasoning Under Uncertainty" (2016)
- Provides operators for combining and propagating uncertain opinions

**PGP Web of Trust**: Decentralized trust model
- Users sign each other's keys to establish trust
- Trust is transitive but diminishes with distance
- No central certificate authority required

**Beta Reputation System**: Evidence-based reputation using beta distributions
- Maps evidence (positive/negative) to probability distributions
- Provides mathematical foundation for belief/disbelief

## API Reference

### Smart Contract Functions

```solidity
// Create or update attestation
createAttestation(address subject, uint8 trustLevel, string comment, bytes signature)

// Revoke attestation
revokeAttestation(address subject)

// Query single attestation
getAttestation(address attester, address subject) 
  returns (address, address, uint8, string, uint256, bool)

// Query attestations given by address
getAttestationsGiven(address attester) returns (address[])

// Query attestations received by address
getAttestationsReceived(address subject) returns (address[])

// Get attestation signature
getAttestationSignature(address attester, address subject) returns (bytes)
```

### JavaScript API

```javascript
// Convert trust level to opinion
trustLevelToOpinion(trustLevel: number, weight: number): Opinion

// Combine opinions
fuseOpinions(opinion1: Opinion, opinion2: Opinion): Opinion

// Discount opinion by trust
discountOpinion(opinion: Opinion, trustFactor: number): Opinion

// Convert opinion to expectation
opinionToExpectation(opinion: Opinion): number

// Calculate direct reputation
calculateDirectReputation(attestations: Array): Opinion

// Calculate transitive trust
calculateTransitiveTrust(pathOpinions: Array<Opinion>): Opinion

// Find trust paths
findTrustPaths(source: string, target: string, graph: Object, maxDepth: number): Array

// Main reputation calculation
calculateReputation(
  address: string,
  directAttestations: Array,
  attestationGraph: Object,
  observerAddress: string | null,
  options: Object
): ReputationResult

// Get summary
getReputationSummary(result: ReputationResult): Summary

// Build attestation graph
buildAttestationGraph(attestations: Array): Object
```

## Examples

### Example 1: Simple Direct Reputation

```javascript
// Alice, Bob, and Carol all attest to Dave
const attestations = [
  { attester: '0xAlice', subject: '0xDave', trustLevel: 90, isActive: true },
  { attester: '0xBob', subject: '0xDave', trustLevel: 85, isActive: true },
  { attester: '0xCarol', subject: '0xDave', trustLevel: 95, isActive: true }
];

const reputation = calculateReputation('0xDave', attestations, {}, null);
console.log(reputation.score); // ~90, high trust from multiple sources
console.log(reputation.opinion.uncertainty); // Low, multiple attestations
```

### Example 2: Transitive Trust

```javascript
// Alice trusts Bob, Bob trusts Carol
const graph = {
  '0xalice': [{ subject: '0xBob', trustLevel: 90, isActive: true }],
  '0xbob': [{ subject: '0xCarol', trustLevel: 80, isActive: true }]
};

const reputation = calculateReputation(
  '0xCarol',
  [], // No direct attestations
  graph,
  '0xAlice'
);

console.log(reputation.score); // ~72, discounted through Bob
console.log(reputation.transitiveCount); // 1
console.log(reputation.paths[0].path); // ['0xAlice', '0xBob', '0xCarol']
```

### Example 3: Mixed Evidence

```javascript
// Mixed positive and negative attestations
const attestations = [
  { attester: '0xAlice', trustLevel: 90, isActive: true },  // Positive
  { attester: '0xBob', trustLevel: 85, isActive: true },    // Positive
  { attester: '0xEve', trustLevel: 20, isActive: true }     // Negative
];

const reputation = calculateReputation('0xTarget', attestations, {}, null);
console.log(reputation.score); // ~65, balanced by negative evidence
```

## Testing

Run the comprehensive test suite:

```bash
node test/reputation.test.js
```

Tests cover:
- Opinion operations (conversion, fusion, discounting)
- Direct reputation calculation
- Transitive trust computation
- Path finding algorithms
- Full reputation calculation
- Edge cases and error handling
- Reputation categories

## References

1. Jøsang, A. (2016). *Subjective Logic: A Formalism for Reasoning Under Uncertainty*. Springer.
2. Jøsang, A., Ismail, R., & Boyd, C. (2007). A survey of trust and reputation systems for online service provision. *Decision Support Systems*, 43(2), 618-644.
3. Zimmermann, P. (1995). *The Official PGP User's Guide*. MIT Press.
4. Abdul-Rahman, A., & Hailes, S. (2000). Supporting trust in virtual communities. In *HICSS* (Vol. 6).

## Support

For questions or issues with the reputation system:
- Review this documentation
- Check test files for usage examples
- See contract code for on-chain implementation
- Examine `src/utils/reputation.js` for calculation details
