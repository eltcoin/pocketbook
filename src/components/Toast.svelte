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
    top: 5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 420px;
  }

  .toast {
    background: #ffffff;
    border-radius: 10px;
    padding: 1rem 1.25rem;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(120%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast.dark {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .toast-error {
    border-left: 3px solid #ef4444;
    background: #fef2f2;
  }

  .toast.dark.toast-error {
    border-left: 3px solid #dc2626;
    background: #450a0a;
  }

  .toast-success {
    border-left: 3px solid #10b981;
    background: #f0fdf4;
  }

  .toast.dark.toast-success {
    border-left: 3px solid #059669;
    background: #052e16;
  }

  .toast-warning {
    border-left: 3px solid #f59e0b;
    background: #fffbeb;
  }

  .toast.dark.toast-warning {
    border-left: 3px solid #d97706;
    background: #422006;
  }

  .toast-info {
    border-left: 3px solid #3b82f6;
    background: #eff6ff;
  }

  .toast.dark.toast-info {
    border-left: 3px solid #2563eb;
    background: #172554;
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .toast-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .toast-message {
    color: #0f172a;
    font-size: 0.9375rem;
    line-height: 1.4;
  }

  .toast.dark .toast-message {
    color: #f1f5f9;
  }

  .toast-close {
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 1.375rem;
    cursor: pointer;
    padding: 0.25rem;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .toast.dark .toast-close {
    color: #94a3b8;
  }

  .toast-close:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .toast.dark .toast-close:hover {
    background: #334155;
    color: #f1f5f9;
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
