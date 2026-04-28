'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AssetTypeSummary {
  id: string;
  name: string;
  iconKey: string;
  layer: string;
}

interface AssetPlacementModalProps {
  x: number;
  y: number;
  floorPlanId: string;
  onSave: (asset: { id: string; label: string; iconKey: string; x: number; y: number }) => void;
  onCancel: () => void;
}

export default function AssetPlacementModal({ x, y, floorPlanId, onSave, onCancel }: AssetPlacementModalProps) {
  const [label, setLabel] = useState('');
  const [iconKey, setIconKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [types, setTypes] = useState<AssetTypeSummary[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    fetch('/api/asset-types')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setTypes(json.data);
          setIconKey(json.data[0].iconKey);
        }
      })
      .catch(() => {/* non-fatal — user will see empty select */})
      .finally(() => setLoadingTypes(false));
  }, []);

  async function handleSave() {
    if (!label.trim()) { setError('Label is required'); return; }
    if (!iconKey) { setError('Please select an asset type'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/map-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ floorPlanId, label: label.trim(), x, y, iconKey }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to save');
      onSave(json.data);
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  const groupedTypes = types.reduce<Record<string, AssetTypeSummary[]>>((acc, t) => {
    (acc[t.layer] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Place Asset</h2>
          <button type="button" onClick={onCancel} aria-label="Cancel" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Position: x {x}% · y {y}%
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="asset-label" className="form-label">Label</label>
            <input
              id="asset-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Fire Extinguisher — Hall Exit"
              className="form-input"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="asset-type" className="form-label">Asset Type</label>
            <select
              id="asset-type"
              value={iconKey}
              onChange={(e) => setIconKey(e.target.value)}
              className="form-select"
              disabled={loadingTypes}
            >
              {loadingTypes && <option value="">Loading…</option>}
              {!loadingTypes && types.length === 0 && (
                <option value="">No asset types configured</option>
              )}
              {Object.entries(groupedTypes).map(([layer, layerTypes]) => (
                <optgroup key={layer} label={layer.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}>
                  {layerTypes.map((t) => (
                    <option key={t.iconKey} value={t.iconKey}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingTypes}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-md hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Place Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}
