// EmailBoy Background Service Worker

const CONFIG = {
  supabaseUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4',
  portalUrl: 'https://portal-six-henna.vercel.app'
};

CONFIG.functionsUrl = `${CONFIG.supabaseUrl}/functions/v1`;

// Premium status cache
let premiumCache = {
  isPremium: false,
  lastChecked: 0,
  checkInProgress: null
};
const PREMIUM_CACHE_TTL = 60000;

// Token refresh state
let refreshInProgress = null;

// ============================================
// TOKEN REFRESH LOGIC
// ============================================

// Check if token is expired or about to expire (within 30 minutes)
function isTokenExpired(session) {
  if (!session?.expires_at) return true;

  const expiresAt = session.expires_at * 1000; // Convert to milliseconds
  const now = Date.now();
  const bufferTime = 30 * 60 * 1000; // 30 minutes buffer — refresh well before expiry

  return now >= (expiresAt - bufferTime);
}

// Refresh the access token using refresh_token
async function refreshToken() {
  // If refresh already in progress, wait for it
  if (refreshInProgress) {
    return refreshInProgress;
  }

  refreshInProgress = (async () => {
    try {
      const result = await chrome.storage.local.get(['supabaseSession']);
      const session = result.supabaseSession;

      if (!session?.refresh_token) {
        console.log('[EmailBoy] No refresh token available');
        return null;
      }

      console.log('[EmailBoy] Refreshing access token...');

      const response = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.supabaseKey
        },
        body: JSON.stringify({
          refresh_token: session.refresh_token
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[EmailBoy] Token refresh failed:', error);

        // If refresh token is invalid, clear session
        if (response.status === 400 || response.status === 401) {
          await chrome.storage.local.remove(['supabaseSession']);
          await chrome.storage.local.set({ premiumStatus: false });
          premiumCache = { isPremium: false, lastChecked: 0, checkInProgress: null };
        }
        return null;
      }

      const data = await response.json();

      // Save new session
      const newSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        user: data.user || session.user
      };

      await chrome.storage.local.set({ supabaseSession: newSession });
      console.log('[EmailBoy] Token refreshed successfully');

      return newSession;
    } catch (error) {
      console.error('[EmailBoy] Token refresh error:', error);
      return null;
    } finally {
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
}

// Get valid session — always refreshes if expired, never clears on its own
async function getValidSession() {
  const result = await chrome.storage.local.get(['supabaseSession']);
  let session = result.supabaseSession;

  if (!session?.access_token) {
    return null;
  }

  // Check if token needs refresh
  if (isTokenExpired(session)) {
    console.log('[EmailBoy] Token expired, refreshing...');
    const refreshed = await refreshToken();
    // If refresh succeeded use new session, otherwise return old one
    // and let the caller handle the 401
    session = refreshed || session;
  }

  return session;
}

// ============================================
// INITIALIZATION
// ============================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('EmailBoy installed');
  chrome.storage.local.set({
    emails: [],
    settings: { autoSync: true },
    premiumStatus: false
  });
});

// ============================================
// MESSAGE HANDLER
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'NEW_EMAILS':
      return await handleNewEmails(message.emails, message.url, message.timestamp);

    case 'GET_EMAILS':
      const result = await chrome.storage.local.get(['emails']);
      return { emails: result.emails || [] };

    case 'CLEAR_EMAILS':
      await chrome.storage.local.set({ emails: [] });
      chrome.action.setBadgeText({ text: '' });
      return { success: true };

    case 'SESSION_UPDATED':
      premiumCache = { isPremium: false, lastChecked: 0, checkInProgress: null };
      checkPremiumStatus(true);
      return { success: true };

    case 'CHECK_PREMIUM':
      const now = Date.now();
      const isStale = now - premiumCache.lastChecked >= PREMIUM_CACHE_TTL;

      if (premiumCache.lastChecked > 0 || premiumCache.isPremium) {
        if (isStale) {
          checkPremiumStatus().catch(() => {});
        }
        return { isPremium: premiumCache.isPremium };
      }

      const isPremium = await checkPremiumStatus();
      return { isPremium };

    case 'SYNC_NOW':
      return await syncToSupabase();

    case 'REFRESH_PREMIUM':
      const freshStatus = await checkPremiumStatus(true);
      return { isPremium: freshStatus };

    case 'REFRESH_TOKEN':
      const newSession = await refreshToken();
      return { success: !!newSession, session: newSession };

    default:
      return { error: 'Unknown message type' };
  }
}

