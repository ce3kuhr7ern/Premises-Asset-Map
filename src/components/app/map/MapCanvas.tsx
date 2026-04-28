'use client';

import { useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import AssetMarker from './AssetMarker';

interface Asset {
  id: string;
  label: string;
  iconKey: string;
  x: number;
  y: number;
}

interface MapCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  assets: Asset[];
  selectedAssetId: string | null;
  isPlacing: boolean;
  onAssetClick: (id: string) => void;
  onMapClick: (x: number, y: number) => void;
}

export default function MapCanvas({ imageUrl, imageWidth, imageHeight, assets, selectedAssetId, isPlacing, onAssetClick, onMapClick }: MapCanvasProps) {
  const imageRef = useRef<HTMLDivElement>(null);
  // Track the current zoom scale so AssetMarker can apply a counter-scale
  // and stay at constant screen size regardless of how zoomed in the floor plan is.
  const [zoomScale, setZoomScale] = useState(1);

  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isPlacing) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onMapClick(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  }

  return (
    <div className="relative flex-1 bg-white overflow-hidden">
      {/* Placement mode banner */}
      {isPlacing && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Tap anywhere on the floor plan to place the asset
        </div>
      )}

      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={4}
        centerOnInit
        limitToBounds={false}
        onTransform={({ state }) => setZoomScale(state.scale)}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => zoomIn()}
                aria-label="Zoom in"
                className="w-11 h-11 bg-white border border-gray-300 rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                aria-label="Zoom out"
                className="w-11 h-11 bg-white border border-gray-300 rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={() => resetTransform()}
                aria-label="Reset view"
                className="w-11 h-11 bg-white border border-gray-300 rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <div
                ref={imageRef}
                onClick={handleContainerClick}
                className={`relative inline-block ${isPlacing ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{ width: imageWidth, height: imageHeight }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Floor plan"
                  width={imageWidth}
                  height={imageHeight}
                  className="block max-w-none select-none w-full h-full"
                  draggable={false}
                />
                {assets.map((asset) => (
                  <AssetMarker
                    key={asset.id}
                    {...asset}
                    zoomScale={zoomScale}
                    isSelected={asset.id === selectedAssetId}
                    onClick={onAssetClick}
                  />
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
