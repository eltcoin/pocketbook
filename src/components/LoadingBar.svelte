<script>
  import { multiChainStore } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  
  let loading = false;
  let chainSwitching = false;
  let networkName = '';
  let darkMode = false;
  let previousChainId = null;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    const currentChainId = value.primaryChainId;
    
    // Detect chain switching
    if (previousChainId !== null && currentChainId !== null && previousChainId !== currentChainId) {
      chainSwitching = true;
      networkName = value.chains?.[currentChainId]?.networkConfig?.name || 'Network';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        chainSwitching = false;
      }, 3000);
    }
    
    previousChainId = currentChainId;
    
    // Check if any operations are loading
    loading = value.initializing || false;
  });
</script>

{#if loading || chainSwitching}
  <div class="loading-bar-container" class:dark={darkMode}>
    {#if loading}
      <div class="loading-bar">
        <div class="loading-bar-progress"></div>
      </div>
    {/if}
    
    {#if chainSwitching}
      <div class="chain-switch-banner">
        <div class="banner-content">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16Z" fill="currentColor"/>
            <path d="M10 6C7.79086 6 6 7.79086 6 10C6 12.2091 7.79086 14 10 14C12.2091 14 14 12.2091 14 10C14 7.79086 12.2091 6 10 6Z" fill="currentColor"/>
          </svg>
          <span>Switched to <strong>{networkName}</strong></span>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .loading-bar-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    pointer-events: none;
  }

  .loading-bar {
    width: 100%;
    height: 3px;
    background: rgba(59, 130, 246, 0.1);
    overflow: hidden;
  }

  .loading-bar-progress {
    width: 30%;
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--accent-primary, #3b82f6),
      var(--accent-secondary, #8b5cf6)
    );
    animation: progress 1.5s ease-in-out infinite;
  }

  @keyframes progress {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }

  .chain-switch-banner {
    background: linear-gradient(
      135deg,
      var(--accent-primary, #3b82f6),
      var(--accent-secondary, #8b5cf6)
    );
    color: white;
    padding: 0.75rem 1.5rem;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    animation: slideDown 0.3s ease-out;
    pointer-events: auto;
  }

  .loading-bar-container.dark .chain-switch-banner {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
  }

  .banner-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9375rem;
    font-weight: 500;
  }

  .banner-content svg {
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }

  .banner-content strong {
    font-weight: 700;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }

  @media (max-width: 768px) {
    .chain-switch-banner {
      padding: 0.625rem 1rem;
    }

    .banner-content {
      font-size: 0.875rem;
    }
  }
</style>
