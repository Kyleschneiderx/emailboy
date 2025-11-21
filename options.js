// Options page script

const SUPABASE_CONFIG = {
  url: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4',
  functionsUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1'
};

// Portal URL - update this to your deployed portal URL
const PORTAL_URL = 'http://localhost:5173'; // Change to your production URL when deployed

let currentSession = null;

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAuthAndLoadSubscription();
  
  // Check for checkout success/cancel in URL
  const urlParams = new URLSearchParams(window.location.search);
  const checkout = urlParams.get('checkout');
  if (checkout === 'success') {
    showStatus('subscriptionError', '✅ Payment successful! Your subscription is being activated...', 'success');
    setTimeout(() => {
      loadSubscriptionStatus();
    }, 2000);
  } else if (checkout === 'cancel') {
    showStatus('subscriptionError', 'Payment canceled.', 'error');
  }
});

// Check authentication and load subscription
async function checkAuthAndLoadSubscription() {
  try {
    const result = await chrome.storage.local.get(['supabaseSession']);
    const session = result.supabaseSession;
    
    if (!session || !session.access_token) {
      showSubscriptionError('Please sign in to view your subscription status.');
      document.getElementById('subscriptionLoading').style.display = 'none';
      return;
    }
    
    currentSession = session;
    await loadSubscriptionStatus();
  } catch (error) {
    console.error('Auth check error:', error);
    showSubscriptionError('Failed to check authentication. Please try again.');
    document.getElementById('subscriptionLoading').style.display = 'none';
  }
}

// Load subscription status
async function loadSubscriptionStatus() {
  try {
    const response = await fetch(`${SUPABASE_CONFIG.functionsUrl}/check-subscription`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load subscription');
    }

    document.getElementById('subscriptionLoading').style.display = 'none';
    document.getElementById('subscriptionContent').style.display = 'block';
    
    if (data.isPremium) {
      // Show premium status
      document.getElementById('premiumStatus').style.display = 'flex';
      document.getElementById('freeStatus').style.display = 'none';
      document.getElementById('subscriptionDetails').style.display = 'block';
      
      // Update subscription details
      if (data.subscription) {
        document.getElementById('planName').textContent = data.subscription.plan || 'Premium';
        document.getElementById('planStatus').textContent = data.subscription.status || 'active';
        
        if (data.subscription.current_period_end) {
          const renewDate = new Date(data.subscription.current_period_end);
          document.getElementById('renewDate').textContent = renewDate.toLocaleDateString();
        }
        
        // Check if subscription is set to cancel
        const subscription = data.subscription;
        if (subscription.cancel_at_period_end) {
          document.getElementById('cancelSection').style.display = 'block';
          document.getElementById('activeSection').style.display = 'none';
        } else {
          document.getElementById('cancelSection').style.display = 'none';
          document.getElementById('activeSection').style.display = 'block';
        }
      }
    } else {
      // Show free status
      document.getElementById('premiumStatus').style.display = 'none';
      document.getElementById('freeStatus').style.display = 'block';
      document.getElementById('subscriptionDetails').style.display = 'none';
    }
  } catch (error) {
    console.error('Subscription load error:', error);
    showSubscriptionError('Failed to load subscription status. Please try again.');
    document.getElementById('subscriptionLoading').style.display = 'none';
  }
}

