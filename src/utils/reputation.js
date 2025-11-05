/**
 * Reputation System - Evidence-Based Subjective Logic
 * 
 * Implements a PGP-style web of trust with Evidence-Based Subjective Logic
 * for computing reputation scores off-chain. Based on the principles from:
 * - Jøsang, A. "Subjective Logic" (2016)
 * - PGP web of trust model
 * 
 * Key concepts:
 * - Trust is transitive and can be computed through paths
 * - Direct attestations are weighted more than indirect ones
 * - Belief, disbelief, and uncertainty are tracked separately
 * - Reputation is computed from multiple evidence sources
 */

/**
 * Evidence-Based Subjective Logic Opinion
 * @typedef {Object} Opinion
 * @property {number} belief - Belief component (0-1)
 * @property {number} disbelief - Disbelief component (0-1)
 * @property {number} uncertainty - Uncertainty component (0-1)
 * @property {number} baseRate - Base rate / prior probability (0-1)
 */

/**
 * Convert trust level (0-100) to subjective logic opinion
 * Uses the evidence-based approach where trust levels are mapped to opinions
 * 
 * @param {number} trustLevel - Trust level from 0 to 100
 * @param {number} weight - Weight/confidence in the trust level (0-1)
 * @returns {Opinion} Subjective logic opinion
 */
export function trustLevelToOpinion(trustLevel, weight = 1.0) {
  // Normalize trust level to 0-1 range
  const normalizedTrust = Math.max(0, Math.min(100, trustLevel)) / 100;
  
  // Map trust level to belief/disbelief with uncertainty
  // Higher trust = higher belief
  // Lower trust = higher disbelief
  // Weight affects uncertainty
  
  const belief = normalizedTrust * weight;
  const disbelief = (1 - normalizedTrust) * weight;
  const uncertainty = 1 - weight;
  
  return {
    belief,
    disbelief,
    uncertainty,
    baseRate: 0.5 // Neutral base rate
  };
}

/**
 * Combine multiple opinions using cumulative fusion
 * This is the key operation in subjective logic for combining evidence
 * 
 * @param {Opinion} opinion1 - First opinion
 * @param {Opinion} opinion2 - Second opinion
 * @returns {Opinion} Combined opinion
 */
export function fuseOpinions(opinion1, opinion2) {
  const { belief: b1, disbelief: d1, uncertainty: u1, baseRate: a1 } = opinion1;
  const { belief: b2, disbelief: d2, uncertainty: u2, baseRate: a2 } = opinion2;
  
  // Check for division by zero
  const denominator = u1 + u2 - u1 * u2;
  if (denominator === 0) {
    // Return neutral opinion if both are completely uncertain
    return { belief: 0, disbelief: 0, uncertainty: 1, baseRate: 0.5 };
  }
  
  // Cumulative fusion formula
  const belief = (b1 * u2 + b2 * u1) / denominator;
  const disbelief = (d1 * u2 + d2 * u1) / denominator;
  const uncertainty = (u1 * u2) / denominator;
  
  // Weighted average of base rates
  const baseRate = (a1 * u2 + a2 * u1) / (u1 + u2);
  
  return { belief, disbelief, uncertainty, baseRate };
}

/**
 * Discount an opinion by a trust factor (for transitive trust)
 * When A trusts B, and B trusts C, we discount B's opinion of C by A's trust in B
 * 
 * @param {Opinion} opinion - Opinion to discount
 * @param {number} trustFactor - Trust factor (0-1)
 * @returns {Opinion} Discounted opinion
 */
export function discountOpinion(opinion, trustFactor) {
  const { belief, disbelief, uncertainty, baseRate } = opinion;
  
  return {
    belief: trustFactor * belief,
    disbelief: trustFactor * disbelief,
    uncertainty: 1 - trustFactor * (belief + disbelief),
    baseRate
  };
}

