/**
 * Reputation System Tests
 * Tests for Evidence-Based Subjective Logic reputation calculations
 */

import {
  trustLevelToOpinion,
  fuseOpinions,
  genericDiscount,
  ebslDiscount,
  scalarMultiply,
  discountOpinion,
  opinionToExpectation,
  calculateDirectReputation,
  calculateTransitiveTrust,
  findTrustPaths,
  calculateReputation,
  getReputationSummary,
  buildAttestationGraph
} from '../src/utils/reputation.js';

// Helper to compare floating point numbers
function assertClose(actual, expected, tolerance = 0.01, message = '') {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`FAIL: ${message}`);
    console.error(`  Expected: ${expected}, Got: ${actual}, Diff: ${diff}`);
    throw new Error(message);
  }
}

// Test trustLevelToOpinion
console.log('Testing trustLevelToOpinion...');
const highTrust = trustLevelToOpinion(90, 10); // 90% trust with 10 evidence
assertClose(highTrust.belief, 0.75, 0.05, 'High trust should have high belief'); // (9/12)
assertClose(highTrust.disbelief, 0.083, 0.05, 'High trust should have low disbelief'); // (1/12)
assertClose(highTrust.uncertainty, 0.167, 0.05, 'Should have some uncertainty'); // (2/12)

const lowTrust = trustLevelToOpinion(20, 10);
assertClose(lowTrust.belief, 0.167, 0.05, 'Low trust should have low belief'); // (2/12)
assertClose(lowTrust.disbelief, 0.667, 0.05, 'Low trust should have high disbelief'); // (8/12)

const moderateTrust = trustLevelToOpinion(50, 5);
assertClose(moderateTrust.belief, 0.357, 0.05, 'Moderate trust should have moderate belief'); // (2.5/7)
assertClose(moderateTrust.uncertainty, 0.286, 0.05, 'Less evidence should have more uncertainty'); // (2/7)
console.log('✓ trustLevelToOpinion tests passed');

// Test fuseOpinions
console.log('\nTesting fuseOpinions...');
const opinion1 = { belief: 0.6, disbelief: 0.2, uncertainty: 0.2, baseRate: 0.5 };
const opinion2 = { belief: 0.4, disbelief: 0.3, uncertainty: 0.3, baseRate: 0.5 };
const fused = fuseOpinions(opinion1, opinion2);

// The sum should still be approximately 1
const sum = fused.belief + fused.disbelief + fused.uncertainty;
assertClose(sum, 1.0, 0.01, 'Fused opinion components should sum to 1');

// Fused opinion should have less uncertainty than either input
console.assert(fused.uncertainty < opinion1.uncertainty, 'Fusion should reduce uncertainty');
console.assert(fused.uncertainty < opinion2.uncertainty, 'Fusion should reduce uncertainty');
console.log('✓ fuseOpinions tests passed');

// Test discountOpinion - now testing the new EBSL genericDiscount
console.log('\nTesting EBSL genericDiscount...');
const originalOpinion = { belief: 0.8, disbelief: 0.1, uncertainty: 0.1, baseRate: 0.5 };
const discountingOpinion = { belief: 0.5, disbelief: 0.3, uncertainty: 0.2, baseRate: 0.5 };
const discounted = genericDiscount(discountingOpinion, originalOpinion);

// With g(x) = belief = 0.5, we expect scalarMultiply(0.5, originalOpinion)
// The discounted opinion should have reduced evidence
assertClose(discounted.belief, 0.727, 0.05, 'Belief should be adjusted by discount factor');
console.assert(discounted.uncertainty > originalOpinion.uncertainty, 'Discounting should increase uncertainty');
console.log('✓ EBSL genericDiscount tests passed');

// Test opinionToExpectation
console.log('\nTesting opinionToExpectation...');
const certainOpinion = { belief: 0.8, disbelief: 0.1, uncertainty: 0.1, baseRate: 0.5 };
const expectation = opinionToExpectation(certainOpinion);
assertClose(expectation, 0.85, 0.01, 'Expectation should be belief + uncertainty * baseRate');

const uncertainOpinion = { belief: 0.0, disbelief: 0.0, uncertainty: 1.0, baseRate: 0.5 };
const uncertainExpectation = opinionToExpectation(uncertainOpinion);
assertClose(uncertainExpectation, 0.5, 0.01, 'Fully uncertain should equal base rate');
console.log('✓ opinionToExpectation tests passed');

