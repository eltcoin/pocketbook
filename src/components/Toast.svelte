<script>
  import { toastStore } from '../stores/toast';
  import { themeStore } from '../stores/theme';

  // Component state
  let toasts = [];
  let darkMode = false;

  toastStore.subscribe(value => {
    toasts = value;
  });

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  function dismiss(id) {
    toastStore.dismiss(id);
  }
</script>

<div class="toast-container" class:dark={darkMode}>
  {#each toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}" class:dark={darkMode}>
      <div class="toast-content">
        <span class="toast-icon">
          {#if toast.type === 'error'}
            ❌
          {:else if toast.type === 'success'}
            ✅
          {:else if toast.type === 'warning'}
            ⚠️
          {:else}
            ℹ️
          {/if}
        </span>
        <span class="toast-message">{toast.message}</span>
      </div>
      <button class="toast-close" on:click={() => dismiss(toast.id)}>
        ×
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 400px;
  }

  .toast {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    animation: slideIn 0.3s ease-out;
    border-left: 4px solid #667eea;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast.dark {
    background: rgba(26, 26, 46, 0.95);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .toast-error {
    border-left-color: #f44336;
  }

  .toast-success {
    border-left-color: #4caf50;
  }

  .toast-warning {
    border-left-color: #ff9800;
  }

  .toast-info {
    border-left-color: #2196f3;
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .toast-icon {
    font-size: 1.25rem;
  }

  .toast-message {
    color: #333;
    font-size: 0.9rem;
  }

  .toast.dark .toast-message {
    color: #e0e0e0;
  }

  .toast-close {
    background: none;
    border: none;
    color: #999;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .toast-close:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #666;
  }

  .toast.dark .toast-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ccc;
  }

  @media (max-width: 768px) {
    .toast-container {
      top: auto;
      bottom: 1rem;
      left: 1rem;
      right: 1rem;
      max-width: none;
    }
  }
</style>
