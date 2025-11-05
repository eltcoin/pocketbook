<script>
  import { onMount } from 'svelte';
  import { multiChainStore } from './stores/multichain';
  import { themeStore } from './stores/theme';
  import Header from './components/Header.svelte';
  import AddressClaim from './components/AddressClaim.svelte';
  import Explorer from './components/Explorer.svelte';
  import AddressView from './components/AddressView.svelte';
  import AdminPanel from './components/AdminPanel.svelte';
  import Toast from './components/Toast.svelte';
  import AnimatedBackground from './components/AnimatedBackground.svelte';

  let currentView = 'explorer'; // 'explorer', 'claim', 'address', 'admin'
  let selectedAddress = null;
  let selectedENSName = null;
  let darkMode = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  function handleViewChange(event) {
    currentView = event.detail.view;
    if (event.detail.address) {
      selectedAddress = event.detail.address;
      selectedENSName = event.detail.ensName || null;
    }
  }
</script>

<main class:dark={darkMode}>
  <AnimatedBackground />
  <Header on:viewChange={handleViewChange} />
  
  <div class="container">
    {#if currentView === 'explorer'}
      <Explorer on:viewAddress={handleViewChange} />
    {:else if currentView === 'claim'}
      <AddressClaim on:viewChange={handleViewChange} />
    {:else if currentView === 'address' && selectedAddress}
      <AddressView address={selectedAddress} ensName={selectedENSName} on:viewChange={handleViewChange} />
    {:else if currentView === 'admin'}
      <AdminPanel on:viewChange={handleViewChange} />
    {/if}
  </div>
  
  <Toast />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    letter-spacing: -0.011em;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(:root) {
    /* Primary Accent Color - Vibrant Blue */
    --accent-primary: #3b82f6;
    --accent-primary-hover: #2563eb;
    --accent-primary-light: #dbeafe;
    --accent-primary-dark: #1e40af;
    
    /* Secondary Accent Color - Purple */
    --accent-secondary: #8b5cf6;
    --accent-secondary-hover: #7c3aed;
    --accent-secondary-light: #ede9fe;
    --accent-secondary-dark: #6d28d9;
  }

  main {
    min-height: 100vh;
    background: #f8fafc;
    transition: background 0.3s ease;
    position: relative;
  }

  main.dark {
    background: #0f172a;
  }

  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }
  }
</style>
