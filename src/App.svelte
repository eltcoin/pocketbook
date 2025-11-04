<script>
  import { onMount } from 'svelte';
  import { ethersStore } from './stores/ethers';
  import { themeStore } from './stores/theme';
  import Header from './components/Header.svelte';
  import AddressClaim from './components/AddressClaim.svelte';
  import Explorer from './components/Explorer.svelte';
  import AddressView from './components/AddressView.svelte';

  let currentView = 'explorer'; // 'explorer', 'claim', 'address'
  let selectedAddress = null;
  let darkMode = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  function handleViewChange(event) {
    currentView = event.detail.view;
    if (event.detail.address) {
      selectedAddress = event.detail.address;
    }
  }
</script>

<main class:dark={darkMode}>
  <Header on:viewChange={handleViewChange} />
  
  <div class="container">
    {#if currentView === 'explorer'}
      <Explorer on:viewAddress={handleViewChange} />
    {:else if currentView === 'claim'}
      <AddressClaim on:viewChange={handleViewChange} />
    {:else if currentView === 'address' && selectedAddress}
      <AddressView address={selectedAddress} on:viewChange={handleViewChange} />
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(*) {
    box-sizing: border-box;
  }

  main {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transition: background 0.3s ease;
  }

  main.dark {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }
  }
</style>
