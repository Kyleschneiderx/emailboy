// EmailBoy Popup Script - Optimized for fast loading

const CONFIG = {
  supabaseUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4',
  portalUrl: 'https://portal.emailextractorextension.com'
};

CONFIG.functionsUrl = `${CONFIG.supabaseUrl}/functions/v1`;

// State
let currentUser = null;
let currentSession = null;
let allEmails = [];
let isPremium = false;
let isSignUpMode = false;

// DOM Elements
const elements = {};

// Initialize - fast path using cached data
document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  setupEventListeners();
  await checkAuthFast();
});

function cacheElements() {
  elements.authSection = document.getElementById('authSection');
  elements.mainContent = document.getElementById('mainContent');
  elements.authError = document.getElementById('authError');
  elements.authEmail = document.getElementById('authEmail');
  elements.authPassword = document.getElementById('authPassword');
  elements.signInBtn = document.getElementById('signInBtn');
  elements.signUpBtn = document.getElementById('signUpBtn');
  elements.authSwitchText = document.getElementById('authSwitchText');
  elements.authSwitchLink = document.getElementById('authSwitchLink');
  elements.userEmail = document.getElementById('userEmail');
  elements.premiumBadge = document.getElementById('premiumBadge');
  elements.freeBadge = document.getElementById('freeBadge');
  elements.premiumCTA = document.getElementById('premiumCTA');
  elements.upgradeBtn = document.getElementById('upgradeBtn');
  elements.totalCount = document.getElementById('totalCount');
  elements.domainCount = document.getElementById('domainCount');
  elements.syncBtn = document.getElementById('syncBtn');
  elements.exportBtn = document.getElementById('exportBtn');
  elements.portalBtn = document.getElementById('portalBtn');
  elements.signOutBtn = document.getElementById('signOutBtn');
  elements.searchInput = document.getElementById('searchInput');
  elements.emailList = document.getElementById('emailList');
}

function setupEventListeners() {
  elements.signInBtn.addEventListener('click', handleSignIn);
  elements.signUpBtn.addEventListener('click', handleSignUp);
  elements.authSwitchLink.addEventListener('click', toggleAuthMode);
  elements.signOutBtn.addEventListener('click', handleSignOut);
  elements.syncBtn.addEventListener('click', handleSync);
  elements.exportBtn.addEventListener('click', handleExport);
  elements.portalBtn.addEventListener('click', handleOpenPortal);
  elements.upgradeBtn?.addEventListener('click', handleUpgrade);
  elements.searchInput.addEventListener('input', handleSearch);

  // Enter key for auth forms
  elements.authEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') elements.authPassword.focus();
  });
  elements.authPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') isSignUpMode ? handleSignUp() : handleSignIn();
  });
}

// Fast auth check - use cached data first, verify in background
async function checkAuthFast() {
  try {
    // Get all cached data at once
    const result = await chrome.storage.local.get(['supabaseSession', 'emails', 'premiumStatus']);
    const session = result.supabaseSession;

    if (!session || !session.access_token) {
      showAuthSection();
      return;
    }

    // Immediately show main content with cached data
    currentSession = session;
    currentUser = session.user;
    allEmails = result.emails || [];
    isPremium = result.premiumStatus || false;

    // Show UI immediately with cached data
    showMainContentFast();

    // Verify session and refresh data in background
    verifySessionInBackground(session.access_token);
  } catch (error) {
    console.error('Auth check error:', error);
    showAuthSection();
  }
}

// Show main content immediately with cached data
function showMainContentFast() {
  elements.authSection.classList.remove('visible');
  elements.mainContent.classList.add('visible');

  if (currentUser) {
    elements.userEmail.textContent = currentUser.email;
  }

  // Update UI with cached premium status
  updatePremiumUI();

  // Display cached emails immediately
  displayEmails(allEmails);
  updateStats(allEmails);
}

// Verify and refresh in background
async function verifySessionInBackground(token) {
  try {
    // Verify session is still valid
    const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': CONFIG.supabaseKey
      }
    });

    if (!response.ok) {
      // Token expired — ask background to refresh using the refresh token
      console.log('[EmailBoy] Token invalid, attempting refresh...');
      const refreshResult = await chrome.runtime.sendMessage({ type: 'REFRESH_TOKEN' });

      if (refreshResult?.success && refreshResult.session) {
        // Refresh worked — update local state and re-verify
        currentSession = refreshResult.session;
        currentUser = refreshResult.session.user || currentUser;
        elements.userEmail.textContent = currentUser?.email || '';
        refreshPremiumStatus();
        loadEmailsFromSupabase();
        return;
      }

      // Refresh also failed — user must re-login
      await clearSession();
      showAuthSection();
      return;
    }

    const user = await response.json();
    currentUser = user;
    elements.userEmail.textContent = user.email;

    // Refresh premium status in background
    refreshPremiumStatus();

    // Load fresh emails from Supabase in background
    loadEmailsFromSupabase();
  } catch (error) {
    console.error('Background verification error:', error);
    // Keep using cached data on error
  }
}

