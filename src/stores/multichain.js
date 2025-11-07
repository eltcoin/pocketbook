import { writable, derived, get } from 'svelte/store';
import { ethers } from 'ethers';
import { getSupportedNetworks, getNetworkByChainId } from '../config/networks';
import { parseClaimData } from '../utils/claimParser';
import { calculateReputation, getReputationSummary } from '../utils/reputation';

// Constants
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
    initializedChains: [],
    pendingFriendRequests: {
      sent: [],
      received: []
    },
    trustScore: null,
    reputationSummary: null
  });
  const baseStore = { subscribe };

  // Contract ABI
  const contractABI = [
    "function claimAddress(address _address, bytes memory _signature, string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, string memory _pgpSignature, bool _isPrivate, string memory _ipfsCID) public",
    "function updateMetadata(string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, string memory _pgpSignature, bool _isPrivate, string memory _ipfsCID) public",
    "function getClaim(address _address) public view returns (address claimant, string memory name, string memory avatar, string memory bio, string memory website, string memory twitter, string memory github, uint256 claimTime, bool isActive, bool isPrivate)",
    "function isClaimed(address) public view returns (bool)",
    "function addViewer(address _viewer) public",
    "function removeViewer(address _viewer) public",
    "function getAllowedViewers(address _address) public view returns (address[] memory)",
    "function revokeClaim() public",
    "function getIPFSCID(address _address) public view returns (string memory)",
    "function getPGPSignature(address _address) public view returns (string memory)",
    "function getPublicKey(address _address) public view returns (bytes memory)",
    "function getDIDRoutingInfo(address _address) public view returns (string memory did, string memory ipfsCID)",
    "function followUser(address _userToFollow) public",
    "function unfollowUser(address _userToUnfollow) public",
    "function sendFriendRequest(address _to) public",
    "function acceptFriendRequest(address _from) public",
    "function cancelFriendRequest(address _to) public",
    "function declineFriendRequest(address _from) public",
    "function removeFriend(address _friend) public",
    "function getSocialGraph(address _address) public view returns (address[] memory following, address[] memory followers, address[] memory friends)",
    "function isFollowing(address _user1, address _user2) public view returns (bool)",
    "function areFriends(address _user1, address _user2) public view returns (bool)",
    "function hasPendingFriendRequest(address _from, address _to) public view returns (bool)",
    "function getPendingFriendRequests(address _address) public view returns (address[] memory sent, address[] memory received)",
    // Reputation attestation functions
    "function createAttestation(address _subject, uint8 _trustLevel, string memory _comment, bytes memory _signature) public",
    "function revokeAttestation(address _subject) public",
    "function getAttestation(address _attester, address _subject) public view returns (address attester, address subject, uint8 trustLevel, string memory comment, uint256 timestamp, bool isActive)",
    "function getAttestationsGiven(address _attester) public view returns (address[] memory)",
    "function getAttestationsReceived(address _subject) public view returns (address[] memory)",
    "function getAttestationSignature(address _attester, address _subject) public view returns (bytes memory)",
    "event AddressClaimed(address indexed claimedAddress, address indexed claimant, uint256 timestamp)",
    "event MetadataUpdated(address indexed claimedAddress, uint256 timestamp)",
    "event IPFSMetadataStored(address indexed claimedAddress, string ipfsCID, uint256 timestamp)",
    "event IPFSMetadataUpdated(address indexed claimedAddress, string ipfsCID, uint256 timestamp)",
    "event UserFollowed(address indexed follower, address indexed followee, uint256 timestamp)",
    "event UserUnfollowed(address indexed follower, address indexed followee, uint256 timestamp)",
    "event FriendRequestSent(address indexed from, address indexed to, uint256 timestamp)",
    "event FriendRequestAccepted(address indexed from, address indexed to, uint256 timestamp)",
    "event FriendRequestDeclined(address indexed from, address indexed to, uint256 timestamp)",
    "event FriendRequestCancelled(address indexed from, address indexed to, uint256 timestamp)",
    "event FriendRemoved(address indexed user1, address indexed user2, uint256 timestamp)",
    "event AttestationCreated(address indexed attester, address indexed subject, uint8 trustLevel, uint256 timestamp)",
    "event AttestationRevoked(address indexed attester, address indexed subject, uint256 timestamp)",
    "event AttestationUpdated(address indexed attester, address indexed subject, uint8 trustLevel, uint256 timestamp)"
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
        if (!network.contractAddress || network.contractAddress === ZERO_ADDRESS) {
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

  let chainsInitializationPromise = null;

  async function ensureChainsInitialized(force = false) {
    const currentStore = get(baseStore);
    if (!force && currentStore.initializedChains.length > 0 && !chainsInitializationPromise) {
      return currentStore.chains;
    }

    if (chainsInitializationPromise) {
      return chainsInitializationPromise;
    }

    chainsInitializationPromise = (async () => {
      const chains = await initializeChains();
      update(store => ({
        ...store,
        chains,
        initializedChains: Object.keys(chains).map(Number)
      }));
      chainsInitializationPromise = null;
      return chains;
    })();

    return chainsInitializationPromise;
  }

  function normalizeAddressArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(addr => addr);
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value)
        .filter(key => !Number.isNaN(Number(key)))
        .sort((a, b) => Number(a) - Number(b))
        .map(key => value[key]);
    }
    return [];
  }

  async function fetchPendingFriendRequests(address, chainId, chainsSnapshot) {
    if (!address || !chainId) {
      return { sent: [], received: [] };
    }

    const chains = chainsSnapshot || get(baseStore).chains;
    const chainData = chains?.[chainId];
    if (!chainData || !chainData.contract || typeof chainData.contract.getPendingFriendRequests !== 'function') {
      return { sent: [], received: [] };
    }

    try {
      const pending = await chainData.contract.getPendingFriendRequests(address);
      const sent = normalizeAddressArray(pending?.[0] ?? pending?.sent);
      const received = normalizeAddressArray(pending?.[1] ?? pending?.received);

      return { sent, received };
    } catch (error) {
      console.debug('Pending friend request fetch failed:', error);
      return { sent: [], received: [] };
    }
  }

  async function fetchReputationSummary(address, chainId, chainsSnapshot) {
    if (!address || !chainId) {
      return null;
    }

    const chains = chainsSnapshot || get(baseStore).chains;
    const chainData = chains?.[chainId];
    if (
      !chainData ||
      !chainData.contract ||
      typeof chainData.contract.getAttestationsReceived !== 'function' ||
      typeof chainData.contract.getAttestation !== 'function'
    ) {
      return null;
    }

    try {
      const receivedList = await chainData.contract.getAttestationsReceived(address);
      const directAttestations = await Promise.all(
        receivedList.map(async (attester) => {
          const att = await chainData.contract.getAttestation(attester, address);
          return {
            attester: att[0],
            subject: att[1],
            trustLevel: Number(att[2]),
            comment: att[3],
            timestamp: Number(att[4]),
            isActive: att[5]
          };
        })
      );

      const reputation = calculateReputation(
        address,
        directAttestations.filter(att => att.isActive),
        {},
        null
      );

      return getReputationSummary(reputation);
    } catch (error) {
      console.error('Failed to fetch reputation summary:', error);
      return null;
    }
  }

  const storeMethods = {
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
          
          if (contractAddress && contractAddress !== ZERO_ADDRESS) {
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

        const [pendingRequests, reputationSummary] = await Promise.all([
          fetchPendingFriendRequests(address, chainId, chains),
          fetchReputationSummary(address, chainId, chains)
        ]);

        update(store => ({
          ...store,
          pendingFriendRequests: pendingRequests,
          trustScore: reputationSummary?.score ?? null,
          reputationSummary: reputationSummary || null
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
            storeMethods.disconnect();
          } else {
            storeMethods.connect();
          }
        };
        window.ethereum.on('accountsChanged', accountsChangedHandler);

        chainChangedHandler = () => {
          // Reconnect to update primary chain
          storeMethods.connect();
        };
        window.ethereum.on('chainChanged', chainChangedHandler);

        const availableChains = Object.values(chains).filter(c => c.isAvailable).length;
        console.log(`✓ Connected to ${availableChains} chains`);

        return { 
          success: true, 
          address, 
          chainId,
          availableChains,
          pendingRequests,
          reputationSummary
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
        initializedChains: [],
        pendingFriendRequests: {
          sent: [],
          received: []
        },
        trustScore: null,
        reputationSummary: null
      });

      // Reinitialize read-only providers so the app can continue to browse
      ensureChainsInitialized(true).catch((error) => {
        console.error('Error reinitializing chains after disconnect:', error);
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
      const currentStore = get(baseStore);
      return currentStore.chains[chainId]?.contract || null;
    },

    /**
     * Get provider for a specific chain
     */
    getChainProvider: (chainId) => {
      const currentStore = get(baseStore);
      return currentStore.chains[chainId]?.provider || null;
    },

    /**
     * Check if a claim exists on a specific chain
     */
    checkClaimOnChain: async (chainId, address) => {
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

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
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

      const chainData = currentStore.chains[chainId];
      if (!chainData || !chainData.contract || !chainData.isAvailable) {
        return { success: false, error: 'Chain not available' };
      }

      try {
        const isClaimed = await chainData.contract.isClaimed(address);
        if (!isClaimed) {
          return { success: false, error: 'Address not claimed on this chain' };
        }

        const claim = await chainData.contract.getClaim(address);
        return { 
          success: true, 
          claim: parseClaimData(claim)
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
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

      const claimPromises = Object.entries(currentStore.chains)
        .filter(([_, chainData]) => chainData.isAvailable && chainData.contract)
        .map(async ([chainId, chainData]) => {
          try {
            const isClaimed = await chainData.contract.isClaimed(address);
            if (!isClaimed) {
              return null;
            }

            const claim = await chainData.contract.getClaim(address);
            const parsedClaim = parseClaimData(claim);
            
            // Check if claim is active (assuming claim[8] is isActive)
            if (parsedClaim && parsedClaim.isActive) {
              return {
                chainId: Number(chainId),
                network: chainData.networkConfig.name,
                claim: parsedClaim
              };
            }
          } catch (error) {
            const reason = error?.reason || error?.shortMessage || error?.message;
            if (reason && reason.toLowerCase().includes('address not claimed')) {
              return null;
            }
            console.error(`Error fetching claim on ${chainData.networkConfig.name}:`, error);
          }
          return null;
        });

      const claims = await Promise.all(claimPromises);
      return claims.filter(Boolean);
    },

    /**
     * Refresh pending friend requests for the current or specified address
     */
    refreshPendingFriendRequests: async ({ address, chainId } = {}) => {
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

      const targetAddress = address || currentStore.primaryAddress;
      const targetChainId = chainId || currentStore.primaryChainId;

      if (!targetAddress || !targetChainId) {
        return { sent: [], received: [] };
      }

      const pending = await fetchPendingFriendRequests(targetAddress, targetChainId, currentStore.chains);

      if (!address && !chainId) {
        update(store => ({
          ...store,
          pendingFriendRequests: pending
        }));
      }

      return pending;
    },

    /**
     * Refresh trust score for the primary address
     */
    refreshPrimaryTrustScore: async () => {
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

      if (!currentStore.primaryAddress || !currentStore.primaryChainId) {
        return { success: false };
      }

      const summary = await fetchReputationSummary(
        currentStore.primaryAddress,
        currentStore.primaryChainId,
        currentStore.chains
      );

      update(store => ({
        ...store,
        trustScore: summary?.score ?? null,
        reputationSummary: summary || null
      }));

      return { success: Boolean(summary), summary };
    },

    /**
     * Claim the connected address on the current primary chain
     */
    claimAddressOnPrimaryChain: async ({
      signature,
      name,
      avatar = '',
      bio = '',
      website = '',
      twitter = '',
      github = '',
      publicKey = null,
      pgpSignature = '',
      isPrivate = false,
      ipfsCID = ''
    }) => {
      const currentStore = get(baseStore);

      if (!currentStore.connected) {
        throw new Error('Wallet not connected');
      }

      const signer = currentStore.primarySigner;
      if (!signer) {
        throw new Error('No signer available');
      }

      const chainId = currentStore.primaryChainId;
      if (!chainId) {
        throw new Error('No active chain');
      }

      if (!signature) {
        throw new Error('Missing signature');
      }

      const chainData = currentStore.chains[chainId];
      if (!chainData || !chainData.contract) {
        throw new Error('Contract not available on current chain');
      }

      const claimantAddress = currentStore.primaryAddress;
      if (!claimantAddress) {
        throw new Error('No primary address');
      }

      const contract = chainData.contract.connect(signer);
      const publicKeyBytes = publicKey && publicKey.length ? publicKey : new Uint8Array();

      const tx = await contract.claimAddress(
        claimantAddress,
        signature,
        name,
        avatar,
        bio,
        website,
        twitter,
        github,
        publicKeyBytes,
        pgpSignature,
        Boolean(isPrivate),
        ipfsCID
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        chainId
      };
    },

    /**
     * Update metadata for the primary address
     */
    updateMetadataOnPrimaryChain: async ({
      name,
      avatar = '',
      bio = '',
      website = '',
      twitter = '',
      github = '',
      publicKey = null,
      pgpSignature = '',
      isPrivate = false,
      ipfsCID = ''
    }) => {
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

      if (!currentStore.connected) {
        throw new Error('Wallet not connected');
      }

      const chainId = currentStore.primaryChainId;
      if (!chainId) {
        throw new Error('No active chain');
      }

      const chainData = currentStore.chains[chainId];
      if (!chainData?.contract) {
        throw new Error('Contract not available on current chain');
      }

      const publicKeyBytes = publicKey
        ? (typeof publicKey === 'string' ? ethers.getBytes(publicKey) : publicKey)
        : new Uint8Array();

      const tx = await chainData.contract.updateMetadata(
        name,
        avatar,
        bio,
        website,
        twitter,
        github,
        publicKeyBytes,
        pgpSignature,
        Boolean(isPrivate),
        ipfsCID || ''
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash
      };
    },

    /**
     * Add a viewer to the private metadata allowlist on the primary chain
     */
    addViewerOnPrimaryChain: async (viewerAddress) => {
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

      if (!currentStore.connected) {
        throw new Error('Wallet not connected');
      }

      const chainId = currentStore.primaryChainId;
      const chainData = chainId ? currentStore.chains[chainId] : null;
      if (!chainData?.contract) {
        throw new Error('Contract not available on current chain');
      }

      const tx = await chainData.contract.addViewer(viewerAddress);
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.hash };
    },

    /**
     * Remove a viewer from the private metadata allowlist on the primary chain
     */
    removeViewerOnPrimaryChain: async (viewerAddress) => {
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

      if (!currentStore.connected) {
        throw new Error('Wallet not connected');
      }

      const chainId = currentStore.primaryChainId;
      const chainData = chainId ? currentStore.chains[chainId] : null;
      if (!chainData?.contract) {
        throw new Error('Contract not available on current chain');
      }

      const tx = await chainData.contract.removeViewer(viewerAddress);
      const receipt = await tx.wait();
      return { success: true, transactionHash: receipt.hash };
    },

    /**
     * Fetch allowed viewers for an address (defaults to primary)
     */
    getAllowedViewers: async (chainId, address) => {
      await ensureChainsInitialized();
      const currentStore = get(baseStore);

      const targetChainId = chainId || currentStore.primaryChainId;
      const targetAddress = address || currentStore.primaryAddress;

      if (!targetChainId || !targetAddress) {
        return [];
      }

      const chainData = currentStore.chains[targetChainId];
      if (!chainData?.contract) {
        return [];
      }

      const viewers = await chainData.contract.getAllowedViewers(targetAddress);
      return normalizeAddressArray(viewers);
    },

    /**
     * Sign message with primary signer
     */
    signMessage: async (message) => {
      const currentStore = get(baseStore);

      if (!currentStore.primarySigner) {
        throw new Error('No signer available');
      }

      return await currentStore.primarySigner.signMessage(message);
    }
  };
  
  // Initialize read-only providers on load for unauthenticated users
  ensureChainsInitialized().catch((error) => {
    console.error('Failed to initialize chains on load:', error);
  });

  return storeMethods;
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
