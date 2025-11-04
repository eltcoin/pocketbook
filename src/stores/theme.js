import { writable } from 'svelte/store';

function createThemeStore() {
  const { subscribe, set, update } = writable({
    darkMode: false
  });

  // Check for saved theme preference or default to light mode
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      set({ darkMode: true });
    }
  }

  return {
    subscribe,
    toggle: () => {
      update(store => {
        const newDarkMode = !store.darkMode;
        if (typeof window !== 'undefined') {
          localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
        }
        return { darkMode: newDarkMode };
      });
    },
    setDark: (isDark) => {
      set({ darkMode: isDark });
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      }
    }
  };
}

export const themeStore = createThemeStore();
