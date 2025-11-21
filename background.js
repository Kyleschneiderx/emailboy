// Background service worker for EmailBoy

// Supabase configuration (pre-configured for all users)
const SUPABASE_CONFIG = {
  url: 'https://xgllxidtqbkftsbhiinl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4'
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    emails: [],
    settings: {
      autoSync: true, // Real-time sync enabled by default
      supabaseUrl: SUPABASE_CONFIG.url,
      supabaseKey: SUPABASE_CONFIG.anonKey
    }
  });
});

// Also initialize on startup to ensure settings are set
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings || result.settings.autoSync === undefined) {
      chrome.storage.local.set({
        settings: {
          autoSync: true,
          supabaseUrl: SUPABASE_CONFIG.url,
          supabaseKey: SUPABASE_CONFIG.anonKey
        }
      });
    }
  });
});

// Listen for emails from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_EMAILS') {
    handleNewEmails(message.emails, message.url, message.timestamp);
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

// Check if user has premium subscription
async function checkPremiumStatus() {
  try {
    const result = await chrome.storage.local.get(['supabaseSession']);
    const session = result.supabaseSession;
    
    if (!session || !session.access_token) {
      return false;
    }

    const functionsUrl = `${SUPABASE_CONFIG.url}/functions/v1`;
    const response = await fetch(`${functionsUrl}/check-subscription`, {
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

// Handle new emails found
async function handleNewEmails(emails, url, timestamp) {
  try {
    // Check premium status before processing emails
    const isPremium = await checkPremiumStatus();
    if (!isPremium) {
      console.log('Premium subscription required. Email collection disabled.');
      return;
    }

    // Get existing emails from storage
    const result = await chrome.storage.local.get(['emails', 'settings']);
    const existingEmails = result.emails || [];
    const settings = result.settings || {};
    
    // Create email objects with metadata
    const newEmailObjects = emails.map(email => ({
      email: email.toLowerCase().trim(),
      url: url,
      timestamp: timestamp,
      domain: email.split('@')[1]
    }));
    
    // Merge with existing emails (avoid duplicates)
    const emailMap = new Map();
    
    // Add existing emails to map
    existingEmails.forEach(item => {
      emailMap.set(item.email, item);
    });
    
    // Add new emails (update if exists with new URL)
    newEmailObjects.forEach(item => {
      const existing = emailMap.get(item.email);
      if (existing) {
        // Update with new URL if different
        if (!existing.urls) {
          existing.urls = [existing.url];
        }
        if (!existing.urls.includes(item.url)) {
          existing.urls.push(item.url);
        }
        existing.lastSeen = item.timestamp;
      } else {
        emailMap.set(item.email, {
          ...item,
          urls: [item.url],
          lastSeen: item.timestamp
        });
      }
    });
    
    // Convert back to array
    const updatedEmails = Array.from(emailMap.values());
    
    // Save to local storage
    await chrome.storage.local.set({ emails: updatedEmails });
    
    // Send to Supabase if auto-sync is enabled (default: true for real-time sync)
    const autoSync = settings.autoSync !== false; // Default to true
    if (autoSync) {
      sendToSupabase(updatedEmails, settings);
    }
    
    // Update badge with count
    chrome.action.setBadgeText({ text: updatedEmails.length.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
  } catch (error) {
    console.error('Error handling new emails:', error);
  }
}

// Send emails to Supabase via edge function
async function sendToSupabase(emails, settings) {
  const functionsUrl = `${SUPABASE_CONFIG.url}/functions/v1`;
  
  try {
    // Get auth session
    const result = await chrome.storage.local.get(['supabaseSession']);
    const session = result.supabaseSession;
    if (!session || !session.access_token) {
      console.log('Not authenticated with Supabase, skipping sync');
      return;
    }

    // Send to edge function
    const response = await fetch(`${functionsUrl}/store-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ emails })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Supabase sync failed: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    if (data.success) {
      console.log(`Emails synced to Supabase successfully: ${data.count} email(s)`);
      // Clear any previous errors
      chrome.storage.local.remove(['lastSyncError']);
      
      // Update badge to show sync status
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      setTimeout(() => {
        chrome.storage.local.get(['emails'], (result) => {
          const count = (result.emails || []).length;
          chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
        });
      }, 2000);
    } else {
      throw new Error(data.error || 'Sync failed');
    }
  } catch (error) {
    console.error('Error syncing to Supabase:', error);
    chrome.storage.local.set({ lastSyncError: error.message });
    
    // Show error badge
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#f44336' });
  }
}

// Send emails to database (legacy support)
async function sendToDatabase(emails, settings) {
  if (!settings.databaseUrl) {
    return;
  }
  
  try {
    const response = await fetch(settings.databaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey && { 'Authorization': `Bearer ${settings.apiKey}` })
      },
      body: JSON.stringify({
        emails: emails,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Database sync failed: ${response.statusText}`);
    }
    
    console.log('Emails synced to database successfully');
  } catch (error) {
    console.error('Error syncing to database:', error);
    chrome.storage.local.set({ lastSyncError: error.message });
  }
}

// Manual sync function (can be called from popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_TO_SUPABASE') {
    chrome.storage.local.get(['emails', 'supabaseSession']).then(result => {
      const emails = result.emails || [];
      
      if (!result.supabaseSession || !result.supabaseSession.access_token) {
        sendResponse({ success: false, error: 'Not authenticated. Please sign in.' });
        return;
      }

      sendToSupabase(emails, {}).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    });
    return true;
  }

  if (message.type === 'SYNC_TO_DATABASE') {
    // Legacy support
    chrome.storage.local.get(['emails', 'settings']).then(result => {
      const emails = result.emails || [];
      const settings = result.settings || {};
      sendToDatabase(emails, settings).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    });
    return true;
  }

  if (message.type === 'GET_EMAILS_FROM_SUPABASE') {
    chrome.storage.local.get(['supabaseSession']).then(result => {
      const session = result.supabaseSession;
      
      if (!session || !session.access_token) {
        sendResponse({ emails: [] });
        return;
      }

      const functionsUrl = `${SUPABASE_CONFIG.url}/functions/v1`;
      fetch(`${functionsUrl}/get-emails`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.emails) {
          sendResponse({ emails: data.emails });
        } else {
          sendResponse({ emails: [] });
        }
      })
      .catch(error => {
        console.error('Error fetching from Supabase:', error);
        sendResponse({ emails: [] });
      });
    });
    return true;
  }
  
  if (message.type === 'GET_EMAILS') {
    chrome.storage.local.get(['emails']).then(result => {
      sendResponse({ emails: result.emails || [] });
    });
    return true;
  }
  
  if (message.type === 'CLEAR_EMAILS') {
    chrome.storage.local.set({ emails: [] }).then(() => {
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'SAVE_SUPABASE_SESSION') {
    chrome.storage.local.set({ supabaseSession: message.session }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'CHECK_PREMIUM') {
    checkPremiumStatus().then(isPremium => {
      sendResponse({ isPremium });
    });
    return true;
  }
});

// Watch for checkout success URL and automatically open extension options
chrome.webNavigation.onCommitted.addListener(async (details) => {
  const url = details.url;
  const successPrefix = 'https://xgllxidtqbkftsbhiinl.supabase.co/functions/v1/checkout-success';
  
  if (!url.startsWith(successPrefix)) return;
  
  try {
    const u = new URL(url);
    const sessionId = u.searchParams.get('session_id');
    
    if (sessionId) {
      // Optional: verify the checkout session on backend
      // The webhook already handles activation, but this provides immediate feedback
      try {
        const functionsUrl = `${SUPABASE_CONFIG.url}/functions/v1`;
        const result = await chrome.storage.local.get(['supabaseSession']);
        const session = result.supabaseSession;
        
        if (session && session.access_token) {
          // Verify checkout session (optional - webhook already handles it)
          await fetch(`${functionsUrl}/verify-checkout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ sessionId })
          }).catch(() => {
            // If verify-checkout doesn't exist, that's okay - webhook handles it
            console.log('verify-checkout function not available, webhook will handle activation');
          });
        }
      } catch (e) {
        console.log('Checkout verification skipped:', e);
      }
    }
    
    // Open options page with query params
    const optionsUrl = chrome.runtime.getURL(
      `options.html?checkout=success&session_id=${encodeURIComponent(sessionId || '')}`
    );
    
    await chrome.tabs.create({ url: optionsUrl });
    
    // Close the Stripe success tab
    chrome.tabs.remove(details.tabId);
  } catch (e) {
    console.error('Error handling checkout success:', e);
  }
});

