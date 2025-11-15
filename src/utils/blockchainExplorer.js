/**
 * Blockchain Explorer Utility
 * Fetches transactions, token transfers, and contract interactions using public RPC endpoints
 * with intelligent caching to minimize API calls
 */

import { ethers } from 'ethers';

// ERC-20 Transfer event signature
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Common ERC-20 ABI for decoding
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Cache duration: 5 minutes for recent data, 1 hour for older data
const CACHE_DURATION_RECENT = 5 * 60 * 1000; // 5 minutes
const CACHE_DURATION_OLD = 60 * 60 * 1000; // 1 hour

// Block range limits for performance
const MAX_BLOCK_RANGE_TOKEN_TRANSFERS = 10000;

/**
 * Cache manager using localStorage
 */
class CacheManager {
  constructor(prefix = 'blockchain_explorer_') {
    this.prefix = prefix;
  }

  set(key, value, ttl = CACHE_DURATION_OLD) {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (e) {
      console.warn('Cache set failed:', e);
    }
  }

  get(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const { value, timestamp, ttl } = JSON.parse(item);
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      return value;
    } catch (e) {
      console.warn('Cache get failed:', e);
      return null;
    }
  }

  clear(pattern) {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix) && (!pattern || key.includes(pattern))) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Cache clear failed:', e);
    }
  }
}

const cache = new CacheManager();

/**
 * Token metadata cache
 */
const tokenMetadataCache = new Map();

/**
 * Get token metadata (name, symbol, decimals)
 */
async function getTokenMetadata(provider, tokenAddress) {
  const cacheKey = `token_${tokenAddress}`;

  // Check memory cache first
  if (tokenMetadataCache.has(cacheKey)) {
    return tokenMetadataCache.get(cacheKey);
  }

  // Check localStorage cache
  const cached = cache.get(cacheKey);
  if (cached) {
    tokenMetadataCache.set(cacheKey, cached);
    return cached;
  }

  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => 'Unknown Token'),
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.decimals().catch(() => 18)
    ]);

    const metadata = { name, symbol, decimals: Number(decimals), address: tokenAddress };

    // Cache permanently (token metadata doesn't change)
    tokenMetadataCache.set(cacheKey, metadata);
    cache.set(cacheKey, metadata, 365 * 24 * 60 * 60 * 1000); // 1 year

    return metadata;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return {
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals: 18,
      address: tokenAddress
    };
  }
}

/**
 * Get token transfers for an address
 */
