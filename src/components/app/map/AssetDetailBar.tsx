'use client';

import { useState } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { getIconMeta, ASSET_ICON_META } from '@/lib/icons/asset-icons';

interface Asset {
  id: string;
  label: string;
  iconKey: string;
  x: number;
  y: number;
}

interface AssetDetailBarProps {
  asset: Asset | null;
  onClose: () => void;
  onUpdate: (id: string, updates: { label: string; iconKey: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function AssetDetailBar({ asset, onClose, onUpdate, onDelete }: AssetDetailBarProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirmDelete'>('view');
  const [label, setLabel] = useState('');
  const [iconKey, setIconKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!asset) return null;

  const { label: typeLabel, bgClass } = getIconMeta(asset.iconKey);

  function startEdit() {
    setLabel(asset!.label);
    setIconKey(asset!.iconKey);
    setMode('edit');
  }

  async function handleSave() {
    if (!label.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(asset!.id, { label: label.trim(), iconKey });
      setMode('view');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsSaving(true);
    await onDelete(asset!.id);
  }

  if (mode === 'edit') {
    return (
      <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setMode('view'); }}
          className="flex-1 min-w-0 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          placeholder="Asset label"
          autoFocus
        />
        <select
          value={iconKey}
          onChange={(e) => setIconKey(e.target.value)}
          aria-label="Asset type"
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 shrink-0"
        >
          {Object.entries(ASSET_ICON_META).map(([key, { label: tl, layer }]) => (
            <option key={key} value={key}>{tl} — {layer}</option>
          ))}
        </select>
        <button type="button" onClick={handleSave} disabled={isSaving || !label.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white bg-green-700 rounded-md hover:bg-green-800 disabled:opacity-50 shrink-0">
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setMode('view')}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shrink-0">
          Cancel
        </button>
      </div>
    );
  }

  if (mode === 'confirmDelete') {
    return (
      <div className="hidden lg:flex items-center gap-4 px-4 py-2.5 bg-red-50 border-b border-red-200 shrink-0">
        <p className="flex-1 text-sm font-medium text-red-800 truncate">
          Delete &ldquo;{asset.label}&rdquo;? This cannot be undone.
        </p>
        <button type="button" onClick={handleDelete} disabled={isSaving}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 shrink-0">
          {isSaving ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button type="button" onClick={() => setMode('view')}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shrink-0">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-4 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
      <span className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
        {typeLabel.slice(0, 2).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{asset.label}</p>
        <p className="text-xs text-gray-500">{typeLabel}</p>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
        <span>Position {asset.x.toFixed(1)}%, {asset.y.toFixed(1)}%</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
          No compliance record
        </span>
      </div>
      <div className="flex items-center shrink-0">
        <button type="button" onClick={startEdit} title="Edit asset"
          className="p-2 text-gray-400 hover:text-gray-700 rounded transition-colors">
          <Pencil size={15} />
        </button>
        <button type="button" onClick={() => setMode('confirmDelete')} title="Delete asset"
          className="p-2 text-gray-400 hover:text-red-600 rounded transition-colors">
          <Trash2 size={15} />
        </button>
        <button type="button" onClick={() => { setMode('view'); onClose(); }} aria-label="Close"
          className="p-2 text-gray-400 hover:text-gray-700 rounded transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
