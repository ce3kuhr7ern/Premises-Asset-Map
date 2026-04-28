'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LayoutDashboard, Users, Settings, Eye, EyeOff, Plus } from 'lucide-react';
import { useMapContext } from '@/contexts/MapContext';
import { LAYERS } from '@/lib/icons/asset-icons';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { activeLayers, toggleLayer, isPlacing, setIsPlacing } = useMapContext();
  const onMapPage = pathname.startsWith('/map');

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 flex flex-col lg:hidden',
          'transform transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700 shrink-0">
          <span className="text-white font-semibold text-sm">Redhill Village Hall</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-slate-400 hover:text-white p-2 -mr-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <Link
            href="/dashboard"
            onClick={onClose}
            className={[
              'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors',
              pathname === '/dashboard' ? 'bg-green-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
            ].join(' ')}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          {/* Map tools — only shown when on a map page */}
          {onMapPage && (
            <div className="py-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider px-3 mb-2 font-medium">
                Map Layers
              </p>
              {LAYERS.map((layer) => {
                const on = activeLayers.has(layer.key);
                return (
                  <button
                    key={layer.key}
                    type="button"
                    onClick={() => toggleLayer(layer.key)}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {on
                      ? <Eye size={18} className="text-green-400 shrink-0" />
                      : <EyeOff size={18} className="shrink-0" />}
                    {layer.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => { setIsPlacing(!isPlacing); onClose(); }}
                className={[
                  'flex items-center gap-3 w-full px-3 py-3 rounded-md text-sm font-medium transition-colors mt-1',
                  isPlacing
                    ? 'bg-green-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                ].join(' ')}
              >
                <Plus size={18} className="shrink-0" />
                {isPlacing ? 'Tap map to place…' : 'Place Asset'}
              </button>
            </div>
          )}

          <div className="pt-4 mt-4 border-t border-slate-700 space-y-1">
            <Link
              href="/users"
              onClick={onClose}
              className={[
                'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith('/users') ? 'bg-green-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
              ].join(' ')}
            >
              <Users size={20} />
              Users &amp; Access
            </Link>
            <Link
              href="/settings"
              onClick={onClose}
              className={[
                'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith('/settings') ? 'bg-green-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
              ].join(' ')}
            >
              <Settings size={20} />
              Settings
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
