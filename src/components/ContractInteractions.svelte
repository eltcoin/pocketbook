<script>
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { getContractInteractions, formatTimestamp, formatAddress, getExplorerUrl } from '../utils/blockchainExplorer.js';

  export let provider;
  export let address;
  export let chainId;

  let interactions = $state([]);
  let loading = $state(true);
  let error = $state(null);
  let blockRange = $state(5000);

  async function loadContractInteractions() {
    if (!provider || !address || !chainId) {
      loading = false;
      return;
    }

    loading = true;
    error = null;

    try {
      interactions = await getContractInteractions(provider, address, chainId, {
        limit: 50,
        blockRange
      });
    } catch (err) {
      console.error('Error loading contract interactions:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function refresh() {
    loadContractInteractions();
  }

  function getFunctionBadgeClass(functionName) {
    if (functionName.includes('transfer')) return 'transfer';
    if (functionName.includes('approve')) return 'approve';
    if (functionName.includes('mint')) return 'mint';
    if (functionName.includes('withdraw') || functionName.includes('deposit')) return 'financial';
    return 'default';
  }

  onMount(() => {
    loadContractInteractions();
  });

  // Reload when inputs change
  $effect(() => {
    if (provider && address && chainId) {
      loadContractInteractions();
    }
  });
</script>

<div class="contract-interactions">
  <div class="header">
    <h3>
      <Icon name="code" size="20" />
      Contract Interactions
    </h3>
    <div class="controls">
      <select bind:value={blockRange} onchange={refresh}>
        <option value={1000}>Last 1K blocks</option>
        <option value={5000}>Last 5K blocks</option>
        <option value={10000}>Last 10K blocks</option>
      </select>
      <button onclick={refresh} class="refresh-btn" disabled={loading}>
        <Icon name="refresh" size="16" />
      </button>
    </div>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading contract interactions...</p>
    </div>
  {:else if error}
    <div class="error">
      <Icon name="alert" size="24" />
      <p>Error loading contract interactions: {error}</p>
      <button onclick={refresh}>Try Again</button>
    </div>
  {:else if interactions.length === 0}
    <div class="empty">
      <Icon name="inbox" size="48" />
      <p>No contract interactions found in the last {blockRange.toLocaleString()} blocks</p>
      <button onclick={() => { blockRange = blockRange * 2; refresh(); }}>
        Search More Blocks
      </button>
    </div>
  {:else}
    <div class="interaction-table">
      <table>
        <thead>
          <tr>
            <th>Txn Hash</th>
            <th>Block</th>
            <th>Age</th>
            <th>Contract</th>
            <th>Function</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {#each interactions as interaction}
            <tr>
              <td class="hash">
                <a
                  href={getExplorerUrl(chainId, interaction.hash, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={interaction.hash}
                >
                  {formatAddress(interaction.hash)}
                </a>
              </td>
              <td class="block">
                <a
                  href={getExplorerUrl(chainId, interaction.blockNumber, 'block')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {interaction.blockNumber.toLocaleString()}
                </a>
              </td>
              <td class="age" title={formatTimestamp(interaction.timestamp)}>
                {getTimeAgo(interaction.timestamp)}
              </td>
              <td class="address">
                <a
                  href={getExplorerUrl(chainId, interaction.contractAddress, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={interaction.contractAddress}
                >
                  {formatAddress(interaction.contractAddress)}
                </a>
              </td>
              <td class="function">
                {#if interaction.decodedFunction}
                  <span class="function-badge {getFunctionBadgeClass(interaction.decodedFunction.functionName)}">
                    {interaction.decodedFunction.functionName}
                  </span>
                  <button
                    class="view-data-btn"
                    title="View raw data"
                    onclick={() => {
                      alert(`Raw Data:\n${interaction.data}\n\nSelector: ${interaction.decodedFunction.selector}`);
                    }}
                  >
                    <Icon name="info" size="14" />
                  </button>
                {:else}
                  <span class="function-badge default">Unknown</span>
                {/if}
              </td>
              <td class="value">
                {#if parseFloat(interaction.valueFormatted) > 0}
                  <strong>{parseFloat(interaction.valueFormatted).toFixed(6)}</strong>
                {:else}
                  0
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Showing {interactions.length} contract interaction{interactions.length !== 1 ? 's' : ''}</p>
    </div>
  {/if}
</div>

<style>
  .contract-interactions {
    background: var(--card-bg, #1a1a1a);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .header h3 {
    margin: 0;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .controls select {
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid var(--border-color, #333);
    background: var(--input-bg, #2a2a2a);
    color: var(--text-color, #ffffff);
    cursor: pointer;
  }

  .refresh-btn {
    padding: 0.5rem;
    border: none;
    background: var(--button-bg, #3a3a3a);
    color: var(--text-color, #ffffff);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .refresh-btn:hover:not(:disabled) {
    background: var(--button-hover-bg, #4a4a4a);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading,
  .error,
  .empty {
    text-align: center;
    padding: 3rem 1rem;
  }

  .loading .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color, #333);
    border-top-color: var(--primary-color, #646cff);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error {
    color: var(--error-color, #ff4444);
  }

  .error button,
  .empty button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    border: none;
    background: var(--primary-color, #646cff);
    color: white;
    border-radius: 6px;
    cursor: pointer;
  }

  .error button:hover,
  .empty button:hover {
    background: var(--primary-hover-color, #535bf2);
  }

  .empty {
    color: var(--text-muted, #999);
  }

  .interaction-table {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  thead {
    border-bottom: 2px solid var(--border-color, #333);
  }

  th {
    text-align: left;
    padding: 0.75rem 0.5rem;
    font-weight: 600;
    color: var(--text-muted, #999);
    white-space: nowrap;
  }

  td {
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid var(--border-color, #333);
  }

  tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--hover-bg, rgba(255, 255, 255, 0.05));
  }

  a {
    color: var(--link-color, #646cff);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .hash,
  .address {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.813rem;
  }

  .function {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .function-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .function-badge.transfer {
    background: var(--badge-transfer-bg, #3a4a7a);
    color: var(--badge-transfer-color, #a0b0e0);
  }

  .function-badge.approve {
    background: var(--badge-approve-bg, #4a3a7a);
    color: var(--badge-approve-color, #c0a0e0);
  }

  .function-badge.mint {
    background: var(--badge-mint-bg, #3a6a4a);
    color: var(--badge-mint-color, #a0e0b0);
  }

  .function-badge.financial {
    background: var(--badge-financial-bg, #6a4a3a);
    color: var(--badge-financial-color, #e0b0a0);
  }

  .function-badge.default {
    background: var(--badge-default-bg, #3a3a3a);
    color: var(--badge-default-color, #a0a0a0);
  }

  .view-data-btn {
    padding: 0.25rem;
    border: none;
    background: transparent;
    color: var(--text-muted, #999);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .view-data-btn:hover {
    color: var(--text-color, #ffffff);
  }

  .value {
    font-weight: 600;
    text-align: right;
  }

  .footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color, #333);
    color: var(--text-muted, #999);
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .contract-interactions {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .controls {
      justify-content: space-between;
    }

    table {
      font-size: 0.75rem;
    }

    th,
    td {
      padding: 0.5rem 0.25rem;
    }

    .function {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>

<script context="module">
  function getTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';

    const now = Math.floor(Date.now() / 1000);
    const seconds = now - timestamp;

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
</script>
