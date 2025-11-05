import { writable, derived, get } from 'svelte/store';
import { ethers } from 'ethers';
import { getSupportedNetworks, getNetworkByChainId } from '../config/networks';
import { parseClaimData } from '../utils/claimParser';

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
    initializedChains: []
  });

  // Contract ABI
  const contractABI = [
    "function claimAddress(address _address, bytes memory _signature, string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, string memory _pgpSignature, bool _isPrivate, string memory _ipfsCID) public",
    "function updateMetadata(string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, string memory _pgpSignature, bool _isPrivate, string memory _ipfsCID) public",
    "function getClaim(address _address) public view returns (address claimant, string memory name, string memory avatar, string memory bio, string memory website, string memory twitter, string memory github, uint256 claimTime, bool isActive, bool isPrivate)",
    "function isClaimed(address) public view returns (bool)",
    "function addViewer(address _viewer) public",
    "function removeViewer(address _viewer) public",
    "function revokeClaim() public",
    "function getIPFSCID(address _address) public view returns (string memory)",
    "function getPGPSignature(address _address) public view returns (string memory)",
    "function getDIDRoutingInfo(address _address) public view returns (string memory did, string memory ipfsCID)",
    "function followUser(address _userToFollow) public",
    "function unfollowUser(address _userToUnfollow) public",
    "function sendFriendRequest(address _to) public",
    "function acceptFriendRequest(address _from) public",
    "function removeFriend(address _friend) public",
    "function getSocialGraph(address _address) public view returns (address[] memory following, address[] memory followers, address[] memory friends)",
    "function isFollowing(address _user1, address _user2) public view returns (bool)",
    "function areFriends(address _user1, address _user2) public view returns (bool)",
    "function hasPendingFriendRequest(address _from, address _to) public view returns (bool)",
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
      const currentStore = get(storeMethods);
      return currentStore.chains[chainId]?.contract || null;
    },

    /**
     * Get provider for a specific chain
     */
    getChainProvider: (chainId) => {
      const currentStore = get(storeMethods);
      return currentStore.chains[chainId]?.provider || null;
    },

    /**
     * Check if a claim exists on a specific chain
     */
    checkClaimOnChain: async (chainId, address) => {
      const currentStore = get(storeMethods);

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
      const currentStore = get(storeMethods);

      const chainData = currentStore.chains[chainId];
      if (!chainData || !chainData.contract || !chainData.isAvailable) {
        return { success: false, error: 'Chain not available' };
      }

      try {
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
      const currentStore = get(storeMethods);

      const claimPromises = Object.entries(currentStore.chains)
        .filter(([_, chainData]) => chainData.isAvailable && chainData.contract)
        .map(async ([chainId, chainData]) => {
          try {
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
            console.error(`Error fetching claim on ${chainData.networkConfig.name}:`, error);
          }
          return null;
        });

      const claims = await Promise.all(claimPromises);
      return claims.filter(Boolean);
    },

    /**
     * Sign message with primary signer
     */
    signMessage: async (message) => {
      const currentStore = get(storeMethods);

      if (!currentStore.primarySigner) {
        throw new Error('No signer available');
      }

      return await currentStore.primarySigner.signMessage(message);
    }
  };
  
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
