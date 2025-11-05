/**
 * IPFS Store for managing IPFS state
 * Tracks connection status, pinned content, and upload/download operations
 */

import { writable, derived } from 'svelte/store';
import {
  initializeIPFS,
  uploadMetadata,
  retrieveMetadata,
  uploadFile,
  retrieveFile,
  pinContent,
  unpinContent,
  listPinnedContent,
  stopIPFS,
  ipfsStorage,
  didIPFSRouter,
  createDIDFromAddress,
  extractAddressFromDID
} from '../utils/ipfs';

function createIPFSStore() {
  const { subscribe, set, update } = writable({
    initialized: false,
    initializing: false,
    connected: false,
    error: null,
    
    // Pinned content tracking
    pinnedContent: [],
    
    // Operation tracking
    uploads: {}, // { [operationId]: { status, progress, cid, error } }
    downloads: {}, // { [operationId]: { status, progress, data, error } }
    
    // Cache for retrieved metadata
    metadataCache: {}, // { [cid]: metadata }
    
    // Statistics
    stats: {
      totalUploads: 0,
      totalDownloads: 0,
      totalBytesUploaded: 0,
      totalBytesDownloaded: 0
    }
  });

  return {
    subscribe,
    
    /**
     * Initialize IPFS connection
     */
    initialize: async () => {
      update(store => ({ ...store, initializing: true, error: null }));
      
      try {
        await initializeIPFS();
        
        // Get list of pinned content
        const { success, pins } = await listPinnedContent();
        
        update(store => ({
          ...store,
          initialized: true,
          initializing: false,
          connected: true,
          pinnedContent: success ? pins : []
        }));
        
        return { success: true };
      } catch (error) {
        console.error('IPFS initialization failed:', error);
        update(store => ({
          ...store,
          initialized: false,
          initializing: false,
          connected: false,
          error: error.message
        }));
        
        return { success: false, error: error.message };
      }
    },

    /**
     * Upload metadata to IPFS
     * @param {Object} metadata - Metadata to upload
     * @param {string} operationId - Unique operation identifier
     */
    uploadMetadata: async (metadata, operationId = null) => {
      const opId = operationId || `upload-${Date.now()}`;
      
      // Track upload operation
      update(store => ({
        ...store,
        uploads: {
          ...store.uploads,
          [opId]: { status: 'uploading', progress: 0, cid: null, error: null }
        }
      }));

      try {
        const result = await uploadMetadata(metadata);
        
        if (result.success) {
          update(store => ({
            ...store,
            uploads: {
              ...store.uploads,
              [opId]: { status: 'completed', progress: 100, cid: result.cid, error: null }
            },
            metadataCache: {
              ...store.metadataCache,
              [result.cid]: result.metadata
            },
            stats: {
              ...store.stats,
              totalUploads: store.stats.totalUploads + 1
            }
          }));
          
          return { success: true, cid: result.cid, operationId: opId };
        } else {
          update(store => ({
            ...store,
            uploads: {
              ...store.uploads,
              [opId]: { status: 'failed', progress: 0, cid: null, error: result.error }
            }
          }));
          
          return { success: false, error: result.error, operationId: opId };
        }
      } catch (error) {
        console.error('Upload failed:', error);
        
        update(store => ({
          ...store,
          uploads: {
            ...store.uploads,
            [opId]: { status: 'failed', progress: 0, cid: null, error: error.message }
          }
        }));
        
        return { success: false, error: error.message, operationId: opId };
      }
    },

    /**
     * Retrieve metadata from IPFS
     * @param {string} cid - Content Identifier
     * @param {string} operationId - Unique operation identifier
     * @param {boolean} useCache - Whether to use cached data if available
     */
    retrieveMetadata: async (cid, operationId = null, useCache = true) => {
      const opId = operationId || `download-${Date.now()}`;
      
      // Check cache first
      let cachedData = null;
      update(store => {
        if (useCache && store.metadataCache[cid]) {
          cachedData = store.metadataCache[cid];
        }
        return store;
      });

      if (cachedData) {
        console.log('Using cached metadata:', cid);
        return { success: true, metadata: cachedData, cid, source: 'cache' };
      }

      // Track download operation
      update(store => ({
        ...store,
        downloads: {
          ...store.downloads,
          [opId]: { status: 'downloading', progress: 0, data: null, error: null }
        }
      }));

      try {
        const result = await retrieveMetadata(cid);
        
        if (result.success) {
          update(store => ({
            ...store,
            downloads: {
              ...store.downloads,
              [opId]: { status: 'completed', progress: 100, data: result.metadata, error: null }
            },
            metadataCache: {
              ...store.metadataCache,
              [cid]: result.metadata
            },
            stats: {
              ...store.stats,
              totalDownloads: store.stats.totalDownloads + 1
            }
          }));
          
          return { success: true, metadata: result.metadata, cid, operationId: opId, source: result.source };
        } else {
          update(store => ({
            ...store,
            downloads: {
              ...store.downloads,
              [opId]: { status: 'failed', progress: 0, data: null, error: result.error }
            }
          }));
          
          return { success: false, error: result.error, cid, operationId: opId };
        }
      } catch (error) {
        console.error('Download failed:', error);
        
        update(store => ({
          ...store,
          downloads: {
            ...store.downloads,
            [opId]: { status: 'failed', progress: 0, data: null, error: error.message }
          }
        }));
        
        return { success: false, error: error.message, cid, operationId: opId };
      }
    },

    /**
     * Upload file to IPFS
     * @param {File|Blob|Uint8Array} file - File to upload
     * @param {string} operationId - Unique operation identifier
     */
    uploadFile: async (file, operationId = null) => {
      const opId = operationId || `upload-file-${Date.now()}`;
      
      update(store => ({
        ...store,
        uploads: {
          ...store.uploads,
          [opId]: { status: 'uploading', progress: 0, cid: null, error: null }
        }
      }));

      try {
        const result = await uploadFile(file);
        
        if (result.success) {
          update(store => ({
            ...store,
            uploads: {
              ...store.uploads,
              [opId]: { status: 'completed', progress: 100, cid: result.cid, error: null }
            },
            stats: {
              ...store.stats,
              totalUploads: store.stats.totalUploads + 1,
              totalBytesUploaded: store.stats.totalBytesUploaded + (result.size || 0)
            }
          }));
          
          return { success: true, cid: result.cid, size: result.size, operationId: opId };
        } else {
          update(store => ({
            ...store,
            uploads: {
              ...store.uploads,
              [opId]: { status: 'failed', progress: 0, cid: null, error: result.error }
            }
          }));
          
          return { success: false, error: result.error, operationId: opId };
        }
      } catch (error) {
        console.error('File upload failed:', error);
        
        update(store => ({
          ...store,
          uploads: {
            ...store.uploads,
            [opId]: { status: 'failed', progress: 0, cid: null, error: error.message }
          }
        }));
        
        return { success: false, error: error.message, operationId: opId };
      }
    },

    /**
     * Pin content for persistence
     * @param {string} cid - Content Identifier to pin
     */
    pin: async (cid) => {
      try {
        const result = await pinContent(cid);
        
        if (result.success) {
          update(store => ({
            ...store,
            pinnedContent: [...new Set([...store.pinnedContent, cid])]
          }));
        }
        
        return result;
      } catch (error) {
        console.error('Pin failed:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Unpin content
     * @param {string} cid - Content Identifier to unpin
     */
    unpin: async (cid) => {
      try {
        const result = await unpinContent(cid);
        
        if (result.success) {
          update(store => ({
            ...store,
            pinnedContent: store.pinnedContent.filter(c => c !== cid)
          }));
        }
        
        return result;
      } catch (error) {
        console.error('Unpin failed:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Refresh pinned content list
     */
    refreshPinnedContent: async () => {
      try {
        const { success, pins } = await listPinnedContent();
        
        if (success) {
          update(store => ({
            ...store,
            pinnedContent: pins
          }));
        }
        
        return { success, pins };
      } catch (error) {
        console.error('Failed to refresh pinned content:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Clear operation history
     * @param {string} type - 'uploads' or 'downloads' or 'all'
     */
    clearOperations: (type = 'all') => {
      update(store => {
        const updates = {};
        
        if (type === 'uploads' || type === 'all') {
          updates.uploads = {};
        }
        
        if (type === 'downloads' || type === 'all') {
          updates.downloads = {};
        }
        
        return { ...store, ...updates };
      });
    },

    /**
     * Clear metadata cache
     */
    clearCache: () => {
      update(store => ({
        ...store,
        metadataCache: {}
      }));
    },

    /**
     * Stop IPFS node
     */
    stop: async () => {
      try {
        await stopIPFS();
        
        set({
          initialized: false,
          initializing: false,
          connected: false,
          error: null,
          pinnedContent: [],
          uploads: {},
          downloads: {},
          metadataCache: {},
          stats: {
            totalUploads: 0,
            totalDownloads: 0,
            totalBytesUploaded: 0,
            totalBytesDownloaded: 0
          }
        });
        
        return { success: true };
      } catch (error) {
        console.error('Failed to stop IPFS:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Get IPFSStorage instance for extensible storage
     */
    getStorage: () => {
      return ipfsStorage;
    },

    /**
     * Store content with DID association
     * @param {string} did - Decentralized Identifier
     * @param {Object} content - Content to store
     * @param {Object} options - Storage options
     */
    storeWithDID: async (did, content, options = {}) => {
      const opId = options.operationId || `did-upload-${Date.now()}`;
      
      update(store => ({
        ...store,
        uploads: {
          ...store.uploads,
          [opId]: { status: 'uploading', progress: 0, cid: null, error: null, did }
        }
      }));

      try {
        const result = await didIPFSRouter.storeWithDID(did, content, options);
        
        if (result.success) {
          update(store => ({
            ...store,
            uploads: {
              ...store.uploads,
              [opId]: { status: 'completed', progress: 100, cid: result.cid, error: null, did }
            },
            metadataCache: {
              ...store.metadataCache,
              [result.cid]: result.content
            },
            stats: {
              ...store.stats,
              totalUploads: store.stats.totalUploads + 1
            }
          }));
          
          return { success: true, cid: result.cid, did, operationId: opId };
        } else {
          update(store => ({
            ...store,
            uploads: {
              ...store.uploads,
              [opId]: { status: 'failed', progress: 0, cid: null, error: result.error, did }
            }
          }));
          
          return { success: false, error: result.error, did, operationId: opId };
        }
      } catch (error) {
        console.error('DID storage failed:', error);
        
        update(store => ({
          ...store,
          uploads: {
            ...store.uploads,
            [opId]: { status: 'failed', progress: 0, cid: null, error: error.message, did }
          }
        }));
        
        return { success: false, error: error.message, did, operationId: opId };
      }
    },

    /**
     * Retrieve content by DID
     * @param {string} did - Decentralized Identifier
     * @param {Object} options - Retrieval options
     */
    retrieveByDID: async (did, options = {}) => {
      const opId = options.operationId || `did-download-${Date.now()}`;
      
      update(store => ({
        ...store,
        downloads: {
          ...store.downloads,
          [opId]: { status: 'downloading', progress: 0, data: null, error: null, did }
        }
      }));

      try {
        const result = await didIPFSRouter.retrieveByDID(did, options);
        
        if (result.success) {
          update(store => ({
            ...store,
            downloads: {
              ...store.downloads,
              [opId]: { status: 'completed', progress: 100, data: result.metadata, error: null, did }
            },
            metadataCache: {
              ...store.metadataCache,
              [result.cid]: result.metadata
            },
            stats: {
              ...store.stats,
              totalDownloads: store.stats.totalDownloads + 1
            }
          }));
          
          return { success: true, metadata: result.metadata, cid: result.cid, did, operationId: opId };
        } else {
          update(store => ({
            ...store,
            downloads: {
              ...store.downloads,
              [opId]: { status: 'failed', progress: 0, data: null, error: result.error, did }
            }
          }));
          
          return { success: false, error: result.error, did, operationId: opId };
        }
      } catch (error) {
        console.error('DID retrieval failed:', error);
        
        update(store => ({
          ...store,
          downloads: {
            ...store.downloads,
            [opId]: { status: 'failed', progress: 0, data: null, error: error.message, did }
          }
        }));
        
        return { success: false, error: error.message, did, operationId: opId };
      }
    },

    /**
     * Register DID -> CID mapping (from chain data)
     * @param {string} did - Decentralized Identifier
     * @param {string} cid - Content Identifier
     * @param {Object} metadata - Optional metadata
     */
    registerDIDMapping: (did, cid, metadata = {}) => {
      try {
        didIPFSRouter.registerDIDMapping(did, cid, metadata);
        return { success: true, did, cid };
      } catch (error) {
        console.error('Failed to register DID mapping:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Get CID for a DID
     * @param {string} did - Decentralized Identifier
     */
    getCIDForDID: (did) => {
      return didIPFSRouter.getCIDForDID(did);
    },

    /**
     * Create DID from Ethereum address
     * @param {string} address - Ethereum address
     */
    createDID: (address) => {
      try {
        return { success: true, did: createDIDFromAddress(address) };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    /**
     * Extract address from DID
     * @param {string} did - DID string
     */
    extractAddress: (did) => {
      const address = extractAddressFromDID(did);
      if (address) {
        return { success: true, address };
      }
      return { success: false, error: 'Invalid DID format' };
    },

    /**
     * Get all DID mappings
     */
    getAllDIDMappings: () => {
      return didIPFSRouter.getAllMappings();
    }
  };
}

export const ipfsStore = createIPFSStore();

// Derived store for IPFS status
export const ipfsStatus = derived(
  ipfsStore,
  $ipfsStore => ({
    ready: $ipfsStore.initialized && $ipfsStore.connected,
    initializing: $ipfsStore.initializing,
    error: $ipfsStore.error
  })
);

// Derived store for active operations
export const activeOperations = derived(
  ipfsStore,
  $ipfsStore => {
    const activeUploads = Object.entries($ipfsStore.uploads)
      .filter(([_, op]) => op.status === 'uploading')
      .length;
    
    const activeDownloads = Object.entries($ipfsStore.downloads)
      .filter(([_, op]) => op.status === 'downloading')
      .length;
    
    return {
      uploads: activeUploads,
      downloads: activeDownloads,
      total: activeUploads + activeDownloads
    };
  }
);
