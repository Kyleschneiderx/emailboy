import { useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useSupabaseSession } from '../hooks/useSupabaseSession';
import { getValidSession } from '../lib/sessionValidation';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that protects routes requiring authentication
 * Shows a sign-in prompt if the user is not authenticated
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { session, isValidating } = useSupabaseSession();

  useEffect(() => {
    // Try to get valid session on mount
    const checkSession = async () => {
      await getValidSession();
    };
    checkSession();
  }, []);

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <p className="text-text-secondary">Validating session...</p>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Sign in required
          </h2>
          <p className="text-text-secondary mb-6">
            Please open the EmailBoy extension, sign in, then return to this page.
            Your session will sync automatically.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                // Try to reload session from localStorage
                window.location.reload();
              }}
              variant="secondary"
            >
              Check Again
            </Button>
            <p className="text-sm text-text-secondary mt-4">
              If you're already signed in, make sure the extension is open and
              try refreshing this page.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

