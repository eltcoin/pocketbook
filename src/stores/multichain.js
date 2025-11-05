import { writable, derived } from 'svelte/store';
import { ethers } from 'ethers';
import { getSupportedNetworks, getNetworkByChainId } from '../config/networks';

/**
 * Multi-chain store for simultaneous blockchain connections
 * Maintains separate providers for each configured network
 */
function createMultiChainStore() {
  const { subscribe, set, update } = writable({
    // Primary wallet connection (from MetaMask)
    primaryAddress: null,
    primaryChainId: null,
    primarySigner: null,
    connected: false,
    
    // Multi-chain providers and contracts
    chains: {}, // { chainId: { provider, contract, networkConfig, isAvailable } }
    
    // Track which chains have been initialized
    initializedChains: []
  });

  // Contract ABI
  const contractABI = [
    "function claimAddress(address _address, bytes memory _signature, string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, bool _isPrivate) public",
    "function updateMetadata(string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, bool _isPrivate) public",
    "function getClaim(address _address) public view returns (address claimant, string memory name, string memory avatar, string memory bio, string memory website, string memory twitter, string memory github, uint256 claimTime, bool isActive, bool isPrivate)",
    "function isClaimed(address) public view returns (bool)",
    "function addViewer(address _viewer) public",
    "function removeViewer(address _viewer) public",
    "function revokeClaim() public",
    "event AddressClaimed(address indexed claimedAddress, address indexed claimant, uint256 timestamp)",
    "event MetadataUpdated(address indexed claimedAddress, uint256 timestamp)"
  ];

  // Event handlers
  let accountsChangedHandler = null;
  let chainChangedHandler = null;

  /**
   * Initialize providers for all supported networks
   */
  async function initializeChains() {
    const networks = getSupportedNetworks();
    const chains = {};

    for (const network of networks) {
      try {
        // Only initialize if contract address is configured
        if (!network.contractAddress || network.contractAddress === "0x0000000000000000000000000000000000000000") {
          console.log(`Skipping ${network.name}: No contract address configured`);
          chains[network.chainId] = {
            provider: null,
            contract: null,
            networkConfig: network,
            isAvailable: false
          };
          continue;
        }

        // Create provider for this network using public RPC
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        
        // Create read-only contract instance
        const contract = new ethers.Contract(
          network.contractAddress,
          contractABI,
          provider
        );

        // Test if the network is accessible
        try {
          await provider.getBlockNumber();
          chains[network.chainId] = {
            provider,
            contract,
            networkConfig: network,
            isAvailable: true
          };
          console.log(`✓ Initialized ${network.name} (Chain ID: ${network.chainId})`);
        } catch (err) {
          console.warn(`⚠ ${network.name} provider not accessible:`, err.message);
          chains[network.chainId] = {
            provider: null,
            contract: null,
            networkConfig: network,
            isAvailable: false
          };
        }
      } catch (error) {
        console.error(`Failed to initialize ${network.name}:`, error);
        chains[network.chainId] = {
          provider: null,
          contract: null,
          networkConfig: network,
          isAvailable: false
        };
      }
    }

    return chains;
  }

  return {
    subscribe,
    
    /**
     * Connect wallet and initialize all chain providers
     */
    connect: async () => {
      try {
        if (typeof window.ethereum === 'undefined') {
          return { success: false, error: 'MetaMask not installed' };
        }

        // Connect to user's wallet
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        const signer = await browserProvider.getSigner();
        const address = accounts[0];
        const network = await browserProvider.getNetwork();
        const chainId = Number(network.chainId);

        // Initialize all chain providers
        console.log('Initializing multi-chain providers...');
        const chains = await initializeChains();
        
        // Update the primary chain with signer
        if (chains[chainId]) {
          const networkConfig = getNetworkByChainId(chainId);
          const contractAddress = networkConfig?.contractAddress;
          
          if (contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000") {
            chains[chainId].contract = new ethers.Contract(
              contractAddress,
              contractABI,
              signer
            );
            chains[chainId].signer = signer;
          }
        }

        update(store => ({
          ...store,
          primaryAddress: address,
          primaryChainId: chainId,
          primarySigner: signer,
          connected: true,
          chains,
          initializedChains: Object.keys(chains).map(Number)
        }));

        // Setup event listeners
        if (accountsChangedHandler) {
          window.ethereum.removeListener('accountsChanged', accountsChangedHandler);
        }
        if (chainChangedHandler) {
          window.ethereum.removeListener('chainChanged', chainChangedHandler);
        }

        accountsChangedHandler = (accounts) => {
          if (accounts.length === 0) {
            multiChainStore.disconnect();
          } else {
            multiChainStore.connect();
          }
        };
        window.ethereum.on('accountsChanged', accountsChangedHandler);

        chainChangedHandler = () => {
          // Reconnect to update primary chain
          multiChainStore.connect();
        };
        window.ethereum.on('chainChanged', chainChangedHandler);

        const availableChains = Object.values(chains).filter(c => c.isAvailable).length;
        console.log(`✓ Connected to ${availableChains} chains`);

        return { 
          success: true, 
          address, 
          chainId,
          availableChains 
        };
      } catch (error) {
        console.error('Connection error:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Disconnect wallet
     */
    disconnect: () => {
      if (accountsChangedHandler && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', accountsChangedHandler);
      }
      if (chainChangedHandler && window.ethereum) {
        window.ethereum.removeListener('chainChanged', chainChangedHandler);
      }

      set({
        primaryAddress: null,
        primaryChainId: null,
        primarySigner: null,
        connected: false,
        chains: {},
        initializedChains: []
      });
    },

    /**
     * Switch the primary network in MetaMask
     */
    switchNetwork: async (chainId) => {
      try {
        if (typeof window.ethereum === 'undefined') {
          return { success: false, error: 'MetaMask not installed' };
        }

        const networkConfig = getNetworkByChainId(chainId);
        if (!networkConfig) {
          return { success: false, error: 'Unsupported network' };
        }

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: networkConfig.chainIdHex }],
          });
          return { success: true };
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: networkConfig.chainIdHex,
                    chainName: networkConfig.name,
                    nativeCurrency: networkConfig.nativeCurrency,
                    rpcUrls: [networkConfig.rpcUrl],
                    blockExplorerUrls: [networkConfig.blockExplorer]
                  }
                ]
              });
              return { success: true };
            } catch (addError) {
              console.error('Error adding network:', addError);
              return { success: false, error: 'Failed to add network' };
            }
          } else {
            console.error('Error switching network:', switchError);
            return { success: false, error: switchError.message };
          }
        }
      } catch (error) {
        console.error('Network switch error:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Get contract instance for a specific chain
     */
    getChainContract: (chainId) => {
      let currentStore;
      const unsubscribe = subscribe(val => {
        currentStore = val;
      });
      unsubscribe();

      return currentStore.chains[chainId]?.contract || null;
    },

    /**
     * Get provider for a specific chain
     */
    getChainProvider: (chainId) => {
      let currentStore;
      const unsubscribe = subscribe(val => {
        currentStore = val;
      });
      unsubscribe();

      return currentStore.chains[chainId]?.provider || null;
    },

    /**
     * Check if a claim exists on a specific chain
     */
    checkClaimOnChain: async (chainId, address) => {
      let currentStore;
      const unsubscribe = subscribe(val => {
        currentStore = val;
      });
      unsubscribe();

      const chainData = currentStore.chains[chainId];
      if (!chainData || !chainData.contract || !chainData.isAvailable) {
        return { success: false, error: 'Chain not available' };
      }

      try {
        const isClaimed = await chainData.contract.isClaimed(address);
        return { success: true, isClaimed };
      } catch (error) {
        console.error(`Error checking claim on chain ${chainId}:`, error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Get claim data from a specific chain
     */
    getClaimFromChain: async (chainId, address) => {
      let currentStore;
      const unsubscribe = subscribe(val => {
        currentStore = val;
      });
      unsubscribe();

      const chainData = currentStore.chains[chainId];
      if (!chainData || !chainData.contract || !chainData.isAvailable) {
        return { success: false, error: 'Chain not available' };
      }

      try {
        const claim = await chainData.contract.getClaim(address);
        return { 
          success: true, 
          claim: {
            claimant: claim[0],
            name: claim[1],
            avatar: claim[2],
            bio: claim[3],
            website: claim[4],
            twitter: claim[5],
            github: claim[6],
            claimTime: claim[7],
            isActive: claim[8],
            isPrivate: claim[9]
          }
        };
      } catch (error) {
        console.error(`Error getting claim from chain ${chainId}:`, error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Get claims across all chains for an address
     */
    getClaimsAcrossChains: async (address) => {
      let currentStore;
      const unsubscribe = subscribe(val => {
        currentStore = val;
      });
      unsubscribe();

      const results = [];

      for (const [chainId, chainData] of Object.entries(currentStore.chains)) {
        if (!chainData.isAvailable || !chainData.contract) continue;

        try {
          const isClaimed = await chainData.contract.isClaimed(address);
          if (isClaimed) {
            const claim = await chainData.contract.getClaim(address);
            results.push({
              chainId: Number(chainId),
              network: chainData.networkConfig.name,
              claim: {
                claimant: claim[0],
                name: claim[1],
                avatar: claim[2],
                bio: claim[3],
                website: claim[4],
                twitter: claim[5],
                github: claim[6],
                claimTime: claim[7],
                isActive: claim[8],
                isPrivate: claim[9]
              }
            });
          }
        } catch (error) {
          console.error(`Error checking claim on ${chainData.networkConfig.name}:`, error);
        }
      }

      return results;
    },

    /**
     * Sign message with primary signer
     */
    signMessage: async (message) => {
      let currentStore;
      const unsubscribe = subscribe(val => {
        currentStore = val;
      });
      unsubscribe();

      if (!currentStore.primarySigner) {
        throw new Error('No signer available');
      }

      return await currentStore.primarySigner.signMessage(message);
    }
  };
}

export const multiChainStore = createMultiChainStore();

// Derived store for available chains
export const availableChains = derived(
  multiChainStore,
  $store => Object.entries($store.chains)
    .filter(([_, data]) => data.isAvailable)
    .map(([chainId, data]) => ({
      chainId: Number(chainId),
      ...data.networkConfig
    }))
);

// Derived store for primary network info
export const primaryNetwork = derived(
  multiChainStore,
  $store => {
    if (!$store.primaryChainId) return null;
    return $store.chains[$store.primaryChainId]?.networkConfig || null;
  }
);
