/**
 * IPFS utility module for storing and retrieving metadata
 * Uses Helia for browser-compatible IPFS access
 * Supports extensibility for future features like social graph and reputation system
 */

import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { json } from '@helia/json';

// IPFS configuration
const IPFS_CONFIG = {
  // Default public gateways for fetching
  gateways: [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/'
  ],
  // Gateway timeout
  timeout: 30000
};

// Singleton Helia node instance
let heliaNode = null;
let heliaFS = null;
let heliaJSON = null;
let initializationPromise = null;

/**
 * Initialize Helia IPFS node
 * @returns {Promise<Object>} Initialized Helia node
 */
export async function initializeIPFS() {
  // Return existing node if already initialized
  if (heliaNode) {
    return { node: heliaNode, fs: heliaFS, json: heliaJSON };
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('Initializing IPFS (Helia)...');
      heliaNode = await createHelia();
      heliaFS = unixfs(heliaNode);
      heliaJSON = json(heliaNode);
      console.log('✓ IPFS initialized successfully');
      return { node: heliaNode, fs: heliaFS, json: heliaJSON };
    } catch (error) {
      console.error('Failed to initialize IPFS:', error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Upload JSON metadata to IPFS
 * @param {Object} metadata - Metadata object to store
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Object containing CID and size
 */
export async function uploadMetadata(metadata, options = {}) {
  try {
    const { json: jsonAPI } = await initializeIPFS();
    
    // Validate metadata
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Invalid metadata: must be an object');
    }

    // Add timestamp if not present
    const metadataWithTimestamp = {
      ...metadata,
      uploadedAt: metadata.uploadedAt || new Date().toISOString(),
      version: metadata.version || '1.0.0'
    };

    console.log('Uploading metadata to IPFS...', metadataWithTimestamp);
    
    // Store JSON data
    const cid = await jsonAPI.add(metadataWithTimestamp);
    const cidString = cid.toString();

    console.log('✓ Metadata uploaded to IPFS:', cidString);

    return {
      cid: cidString,
      success: true,
      metadata: metadataWithTimestamp
    };
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    return {
      cid: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Retrieve JSON metadata from IPFS
 * @param {string} cidString - Content Identifier string
 * @param {Object} options - Retrieval options
 * @returns {Promise<Object>} Retrieved metadata
 */
export async function retrieveMetadata(cidString, options = {}) {
  if (!cidString) {
    throw new Error('CID is required');
  }

  try {
    const { json: jsonAPI } = await initializeIPFS();
    
    console.log('Retrieving metadata from IPFS:', cidString);
    
    // Parse CID string
    const { CID } = await import('multiformats/cid');
    const cid = CID.parse(cidString);
    
    // Retrieve JSON data
    const metadata = await jsonAPI.get(cid);

    console.log('✓ Metadata retrieved from IPFS:', cidString);

    return {
      success: true,
      metadata,
      cid: cidString
    };
  } catch (error) {
    console.error('Error retrieving metadata from IPFS:', error);
    
    // Fallback to gateway fetch if Helia fails
    try {
      console.log('Attempting gateway fallback...');
      const metadata = await fetchFromGateway(cidString);
      return {
        success: true,
        metadata,
        cid: cidString,
        source: 'gateway'
      };
    } catch (gatewayError) {
      console.error('Gateway fallback failed:', gatewayError);
      return {
        success: false,
        error: error.message,
        cid: cidString
      };
    }
  }
}

/**
 * Fetch content from IPFS gateway (fallback)
 * @param {string} cidString - Content Identifier
 * @returns {Promise<Object>} Retrieved content
 */
async function fetchFromGateway(cidString) {
  const gateways = IPFS_CONFIG.gateways;
  let lastError;

  for (const gateway of gateways) {
    try {
      const url = `${gateway}${cidString}`;
      console.log(`Trying gateway: ${gateway}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), IPFS_CONFIG.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Retrieved from gateway: ${gateway}`);
        return data;
      }
    } catch (error) {
      lastError = error;
      console.warn(`Gateway ${gateway} failed:`, error.message);
    }
  }

  throw new Error(`All gateways failed. Last error: ${lastError?.message}`);
}

/**
 * Upload file/blob to IPFS
 * @param {Blob|File|Uint8Array} content - Content to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Object containing CID
 */
export async function uploadFile(content, options = {}) {
  try {
    const { fs } = await initializeIPFS();

    console.log('Uploading file to IPFS...');

    // Convert to Uint8Array if needed
    let bytes;
    if (content instanceof Blob || content instanceof File) {
      const arrayBuffer = await content.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
    } else if (content instanceof Uint8Array) {
      bytes = content;
    } else {
      throw new Error('Invalid content type. Must be Blob, File, or Uint8Array');
    }

    // Add file to IPFS
    const cid = await fs.addBytes(bytes);
    const cidString = cid.toString();

    console.log('✓ File uploaded to IPFS:', cidString);

    return {
      cid: cidString,
      success: true,
      size: bytes.length
    };
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    return {
      cid: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Retrieve file from IPFS
 * @param {string} cidString - Content Identifier
 * @returns {Promise<Object>} Retrieved file data
 */
export async function retrieveFile(cidString) {
  if (!cidString) {
    throw new Error('CID is required');
  }

  try {
    const { fs } = await initializeIPFS();
    
    console.log('Retrieving file from IPFS:', cidString);
    
    // Parse CID
    const { CID } = await import('multiformats/cid');
    const cid = CID.parse(cidString);

    // Retrieve bytes
    const chunks = [];
    for await (const chunk of fs.cat(cid)) {
      chunks.push(chunk);
    }

    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    console.log('✓ File retrieved from IPFS:', cidString);

    return {
      success: true,
      data: result,
      cid: cidString,
      size: result.length
    };
  } catch (error) {
    console.error('Error retrieving file from IPFS:', error);
    return {
      success: false,
      error: error.message,
      cid: cidString
    };
  }
}

/**
 * Pin content on IPFS node
 * Note: This pins locally. For remote pinning services (Pinata, Infura, etc.),
 * separate integration would be needed.
 * @param {string} cidString - Content Identifier to pin
 * @returns {Promise<Object>} Pin result
 */
export async function pinContent(cidString) {
  try {
    const { node } = await initializeIPFS();
    
    console.log('Pinning content:', cidString);
    
    const { CID } = await import('multiformats/cid');
    const cid = CID.parse(cidString);

    await node.pins.add(cid);

    console.log('✓ Content pinned:', cidString);

    return {
      success: true,
      cid: cidString,
      pinned: true
    };
  } catch (error) {
    console.error('Error pinning content:', error);
    return {
      success: false,
      error: error.message,
      cid: cidString
    };
  }
}

/**
 * Unpin content from IPFS node
 * @param {string} cidString - Content Identifier to unpin
 * @returns {Promise<Object>} Unpin result
 */
export async function unpinContent(cidString) {
  try {
    const { node } = await initializeIPFS();
    
    console.log('Unpinning content:', cidString);
    
    const { CID } = await import('multiformats/cid');
    const cid = CID.parse(cidString);

    await node.pins.rm(cid);

    console.log('✓ Content unpinned:', cidString);

    return {
      success: true,
      cid: cidString,
      pinned: false
    };
  } catch (error) {
    console.error('Error unpinning content:', error);
    return {
      success: false,
      error: error.message,
      cid: cidString
    };
  }
}

/**
 * Get list of pinned content
 * @returns {Promise<Array>} List of pinned CIDs
 */
export async function listPinnedContent() {
  try {
    const { node } = await initializeIPFS();
    
    const pins = [];
    for await (const { cid } of node.pins.ls()) {
      pins.push(cid.toString());
    }

    return {
      success: true,
      pins
    };
  } catch (error) {
    console.error('Error listing pinned content:', error);
    return {
      success: false,
      error: error.message,
      pins: []
    };
  }
}

/**
 * Stop IPFS node
 */
export async function stopIPFS() {
  if (heliaNode) {
    try {
      console.log('Stopping IPFS node...');
      await heliaNode.stop();
      heliaNode = null;
      heliaFS = null;
      heliaJSON = null;
      initializationPromise = null;
      console.log('✓ IPFS node stopped');
    } catch (error) {
      console.error('Error stopping IPFS node:', error);
    }
  }
}

/**
 * Generic storage interface for extensibility
 * This can be used for future features like social graph, reputation system, etc.
 */
export class IPFSStorage {
  /**
   * Store arbitrary data
   * @param {string} dataType - Type of data (e.g., 'profile', 'social-graph', 'reputation')
   * @param {Object} data - Data to store
   * @returns {Promise<Object>} Storage result with CID
   */
  async store(dataType, data) {
    const wrappedData = {
      dataType,
      data,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    return await uploadMetadata(wrappedData);
  }

  /**
   * Retrieve arbitrary data
   * @param {string} cidString - Content Identifier
   * @returns {Promise<Object>} Retrieved data
   */
  async retrieve(cidString) {
    const result = await retrieveMetadata(cidString);
    
    if (result.success && result.metadata) {
      return {
        success: true,
        dataType: result.metadata.dataType,
        data: result.metadata.data,
        timestamp: result.metadata.timestamp,
        cid: cidString
      };
    }

    return result;
  }

  /**
   * Pin data for persistence
   * @param {string} cidString - Content Identifier
   * @returns {Promise<Object>} Pin result
   */
  async pin(cidString) {
    return await pinContent(cidString);
  }

  /**
   * Unpin data
   * @param {string} cidString - Content Identifier
   * @returns {Promise<Object>} Unpin result
   */
  async unpin(cidString) {
    return await unpinContent(cidString);
  }
}

// Export singleton instance for convenient access
export const ipfsStorage = new IPFSStorage();

/**
 * DID-based IPFS routing system
 * Links DIDs to IPFS content for decentralized content discovery
 */
export class DIDIPFSRouter {
  constructor() {
    // In-memory cache for DID -> CID mappings
    // In production, this could be stored on-chain or in a DHT
    this.didToCIDCache = new Map();
  }

  /**
   * Store content with DID association
   * @param {string} did - Decentralized Identifier (e.g., "did:ethr:0x...")
   * @param {Object} content - Content to store
   * @param {Object} options - Storage options
   * @returns {Promise<Object>} Storage result with CID and DID
   */
  async storeWithDID(did, content, options = {}) {
    if (!did || !did.startsWith('did:')) {
      throw new Error('Invalid DID format. Must start with "did:"');
    }

    try {
      // Add DID to content metadata
      const enrichedContent = {
        ...content,
        did,
        didLinkedAt: new Date().toISOString(),
        contentType: options.contentType || 'metadata',
        version: '1.0.0'
      };

      // Upload to IPFS
      const result = await uploadMetadata(enrichedContent);

      if (result.success) {
        // Cache the DID -> CID mapping
        this.didToCIDCache.set(did, {
          cid: result.cid,
          timestamp: new Date().toISOString(),
          contentType: enrichedContent.contentType
        });

        console.log(`✓ Content stored with DID routing: ${did} -> ${result.cid}`);

        return {
          success: true,
          did,
          cid: result.cid,
          content: enrichedContent
        };
      }

      return result;
    } catch (error) {
      console.error('Error storing content with DID:', error);
      return {
        success: false,
        error: error.message,
        did
      };
    }
  }

  /**
   * Retrieve content by DID
   * @param {string} did - Decentralized Identifier
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} Retrieved content
   */
  async retrieveByDID(did, options = {}) {
    if (!did || !did.startsWith('did:')) {
      throw new Error('Invalid DID format. Must start with "did:"');
    }

    try {
      // Check cache first
      const cached = this.didToCIDCache.get(did);
      
      if (cached && !options.skipCache) {
        console.log(`Using cached CID for DID: ${did} -> ${cached.cid}`);
        const result = await retrieveMetadata(cached.cid);
        
        if (result.success) {
          return {
            ...result,
            did,
            source: 'cache'
          };
        }
      }

      // If cache miss or failed, need to resolve DID to CID
      // This would typically query the smart contract or DHT
      console.warn(`No cached CID for DID: ${did}. Need to resolve from chain.`);
      
      return {
        success: false,
        error: 'DID not found in cache. Use resolveDIDFromChain first.',
        did
      };
    } catch (error) {
      console.error('Error retrieving content by DID:', error);
      return {
        success: false,
        error: error.message,
        did
      };
    }
  }

  /**
   * Register DID -> CID mapping (from chain data)
   * @param {string} did - Decentralized Identifier
   * @param {string} cid - Content Identifier
   * @param {Object} metadata - Optional metadata
   */
  registerDIDMapping(did, cid, metadata = {}) {
    if (!did || !cid) {
      throw new Error('Both DID and CID are required');
    }

    this.didToCIDCache.set(did, {
      cid,
      timestamp: metadata.timestamp || new Date().toISOString(),
      contentType: metadata.contentType || 'metadata',
      ...metadata
    });

    console.log(`✓ Registered DID mapping: ${did} -> ${cid}`);
  }

  /**
   * Get CID for a DID (synchronous, cache only)
   * @param {string} did - Decentralized Identifier
   * @returns {Object|null} Cached mapping or null
   */
  getCIDForDID(did) {
    return this.didToCIDCache.get(did) || null;
  }

  /**
   * Clear DID -> CID cache
   */
  clearCache() {
    this.didToCIDCache.clear();
    console.log('✓ DID routing cache cleared');
  }

  /**
   * Get all cached DID mappings
   * @returns {Array} Array of DID mappings
   */
  getAllMappings() {
    return Array.from(this.didToCIDCache.entries()).map(([did, data]) => ({
      did,
      ...data
    }));
  }

  /**
   * Export cache for persistence
   * @returns {Object} Serializable cache object
   */
  exportCache() {
    return {
      mappings: this.getAllMappings(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Import cache from saved data
   * @param {Object} cacheData - Cache data to import
   */
  importCache(cacheData) {
    if (!cacheData || !cacheData.mappings) {
      throw new Error('Invalid cache data');
    }

    this.didToCIDCache.clear();
    
    for (const mapping of cacheData.mappings) {
      const { did, cid, ...metadata } = mapping;
      this.registerDIDMapping(did, cid, metadata);
    }

    console.log(`✓ Imported ${cacheData.mappings.length} DID mappings`);
  }
}

// Export singleton instance
export const didIPFSRouter = new DIDIPFSRouter();

/**
 * Helper function to create DID from Ethereum address
 * @param {string} address - Ethereum address
 * @returns {string} DID string
 */
export function createDIDFromAddress(address) {
  if (!address || !address.startsWith('0x')) {
    throw new Error('Invalid Ethereum address');
  }
  return `did:ethr:${address.toLowerCase()}`;
}

/**
 * Helper function to extract address from DID
 * @param {string} did - DID string
 * @returns {string|null} Ethereum address or null
 */
export function extractAddressFromDID(did) {
  if (!did || !did.startsWith('did:ethr:')) {
    return null;
  }
  const address = did.replace('did:ethr:', '');
  return address.startsWith('0x') ? address : `0x${address}`;
}
