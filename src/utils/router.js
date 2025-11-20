/**
 * Simple URL-based router for Svelte
 * Handles URL navigation and parameter extraction
 */

import { writable, derived } from 'svelte/store';

// Store for current location
export const location = writable({
  path: window.location.pathname,
  params: {},
  search: window.location.search
});

// Initialize on load
updateLocation();

// Update location when browser navigation occurs (back/forward buttons)
window.addEventListener('popstate', () => {
  updateLocation();
});

function updateLocation() {
  location.set({
    path: window.location.pathname,
    params: extractParams(window.location.pathname),
    search: window.location.search
  });
}

function extractParams(path) {
  // Extract parameters from path patterns like /explore/:address
  const params = {};
  const segments = path.split('/').filter(Boolean);
  
  if (segments[0] === 'explore' && segments[1]) {
    params.address = segments[1];
  }
  
  return params;
}

/**
 * Navigate to a new path
 * @param {string} path - The path to navigate to
 */
export function navigate(path) {
  window.history.pushState({}, '', path);
  updateLocation();
}

/**
 * Navigate back in history
 */
export function goBack() {
  window.history.back();
}

/**
 * Parse the current route
 * @returns {Object} Route information with view and params
 */
export function parseRoute(pathname = window.location.pathname) {
  const segments = pathname.split('/').filter(Boolean);
  
  // Root or /explorer
  if (segments.length === 0 || segments[0] === '') {
    return { view: 'explorer', params: {} };
  }
  
  // /explore/:address
  if (segments[0] === 'explore' && segments[1]) {
    return { 
      view: 'address', 
      params: { address: segments[1] }
    };
  }
  
  // /claim
  if (segments[0] === 'claim') {
    return { view: 'claim', params: {} };
  }
  
  // /admin
  if (segments[0] === 'admin') {
    return { view: 'admin', params: {} };
  }
  
  // Default to explorer
  return { view: 'explorer', params: {} };
}

// Derived store for current route
export const currentRoute = derived(location, $location => {
  return parseRoute($location.path);
});
