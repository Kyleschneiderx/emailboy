import { supabaseConfig } from '../config/supabase';

const functionsUrl = supabaseConfig.functionsUrl;

async function request<T>(path: string, token: string, options?: RequestInit) {
  if (!functionsUrl) {
    throw new Error('Supabase functions URL is not configured.');
  }

  if (!token) {
    throw new Error('Authentication token is required.');
  }

  const response = await fetch(`${functionsUrl}/${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle authentication errors specifically
    if (response.status === 401 || response.status === 403) {
      // Clear invalid session
      if (typeof Storage !== 'undefined') {
        localStorage.removeItem('supabaseSession');
      }
      throw new Error('Session expired. Please sign in again.');
    }
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
}

export interface SubscriptionData {
  isPremium: boolean;
  subscription: {
    plan: string;
    status: string;
    current_period_end: string;
  } | null;
}

export interface EmailData {
  email: string;
  domain: string;
  url: string;
  urls: string[];
  timestamp: string;
  lastSeen: string;
}

export interface EmailsResponse {
  success: boolean;
  emails: EmailData[];
  count: number;
}

export const subscriptionApi = {
  fetchSubscription: (token: string) => request<SubscriptionData>('check-subscription', token),
  cancelSubscription: (token: string) =>
    request<{ success: boolean; message: string }>('cancel-subscription', token, {
      method: 'POST',
    }),
  resumeSubscription: (token: string) =>
    request<{ success: boolean; message: string }>('resume-subscription', token, {
      method: 'POST',
    }),
  createPortalSession: (token: string, returnUrl?: string) =>
    request<{ success: boolean; url: string }>('create-portal-session', token, {
      method: 'POST',
      body: JSON.stringify({ returnUrl }),
    }),
  fetchEmails: (token: string, limit = 100, offset = 0) =>
    request<EmailsResponse>(
      `get-emails?limit=${limit}&offset=${offset}`,
      token,
      { method: 'GET' }
    ),
};

