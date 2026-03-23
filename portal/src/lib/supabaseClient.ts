import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase';

export const supabase = supabaseConfig.url && supabaseConfig.anonKey
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Reads API token from URL parameters (when opened from extension)
 * and stores it in localStorage, then cleans up the URL.
 * Called once on page load.
 */
let urlTokenRead = false;

export function readTokenFromUrl(): string | null {
  if (urlTokenRead) return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      return null;
    }

    console.log('[Session] Found token parameter in URL');

    // Store in localStorage
    if (typeof Storage !== 'undefined') {
      localStorage.setItem('apiToken', token);
      console.log('[Session] Stored API token in localStorage');
    }

    urlTokenRead = true;

    // Clean up URL by removing the token parameter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('token');
    window.history.replaceState({}, '', newUrl.toString());

    return token;
  } catch (error) {
    console.error('[Session] Failed to read token from URL:', error);
    urlTokenRead = true;
    return null;
  }
}

export function getStoredToken(): string | null {
  try {
    // First check URL (from extension) — only reads once
    const urlToken = readTokenFromUrl();
    if (urlToken) {
      return urlToken;
    }

    // Otherwise read from localStorage
    const token = localStorage.getItem('apiToken');
    if (!token) {
      return null;
    }
    return token;
  } catch (error) {
    console.error('[Session] Failed to get stored token', error);
    return null;
  }
}
