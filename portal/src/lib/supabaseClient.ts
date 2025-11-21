import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase';

export const supabase = supabaseConfig.url && supabaseConfig.anonKey
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

/**
 * Reads session from URL parameters (when opened from extension)
 * and stores it in localStorage, then cleans up the URL
 * This should be called once on page load
 */
let urlSessionRead = false;

export function readSessionFromUrl(): Session | null {
  // Only read from URL once
  if (urlSessionRead) return null;
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedSession = urlParams.get('session');
    
    if (!encodedSession) {
      console.log('[Session] No session parameter in URL');
      return null;
    }
    
    console.log('[Session] Found session parameter in URL, decoding...');
    
    // Decode base64 session data
    const sessionData = JSON.parse(atob(decodeURIComponent(encodedSession)));
    
    console.log('[Session] Decoded session data:', {
      hasAccessToken: !!sessionData.access_token,
      hasUser: !!sessionData.user,
      expiresAt: sessionData.expires_at
    });
    
    // Store in localStorage
    if (typeof Storage !== 'undefined') {
      localStorage.setItem('supabaseSession', JSON.stringify(sessionData));
      console.log('[Session] Stored session in localStorage');
    }
    
    // Mark as read
    urlSessionRead = true;
    
    // Clean up URL by removing the session parameter (for security)
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('session');
    window.history.replaceState({}, '', newUrl.toString());
    
    return sessionData as Session;
  } catch (error) {
    console.error('[Session] Failed to read session from URL:', error);
    urlSessionRead = true; // Mark as read even on error to prevent retries
    return null;
  }
}

export function getStoredSession(): Session | null {
  try {
    // First, check if session is in URL (from extension) - only reads once
    const urlSession = readSessionFromUrl();
    if (urlSession) {
      console.log('[Session] Using session from URL');
      return urlSession;
    }
    
    // Otherwise, read from localStorage
    const raw = localStorage.getItem('supabaseSession');
    if (!raw) {
      console.log('[Session] No session found in localStorage');
      return null;
    }
    const session = JSON.parse(raw) as Session;
    console.log('[Session] Using session from localStorage:', {
      hasAccessToken: !!session.access_token,
      hasUser: !!session.user
    });
    return session;
  } catch (error) {
    console.error('[Session] Failed to parse stored session', error);
    return null;
  }
}

