import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

interface HeaderProps {
  title?: string;
  actions?: ReactNode;
  onSync?: () => void;
  syncing?: boolean;
}

export function Header({ title = 'Subscription Management', actions, onSync, syncing }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/5 bg-white/80 px-6 backdrop-blur">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        <p className="text-sm text-text-secondary">Manage your EmailBoy premium subscription</p>
      </div>
      <div className="flex items-center gap-3">
        {onSync && (
          <Button variant="secondary" size="sm" onClick={onSync} loading={syncing}>
            Refresh
          </Button>
        )}
        {actions}
      </div>
    </header>
  );
}

