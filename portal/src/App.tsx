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

    // Check for token in URL first (highest priority — opened from extension)
    const urlTokenParam = searchParams.get('token');
    if (urlTokenParam) {
      // Store token and clean URL
      try {
        localStorage.setItem('apiToken', urlTokenParam);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('token');
        window.history.replaceState({}, '', cleanUrl.toString());
      } catch (e) {
        console.error('[App] Failed to store token from URL:', e);
      }
      setHasSession(true);
      setIsLandingPage(false);
      return;
    }

    // Also call readTokenFromUrl for backwards compat (no-op if already read above)
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
