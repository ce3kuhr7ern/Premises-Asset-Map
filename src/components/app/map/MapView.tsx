'use client';

import { useState } from 'react';
import { getIconMeta } from '@/lib/icons/asset-icons';
import { useMapContext } from '@/contexts/MapContext';
import MapCanvas from './MapCanvas';
import AssetDetailBar from './AssetDetailBar';
import AssetBottomSheet from './AssetBottomSheet';
import AssetPlacementModal from './AssetPlacementModal';

interface Asset {
  id: string;
  label: string;
  iconKey: string;
  x: number;
  y: number;
}

interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
}

interface PendingPlacement {
  x: number;
  y: number;
}

export default function MapView({ floorPlan, assets: initialAssets }: { floorPlan: FloorPlan; assets: Asset[] }) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPlacement | null>(null);

  const { activeLayers, isPlacing, setIsPlacing } = useMapContext();

  function handleMapClick(x: number, y: number) {
    setPending({ x, y });
    setIsPlacing(false);
  }

  function handleAssetSaved(asset: Asset) {
    setAssets((prev) => [...prev, asset]);
    setPending(null);
    setSelectedId(asset.id);
  }

  async function handleAssetUpdate(id: string, updates: { label: string; iconKey: string }) {
    const res = await fetch(`/api/map-assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update asset');
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
  }

  async function handleAssetDelete(id: string) {
    const res = await fetch(`/api/map-assets/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete asset');
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setSelectedId(null);
  }

  const visibleAssets = assets.filter((a) => {
    const { layer } = getIconMeta(a.iconKey);
    return activeLayers.has(layer);
  });

  const selectedAsset = assets.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-full">
      <AssetDetailBar
        key={selectedId}
        asset={selectedAsset}
        onClose={() => setSelectedId(null)}
        onUpdate={handleAssetUpdate}
        onDelete={handleAssetDelete}
      />

      <div className="flex-1 relative overflow-hidden">
        <MapCanvas
          imageUrl={floorPlan.imageUrl}
          imageWidth={floorPlan.imageWidth}
          imageHeight={floorPlan.imageHeight}
          assets={visibleAssets}
          selectedAssetId={selectedId}
          isPlacing={isPlacing}
          onAssetClick={(id) => setSelectedId(id === selectedId ? null : id)}
          onMapClick={handleMapClick}
        />
      </div>

      <AssetBottomSheet
        key={`sheet-${selectedId}`}
        asset={selectedAsset}
        onClose={() => setSelectedId(null)}
        onUpdate={handleAssetUpdate}
        onDelete={handleAssetDelete}
      />

      {pending && (
        <AssetPlacementModal
          x={pending.x}
          y={pending.y}
          floorPlanId={floorPlan.id}
          onSave={handleAssetSaved}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