// ============================================
// PREMIUM STATUS CHECK
// ============================================

async function checkPremiumStatus(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && now - premiumCache.lastChecked < PREMIUM_CACHE_TTL) {
    return premiumCache.isPremium;
  }

  if (premiumCache.checkInProgress) {
    try {
      return await premiumCache.checkInProgress;
    } catch {
      return premiumCache.isPremium;
    }
  }

  premiumCache.checkInProgress = (async () => {
    try {
      // Get valid session (refreshes token if needed)
      const session = await getValidSession();

      if (!session?.access_token) {
        premiumCache.isPremium = false;
        premiumCache.lastChecked = now;
        await chrome.storage.local.set({ premiumStatus: false });
        return false;
      }

      const response = await fetch(`${CONFIG.functionsUrl}/check-subscription`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      // If unauthorized, try refreshing token once
      if (response.status === 401) {
        console.log('[EmailBoy] Unauthorized, attempting token refresh...');
        const newSession = await refreshToken();
        if (newSession) {
          const retryResponse = await fetch(`${CONFIG.functionsUrl}/check-subscription`, {
            headers: {
              'Authorization': `Bearer ${newSession.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            premiumCache.isPremium = data.isPremium === true;
            premiumCache.lastChecked = now;
            await chrome.storage.local.set({ premiumStatus: premiumCache.isPremium });
            return premiumCache.isPremium;
          }
        }
        // Refresh failed, user needs to re-login
        premiumCache.isPremium = false;
        premiumCache.lastChecked = now;
        return false;
      }

      if (!response.ok) {
        premiumCache.lastChecked = now;
        return premiumCache.isPremium;
      }

      const data = await response.json();
      premiumCache.isPremium = data.isPremium === true;
      premiumCache.lastChecked = now;
      await chrome.storage.local.set({ premiumStatus: premiumCache.isPremium });

      return premiumCache.isPremium;
    } catch (error) {
      console.error('Premium check error:', error);
      premiumCache.lastChecked = now;
      return premiumCache.isPremium;
    } finally {
      premiumCache.checkInProgress = null;
    }
  })();

  return premiumCache.checkInProgress;
}

// ============================================
// EMAIL HANDLING
// ============================================

async function handleNewEmails(emails, url, timestamp) {
  try {
    const isPremium = premiumCache.isPremium || (await checkPremiumStatus());

    const result = await chrome.storage.local.get(['emails', 'settings']);
    const existingEmails = result.emails || [];
    const settings = result.settings || {};

    const newEmailObjects = emails.map(email => ({
      email: email.toLowerCase().trim(),
      url: url,
      timestamp: timestamp,
      domain: email.split('@')[1],
      lastSeen: timestamp
    }));

    const emailMap = new Map();
    existingEmails.forEach(item => emailMap.set(item.email, item));

    let addedCount = 0;
    newEmailObjects.forEach(item => {
      const existing = emailMap.get(item.email);
      if (existing) {
        if (!existing.urls) existing.urls = [existing.url];
        if (!existing.urls.includes(item.url)) {
          existing.urls.push(item.url);
        }
        existing.lastSeen = item.timestamp;
      } else {
        addedCount++;
        emailMap.set(item.email, { ...item, urls: [item.url] });
      }
    });

    const updatedEmails = Array.from(emailMap.values());
    await chrome.storage.local.set({ emails: updatedEmails });
    updateBadge(updatedEmails.length);

    if (settings.autoSync !== false && addedCount > 0) {
      syncToSupabase().catch(err => console.error('Auto-sync error:', err));
    }

    return { success: true, count: updatedEmails.length, added: addedCount };
  } catch (error) {
    console.error('Handle new emails error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SYNC TO SUPABASE
// ============================================

async function syncToSupabase() {
  try {
    const result = await chrome.storage.local.get(['emails']);
    const emails = result.emails || [];

    // Get valid session (refreshes if needed)
    const session = await getValidSession();

    if (!session?.access_token) {
      return { success: false, reason: 'not_authenticated' };
    }

    if (emails.length === 0) {
      return { success: true, count: 0 };
    }

    const response = await fetch(`${CONFIG.functionsUrl}/store-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ emails })
    });

    // If unauthorized, try refresh and retry
    if (response.status === 401) {
      const newSession = await refreshToken();
      if (newSession) {
        const retryResponse = await fetch(`${CONFIG.functionsUrl}/store-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newSession.access_token}`
          },
          body: JSON.stringify({ emails })
        });
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          if (data.success) {
            console.log(`Synced ${data.count} emails to Supabase`);
            showSyncSuccess();
            return { success: true, count: data.count };
          }
        }
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Sync failed');
    }

    const data = await response.json();

    if (data.success) {
      console.log(`Synced ${data.count} emails to Supabase`);
      await chrome.storage.local.remove(['lastSyncError']);
      showSyncSuccess();
      return { success: true, count: data.count };
    } else {
      throw new Error(data.error || 'Sync failed');
    }
  } catch (error) {
    console.error('Sync error:', error);
    await chrome.storage.local.set({ lastSyncError: error.message });
    showSyncError();
    return { success: false, error: error.message };
  }
}

// ============================================
// BADGE HELPERS
// ============================================

function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4AE3A7' });
}

