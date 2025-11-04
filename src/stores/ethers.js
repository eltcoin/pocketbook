import { writable } from 'svelte/store';
import { ethers } from 'ethers';

function createEthersStore() {
  const { subscribe, set, update } = writable({
    provider: null,
    signer: null,
    address: null,
    contract: null,
    connected: false,
    network: null
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

  // Contract address - set via environment variable or update after deployment
  if (!import.meta.env.VITE_CONTRACT_ADDRESS) {
    throw new Error("VITE_CONTRACT_ADDRESS environment variable is not set. Please set it to your deployed contract address.");
  }
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

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
          
          // Note: Contract address would need to be deployed first
          const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
          
          update(store => ({
            ...store,
            provider,
            signer,
            address,
            contract,
            connected: true,
            network: network.name
          }));

          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
              ethersStore.disconnect();
            } else {
              ethersStore.connect();
            }
          });

          return { success: true, address };
        } else {
          return { success: false, error: 'MetaMask not installed' };
        }
      } catch (error) {
        console.error('Connection error:', error);
        return { success: false, error: error.message };
      }
    },
    disconnect: () => {
      set({
        provider: null,
        signer: null,
        address: null,
        contract: null,
        connected: false,
        network: null
      });
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
