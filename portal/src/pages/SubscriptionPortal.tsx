import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import type { NavItem } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { MetricCard } from '../components/ui/MetricCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { subscriptionApi, type SubscriptionData, type EmailData } from '../api/subscription';
import { useSupabaseSession } from '../hooks/useSupabaseSession';
import { AuthGuard } from '../components/AuthGuard';
import { getValidSession } from '../lib/sessionValidation';
import { supabaseConfig } from '../config/supabase';

type Action = 'portal' | 'upgrade';

const navItems: NavItem[] = [
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'emails', label: 'Emails' },
];

type ViewKey = (typeof navItems)[number]['key'];

export function SubscriptionPortal() {
  const { session, isValidating } = useSupabaseSession();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<Action, boolean>>({
    portal: false,
    upgrade: false,
  });
  const [activeView, setActiveView] = useState<ViewKey>('subscriptions');

  // Emails state
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState<string | null>(null);

  const accessToken = session?.access_token;

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const validSession = await getValidSession(true);
    if (!validSession || !validSession.access_token) {
      console.log('[LoadData] No valid session found');
      setError('Session not found. Please sign in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await subscriptionApi.fetchSubscription(validSession.access_token);
      setData(response);
    } catch (err) {
      console.error('[LoadData] Error fetching subscription:', err);
      if (err instanceof Error && (err.message.includes('Unauthorized') || err.message.includes('Session expired'))) {
        setError('Session expired. Please sign in again.');
        if (typeof Storage !== 'undefined') {
          localStorage.removeItem('supabaseSession');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load subscription.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadEmails = useCallback(async () => {
    if (!accessToken) {
      setEmailsLoading(false);
      return;
    }

    const validSession = await getValidSession(true);
    if (!validSession || !validSession.access_token) {
      setEmailsError('Session not found. Please sign in again.');
      setEmailsLoading(false);
      return;
    }

    setEmailsLoading(true);
    setEmailsError(null);
    try {
      const response = await subscriptionApi.fetchEmails(validSession.access_token, 1000, 0);
      setEmails(response.emails || []);
    } catch (err) {
      console.error('[LoadEmails] Error fetching emails:', err);
      if (err instanceof Error && (err.message.includes('Unauthorized') || err.message.includes('Session expired'))) {
        setEmailsError('Session expired. Please sign in again.');
      } else {
        setEmailsError(err instanceof Error ? err.message : 'Failed to load emails.');
      }
    } finally {
      setEmailsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [accessToken, loadData]);

  const handleUpgrade = useCallback(() =>
    handleAction('upgrade', async () => {
      if (!accessToken) return;
      const validSession = await getValidSession(true);
      if (!validSession || !validSession.access_token) {
        throw new Error('Session not found. Please sign in again.');
      }

      const response = await fetch(`${supabaseConfig.functionsUrl}/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    }), [accessToken]);

  // Handle URL params (checkout, view)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkout = urlParams.get('checkout');
    const message = urlParams.get('message');
    const upgrade = urlParams.get('upgrade');
    const view = urlParams.get('view');

    if (view === 'emails') {
      setActiveView('emails');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('view');
      window.history.replaceState({}, '', newUrl.toString());
    }

    if (upgrade === 'true' && accessToken && !data?.isPremium) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('upgrade');
      window.history.replaceState({}, '', newUrl.toString());

      setTimeout(() => {
        handleUpgrade();
      }, 500);
      return;
    }

    if (checkout === 'success') {
      setError(null);
      const successMsg = 'Payment successful! Your subscription is being activated...';
      setError(successMsg);
      setTimeout(() => {
        if (accessToken) {
          loadData();
        }
      }, 2000);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('checkout');
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (checkout === 'cancel') {
      setError('Payment was canceled. No charges were made.');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('checkout');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (checkout === 'error' && message) {
      setError(`Error: ${decodeURIComponent(message)}`);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('checkout');
      newUrl.searchParams.delete('message');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [accessToken, loadData, data?.isPremium, handleUpgrade]);

  useEffect(() => {
    if (activeView === 'emails' && accessToken) {
      loadEmails();
    }
  }, [activeView, accessToken, loadEmails]);

  const subscriptionStatus = useMemo(() => {
    if (!data?.subscription) return 'free';
    return data.subscription.status;
  }, [data]);

  const handleAction = async (type: Action, action: () => Promise<unknown> | void) => {
    if (!accessToken) return;
    setActionState((prev) => ({ ...prev, [type]: true }));
    setError(null);

    try {
      await action();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setActionState((prev) => ({ ...prev, [type]: false }));
    }
  };

  const managePortal = () =>
    handleAction('portal', async () => {
      if (!accessToken) return;
      const { url } = await subscriptionApi.createPortalSession(
        accessToken,
        window.location.href,
      );
      window.open(url, '_blank', 'noopener');
    });

  const renderSubscriptionView = () => {
    if (isValidating) {
      return (
        <Card className="text-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
            <p className="text-text-secondary">Validating session...</p>
          </div>
        </Card>
      );
    }

    if (!session) {
      return (
        <Card variant="bordered" className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-coral/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-text-primary mb-2">Sign in required</h2>
            <p className="text-text-secondary mb-6">
              Open the Email Extractor extension, sign in, then return to this page. Your session will sync automatically.
            </p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Check Again
            </Button>
          </div>
        </Card>
      );
    }

    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      );
    }

    const isSuccess = error?.includes('successful');

    return (
      <div className="space-y-6">
        {error && (
          <div className={`rounded-xl border px-5 py-4 text-sm flex items-center gap-3 ${
            isSuccess
              ? 'border-emerald/30 bg-emerald/5 text-emerald'
              : 'border-red-400/30 bg-red-400/5 text-red-400'
          }`}>
            {isSuccess ? (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            )}
            {error}
          </div>
        )}

        {/* Hero Subscription Card */}
        <Card variant={data?.isPremium ? 'glow' : 'elevated'} padding="lg" className="relative overflow-hidden">
          {/* Background decoration */}
          {data?.isPremium && (
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-coral/10 to-transparent pointer-events-none" />
          )}

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  Current Plan
                </p>
                <StatusBadge
                  variant={
                    subscriptionStatus === 'active' ? 'active' :
                    subscriptionStatus === 'trialing' ? 'trialing' :
                    subscriptionStatus === 'free' ? 'free' : 'warning'
                  }
                >
                  {subscriptionStatus}
                </StatusBadge>
              </div>

              <h2 className="font-display text-3xl font-bold text-text-primary mb-2">
                {data?.subscription?.plan ?? 'Free Plan'}
              </h2>

              {data?.subscription?.current_period_end ? (
                <p className="text-text-secondary">
                  {data.subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
                  <span className="text-text-primary font-medium">
                    {new Date(data.subscription.current_period_end).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              ) : (
                <p className="text-text-secondary">
                  Upgrade to unlock email collection and cloud sync
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {data?.isPremium && (
                <Button
                  variant="secondary"
                  onClick={managePortal}
                  loading={actionState.portal}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                  Manage
                </Button>
              )}
              {!data?.isPremium && (
                <Button onClick={handleUpgrade} loading={actionState.upgrade}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Upgrade to Premium
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Plan"
            value={data?.subscription?.plan ?? 'Free'}
            change={data?.isPremium ? 'Premium active' : 'Upgrade available'}
            trend={data?.isPremium ? 'up' : 'neutral'}
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
              </svg>
            }
          />
          <MetricCard
            label="Status"
            value={data?.subscription?.status ?? 'Inactive'}
            change={
              data?.subscription?.current_period_end
                ? `Renews ${new Date(data.subscription.current_period_end).toLocaleDateString()}`
                : 'No renewal scheduled'
            }
            trend="neutral"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
          />
          <MetricCard
            label="Cloud Sync"
            value={data?.isPremium ? 'Active' : 'Disabled'}
            change={data?.isPremium ? 'Real-time sync enabled' : 'Available on Premium'}
            trend={data?.isPremium ? 'up' : 'neutral'}
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 10a6.001 6.001 0 00-11.476-1.5A4.502 4.502 0 007.5 17h10a4.5 4.5 0 00.5-8.973z" />
              </svg>
            }
          />
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg font-semibold text-text-primary">Billing History</h3>
                <p className="text-sm text-text-tertiary mt-1">View your invoices and payments</p>
              </div>
              {data?.isPremium && (
                <Button variant="ghost" size="sm" onClick={managePortal}>
                  View All
                </Button>
              )}
            </div>
            <div className="rounded-lg border border-dashed border-border py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-graphite flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-text-tertiary">
                {data?.isPremium ? 'Billing history available in portal' : 'No billing history yet'}
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg font-semibold text-text-primary">Quick Stats</h3>
                <p className="text-sm text-text-tertiary mt-1">Your email collection metrics</p>
              </div>
            </div>
            <ul className="space-y-4">
              <li className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-coral/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 6l-10 7L2 6" />
                    </svg>
                  </div>
                  <span className="text-sm text-text-secondary">Contacts captured</span>
                </div>
                <span className="font-mono text-sm font-medium text-text-primary">
                  {emails.length > 0 ? emails.length : '—'}
                </span>
              </li>
              <li className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-azure/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-azure" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                  </div>
                  <span className="text-sm text-text-secondary">Domains tracked</span>
                </div>
                <span className="font-mono text-sm font-medium text-text-primary">
                  {emails.length > 0 ? new Set(emails.map(e => e.domain)).size : '—'}
                </span>
              </li>
              <li className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-9-9" />
                      <path d="M21 3v9h-9" />
                    </svg>
                  </div>
                  <span className="text-sm text-text-secondary">Last sync</span>
                </div>
                <span className="font-mono text-sm font-medium text-text-primary">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    );
  };

  const renderEmailsView = () => {
    const isPremium = data?.isPremium ?? false;
    const totalContacts = emails.length;
    const uniqueDomains = new Set(emails.map(e => e.domain)).size;
    const lastSync = emails.length > 0
      ? new Date(emails[0].lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Never';

    if (emailsLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {emailsError && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-5 py-4 text-sm text-red-400 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {emailsError}
          </div>
        )}

        {/* Header Card */}
        <Card variant="elevated" padding="lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-text-primary">Email Collection</h2>
              <p className="text-text-secondary mt-1">
                All email addresses captured by your Email Extractor extension
              </p>
            </div>
            <div className="flex gap-3">
              {emails.length > 0 && isPremium && (
                <>
                  <Button variant="secondary" onClick={loadEmails} disabled={emailsLoading}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-9-9" />
                      <path d="M21 3v9h-9" />
                    </svg>
                    Refresh
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    const csv = [
                      'Email,Domain,URL,First Seen,Last Seen',
                      ...emails.map(e => {
                        const urls = e.urls?.join('; ') || e.url || '';
                        return `"${e.email}","${e.domain}","${urls}","${e.timestamp}","${e.lastSeen}"`;
                      })
                    ].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `emailboy-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <path d="M7 10l5 5 5-5" />
                      <path d="M12 15V3" />
                    </svg>
                    Export CSV
                  </Button>
                </>
              )}
              {!isPremium && (
                <Button onClick={handleUpgrade} loading={actionState.upgrade}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Upgrade to Premium
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total Contacts"
            value={totalContacts.toLocaleString()}
            trend={totalContacts > 0 ? 'up' : 'neutral'}
            change={totalContacts > 0 ? `${totalContacts} email${totalContacts !== 1 ? 's' : ''} collected` : 'Start browsing to collect'}
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
          <MetricCard
            label="Unique Domains"
            value={uniqueDomains.toLocaleString()}
            trend={uniqueDomains > 0 ? 'up' : 'neutral'}
            change={uniqueDomains > 0 ? `${uniqueDomains} source${uniqueDomains !== 1 ? 's' : ''}` : 'No domains yet'}
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            }
          />
          <MetricCard
            label="Last Sync"
            value={lastSync}
            trend="neutral"
            change="Real-time sync active"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
          />
        </div>

        {/* Data Table */}
        <Card padding="none">
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-text-primary">Captured Emails</h3>
                <p className="text-sm text-text-tertiary mt-1">
                  {emails.length > 0
                    ? `Showing ${emails.length} email${emails.length !== 1 ? 's' : ''}`
                    : 'No emails captured yet'
                  }
                </p>
              </div>
            </div>
          </div>

          {emails.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-graphite flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
              </div>
              <h4 className="font-display text-lg font-semibold text-text-primary mb-2">No emails yet</h4>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                Start browsing the web with the Email Extractor extension active. Email addresses will appear here automatically.
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-4">Email</th>
                      <th className="text-left px-6 py-4">Domain</th>
                      <th className="text-left px-6 py-4">First Seen</th>
                      <th className="text-left px-6 py-4">Last Seen</th>
                      <th className="text-left px-6 py-4">Sources</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((email, index) => {
                      const isBlurred = !isPremium && index >= 10;
                      return (
                        <tr
                          key={index}
                          className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className={`text-text-primary font-medium ${isBlurred ? 'blur-[5px] select-none' : ''}`}>
                              {email.email}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md bg-graphite text-text-secondary text-xs ${isBlurred ? 'blur-[5px] select-none' : ''}`}>
                              {email.domain}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={isBlurred ? 'blur-[5px] select-none' : ''}>
                              {new Date(email.timestamp).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={isBlurred ? 'blur-[5px] select-none' : ''}>
                              {new Date(email.lastSeen).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-text-secondary ${isBlurred ? 'blur-[5px] select-none' : ''}`}>
                              {email.urls?.length || 1} page{((email.urls?.length || 1) !== 1) ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Upgrade banner for free users with more than 10 emails */}
              {!isPremium && emails.length > 10 && (
                <div className="px-6 py-8 border-t border-border text-center">
                  <div className="max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-coral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </div>
                    <h4 className="font-display text-base font-semibold text-text-primary mb-1">
                      {emails.length - 10} more emails hidden
                    </h4>
                    <p className="text-sm text-text-secondary mb-4">
                      Upgrade to Premium to reveal all emails and export to CSV.
                    </p>
                    <Button onClick={handleUpgrade} loading={actionState.upgrade} size="sm">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                      Upgrade to Premium
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <AuthGuard>
      <DashboardLayout
        header={
          <Header
            title={activeView === 'subscriptions' ? 'Subscription' : 'Emails'}
            subtitle={activeView === 'subscriptions' ? 'Manage your plan and billing' : 'View collected email addresses'}
          />
        }
        navItems={navItems}
        activeKey={activeView}
        onChangeNav={(key) => setActiveView(key as ViewKey)}
      >
        {activeView === 'subscriptions' ? renderSubscriptionView() : renderEmailsView()}
      </DashboardLayout>
    </AuthGuard>
  );
}

export default SubscriptionPortal;
