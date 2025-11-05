<script>
  import { createEventDispatcher } from 'svelte';
  import { multiChainStore, primaryNetwork } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import NetworkSelector from './NetworkSelector.svelte';

  const dispatch = createEventDispatcher();
  
  let connected = false;
  let address = null;
  let darkMode = false;

  multiChainStore.subscribe(value => {
    connected = value.connected;
    address = value.primaryAddress;
  });

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  async function handleConnect() {
    const result = await multiChainStore.connect();
    if (result.success) {
      console.log('Connected:', result.address);
      console.log('Available chains:', result.availableChains);
    } else {
      alert('Failed to connect: ' + result.error);
    }
  }

  function handleDisconnect() {
    multiChainStore.disconnect();
  }

  function navigateTo(view) {
    dispatch('viewChange', { view });
  }

  function toggleTheme() {
    themeStore.toggle();
  }

  function shortenAddress(addr) {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }
</script>

<header class:dark={darkMode}>
  <div class="header-content">
    <div class="logo" on:click={() => navigateTo('explorer')}>
      <img src="https://pbs.twimg.com/media/DOZbENEXkAA2EMr.png" alt="Pocketbook" />
      <h1>Pocketbook</h1>
    </div>

    <nav>
      <button class="nav-btn" on:click={() => navigateTo('explorer')}>
        Explorer
      </button>
      <button class="nav-btn" on:click={() => navigateTo('claim')}>
        Claim Address
      </button>
      <button class="nav-btn admin-btn" on:click={() => navigateTo('admin')}>
        🛠️ Admin
      </button>
    </nav>

    <div class="controls">
      <button class="theme-toggle" on:click={toggleTheme} title="Toggle theme">
        {darkMode ? '☀️' : '🌙'}
      </button>
      
      {#if connected}
        <NetworkSelector />
        <div class="wallet-info">
          <span class="address">{shortenAddress(address)}</span>
          <button class="btn-disconnect" on:click={handleDisconnect}>
            Disconnect
          </button>
        </div>
      {:else}
        <button class="btn-connect" on:click={handleConnect}>
          Connect Wallet
        </button>
      {/if}
    </div>
  </div>
</header>

<style>
  header {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
    transition: all 0.3s ease;
  }

  header.dark {
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .logo:hover {
    opacity: 0.8;
  }

  .logo img {
    height: 44px;
    width: 44px;
    border-radius: 10px;
  }

  .logo h1 {
    margin: 0;
    font-size: 1.375rem;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.025em;
  }

  header.dark .logo h1 {
    color: #f1f5f9;
  }

  nav {
    display: flex;
    gap: 0.5rem;
  }

  .nav-btn {
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 0.9375rem;
    font-weight: 500;
    padding: 0.625rem 1.125rem;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  header.dark .nav-btn {
    color: #94a3b8;
  }

  .nav-btn:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  header.dark .nav-btn:hover {
    background: #334155;
    color: #f1f5f9;
  }

  .admin-btn {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  header.dark .admin-btn {
    background: #422006;
    color: #fde68a;
    border: 1px solid #78350f;
  }

  .admin-btn:hover {
    background: #fde68a;
    color: #78350f;
    border-color: #fcd34d;
  }

  header.dark .admin-btn:hover {
    background: #78350f;
    color: #fef3c7;
    border-color: #92400e;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .theme-toggle {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.625rem;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  header.dark .theme-toggle {
    background: #334155;
    border: 1px solid #475569;
  }

  .theme-toggle:hover {
    background: #e2e8f0;
    transform: scale(1.05);
  }

  header.dark .theme-toggle:hover {
    background: #475569;
  }

  .wallet-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #f1f5f9;
    padding: 0.625rem 1rem;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  header.dark .wallet-info {
    background: #334155;
    border: 1px solid #475569;
  }

  .address {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-weight: 600;
    font-size: 0.875rem;
    color: #0f172a;
  }

  header.dark .address {
    color: #f1f5f9;
  }

  .btn-connect,
  .btn-disconnect {
    background: #0f172a;
    color: #ffffff;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  header.dark .btn-connect {
    background: #f1f5f9;
    color: #0f172a;
  }

  .btn-connect:hover {
    background: #1e293b;
    transform: translateY(-1px);
  }

  header.dark .btn-connect:hover {
    background: #ffffff;
  }

  .btn-disconnect {
    background: #f1f5f9;
    color: #64748b;
    padding: 0.5rem 1rem;
    border: 1px solid #e2e8f0;
  }

  header.dark .btn-disconnect {
    background: #475569;
    color: #cbd5e1;
    border: 1px solid #64748b;
  }

  .btn-disconnect:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  header.dark .btn-disconnect:hover {
    background: #64748b;
    color: #f1f5f9;
  }

  @media (max-width: 768px) {
    header {
      padding: 1rem;
    }

    .header-content {
      flex-wrap: wrap;
      gap: 1rem;
    }

    nav {
      order: 3;
      width: 100%;
      justify-content: center;
    }

    .logo h1 {
      font-size: 1.125rem;
    }
  }
</style>
