import { useEffect } from 'react';
import './index.css';
import SubscriptionPortal from './pages/SubscriptionPortal';
import { readSessionFromUrl } from './lib/supabaseClient';

function App() {
  // Read session from URL on initial load (when opened from extension)
  useEffect(() => {
    console.log('[App] Reading session from URL on mount...');
    const session = readSessionFromUrl();
    if (session) {
      console.log('[App] Successfully read session from URL:', {
        hasAccessToken: !!session.access_token,
        hasUser: !!session.user
      });
    } else {
      console.log('[App] No session found in URL, checking localStorage...');
      const stored = localStorage.getItem('supabaseSession');
      if (stored) {
        console.log('[App] Found session in localStorage');
      } else {
        console.log('[App] No session found in URL or localStorage');
      }
    }
  }, []);

  return <SubscriptionPortal />;
}

export default App;
