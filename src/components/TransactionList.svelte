<script>
  import Icon from './Icon.svelte';
  import { getTransactions, formatTimestamp, formatAddress, getExplorerUrl, getTimeAgo } from '../utils/blockchainExplorer.js';
  import { ethers } from 'ethers';

  let { provider, address, chainId } = $props();

  let transactions = $state([]);
  let loading = $state(true);
  let error = $state(null);
  let blockRange = $state(5000);

  async function loadTransactions() {
    if (!provider || !address || !chainId) {
      loading = false;
      return;
    }

    loading = true;
    error = null;

    try {
      transactions = await getTransactions(provider, address, chainId, {
        limit: 50,
        blockRange
      });
    } catch (err) {
      console.error('Error loading transactions:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function refresh() {
    loadTransactions();
  }

  // Reload when inputs change
  $effect(() => {
    if (provider && address && chainId) {
      loadTransactions();
    }
  });
</script>

<div class="transaction-list">
  <div class="header">
    <h3>
      <Icon name="activity" size="20" />
      Transactions
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
      <p>Loading transactions...</p>
    </div>
  {:else if error}
    <div class="error">
      <Icon name="alert" size="24" />
      <p>Error loading transactions: {error}</p>
      <button onclick={refresh}>Try Again</button>
    </div>
  {:else if transactions.length === 0}
    <div class="empty">
      <Icon name="inbox" size="48" />
      <p>No transactions found in the last {blockRange.toLocaleString()} blocks</p>
      <button onclick={() => { blockRange = blockRange * 2; refresh(); }}>
        Search More Blocks
      </button>
    </div>
  {:else}
    <div class="transaction-table">
      <table>
        <thead>
          <tr>
            <th>Txn Hash</th>
            <th>Block</th>
            <th>Age</th>
            <th>From</th>
            <th>Direction</th>
            <th>To</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {#each transactions as tx}
            <tr>
              <td class="hash">
                <a
                  href={getExplorerUrl(chainId, tx.hash, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={tx.hash}
                >
                  {formatAddress(tx.hash)}
                </a>
                {#if tx.isContractInteraction}
                  <span class="badge contract">Contract</span>
                {/if}
              </td>
              <td class="block">
                <a
                  href={getExplorerUrl(chainId, tx.blockNumber, 'block')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tx.blockNumber.toLocaleString()}
                </a>
              </td>
              <td class="age" title={formatTimestamp(tx.timestamp)}>
                {getTimeAgo(tx.timestamp)}
              </td>
              <td class="address">
                <a
                  href={getExplorerUrl(chainId, tx.from, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={tx.from}
                >
                  {formatAddress(tx.from)}
                </a>
              </td>
              <td class="direction">
                {#if tx.type === 'sent'}
                  <span class="out">
                    <Icon name="arrow-up-right" size="16" />
                    OUT
                  </span>
                {:else}
                  <span class="in">
                    <Icon name="arrow-down-left" size="16" />
                    IN
                  </span>
                {/if}
              </td>
              <td class="address">
                {#if tx.to}
                  <a
                    href={getExplorerUrl(chainId, tx.to, 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={tx.to}
                  >
                    {formatAddress(tx.to)}
                  </a>
                {:else}
                  <span class="badge">Contract Creation</span>
                {/if}
              </td>
              <td class="value">
                {#if parseFloat(tx.valueFormatted) > 0}
                  <strong>{parseFloat(tx.valueFormatted).toFixed(6)}</strong>
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
      <p>Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
    </div>
  {/if}
</div>

<style>
  .transaction-list {
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

  .transaction-table {
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

  .badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 0.5rem;
  }

  .badge.contract {
    background: var(--badge-contract-bg, #3a5a7a);
    color: var(--badge-contract-color, #a0c0e0);
  }

  .direction .out {
    color: var(--error-color, #ff6b6b);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .direction .in {
    color: var(--success-color, #51cf66);
    display: flex;
    align-items: center;
    gap: 0.25rem;
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
    .transaction-list {
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
  }
</style>
