// EmailBoy Content Script - Email Extractor
// Implements the same approach as Email Extractor extension

(function() {
  'use strict';

  console.log('%c[EmailBoy] Content script loaded', 'background: #4AE3A7; color: black; padding: 2px 6px;');

  // ============================================
  // EMAIL EXTRACTION UTILITIES
  // ============================================

  const mcUtils = (function() {

    // Blacklist patterns
    const blacklist = [
      /^no-reply|noreply/,
      /facebookmail\.com$/,
      /\.google\.com$/,
      /^qalinkedindummy/,
      /^(newcontact|support)@manycontacts\.com$/,
      /^(newcontact|support)@email-extractor\.io$/,
      /(@|\.)doe\.com$/,
      /example\.com$/,
      /^johndoe@/,
      /^youremail@/,
      /^username@/,
      /@app\.getsentry\.com$/,
      /sentry\.io$/,
      /wixpress\.com$/,
      /w3\.org$/,
      /schema\.org$/,
      /googleapis\.com$/,
      /gstatic\.com$/
    ];

    // All valid TLDs
    const allTLDs = [
      "aaa", "aarp", "abb", "abbott", "abc", "able", "academy", "accenture",
      "accountant", "accountants", "aco", "active", "actor", "ad", "ads",
      "adult", "ae", "aeg", "aero", "af", "afl", "ag", "agency", "ai", "aig",
      "airbus", "airforce", "al", "alibaba", "alipay", "allstate", "ally",
      "alsace", "am", "amazon", "americanexpress", "amex", "amica", "amsterdam",
      "analytics", "android", "app", "apple", "aq", "ar", "archi", "army",
      "art", "arte", "as", "asia", "associates", "at", "attorney", "au",
      "auction", "audi", "audio", "author", "auto", "autos", "aw", "aws",
      "ax", "axa", "az", "azure", "ba", "baby", "baidu", "band", "bank",
      "bar", "barcelona", "barclays", "baseball", "basketball", "bayern",
      "bb", "bbc", "bbva", "bcg", "bd", "be", "beats", "beauty", "beer",
      "bentley", "berlin", "best", "bet", "bf", "bg", "bh", "bi", "bible",
      "bid", "bike", "bing", "bingo", "bio", "biz", "bj", "black", "blog",
      "blue", "bm", "bmw", "bn", "bnp", "bo", "boats", "bond", "boo", "book",
      "booking", "bot", "boutique", "box", "br", "bridgestone", "broadway",
      "broker", "brother", "brussels", "bs", "bt", "budapest", "bugatti",
      "build", "builders", "business", "buy", "buzz", "bv", "bw", "by", "bz",
      "ca", "cab", "cafe", "cal", "call", "cam", "camera", "camp", "canon",
      "capetown", "capital", "car", "cards", "care", "career", "careers",
      "cars", "casa", "case", "cash", "casino", "cat", "catering", "cba",
      "cbs", "cc", "cd", "center", "ceo", "cern", "cf", "cfa", "cfd", "cg",
      "ch", "chanel", "channel", "chat", "cheap", "christmas", "chrome",
      "church", "ci", "circle", "cisco", "citi", "city", "ck", "cl", "claims",
      "cleaning", "click", "clinic", "clothing", "cloud", "club", "cm", "cn",
      "co", "coach", "codes", "coffee", "college", "cologne", "com", "community",
      "company", "computer", "condos", "construction", "consulting", "contact",
      "contractors", "cooking", "cool", "coop", "corsica", "country", "coupon",
      "coupons", "courses", "cr", "credit", "creditcard", "cricket", "crown",
      "crs", "cruise", "cruises", "cu", "cuisinella", "cv", "cw", "cx", "cy",
      "cymru", "cz", "dad", "dance", "date", "dating", "day", "dclk", "de",
      "deal", "dealer", "deals", "degree", "delivery", "dell", "delta",
      "democrat", "dental", "dentist", "design", "dev", "dhl", "diamonds",
      "diet", "digital", "direct", "directory", "discount", "dj", "dk", "dm",
      "do", "docs", "doctor", "dog", "domains", "download", "drive", "dubai",
      "dunlop", "dz", "earth", "eat", "ec", "eco", "edu", "education", "ee",
      "eg", "email", "energy", "engineer", "engineering", "enterprises", "equipment",
      "er", "es", "esq", "estate", "et", "eu", "events", "exchange", "expert",
      "exposed", "express", "fail", "faith", "family", "fan", "fans", "farm",
      "fashion", "fast", "feedback", "ferrari", "fi", "film", "final", "finance",
      "financial", "fire", "fish", "fishing", "fit", "fitness", "fj", "fk",
      "flights", "florist", "flowers", "fly", "fm", "fo", "foo", "food",
      "football", "ford", "forex", "forsale", "forum", "foundation", "fox",
      "fr", "free", "frl", "frogans", "frontier", "fund", "furniture", "futbol",
      "fyi", "ga", "gal", "gallery", "game", "games", "gap", "garden", "gb",
      "gd", "gdn", "ge", "gent", "gf", "gg", "gh", "gi", "gift", "gifts",
      "gives", "gl", "glass", "gle", "global", "globo", "gm", "gmail", "gmbh",
      "gmo", "gmx", "gn", "gold", "golf", "goo", "google", "gop", "got", "gov",
      "gp", "gq", "gr", "graphics", "gratis", "green", "gripe", "group", "gs",
      "gt", "gu", "guide", "guitars", "guru", "gw", "gy", "hamburg", "haus",
      "health", "healthcare", "help", "here", "hiphop", "hitachi", "hiv", "hk",
      "hm", "hn", "hockey", "holdings", "holiday", "homes", "honda", "horse",
      "host", "hosting", "hot", "house", "how", "hr", "hsbc", "ht", "hu",
      "hyundai", "ibm", "ice", "icu", "id", "ie", "ifm", "il", "im", "immo",
      "in", "industries", "infiniti", "info", "ing", "ink", "institute",
      "insurance", "insure", "int", "international", "investments", "io",
      "iq", "ir", "irish", "is", "ist", "istanbul", "it", "itv", "jaguar",
      "java", "jcb", "je", "jeep", "jetzt", "jewelry", "jm", "jo", "jobs",
      "joburg", "jot", "joy", "jp", "jprs", "juegos", "kaufen", "kddi", "ke",
      "kg", "kh", "ki", "kia", "kim", "kindle", "kitchen", "kiwi", "km", "kn",
      "koeln", "komatsu", "kp", "kr", "krd", "kred", "kw", "ky", "kyoto", "kz",
      "la", "lacaixa", "land", "lasalle", "lat", "latino", "latrobe", "law",
      "lawyer", "lb", "lc", "lds", "lease", "legal", "lexus", "lgbt", "li",
      "lidl", "life", "lifestyle", "lighting", "like", "limited", "limo",
      "lincoln", "link", "live", "living", "lk", "loan", "loans", "locus",
      "lol", "london", "lotte", "lotto", "love", "lr", "ls", "lt", "ltd",
      "ltda", "lu", "luxe", "luxury", "lv", "ly", "ma", "madrid", "maison",
      "makeup", "man", "management", "mango", "market", "marketing", "markets",
      "marriott", "mba", "mc", "md", "me", "media", "meet", "melbourne", "meme",
      "memorial", "men", "menu", "mg", "mh", "miami", "microsoft", "mil",
      "mini", "mk", "ml", "mm", "mma", "mn", "mo", "mobi", "moda", "moe",
      "mom", "money", "montblanc", "mormon", "mortgage", "moscow", "motorcycles",
      "mov", "movie", "mp", "mq", "mr", "ms", "mt", "mtn", "mu", "museum",
      "mv", "mw", "mx", "my", "mz", "na", "nadex", "nagoya", "name", "navy",
      "nc", "ne", "nec", "net", "network", "neustar", "new", "news", "nexus",
      "nf", "ng", "ngo", "nhk", "ni", "nico", "ninja", "nissan", "nl", "no",
      "nokia", "norton", "nowruz", "np", "nr", "nra", "nrw", "ntt", "nu",
      "nyc", "nz", "obi", "office", "okinawa", "om", "omega", "one", "ong",
      "onl", "online", "ooo", "oracle", "orange", "org", "organic", "osaka",
      "otsuka", "ovh", "pa", "page", "panerai", "paris", "pars", "partners",
      "parts", "party", "pe", "pet", "pf", "pg", "ph", "pharmacy", "philips",
      "photo", "photography", "photos", "physio", "pics", "pictet", "pictures",
      "pid", "pin", "pink", "pizza", "pk", "pl", "place", "play", "plumbing",
      "plus", "pm", "pn", "pohl", "poker", "porn", "post", "pr", "praxi",
      "press", "pro", "prod", "productions", "prof", "promo", "properties",
      "property", "protection", "ps", "pt", "pub", "pw", "py", "qa", "qpon",
      "quebec", "quest", "racing", "re", "read", "realestate", "realtor",
      "realty", "recipes", "red", "redstone", "rehab", "reise", "reisen",
      "reit", "ren", "rent", "rentals", "repair", "report", "republican",
      "rest", "restaurant", "review", "reviews", "rich", "rio", "rip", "ro",
      "rocks", "rodeo", "room", "rs", "rsvp", "ru", "ruhr", "run", "rw",
      "ryukyu", "sa", "saarland", "safe", "safety", "sale", "salon", "samsung",
      "sandvik", "sanofi", "sap", "sarl", "sas", "saxo", "sb", "sbs", "sc",
      "scb", "schaeffler", "schmidt", "school", "schule", "schwarz", "science",
      "scot", "sd", "se", "seat", "security", "seek", "select", "services",
      "seven", "sew", "sex", "sexy", "sfr", "sg", "sh", "sharp", "shell",
      "shia", "shiksha", "shoes", "shop", "shopping", "show", "si", "silk",
      "sina", "singles", "site", "sj", "sk", "ski", "skin", "sky", "skype",
      "sl", "sm", "smart", "smile", "sn", "sncf", "so", "soccer", "social",
      "software", "sohu", "solar", "solutions", "song", "sony", "soy", "space",
      "spot", "sr", "srl", "st", "stada", "star", "statebank", "statefarm",
      "storage", "store", "stream", "studio", "study", "style", "su", "sucks",
      "supplies", "supply", "support", "surf", "surgery", "suzuki", "sv",
      "swatch", "swiss", "sx", "sy", "sydney", "systems", "sz", "taipei",
      "talk", "taobao", "target", "tatar", "tattoo", "tax", "taxi", "tc",
      "tci", "td", "tdk", "team", "tech", "technology", "tel", "tennis",
      "teva", "tf", "tg", "th", "theater", "theatre", "tickets", "tienda",
      "tips", "tires", "tirol", "tj", "tk", "tl", "tm", "tn", "to", "today",
      "tokyo", "tools", "top", "toray", "toshiba", "total", "tours", "town",
      "toyota", "toys", "tr", "trade", "trading", "training", "travel",
      "travelers", "trust", "tt", "tube", "tui", "tunes", "tushu", "tv",
      "tw", "tz", "ua", "ubs", "ug", "uk", "university", "uno", "uol", "ups",
      "us", "uy", "uz", "va", "vacations", "vc", "ve", "vegas", "ventures",
      "verisign", "vet", "vg", "vi", "viajes", "video", "villas", "vin",
      "vip", "virgin", "visa", "vision", "vista", "viva", "vlaanderen", "vn",
      "vodka", "volkswagen", "vote", "voting", "voto", "voyage", "vu", "wales",
      "walter", "wang", "watch", "watches", "weather", "webcam", "website",
      "wed", "wedding", "weibo", "wf", "whoswho", "wien", "wiki", "win",
      "windows", "wine", "wme", "work", "works", "world", "ws", "wtc", "wtf",
      "xbox", "xerox", "xin", "xxx", "xyz", "yachts", "yahoo", "yamaxun",
      "yandex", "ye", "yodobashi", "yoga", "yokohama", "you", "youtube", "yt",
      "za", "zappos", "zara", "zero", "zip", "zm", "zone", "zuerich", "zw"
    ];

    // Convert to Set for faster lookup
    const tldSet = new Set(allTLDs);

    // Detect site type
    const hostname = window.location.hostname;
    const isGoogle = /google(\.\w{2,3}){0,2}$/.test(hostname) && hostname.indexOf("mail.google") === -1;
    const isBing = /bing(\.\w{2,3}){0,2}$/.test(hostname);
    const isDuckDuckGo = /duckduckgo(\.\w{2,3}){0,2}$/.test(hostname);
    const isYahoo = /yahoo(\.\w{2,3}){0,2}$/.test(hostname);

    // Validate email
    function isValidEmail(email) {
      if (!email || email.length < 5) return false;

      // Check TLD
      const parts = email.split(".");
      const tld = parts[parts.length - 1].toLowerCase();
      if (!tldSet.has(tld)) {
        return false;
      }

      // Check blacklist
      for (let i = 0; i < blacklist.length; i++) {
        if (blacklist[i].test(email)) {
          return false;
        }
      }

      return true;
    }

    // Clean extracted email
    function cleanEmail(email) {
      email = email.toLowerCase();

      // Remove HTML tags from search engine results
      if (isGoogle) {
        email = email.replace(/<wbr>/g, "").replace(/<\/?em>/g, "");
      }
      if (isBing) {
        email = email.replace(/<\/?strong>/g, "");
      }
      if (isDuckDuckGo || isYahoo) {
        email = email.replace(/<\/?b>/g, "");
      }

      // Handle [at] obfuscation
      if (email.indexOf("@") === -1) {
        email = email.replace("[at]", "@").replace("[at*]", "@");
      }

      // Remove unicode/hex escapes and trailing dots
      email = email.replace(/(^sx_mrsp_|\\u[\d\w]{4}|\\x[\d\w]{2}|\\f)|\.$/g, "");

      // Remove any remaining HTML tags
      email = email.replace(/<[^>]*>/g, "");

      return email.trim();
    }

    // Get appropriate regex for current site
    function getRegex() {
      if (isGoogle) {
        return /(\\u|\\f|\\x)?([a-zA-Z0-9._\-_+]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      } else if (isBing) {
        return /(\\u|\\f|\\x)?([a-zA-Z0-9._\-_+]+(<strong>)?@(<strong>)?[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+(<\/strong>)?)/gi;
      } else if (isDuckDuckGo) {
        return /(\\u|\\f|\\x)?([a-zA-Z0-9._\-_+]+(<b>)?@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+(<\/b>)?)/gi;
      } else if (isYahoo) {
        return /(\\u|\\f|\\x)?([a-zA-Z0-9._\-_+]+@(<b>)?[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+(<\/b>)?)/gi;
      } else {
        // Default: handles [at] obfuscation
        return /(\\u|\\f|\\x)?([a-zA-Z0-9._\-_+]+(@|\[at\]|\[at\*\])[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      }
    }

    return {
      extractEmails: function(html) {
        const emails = [];

        // Decode HTML entities
        try {
          html = unescape(html).replace(/&#064;/g, "@").replace(/&#64;/g, "@");
        } catch (e) {}

        // For Google search, convert to text
        if (isGoogle) {
          html = html.replace(/<\/div>/g, "</div> ");
          // Create temp element to get text content
          const temp = document.createElement('div');
          temp.innerHTML = html;
          html = temp.textContent || temp.innerText || html;
        }

        // Get regex for current site
        const regex = getRegex();

        // Find matches
        const matches = html.match(regex);

        if (matches === null) return emails;

        // Process each match
        for (let i = 0; i < matches.length; i++) {
          const cleaned = cleanEmail(matches[i]);

          // Dedupe and validate
          if (emails.indexOf(cleaned) === -1 && isValidEmail(cleaned)) {
            emails.push(cleaned);
          }
        }

        return emails;
      },

      isGoogle: isGoogle,
      isBing: isBing,
      isDuckDuckGo: isDuckDuckGo,
      isYahoo: isYahoo
    };
  })();

  // ============================================
  // STATE
  // ============================================

  const foundEmails = new Set();
  let isRunning = false;
  let isPremiumCached = null;
  let lastPremiumCheck = 0;

  // ============================================
  // PREMIUM CHECK
  // ============================================

  function checkPremium(callback) {
    const now = Date.now();

    // Use cache for 30 seconds
    if (isPremiumCached !== null && now - lastPremiumCheck < 30000) {
      callback(isPremiumCached);
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: 'CHECK_PREMIUM' }, function(response) {
        if (chrome.runtime.lastError) {
          console.log('[EmailBoy] Premium check error:', chrome.runtime.lastError.message);
          callback(isPremiumCached || false);
          return;
        }
        isPremiumCached = response && response.isPremium === true;
        lastPremiumCheck = now;
        console.log('[EmailBoy] Premium status:', isPremiumCached);
        callback(isPremiumCached);
      });
    } catch (e) {
      console.log('[EmailBoy] Premium check failed:', e);
      callback(isPremiumCached || false);
    }
  }

  // ============================================
  // SEND EMAILS TO BACKGROUND
  // ============================================

  function sendEmails(newEmails) {
    if (newEmails.length === 0) return;

    console.log('%c[EmailBoy] Found ' + newEmails.length + ' new emails:', 'color: #4AE3A7; font-weight: bold;', newEmails);

    try {
      chrome.runtime.sendMessage({
        type: 'NEW_EMAILS',
        emails: newEmails,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.log('[EmailBoy] Send error:', chrome.runtime.lastError.message);
        } else {
          console.log('[EmailBoy] Saved:', response);
        }
      });
    } catch (e) {
      console.log('[EmailBoy] Send failed:', e);
    }
  }

  // ============================================
  // MAIN EXTRACTION FUNCTION
  // ============================================

  function reloader() {
    if (isRunning || document.visibilityState !== "visible") return;

    isRunning = true;

    checkPremium(function() {
      // Get page HTML
      const html = document.body ? document.body.innerHTML : '';

      // Extract emails
      const allEmails = mcUtils.extractEmails(html);

      // Filter to only new emails
      const newEmails = allEmails.filter(function(e) {
        return !foundEmails.has(e);
      });

      // Track found emails
      newEmails.forEach(function(e) {
        foundEmails.add(e);
      });

      // Send to background
      if (newEmails.length > 0) {
        sendEmails(newEmails);
      }

      console.log('[EmailBoy] Scan complete. Total:', allEmails.length, '| New:', newEmails.length);

      // Allow next run after debounce
      setTimeout(function() {
        isRunning = false;
      }, 500);
    });
  }

  // ============================================
  // INITIALIZE
  // ============================================

  function init() {
    console.log('[EmailBoy] Initializing...');
    console.log('[EmailBoy] Site detection - Google:', mcUtils.isGoogle, '| Bing:', mcUtils.isBing, '| DuckDuckGo:', mcUtils.isDuckDuckGo, '| Yahoo:', mcUtils.isYahoo);

    // Initial run
    reloader();

    // Watch for DOM changes
    if (document.body) {
      const observer = new MutationObserver(function(mutations) {
        if (!isRunning && document.visibilityState === "visible") {
          reloader();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // Reload on window focus
    window.addEventListener("focus", reloader);

    // Reload on visibility change
    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === "visible") {
        reloader();
      }
    });

    // Reload on scroll (for lazy-loaded content)
    let scrollTimer;
    window.addEventListener("scroll", function() {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(reloader, 500);
    }, { passive: true });

    // Periodic scan every 5 seconds
    setInterval(reloader, 5000);
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
