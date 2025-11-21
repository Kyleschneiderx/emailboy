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
import { getValidSession, validateSessionWithServer } from '../lib/sessionValidation';
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

    // Get session (skip strict validation - let API call validate it)
    const validSession = await getValidSession(true);
    if (!validSession || !validSession.access_token) {
      console.log('[LoadData] No valid session found');
      setError('Session not found. Please sign in again.');
      setLoading(false);
      return;
    }

    console.log('[LoadData] Attempting to fetch subscription with session:', {
      hasToken: !!validSession.access_token,
      hasUser: !!validSession.user
    });

    setLoading(true);
    setError(null);
    try {
      // Make API call - this will validate the session on the server
      const response = await subscriptionApi.fetchSubscription(validSession.access_token);
      console.log('[LoadData] Subscription data received:', response);
      setData(response);
    } catch (err) {
      console.error('[LoadData] Error fetching subscription:', err);
      if (err instanceof Error && (err.message.includes('Unauthorized') || err.message.includes('Session expired'))) {
        setError('Session expired. Please sign in again.');
        // Clear invalid session
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

  const handleUpgrade = () =>
    handleAction('upgrade', async () => {
      if (!accessToken) return;
      const validSession = await getValidSession(true);
      if (!validSession || !validSession.access_token) {
        throw new Error('Session not found. Please sign in again.');
      }
      
      // Create checkout session
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

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    });

  // Handle checkout success/cancel from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkout = urlParams.get('checkout');
    const sessionId = urlParams.get('session_id');
    const message = urlParams.get('message');
    const upgrade = urlParams.get('upgrade');

    // If upgrade flag is present, automatically trigger upgrade flow
    if (upgrade === 'true' && accessToken && !data?.isPremium) {
      // Clean up URL first
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('upgrade');
      window.history.replaceState({}, '', newUrl.toString());
      
      // Trigger upgrade after a short delay to ensure page is loaded
      setTimeout(() => {
        handleUpgrade();
      }, 500);
      return;
    }

    if (checkout === 'success') {
      setError(null);
      // Show success message
      const successMsg = '✅ Payment successful! Your subscription is being activated...';
      setError(successMsg);
      // Reload subscription data after a delay
      setTimeout(() => {
        if (accessToken) {
          loadData();
        }
      }, 2000);
      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('checkout');
      newUrl.searchParams.delete('session_id');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (checkout === 'cancel') {
      setError('Payment was canceled. No charges were made.');
      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('checkout');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (checkout === 'error' && message) {
      setError(`Error: ${decodeURIComponent(message)}`);
      // Clean up URL
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
        <Card className="text-center py-10">
          <p className="text-text-secondary">Validating session...</p>
        </Card>
      );
    }

    if (!session) {
      return (
        <Card className="text-center py-10">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Sign in required</h2>
          <p className="text-text-secondary mb-4">
            Please open the EmailBoy extension, sign in, then return to this page. Your session will
            sync automatically.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="secondary"
          >
            Check Again
          </Button>
        </Card>
      );
    }

    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {error && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            error.startsWith('✅') 
              ? 'border-green-500/40 bg-green-500/5 text-green-700'
              : 'border-semantic-danger/40 bg-semantic-danger/5 text-semantic-danger'
          }`}>
            {error}
          </div>
        )}

        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-text-secondary">Subscription</p>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-text-primary">
                {data?.subscription?.plan ?? 'Free'}
              </h2>
              <StatusBadge
                variant={
                  subscriptionStatus === 'active'
                    ? 'active'
                    : subscriptionStatus === 'trialing'
                      ? 'trialing'
                      : 'warning'
                }
              >
                {subscriptionStatus}
              </StatusBadge>
            </div>
            {data?.subscription?.current_period_end && (
              <p className="mt-2 text-sm text-text-secondary">
                Renews on{' '}
                {new Date(data.subscription.current_period_end).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={managePortal}
              disabled={!data?.isPremium}
              loading={actionState.portal}
            >
              Manage Subscription
            </Button>
            {!data?.isPremium && (
              <Button
                variant="secondary"
                onClick={handleUpgrade}
                loading={actionState.upgrade}
              >
                Upgrade to Premium
              </Button>
            )}
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Plan"
            value={data?.subscription?.plan ?? 'Free'}
            change={data?.isPremium ? 'Premium active' : 'Upgrade available'}
            trend={data?.isPremium ? 'up' : 'neutral'}
          />
          <MetricCard
            label="Status"
            value={data?.subscription?.status ?? 'inactive'}
            change={
              data?.subscription?.current_period_end
                ? `Renews ${new Date(data.subscription.current_period_end).toLocaleDateString()}`
                : 'No renewal scheduled'
            }
            trend="neutral"
          />
          <MetricCard
            label="Real-time Sync"
            value={data?.isPremium ? 'Enabled' : 'Disabled'}
            change={data?.isPremium ? '+100 captured emails / day' : 'Available on Premium'}
            trend={data?.isPremium ? 'up' : 'neutral'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Billing history</h3>
                <p className="text-sm text-text-secondary">Coming soon</p>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-black/10 py-10 text-center text-sm text-text-secondary">
              Billing timeline and invoices will appear here.
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Usage summary</h3>
                <p className="text-sm text-text-secondary">Updated every 24 hours</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-center justify-between">
                <span>Total contacts captured</span>
                <span className="font-semibold text-text-primary">Coming soon</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Domains tracked</span>
                <span className="font-semibold text-text-primary">Coming soon</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Last sync</span>
                <span className="font-semibold text-text-primary">
                  {new Date().toLocaleTimeString()}
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    );
  };

  const renderEmailsView = () => {
    // Calculate stats from emails
    const totalContacts = emails.length;
    const uniqueDomains = new Set(emails.map(e => e.domain)).size;
    const lastSync = emails.length > 0 
      ? new Date(emails[0].lastSeen).toLocaleTimeString()
      : 'Never';

    if (emailsLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {emailsError && (
          <div className="rounded-xl border border-semantic-danger/40 bg-semantic-danger/5 px-4 py-3 text-sm text-semantic-danger">
            {emailsError}
          </div>
        )}

        <Card className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-text-primary">Emails Dashboard</h2>
          <p className="text-sm text-text-secondary">
            View all email addresses captured by the EmailBoy extension. Data is synced in real-time from your browsing activity.
          </p>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard 
            label="Contacts captured" 
            value={totalContacts.toLocaleString()} 
            trend={totalContacts > 0 ? 'up' : 'neutral'}
            change={totalContacts > 0 ? `${totalContacts} email${totalContacts !== 1 ? 's' : ''} found` : 'No emails captured yet'}
          />
          <MetricCard 
            label="Domains tracked" 
            value={uniqueDomains.toLocaleString()} 
            trend={uniqueDomains > 0 ? 'up' : 'neutral'}
            change={uniqueDomains > 0 ? `${uniqueDomains} unique domain${uniqueDomains !== 1 ? 's' : ''}` : 'No domains found'}
          />
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Captured Emails</h3>
              <p className="text-sm text-text-secondary">Last sync: {lastSync}</p>
            </div>
            {emails.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={loadEmails}
                disabled={emailsLoading}
              >
                Refresh
              </Button>
            )}
          </div>

          {emails.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/10 py-10 text-center text-sm text-text-secondary">
              <p className="mb-2">No emails captured yet.</p>
              <p>Start browsing with the EmailBoy extension to capture email addresses.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-text-secondary">
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Domain</th>
                    <th className="pb-3 font-medium">First Seen</th>
                    <th className="pb-3 font-medium">Last Seen</th>
                    <th className="pb-3 font-medium">Sources</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email, index) => (
                    <tr key={index} className="border-b border-black/5 hover:bg-black/2">
                      <td className="py-3 font-medium text-text-primary">{email.email}</td>
                      <td className="py-3 text-text-secondary">{email.domain}</td>
                      <td className="py-3 text-text-secondary">
                        {new Date(email.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {new Date(email.lastSeen).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {email.urls?.length || 1} page{((email.urls?.length || 1) !== 1) ? 's' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <AuthGuard>
      <DashboardLayout
        header={<Header title={activeView === 'subscriptions' ? 'Subscription Management' : 'Emails'} />}
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

