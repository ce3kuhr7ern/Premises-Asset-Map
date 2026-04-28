import { X } from 'lucide-react';
import { getIconMeta } from '@/lib/icons/asset-icons';

interface Asset {
  id: string;
  label: string;
  iconKey: string;
  x: number;
  y: number;
}

interface MapRightPanelProps {
  asset: Asset | null;
  onClose: () => void;
}

export default function MapRightPanel({ asset, onClose }: MapRightPanelProps) {
  if (!asset) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex items-center justify-center shrink-0">
        <p className="text-sm text-gray-400 text-center px-6">
          Select an asset on the map to see its details
        </p>
      </aside>
    );
  }

  const { label: typeLabel, bgClass } = getIconMeta(asset.iconKey);

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {typeLabel.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-xs text-gray-400">{typeLabel}</p>
            <p className="text-sm font-medium text-gray-900 leading-tight">{asset.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Position */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-1">Position</p>
        <p className="text-sm text-gray-700">
          x: {asset.x.toFixed(1)}% &nbsp; y: {asset.y.toFixed(1)}%
        </p>
      </div>

      {/* Compliance placeholder */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-2">Compliance</p>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
          No record yet
        </span>
      </div>

      {/* Documents placeholder */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-400 mb-2">Documents</p>
        <p className="text-sm text-gray-400">None attached</p>
      </div>
    </aside>
  );
}
