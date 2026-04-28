'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Package, FileText, ClipboardCheck } from 'lucide-react';

const items = [
  { href: '/map', label: 'Map', icon: Map },
  { href: '/assets', label: 'Assets', icon: Package },
  { href: '/documents', label: 'Docs', icon: FileText },
  { href: '/compliance', label: 'Compliance', icon: ClipboardCheck },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden flex shrink-0 border-t border-gray-200 bg-white">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex flex-col items-center justify-center flex-1 gap-1 py-2',
              'text-xs font-medium transition-colors min-h-[56px]',
              active ? 'text-green-700' : 'text-gray-500 hover:text-gray-900',
            ].join(' ')}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
