import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getStoredSession } from '../lib/supabaseClient';
import { getValidSession, isValidSession } from '../lib/sessionValidation';

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Validate and refresh session on mount
    const validateSession = async () => {
      setIsValidating(true);
      
      // getStoredSession() will automatically read from URL if present
      // and store it in localStorage, then return it
      // Skip server validation on initial load - we'll validate when making API calls
      const validSession = await getValidSession(true);
      if (mounted) {
        setSession(validSession);
        setIsValidating(false);
      }
    };

    validateSession();

    // Listen for storage changes (e.g., from extension)
    const handler = async (event: StorageEvent) => {
      if (event.key === 'supabaseSession') {
        const newSession = getStoredSession();
        if (isValidSession(newSession)) {
          // Validate with server before setting
          const validSession = await getValidSession();
          if (mounted) {
            setSession(validSession);
          }
        } else {
          if (mounted) {
            setSession(null);
          }
        }
      }
    };

    window.addEventListener('storage', handler);

    // Periodically check if session is still valid (every 5 minutes)
    const interval = setInterval(async () => {
      if (mounted) {
        const currentSession = getStoredSession();
        if (currentSession) {
          const validSession = await getValidSession();
          if (mounted) {
            setSession(validSession);
          }
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      mounted = false;
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, []);

  return { session, isValidating };
}

