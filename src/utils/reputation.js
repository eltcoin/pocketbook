/**
 * Reputation System - Evidence-Based Subjective Logic (EBSL)
 * 
 * Implements a PGP-style web of trust with Evidence-Based Subjective Logic
 * for computing reputation scores off-chain. Based on:
 * - Škoric, de Hoogh, Zannone: "Flow-based reputation with uncertainty: 
 *   evidence-based subjective logic" (Int. J. Inf. Secur. 2016)
 * - Jøsang, A. "Subjective Logic" (2016)
 * - PGP web of trust model
 * 
 * Key EBSL improvements over traditional Subjective Logic:
 * - New discounting operator (⊙) based on evidence flow, not opinion multiplication
 * - Right-distributivity: x ⊙ (y ⊕ z) = (x ⊙ y) ⊕ (x ⊙ z)
 * - Scalar multiplication consistent with evidence addition
 * - Enables flow-based reputation for arbitrary trust networks
 * - No need to discard information or transform to canonical form
 * - Avoids double-counting of evidence
 * 
 * Constant c: Soft threshold on evidence amount (default: 2 for compatibility)
 */

/**
 * Evidence-Based Subjective Logic Opinion
 * Based on Theorem 1 from Škoric et al. (2016)
 * 
 * @typedef {Object} Opinion
 * @property {number} belief - Belief component (0-1)
 * @property {number} disbelief - Disbelief component (0-1)
 * @property {number} uncertainty - Uncertainty component (0-1)
 * @property {number} baseRate - Base rate / prior probability (0-1)
 */

// Constant c: soft threshold on evidence (from paper Theorem 1)
// Interpretation: beyond this threshold, enough confidence to form opinion
const EVIDENCE_CONSTANT_C = 2;

/**
 * Convert evidence (p, n) to opinion using EBSL formula
 * Formula from Theorem 1: (b, d, u) = (p, n, c) / (p + n + c)
 * 
 * @param {number} p - Positive evidence (>=0)
 * @param {number} n - Negative evidence (>=0)
 * @param {number} c - Evidence constant (default: 2)
 * @returns {Opinion} Subjective logic opinion
 */
export function evidenceToOpinion(p, n, c = EVIDENCE_CONSTANT_C) {
  const total = p + n + c;
  
  return {
    belief: p / total,
    disbelief: n / total,
    uncertainty: c / total,
    baseRate: 0.5 // Neutral base rate
  };
}

/**
 * Convert opinion to evidence amounts
 * Inverse of evidenceToOpinion
 * 
 * @param {Opinion} opinion - Opinion to convert
 * @param {number} c - Evidence constant (default: 2)
 * @returns {Object} Evidence with p (positive) and n (negative)
 */
export function opinionToEvidence(opinion, c = EVIDENCE_CONSTANT_C) {
  const { belief, disbelief, uncertainty } = opinion;
  
  // From formula: p = c * b / u, n = c * d / u
  if (uncertainty === 0) {
    // Dogmatic opinion - infinite evidence
    return { p: Infinity, n: Infinity };
  }
  
  return {
    p: c * belief / uncertainty,
    n: c * disbelief / uncertainty
  };
}

/**
 * Convert trust level (0-100) to subjective logic opinion using EBSL
 * Maps trust level to evidence, then to opinion
 * 
 * @param {number} trustLevel - Trust level from 0 to 100
 * @param {number} evidenceAmount - Total amount of evidence (default: 10)
 * @returns {Opinion} Subjective logic opinion
 */
export function trustLevelToOpinion(trustLevel, evidenceAmount = 10) {
  // Normalize trust level to 0-1 range
  const normalizedTrust = Math.max(0, Math.min(100, trustLevel)) / 100;
  
  // Map to positive and negative evidence
  // Higher trust = more positive evidence
  const p = normalizedTrust * evidenceAmount;
  const n = (1 - normalizedTrust) * evidenceAmount;
  
  return evidenceToOpinion(p, n);
}

