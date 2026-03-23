import { useEffect, useState } from 'react';
import { getStoredToken } from '../lib/supabaseClient';

/**
 * Hook that provides the current API token.
 * With permanent tokens, there's no refresh or periodic validation needed.
 */
export function useSupabaseSession() {
  const [token, setToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Read token from URL or localStorage
    const storedToken = getStoredToken();
    setToken(storedToken);
    setIsValidating(false);

    // Listen for storage changes (e.g., sign-out in another tab)
    const handler = (event: StorageEvent) => {
      if (event.key === 'apiToken') {
        setToken(event.newValue);
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Return a session-like shape for backwards compatibility with components
  // that destructure { session, isValidating }
  const session = token ? { access_token: token } : null;

  return { session, token, isValidating };
}