/**
 * Convert opinion to a probability expectation value
 * This gives us a single reputation score from the opinion
 * 
 * @param {Opinion} opinion - Opinion to convert
 * @returns {number} Expectation value (0-1)
 */
export function opinionToExpectation(opinion) {
  const { belief, uncertainty, baseRate } = opinion;
  return belief + uncertainty * baseRate;
}

/**
 * Calculate direct reputation from attestations received
 * 
 * @param {Array} attestations - Array of attestation objects
 * @returns {Opinion} Combined opinion from all attestations
 */
export function calculateDirectReputation(attestations) {
  if (!attestations || attestations.length === 0) {
    // No attestations = complete uncertainty with neutral base rate
    return { belief: 0, disbelief: 0, uncertainty: 1, baseRate: 0.5 };
  }
  
  // Start with the first attestation
  let combinedOpinion = trustLevelToOpinion(attestations[0].trustLevel, 1.0);
  
  // Fuse all attestations together
  for (let i = 1; i < attestations.length; i++) {
    const opinion = trustLevelToOpinion(attestations[i].trustLevel, 1.0);
    combinedOpinion = fuseOpinions(combinedOpinion, opinion);
  }
  
  return combinedOpinion;
}

/**
 * Calculate transitive trust through a path
 * For example: A -> B -> C means A's trust in C through B
 * 
 * @param {Array<Opinion>} pathOpinions - Array of opinions along the path
 * @returns {Opinion} Transitive opinion
 */
export function calculateTransitiveTrust(pathOpinions) {
  if (!pathOpinions || pathOpinions.length === 0) {
    return { belief: 0, disbelief: 0, uncertainty: 1, baseRate: 0.5 };
  }
  
  // Start with the first opinion
  let result = pathOpinions[0];
  
  // Discount each subsequent opinion by the previous one's expectation
  for (let i = 1; i < pathOpinions.length; i++) {
    const trustFactor = opinionToExpectation(result);
    result = discountOpinion(pathOpinions[i], trustFactor);
  }
  
  return result;
}

/**
 * Find trust paths using breadth-first search
 * Limited to a maximum depth to prevent computation explosion
 * 
 * @param {string} source - Source address
 * @param {string} target - Target address
 * @param {Object} attestationGraph - Graph of attestations: address => [attestations]
 * @param {number} maxDepth - Maximum path depth (default: 3)
 * @returns {Array<Array>} Array of paths, each path is an array of addresses
 */
export function findTrustPaths(source, target, attestationGraph, maxDepth = 3) {
  const paths = [];
  const queue = [[source]];
  const visited = new Set([source.toLowerCase()]);
  
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    
    // Check if we've reached the target
    if (current.toLowerCase() === target.toLowerCase()) {
      paths.push(path);
      continue;
    }
    
    // Don't explore beyond max depth
    if (path.length >= maxDepth) {
      continue;
    }
    
    // Explore neighbors
    const currentAttestations = attestationGraph[current.toLowerCase()] || [];
    for (const attestation of currentAttestations) {
      const next = attestation.subject.toLowerCase();
      
      // Avoid cycles
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, attestation.subject]);
      }
    }
  }
  
  return paths;
}

/**
 * Calculate reputation score for an address
 * Combines direct attestations and transitive trust paths
 * 
 * @param {string} address - Address to calculate reputation for
 * @param {Array} directAttestations - Direct attestations to this address
 * @param {Object} attestationGraph - Full attestation graph for transitive trust
 * @param {string} observerAddress - Address of the observer (for personalized reputation)
 * @param {Object} options - Configuration options
 * @returns {Object} Reputation result with score, opinion, and details
 */
