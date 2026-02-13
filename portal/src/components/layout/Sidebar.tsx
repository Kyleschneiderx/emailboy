import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface NavItem {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface SidebarProps {
  items: NavItem[];
  activeKey: string;
  onChange?: (key: string) => void;
}

// Icons
const SubscriptionIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M7 15h4" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 6l-10 7L2 6" />
  </svg>
);

const iconMap: Record<string, ReactNode> = {
  subscriptions: <SubscriptionIcon />,
  emails: <EmailIcon />,
};

export function Sidebar({ items, activeKey, onChange }: SidebarProps) {
  return (
    <aside className="hidden lg:flex w-[260px] flex-col bg-obsidian border-r border-border">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-coral-light flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M4 6h16M4 12h12M4 18h14" />
          </svg>
        </div>
        <span className="font-display font-semibold text-lg text-text-primary tracking-tight">
          EmailBoy
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">
        <div className="space-y-1">
          {items.map((item) => {
            const active = item.key === activeKey;
            const icon = item.icon || iconMap[item.key];
            return (
              <button
                key={item.key}
                className={cn(
                  'group w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-coral/10 to-transparent text-coral border-l-2 border-coral'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
                )}
                onClick={() => onChange?.(item.key)}
              >
                <span className={cn(
                  'transition-colors duration-200',
                  active ? 'text-coral' : 'text-text-tertiary group-hover:text-text-secondary'
                )}>
                  {icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
          <span>System Online</span>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          © {new Date().getFullYear()} EmailBoy
        </p>
      </div>
    </aside>
  );
}
