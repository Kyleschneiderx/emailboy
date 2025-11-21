import type { ReactNode } from 'react';
import { Sidebar, type NavItem } from './Sidebar';

interface DashboardLayoutProps {
  header: ReactNode;
  children: ReactNode;
  navItems: NavItem[];
  activeKey: string;
  onChangeNav?: (key: string) => void;
}

export function DashboardLayout({ header, children, navItems, activeKey, onChangeNav }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex">
        <Sidebar items={navItems} activeKey={activeKey} onChange={onChangeNav} />
        <div className="flex-1 min-h-screen flex flex-col">
          {header}
          <main className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1440px] space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

