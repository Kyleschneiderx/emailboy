import { getStoredToken } from './supabaseClient';

/**
 * Returns the stored API token, or null if not found.
 * With permanent tokens, there's no expiry or refresh logic needed.
 */
export function getApiToken(): string | null {
  return getStoredToken();
}

/**
 * Clears the stored API token (used on sign-out or invalid token).
 */
export function clearApiToken(): void {
  if (typeof Storage !== 'undefined') {
    localStorage.removeItem('apiToken');
    // Also clean up any legacy session data
    localStorage.removeItem('supabaseSession');
  }
}