/**
 * Combine multiple opinions using cumulative fusion (consensus operator ⊕)
 * Corresponds to addition of evidence from independent sources
 * Formula from Lemma 1: Combines evidence (p1+p2, n1+n2, c) / (p1+n1+p2+n2+c)
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
  
  // Cumulative fusion formula (Definition 2 from paper)
  const belief = (b1 * u2 + b2 * u1) / denominator;
  const disbelief = (d1 * u2 + d2 * u1) / denominator;
  const uncertainty = (u1 * u2) / denominator;
  
  // Weighted average of base rates
  const baseRate = (a1 * u2 + a2 * u1) / (u1 + u2);
  
  return { belief, disbelief, uncertainty, baseRate };
}

/**
 * Scalar multiplication of opinion (Definition 11 from paper)
 * Multiplies the evidence underlying the opinion by a scalar
 * 
 * @param {number} alpha - Scalar multiplier (>= 0)
 * @param {Opinion} opinion - Opinion to multiply
 * @returns {Opinion} Scaled opinion
 */
export function scalarMultiply(alpha, opinion) {
  const { belief, disbelief, uncertainty } = opinion;
  
  if (alpha < 0) {
    throw new Error('Scalar must be non-negative');
  }
  
  if (alpha === 0) {
    // 0 · x = U (full uncertainty)
    return { belief: 0, disbelief: 0, uncertainty: 1, baseRate: 0.5 };
  }
  
  // Formula from Definition 11: α · x = (αb, αd, u) / (α(b+d) + u)
  const denominator = alpha * (belief + disbelief) + uncertainty;
  
  return {
    belief: (alpha * belief) / denominator,
    disbelief: (alpha * disbelief) / denominator,
    uncertainty: uncertainty / denominator,
    baseRate: opinion.baseRate
  };
}

/**
 * EBSL Discounting operator (⊙) - Definition 13 from paper
 * Implements flow of evidence with scalar multiplication
 * g(x) = p(x) / θ where θ > max positive evidence in system
 * 
 * This operator has:
 * - Right-distributivity: x ⊙ (y ⊕ z) = (x ⊙ y) ⊕ (x ⊙ z)
 * - Left-distributivity: (x ⊕ y) ⊙ z = (x ⊙ z) ⊕ (y ⊙ z)
 * - Associativity: x ⊙ (y ⊙ z) = (x ⊙ y) ⊙ z
 * 
 * @param {Opinion} x - Discounting opinion (trust in source)
 * @param {Opinion} y - Opinion to discount
 * @param {number} theta - Threshold (must be > max positive evidence)
 * @returns {Opinion} Discounted opinion
 */
export function ebslDiscount(x, y, theta = 100) {
  // Get positive evidence from x
  const { p: px } = opinionToEvidence(x);
  
  // Discounting factor g(x) = p(x) / θ
  const gx = px / theta;
  
  // Apply scalar multiplication: x ⊙ y = g(x) · y
  return scalarMultiply(gx, y);
}

/**
 * Generic EBSL Discounting operator (⊡) - Definition 12 from paper  
 * Uses custom function g(x) to determine discounting factor
 * Common choices: g(x) = belief(x) or g(x) = expectation(x)
 * 
 * @param {Opinion} x - Discounting opinion (trust in source)
 * @param {Opinion} y - Opinion to discount
 * @param {Function} gFunc - Function to compute discounting factor (default: use belief)
 * @returns {Opinion} Discounted opinion
 */
export function genericDiscount(x, y, gFunc = null) {
  // Default: use belief component as discounting factor
  const g = gFunc ? gFunc(x) : x.belief;
  
  // Clamp g to [0, 1]
  const gClamped = Math.max(0, Math.min(1, g));
  
  // Apply scalar multiplication: x ⊡ y = g(x) · y
  return scalarMultiply(gClamped, y);
}

/**
 * Old-style discount operation for comparison (traditional Subjective Logic)
 * This is the ⊗ operator from traditional SL, included for compatibility
 * Note: This operator lacks right-distributivity and can give counterintuitive results
 * 
 * @param {Opinion} x - Discounting opinion
 * @param {Opinion} y - Opinion to discount
 * @returns {Opinion} Discounted opinion
 */
