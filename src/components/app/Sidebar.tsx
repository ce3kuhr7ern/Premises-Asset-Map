'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Map, Package, FileText, ClipboardCheck, Wrench,
  Users, Settings, HelpCircle, ChevronLeft, ChevronRight, Eye, EyeOff, Plus,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useMapContext } from '@/contexts/MapContext';
import { LAYERS } from '@/lib/icons/asset-icons';

const STORAGE_KEY = 'sidebar-collapsed';

const primaryNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/assets', label: 'Assets', icon: Package },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/compliance', label: 'Compliance', icon: ClipboardCheck },
  { href: '/suppliers', label: 'Suppliers', icon: Wrench },
];

const adminNav = [
  { href: '/users', label: 'Users & Access', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help', icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { activeLayers, toggleLayer, isPlacing, setIsPlacing } = useMapContext();
  const onMapPage = pathname.startsWith('/map');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === 'true');
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, String(!c));
      return !c;
    });
  }

  return (
    <aside
      className={[
        'relative hidden lg:flex flex-col bg-slate-900 shrink-0',
        'transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700 shrink-0 overflow-hidden">
        {!collapsed && (
          <span className="text-white font-semibold text-sm leading-tight truncate">
            Redhill Village Hall
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {primaryNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <div key={href}>
              <Link
                href={href}
                title={collapsed ? label : undefined}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  active ? 'bg-green-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                  collapsed ? 'justify-center' : '',
                ].join(' ')}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && label}
              </Link>

              {/* Map layer tools — visible when expanded and on map page */}
              {href === '/map' && onMapPage && !collapsed && (
                <div className="mt-1 ml-4 pl-3 border-l border-slate-700 space-y-0.5">
                  {LAYERS.map((layer) => {
                    const on = activeLayers.has(layer.key);
                    return (
                      <button
                        key={layer.key}
                        type="button"
                        onClick={() => toggleLayer(layer.key)}
                        className="flex items-center gap-2 w-full px-2 py-2 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        {on
                          ? <Eye size={14} className="text-green-400 shrink-0" />
                          : <EyeOff size={14} className="shrink-0" />}
                        {layer.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsPlacing(!isPlacing)}
                    className={[
                      'flex items-center gap-2 w-full px-2 py-2 rounded text-xs font-medium transition-colors mt-1',
                      isPlacing
                        ? 'bg-green-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                    ].join(' ')}
                  >
                    <Plus size={14} className="shrink-0" />
                    {isPlacing ? 'Click the map to place…' : 'Place Asset'}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 mt-4 border-t border-slate-700 space-y-1">
          {adminNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  active ? 'bg-green-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                  collapsed ? 'justify-center' : '',
                ].join(' ')}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User account */}
      <div className={`shrink-0 border-t border-slate-700 p-3 flex ${collapsed ? 'justify-center' : 'items-center gap-3'}`}>
        <UserButton />
        {!collapsed && <span className="text-xs text-slate-400 truncate">Account</span>}
      </div>

      {/* Collapse toggle button */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 hover:bg-slate-500 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
