/**
 * Social Graph Utility Functions Tests
 * Tests for socialGraph.js utility functions
 */

import { 
  formatSocialGraph, 
  calculateSocialStats, 
  validatePGPSignature,
  sortByMetric,
  getRelationshipType,
  getCommonFollowers,
  getCommonFriends
} from '../src/utils/socialGraph.js';

// Test formatSocialGraph
console.log('Testing formatSocialGraph...');
const testGraph = formatSocialGraph(
  ['0xabc', '0xdef'],
  ['0x123', '0x456'],
  ['0x789']
);
console.assert(testGraph.followingCount === 2, 'Following count should be 2');
console.assert(testGraph.followersCount === 2, 'Followers count should be 2');
console.assert(testGraph.friendsCount === 1, 'Friends count should be 1');
console.log('✓ formatSocialGraph tests passed');

// Test calculateSocialStats - unique connections
console.log('\nTesting calculateSocialStats...');
const socialGraph = {
  following: ['0xabc', '0xdef', '0x123'],
  followers: ['0x123', '0x456'],
  friends: ['0x789'],
  followingCount: 3,
  followersCount: 2,
  friendsCount: 1
};
const stats = calculateSocialStats(socialGraph);
console.assert(stats.totalConnections === 5, 'Total unique connections should be 5 (0xabc, 0xdef, 0x123, 0x456, 0x789)');
console.assert(stats.mutualFollows === 1, 'Mutual follows should be 1 (0x123)');
console.log('✓ calculateSocialStats tests passed');

// Test validatePGPSignature
console.log('\nTesting validatePGPSignature...');
const validPGP = `-----BEGIN PGP SIGNATURE-----

iQIzBAABCAAdFiEEexamplecontent
-----END PGP SIGNATURE-----`;
const invalidPGP1 = '-----BEGIN PGP SIGNATURE-----';
const invalidPGP2 = 'not a pgp signature';
const invalidPGP3 = `-----BEGIN PGP SIGNATURE-----
<script>alert('xss')</script>
-----END PGP SIGNATURE-----`;
const emptyPGP = '';

console.assert(validatePGPSignature(validPGP) === true, 'Valid PGP should pass');
console.assert(validatePGPSignature(invalidPGP1) === false, 'Incomplete PGP should fail');
console.assert(validatePGPSignature(invalidPGP2) === false, 'Invalid format should fail');
console.assert(validatePGPSignature(invalidPGP3) === false, 'PGP with HTML should fail');
console.assert(validatePGPSignature(emptyPGP) === true, 'Empty PGP should be valid (optional)');
console.log('✓ validatePGPSignature tests passed');

// Test sortByMetric - should not mutate original
console.log('\nTesting sortByMetric...');
const originalAddresses = ['0xaaa', '0xbbb', '0xccc'];
const socialGraphs = {
  '0xaaa': { followers: [1, 2], following: [], friends: [] },
  '0xbbb': { followers: [1], following: [], friends: [] },
  '0xccc': { followers: [1, 2, 3], following: [], friends: [] }
};
const sorted = sortByMetric(originalAddresses, socialGraphs, 'followers');
console.assert(sorted[0] === '0xccc', 'First should be 0xccc (3 followers)');
console.assert(sorted[1] === '0xaaa', 'Second should be 0xaaa (2 followers)');
console.assert(sorted[2] === '0xbbb', 'Third should be 0xbbb (1 follower)');
console.assert(originalAddresses[0] === '0xaaa', 'Original array should not be mutated');
console.log('✓ sortByMetric tests passed');

// Test getRelationshipType
console.log('\nTesting getRelationshipType...');
const userGraph = {
  following: ['0xfriend', '0xfollowing'],
  followers: ['0xfriend', '0xfollower'],
  friends: ['0xfriend']
};
const targetGraph = { following: [], followers: [], friends: [] };

const friendRel = getRelationshipType('0xuser', '0xfriend', userGraph, targetGraph);
console.assert(friendRel.isFriend === true, 'Should identify friend relationship');
console.assert(friendRel.relationshipType === 'friend', 'Relationship type should be friend');

const followingRel = getRelationshipType('0xuser', '0xfollowing', userGraph, targetGraph);
console.assert(followingRel.isFollowing === true, 'Should identify following relationship');
console.assert(followingRel.relationshipType === 'following', 'Relationship type should be following');

const followerRel = getRelationshipType('0xuser', '0xfollower', userGraph, targetGraph);
console.assert(followerRel.isFollower === true, 'Should identify follower relationship');
console.assert(followerRel.relationshipType === 'follower', 'Relationship type should be follower');
console.log('✓ getRelationshipType tests passed');

// Test getCommonFollowers
console.log('\nTesting getCommonFollowers...');
const graph1 = {
  followers: ['0xabc', '0xdef', '0xghi'],
  following: [],
  friends: []
};
const graph2 = {
  followers: ['0xdef', '0xghi', '0xjkl'],
  following: [],
  friends: []
};
const common = getCommonFollowers(graph1, graph2);
console.assert(common.length === 2, 'Should find 2 common followers');
console.assert(common.includes('0xdef'), 'Should include 0xdef');
console.assert(common.includes('0xghi'), 'Should include 0xghi');
console.log('✓ getCommonFollowers tests passed');

// Test getCommonFriends
console.log('\nTesting getCommonFriends...');
const graphA = {
  followers: [],
  following: [],
  friends: ['0xabc', '0xdef', '0xghi']
};
const graphB = {
  followers: [],
  following: [],
  friends: ['0xdef', '0xghi', '0xjkl']
};
const commonFriends = getCommonFriends(graphA, graphB);
console.assert(commonFriends.length === 2, 'Should find 2 common friends');
console.assert(commonFriends.includes('0xdef'), 'Should include 0xdef');
console.assert(commonFriends.includes('0xghi'), 'Should include 0xghi');
console.log('✓ getCommonFriends tests passed');

console.log('\n✅ All tests passed!');
