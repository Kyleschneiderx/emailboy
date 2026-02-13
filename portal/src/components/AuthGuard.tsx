import { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useSupabaseSession } from '../hooks/useSupabaseSession';
import { getValidSession } from '../lib/sessionValidation';
import { supabaseConfig } from '../config/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { session, isValidating } = useSupabaseSession();
  const [isSignUp, setIsSignUp] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('signup');
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      await getValidSession();
    };
    checkSession();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const response = await fetch(`${supabaseConfig.url}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseConfig.anonKey,
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error_description || data.msg || 'Sign up failed');
        }

        if (data.access_token) {
          // Auto-confirmed, save session
          const session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            user: data.user,
          };
          localStorage.setItem('supabaseSession', JSON.stringify(session));
          window.location.reload();
        } else {
          setSuccess('Account created! Check your email to verify, then sign in.');
          setIsSignUp(false);
        }
      } else {
        const response = await fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseConfig.anonKey,
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error_description || data.msg || 'Sign in failed');
        }

        const session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          user: data.user,
        };
        localStorage.setItem('supabaseSession', JSON.stringify(session));
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-coral/30 border-t-coral rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Validating session...</p>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-coral to-coral-light flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-text-primary">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {isSignUp ? 'Create your EmailBoy account' : 'Sign in to your EmailBoy account'}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald/30 bg-emerald/5 px-4 py-3 text-sm text-emerald mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-graphite border border-border text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-coral transition-colors"
                autoComplete="email"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-graphite border border-border text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-coral transition-colors"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="text-coral hover:underline font-medium"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
