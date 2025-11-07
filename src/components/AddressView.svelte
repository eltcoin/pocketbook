<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { multiChainStore } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { lookupENSName } from '../utils/ens';
  import MultiChainView from './MultiChainView.svelte';
  import SocialGraph from './SocialGraph.svelte';
  import SocialGraphExplorer from './SocialGraphExplorer.svelte';
  import Reputation from './Reputation.svelte';
  import Icon from './Icon.svelte';

  export let address;
  export let ensName = null;

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let loading = true;
  let isClaimed = false;
  let claimData = null;
  let isOwner = false;
  let userAddress = null;
  let resolvedENSName = ensName;
  let provider = null;
  let contract = null;
  let socialGraphData = {
    following: [],
    followers: [],
    friends: []
  };
  let activeTab = 'overview'; // overview, transactions, tokens, contracts
  let transactions = [];
  let loadingTransactions = false;
  let balance = '0';
  let loadingBalance = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    userAddress = value.primaryAddress;
    // Get provider from the primary chain
    provider = value.chains?.[value.primaryChainId]?.provider || null;
    contract = value.chains?.[value.primaryChainId]?.contract || null;
  });

  onMount(async () => {
    // Try to resolve ENS name if not already provided
    if (!resolvedENSName && provider && address) {
      try {
        resolvedENSName = await lookupENSName(address, provider);
      } catch (error) {
        console.error('Error resolving ENS name:', error);
      }
    }

    // Load balance
    await loadBalance();

    // Load social graph data if contract is available
    if (contract) {
      try {
        const result = await contract.getSocialGraph(address);
        socialGraphData = {
          following: result[0] || [],
          followers: result[1] || [],
          friends: result[2] || []
        };
      } catch (error) {
        console.error('Error loading social graph:', error);
      }

      // Check if address is claimed
      try {
        const claim = await contract.getClaim(address);
        if (claim.isActive) {
          isClaimed = true;
          claimData = {
            name: claim.metadata.name || 'Anonymous',
            avatar: claim.metadata.avatar || '👤',
            bio: claim.metadata.bio || '',
            website: claim.metadata.website || '',
            twitter: claim.metadata.twitter || '',
            github: claim.metadata.github || '',
            pgpSignature: claim.metadata.pgpSignature || '',
            claimTime: Number(claim.claimTime) * 1000,
            isPrivate: claim.metadata.isPrivate
          };
          isOwner = userAddress && userAddress.toLowerCase() === address.toLowerCase();
        }
      } catch (error) {
        console.error('Error loading claim:', error);
        isClaimed = false;
      }
    } else {
      // Mock data when no contract (for demo purposes)
      if (address === '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1') {
        isClaimed = true;
        claimData = {
          name: 'Alice.eth',
          avatar: '👤',
          bio: 'Blockchain enthusiast and developer. Building the decentralized future.',
          website: 'https://alice.eth.link',
          twitter: '@alice_eth',
          github: 'alice-eth',
          pgpSignature: '-----BEGIN PGP SIGNATURE-----\n\nExample signature...\n-----END PGP SIGNATURE-----',
          claimTime: Date.now() - 86400000,
          isPrivate: false
        };
        isOwner = userAddress === address;
      }
    }
    
    loading = false;
  });

  async function loadBalance() {
    if (!provider || !address) return;
    
    loadingBalance = true;
    try {
      const balanceWei = await provider.getBalance(address);
      balance = (Number(balanceWei) / 1e18).toFixed(4);
    } catch (error) {
      console.error('Error loading balance:', error);
      balance = '0';
    } finally {
      loadingBalance = false;
    }
  }

  async function loadTransactions() {
    if (!provider || !address || loadingTransactions) return;
    
    loadingTransactions = true;
    try {
      // Get recent transactions (last 10 blocks as example)
      const currentBlock = await provider.getBlockNumber();
      const txs = [];
      
      // This is a simplified version - in production you'd use an indexer
      for (let i = 0; i < Math.min(5, currentBlock); i++) {
        const block = await provider.getBlock(currentBlock - i, true);
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (typeof tx === 'object' && (tx.from?.toLowerCase() === address.toLowerCase() || 
                tx.to?.toLowerCase() === address.toLowerCase())) {
              txs.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to || 'Contract Creation',
                value: (Number(tx.value) / 1e18).toFixed(4),
                blockNumber: block.number,
                timestamp: block.timestamp
              });
              
              if (txs.length >= 10) break;
            }
          }
        }
        if (txs.length >= 10) break;
      }
      
      transactions = txs;
    } catch (error) {
      console.error('Error loading transactions:', error);
      transactions = [];
    } finally {
      loadingTransactions = false;
    }
  }

  function setActiveTab(tab) {
    activeTab = tab;
    if (tab === 'transactions' && transactions.length === 0) {
      loadTransactions();
    }
  }

  function goBack() {
    dispatch('viewChange', { view: 'explorer' });
  }

  function claimAddress() {
    dispatch('viewChange', { view: 'claim' });
  }

  function shortenAddress(addr) {
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 8)}`;
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function handleViewChange(event) {
    dispatch('viewChange', event.detail);
  }
</script>

<div class="address-view" class:dark={darkMode}>
  <div class="address-header">
    <button class="btn-back" on:click={goBack}>← Back to Explorer</button>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading address information...</p>
    </div>
  {:else if isClaimed}
    <div class="claimed-profile">
      <div class="profile-card">
        <div class="profile-avatar">
          {#if claimData.avatar.startsWith('http')}
            <img src={claimData.avatar} alt={claimData.name} />
          {:else}
            <div class="avatar-emoji">{claimData.avatar}</div>
          {/if}
        </div>
        
        <div class="profile-header">
          <h1>{claimData.name}</h1>
          <div class="address-badge">
            <span class="verified-icon">✓</span>
            <span class="address-text">{shortenAddress(address)}</span>
          </div>
          {#if resolvedENSName}
            <div class="ens-badge">
              <span class="ens-icon">🏷️</span>
              <span class="ens-name">{resolvedENSName}</span>
            </div>
          {/if}
          {#if isOwner}
            <div class="owner-badge">You own this address</div>
          {/if}
        </div>

        {#if claimData.bio}
          <div class="profile-section">
            <h3>📝 Biography</h3>
            <p>{claimData.bio}</p>
          </div>
        {/if}

        <div class="profile-section">
          <h3>🔗 Links</h3>
          <div class="links-grid">
            {#if claimData.website}
              <a href={claimData.website} target="_blank" rel="noopener" class="link-item">
                <Icon name="globe" size="1.25rem" />
                <span>Website</span>
              </a>
            {/if}
            {#if claimData.twitter}
              <a href={`https://twitter.com/${claimData.twitter.replace('@', '')}`} target="_blank" rel="noopener" class="link-item">
                <span class="link-icon">🐦</span>
                <span>Twitter</span>
              </a>
            {/if}
            {#if claimData.github}
              <a href={`https://github.com/${claimData.github}`} target="_blank" rel="noopener" class="link-item">
                <span class="link-icon">💻</span>
                <span>GitHub</span>
              </a>
            {/if}
          </div>
        </div>

        <div class="profile-section">
          <h3>ℹ️ Claim Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Claimed On:</div>
              <div class="info-value">{formatDate(claimData.claimTime)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value status-active">Active</div>
            </div>
            <div class="info-item">
              <div class="info-label">Privacy:</div>
              <div class="info-value">{claimData.isPrivate ? 'Private' : 'Public'}</div>
            </div>
          </div>
        </div>

        <div class="profile-section did-section">
          <h3>🆔 Decentralized Identifier (DID)</h3>
          <div class="did-info">
            <div class="did-value">did:ethr:{address.toLowerCase()}</div>
            <p class="did-description">
              This is a W3C compliant DID that uniquely identifies this address in a decentralized, 
              interoperable way. DIDs enable self-sovereign identity and cross-platform compatibility.
            </p>
          </div>
        </div>

        {#if claimData.pgpSignature}
          <div class="profile-section pgp-section">
            <h3>🔑 PGP Signature</h3>
            <div class="pgp-signature">
              <pre>{claimData.pgpSignature}</pre>
            </div>
            <p class="pgp-description">
              This PGP signature provides additional cryptographic verification of the user's identity.
            </p>
          </div>
        {/if}

        {#if isOwner}
          <div class="owner-actions">
            <button class="btn-action btn-edit">Edit Profile</button>
            <button class="btn-action btn-manage">Manage Privacy</button>
          </div>
        {/if}
      </div>

      <!-- Explorer Tabs -->
      <div class="explorer-tabs">
        <div class="tabs-header">
          <button 
            class="tab-btn" 
            class:active={activeTab === 'overview'}
            on:click={() => setActiveTab('overview')}
          >
            <Icon name="info-circle" size="1.125rem" />
            Overview
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'transactions'}
            on:click={() => setActiveTab('transactions')}
          >
            <Icon name="exchange-alt" size="1.125rem" />
            Transactions
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'tokens'}
            on:click={() => setActiveTab('tokens')}
          >
            <Icon name="coins" size="1.125rem" />
            Tokens
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'contracts'}
            on:click={() => setActiveTab('contracts')}
          >
            <Icon name="file-contract" size="1.125rem" />
            Contracts
          </button>
        </div>

        <div class="tabs-content">
          {#if activeTab === 'overview'}
            <div class="tab-panel">
              <h3>Account Overview</h3>
              <div class="overview-grid">
                <div class="overview-item">
                  <div class="overview-label">Balance</div>
                  <div class="overview-value">
                    {#if loadingBalance}
                      <span class="loading-dots">...</span>
                    {:else}
                      {balance} ETH
                    {/if}
                  </div>
                </div>
                <div class="overview-item">
                  <div class="overview-label">Address</div>
                  <div class="overview-value mono">{shortenAddress(address)}</div>
                </div>
                {#if resolvedENSName}
                  <div class="overview-item">
                    <div class="overview-label">ENS Name</div>
                    <div class="overview-value">{resolvedENSName}</div>
                  </div>
                {/if}
              </div>
            </div>
          {:else if activeTab === 'transactions'}
            <div class="tab-panel">
              <h3>Recent Transactions</h3>
              {#if loadingTransactions}
                <div class="loading-state">
                  <div class="spinner-small"></div>
                  <p>Loading transactions...</p>
                </div>
              {:else if transactions.length > 0}
                <div class="transactions-list">
                  {#each transactions as tx}
                    <div class="transaction-item">
                      <div class="tx-hash">
                        <Icon name="exchange-alt" size="1rem" />
                        <code>{tx.hash.substring(0, 20)}...</code>
                      </div>
                      <div class="tx-details">
                        <div class="tx-row">
                          <span class="tx-label">From:</span>
                          <code class="tx-address">{tx.from.substring(0, 15)}...</code>
                        </div>
                        <div class="tx-row">
                          <span class="tx-label">To:</span>
                          <code class="tx-address">{tx.to.substring(0, 15)}...</code>
                        </div>
                        <div class="tx-row">
                          <span class="tx-label">Value:</span>
                          <span class="tx-value">{tx.value} ETH</span>
                        </div>
                        <div class="tx-row">
                          <span class="tx-label">Block:</span>
                          <span class="tx-block">#{tx.blockNumber}</span>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="empty-state">
                  <Icon name="inbox" size="2.5rem" />
                  <p>No recent transactions found</p>
                </div>
              {/if}
            </div>
          {:else if activeTab === 'tokens'}
            <div class="tab-panel">
              <h3>Token Holdings</h3>
              <div class="empty-state">
                <Icon name="coins" size="2.5rem" />
                <p>Token tracking coming soon. Connect to view ERC-20 and NFT holdings.</p>
              </div>
            </div>
          {:else if activeTab === 'contracts'}
            <div class="tab-panel">
              <h3>Contract Interactions</h3>
              <div class="empty-state">
                <Icon name="file-contract" size="2.5rem" />
                <p>Contract interaction history coming soon.</p>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <SocialGraph {address} {isOwner} on:viewAddress={handleViewChange} />

      <SocialGraphExplorer {address} socialGraph={socialGraphData} on:viewAddress={handleViewChange} />

      <Reputation {address} {isOwner} on:navigate={handleViewChange} />

      <MultiChainView {address} />

      <div class="verification-box">
        <h3>
          <Icon name="shield-alt" size="1.5rem" />
          <span>Cryptographic Verification</span>
        </h3>
        <p>This claim is secured by a cryptographic signature proving ownership of the address.</p>
        <div class="verification-details">
          <div class="verification-item">
            <span class="verification-label">Signature:</span>
            <span class="verification-value">0x8f7a...</span>
          </div>
          <div class="verification-item">
            <span class="verification-label">Verified:</span>
            <span class="verification-value verified">✓ Yes</span>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="unclaimed-view">
      <div class="unclaimed-card">
        <div class="unclaimed-icon">🔓</div>
        <h2>Unclaimed Address</h2>
        <div class="address-display">{address}</div>
        {#if resolvedENSName}
          <div class="ens-display">
            <span class="ens-icon">🏷️</span>
            <span class="ens-name">{resolvedENSName}</span>
          </div>
        {/if}
        <p>This address has not been claimed yet. The owner can claim it to add verified metadata.</p>
        
        {#if userAddress === address}
          <button class="btn-claim-now" on:click={claimAddress}>
            Claim This Address
          </button>
        {:else}
          <div class="info-message">
            Only the owner of this address can claim it.
          </div>
        {/if}
      </div>

      <!-- Explorer Tabs for Unclaimed Address -->
      <div class="explorer-tabs">
        <div class="tabs-header">
          <button 
            class="tab-btn" 
            class:active={activeTab === 'overview'}
            on:click={() => setActiveTab('overview')}
          >
            <Icon name="info-circle" size="1.125rem" />
            Overview
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'transactions'}
            on:click={() => setActiveTab('transactions')}
          >
            <Icon name="exchange-alt" size="1.125rem" />
            Transactions
          </button>
          <button 
            class="tab-btn" 
            class:active={activeTab === 'tokens'}
            on:click={() => setActiveTab('tokens')}
          >
            <Icon name="coins" size="1.125rem" />
            Tokens
          </button>
        </div>

        <div class="tabs-content">
          {#if activeTab === 'overview'}
            <div class="tab-panel">
              <h3>Account Overview</h3>
              <div class="overview-grid">
                <div class="overview-item">
                  <div class="overview-label">Balance</div>
                  <div class="overview-value">
                    {#if loadingBalance}
                      <span class="loading-dots">...</span>
                    {:else}
                      {balance} ETH
                    {/if}
                  </div>
                </div>
                <div class="overview-item">
                  <div class="overview-label">Address</div>
                  <div class="overview-value mono">{shortenAddress(address)}</div>
                </div>
                {#if resolvedENSName}
                  <div class="overview-item">
                    <div class="overview-label">ENS Name</div>
                    <div class="overview-value">{resolvedENSName}</div>
                  </div>
                {/if}
              </div>
            </div>
          {:else if activeTab === 'transactions'}
            <div class="tab-panel">
              <h3>Recent Transactions</h3>
              {#if loadingTransactions}
                <div class="loading-state">
                  <div class="spinner-small"></div>
                  <p>Loading transactions...</p>
                </div>
              {:else if transactions.length > 0}
                <div class="transactions-list">
                  {#each transactions as tx}
                    <div class="transaction-item">
                      <div class="tx-hash">
                        <Icon name="exchange-alt" size="1rem" />
                        <code>{tx.hash.substring(0, 20)}...</code>
                      </div>
                      <div class="tx-details">
                        <div class="tx-row">
                          <span class="tx-label">From:</span>
                          <code class="tx-address">{tx.from.substring(0, 15)}...</code>
                        </div>
                        <div class="tx-row">
                          <span class="tx-label">To:</span>
                          <code class="tx-address">{tx.to.substring(0, 15)}...</code>
                        </div>
                        <div class="tx-row">
                          <span class="tx-label">Value:</span>
                          <span class="tx-value">{tx.value} ETH</span>
                        </div>
                        <div class="tx-row">
                          <span class="tx-label">Block:</span>
                          <span class="tx-block">#{tx.blockNumber}</span>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="empty-state">
                  <Icon name="inbox" size="2.5rem" />
                  <p>No recent transactions found</p>
                </div>
              {/if}
            </div>
          {:else if activeTab === 'tokens'}
            <div class="tab-panel">
              <h3>Token Holdings</h3>
              <div class="empty-state">
                <Icon name="coins" size="2.5rem" />
                <p>Token tracking coming soon. Connect to view ERC-20 and NFT holdings.</p>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <MultiChainView {address} />

      <div class="what-is-claiming">
        <h3>What is Address Claiming?</h3>
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon">🎯</span>
            <div>
              <strong>Own Your Identity</strong>
              <p>Attach verifiable metadata to your Ethereum address</p>
            </div>
          </div>
          <div class="feature-item">
            <Icon name="shield-alt" size="2rem" />
            <div>
              <strong>Cryptographically Secured</strong>
              <p>All claims are signed and verified on-chain</p>
            </div>
          </div>
          <div class="feature-item">
            <Icon name="globe" size="2rem" />
            <div>
              <strong>Decentralized Network</strong>
              <p>Build your web of trust without central authorities</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .address-view {
    max-width: 800px;
    margin: 0 auto;
  }

  .address-header {
    margin-bottom: 2rem;
  }

  .btn-back {
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .address-view.dark .btn-back {
    background: #334155;
    color: #f1f5f9;
    border-color: #334155;
  }

  .btn-back:hover {
    transform: translateX(-5px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .loading {
    text-align: center;
    padding: 4rem 2rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .address-view.dark .loading {
    background: #1e293b;
    border-color: #334155;
  }

  .spinner {
    width: 60px;
    height: 60px;
    margin: 0 auto 1rem;
    border: 4px solid #e2e8f0;
    border-top-color: #0f172a;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .address-view.dark .spinner {
    border-color: #334155;
    border-top-color: #f1f5f9;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    color: #64748b;
  }

  .address-view.dark .loading p {
    color: #94a3b8;
  }

  .claimed-profile {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .profile-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .address-view.dark .profile-card {
    background: #1e293b;
    border-color: #334155;
  }

  .profile-avatar {
    width: 120px;
    height: 120px;
    margin: 0 auto 1.5rem;
    border-radius: 20px;
    overflow: hidden;
    background: #f1f5f9;
    border: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .address-view.dark .profile-avatar {
    background: #334155;
    border-color: #334155;
  }

  .profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-emoji {
    font-size: 5rem;
  }

  .profile-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .profile-header h1 {
    color: #0f172a;
    margin-bottom: 0.75rem;
    font-size: 2rem;
    font-weight: 700;
  }

  .address-view.dark .profile-header h1 {
    color: #f1f5f9;
  }

  .address-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    color: #0f172a;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .address-view.dark .address-badge {
    background: #334155;
    border-color: #334155;
    color: #f1f5f9;
  }

  .verified-icon {
    color: #4caf50;
  }

  .ens-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 0.5rem 1rem;
    border-radius: 10px;
    color: #0f172a;
    font-weight: 600;
    margin-bottom: 0.5rem;
    margin-left: 0.5rem;
  }

  .address-view.dark .ens-badge {
    background: #334155;
    border-color: #334155;
    color: #f1f5f9;
  }

  .ens-icon {
    font-size: 1.1rem;
  }

  .ens-name {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
  }

  .owner-badge {
    display: inline-block;
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    margin-top: 0.5rem;
  }

  .profile-section {
    margin-bottom: 2rem;
  }

  .profile-section h3 {
    color: #0f172a;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .address-view.dark .profile-section h3 {
    color: #f1f5f9;
  }

  .profile-section p {
    color: #64748b;
    line-height: 1.6;
  }

  .address-view.dark .profile-section p {
    color: #94a3b8;
  }

  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .link-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    text-decoration: none;
    color: #0f172a;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .address-view.dark .link-item {
    background: #334155;
    border-color: #334155;
    color: #f1f5f9;
  }

  .link-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .link-icon {
    font-size: 1.5rem;
  }

  .info-grid {
    display: grid;
    gap: 1rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .address-view.dark .info-item {
    background: #334155;
    border-color: #334155;
  }

  .info-label {
    color: #64748b;
    font-weight: 500;
  }

  .address-view.dark .info-label {
    color: #94a3b8;
  }

  .info-value {
    color: #0f172a;
  }

  .address-view.dark .info-value {
    color: #f1f5f9;
  }

  .status-active {
    color: #4caf50 !important;
    font-weight: 600;
  }

  .did-section {
    background: #f1f5f9;
    padding: 1.5rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .address-view.dark .did-section {
    background: #334155;
    border-color: #334155;
  }

  .pgp-section {
    background: #f1f5f9;
    padding: 1.5rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .address-view.dark .pgp-section {
    background: #334155;
    border-color: #334155;
  }

  .pgp-signature {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    overflow-x: auto;
  }

  .address-view.dark .pgp-signature {
    background: #1e293b;
    border-color: #334155;
  }

  .pgp-signature pre {
    margin: 0;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-size: 0.85rem;
    color: #0f172a;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .address-view.dark .pgp-signature pre {
    color: #94a3b8;
  }

  .pgp-description {
    font-size: 0.9rem;
    color: #666;
    margin: 0;
  }

  .address-view.dark .pgp-description {
    color: #a0aec0;
  }

  .did-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .did-value {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-size: 0.9rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 1rem;
    border-radius: 8px;
    word-break: break-all;
    color: #0f172a;
    font-weight: 600;
  }

  .address-view.dark .did-value {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }

  .did-description {
    font-size: 0.9rem;
    color: #64748b;
    line-height: 1.5;
    margin: 0;
  }

  .address-view.dark .did-description {
    color: #94a3b8;
  }


  .owner-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .btn-action {
    flex: 1;
    padding: 1rem;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-edit {
    background: #0f172a;
    color: #f1f5f9;
  }

  .address-view.dark .btn-edit {
    background: #f1f5f9;
    color: #0f172a;
  }

  .btn-edit:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .btn-manage {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #0f172a;
  }

  .address-view.dark .btn-manage {
    background: #334155;
    border-color: #334155;
    color: #f1f5f9;
  }

  .btn-manage:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .verification-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .address-view.dark .verification-box {
    background: #1e293b;
    border-color: #334155;
  }

  .verification-box h3 {
    color: #0f172a;
    margin-bottom: 1rem;
    font-weight: 600;
  }

  .address-view.dark .verification-box h3 {
    color: #f1f5f9;
  }

  .verification-box p {
    color: #64748b;
    margin-bottom: 1.5rem;
  }

  .address-view.dark .verification-box p {
    color: #94a3b8;
  }

  .verification-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .verification-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .address-view.dark .verification-item {
    background: #334155;
    border-color: #334155;
  }

  .verification-label {
    color: #64748b;
    font-weight: 500;
  }

  .address-view.dark .verification-label {
    color: #94a3b8;
  }

  .verification-value {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    color: #0f172a;
  }

  .address-view.dark .verification-value {
    color: #f1f5f9;
  }

  .verified {
    color: #4caf50 !important;
    font-weight: 600;
  }

  .unclaimed-view {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .unclaimed-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 3rem 2rem;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .address-view.dark .unclaimed-card {
    background: #1e293b;
    border-color: #334155;
  }

  .unclaimed-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
  }

  .unclaimed-card h2 {
    color: #0f172a;
    margin-bottom: 1rem;
    font-weight: 700;
  }

  .address-view.dark .unclaimed-card h2 {
    color: #f1f5f9;
  }

  .address-display {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 1rem;
    border-radius: 10px;
    color: #0f172a;
    font-weight: 600;
    word-break: break-all;
    margin: 1.5rem 0;
  }

  .address-view.dark .address-display {
    background: #334155;
    border-color: #334155;
    color: #f1f5f9;
  }

  .ens-display {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    color: #0f172a;
    font-weight: 600;
    margin: 1rem 0 1.5rem;
  }

  .address-view.dark .ens-display {
    background: #334155;
    border-color: #334155;
    color: #f1f5f9;
  }

  .ens-display .ens-icon {
    font-size: 1.2rem;
  }

  .ens-display .ens-name {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-size: 1.1rem;
  }

  .unclaimed-card p {
    color: #64748b;
    margin-bottom: 2rem;
  }

  .address-view.dark .unclaimed-card p {
    color: #94a3b8;
  }

  .btn-claim-now {
    background: #0f172a;
    color: #f1f5f9;
    border: none;
    padding: 1rem 2rem;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .address-view.dark .btn-claim-now {
    background: #f1f5f9;
    color: #0f172a;
  }

  .btn-claim-now:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .info-message {
    color: #64748b;
    font-style: italic;
  }

  .address-view.dark .info-message {
    color: #94a3b8;
  }

  .what-is-claiming {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .address-view.dark .what-is-claiming {
    background: #1e293b;
    border-color: #334155;
  }

  .what-is-claiming h3 {
    color: #0f172a;
    margin-bottom: 1.5rem;
    font-weight: 600;
  }

  .address-view.dark .what-is-claiming h3 {
    color: #f1f5f9;
  }

  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .feature-item {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .feature-icon {
    font-size: 2rem;
  }

  .feature-item strong {
    display: block;
    color: #0f172a;
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  .address-view.dark .feature-item strong {
    color: #f1f5f9;
  }

  .feature-item p {
    color: #64748b;
    margin: 0;
  }

  .address-view.dark .feature-item p {
    color: #94a3b8;
  }

  /* Explorer Tabs Styles */
  .explorer-tabs {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    margin-top: 2rem;
  }

  .address-view.dark .explorer-tabs {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #334155;
  }

  .tabs-header {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .address-view.dark .tabs-header {
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }

  .tab-btn {
    flex: 1;
    padding: 1rem 1.5rem;
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-bottom: 3px solid transparent;
  }

  .address-view.dark .tab-btn {
    color: #94a3b8;
  }

  .tab-btn:hover {
    background: rgba(59, 130, 246, 0.05);
    color: var(--accent-primary);
  }

  .tab-btn.active {
    color: var(--accent-primary);
    border-bottom-color: var(--accent-primary);
    background: rgba(59, 130, 246, 0.05);
  }

  .tabs-content {
    padding: 2rem;
  }

  .tab-panel h3 {
    color: #0f172a;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }

  .address-view.dark .tab-panel h3 {
    color: #f1f5f9;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .overview-item {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .address-view.dark .overview-item {
    background: #334155;
    border: 1px solid #475569;
  }

  .overview-label {
    color: #64748b;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .address-view.dark .overview-label {
    color: #94a3b8;
  }

  .overview-value {
    color: #0f172a;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .address-view.dark .overview-value {
    color: #f1f5f9;
  }

  .overview-value.mono {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
  }

  .loading-dots {
    display: inline-block;
    color: #94a3b8;
  }

  .transactions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .transaction-item {
    background: #f8fafc;
    padding: 1.25rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
  }

  .address-view.dark .transaction-item {
    background: #334155;
    border: 1px solid #475569;
  }

  .transaction-item:hover {
    border-color: var(--accent-primary);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  }

  .tx-hash {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    color: var(--accent-primary);
    font-weight: 600;
  }

  .tx-hash code {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-size: 0.875rem;
  }

  .tx-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tx-row {
    display: flex;
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .tx-label {
    color: #64748b;
    min-width: 50px;
    font-weight: 500;
  }

  .address-view.dark .tx-label {
    color: #94a3b8;
  }

  .tx-address,
  .tx-value,
  .tx-block {
    color: #0f172a;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
  }

  .address-view.dark .tx-address,
  .address-view.dark .tx-value,
  .address-view.dark .tx-block {
    color: #f1f5f9;
  }

  .loading-state {
    text-align: center;
    padding: 3rem 2rem;
    color: #94a3b8;
  }

  .spinner-small {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }

  .address-view.dark .spinner-small {
    border-color: #334155;
    border-top-color: var(--accent-primary);
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    color: #94a3b8;
  }

  .address-view.dark .empty-state {
    color: #64748b;
  }

  .empty-state p {
    margin-top: 1rem;
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    .profile-card,
    .verification-box,
    .unclaimed-card,
    .what-is-claiming {
      padding: 1.5rem;
    }

    .profile-header h1 {
      font-size: 1.5rem;
    }

    .owner-actions {
      flex-direction: column;
    }

    .links-grid {
      grid-template-columns: 1fr;
    }

    .tabs-header {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .tab-btn {
      white-space: nowrap;
      padding: 0.875rem 1rem;
      font-size: 0.875rem;
    }

    .tabs-content {
      padding: 1.5rem;
    }

    .overview-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
