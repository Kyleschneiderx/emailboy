import type { ReactNode } from 'react';
import { colors } from '../../styles/design-tokens';
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

export function Sidebar({ items, activeKey, onChange }: SidebarProps) {
  return (
    <aside
      className="hidden lg:flex w-[240px] flex-col bg-white border-r border-black/5"
      style={{ backgroundColor: colors.surface }}
    >
      <div className="h-16 flex items-center px-6 border-b border-black/5">
        <div className="font-semibold text-lg text-text-primary">EmailBoy Portal</div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition',
                active
                  ? 'bg-white shadow-sm border border-black/5 text-text-primary'
                  : 'text-text-secondary hover:bg-black/5',
              )}
              onClick={() => onChange?.(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-6 py-6 text-xs text-text-secondary border-t border-black/5">
        © {new Date().getFullYear()} EmailBoy
      </div>
    </aside>
  );
}

