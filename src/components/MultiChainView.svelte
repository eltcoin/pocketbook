<script>
  import { onMount } from 'svelte';
  import { multiChainStore, availableChains } from '../stores/multichain';
  import { themeStore } from '../stores/theme';

  export let address;

  let darkMode = false;
  let loading = true;
  let chainClaims = [];
  let connected = false;
  let availableChainsList = [];
  let lastLoadedAddress = null;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    connected = value.connected;
  });

  availableChains.subscribe(value => {
    availableChainsList = value;
  });

  onMount(async () => {
    if (connected && address) {
      await loadClaimsAcrossChains();
    }
  });

  async function loadClaimsAcrossChains() {
    loading = true;
    lastLoadedAddress = address;
    try {
      const claims = await multiChainStore.getClaimsAcrossChains(address);
      chainClaims = claims;
    } catch (error) {
      console.error('Error loading multi-chain claims:', error);
    } finally {
      loading = false;
    }
  }

  // Only reload if connected, address exists, and it's different from the last loaded address
  $: if (connected && address && address !== lastLoadedAddress) {
    loadClaimsAcrossChains();
  }
</script>

<div class="multichain-view" class:dark={darkMode}>
  <div class="multichain-header">
    <h3>🌐 Multi-Chain Presence</h3>
    <p>This address exists on multiple blockchain networks</p>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Scanning blockchains...</p>
    </div>
  {:else if chainClaims.length > 0}
    <div class="chains-grid">
      {#each chainClaims as chainClaim}
        <div class="chain-card" class:dark={darkMode}>
          <div class="chain-header">
            <div class="chain-badge">
              <span class="chain-icon">🔗</span>
              <span class="chain-name">{chainClaim.network}</span>
            </div>
            <div class="claim-status active">✓ Active</div>
          </div>
          
          <div class="claim-details">
            <div class="detail-row">
              <span class="label">Name:</span>
              <span class="value">{chainClaim.claim.name}</span>
            </div>
            {#if chainClaim.claim.avatar}
              <div class="detail-row">
                <span class="label">Avatar:</span>
                <span class="value avatar">{chainClaim.claim.avatar}</span>
              </div>
            {/if}
            {#if chainClaim.claim.bio}
              <div class="detail-row">
                <span class="label">Bio:</span>
                <span class="value">{chainClaim.claim.bio}</span>
              </div>
            {/if}
            <div class="detail-row">
              <span class="label">Claimed:</span>
              <span class="value">{new Date(Number(chainClaim.claim.claimTime) * 1000).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="no-claims">
      <div class="no-claims-icon">🔍</div>
      <p>No claims found across {availableChainsList.length} available chains</p>
      <p class="hint">This address has not been claimed on any configured blockchain networks</p>
    </div>
  {/if}

  {#if !loading && availableChainsList.length > 0}
    <div class="chain-summary">
      <p>
        Scanned <strong>{availableChainsList.length}</strong> blockchain{availableChainsList.length !== 1 ? 's' : ''}
        • Found <strong>{chainClaims.length}</strong> claim{chainClaims.length !== 1 ? 's' : ''}
      </p>
    </div>
  {/if}
</div>

<style>
  .multichain-view {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    transition: all 0.3s ease;
  }

  .multichain-view.dark {
    background: #1e293b;
    border-color: #334155;
  }

  .multichain-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .multichain-header h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
  }

  .multichain-view.dark .multichain-header h3 {
    color: #f1f5f9;
  }

  .multichain-header p {
    margin: 0;
    color: #64748b;
  }

  .multichain-view.dark .multichain-header p {
    color: #94a3b8;
  }

  .loading-container {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    border: 3px solid #e2e8f0;
    border-top-color: #0f172a;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  .multichain-view.dark .spinner {
    border-color: #334155;
    border-top-color: #f1f5f9;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .chains-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .chain-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 1.5rem;
    transition: all 0.2s ease;
  }

  .chain-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .chain-card.dark {
    background: #0f172a;
    border-color: #334155;
  }

  .chain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .multichain-view.dark .chain-header {
    border-bottom-color: #334155;
  }

  .chain-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .chain-icon {
    font-size: 1.5rem;
  }

  .chain-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 1.1rem;
  }

  .multichain-view.dark .chain-name {
    color: #f1f5f9;
  }

  .claim-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .claim-status.active {
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
  }

  .claim-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-row {
    display: flex;
    gap: 0.5rem;
  }

  .detail-row .label {
    font-weight: 500;
    color: #64748b;
    min-width: 80px;
  }

  .multichain-view.dark .detail-row .label {
    color: #94a3b8;
  }

  .detail-row .value {
    color: #0f172a;
    flex: 1;
  }

  .multichain-view.dark .detail-row .value {
    color: #f1f5f9;
  }

  .detail-row .value.avatar {
    font-size: 1.5rem;
  }

  .no-claims {
    text-align: center;
    padding: 3rem;
    color: #64748b;
  }

  .multichain-view.dark .no-claims {
    color: #94a3b8;
  }

  .no-claims-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .no-claims p {
    margin: 0.5rem 0;
  }

  .no-claims .hint {
    font-size: 0.9rem;
    color: #64748b;
  }

  .multichain-view.dark .no-claims .hint {
    color: #94a3b8;
  }

  .chain-summary {
    text-align: center;
    padding: 1rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    color: #64748b;
  }

  .multichain-view.dark .chain-summary {
    background: #334155;
    border-color: #334155;
    color: #94a3b8;
  }

  .chain-summary strong {
    color: #0f172a;
  }

  .multichain-view.dark .chain-summary strong {
    color: #f1f5f9;
  }

  @media (max-width: 768px) {
    .chains-grid {
      grid-template-columns: 1fr;
    }

    .multichain-view {
      padding: 1rem;
    }
  }
</style>
