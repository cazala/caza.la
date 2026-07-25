import { useCallback, useEffect, useRef, useState } from 'react';
import type { Engine, Interaction } from '@cazala/party';
import type { RefObject } from 'react';
import { createPartyEngine } from '../lib/party/createPartyEngine';

export type UsePartyEngineOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isMobile: boolean;
  enabled?: boolean;
  onHueChange?: (value: number) => void;
};

export function usePartyEngine({
  canvasRef,
  isMobile,
  enabled = true,
  onHueChange,
}: UsePartyEngineOptions) {
  const engineRef = useRef<Engine | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const transitionRef = useRef<((durationMs?: number) => Promise<void>) | null>(null);
  const disposeRef = useRef<(() => Promise<void>) | null>(null);

  // Expose engine as state for effects that need to react when it becomes available.
  const [engine, setEngine] = useState<Engine | null>(null);
  const [isGpu, setIsGpu] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!enabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const {
        engine: createdEngine,
        interaction,
        isGpu: createdIsGpu,
        startWorkTransition,
        dispose,
      } = await createPartyEngine({
        canvas,
        isMobile,
        onHueChange,
      });

      if (cancelled) {
        void dispose();
        return;
      }

      engineRef.current = createdEngine;
      interactionRef.current = interaction;
      transitionRef.current = startWorkTransition;
      disposeRef.current = dispose;
      setEngine(createdEngine);
      setIsGpu(createdIsGpu);
    };

    void start();

    return () => {
      cancelled = true;
      const dispose = disposeRef.current;
      if (dispose) {
        void dispose();
      }
      engineRef.current = null;
      interactionRef.current = null;
      transitionRef.current = null;
      disposeRef.current = null;
      setEngine(null);
      setIsGpu(null);
    };
  }, [canvasRef, enabled, isMobile, onHueChange]);

  const startWorkTransition = useCallback(
    (durationMs = 600) => transitionRef.current?.(durationMs) ?? Promise.resolve(),
    []
  );

  return { engine, engineRef, interactionRef, isGpu, startWorkTransition };
}