// Test calculateDirectReputation
console.log('\nTesting calculateDirectReputation...');
const attestations = [
  { trustLevel: 80, attester: '0xAAA', subject: '0xBBB', isActive: true },
  { trustLevel: 90, attester: '0xCCC', subject: '0xBBB', isActive: true },
  { trustLevel: 70, attester: '0xDDD', subject: '0xBBB', isActive: true }
];

const directRep = calculateDirectReputation(attestations);
const directExp = opinionToExpectation(directRep);
console.assert(directExp > 0.7, 'Direct reputation should be high with multiple positive attestations');
console.assert(directExp < 1.0, 'Direct reputation should not be perfect');
console.assert(directRep.uncertainty < 0.5, 'Multiple attestations should reduce uncertainty');
console.log('✓ calculateDirectReputation tests passed');

// Test with no attestations
const noAttestations = calculateDirectReputation([]);
assertClose(noAttestations.uncertainty, 1.0, 0.01, 'No attestations should have full uncertainty');
assertClose(noAttestations.belief, 0.0, 0.01, 'No attestations should have no belief');
console.log('✓ calculateDirectReputation with no attestations passed');

// Test calculateTransitiveTrust
console.log('\nTesting calculateTransitiveTrust...');
const path = [
  trustLevelToOpinion(90, 10), // A trusts B at 90%
  trustLevelToOpinion(80, 10)  // B trusts C at 80%
];
const transitive = calculateTransitiveTrust(path, 'generic');
const transitiveExp = opinionToExpectation(transitive);

// Transitive trust should be less than direct trust
console.assert(transitiveExp < 0.9, 'Transitive trust should be discounted');
console.assert(transitiveExp > 0.4, 'Transitive trust should still be positive with high path trust');
console.assert(transitive.uncertainty > path[0].uncertainty, 'Transitive trust should have more uncertainty');
console.log('✓ calculateTransitiveTrust tests passed');

// Test findTrustPaths
console.log('\nTesting findTrustPaths...');
const testGraph = {
  '0xaaa': [
    { subject: '0xBBB', trustLevel: 80, isActive: true },
    { subject: '0xCCC', trustLevel: 70, isActive: true }
  ],
  '0xbbb': [
    { subject: '0xDDD', trustLevel: 90, isActive: true }
  ],
  '0xccc': [
    { subject: '0xDDD', trustLevel: 85, isActive: true }
  ]
};

const paths = findTrustPaths('0xAAA', '0xDDD', testGraph, 3);
console.assert(paths.length >= 2, 'Should find multiple paths from AAA to DDD');
console.assert(paths.some(p => p.length === 3), 'Should find 2-hop paths');

// Test that paths don't exceed max depth
const longPaths = findTrustPaths('0xAAA', '0xDDD', testGraph, 2);
console.assert(longPaths.every(p => p.length <= 2), 'Paths should not exceed max depth');
console.log('✓ findTrustPaths tests passed');

// Test calculateReputation (full integration)
console.log('\nTesting calculateReputation...');
const targetAddress = '0xDDD';
const directAtts = [
  { trustLevel: 85, attester: '0xEEE', subject: targetAddress, isActive: true }
];

const reputation = calculateReputation(
  targetAddress,
  directAtts,
  testGraph,
  '0xAAA',
  { maxPathDepth: 3, transitiveWeight: 0.5 }
);

console.assert(reputation.score > 0, 'Should have a positive reputation score');
console.assert(reputation.score <= 100, 'Score should not exceed 100');
console.assert(reputation.directCount === 1, 'Should count direct attestations');
console.assert(reputation.transitiveCount >= 0, 'Should count transitive paths');
console.assert(reputation.paths.length >= 0, 'Should include path details');
console.log('✓ calculateReputation tests passed');

// Test reputation without observer (direct only)
const directOnly = calculateReputation(targetAddress, directAtts, testGraph, null);
console.assert(directOnly.transitiveCount === 0, 'Without observer, should have no transitive trust');
console.assert(directOnly.paths.length === 0, 'Without observer, should have no paths');
console.log('✓ calculateReputation without observer passed');