export async function getTokenTransfers(provider, address, chainId, options = {}) {
  const {
    fromBlock = 'earliest',
    toBlock = 'latest',
    limit = 100
  } = options;

  const cacheKey = `transfers_${chainId}_${address}_${fromBlock}_${toBlock}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get current block for relative calculations
    const currentBlock = await provider.getBlockNumber();

    // Calculate block range (limit to last MAX_BLOCK_RANGE_TOKEN_TRANSFERS blocks for performance)
    let startBlock = fromBlock === 'earliest' ? Math.max(0, currentBlock - MAX_BLOCK_RANGE_TOKEN_TRANSFERS) : fromBlock;
    let endBlock = toBlock === 'latest' ? currentBlock : toBlock;

    // ERC-20 Transfer events where address is sender or receiver
    // Transfer(address indexed from, address indexed to, uint256 value)
    const paddedAddress = ethers.zeroPadValue(address.toLowerCase(), 32);

    const [sentLogs, receivedLogs] = await Promise.all([
      // Tokens sent (from = address)
      provider.getLogs({
        fromBlock: startBlock,
        toBlock: endBlock,
        topics: [ERC20_TRANSFER_TOPIC, paddedAddress]
      }).catch(err => {
        console.warn('Error fetching sent logs:', err);
        return [];
      }),
      // Tokens received (to = address)
      provider.getLogs({
        fromBlock: startBlock,
        toBlock: endBlock,
        topics: [ERC20_TRANSFER_TOPIC, null, paddedAddress]
      }).catch(err => {
        console.warn('Error fetching received logs:', err);
        return [];
      })
    ]);

    // Combine and deduplicate
    const allLogs = [...sentLogs, ...receivedLogs];
    const uniqueLogs = Array.from(
      new Map(allLogs.map(log => [`${log.transactionHash}-${log.logIndex}`, log])).values()
    );

    // Sort by block number (descending) and take limit
    uniqueLogs.sort((a, b) => b.blockNumber - a.blockNumber);
    const limitedLogs = uniqueLogs.slice(0, limit);

    // Decode and enrich transfers
    const transfers = await Promise.all(
      limitedLogs.map(async (log) => {
        try {
          // Decode Transfer event
          const iface = new ethers.Interface(ERC20_ABI);
          const decoded = iface.parseLog({
            topics: log.topics,
            data: log.data
          });

          const from = decoded.args[0];
          const to = decoded.args[1];
          const value = decoded.args[2];

          // Get token metadata
          const tokenMetadata = await getTokenMetadata(provider, log.address);

          // Get block timestamp with retry logic
          let block = null;
          const maxAttempts = 3;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              block = await provider.getBlock(log.blockNumber);
              if (block) break;
            } catch (err) {
              if (attempt === maxAttempts - 1) {
                console.error(
                  `Failed to fetch block ${log.blockNumber} for tx ${log.transactionHash} after ${maxAttempts} attempts:`,
                  err
                );
              } else {
                // Wait before retrying
                await new Promise(res => setTimeout(res, 500));
              }
            }
          }

          return {
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: block ? block.timestamp : null,
            from,
            to,
            value: value.toString(),
            valueFormatted: ethers.formatUnits(value, tokenMetadata.decimals),
            token: tokenMetadata,
            logIndex: log.logIndex,
            type: from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received'
          };
        } catch (error) {
          console.error('Error decoding transfer:', error);
          return null;
        }
      })
    );

    const validTransfers = transfers.filter(t => t !== null);

    // Cache with appropriate TTL
    const isRecent = endBlock === currentBlock;
    cache.set(cacheKey, validTransfers, isRecent ? CACHE_DURATION_RECENT : CACHE_DURATION_OLD);

    return validTransfers;
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    return [];
  }
}

/**
 * Get regular transactions for an address
 * Note: This is a simplified version that gets transactions from recent blocks
 * For full history, would need block-by-block scanning (expensive) or indexer
 */
export async function getTransactions(provider, address, chainId, options = {}) {
  const {
    limit = 50,
    blockRange = 5000 // Default: scan 5000 most recent blocks
  } = options;

  const cacheKey = `txns_${chainId}_${address}_${blockRange}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - blockRange);

    // Scan blocks in batches (more efficient)
    const batchSize = 100;
    const allTransactions = [];
    
    // Create batch promises array
    const batchPromises = [];
    
    for (let block = currentBlock; block >= startBlock; block -= batchSize) {
      const fromBlock = Math.max(startBlock, block - batchSize + 1);
      const toBlock = block;

      const batchPromise = (async () => {
        const batchResults = [];
        try {
          // Fetch all blocks in the batch concurrently
          const blockNumbers = [];
          for (let i = toBlock; i >= fromBlock; i--) {
            blockNumbers.push(i);
          }
          
          // Fetch blocks with retry logic
          const fetchBlockWithRetry = async (blockNum, attempts = 3) => {
            for (let attempt = 0; attempt < attempts; attempt++) {
              try {
                const blockData = await provider.getBlock(blockNum, true);
                if (blockData && blockData.transactions) {
                  return blockData;
                }
              } catch (err) {
                if (attempt === attempts - 1) {
                  console.warn(`Failed to fetch block ${blockNum} after ${attempts} attempts. Transactions in this block will be skipped.`);
                  return null;
                }
                // Wait before retrying
                await new Promise(res => setTimeout(res, 500));
              }
            }
            return null;
          };
          
          const blockDataArray = await Promise.all(
            blockNumbers.map(i => fetchBlockWithRetry(i))
          );
          
          // Process all fetched blocks
          for (const blockData of blockDataArray) {
            if (!blockData) continue;

            // Filter transactions involving our address
            for (const tx of blockData.transactions) {
              if (
                tx.from?.toLowerCase() === address.toLowerCase() ||
                tx.to?.toLowerCase() === address.toLowerCase()
              ) {
                batchResults.push({
                  hash: tx.hash,
                  blockNumber: blockData.number,
                  timestamp: blockData.timestamp,
                  from: tx.from,
                  to: tx.to,
                  value: tx.value.toString(),
                  valueFormatted: ethers.formatEther(tx.value),
                  gasPrice: tx.gasPrice?.toString(),
                  gasLimit: tx.gasLimit?.toString(),
                  nonce: tx.nonce,
                  data: tx.data,
                  type: tx.from?.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
                  isContractInteraction: tx.data && tx.data !== '0x' && tx.data.length > 2
                });
              }
            }
          }
        } catch (err) {
          console.warn(`Error scanning block range ${fromBlock}-${toBlock}:`, err);
        }
        return batchResults;
      })();

      batchPromises.push(batchPromise);

      // Process in batches of 5 to avoid rate limits
      if (batchPromises.length >= 5) {
        const results = await Promise.all(batchPromises);
        results.forEach(batchResults => allTransactions.push(...batchResults));
        batchPromises = [];
        
        // Early exit if we have enough transactions
        if (allTransactions.length >= limit) {
          break;
        }
      }
    }

    // Wait for remaining promises
    if (batchPromises.length > 0) {
      const results = await Promise.all(batchPromises);
      results.forEach(batchResults => allTransactions.push(...batchResults));
    }

    // Sort by block number descending and limit results
    const transactions = allTransactions
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, limit);

    // Cache results
    cache.set(cacheKey, transactions, CACHE_DURATION_RECENT);

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Decode contract interaction from transaction data
 */
