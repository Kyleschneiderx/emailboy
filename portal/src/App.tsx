import { useEffect, useState } from 'react';
import './index.css';
import SubscriptionPortal from './pages/SubscriptionPortal';
import LandingPage from './pages/LandingPage';
import { readSessionFromUrl } from './lib/supabaseClient';

function App() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isLandingPage, setIsLandingPage] = useState(false);

  useEffect(() => {
    // Check if we're on the landing page route
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    // Show landing page if:
    // 1. Path is /landing or /home
    // 2. No session and no session param in URL
    const isLandingRoute = path === '/landing' || path === '/home';

    if (isLandingRoute) {
      setIsLandingPage(true);
      setHasSession(false);
      return;
    }

    // Try to read session from URL (when opened from extension)
    console.log('[App] Reading session from URL on mount...');
    const session = readSessionFromUrl();

    if (session) {
      console.log('[App] Successfully read session from URL');
      setHasSession(true);
      setIsLandingPage(false);
      return;
    }

    // Check localStorage
    const stored = localStorage.getItem('supabaseSession');
    if (stored) {
      try {
        const parsedSession = JSON.parse(stored);
        if (parsedSession?.access_token) {
          console.log('[App] Found session in localStorage');
          setHasSession(true);
          setIsLandingPage(false);
          return;
        }
      } catch (e) {
        console.log('[App] Failed to parse stored session');
      }
    }

    // Check if session param exists in URL (even if parsing failed)
    if (searchParams.has('session')) {
      // Session param exists, show dashboard (will show sign-in prompt if invalid)
      setHasSession(false);
      setIsLandingPage(false);
      return;
    }

    // Check for upgrade, checkout, or signup params (should show dashboard)
    if (searchParams.has('upgrade') || searchParams.has('checkout') || searchParams.has('signup')) {
      setHasSession(false);
      setIsLandingPage(false);
      return;
    }

    // No session found and no relevant params - show landing page
    console.log('[App] No session found, showing landing page');
    setHasSession(false);
    setIsLandingPage(true);
  }, []);

  // Show loading state while checking
  if (hasSession === null) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
      </div>
    );
  }

  // Show landing page or dashboard based on state
  if (isLandingPage) {
    return <LandingPage />;
  }

  return <SubscriptionPortal />;
}

export default App;
