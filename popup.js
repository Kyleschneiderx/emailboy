// Popup script for EmailBoy

let allEmails = [];
let currentUser = null;

// Supabase configuration (pre-configured)
const SUPABASE_CONFIG = {
  url: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4',
  functionsUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1'
};

// Direct Supabase Auth API calls (no library needed)
async function directSupabaseSignUp(email, password) {
  const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_CONFIG.anonKey
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || 'Sign up failed');
  }

  return {
    user: data.user,
    session: data.session ? {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type || 'bearer',
      user: data.user
    } : null
  };
}

async function directSupabaseSignIn(email, password) {
  const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_CONFIG.anonKey
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || 'Sign in failed');
  }

  return {
    user: data.user,
    session: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type || 'bearer',
      user: data.user
    }
  };
}

async function directSupabaseSignOut(accessToken) {
  if (!accessToken) return;
  
  try {
    await fetch(`${SUPABASE_CONFIG.url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_CONFIG.anonKey
      }
    });
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

async function directSupabaseGetUser(accessToken) {
  const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_CONFIG.anonKey
    }
  });

  if (!response.ok) {
    throw new Error('Invalid or expired token');
  }

  const user = await response.json();
  return user;
}

// Get stored session
function getStoredSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['supabaseSession'], (result) => {
      resolve(result.supabaseSession || null);
    });
  });
}

// Save session
function saveSession(session) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ supabaseSession: session }, () => {
      chrome.runtime.sendMessage({
        type: 'SAVE_SUPABASE_SESSION',
        session: session
      });
      resolve();
    });
  });
}

// Clear session
function clearSession() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['supabaseSession'], () => {
      chrome.runtime.sendMessage({
        type: 'SAVE_SUPABASE_SESSION',
        session: null
      });
      resolve();
    });
  });
}

// Check authentication status using edge function (with fallback)
async function checkAuth() {
  try {
    const session = await getStoredSession();
    if (!session || !session.access_token) {
      showAuthSection();
      return false;
    }

    // Try edge function first
    try {
      const response = await fetch(`${SUPABASE_CONFIG.functionsUrl}/auth-session`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.authenticated && data.user) {
        currentUser = data.user;
        showMainContent();
        loadEmails();
        return true;
      } else {
        // Session invalid, clear it
        await clearSession();
        showAuthSection();
        return false;
      }
    } catch (error) {
      // Fallback to direct Supabase auth API check
      console.log('Edge function unavailable, using direct auth API check...');
      
      try {
        const user = await directSupabaseGetUser(session.access_token);
        
        if (user && user.id) {
          currentUser = {
            id: user.id,
            email: user.email,
            created_at: user.created_at
          };
          showMainContent();
          loadEmails();
          return true;
        }
      } catch (e) {
        console.error('Direct auth check failed:', e);
      }
      
      // Session invalid, clear it
      await clearSession();
      showAuthSection();
      return false;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showAuthSection();
    return false;
  }
}

// Show auth section
function showAuthSection() {
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('mainContent').style.display = 'none';
}

// Check premium status
async function checkPremiumStatus() {
  try {
    const session = await getStoredSession();
    if (!session || !session.access_token) {
      return false;
    }

    const response = await fetch(`${SUPABASE_CONFIG.functionsUrl}/check-subscription`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.isPremium === true;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

// Show main content
async function showMainContent() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  if (currentUser) {
    document.getElementById('userEmail').textContent = currentUser.email;
  }
  
  // Check and display premium status
  const isPremium = await checkPremiumStatus();
  if (isPremium) {
    document.getElementById('premiumBadge').style.display = 'inline-flex';
    document.getElementById('freeBadge').style.display = 'none';
    document.getElementById('premiumCTABanner').style.display = 'none';
  } else {
    document.getElementById('premiumBadge').style.display = 'none';
    document.getElementById('freeBadge').style.display = 'inline-flex';
    document.getElementById('premiumCTABanner').style.display = 'block';
  }
}

// Check sync status and update UI
function updateSyncStatus() {
  chrome.storage.local.get(['settings', 'lastSyncError'], (result) => {
    const syncStatus = document.getElementById('syncStatus');
    if (!syncStatus) return;
    
    const autoSync = result.settings?.autoSync !== false;
    const hasError = result.lastSyncError;
    
    if (autoSync && !hasError) {
      syncStatus.style.display = 'flex';
      syncStatus.querySelector('.sync-text').textContent = 'Real-time sync enabled';
    } else if (hasError) {
      syncStatus.style.display = 'flex';
      syncStatus.querySelector('.sync-indicator').style.background = '#f44336';
      syncStatus.querySelector('.sync-text').textContent = 'Sync error - check settings';
    } else {
      syncStatus.style.display = 'none';
    }
  });
}

// Load emails on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupEventListeners();
  updateSyncStatus();
  
  // Update sync status periodically
  setInterval(updateSyncStatus, 5000);
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('syncBtn')?.addEventListener('click', syncToDatabase);
  document.getElementById('exportBtn')?.addEventListener('click', exportToCSV);
  document.getElementById('searchInput')?.addEventListener('input', filterEmails);
  document.getElementById('signInBtn')?.addEventListener('click', handleSignIn);
  document.getElementById('signUpBtn')?.addEventListener('click', handleSignUp);
  document.getElementById('upgradeCTABtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  });
  // Toggle between sign in and sign up
  let isSignUpMode = false;
  const toggleAuthMode = (e) => {
    if (e) e.preventDefault();
    isSignUpMode = !isSignUpMode;
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const authSwitch = document.querySelector('.auth-switch');
    
    if (isSignUpMode) {
      signInBtn.style.display = 'none';
      signUpBtn.style.display = 'inline-block';
      authSwitch.innerHTML = 'Already have an account? <a href="#" id="showSignIn">Sign in</a>';
      document.getElementById('showSignIn')?.addEventListener('click', toggleAuthMode);
    } else {
      signInBtn.style.display = 'inline-block';
      signUpBtn.style.display = 'none';
      authSwitch.innerHTML = 'Don\'t have an account? <a href="#" id="showSignUp">Sign up</a>';
      document.getElementById('showSignUp')?.addEventListener('click', toggleAuthMode);
    }
  };
  
  document.getElementById('showSignUp')?.addEventListener('click', toggleAuthMode);
}

// Handle sign in using edge function (with fallback)
async function handleSignIn() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  const btn = document.getElementById('signInBtn');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    let response;
    let data;
    
    try {
      response = await fetch(`${SUPABASE_CONFIG.functionsUrl}/auth-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      data = await response.json();

      if (!response.ok || !data.success) {
        // If 404 or 401, try direct auth as fallback
        if (response.status === 404 || response.status === 401) {
          throw new Error('EDGE_FUNCTION_UNAVAILABLE');
        }
        throw new Error(data.error || 'Sign in failed');
      }
    } catch (error) {
      // Fallback to direct Supabase auth API if edge function fails
      if (error.message === 'EDGE_FUNCTION_UNAVAILABLE' || error.message.includes('Failed to fetch')) {
        console.log('Falling back to direct Supabase authentication API...');
        
        try {
          const authData = await directSupabaseSignIn(email, password);

          if (!authData.session || !authData.user) {
            throw new Error('Failed to create session');
          }

          data = {
            success: true,
            user: authData.user,
            session: authData.session
          };
        } catch (authError) {
          throw new Error(authError.message || 'Sign in failed');
        }
      } else {
        throw error;
      }
    }

    // Save session
    await saveSession(data.session);
    currentUser = data.user;
    showMainContent();
    loadEmails();
    errorEl.style.display = 'none';
  } catch (error) {
    errorEl.textContent = error.message || 'Sign in failed';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// Handle sign up using edge function
async function handleSignUp() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');
  const btn = document.getElementById('signUpBtn');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    errorEl.style.display = 'block';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  try {
    // Try edge function first, fallback to direct auth if it fails
    let response;
    let data;
    
    try {
      response = await fetch(`${SUPABASE_CONFIG.functionsUrl}/auth-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      try {
        data = await response.json();
      } catch (e) {
        // If response isn't JSON, get text
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text || response.statusText}`);
      }

      if (!response.ok) {
        console.error('Edge function signup error:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        // If 404 or 401, try direct auth as fallback
        if (response.status === 404 || response.status === 401) {
          console.log('Edge function not available, using direct Supabase auth...');
          throw new Error('EDGE_FUNCTION_UNAVAILABLE');
        }
        
        throw new Error(data.error || data.message || `Sign up failed (${response.status})`);
      }
    } catch (error) {
      // Fallback to direct Supabase auth API if edge function fails
      if (error.message === 'EDGE_FUNCTION_UNAVAILABLE' || error.message.includes('Failed to fetch')) {
        console.log('Falling back to direct Supabase authentication API...');
        
        try {
          const authData = await directSupabaseSignUp(email, password);

          // Handle response similar to edge function
          if (authData.user && !authData.session) {
            data = {
              success: true,
              user: authData.user,
              message: 'Account created! Please check your email to verify your account, then sign in.',
              requiresEmailConfirmation: true
            };
          } else if (authData.session && authData.user) {
            data = {
              success: true,
              user: authData.user,
              session: authData.session
            };
          } else {
            data = {
              success: true,
              user: authData.user,
              message: 'Account created successfully'
            };
          }
        } catch (authError) {
          throw new Error(authError.message || 'Sign up failed');
        }
      } else {
        throw error;
      }
    }

    // Check if email confirmation is required
    if (data.requiresEmailConfirmation || (data.success && !data.session)) {
      errorEl.textContent = data.message || 'Account created! Please check your email to verify your account, then sign in.';
      errorEl.style.display = 'block';
      errorEl.className = 'auth-error success';
      
      // Switch to sign in mode
      document.getElementById('signInBtn').style.display = 'inline-block';
      document.getElementById('signUpBtn').style.display = 'none';
      const authSwitch = document.querySelector('.auth-switch');
      authSwitch.innerHTML = 'Don\'t have an account? <a href="#" id="showSignUp">Sign up</a>';
      document.getElementById('showSignUp')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signUpBtn').style.display = 'inline-block';
        document.getElementById('signInBtn').style.display = 'none';
        authSwitch.innerHTML = 'Already have an account? <a href="#" id="showSignIn">Sign in</a>';
        document.getElementById('showSignIn')?.addEventListener('click', (e) => {
          e.preventDefault();
          document.getElementById('signInBtn').style.display = 'inline-block';
          document.getElementById('signUpBtn').style.display = 'none';
          authSwitch.innerHTML = 'Don\'t have an account? <a href="#" id="showSignUp">Sign up</a>';
          document.getElementById('showSignUp')?.addEventListener('click', arguments.callee);
        });
      });
    } else if (data.session) {
      // Session created (email auto-confirmed), save and sign in
      await saveSession(data.session);
      currentUser = data.user;
      showMainContent();
      loadEmails();
      errorEl.style.display = 'none';
    } else {
      // Fallback
      errorEl.textContent = data.message || 'Account created successfully!';
      errorEl.style.display = 'block';
      errorEl.className = 'auth-error success';
    }
  } catch (error) {
    errorEl.textContent = error.message || 'Sign up failed';
    errorEl.style.display = 'block';
    errorEl.className = 'auth-error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign Up';
  }
}