export function calculateReputation(
  address,
  directAttestations,
  attestationGraph,
  observerAddress = null,
  options = {}
) {
  const {
    maxPathDepth = 3,
    maxPaths = 10,
    directWeight = 1.0,
    transitiveWeight = 0.5,
    minTrustLevel = 50 // Minimum trust level to consider for paths
  } = options;
  
  // Calculate direct reputation
  const directOpinion = calculateDirectReputation(directAttestations);
  
  // If no observer specified, return direct reputation only
  if (!observerAddress) {
    const expectation = opinionToExpectation(directOpinion);
    return {
      score: expectation * 100, // Convert to 0-100 scale
      opinion: directOpinion,
      directCount: directAttestations.length,
      transitiveCount: 0,
      paths: []
    };
  }
  
  // Find transitive trust paths from observer to target
  const paths = findTrustPaths(
    observerAddress,
    address,
    attestationGraph,
    maxPathDepth
  ).slice(0, maxPaths); // Limit number of paths
  
  // Calculate transitive opinions from each path
  const transitiveOpinions = [];
  const pathDetails = [];
  
  for (const path of paths) {
    if (path.length < 2) continue; // Need at least 2 nodes for a path
    
    const pathOpinions = [];
    let validPath = true;
    
    // Build opinions along the path
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i].toLowerCase();
      const to = path[i + 1].toLowerCase();
      
      // Find attestation from -> to
      const attestation = (attestationGraph[from] || []).find(
        att => att.subject.toLowerCase() === to && att.isActive
      );
      
      if (!attestation || attestation.trustLevel < minTrustLevel) {
        validPath = false;
        break;
      }
      
      pathOpinions.push(trustLevelToOpinion(attestation.trustLevel, 1.0));
    }
    
    if (validPath && pathOpinions.length > 0) {
      const transitiveOpinion = calculateTransitiveTrust(pathOpinions);
      transitiveOpinions.push(transitiveOpinion);
      pathDetails.push({
        path,
        opinion: transitiveOpinion,
        expectation: opinionToExpectation(transitiveOpinion)
      });
    }
  }
  
  // Combine direct and transitive opinions
  let finalOpinion = directOpinion;
  
  // Weight and fuse transitive opinions
  for (const transitiveOpinion of transitiveOpinions) {
    // Discount transitive opinions by the transitive weight
    const weightedTransitive = discountOpinion(transitiveOpinion, transitiveWeight);
    finalOpinion = fuseOpinions(finalOpinion, weightedTransitive);
  }
  
  const expectation = opinionToExpectation(finalOpinion);
  
  return {
    score: expectation * 100, // Convert to 0-100 scale
    opinion: finalOpinion,
    directCount: directAttestations.length,
    transitiveCount: transitiveOpinions.length,
    paths: pathDetails
  };
}

/**
 * Get reputation summary statistics
 * 
 * @param {Object} reputationResult - Result from calculateReputation
 * @returns {Object} Summary statistics
 */
export function getReputationSummary(reputationResult) {
  const { score, opinion, directCount, transitiveCount } = reputationResult;
  const { belief, disbelief, uncertainty } = opinion;
  
  // Determine trust category
  let category;
  if (score >= 80) category = 'Highly Trusted';
  else if (score >= 60) category = 'Trusted';
  else if (score >= 40) category = 'Neutral';
  else if (score >= 20) category = 'Low Trust';
  else category = 'Untrusted';
  
  return {
    score: Math.round(score * 10) / 10, // Round to 1 decimal
    category,
    confidence: Math.round((1 - uncertainty) * 100),
    belief: Math.round(belief * 100),
    disbelief: Math.round(disbelief * 100),
    uncertainty: Math.round(uncertainty * 100),
    directCount,
    transitiveCount,
    totalEvidence: directCount + transitiveCount
  };
}

/**
 * Format attestation data for graph building
 * 
 * @param {Array} attestations - Array of attestation objects from contract
 * @returns {Object} Attestation graph: address => [attestations given]
 */
export function buildAttestationGraph(attestations) {
  const graph = {};
  
  for (const attestation of attestations) {
    const attester = attestation.attester.toLowerCase();
    
    if (!graph[attester]) {
      graph[attester] = [];
    }
    
    if (attestation.isActive) {
      graph[attester].push(attestation);
    }
  }
  
  return graph;
}
