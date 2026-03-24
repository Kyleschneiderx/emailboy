// Email Extractor Options Page

const CONFIG = {
  supabaseUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4',
  portalUrl: 'https://portal.emailextractorextension.com',
  functionsUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1'
};

let apiToken = null;
let currentUser = null;

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
    const result = await chrome.storage.local.get(['apiToken', 'user']);

    if (!result.apiToken) {
      loadingState.classList.add('hidden');
      notSignedIn.classList.remove('hidden');
      return;
    }

    apiToken = result.apiToken;
    currentUser = result.user;

    // Update UI with user info
    const email = currentUser?.email || 'Unknown';
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

  // Show cached status immediately while fetching fresh data
  const cached = await chrome.storage.local.get(['premiumStatus']);
  if (cached.premiumStatus) {
    statusContainer.classList.add('premium');
    statusText.textContent = 'Premium Active';
  }

  try {
    const response = await fetch(`${CONFIG.functionsUrl}/check-subscription`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('[Email Extractor] options: check-subscription 401 — using cached status');
        // Keep whatever cached status is showing; don't overwrite with "Unknown"
        if (!cached.premiumStatus) {
          statusContainer.classList.remove('premium');
          statusText.textContent = 'Free Plan';
        }
        return;
      }
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
    // On network/server error, keep cached status instead of showing "Unknown"
    if (!cached.premiumStatus) {
      statusText.textContent = 'Free Plan';
    }
  }
}

function openPortal() {
  if (!apiToken) {
    showMessage('Please sign in first', 'error');
    return;
  }

  const portalUrl = `${CONFIG.portalUrl}?token=${encodeURIComponent(apiToken)}`;
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
  if (!confirm('Sign out of Email Extractor?')) {
    return;
  }

  try {
    if (apiToken) {
      try {
        await fetch(`${CONFIG.functionsUrl}/auth-signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        // Ignore server errors
      }
    }

    // Clear local data
    await chrome.storage.local.remove(['apiToken', 'user', 'supabaseSession']);
    await chrome.storage.local.set({ premiumStatus: false });
    chrome.runtime.sendMessage({ type: 'TOKEN_UPDATED' });
    apiToken = null;
    currentUser = null;

    showMessage('Signed out successfully', 'success');

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
