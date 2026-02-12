// EmailBoy Options Page

const CONFIG = {
  supabaseUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4',
  portalUrl: 'https://portal.emailextractorextension.com',
  functionsUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1'
};

let currentSession = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Set portal link
  document.getElementById('portalLink').href = CONFIG.portalUrl;

  // Check authentication
  await checkAuth();

  // Setup event listeners
  document.getElementById('portalBtn')?.addEventListener('click', openPortal);
  document.getElementById('clearBtn')?.addEventListener('click', clearEmails);
  document.getElementById('signOutBtn')?.addEventListener('click', signOut);
}

async function checkAuth() {
  const loadingState = document.getElementById('loadingState');
  const notSignedIn = document.getElementById('notSignedIn');
  const signedIn = document.getElementById('signedIn');

  try {
    const result = await chrome.storage.local.get(['supabaseSession']);
    const session = result.supabaseSession;

    if (!session?.access_token) {
      loadingState.classList.add('hidden');
      notSignedIn.classList.remove('hidden');
      return;
    }

    currentSession = session;

    // Update UI with user info
    const email = session.user?.email || 'Unknown';
    document.getElementById('userEmail').textContent = email;
    document.getElementById('userAvatar').textContent = email.charAt(0).toUpperCase();

    // Check premium status
    await checkPremiumStatus();

    loadingState.classList.add('hidden');
    signedIn.classList.remove('hidden');

  } catch (error) {
    console.error('Auth check error:', error);
    loadingState.classList.add('hidden');
    notSignedIn.classList.remove('hidden');
  }
}

async function checkPremiumStatus() {
  const statusContainer = document.getElementById('statusContainer');
  const statusText = document.getElementById('statusText');

  try {
    const response = await fetch(`${CONFIG.functionsUrl}/check-subscription`, {
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check subscription');
    }

    const data = await response.json();

    if (data.isPremium) {
      statusContainer.classList.add('premium');
      statusText.textContent = 'Premium Active';
    } else {
      statusContainer.classList.remove('premium');
      statusText.textContent = 'Free Plan';
    }
  } catch (error) {
    console.error('Premium check error:', error);
    statusText.textContent = 'Status Unknown';
  }
}

function openPortal() {
  if (!currentSession?.access_token) {
    showMessage('Please sign in first', 'error');
    return;
  }

  // Encode session for portal
  const sessionData = {
    access_token: currentSession.access_token,
    refresh_token: currentSession.refresh_token,
    expires_at: currentSession.expires_at,
    expires_in: currentSession.expires_in,
    token_type: currentSession.token_type,
    user: currentSession.user
  };

  const encodedSession = btoa(JSON.stringify(sessionData));
  const portalUrl = `${CONFIG.portalUrl}?session=${encodeURIComponent(encodedSession)}`;

  window.open(portalUrl, '_blank');
}

async function clearEmails() {
  if (!confirm('Clear all locally stored emails?')) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_EMAILS' });
    showMessage('Emails cleared', 'success');
  } catch (error) {
    console.error('Clear error:', error);
    showMessage('Failed to clear emails', 'error');
  }
}

async function signOut() {
  if (!confirm('Sign out of EmailBoy?')) {
    return;
  }

  try {
    // Try to sign out on server
    if (currentSession?.access_token) {
      try {
        await fetch(`${CONFIG.functionsUrl}/auth-signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        // Ignore server errors
      }
    }

    // Clear local session
    await chrome.storage.local.remove(['supabaseSession']);
    currentSession = null;

    showMessage('Signed out successfully', 'success');

    // Redirect to not signed in state
    setTimeout(() => {
      document.getElementById('signedIn').classList.add('hidden');
      document.getElementById('notSignedIn').classList.remove('hidden');
    }, 1500);

  } catch (error) {
    console.error('Sign out error:', error);
    showMessage('Failed to sign out', 'error');
  }
}

function showMessage(text, type) {
  const messageEl = document.getElementById('statusMessage');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      messageEl.className = 'message';
    }, 3000);
  }
}
