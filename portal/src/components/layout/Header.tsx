import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  onSync?: () => void;
  syncing?: boolean;
}

export function Header({ title = 'Dashboard', subtitle, actions, onSync, syncing }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-void/80 backdrop-blur-xl px-6">
      <div className="flex items-center gap-6">
        {/* Mobile menu button */}
        <button className="lg:hidden p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h1 className="font-display text-lg font-semibold text-text-primary tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-tertiary mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onSync && (
          <Button variant="ghost" size="sm" onClick={onSync} loading={syncing}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-9-9" />
              <path d="M21 3v9h-9" />
            </svg>
            Sync
          </Button>
        )}
        {actions}
      </div>
    </header>
  );
}
