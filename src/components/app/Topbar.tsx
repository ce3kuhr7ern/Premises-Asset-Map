'use client';

import { Menu } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <button
        className="lg:hidden p-2 text-gray-500 hover:text-gray-900"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 lg:flex-none" />

      <UserButton />
    </header>
  );
}