async function refreshPremiumStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'REFRESH_PREMIUM' });
    if (response?.isPremium !== undefined) {
      isPremium = response.isPremium;
      updatePremiumUI();
    }
  } catch (error) {
    console.error('Premium refresh error:', error);
  }
}

async function loadEmailsFromSupabase() {
  if (!currentSession?.access_token) return;

  try {
    const response = await fetch(`${CONFIG.functionsUrl}/get-emails?limit=100`, {
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.emails) {
        // Merge with local emails
        const emailMap = new Map();
        allEmails.forEach(e => emailMap.set(e.email, e));
        data.emails.forEach(e => emailMap.set(e.email, e));
        allEmails = Array.from(emailMap.values());
        displayEmails(allEmails);
        updateStats(allEmails);
      }
    }
  } catch (error) {
    console.error('Error loading from Supabase:', error);
  }
}

// Auth functions
async function handleSignIn() {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    showAuthError('Please enter email and password');
    return;
  }

  setButtonLoading(elements.signInBtn, true, 'Signing in...');
  hideAuthError();

  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.supabaseKey
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.msg || 'Sign in failed');
    }

    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user: data.user
    };

    await saveSession(session);
    currentUser = data.user;
    currentSession = session;

    // Load local emails
    const result = await chrome.storage.local.get(['emails', 'premiumStatus']);
    allEmails = result.emails || [];
    isPremium = result.premiumStatus || false;

    showMainContentFast();

    // Refresh premium status since we just signed in
    refreshPremiumStatus();
  } catch (error) {
    showAuthError(error.message);
  } finally {
    setButtonLoading(elements.signInBtn, false, 'Sign In');
  }
}

async function handleSignUp() {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    showAuthError('Please enter email and password');
    return;
  }

  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters');
    return;
  }

  setButtonLoading(elements.signUpBtn, true, 'Creating account...');
  hideAuthError();

  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.supabaseKey
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.msg || 'Sign up failed');
    }

    // Check if email confirmation is required
    if (data.user && !data.access_token) {
      showAuthError('Account created! Check your email to verify, then sign in.', true);
      toggleAuthMode();
    } else if (data.access_token) {
      // Auto-confirmed, sign in immediately
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        user: data.user
      };

      await saveSession(session);
      currentUser = data.user;
      currentSession = session;

      const result = await chrome.storage.local.get(['emails']);
      allEmails = result.emails || [];

      showMainContentFast();
      refreshPremiumStatus();
    }
  } catch (error) {
    showAuthError(error.message);
  } finally {
    setButtonLoading(elements.signUpBtn, false, 'Create Account');
  }
}

