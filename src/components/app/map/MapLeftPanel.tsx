'use client';

import { Layers, Plus } from 'lucide-react';
import { LAYERS } from '@/lib/icons/asset-icons';

interface MapLeftPanelProps {
  activeLayers: Set<string>;
  onLayerToggle: (key: string) => void;
  isPlacing: boolean;
  onTogglePlacement: () => void;
}

export default function MapLeftPanel({ activeLayers, onLayerToggle, isPlacing, onTogglePlacement }: MapLeftPanelProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={onTogglePlacement}
          className={[
            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isPlacing
              ? 'bg-green-700 text-white hover:bg-green-800'
              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200',
          ].join(' ')}
        >
          <Plus size={16} />
          {isPlacing ? 'Click map to place…' : 'Place Asset'}
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Layers size={16} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Layers</span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {LAYERS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={activeLayers.has(key)}
              onChange={() => onLayerToggle(key)}
              className="w-4 h-4 rounded accent-green-700"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}
