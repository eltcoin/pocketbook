<script>
  import { multiChainStore } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { currentRoute, navigate } from '../utils/router';
  import NetworkSelector from './NetworkSelector.svelte';
  import Icon from './Icon.svelte';

  const menuItems = [
    { id: 'explorer', label: 'Explorer', icon: 'compass' },
    { id: 'claim', label: 'Claim Address', icon: 'id-card' },
    { id: 'admin', label: 'Admin', icon: 'tools', variant: 'danger' }
  ];
  
  let connected = false;
  let address = null;
  let darkMode = false;
  let activeView = 'explorer';

  multiChainStore.subscribe(value => {
    connected = value.connected;
    address = value.primaryAddress;
  });

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  currentRoute.subscribe(route => {
    const view = route.view || 'explorer';
    activeView = view === 'address' ? 'explorer' : view;
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
    // Use router for navigation
    if (view === 'explorer') {
      navigate('/');
    } else if (view === 'claim') {
      navigate('/claim');
    } else if (view === 'admin') {
      navigate('/admin');
    }
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

    <nav class="menu" aria-label="Primary">
      {#each menuItems as item}
        <button
          class="menu-btn"
          class:active={activeView === item.id}
          class:danger={item.variant === 'danger'}
          on:click={() => navigateTo(item.id)}
          aria-current={activeView === item.id ? 'page' : undefined}
        >
          <Icon name={item.icon} size="1.125rem" />
          <span>{item.label}</span>
        </button>
      {/each}
    </nav>

    <div class="controls">
      <button class="theme-toggle" on:click={toggleTheme} title="Toggle theme">
        <Icon name={darkMode ? 'sun' : 'moon'} size="1.25rem" />
      </button>
      
      {#if connected}
        <NetworkSelector />
        <div class="wallet-info">
          <span class="address">{shortenAddress(address)}</span>
          <button class="btn-disconnect" on:click={handleDisconnect}>
            <Icon name="sign-out" size="1rem" />
            <span>Disconnect</span>
          </button>
        </div>
      {:else}
        <button class="btn-connect" on:click={handleConnect}>
          <Icon name="wallet" size="1.125rem" />
          <span>Connect Wallet</span>
        </button>
      {/if}
    </div>
  </div>
</header>

<style>
  header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
    transition: all 0.3s ease;
  }

  header.dark {
    background: rgba(30, 41, 59, 0.95);
    border-bottom: 1px solid #334155;
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 1.5rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
    justify-self: start;
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

  .menu {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    background: rgba(15, 23, 42, 0.04);
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.4);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
    overflow-x: auto;
    justify-self: center;
  }

  .menu::-webkit-scrollbar {
    display: none;
  }

  header.dark .menu {
    background: rgba(15, 23, 42, 0.6);
    border-color: rgba(148, 163, 184, 0.35);
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.5);
  }

  .menu-btn {
    background: transparent;
    border: none;
    color: #475569;
    font-size: 0.9375rem;
    font-weight: 600;
    padding: 0.5rem 1.25rem;
    cursor: pointer;
    border-radius: 999px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    letter-spacing: -0.01em;
  }

  header.dark .menu-btn {
    color: #cbd5e1;
  }

  .menu-btn:hover {
    background: rgba(59, 130, 246, 0.12);
    color: var(--accent-primary);
  }

  header.dark .menu-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .menu-btn.active {
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  }

  header.dark .menu-btn.active {
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    color: #ffffff;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.55);
  }

  .menu-btn.danger {
    color: #b45309;
  }

  header.dark .menu-btn.danger {
    color: #fcd34d;
  }

  .menu-btn.danger.active {
    background: linear-gradient(135deg, #f97316, #ea580c);
    color: #ffffff;
    box-shadow: 0 12px 26px rgba(249, 115, 22, 0.45);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    justify-content: flex-end;
    flex-wrap: wrap;
    justify-self: end;
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
    background: var(--accent-primary);
    color: #ffffff;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  header.dark .btn-connect {
    background: var(--accent-primary);
    color: #ffffff;
  }

  .btn-connect:hover {
    background: var(--accent-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  header.dark .btn-connect:hover {
    background: var(--accent-primary-hover);
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

  @media (max-width: 1100px) {
    .header-content {
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
    }

    .logo {
      justify-content: center;
      width: 100%;
    }

    .menu {
      justify-content: center;
      width: 100%;
      flex-wrap: wrap;
    }

    .controls {
      justify-content: center;
      justify-self: stretch;
    }
  }

  @media (max-width: 768px) {
    header {
      padding: 1rem;
    }

    .logo h1 {
      font-size: 1.125rem;
    }

    .menu-btn {
      width: 100%;
      justify-content: center;
    }

    .controls {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
