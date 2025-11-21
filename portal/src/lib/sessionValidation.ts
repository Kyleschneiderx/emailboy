import type { Session } from '@supabase/supabase-js';
import { getStoredSession } from './supabaseClient';
import { supabaseConfig } from '../config/supabase';

/**
 * Validates if a session token is expired
 * More lenient - only considers expired if actually past expiration time
 */
export function isTokenExpired(session: Session | null): boolean {
  if (!session?.expires_at) {
    console.log('[Token Expiry] No expires_at in session');
    return true;
  }
  
  // Check if token has actually expired (with 1 minute buffer for clock skew)
  const expiresAt = session.expires_at * 1000; // Convert to milliseconds
  const now = Date.now();
  const bufferTime = 60 * 1000; // 1 minute buffer for clock skew
  
  const expired = now >= (expiresAt - bufferTime);
  if (expired) {
    console.log('[Token Expiry] Token expired:', {
      expiresAt: new Date(expiresAt).toISOString(),
      now: new Date(now).toISOString(),
      diffMinutes: (expiresAt - now) / 1000 / 60
    });
  }
  return expired;
}

/**
 * Validates if a session exists and is valid (basic check only)
 */
export function isValidSession(session: Session | null): boolean {
  if (!session) {
    console.log('[Session Validation] No session provided');
    return false;
  }
  if (!session.access_token) {
    console.log('[Session Validation] Session missing access_token');
    return false;
  }
  if (!session.user) {
    console.log('[Session Validation] Session missing user');
    return false;
  }
  const expired = isTokenExpired(session);
  if (expired) {
    console.log('[Session Validation] Token is expired');
  }
  return !expired;
}

/**
 * Validates the session by making a test API call to Supabase
 * This ensures the token is still valid on the server side
 * More lenient - tries the API call even if token appears expired
 */
export async function validateSessionWithServer(session: Session | null): Promise<boolean> {
  if (!session || !session.access_token) {
    console.log('[Server Validation] No session or access token');
    return false;
  }
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    console.log('[Server Validation] Missing Supabase config - skipping server validation, will validate on API call');
    // Don't fail validation if config is missing - let the actual API call validate
    return true;
  }

  try {
    console.log('[Server Validation] Validating with Supabase auth server...');
    const response = await fetch(`${supabaseConfig.url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseConfig.anonKey,
      },
    });

    const isValid = response.ok;
    console.log('[Server Validation] Server validation result:', isValid, response.status);
    
    if (!isValid) {
      const errorText = await response.text().catch(() => '');
      console.log('[Server Validation] Validation failed:', errorText);
    }
    
    return isValid;
  } catch (error) {
    console.error('[Server Validation] Session validation error:', error);
    return false;
  }
}

/**
 * Attempts to refresh the session if it's expired
 */
export async function refreshSessionIfNeeded(session: Session | null): Promise<Session | null> {
  if (!session) return null;
  if (!isTokenExpired(session)) return session;

  // If we have a refresh token, try to refresh
  if (!session.refresh_token) {
    console.warn('Session expired and no refresh token available');
    return null;
  }

  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    console.warn('Supabase config not available for session refresh');
    return null;
  }

  try {
    const response = await fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseConfig.anonKey,
      },
      body: JSON.stringify({
        refresh_token: session.refresh_token,
      }),
    });

    if (!response.ok) {
      console.warn('Failed to refresh session');
      return null;
    }

    const newSession = await response.json();
    
    // Update localStorage with new session
    if (typeof Storage !== 'undefined') {
      localStorage.setItem('supabaseSession', JSON.stringify(newSession));
    }

    return newSession as Session;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return null;
  }
}

/**
 * Gets a valid session, refreshing if necessary
 * On initial load, we skip server validation to allow the session to be used
 * Server validation will happen when making API calls
 */
export async function getValidSession(skipServerValidation = false): Promise<Session | null> {
  const session = getStoredSession();
  
  if (!session) {
    console.log('[Session Validation] No session found');
    return null;
  }
  
  console.log('[Session Validation] Validating session:', {
    hasAccessToken: !!session.access_token,
    hasUser: !!session.user,
    expiresAt: session.expires_at,
    skipServerValidation
  });
  
  // Basic validation - check if session has required fields
  if (!session.access_token || !session.user) {
    console.log('[Session Validation] Session missing required fields');
    return null;
  }
  
  // Check if token is expired
  if (isTokenExpired(session)) {
    console.log('[Session Validation] Token expired, attempting refresh...');
    // Try to refresh
    const refreshed = await refreshSessionIfNeeded(session);
    if (refreshed) {
      console.log('[Session Validation] Session refreshed successfully');
      return refreshed;
    }
    
    // If refresh failed and we're not skipping server validation, check with server
    if (!skipServerValidation) {
      console.log('[Session Validation] Refresh failed, validating with server...');
      const isValid = await validateSessionWithServer(session);
      if (!isValid) {
        console.log('[Session Validation] Server validation failed, clearing session');
        if (typeof Storage !== 'undefined') {
          localStorage.removeItem('supabaseSession');
        }
        return null;
      }
      console.log('[Session Validation] Server validation passed despite expiration');
    } else {
      console.log('[Session Validation] Skipping server validation, using expired session (will validate on API call)');
    }
    return session;
  }

  // If not skipping server validation, validate with server
  if (!skipServerValidation) {
    console.log('[Session Validation] Token not expired, validating with server...');
    const serverValid = await validateSessionWithServer(session);
    if (!serverValid) {
      console.log('[Session Validation] Server validation failed, clearing session');
      if (typeof Storage !== 'undefined') {
        localStorage.removeItem('supabaseSession');
      }
      return null;
    }
    console.log('[Session Validation] Server validation passed');
  } else {
    console.log('[Session Validation] Skipping server validation (will validate on API call)');
  }

  console.log('[Session Validation] Session is valid');
  return session;
}

