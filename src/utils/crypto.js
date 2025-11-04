import { ethers } from 'ethers';

/**
 * Sign a message with the user's wallet
 * @param {string} message - Message to sign
 * @param {object} signer - Ethers signer instance
 * @returns {Promise<string>} Signature
 */
export async function signMessage(message, signer) {
  try {
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}

/**
 * Verify a signed message
 * @param {string} message - Original message
 * @param {string} signature - Signature to verify
 * @param {string} expectedAddress - Expected signer address
 * @returns {boolean} True if signature is valid
 */
export function verifySignature(message, signature, expectedAddress) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Create a message hash for signing
 * @param {object} data - Data to hash
 * @returns {string} Message hash
 */
export function createMessageHash(data) {
  const message = JSON.stringify(data);
  return ethers.id(message);
}

/**
 * Format address for display
 * @param {string} address - Ethereum address
 * @param {number} prefixLength - Length of prefix (default 6)
 * @param {number} suffixLength - Length of suffix (default 4)
 * @returns {string} Formatted address
 */
export function formatAddress(address, prefixLength = 6, suffixLength = 4) {
  if (!address) return '';
  return `${address.substring(0, prefixLength)}...${address.substring(address.length - suffixLength)}`;
}

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
export function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Convert timestamp to relative time
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Relative time string
 */
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
}
