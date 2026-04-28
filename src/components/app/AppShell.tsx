'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import MobileDrawer from './MobileDrawer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isMapPage = pathname.startsWith('/map');

  return (
    // h-[100dvh] accounts for iOS Safari browser chrome (address bar + bottom bar)
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main className={`flex-1 min-h-0 ${isMapPage ? 'overflow-hidden' : 'overflow-y-auto p-6'}`}>
          {children}
        </main>
        <BottomNav />
      </div>

      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
