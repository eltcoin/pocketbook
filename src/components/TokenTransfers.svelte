<script>
  import Icon from './Icon.svelte';
  import { getTokenTransfers, formatTimestamp, formatAddress, getExplorerUrl, getTimeAgo } from '../utils/blockchainExplorer.js';

  let { provider, address, chainId } = $props();

  let transfers = $state([]);
  let loading = $state(true);
  let error = $state(null);
  let blockRange = $state(10000);

  async function loadTokenTransfers() {
    if (!provider || !address || !chainId) {
      loading = false;
      return;
    }

    loading = true;
    error = null;

    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - blockRange);

      transfers = await getTokenTransfers(provider, address, chainId, {
        fromBlock,
        toBlock: 'latest',
        limit: 100
      });
    } catch (err) {
      console.error('Error loading token transfers:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function refresh() {
    loadTokenTransfers();
  }

  // Reload when inputs change
  $effect(() => {
    if (provider && address && chainId) {
      loadTokenTransfers();
    }
  });
</script>

<div class="token-transfers">
  <div class="header">
    <h3>
      <Icon name="coins" size="20" />
      Token Transfers
    </h3>
    <div class="controls">
      <select bind:value={blockRange} onchange={refresh}>
        <option value={1000}>Last 1K blocks</option>
        <option value={5000}>Last 5K blocks</option>
        <option value={10000}>Last 10K blocks</option>
        <option value={50000}>Last 50K blocks</option>
      </select>
      <button onclick={refresh} class="refresh-btn" disabled={loading}>
        <Icon name="refresh" size="16" />
      </button>
    </div>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading token transfers...</p>
    </div>
  {:else if error}
    <div class="error">
      <Icon name="alert" size="24" />
      <p>Error loading token transfers: {error}</p>
      <button onclick={refresh}>Try Again</button>
    </div>
  {:else if transfers.length === 0}
    <div class="empty">
      <Icon name="inbox" size="48" />
      <p>No token transfers found in the last {blockRange.toLocaleString()} blocks</p>
      <button onclick={() => { blockRange = Math.min(blockRange * 2, 100000); refresh(); }}>
        Search More Blocks
      </button>
    </div>
  {:else}
    <div class="transfer-table">
      <table>
        <thead>
          <tr>
            <th>Txn Hash</th>
            <th>Age</th>
            <th>From</th>
            <th>Direction</th>
            <th>To</th>
            <th>Amount</th>
            <th>Token</th>
          </tr>
        </thead>
        <tbody>
          {#each transfers as transfer}
            <tr>
              <td class="hash">
                <a
                  href={getExplorerUrl(chainId, transfer.transactionHash, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={transfer.transactionHash}
                >
                  {formatAddress(transfer.transactionHash)}
                </a>
              </td>
              <td class="age" title={formatTimestamp(transfer.timestamp)}>
                {getTimeAgo(transfer.timestamp)}
              </td>
              <td class="address">
                <a
                  href={getExplorerUrl(chainId, transfer.from, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={transfer.from}
                >
                  {formatAddress(transfer.from)}
                </a>
              </td>
              <td class="direction">
                {#if transfer.type === 'sent'}
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
                <a
                  href={getExplorerUrl(chainId, transfer.to, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={transfer.to}
                >
                  {formatAddress(transfer.to)}
                </a>
              </td>
              <td class="amount">
                <strong>{parseFloat(transfer.valueFormatted).toLocaleString(undefined, { maximumFractionDigits: 6 })}</strong>
              </td>
              <td class="token">
                <div class="token-info">
                  <strong>{transfer.token.symbol}</strong>
                  <a
                    href={getExplorerUrl(chainId, transfer.token.address, 'token')}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="token-address"
                    title={transfer.token.address}
                  >
                    {formatAddress(transfer.token.address)}
                  </a>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Showing {transfers.length} token transfer{transfers.length !== 1 ? 's' : ''}</p>
    </div>
  {/if}
</div>

<style>
  .token-transfers {
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

  .transfer-table {
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

  .amount {
    font-weight: 600;
    text-align: right;
  }

  .token-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .token-address {
    font-size: 0.75rem;
    color: var(--text-muted, #999);
  }

  .footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color, #333);
    color: var(--text-muted, #999);
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .token-transfers {
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
