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

interface AssetBottomSheetProps {
  asset: Asset | null;
  onClose: () => void;
  onUpdate: (id: string, updates: { label: string; iconKey: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function AssetBottomSheet({ asset, onClose, onUpdate, onDelete }: AssetBottomSheetProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirmDelete'>('view');
  const [label, setLabel] = useState('');
  const [iconKey, setIconKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const meta = asset ? getIconMeta(asset.iconKey) : null;

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

  function handleClose() {
    setMode('view');
    onClose();
  }

  return (
    <div
      className={[
        'lg:hidden fixed inset-x-0 bottom-[56px] z-30',
        'bg-white rounded-t-2xl shadow-2xl',
        'transform transition-transform duration-300',
        asset ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {mode === 'view' && (
        <>
          <div className="flex items-start justify-between px-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {meta && (
                <span className={`w-10 h-10 rounded-full ${meta.bgClass} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {meta.label.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-base font-semibold text-gray-900">{asset?.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{meta?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={startEdit} title="Edit asset"
                className="p-2 text-gray-400 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Pencil size={18} />
              </button>
              <button type="button" onClick={() => setMode('confirmDelete')} title="Delete asset"
                className="p-2 text-gray-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Trash2 size={18} />
              </button>
              <button type="button" onClick={handleClose} aria-label="Close"
                className="p-2 text-gray-400 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Compliance</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                No record yet
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Documents</span>
              <span className="text-sm text-gray-400">None attached</span>
            </div>
          </div>
        </>
      )}

      {mode === 'edit' && (
        <div className="px-4 pb-6 space-y-4">
          <div>
            <label htmlFor="mobile-asset-label" className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              id="mobile-asset-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Asset label"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="mobile-asset-type" className="block text-sm font-medium text-gray-700 mb-1">
              Asset Type
            </label>
            <select
              id="mobile-asset-type"
              value={iconKey}
              onChange={(e) => setIconKey(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {Object.entries(ASSET_ICON_META).map(([key, { label: tl, layer }]) => (
                <option key={key} value={key}>{tl} — {layer}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setMode('view')}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving || !label.trim()}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-green-700 rounded-md hover:bg-green-800 disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {mode === 'confirmDelete' && (
        <div className="px-4 pb-6 space-y-4">
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800">Delete this asset?</p>
            <p className="text-sm text-red-600 mt-1 truncate">&ldquo;{asset?.label}&rdquo;</p>
            <p className="text-xs text-red-500 mt-2">This cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setMode('view')}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} disabled={isSaving}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">
              {isSaving ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
