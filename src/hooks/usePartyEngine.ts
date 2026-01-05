import { useEffect, useRef, useState } from 'react';
import type { Engine, Interaction } from '@cazala/party';
import type { RefObject } from 'react';
import { createPartyEngine } from '../lib/party/createPartyEngine';

export type UsePartyEngineOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isMobile: boolean;
  onHueChange?: (value: number) => void;
};

export function usePartyEngine({ canvasRef, isMobile, onHueChange }: UsePartyEngineOptions) {
  const engineRef = useRef<Engine | null>(null);
  const interactionRef = useRef<Interaction | null>(null);

  // Expose engine as state for effects that need to react when it becomes available.
  const [engine, setEngine] = useState<Engine | null>(null);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { engine: createdEngine, interaction } = await createPartyEngine({
        canvas,
        isMobile,
        onHueChange,
      });

      if (cancelled) return;

      engineRef.current = createdEngine;
      interactionRef.current = interaction;
      setEngine(createdEngine);
    };

    void start();

    return () => {
      cancelled = true;
      engineRef.current = null;
      interactionRef.current = null;
      setEngine(null);
    };
  }, [canvasRef, isMobile, onHueChange]);

  return { engine, engineRef, interactionRef };
}
