// Email detection regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Function to extract emails from text content
function extractEmails(text) {
  const emails = text.match(EMAIL_REGEX) || [];
  // Remove duplicates and filter out common false positives
  const uniqueEmails = [...new Set(emails)].filter(email => {
    // Filter out common false positives
    const falsePositives = [
      'example@example.com',
      'test@test.com',
      'email@email.com'
    ];
    return !falsePositives.includes(email.toLowerCase());
  });
  return uniqueEmails;
}

// Function to scan the current page for emails
function scanPage() {
  // Get all text content from the page
  const bodyText = document.body.innerText || document.body.textContent || '';
  
  // Also check common email-containing elements
  const emailElements = document.querySelectorAll('a[href^="mailto:"]');
  const mailtoEmails = Array.from(emailElements).map(el => {
    const href = el.getAttribute('href');
    const match = href.match(/mailto:([^\?]+)/);
    return match ? match[1] : null;
  }).filter(Boolean);
  
  // Extract emails from text
  const textEmails = extractEmails(bodyText);
  
  // Combine and deduplicate
  const allEmails = [...new Set([...textEmails, ...mailtoEmails])];
  
  return allEmails;
}

// Function to send emails to background script
function sendEmailsToBackground(emails, url) {
  if (emails.length > 0) {
    chrome.runtime.sendMessage({
      type: 'NEW_EMAILS',
      emails: emails,
      url: url,
      timestamp: new Date().toISOString()
    });
  }
}

// Check premium status before scanning
function checkPremiumAndScan() {
  try {
    // Check premium status via background script
    chrome.runtime.sendMessage({ type: 'CHECK_PREMIUM' }, (response) => {
      if (response && response.isPremium) {
        // User has premium, perform scan
        const emails = scanPage();
        if (emails.length > 0) {
          sendEmailsToBackground(emails, window.location.href);
        }
      } else {
        // No premium subscription, don't scan
        // Silently skip - user will see premium badge in popup
      }
    });
  } catch (error) {
    console.error('Error checking premium status:', error);
  }
}

// Main scanning function (now checks premium first)
function performScan() {
  checkPremiumAndScan();
}

// Perform initial scan after page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', performScan);
} else {
  performScan();
}

// Also scan when page content changes (for SPAs)
let lastScanTime = Date.now();
const observer = new MutationObserver(() => {
  // Throttle scans to avoid excessive processing
  const now = Date.now();
  if (now - lastScanTime > 2000) {
    lastScanTime = now;
    setTimeout(performScan, 500);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