function decodeContractInteraction(data, to) {
  if (!data || data === '0x' || data.length < 10) {
    return null;
  }

  try {
    // Extract function selector (first 4 bytes)
    const selector = data.slice(0, 10);

    // Common function signatures
    const knownSelectors = {
      '0xa9059cbb': 'transfer(address,uint256)',
      '0x23b872dd': 'transferFrom(address,address,uint256)',
      '0x095ea7b3': 'approve(address,uint256)',
      '0x40c10f19': 'mint(address,uint256)',
      '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
      '0xa22cb465': 'setApprovalForAll(address,bool)',
      '0x3ccfd60b': 'withdraw()',
      '0xd0e30db0': 'deposit()',
      '0x18160ddd': 'totalSupply()',
      '0x70a08231': 'balanceOf(address)'
    };

    const functionName = knownSelectors[selector] || `unknown_${selector}`;

    return {
      selector,
      functionName,
      rawData: data,
      decodedInputs: null // Could add ABI decoding if needed
    };
  } catch (error) {
    console.error('Error decoding contract interaction:', error);
    return {
      selector: data.slice(0, 10),
      functionName: 'unknown',
      rawData: data,
      decodedInputs: null
    };
  }
}

/**
 * Get contract interactions for an address
 */
export async function getContractInteractions(provider, address, chainId, options = {}) {
  const { limit = 50, blockRange = 5000 } = options;

  const cacheKey = `interactions_${chainId}_${address}_${blockRange}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Get all transactions
    const allTransactions = await getTransactions(provider, address, chainId, { limit: limit * 2, blockRange });

    // Filter only contract interactions (transactions with data)
    const interactions = allTransactions
      .filter(tx => tx.isContractInteraction)
      .slice(0, limit)
      .map(tx => {
        const decoded = decodeContractInteraction(tx.data, tx.to);
        return {
          ...tx,
          contractAddress: tx.to,
          decodedFunction: decoded
        };
      });

    // Cache results
    cache.set(cacheKey, interactions, CACHE_DURATION_RECENT);

    return interactions;
  } catch (error) {
    console.error('Error fetching contract interactions:', error);
    return [];
  }
}

/**
 * Get comprehensive blockchain activity for an address
 */
export async function getAddressActivity(provider, address, chainId, options = {}) {
  const cacheKey = `activity_${chainId}_${address}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const [transactions, tokenTransfers, contractInteractions] = await Promise.all([
      getTransactions(provider, address, chainId, options),
      getTokenTransfers(provider, address, chainId, options),
      getContractInteractions(provider, address, chainId, options)
    ]);

    const activity = {
      transactions,
      tokenTransfers,
      contractInteractions,
      summary: {
        totalTransactions: transactions.length,
        totalTokenTransfers: tokenTransfers.length,
        totalContractInteractions: contractInteractions.length,
        lastActivity: Math.max(
          transactions[0]?.timestamp || 0,
          tokenTransfers[0]?.timestamp || 0,
          contractInteractions[0]?.timestamp || 0
        )
      }
    };

    // Cache for 5 minutes
    cache.set(cacheKey, activity, CACHE_DURATION_RECENT);

    return activity;
  } catch (error) {
    console.error('Error fetching address activity:', error);
    return {
      transactions: [],
      tokenTransfers: [],
      contractInteractions: [],
      summary: {
        totalTransactions: 0,
        totalTokenTransfers: 0,
        totalContractInteractions: 0,
        lastActivity: 0
      }
    };
  }
}

/**
 * Get token balance for an address
 */
export async function getTokenBalance(provider, tokenAddress, holderAddress) {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(holderAddress);
    const metadata = await getTokenMetadata(provider, tokenAddress);

    return {
      balance: balance.toString(),
      balanceFormatted: ethers.formatUnits(balance, metadata.decimals),
      token: metadata
    };
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return null;
  }
}

/**
 * Clear cache for an address (useful for refreshing data)
 */
export function clearAddressCache(address, chainId) {
  if (chainId) {
    cache.clear(`${chainId}_${address}`);
  } else {
    cache.clear(address);
  }
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get block explorer URL for transaction
 */
export function getExplorerUrl(chainId, txHash, type = 'tx') {
  const explorers = {
    1: 'https://etherscan.io',
    137: 'https://polygonscan.com',
    56: 'https://bscscan.com',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io',
    43114: 'https://snowtrace.io',
    11155111: 'https://sepolia.etherscan.io',
    80001: 'https://mumbai.polygonscan.com'
  };

  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/${type}/${txHash}`;
}

/**
 * Format timestamp as relative time ago (e.g., "5m ago", "2h ago")
 */
export function getTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = Math.floor(Date.now() / 1000);
  const seconds = now - timestamp;

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default {
  getTokenTransfers,
  getTransactions,
  getContractInteractions,
  getAddressActivity,
  getTokenBalance,
  clearAddressCache,
  formatTimestamp,
  formatAddress,
  getExplorerUrl
};