// Handle sign out using edge function (with fallback)
async function handleSignOut() {
  try {
    const session = await getStoredSession();
    if (session && session.access_token) {
      try {
        await fetch(`${SUPABASE_CONFIG.functionsUrl}/auth-signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        // Fallback to direct API
        await directSupabaseSignOut(session.access_token);
      }
    }
    
    await clearSession();
    currentUser = null;
    showAuthSection();
    allEmails = [];
    await displayEmails([]);
    updateStats([]);
  } catch (error) {
    console.error('Sign out error:', error);
    // Clear session anyway
    await clearSession();
    currentUser = null;
    showAuthSection();
  }
}

// Load emails from storage and Supabase
async function loadEmails() {
  // Load from local storage first (for quick display)
  chrome.runtime.sendMessage({ type: 'GET_EMAILS' }, async (response) => {
    if (response && response.emails) {
      allEmails = response.emails;
      await displayEmails(allEmails);
      updateStats(allEmails);
    }

    // Also try to load from Supabase via edge function if authenticated
    if (currentUser) {
      try {
        const session = await getStoredSession();
        if (session && session.access_token) {
          const response = await fetch(`${SUPABASE_CONFIG.functionsUrl}/get-emails`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();
          if (data.success && data.emails && data.emails.length > 0) {
            // Merge with local emails
            const emailMap = new Map();
            allEmails.forEach(e => emailMap.set(e.email, e));
            data.emails.forEach(e => emailMap.set(e.email, e));
            allEmails = Array.from(emailMap.values());
            await displayEmails(allEmails);
            updateStats(allEmails);
          }
        }
      } catch (error) {
        console.error('Error loading from Supabase:', error);
      }
    }
  });
}

// Display emails in the list
async function displayEmails(emails) {
  const emailList = document.getElementById('emailList');
  
  if (emails.length === 0) {
    // Check premium status to show appropriate message
    const isPremium = await checkPremiumStatus();
    if (!isPremium) {
      emailList.innerHTML = '<div class="empty-state"><strong>Premium Required</strong><br>Upgrade to Premium to start collecting emails while you browse the web.</div>';
    } else {
      emailList.innerHTML = '<div class="empty-state">No emails found yet. Start browsing to collect emails!</div>';
    }
    return;
  }
  
  // Sort by last seen (most recent first)
  const sortedEmails = [...emails].sort((a, b) => {
    return new Date(b.lastSeen || b.timestamp) - new Date(a.lastSeen || a.timestamp);
  });
  
  emailList.innerHTML = sortedEmails.map(item => {
    const urls = item.urls || [item.url];
    const displayUrl = urls[0] || 'Unknown';
    const urlCount = urls.length;
    const lastSeen = new Date(item.lastSeen || item.timestamp).toLocaleString();
    
    return `
      <div class="email-item">
        <div class="email-header">
          <span class="email-address">${escapeHtml(item.email)}</span>
          <span class="email-domain">@${item.domain}</span>
        </div>
        <div class="email-meta">
          <span class="email-url" title="${escapeHtml(displayUrl)}">${truncateUrl(displayUrl)}</span>
          ${urlCount > 1 ? `<span class="url-count">+${urlCount - 1} more</span>` : ''}
          <span class="email-time">${lastSeen}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Update statistics
function updateStats(emails) {
  const totalCount = emails.length;
  const uniqueDomains = new Set(emails.map(e => e.domain)).size;
  
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('domainCount').textContent = uniqueDomains;
}

// Filter emails by search query
async function filterEmails() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allEmails.filter(item => 
    item.email.toLowerCase().includes(query) ||
    item.domain.toLowerCase().includes(query) ||
    (item.url && item.url.toLowerCase().includes(query))
  );
  await displayEmails(filtered);
  updateStats(filtered);
}

// Sync to database (Supabase via edge function)
async function syncToDatabase() {
  const btn = document.getElementById('syncBtn');
  btn.disabled = true;
  btn.textContent = 'Syncing...';
  
  if (!currentUser) {
    btn.disabled = false;
    btn.textContent = 'Sync';
    showNotification('❌ Please sign in first', 'error');
    return;
  }

  try {
    const session = await getStoredSession();
    if (!session || !session.access_token) {
      throw new Error('Not authenticated');
    }

    chrome.runtime.sendMessage({ type: 'GET_EMAILS' }, async (response) => {
      if (response && response.emails) {
        try {
          const syncResponse = await fetch(`${SUPABASE_CONFIG.functionsUrl}/store-emails`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emails: response.emails })
          });

          const data = await syncResponse.json();
          
          if (syncResponse.ok && data.success) {
            showNotification('✅ Synced to Supabase successfully!', 'success');
            loadEmails(); // Reload to show synced emails
          } else {
            throw new Error(data.error || 'Sync failed');
          }
        } catch (error) {
          showNotification('❌ Sync failed: ' + error.message, 'error');
        }
      }
      
      btn.disabled = false;
      btn.textContent = 'Sync';
    });
  } catch (error) {
    btn.disabled = false;
    btn.textContent = 'Sync';
    showNotification('❌ Sync failed: ' + error.message, 'error');
  }
}

// Clear all emails
async function clearEmails() {
  if (confirm('Are you sure you want to clear all collected emails?')) {
    chrome.runtime.sendMessage({ type: 'CLEAR_EMAILS' }, async (response) => {
      if (response && response.success) {
        allEmails = [];
        await displayEmails([]);
        updateStats([]);
        showNotification('✅ All emails cleared', 'success');
      }
    });
  }
}

// Export to CSV
function exportToCSV() {
  if (allEmails.length === 0) {
    showNotification('No emails to export', 'error');
    return;
  }
  
  const csvHeader = 'Email,Domain,URL,Last Seen\n';
  const csvRows = allEmails.map(item => {
    const urls = item.urls || [item.url];
    const url = urls.join('; ');
    const lastSeen = item.lastSeen || item.timestamp;
    return `"${item.email}","${item.domain}","${url}","${lastSeen}"`;
  }).join('\n');
  
  const csv = csvHeader + csvRows;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `emailboy-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('✅ CSV exported successfully!', 'success');
}

// Show notification
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateUrl(url, maxLength = 50) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