export function discountOpinion(x, y) {
  const { belief: xb, disbelief: xd, uncertainty: xu } = x;
  const { belief: yb, disbelief: yd, uncertainty: yu } = y;
  
  return {
    belief: xb * yb,
    disbelief: xb * yd,
    uncertainty: xd + xu + xb * yu,
    baseRate: y.baseRate
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
 * Calculate transitive trust through a path using EBSL
 * For example: A -> B -> C means A's trust in C through B
 * Uses the EBSL discounting operator for evidence flow
 * 
 * @param {Array<Opinion>} pathOpinions - Array of opinions along the path
 * @param {string} discountMethod - 'ebsl' (⊙), 'generic' (⊡), or 'traditional' (⊗)
 * @param {number} theta - Threshold for EBSL discounting (if using 'ebsl')
 * @returns {Opinion} Transitive opinion
 */
export function calculateTransitiveTrust(pathOpinions, discountMethod = 'generic', theta = 100) {
  if (!pathOpinions || pathOpinions.length === 0) {
    return { belief: 0, disbelief: 0, uncertainty: 1, baseRate: 0.5 };
  }
  
  if (pathOpinions.length === 1) {
    return pathOpinions[0];
  }
  
  // Start with the last opinion in the path (the functional trust)
  let result = pathOpinions[pathOpinions.length - 1];
  
  // Discount backwards through the path
  // For path A -> B -> C, we compute: A ⊙ (B ⊙ C)
  for (let i = pathOpinions.length - 2; i >= 0; i--) {
    const discountingOpinion = pathOpinions[i];
    
    switch (discountMethod) {
      case 'ebsl':
        result = ebslDiscount(discountingOpinion, result, theta);
        break;
      case 'generic':
        result = genericDiscount(discountingOpinion, result);
        break;
      case 'traditional':
        result = discountOpinion(discountingOpinion, result);
        break;
      default:
        result = genericDiscount(discountingOpinion, result);
    }
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
 * Calculate reputation score for an address using EBSL
 * Combines direct attestations and transitive trust paths
 * 
 * Based on Section 6 from Škoric et al. (2016):
 * - Uses EBSL discounting for evidence flow
 * - Supports arbitrary trust networks with loops
 * - No need to discard information or transform to canonical form
 * - Avoids double-counting through right-distributivity
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
    discountMethod = 'generic', // 'ebsl', 'generic', or 'traditional'
    theta = 100, // Threshold for EBSL discounting
    minTrustLevel = 50 // Minimum trust level to consider for paths
  } = options;
  
  // Calculate direct reputation using consensus (⊕)
  const directOpinion = calculateDirectReputation(directAttestations);
  
  // If no observer specified, return direct reputation only
  if (!observerAddress) {
    const expectation = opinionToExpectation(directOpinion);
    return {
      score: expectation * 100, // Convert to 0-100 scale
      opinion: directOpinion,
      directCount: directAttestations.length,
      transitiveCount: 0,
      paths: [],
      method: 'direct-only'
    };
  }
  
  // Find transitive trust paths from observer to target
  const paths = findTrustPaths(
    observerAddress,
    address,
    attestationGraph,
    maxPathDepth
  ).slice(0, maxPaths); // Limit number of paths
  
  // Calculate transitive opinions from each path using EBSL
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
      
      pathOpinions.push(trustLevelToOpinion(attestation.trustLevel));
    }
    
    if (validPath && pathOpinions.length > 0) {
      // Use EBSL discounting for transitive trust
      const transitiveOpinion = calculateTransitiveTrust(pathOpinions, discountMethod, theta);
      transitiveOpinions.push(transitiveOpinion);
      pathDetails.push({
        path,
        opinion: transitiveOpinion,
        expectation: opinionToExpectation(transitiveOpinion)
      });
    }
  }
  
  // Combine direct and transitive opinions using consensus (⊕)
  // This is flow-based: we aggregate all available evidence
  let finalOpinion = directOpinion;
  
  // Fuse all transitive opinions
  for (const transitiveOpinion of transitiveOpinions) {
    finalOpinion = fuseOpinions(finalOpinion, transitiveOpinion);
  }
  
  const expectation = opinionToExpectation(finalOpinion);
  
  return {
    score: expectation * 100, // Convert to 0-100 scale
    opinion: finalOpinion,
    directCount: directAttestations.length,
    transitiveCount: transitiveOpinions.length,
    paths: pathDetails,
    method: discountMethod
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
