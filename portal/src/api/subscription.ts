import { supabaseConfig } from '../config/supabase';
import { clearApiToken } from '../lib/sessionValidation';

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
    if (response.status === 401 || response.status === 403) {
      // Token may be temporarily invalid — do NOT clear it.
      // The user should never be signed out automatically.
      // They can manually sign out if needed.
      throw new Error('Unable to verify session. Please try again or sign out and sign back in.');
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
    cancel_at_period_end?: boolean;
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