function showSyncSuccess() {
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#4AE3A7' });
  setTimeout(async () => {
    const result = await chrome.storage.local.get(['emails']);
    updateBadge((result.emails || []).length);
  }, 2000);
}

function showSyncError() {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF6B4A' });
}

// ============================================
// EVENT LISTENERS
// ============================================

// Handle checkout success
chrome.webNavigation?.onCommitted?.addListener(async (details) => {
  if (details.url.includes(CONFIG.portalUrl) && details.url.includes('checkout=success')) {
    console.log('Checkout success detected');
    setTimeout(() => checkPremiumStatus(true), 2000);
  }
});

// ============================================
// STARTUP & PERIODIC TASKS
// ============================================

// Initialize on startup
chrome.storage.local.get(['premiumStatus', 'supabaseSession']).then(async (result) => {
  if (result.premiumStatus !== undefined) {
    premiumCache.isPremium = result.premiumStatus;
    premiumCache.lastChecked = Date.now() - PREMIUM_CACHE_TTL + 5000;
  }

  // Check if token needs refresh on startup
  if (result.supabaseSession && isTokenExpired(result.supabaseSession)) {
    console.log('[EmailBoy] Token expired on startup, refreshing...');
    await refreshToken();
  }

  // Refresh premium status after startup
  setTimeout(() => checkPremiumStatus(true).catch(() => {}), 2000);
});

// Periodically check and refresh token (every 30 minutes)
setInterval(async () => {
  const result = await chrome.storage.local.get(['supabaseSession']);
  if (result.supabaseSession && isTokenExpired(result.supabaseSession)) {
    console.log('[EmailBoy] Periodic token refresh...');
    await refreshToken();
  }
}, 30 * 60 * 1000);

// Periodically refresh premium status (every 5 minutes)
setInterval(() => {
  checkPremiumStatus(true).catch(() => {});
}, 5 * 60 * 1000);

// Listen for when Chrome starts (alarm-based for MV3)
chrome.alarms?.create('tokenRefresh', { periodInMinutes: 30 });
chrome.alarms?.create('premiumCheck', { periodInMinutes: 5 });

chrome.alarms?.onAlarm?.addListener(async (alarm) => {
  if (alarm.name === 'tokenRefresh') {
    const result = await chrome.storage.local.get(['supabaseSession']);
    if (result.supabaseSession && isTokenExpired(result.supabaseSession)) {
      await refreshToken();
    }
  } else if (alarm.name === 'premiumCheck') {
    checkPremiumStatus(true).catch(() => {});
  }
});
