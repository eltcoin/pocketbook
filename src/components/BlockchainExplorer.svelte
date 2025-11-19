<script>
  import TransactionList from './TransactionList.svelte';
  import TokenTransfers from './TokenTransfers.svelte';
  import ContractInteractions from './ContractInteractions.svelte';
  import Icon from './Icon.svelte';

  let { provider, address, chainId } = $props();

  let activeTab = $state('transactions');

  const tabs = [
    { id: 'transactions', label: 'Transactions', icon: 'activity' },
    { id: 'tokens', label: 'Token Transfers', icon: 'coins' },
    { id: 'contracts', label: 'Contract Interactions', icon: 'code' }
  ];

  function setActiveTab(tabId) {
    activeTab = tabId;
  }
</script>

<div class="blockchain-explorer">
  <div class="explorer-header">
    <h2>
      <Icon name="activity" size="24" />
      Blockchain Activity
    </h2>
    <p class="description">
      View transactions, token transfers, and contract interactions for this address
    </p>
  </div>

  <div class="tabs">
    {#each tabs as tab}
      <button
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => setActiveTab(tab.id)}
      >
        <Icon name={tab.icon} size="18" />
        <span>{tab.label}</span>
      </button>
    {/each}
  </div>

  <div class="tab-content">
    {#if activeTab === 'transactions'}
      <TransactionList {provider} {address} {chainId} />
    {:else if activeTab === 'tokens'}
      <TokenTransfers {provider} {address} {chainId} />
    {:else if activeTab === 'contracts'}
      <ContractInteractions {provider} {address} {chainId} />
    {/if}
  </div>
</div>

<style>
  .blockchain-explorer {
    margin: 2rem 0;
  }

  .explorer-header {
    margin-bottom: 1.5rem;
  }

  .explorer-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .description {
    margin: 0;
    color: var(--text-muted, #999);
    font-size: 0.938rem;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 2px solid var(--border-color, #333);
    margin-bottom: 1.5rem;
    overflow-x: auto;
  }

  .tab {
    padding: 0.75rem 1.25rem;
    border: none;
    background: transparent;
    color: var(--text-muted, #999);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.938rem;
    font-weight: 500;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s ease;
  }

  .tab:hover {
    color: var(--text-color, #ffffff);
    background: var(--hover-bg, rgba(255, 255, 255, 0.05));
  }

  .tab.active {
    color: var(--primary-color, #646cff);
    border-bottom-color: var(--primary-color, #646cff);
  }

  .tab-content {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .explorer-header h2 {
      font-size: 1.5rem;
    }

    .tabs {
      gap: 0.25rem;
    }

    .tab {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
    }

    .tab span {
      display: none;
    }

    /* Show icon only on mobile */
    .tab {
      justify-content: center;
      min-width: 60px;
    }
  }
</style>