// Test getReputationSummary
console.log('\nTesting getReputationSummary...');
const summary = getReputationSummary(reputation);
console.assert(summary.score >= 0 && summary.score <= 100, 'Summary score should be in valid range');
console.assert(typeof summary.category === 'string', 'Should have a category');
console.assert(summary.confidence >= 0 && summary.confidence <= 100, 'Confidence should be in valid range');
console.assert(summary.totalEvidence === summary.directCount + summary.transitiveCount, 'Total evidence should sum correctly');
console.log('✓ getReputationSummary tests passed');

// Test buildAttestationGraph
console.log('\nTesting buildAttestationGraph...');
const rawAttestations = [
  { attester: '0xAAA', subject: '0xBBB', trustLevel: 80, isActive: true },
  { attester: '0xAAA', subject: '0xCCC', trustLevel: 70, isActive: true },
  { attester: '0xBBB', subject: '0xCCC', trustLevel: 90, isActive: true },
  { attester: '0xDDD', subject: '0xEEE', trustLevel: 50, isActive: false } // Inactive
];

const graph = buildAttestationGraph(rawAttestations);
console.assert(graph['0xaaa'].length === 2, 'Should have 2 attestations from 0xAAA');
console.assert(graph['0xbbb'].length === 1, 'Should have 1 attestation from 0xBBB');
console.assert(!graph['0xddd'] || graph['0xddd'].length === 0, 'Should not include inactive attestations');
console.log('✓ buildAttestationGraph tests passed');

// Test edge cases
console.log('\nTesting edge cases...');

// Self-attestation (should be handled by contract, but test calculation)
const selfAtt = [{ trustLevel: 100, attester: '0xAAA', subject: '0xAAA', isActive: true }];
const selfRep = calculateDirectReputation(selfAtt);
console.assert(opinionToExpectation(selfRep) > 0.9, 'Self attestation should result in high score');

// Very low trust attestation
const lowAtt = [{ trustLevel: 10, attester: '0xAAA', subject: '0xBBB', isActive: true }];
const lowRep = calculateDirectReputation(lowAtt);
console.assert(opinionToExpectation(lowRep) < 0.3, 'Low trust attestation should result in low score');

// Mixed attestations
const mixedAtts = [
  { trustLevel: 90, attester: '0xAAA', subject: '0xBBB', isActive: true },
  { trustLevel: 10, attester: '0xCCC', subject: '0xBBB', isActive: true }
];
const mixedRep = calculateDirectReputation(mixedAtts);
const mixedExp = opinionToExpectation(mixedRep);
console.assert(mixedExp > 0.3 && mixedExp < 0.9, 'Mixed attestations should result in moderate score');
console.log('✓ Edge cases tests passed');

// Test reputation categories
console.log('\nTesting reputation categories...');
const highRepResult = { score: 85, opinion: { belief: 0.8, disbelief: 0.1, uncertainty: 0.1 }, directCount: 5, transitiveCount: 2 };
const highSummary = getReputationSummary(highRepResult);
console.assert(highSummary.category === 'Highly Trusted', 'High score should be "Highly Trusted"');

const lowRepResult = { score: 15, opinion: { belief: 0.1, disbelief: 0.8, uncertainty: 0.1 }, directCount: 2, transitiveCount: 0 };
const lowSummary = getReputationSummary(lowRepResult);
console.assert(lowSummary.category === 'Untrusted', 'Low score should be "Untrusted"');

const neutralRepResult = { score: 45, opinion: { belief: 0.4, disbelief: 0.4, uncertainty: 0.2 }, directCount: 1, transitiveCount: 0 };
const neutralSummary = getReputationSummary(neutralRepResult);
console.assert(neutralSummary.category === 'Neutral', 'Mid score should be "Neutral"');
console.log('✓ Reputation categories tests passed');

console.log('\n✅ All reputation system tests passed!');
console.log('\nTest Summary:');
console.log('- Opinion conversion and operations work correctly');
console.log('- Direct reputation calculated from attestations');
console.log('- Transitive trust computed through paths');
console.log('- Path finding works with depth limits');
console.log('- Full reputation calculation integrates all components');
console.log('- Edge cases handled appropriately');
console.log('- Reputation categories assigned correctly');
