import { writable } from 'svelte/store';

// Toast notification store
function createToastStore() {
  const { subscribe, update } = writable([]);
  let counter = 0;

  const createId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
    return `${Date.now()}-${counter}`;
  };

  return {
    subscribe,
    show: (message, type = 'info', duration = 3000) => {
      const id = createId();
      const toast = { id, message, type, duration };
      
      update(toasts => [...toasts, toast]);
      
      if (duration > 0) {
        setTimeout(() => {
          update(toasts => toasts.filter(t => t.id !== id));
        }, duration);
      }
      
      return id;
    },
    dismiss: (id) => {
      update(toasts => toasts.filter(t => t.id !== id));
    },
    clear: () => {
      update(() => []);
    }
  };
}

export const toastStore = createToastStore();
