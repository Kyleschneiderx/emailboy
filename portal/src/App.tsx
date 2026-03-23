import { useEffect, useState } from 'react';
import './index.css';
import SubscriptionPortal from './pages/SubscriptionPortal';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { readTokenFromUrl } from './lib/supabaseClient';

function App() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isLandingPage, setIsLandingPage] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    if (path === '/privacy') {
      setIsLandingPage(false);
      setHasSession(false);
      return;
    }

    const isLandingRoute = path === '/landing' || path === '/home';

    if (isLandingRoute) {
      setIsLandingPage(true);
      setHasSession(false);
      return;
    }

    // Try to read token from URL (when opened from extension)
    const urlToken = readTokenFromUrl();

    if (urlToken) {
      setHasSession(true);
      setIsLandingPage(false);
      return;
    }

    // Check localStorage for API token
    const storedToken = localStorage.getItem('apiToken');
    if (storedToken) {
      setHasSession(true);
      setIsLandingPage(false);
      return;
    }

    // Check for legacy supabaseSession — clean it up
    const legacySession = localStorage.getItem('supabaseSession');
    if (legacySession) {
      localStorage.removeItem('supabaseSession');
    }

    // Check if token param exists in URL (even if parsing failed)
    if (searchParams.has('token')) {
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

    // No session found — show landing page
    setHasSession(false);
    setIsLandingPage(true);
  }, []);

  if (hasSession === null) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
      </div>
    );
  }

  if (window.location.pathname === '/privacy') {
    return <PrivacyPolicy />;
  }

  if (isLandingPage) {
    return <LandingPage />;
  }

  return <SubscriptionPortal />;
}

export default App;
