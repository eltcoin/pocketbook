/**
 * Network configuration for multi-chain support
 * Defines supported blockchain networks and their parameters
 */

export const NETWORKS = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    chainIdHex: '0x1',
    name: 'Ethereum',
    shortName: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_ETHEREUM || null
    , handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_ETHEREUM || null
  },
  
  // Polygon (Matic) Mainnet
  137: {
    chainId: 137,
    chainIdHex: '0x89',
    name: 'Polygon',
    shortName: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_POLYGON || null,
    handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_POLYGON || null
  },
  
  // Binance Smart Chain Mainnet
  56: {
    chainId: 56,
    chainIdHex: '0x38',
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_BSC || null,
    handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_BSC || null
  },
  
  // Arbitrum One
  42161: {
    chainId: 42161,
    chainIdHex: '0xa4b1',
    name: 'Arbitrum One',
    shortName: 'ARB',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_ARBITRUM || null,
    handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_ARBITRUM || null
  },
  
  // Optimism
  10: {
    chainId: 10,
    chainIdHex: '0xa',
    name: 'Optimism',
    shortName: 'OP',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_OPTIMISM || null,
    handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_OPTIMISM || null
  },
  
  // Avalanche C-Chain
  43114: {
    chainId: 43114,
    chainIdHex: '0xa86a',
    name: 'Avalanche',
    shortName: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorer: 'https://snowtrace.io',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_AVALANCHE || null,
    handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_AVALANCHE || null
  },
  
  // Testnets
  
  // Sepolia (Ethereum Testnet)
  11155111: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    name: 'Sepolia',
    shortName: 'SEP',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_SEPOLIA || null,
    handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_SEPOLIA || null,
    isTestnet: true
  },
  
  // Polygon Mumbai (Testnet)
  80001: {
    chainId: 80001,
    chainIdHex: '0x13881',
    name: 'Polygon Mumbai',
    shortName: 'Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_MUMBAI || null,
    handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_MUMBAI || null,
    isTestnet: true
  },
  
  // Hardhat Local Network (for testing)
  31337: {
    chainId: 31337,
    chainIdHex: '0x7a69',
    name: 'Hardhat',
    shortName: 'Hardhat',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: null,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS_HARDHAT || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    handleRegistryAddress: import.meta.env.VITE_HANDLE_REGISTRY_ADDRESS_HARDHAT || null,
    isTestnet: true
  }
};

/**
 * Get network configuration by chain ID
 */
export function getNetworkByChainId(chainId) {
  return NETWORKS[chainId] || null;
}

/**
 * Get all supported networks
 */
export function getSupportedNetworks() {
  return Object.values(NETWORKS);
}

/**
 * Get mainnet networks only
 */
export function getMainnetNetworks() {
  return Object.values(NETWORKS).filter(network => !network.isTestnet);
}

/**
 * Get testnet networks only
 */
export function getTestnetNetworks() {
  return Object.values(NETWORKS).filter(network => network.isTestnet);
}

/**
 * Check if a chain ID is supported
 */
export function isSupportedNetwork(chainId) {
  return chainId in NETWORKS;
}
