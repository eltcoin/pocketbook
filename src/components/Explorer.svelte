<script>
  import { createEventDispatcher } from 'svelte';
  import { ethers } from 'ethers';
  import { ethersStore } from '../stores/ethers';
  import { themeStore } from '../stores/theme';
  import { resolveAddressOrENS, isENSName } from '../utils/ens';
  import Icon from './Icon.svelte';

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
        // Validate address format before treating as direct address
        if (ethers.isAddress(searchAddress)) {
          dispatch('viewAddress', { view: 'address', address: searchAddress });
        } else {
          searchError = 'Invalid address format. Please enter a valid Ethereum address or ENS name.';
        }
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
    <h2>
      <Icon name="globe" size="2.5rem" />
      <span>Blockchain Identity Explorer</span>
    </h2>
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
        <Icon name="search" size="1.125rem" />
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
          <div class="claim-badge">
            <Icon name="check" size="0.875rem" />
            Claimed
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="info-section">
    <div class="info-card">
      <h4>
        <Icon name="shield-alt" size="1.5rem" />
        <span>Own Your Identity</span>
      </h4>
      <p>Claim your Ethereum address and attach verifiable metadata secured by cryptographic signatures.</p>
    </div>
    <div class="info-card">
      <h4>
        <Icon name="network-wired" size="1.5rem" />
        <span>Decentralized Network</span>
      </h4>
      <p>Build your web of trust on the blockchain. No central authority, total user sovereignty.</p>
    </div>
    <div class="info-card">
      <h4>
        <Icon name="lock" size="1.5rem" />
        <span>Privacy Control</span>
      </h4>
      <p>Choose what's public and what's private. Whitelist viewers for sensitive information.</p>
    </div>
  </div>
</div>

<style>
  .explorer {
    color: #0f172a;
  }

  .explorer.dark {
    color: #f1f5f9;
  }

  .hero {
    text-align: center;
    margin-bottom: 3rem;
    padding: 3rem 0;
  }

  .hero h2 {
    font-size: 2.75rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: #0f172a;
    letter-spacing: -0.03em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .explorer.dark .hero h2 {
    color: #f1f5f9;
  }

  .hero p {
    font-size: 1.125rem;
    color: #64748b;
    font-weight: 400;
  }

  .explorer.dark .hero p {
    color: #94a3b8;
  }

  .search-section {
    max-width: 700px;
    margin: 0 auto 4rem;
  }

  .search-bar {
    display: flex;
    gap: 0.75rem;
    background: #ffffff;
    padding: 0.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
  }

  .search-bar:focus-within {
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
  }

  .explorer.dark .search-bar {
    background: #1e293b;
    border: 1px solid #334155;
  }

  .explorer.dark .search-bar:focus-within {
    border-color: #f1f5f9;
    box-shadow: 0 0 0 3px rgba(241, 245, 249, 0.1);
  }

  .search-error {
    margin-top: 1rem;
    padding: 1rem 1.25rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: #dc2626;
    text-align: center;
    font-size: 0.9375rem;
  }

  .explorer.dark .search-error {
    background: #450a0a;
    border-color: #7f1d1d;
    color: #fca5a5;
  }

  .search-bar input {
    flex: 1;
    border: none;
    padding: 1rem;
    font-size: 0.9375rem;
    background: transparent;
    color: #0f172a;
    outline: none;
  }

  .search-bar input:focus {
    color: var(--accent-primary);
  }

  .explorer.dark .search-bar input {
    color: #f1f5f9;
  }

  .search-bar input::placeholder {
    color: #94a3b8;
  }

  .btn-search {
    background: var(--accent-primary);
    color: #ffffff;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .explorer.dark .btn-search {
    background: var(--accent-primary);
    color: #ffffff;
  }

  .btn-search:hover {
    background: var(--accent-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .explorer.dark .btn-search:hover {
    background: var(--accent-primary-hover);
  }

  .btn-search:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-search:disabled:hover {
    transform: none;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-bottom: 4rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
  }

  .explorer.dark .stat-card {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #334155;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }

  .stat-label {
    color: #64748b;
    font-size: 0.9375rem;
    font-weight: 500;
  }

  .explorer.dark .stat-label {
    color: #94a3b8;
  }

  .recent-claims {
    margin-bottom: 4rem;
  }

  .recent-claims h3 {
    color: #0f172a;
    font-size: 1.875rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
  }

  .explorer.dark .recent-claims h3 {
    color: #f1f5f9;
  }

  .claims-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .claim-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .explorer.dark .claim-card {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #334155;
  }

  .claim-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    border-color: var(--accent-primary);
  }

  .explorer.dark .claim-card:hover {
    border-color: var(--accent-primary);
  }

  .claim-avatar {
    font-size: 2.5rem;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .explorer.dark .claim-avatar {
    background: #334155;
    border: 1px solid #475569;
  }

  .claim-info {
    flex: 1;
  }

  .claim-name {
    font-weight: 600;
    font-size: 1.0625rem;
    color: #0f172a;
    margin-bottom: 0.375rem;
  }

  .explorer.dark .claim-name {
    color: #f1f5f9;
  }

  .claim-address {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-size: 0.8125rem;
    color: #64748b;
    margin-bottom: 0.375rem;
  }

  .explorer.dark .claim-address {
    color: #94a3b8;
  }

  .claim-time {
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  .explorer.dark .claim-time {
    color: #64748b;
  }

  .claim-badge {
    background: var(--accent-primary-light);
    color: var(--accent-primary);
    padding: 0.5rem 0.875rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    border: 1px solid var(--accent-primary);
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .explorer.dark .claim-badge {
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
    border: 1px solid var(--accent-primary);
  }

  .info-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .info-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
  }

  .explorer.dark .info-card {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #334155;
  }

  .info-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
    border-color: var(--accent-secondary);
  }

  .info-card h4 {
    color: var(--accent-secondary);
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .info-card p {
    color: #64748b;
    line-height: 1.6;
    font-size: 0.9375rem;
  }

  .explorer.dark .info-card p {
    color: #94a3b8;
  }

  @media (max-width: 768px) {
    .hero h2 {
      font-size: 2rem;
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
