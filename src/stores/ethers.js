import { writable } from 'svelte/store';
import { ethers } from 'ethers';
import { getNetworkByChainId, isSupportedNetwork } from '../config/networks';

function createEthersStore() {
  const { subscribe, set, update } = writable({
    provider: null,
    signer: null,
    address: null,
    contract: null,
    connected: false,
    network: null,
    chainId: null,
    networkConfig: null
  });

  // Contract ABI (simplified for now)
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

  // Store reference to account and network change handlers to prevent memory leaks
  let accountsChangedHandler = null;
  let chainChangedHandler = null;

  return {
    subscribe,
    connect: async () => {
      try {
        if (typeof window.ethereum !== 'undefined') {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send("eth_requestAccounts", []);
          const signer = await provider.getSigner();
          const address = accounts[0];
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          
          // Get network configuration
          const networkConfig = getNetworkByChainId(chainId);
          
          if (!networkConfig) {
            console.warn(`Unsupported network: Chain ID ${chainId}. Some features may not work.`);
          }
          
          // Get contract address for current network
          const contractAddress = networkConfig?.contractAddress || import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
          
          if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
            console.warn(`No contract address configured for ${networkConfig?.name || 'this network'}. Contract interactions will not work.`);
          }
          
          // Note: Contract address would need to be deployed first
          const contract = new ethers.Contract(contractAddress, contractABI, signer);
          
          update(store => ({
            ...store,
            provider,
            signer,
            address,
            contract,
            connected: true,
            network: networkConfig?.name || network.name,
            chainId,
            networkConfig
          }));

          // Remove previous listeners if they exist to prevent memory leaks
          if (accountsChangedHandler) {
            window.ethereum.removeListener('accountsChanged', accountsChangedHandler);
          }
          if (chainChangedHandler) {
            window.ethereum.removeListener('chainChanged', chainChangedHandler);
          }

          // Listen for account changes
          accountsChangedHandler = (accounts) => {
            if (accounts.length === 0) {
              ethersStore.disconnect();
            } else {
              ethersStore.connect();
            }
          };
          window.ethereum.on('accountsChanged', accountsChangedHandler);

          // Listen for chain/network changes
          chainChangedHandler = () => {
            // Reload the page on network change as recommended by MetaMask
            window.location.reload();
          };
          window.ethereum.on('chainChanged', chainChangedHandler);

          return { success: true, address, chainId, network: networkConfig?.name || network.name };
        } else {
          return { success: false, error: 'MetaMask not installed' };
        }
      } catch (error) {
        console.error('Connection error:', error);
        return { success: false, error: error.message };
      }
    },
    disconnect: () => {
      // Remove listeners
      if (accountsChangedHandler && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', accountsChangedHandler);
      }
      if (chainChangedHandler && window.ethereum) {
        window.ethereum.removeListener('chainChanged', chainChangedHandler);
      }
      
      set({
        provider: null,
        signer: null,
        address: null,
        contract: null,
        connected: false,
        network: null,
        chainId: null,
        networkConfig: null
      });
    },
    switchNetwork: async (chainId) => {
      try {
        if (typeof window.ethereum === 'undefined') {
          return { success: false, error: 'MetaMask not installed' };
        }

        const networkConfig = getNetworkByChainId(chainId);
        if (!networkConfig) {
          return { success: false, error: 'Unsupported network' };
        }

        // Try to switch to the network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: networkConfig.chainIdHex }],
          });
          return { success: true };
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask
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
    signMessage: async (message) => {
      let currentStore;
      const unsubscribe = subscribe(val => {
        currentStore = val;
      });
      unsubscribe();
      
      if (!currentStore || !currentStore.signer) {
        throw new Error('No signer available');
      }
      
      return await currentStore.signer.signMessage(message);
    }
  };
}

export const ethersStore = createEthersStore();