async function handleSignOut() {
  try {
    if (currentSession?.access_token) {
      await fetch(`${CONFIG.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': CONFIG.supabaseKey
        }
      }).catch(() => {});
    }

    await clearSession();
    currentUser = null;
    currentSession = null;
    allEmails = [];
    showAuthSection();
  } catch (error) {
    console.error('Sign out error:', error);
    await clearSession();
    showAuthSection();
  }
}

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  isSignUpMode = !isSignUpMode;

  if (isSignUpMode) {
    elements.signInBtn.style.display = 'none';
    elements.signUpBtn.style.display = 'flex';
    elements.authSwitchText.textContent = 'Already have an account?';
    elements.authSwitchLink.textContent = 'Sign in';
  } else {
    elements.signInBtn.style.display = 'flex';
    elements.signUpBtn.style.display = 'none';
    elements.authSwitchText.textContent = "Don't have an account?";
    elements.authSwitchLink.textContent = 'Sign up';
  }

  hideAuthError();
}

// Session management
async function saveSession(session) {
  await chrome.storage.local.set({ supabaseSession: session });
  chrome.runtime.sendMessage({ type: 'SESSION_UPDATED', session });
}

async function clearSession() {
  await chrome.storage.local.remove(['supabaseSession']);
  await chrome.storage.local.set({ premiumStatus: false });
  chrome.runtime.sendMessage({ type: 'SESSION_UPDATED', session: null });
}

// UI functions
function showAuthSection() {
  elements.authSection.classList.add('visible');
  elements.mainContent.classList.remove('visible');
}

function updatePremiumUI() {
  if (isPremium) {
    elements.premiumBadge.style.display = 'inline-flex';
    elements.freeBadge.style.display = 'none';
    elements.premiumCTA.style.display = 'none';
  } else {
    elements.premiumBadge.style.display = 'none';
    elements.freeBadge.style.display = 'inline-flex';
    elements.premiumCTA.style.display = 'block';
  }
}

// Email functions
function displayEmails(emails) {
  if (emails.length === 0) {
    elements.emailList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>${isPremium
          ? 'No emails collected yet.<br>Start browsing to collect emails!'
          : 'Upgrade to Premium to start collecting emails.'
        }</p>
      </div>
    `;
    return;
  }

  // Sort by most recent
  const sorted = [...emails].sort((a, b) => {
    const dateA = new Date(b.lastSeen || b.timestamp || 0);
    const dateB = new Date(a.lastSeen || a.timestamp || 0);
    return dateA - dateB;
  });

  // Show max 50 in popup
  const display = sorted.slice(0, 50);

  elements.emailList.innerHTML = display.map(item => `
    <div class="email-item">
      <div class="email-address">${escapeHtml(item.email)}</div>
      <div class="email-meta">${item.domain} · ${formatDate(item.lastSeen || item.timestamp)}</div>
    </div>
  `).join('');
}

function updateStats(emails) {
  elements.totalCount.textContent = emails.length;
  elements.domainCount.textContent = new Set(emails.map(e => e.domain)).size;
}

function handleSearch() {
  const query = elements.searchInput.value.toLowerCase().trim();

  if (!query) {
    displayEmails(allEmails);
    updateStats(allEmails);
    return;
  }

  const filtered = allEmails.filter(item =>
    item.email.toLowerCase().includes(query) ||
    item.domain.toLowerCase().includes(query)
  );

  displayEmails(filtered);
  updateStats(filtered);
}

// Actions
async function handleSync() {
  if (!currentSession?.access_token) {
    showNotification('Please sign in first', 'error');
    return;
  }

  setButtonLoading(elements.syncBtn, true, 'Syncing...');

  try {
    const result = await chrome.storage.local.get(['emails']);
    const emails = result.emails || [];

    if (emails.length === 0) {
      showNotification('No emails to sync', 'error');
      return;
    }

    const response = await fetch(`${CONFIG.functionsUrl}/store-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emails })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showNotification(`Synced ${data.count || emails.length} emails`, 'success');
      // Refresh emails from server
      loadEmailsFromSupabase();
    } else {
      throw new Error(data.error || 'Sync failed');
    }
  } catch (error) {
    showNotification('Sync failed: ' + error.message, 'error');
  } finally {
    setButtonLoading(elements.syncBtn, false, 'Sync');
  }
}

function handleExport() {
  if (!currentSession?.access_token) {
    showNotification('Please sign in first', 'error');
    return;
  }

  const sessionData = {
    access_token: currentSession.access_token,
    refresh_token: currentSession.refresh_token,
    expires_at: currentSession.expires_at,
    user: currentSession.user || currentUser
  };

  const encoded = btoa(JSON.stringify(sessionData));
  const portalUrl = `${CONFIG.portalUrl}?session=${encodeURIComponent(encoded)}&view=emails`;
  chrome.tabs.create({ url: portalUrl });
}

function handleOpenPortal() {
  if (!currentSession?.access_token) {
    showNotification('Please sign in first', 'error');
    return;
  }

  // Encode session for portal
  const sessionData = {
    access_token: currentSession.access_token,
    refresh_token: currentSession.refresh_token,
    expires_at: currentSession.expires_at,
    user: currentSession.user || currentUser
  };

  const encoded = btoa(JSON.stringify(sessionData));
  const portalUrl = `${CONFIG.portalUrl}?session=${encodeURIComponent(encoded)}`;

  chrome.tabs.create({ url: portalUrl });
}

async function handleUpgrade() {
  if (!currentSession?.access_token) {
    showNotification('Please sign in first', 'error');
    return;
  }

  setButtonLoading(elements.upgradeBtn, true, 'Loading...');

  try {
    const response = await fetch(`${CONFIG.functionsUrl}/create-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout');
    }

    if (data.url) {
      chrome.tabs.create({ url: data.url });
    } else {
      throw new Error('No checkout URL received');
    }
  } catch (error) {
    showNotification('Upgrade failed: ' + error.message, 'error');
  } finally {
    setButtonLoading(elements.upgradeBtn, false, 'Upgrade Now');
  }
}

// Utility functions
function showAuthError(message, isSuccess = false) {
  elements.authError.textContent = message;
  elements.authError.classList.add('visible');
  elements.authError.classList.toggle('success', isSuccess);
}

function hideAuthError() {
  elements.authError.classList.remove('visible');
}

function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span>`
    : text;
}

function showNotification(message, type) {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}
