// Email Extractor Background Service Worker

const CONFIG = {
  supabaseUrl: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4',
  portalUrl: 'https://portal.emailextractorextension.com'
};

CONFIG.functionsUrl = `${CONFIG.supabaseUrl}/functions/v1`;

// Premium status cache
let premiumCache = {
  isPremium: false,
  lastChecked: 0,
  checkInProgress: null
};
const PREMIUM_CACHE_TTL = 60000;

// Auth backoff state — prevents 401 flood when token is invalid
let authBackoff = {
  consecutiveFailures: 0,
  nextRetryAt: 0,
  isTokenSuspect: false
};
const MAX_AUTH_BACKOFF_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SERVER_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

function calculateBackoff(failures, maxMs) {
  return Math.min(60000 * Math.pow(2, failures - 1), maxMs);
}

// ============================================
// TOKEN HELPERS
// ============================================

async function getApiToken() {
  const result = await chrome.storage.local.get(['apiToken']);
  return result.apiToken || null;
}

// ============================================
// INITIALIZATION
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      emails: [],
      settings: { autoSync: true },
      premiumStatus: false
    });
  }
});

// ============================================
// MESSAGE HANDLER
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender is from this extension
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ error: 'Unauthorized sender' });
    return false;
  }
  handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(message, sender) {
  // Content scripts can only send NEW_EMAILS and CHECK_PREMIUM
  const isContentScript = sender.tab != null;
  const contentScriptAllowed = ['NEW_EMAILS', 'CHECK_PREMIUM'];

  if (isContentScript && !contentScriptAllowed.includes(message.type)) {
    return { error: 'Not allowed from content script' };
  }

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

    case 'TOKEN_UPDATED':
      // Token was set/cleared — reset backoff and refresh premium status
      authBackoff = { consecutiveFailures: 0, nextRetryAt: 0, isTokenSuspect: false };
      premiumCache = { isPremium: premiumCache.isPremium, lastChecked: 0, checkInProgress: null };
      const updatedStatus = await checkPremiumStatus(true);
      return { success: true, isPremium: updatedStatus };

    case 'CHECK_PREMIUM': {
      const now = Date.now();
      // During backoff, return cached value immediately with extended TTL
      const effectiveTTL = authBackoff.isTokenSuspect ? MAX_SERVER_BACKOFF_MS : PREMIUM_CACHE_TTL;

      if (premiumCache.isPremium && premiumCache.lastChecked > 0) {
        const isStale = now - premiumCache.lastChecked >= effectiveTTL;
        if (isStale) {
          checkPremiumStatus().catch(() => {});
        }
        return { isPremium: premiumCache.isPremium, cacheTTL: effectiveTTL };
      }

      const isPremium = await checkPremiumStatus(now - premiumCache.lastChecked >= effectiveTTL);
      return { isPremium, cacheTTL: effectiveTTL };
    }

    case 'SYNC_NOW':
      return await syncToSupabase();

    case 'REFRESH_PREMIUM':
      const freshStatus = await checkPremiumStatus(true);
      return { isPremium: freshStatus };

    default:
      return { error: 'Unknown message type' };
  }
}

// ============================================
// PREMIUM STATUS CHECK
// ============================================

async function checkPremiumStatus(forceRefresh = false) {
  const now = Date.now();

  // Respect backoff window unless this is a force refresh after TOKEN_UPDATED
  if (!forceRefresh && now < authBackoff.nextRetryAt) {
    return premiumCache.isPremium;
  }

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
      const token = await getApiToken();

      if (!token) {
        premiumCache.isPremium = false;
        premiumCache.lastChecked = now;
        await chrome.storage.local.set({ premiumStatus: false });
        return false;
      }

      const response = await fetch(`${CONFIG.functionsUrl}/check-subscription`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Auth failure — token is invalid/deleted. Back off exponentially.
          authBackoff.consecutiveFailures++;
          authBackoff.isTokenSuspect = true;
          authBackoff.nextRetryAt = now + calculateBackoff(authBackoff.consecutiveFailures, MAX_AUTH_BACKOFF_MS);
          console.warn(`[Email Extractor] Token rejected (401). Backoff #${authBackoff.consecutiveFailures}, next retry in ${Math.round((authBackoff.nextRetryAt - now) / 1000)}s`);
        } else {
          // Server error (500, 503, etc.) — shorter backoff
          authBackoff.consecutiveFailures++;
          authBackoff.nextRetryAt = now + calculateBackoff(authBackoff.consecutiveFailures, MAX_SERVER_BACKOFF_MS);
          console.warn(`[Email Extractor] Server error (${response.status}). Backoff #${authBackoff.consecutiveFailures}`);
        }

        // Always preserve last-known premium status from storage
        premiumCache.lastChecked = now;
        return premiumCache.isPremium;
      }

      // Success — reset all backoff state
      authBackoff = { consecutiveFailures: 0, nextRetryAt: 0, isTokenSuspect: false };

      const data = await response.json();
      premiumCache.isPremium = data.isPremium === true;
      premiumCache.lastChecked = now;
      await chrome.storage.local.set({ premiumStatus: premiumCache.isPremium });

      return premiumCache.isPremium;
    } catch (error) {
      // Network error — short backoff, preserve cached status
      authBackoff.consecutiveFailures++;
      authBackoff.nextRetryAt = now + calculateBackoff(authBackoff.consecutiveFailures, MAX_SERVER_BACKOFF_MS);
      console.error('Premium check network error:', error.message);
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
  // Skip sync if token is known to be invalid
  if (authBackoff.isTokenSuspect) {
    return { success: false, reason: 'auth_backoff', message: 'Sync paused — sign out and sign back in to refresh your session' };
  }

  try {
    const result = await chrome.storage.local.get(['emails']);
    const emails = result.emails || [];

    const token = await getApiToken();

    if (!token) {
      return { success: false, reason: 'not_authenticated' };
    }

    if (emails.length === 0) {
      return { success: true, count: 0 };
    }

    const response = await fetch(`${CONFIG.functionsUrl}/store-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ emails })
    });

    if (!response.ok) {
      if (response.status === 401) {
        authBackoff.consecutiveFailures++;
        authBackoff.isTokenSuspect = true;
        authBackoff.nextRetryAt = Date.now() + calculateBackoff(authBackoff.consecutiveFailures, MAX_AUTH_BACKOFF_MS);
      }
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Sync failed');
    }

    // Success — reset backoff
    authBackoff = { consecutiveFailures: 0, nextRetryAt: 0, isTokenSuspect: false };

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
    // Reset backoff on checkout success — user just paid
    authBackoff = { consecutiveFailures: 0, nextRetryAt: 0, isTokenSuspect: false };
    setTimeout(() => checkPremiumStatus(true), 2000);
  }
});

// ============================================
// STARTUP & PERIODIC TASKS
// ============================================

// Initialize on startup — load cached premium status
chrome.storage.local.get(['premiumStatus']).then(async (result) => {
  if (result.premiumStatus !== undefined) {
    premiumCache.isPremium = result.premiumStatus;
    premiumCache.lastChecked = Date.now() - PREMIUM_CACHE_TTL + 5000;
  }

  // Refresh premium status after startup
  setTimeout(() => checkPremiumStatus(true).catch(() => {}), 2000);
});

// Periodically refresh premium status (every 5 minutes)
chrome.alarms?.create('premiumCheck', { periodInMinutes: 5 });

chrome.alarms?.onAlarm?.addListener(async (alarm) => {
  if (alarm.name === 'premiumCheck') {
    checkPremiumStatus(true).catch(() => {});
  }
});
