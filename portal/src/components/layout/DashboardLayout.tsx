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
    <div className="min-h-screen bg-void relative">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

      {/* Grain texture overlay */}
      <div className="grain" />

      <div className="relative flex">
        <Sidebar items={navItems} activeKey={activeKey} onChange={onChangeNav} />
        <div className="flex-1 min-h-screen flex flex-col">
          {header}
          <main className="flex-1 px-4 py-8 lg:px-8">
            <div className="mx-auto w-full max-w-[1400px]">
              <div className="stagger-children">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
