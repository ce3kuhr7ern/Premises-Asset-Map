'use client';

import {
  Flame, Bell, AlertCircle, DoorOpen, DoorClosed,
  Zap, Lightbulb, Droplets, Square, HelpCircle,
} from 'lucide-react';
import { getIconMeta } from '@/lib/icons/asset-icons';

const ICON_MAP: Record<string, React.ElementType> = {
  Flame, Bell, AlertCircle, DoorOpen, DoorClosed,
  Zap, Lightbulb, Droplets, Square, HelpCircle,
};

interface AssetMarkerProps {
  id: string;
  label: string;
  x: number;
  y: number;
  iconKey: string;
  isSelected: boolean;
  /**
   * Current floor-plan zoom scale, supplied by MapCanvas. The marker applies an
   * inverse scale so it stays at constant screen size regardless of how zoomed in
   * the floor plan is (Google-Maps-style markers).
   */
  zoomScale?: number;
  onClick: (id: string) => void;
}

export default function AssetMarker({ id, label, x, y, iconKey, isSelected, zoomScale = 1, onClick }: AssetMarkerProps) {
  const { bgClass, lucideIcon, svgFile } = getIconMeta(iconKey);
  const Icon = ICON_MAP[lucideIcon] ?? HelpCircle;
  const inverse = zoomScale > 0 ? 1 / zoomScale : 1;

  return (
    <div
      className="absolute group"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${inverse})`,
        transformOrigin: 'center',
      }}
    >
      {/* Hover tooltip — desktop only */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
        <span className="bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
          {label}
        </span>
        <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick(id); }}
        aria-label={label}
        className={[
          'flex items-center justify-center',
          'w-6 h-6 rounded-full text-white overflow-hidden',
          'shadow-md transition-transform cursor-pointer',
          'hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
          svgFile ? 'bg-white p-0' : bgClass,
          isSelected ? 'scale-150 ring-2 ring-white ring-offset-1 z-10' : '',
        ].join(' ')}
      >
        {svgFile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={svgFile} alt={label} className="w-5 h-5 object-contain" draggable={false} />
        ) : (
          <Icon size={12} strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
}
