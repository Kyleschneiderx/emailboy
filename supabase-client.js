// Supabase client helper for Chrome Extension
// This uses Supabase REST API directly since we can't easily bundle the full client in service workers

class SupabaseClient {
  constructor(supabaseUrl, supabaseKey) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.authToken = null;
  }

  // Set auth token from session
  setAuthToken(token) {
    this.authToken = token;
  }

  // Get headers for API requests
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.supabaseKey,
      'Authorization': `Bearer ${this.authToken || this.supabaseKey}`
    };
    return headers;
  }

  // Sign up with email and password
  async signUp(email, password) {
    const response = await fetch(`${this.supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabaseKey
      },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }

  // Sign in with email and password
  async signIn(email, password) {
    const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabaseKey
      },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.access_token) {
      this.authToken = data.access_token;
    }
    return data;
  }

  // Sign out
  async signOut() {
    if (!this.authToken) return { error: 'Not authenticated' };
    
    const response = await fetch(`${this.supabaseUrl}/auth/v1/logout`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    this.authToken = null;
    return response.json();
  }

  // Get current user
  async getUser() {
    if (!this.authToken) return { user: null };
    
    const response = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Insert emails into Supabase
  async insertEmails(emails) {
    if (!this.authToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    // Prepare emails for insertion
    const emailRecords = emails.map(item => ({
      email: item.email.toLowerCase().trim(),
      domain: item.domain,
      url: item.url,
      urls: item.urls || [item.url],
      first_seen: item.timestamp,
      last_seen: item.lastSeen || item.timestamp,
      user_id: null // Will be set by RLS policy
    }));

    // Use upsert to handle duplicates
    const response = await fetch(`${this.supabaseUrl}/rest/v1/collected_emails`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(emailRecords)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to insert emails: ${error}`);
    }

    return response.json();
  }

  // Get emails from Supabase
  async getEmails() {
    if (!this.authToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    const response = await fetch(`${this.supabaseUrl}/rest/v1/collected_emails?order=last_seen.desc`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch emails: ${response.statusText}`);
    }

    const data = await response.json();
    // Transform to match local format
    return data.map(item => ({
      email: item.email,
      domain: item.domain,
      url: item.url,
      urls: item.urls || [item.url],
      timestamp: item.first_seen,
      lastSeen: item.last_seen
    }));
  }

  // Delete all emails
  async deleteAllEmails() {
    if (!this.authToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    const response = await fetch(`${this.supabaseUrl}/rest/v1/collected_emails`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete emails: ${response.statusText}`);
    }

    return response.json();
  }
}

