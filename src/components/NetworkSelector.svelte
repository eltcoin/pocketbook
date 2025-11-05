<script>
  import { multiChainStore, availableChains, primaryNetwork } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { getMainnetNetworks, getTestnetNetworks } from '../config/networks';

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
      alert(`Failed to switch network: ${result.error}`);
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
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.3);
    border-radius: 12px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .network-selector.dark .network-button {
    background: rgba(167, 139, 250, 0.1);
    border-color: rgba(167, 139, 250, 0.3);
  }

  .network-button:hover {
    background: rgba(102, 126, 234, 0.2);
    border-color: rgba(102, 126, 234, 0.5);
  }

  .network-selector.dark .network-button:hover {
    background: rgba(167, 139, 250, 0.2);
    border-color: rgba(167, 139, 250, 0.5);
  }

  .network-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .network-badge.unsupported {
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
    border-radius: 12px;
    padding: 0.5rem 1rem;
  }

  .network-badge.testnet .network-name {
    color: #ffc107;
  }

  .network-icon {
    font-size: 1.2rem;
  }

  .network-name {
    font-weight: 600;
    color: #667eea;
  }

  .network-selector.dark .network-name {
    color: #a78bfa;
  }

  .dropdown-arrow {
    font-size: 0.75rem;
    color: #667eea;
  }

  .network-selector.dark .dropdown-arrow {
    color: #a78bfa;
  }

  .network-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    min-width: 250px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
  }

  .network-dropdown.dark {
    background: #1a1a2e;
    border-color: rgba(167, 139, 250, 0.2);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .dropdown-section {
    padding: 0.5rem;
  }

  .section-header {
    padding: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #999;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .toggle-testnets {
    background: none;
    border: none;
    color: #667eea;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .network-selector.dark .toggle-testnets {
    color: #a78bfa;
  }

  .network-option {
    width: 100%;
    background: none;
    border: none;
    padding: 0.75rem 1rem;
    text-align: left;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #333;
  }

  .network-selector.dark .network-option {
    color: #e0e0e0;
  }

  .network-option:hover:not(:disabled) {
    background: rgba(102, 126, 234, 0.1);
  }

  .network-selector.dark .network-option:hover:not(:disabled) {
    background: rgba(167, 139, 250, 0.1);
  }

  .network-option.active {
    background: rgba(102, 126, 234, 0.15);
    font-weight: 600;
  }

  .network-selector.dark .network-option.active {
    background: rgba(167, 139, 250, 0.15);
  }

  .network-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .check-mark {
    color: #4caf50;
    font-weight: bold;
  }

  .not-deployed {
    font-size: 1rem;
  }

  .dropdown-divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.1);
    margin: 0.5rem 0;
  }

  .network-selector.dark .dropdown-divider {
    background: rgba(167, 139, 250, 0.2);
  }

  @media (max-width: 768px) {
    .network-dropdown {
      right: auto;
      left: 0;
    }
  }
</style>
