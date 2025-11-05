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
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 1rem 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
    transition: background 0.3s ease;
  }

  header.dark {
    background: rgba(26, 26, 46, 0.95);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
  }

  .logo img {
    height: 40px;
    width: 40px;
  }

  .logo h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #667eea;
  }

  header.dark .logo h1 {
    color: #a78bfa;
  }

  nav {
    display: flex;
    gap: 1rem;
  }

  .nav-btn {
    background: none;
    border: none;
    color: #333;
    font-size: 1rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  header.dark .nav-btn {
    color: #e0e0e0;
  }

  .nav-btn:hover {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }

  header.dark .nav-btn:hover {
    background: rgba(167, 139, 250, 0.1);
    color: #a78bfa;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .theme-toggle {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .theme-toggle:hover {
    background: rgba(102, 126, 234, 0.1);
    transform: scale(1.1);
  }

  .wallet-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(102, 126, 234, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 12px;
  }

  header.dark .wallet-info {
    background: rgba(167, 139, 250, 0.1);
  }

  .address {
    font-family: 'Courier New', monospace;
    font-weight: 600;
    color: #667eea;
  }

  header.dark .address {
    color: #a78bfa;
  }

  .btn-connect,
  .btn-disconnect {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }

  .btn-connect:hover,
  .btn-disconnect:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-disconnect {
    background: rgba(0, 0, 0, 0.1);
    box-shadow: none;
    padding: 0.5rem 1rem;
  }

  header.dark .btn-disconnect {
    background: rgba(255, 255, 255, 0.1);
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
      font-size: 1.2rem;
    }
  }
</style>
