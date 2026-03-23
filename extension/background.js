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
      // Token was set/cleared — refresh premium status
      premiumCache = { isPremium: premiumCache.isPremium, lastChecked: 0, checkInProgress: null };
      const updatedStatus = await checkPremiumStatus(true);
      return { success: true, isPremium: updatedStatus };

    case 'CHECK_PREMIUM':
      const now = Date.now();
      const isStale = now - premiumCache.lastChecked >= PREMIUM_CACHE_TTL;

      if (premiumCache.isPremium && premiumCache.lastChecked > 0) {
        if (isStale) {
          checkPremiumStatus().catch(() => {});
        }
        return { isPremium: premiumCache.isPremium };
      }

      const isPremium = await checkPremiumStatus(isStale);
      return { isPremium };

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
        // Keep current cached value on errors
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
