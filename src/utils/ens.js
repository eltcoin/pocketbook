/**
 * ENS (Ethereum Name Service) utility functions
 * Provides ENS name resolution and reverse lookup capabilities
 */

import { ethers } from 'ethers';

/**
 * Resolve an ENS name to an Ethereum address
 * @param {string} ensName - The ENS name to resolve (e.g., "vitalik.eth")
 * @param {object} provider - Ethers provider instance
 * @returns {Promise<string|null>} The resolved address or null if not found
 */
export async function resolveENSName(ensName, provider) {
  if (!ensName || !provider) {
    return null;
  }

  try {
    // Check if the input is actually an ENS name (ends with .eth or contains a dot)
    if (!ensName.includes('.')) {
      return null;
    }

    // Use ethers.js built-in ENS resolution
    const address = await provider.resolveName(ensName);
    return address;
  } catch (error) {
    console.error('ENS resolution error:', error);
    return null;
  }
}

/**
 * Perform reverse ENS lookup to get the name for an address
 * @param {string} address - The Ethereum address
 * @param {object} provider - Ethers provider instance
 * @returns {Promise<string|null>} The ENS name or null if not found
 */
export async function lookupENSName(address, provider) {
  if (!address || !provider) {
    return null;
  }

  try {
    // Validate address format
    if (!ethers.isAddress(address)) {
      return null;
    }

    // Use ethers.js built-in reverse lookup
    const ensName = await provider.lookupAddress(address);
    return ensName;
  } catch (error) {
    console.error('ENS lookup error:', error);
    return null;
  }
}

/**
 * Check if a string is a valid ENS name format
 * @param {string} input - The input string to check
 * @returns {boolean} True if it looks like an ENS name
 */
export function isENSName(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // ENS names must contain at least one dot and end with a valid TLD
  // Common TLD is .eth but ENS supports others
  const ensPattern = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
  return ensPattern.test(input.trim());
}

/**
 * Normalize an ENS name (lowercase, trim whitespace)
 * @param {string} ensName - The ENS name to normalize
 * @returns {string} Normalized ENS name
 */
export function normalizeENSName(ensName) {
  if (!ensName || typeof ensName !== 'string') {
    return '';
  }

  return ensName.trim().toLowerCase();
}

/**
 * Check if the provider supports ENS (must be on mainnet or a supported network)
 * @param {object} provider - Ethers provider instance
 * @returns {Promise<boolean>} True if ENS is supported on this network
 */
export async function isENSSupported(provider) {
  if (!provider) {
    return false;
  }

  try {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // ENS is primarily supported on Ethereum mainnet (chainId 1)
    // It's also available on some testnets like Sepolia (11155111), Goerli (5)
    const supportedChainIds = [1, 5, 11155111]; // Mainnet, Goerli, Sepolia
    
    return supportedChainIds.includes(chainId);
  } catch (error) {
    console.error('Error checking ENS support:', error);
    return false;
  }
}

/**
 * Get ENS avatar URL for an address or ENS name
 * @param {string} nameOrAddress - ENS name or Ethereum address
 * @param {object} provider - Ethers provider instance
 * @returns {Promise<string|null>} Avatar URL or null if not found
 */
export async function getENSAvatar(nameOrAddress, provider) {
  if (!nameOrAddress || !provider) {
    return null;
  }

  try {
    // If it's an address, first lookup the ENS name
    let ensName = nameOrAddress;
    if (ethers.isAddress(nameOrAddress)) {
      ensName = await lookupENSName(nameOrAddress, provider);
      if (!ensName) {
        return null;
      }
    }

    // Get the avatar for the ENS name
    const resolver = await provider.getResolver(ensName);
    if (!resolver) {
      return null;
    }

    const avatar = await resolver.getAvatar();
    return avatar ? avatar.url : null;
  } catch (error) {
    console.error('ENS avatar lookup error:', error);
    return null;
  }
}

/**
 * Get ENS text records for a name
 * @param {string} ensName - ENS name
 * @param {object} provider - Ethers provider instance
 * @param {string} key - Text record key (e.g., 'url', 'email', 'description')
 * @returns {Promise<string|null>} Text record value or null
 */
export async function getENSTextRecord(ensName, provider, key) {
  if (!ensName || !provider || !key) {
    return null;
  }

  try {
    const resolver = await provider.getResolver(ensName);
    if (!resolver) {
      return null;
    }

    const value = await resolver.getText(key);
    return value || null;
  } catch (error) {
    console.error(`ENS text record lookup error for key "${key}":`, error);
    return null;
  }
}

/**
 * Resolve an input that could be either an ENS name or address
 * @param {string} input - ENS name or Ethereum address
 * @param {object} provider - Ethers provider instance
 * @returns {Promise<{address: string|null, ensName: string|null}>} Resolution result
 */
export async function resolveAddressOrENS(input, provider) {
  if (!input || !provider) {
    return { address: null, ensName: null };
  }

  const trimmedInput = input.trim();

  // Check if it's already a valid address
  if (ethers.isAddress(trimmedInput)) {
    // It's an address, try reverse lookup for ENS name
    const ensName = await lookupENSName(trimmedInput, provider);
    return { address: trimmedInput, ensName };
  }

  // Check if it looks like an ENS name
  if (isENSName(trimmedInput)) {
    const normalizedName = normalizeENSName(trimmedInput);
    const address = await resolveENSName(normalizedName, provider);
    return { address, ensName: address ? normalizedName : null };
  }

  // Neither a valid address nor ENS name
  return { address: null, ensName: null };
}
