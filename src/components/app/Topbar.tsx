'use client';

import { Menu } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      {/* Burger — mobile only */}
      <button
        type="button"
        className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* App name — mobile centre, desktop hidden (sidebar shows it) */}
      <span className="lg:hidden text-sm font-semibold text-gray-800 absolute left-1/2 -translate-x-1/2">
        Premises Asset Map
      </span>

      <div className="flex-1" />

      <UserButton />
    </header>
  );
}
