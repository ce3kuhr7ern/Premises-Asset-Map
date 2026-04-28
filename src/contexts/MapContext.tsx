'use client';

import { createContext, useContext, useState } from 'react';
import { LAYERS } from '@/lib/icons/asset-icons';

interface MapContextType {
  activeLayers: Set<string>;
  toggleLayer: (key: string) => void;
  isPlacing: boolean;
  setIsPlacing: (v: boolean) => void;
}

const MapContext = createContext<MapContextType | null>(null);

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(
    new Set(LAYERS.filter((l) => l.defaultOn).map((l) => l.key))
  );
  const [isPlacing, setIsPlacing] = useState(false);

  function toggleLayer(key: string) {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <MapContext.Provider value={{ activeLayers, toggleLayer, isPlacing, setIsPlacing }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within MapProvider');
  return ctx;
}
