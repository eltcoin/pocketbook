<script>
  import { multiChainStore, availableChains, primaryNetwork } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { getMainnetNetworks, getTestnetNetworks } from '../config/networks';
  import { toastStore } from '../stores/toast';

  let darkMode = false;
  let connected = false;
  let primaryChainId = null;
  let primaryNetworkConfig = null;
  let showDropdown = false;
  let showTestnets = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    connected = value.connected;
    primaryChainId = value.primaryChainId;
  });

  primaryNetwork.subscribe(value => {
    primaryNetworkConfig = value;
  });

  const mainnetNetworks = getMainnetNetworks();
  const testnetNetworks = getTestnetNetworks();

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function closeDropdown() {
    showDropdown = false;
  }

  async function handleNetworkSwitch(network) {
    const result = await multiChainStore.switchNetwork(network.chainId);
    if (!result.success) {
      console.error('Failed to switch network:', result.error);
      toastStore.show(`Failed to switch network: ${result.error}`, 'error');
    } else {
      toastStore.show(`Switched to ${network.name}`, 'success');
    }
    closeDropdown();
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.network-selector')) {
      closeDropdown();
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="network-selector" class:dark={darkMode}>
  {#if connected && primaryNetworkConfig}
    <button class="network-button" on:click|stopPropagation={toggleDropdown}>
      <div class="network-badge" class:testnet={primaryNetworkConfig.isTestnet}>
        <span class="network-icon">🌐</span>
        <span class="network-name">{primaryNetworkConfig.shortName}</span>
      </div>
      <span class="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
    </button>

    {#if showDropdown}
      <div class="network-dropdown" class:dark={darkMode}>
        <div class="dropdown-section">
          <div class="section-header">Mainnets</div>
          {#each mainnetNetworks as network}
            <button 
              class="network-option" 
              class:active={primaryChainId === network.chainId}
              on:click|stopPropagation={() => handleNetworkSwitch(network)}
              disabled={!network.contractAddress}
            >
              <span class="network-name">{network.name}</span>
              {#if primaryChainId === network.chainId}
                <span class="check-mark">✓</span>
              {/if}
              {#if !network.contractAddress}
                <span class="not-deployed" title="Contract not deployed on this network">⚠️</span>
              {/if}
            </button>
          {/each}
        </div>

        <div class="dropdown-divider"></div>

        <div class="dropdown-section">
          <div class="section-header">
            Testnets
            <button class="toggle-testnets" on:click|stopPropagation={() => showTestnets = !showTestnets}>
              {showTestnets ? '−' : '+'}
            </button>
          </div>
          {#if showTestnets}
            {#each testnetNetworks as network}
              <button 
                class="network-option" 
                class:active={primaryChainId === network.chainId}
                on:click|stopPropagation={() => handleNetworkSwitch(network)}
                disabled={!network.contractAddress}
              >
                <span class="network-name">{network.name}</span>
                {#if primaryChainId === network.chainId}
                  <span class="check-mark">✓</span>
                {/if}
                {#if !network.contractAddress}
                  <span class="not-deployed" title="Contract not deployed on this network">⚠️</span>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  {:else if connected && !primaryNetworkConfig}
    <div class="network-badge unsupported" title="Unsupported network">
      <span class="network-icon">⚠️</span>
      <span class="network-name">Unknown</span>
    </div>
  {/if}
</div>

<style>
  .network-selector {
    position: relative;
    display: inline-block;
  }

  .network-button {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 0.5rem 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    transition: all 0.2s ease;
  }

  .network-selector.dark .network-button {
    background: #334155;
    border-color: #475569;
  }

  .network-button:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
  }

  .network-selector.dark .network-button:hover {
    background: #475569;
    border-color: #64748b;
  }

  .network-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .network-badge.unsupported {
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 10px;
    padding: 0.5rem 0.875rem;
  }

  .network-selector.dark .network-badge.unsupported {
    background: #422006;
    border-color: #78350f;
  }

  .network-badge.testnet .network-name {
    color: #ca8a04;
  }

  .network-icon {
    font-size: 1.125rem;
  }

  .network-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: #0f172a;
  }

  .network-selector.dark .network-name {
    color: #f1f5f9;
  }

  .dropdown-arrow {
    font-size: 0.625rem;
    color: #64748b;
  }

  .network-selector.dark .dropdown-arrow {
    color: #94a3b8;
  }

  .network-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
    min-width: 260px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
  }

  .network-dropdown.dark {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .dropdown-section {
    padding: 0.5rem;
  }

  .section-header {
    padding: 0.625rem 0.75rem;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .network-selector.dark .section-header {
    color: #94a3b8;
  }

  .toggle-testnets {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #0f172a;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0.125rem;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .network-selector.dark .toggle-testnets {
    background: #475569;
    border-color: #64748b;
    color: #f1f5f9;
  }

  .toggle-testnets:hover {
    background: #e2e8f0;
  }

  .network-selector.dark .toggle-testnets:hover {
    background: #64748b;
  }

  .network-option {
    width: 100%;
    background: none;
    border: none;
    padding: 0.75rem 0.875rem;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #0f172a;
    font-size: 0.9375rem;
  }

  .network-selector.dark .network-option {
    color: #f1f5f9;
  }

  .network-option:hover:not(:disabled) {
    background: #f1f5f9;
  }

  .network-selector.dark .network-option:hover:not(:disabled) {
    background: #334155;
  }

  .network-option.active {
    background: #f1f5f9;
    font-weight: 600;
  }

  .network-selector.dark .network-option.active {
    background: #334155;
  }

  .network-option:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .check-mark {
    color: #10b981;
    font-weight: bold;
    font-size: 1rem;
  }

  .not-deployed {
    font-size: 1rem;
  }

  .dropdown-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 0.5rem 0;
  }

  .network-selector.dark .dropdown-divider {
    background: #334155;
  }

  @media (max-width: 768px) {
    .network-dropdown {
      right: auto;
      left: 0;
    }
  }
</style>
