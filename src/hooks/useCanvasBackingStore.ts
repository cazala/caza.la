import { useCallback, useEffect, useState } from 'react';
import type { Engine } from '@cazala/party';
import type { RefObject } from 'react';
import type { ViewportSize } from './useViewportSize';

export type CanvasBackingStoreSize = { pixelW: number; pixelH: number };

export type UseCanvasBackingStoreOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewport: ViewportSize;
  engine: Engine | null;
};

export function useCanvasBackingStore({
  canvasRef,
  viewport,
  engine,
}: UseCanvasBackingStoreOptions): CanvasBackingStoreSize {
  const getCanvasPixelSize = useCallback((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    // Fallback for early-mount scenarios where rect may still be 0x0.
    const fallbackW = rect.width || window.innerWidth || 1;
    const fallbackH = rect.height || window.innerHeight || 1;

    return {
      pixelW: Math.max(1, Math.floor(fallbackW * ratio)),
      pixelH: Math.max(1, Math.floor(fallbackH * ratio)),
    };
  }, []);

  const [size, setSize] = useState<CanvasBackingStoreSize>({ pixelW: 1, pixelH: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Keep CSS size in sync. Backing store size is handled via engine.setSize() when available.
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const { pixelW, pixelH } = getCanvasPixelSize(canvas);
    setSize({ pixelW, pixelH });

    if (engine) {
      engine.setSize(pixelW, pixelH);
    } else {
      // Pre-init sizing so CPU canvas has a sensible backing store.
      canvas.width = pixelW;
      canvas.height = pixelH;
    }
  }, [canvasRef, engine, getCanvasPixelSize, viewport.height, viewport.width]);

  return size;
}