// Upgrade to premium
async function handleUpgrade() {
  try {
    const upgradeBtn = document.getElementById('upgradeBtn');
    upgradeBtn.disabled = true;
    upgradeBtn.textContent = 'Loading...';
    
    const response = await fetch(`${SUPABASE_CONFIG.functionsUrl}/create-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    // Redirect to Stripe checkout
    if (data.url) {
      window.open(data.url, '_blank');
      showStatus('subscriptionError', 'Redirecting to checkout...', 'success');
    } else {
      throw new Error('No checkout URL received');
    }
  } catch (error) {
    console.error('Upgrade error:', error);
    showSubscriptionError('Failed to start checkout. Please try again.');
  } finally {
    const upgradeBtn = document.getElementById('upgradeBtn');
    upgradeBtn.disabled = false;
    upgradeBtn.textContent = 'Upgrade to Premium';
  }
}

// Open subscription portal
async function handlePortal() {
  try {
    const portalBtn = document.getElementById('portalBtn');
    if (!portalBtn) {
      return;
    }

    portalBtn.disabled = true;
    portalBtn.textContent = 'Opening...';

    if (!currentSession || !currentSession.access_token) {
      throw new Error('Not authenticated. Please sign in again.');
    }

    // Encode session data as URL parameter
    // We'll pass the essential session data via URL params
    const sessionData = {
      access_token: currentSession.access_token,
      refresh_token: currentSession.refresh_token,
      expires_at: currentSession.expires_at,
      expires_in: currentSession.expires_in,
      token_type: currentSession.token_type,
      user: currentSession.user
    };

    console.log('[Extension] Preparing session data:', {
      hasAccessToken: !!sessionData.access_token,
      hasRefreshToken: !!sessionData.refresh_token,
      hasUser: !!sessionData.user,
      expiresAt: sessionData.expires_at
    });

    // Encode as base64 to avoid URL encoding issues
    const encodedSession = btoa(JSON.stringify(sessionData));
    console.log('[Extension] Encoded session length:', encodedSession.length);
    
    // Open the portal with session data in URL
    const portalUrl = `${PORTAL_URL}?session=${encodeURIComponent(encodedSession)}`;
    console.log('[Extension] Opening portal URL:', portalUrl.substring(0, 100) + '...');
    window.open(portalUrl, '_blank');
    showStatus('subscriptionError', 'Opening subscription portal...', 'success');
  } catch (error) {
    console.error('Portal error:', error);
    showSubscriptionError(error.message || 'Failed to open subscription portal. Please try again.');
  } finally {
    const portalBtn = document.getElementById('portalBtn');
    if (portalBtn) {
      portalBtn.disabled = false;
      portalBtn.textContent = 'Manage Subscription';
    }
  }
}

// Resume subscription
async function handleResume() {
  try {
    const resumeBtn = document.getElementById('resumeBtn');
    resumeBtn.disabled = true;
    resumeBtn.textContent = 'Resuming...';
    
    const response = await fetch(`${SUPABASE_CONFIG.functionsUrl}/resume-subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to resume subscription');
    }

    showStatus('subscriptionError', 'Subscription resumed successfully!', 'success');
    setTimeout(() => {
      loadSubscriptionStatus();
    }, 1000);
  } catch (error) {
    console.error('Resume error:', error);
    showSubscriptionError('Failed to resume subscription. Please try again.');
  } finally {
    const resumeBtn = document.getElementById('resumeBtn');
    resumeBtn.disabled = false;
    resumeBtn.textContent = 'Resume Subscription';
  }
}

// Show subscription error
function showSubscriptionError(message) {
  const errorEl = document.getElementById('subscriptionError');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  errorEl.className = 'error-message';
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('upgradeBtn').addEventListener('click', handleUpgrade);
  
  document.getElementById('portalBtn')?.addEventListener('click', handlePortal);
  document.getElementById('resumeBtn')?.addEventListener('click', handleResume);
  document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
  document.getElementById('clearBtn').addEventListener('click', handleClear);
}

// Show status message
function showStatus(elementId, message, type) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }, 3000);
  }
}

// Handle sign out
async function handleSignOut() {
  if (!confirm('Are you sure you want to sign out?')) {
    return;
  }

  try {
    if (currentSession && currentSession.access_token) {
      try {
        await fetch(`${SUPABASE_CONFIG.functionsUrl}/auth-signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        // Fallback to direct API
        await fetch(`${SUPABASE_CONFIG.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'apikey': SUPABASE_CONFIG.anonKey
          }
        });
      }
    }
    
    // Clear session from storage
    await chrome.storage.local.remove(['supabaseSession']);
    currentSession = null;
    
    // Redirect to popup or show message
    showStatus('accountStatus', '✅ Signed out successfully. Please close this tab and sign in again from the extension popup.', 'success');
    
    // Optionally close the tab after a delay
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    console.error('Sign out error:', error);
    showStatus('accountStatus', 'Error signing out. Please try again.', 'error');
  }
}

// Handle clear emails
async function handleClear() {
  if (!confirm('Are you sure you want to clear all collected emails? This will remove all emails from local storage.')) {
    return;
  }

  try {
    // Clear emails from background script
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CLEAR_EMAILS' }, (response) => {
        resolve(response);
      });
    });
    
    showStatus('accountStatus', '✅ All emails cleared from local storage', 'success');
  } catch (error) {
    console.error('Clear emails error:', error);
    showStatus('accountStatus', 'Error clearing emails. Please try again.', 'error');
  }
}
