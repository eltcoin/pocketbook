<script>
  import { createEventDispatcher } from 'svelte';
  import { ethersStore } from '../stores/ethers';
  import { themeStore } from '../stores/theme';
  import { resolveAddressOrENS, isENSName } from '../utils/ens';

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let searchAddress = '';
  let recentClaims = [];
  let loading = false;
  let searchError = null;
  let provider = null;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  ethersStore.subscribe(value => {
    provider = value.provider;
  });

  // Mock data for demonstration
  recentClaims = [
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      name: 'Alice.eth',
      avatar: '👤',
      claimTime: Date.now() - 86400000
    },
    {
      address: '0x9876543210987654321098765432109876543210',
      name: 'Bob Crypto',
      avatar: '🧑',
      claimTime: Date.now() - 172800000
    },
    {
      address: '0x1234567890123456789012345678901234567890',
      name: 'ELTCOIN Token',
      avatar: '🪙',
      claimTime: Date.now() - 259200000
    }
  ];

  async function handleSearch() {
    if (!searchAddress) {
      return;
    }

    searchError = null;
    loading = true;

    try {
      // If provider is available and input looks like ENS name, try to resolve it
      if (provider && isENSName(searchAddress)) {
        const { address, ensName } = await resolveAddressOrENS(searchAddress, provider);
        
        if (address) {
          dispatch('viewAddress', { view: 'address', address, ensName });
        } else {
          searchError = 'ENS name not found or could not be resolved';
        }
      } else {
        // Treat as direct address
        dispatch('viewAddress', { view: 'address', address: searchAddress });
      }
    } catch (error) {
      console.error('Search error:', error);
      searchError = 'Error searching for address';
    } finally {
      loading = false;
    }
  }

  function viewAddress(address) {
    dispatch('viewAddress', { view: 'address', address });
  }

  function shortenAddress(addr) {
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 8)}`;
  }

  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }
</script>

<div class="explorer" class:dark={darkMode}>
  <div class="hero">
    <h2>🔍 Blockchain Identity Explorer</h2>
    <p>Discover and explore claimed addresses on the decentralized human network</p>
  </div>

  <div class="search-section">
    <div class="search-bar">
      <input
        type="text"
        placeholder="Search by address or ENS name (0x... or name.eth)"
        bind:value={searchAddress}
        on:keypress={(e) => e.key === 'Enter' && handleSearch()}
        disabled={loading}
      />
      <button class="btn-search" on:click={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
    </div>
    {#if searchError}
      <div class="search-error">{searchError}</div>
    {/if}
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">1,234</div>
      <div class="stat-label">Claimed Addresses</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">567</div>
      <div class="stat-label">Active Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">89</div>
      <div class="stat-label">Contract Claims</div>
    </div>
  </div>

  <div class="recent-claims">
    <h3>Recent Claims</h3>
    <div class="claims-grid">
      {#each recentClaims as claim}
        <div class="claim-card" on:click={() => viewAddress(claim.address)}>
          <div class="claim-avatar">{claim.avatar}</div>
          <div class="claim-info">
            <div class="claim-name">{claim.name}</div>
            <div class="claim-address">{shortenAddress(claim.address)}</div>
            <div class="claim-time">{timeAgo(claim.claimTime)}</div>
          </div>
          <div class="claim-badge">✓ Claimed</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="info-section">
    <div class="info-card">
      <h4>🔐 Own Your Identity</h4>
      <p>Claim your Ethereum address and attach verifiable metadata secured by cryptographic signatures.</p>
    </div>
    <div class="info-card">
      <h4>🌐 Decentralized Network</h4>
      <p>Build your web of trust on the blockchain. No central authority, total user sovereignty.</p>
    </div>
    <div class="info-card">
      <h4>🔒 Privacy Control</h4>
      <p>Choose what's public and what's private. Whitelist viewers for sensitive information.</p>
    </div>
  </div>
</div>

<style>
  .explorer {
    color: #333;
  }

  .explorer.dark {
    color: #e0e0e0;
  }

  .hero {
    text-align: center;
    margin-bottom: 3rem;
  }

  .hero h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: white;
  }

  .hero p {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.9);
  }

  .search-section {
    max-width: 600px;
    margin: 0 auto 3rem;
  }

  .search-bar {
    display: flex;
    gap: 1rem;
    background: white;
    padding: 0.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  }

  .explorer.dark .search-bar {
    background: rgba(26, 26, 46, 0.9);
  }

  .search-error {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    text-align: center;
  }

  .explorer.dark .search-error {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .search-bar input {
    flex: 1;
    border: none;
    padding: 1rem;
    font-size: 1rem;
    background: transparent;
    color: #333;
    outline: none;
  }

  .explorer.dark .search-bar input {
    color: #e0e0e0;
  }

  .search-bar input::placeholder {
    color: #999;
  }

  .btn-search {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-search:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-search:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-search:disabled:hover {
    transform: none;
    box-shadow: none;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .stat-card {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }

  .explorer.dark .stat-card {
    background: rgba(26, 26, 46, 0.9);
  }

  .stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: bold;
    color: #667eea;
    margin-bottom: 0.5rem;
  }

  .explorer.dark .stat-value {
    color: #a78bfa;
  }

  .stat-label {
    color: #666;
    font-size: 1rem;
  }

  .explorer.dark .stat-label {
    color: #aaa;
  }

  .recent-claims {
    margin-bottom: 3rem;
  }

  .recent-claims h3 {
    color: white;
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }

  .claims-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .claim-card {
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .explorer.dark .claim-card {
    background: rgba(26, 26, 46, 0.9);
  }

  .claim-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .claim-avatar {
    font-size: 3rem;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
  }

  .claim-info {
    flex: 1;
  }

  .claim-name {
    font-weight: 600;
    font-size: 1.1rem;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .explorer.dark .claim-name {
    color: #e0e0e0;
  }

  .claim-address {
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    color: #667eea;
    margin-bottom: 0.25rem;
  }

  .explorer.dark .claim-address {
    color: #a78bfa;
  }

  .claim-time {
    font-size: 0.8rem;
    color: #999;
  }

  .claim-badge {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .explorer.dark .claim-badge {
    background: rgba(167, 139, 250, 0.1);
    color: #a78bfa;
  }

  .info-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .info-card {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .explorer.dark .info-card {
    background: rgba(26, 26, 46, 0.9);
  }

  .info-card h4 {
    color: #667eea;
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }

  .explorer.dark .info-card h4 {
    color: #a78bfa;
  }

  .info-card p {
    color: #666;
    line-height: 1.6;
  }

  .explorer.dark .info-card p {
    color: #aaa;
  }

  @media (max-width: 768px) {
    .hero h2 {
      font-size: 1.8rem;
    }

    .hero p {
      font-size: 1rem;
    }

    .search-bar {
      flex-direction: column;
    }

    .claims-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
