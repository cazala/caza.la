import { useEffect, useRef } from 'react';
import { useAutoFocusCanvas } from '../hooks/useAutoFocusCanvas';
import { useCanvasBackingStore } from '../hooks/useCanvasBackingStore';
import { useHueTextColor } from '../hooks/useHueTextColor';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePartyEngine } from '../hooks/usePartyEngine';
import { usePointerInteraction } from '../hooks/usePointerInteraction';
import { usePreventTouchScroll } from '../hooks/usePreventTouchScroll';
import { useViewportSize } from '../hooks/useViewportSize';
import WebGPUFallbackBanner from './WebGPUFallbackBanner';

type CanvasProps = {
  transitionRequested?: boolean;
  onTransitionComplete?: () => void;
};

const Canvas = ({ transitionRequested = false, onTransitionComplete }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transitionStartedRef = useRef(false);

  const isMobile = useIsMobile();
  const viewport = useViewportSize();
  const onHueChange = useHueTextColor('.home-panel');

  const { engine, engineRef, interactionRef, isGpu, startWorkTransition } = usePartyEngine({
    canvasRef,
    isMobile,
    enabled: viewport.ready,
    onHueChange,
  });

  useCanvasBackingStore({ canvasRef, viewport, engine });
  useAutoFocusCanvas(canvasRef);
  usePointerInteraction({
    canvasRef,
    engineRef,
    interactionRef,
    isMobile,
    enabled: !transitionRequested,
  });
  usePreventTouchScroll();

  useEffect(() => {
    if (!transitionRequested) {
      transitionStartedRef.current = false;
      return;
    }
    if (!engine || transitionStartedRef.current) return;

    transitionStartedRef.current = true;
    let active = true;
    void startWorkTransition(600).then(() => {
      if (active) onTransitionComplete?.();
    });

    return () => {
      active = false;
    };
  }, [engine, onTransitionComplete, startWorkTransition, transitionRequested]);

  return (
    <>
      {isGpu === false ? <WebGPUFallbackBanner /> : null}
      <canvas
        aria-hidden="true"
        className="party-canvas"
        ref={canvasRef}
        tabIndex={0} // Make canvas focusable
        style={{
          position: 'fixed', // Changed from absolute to fixed to avoid scroll issues
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh', // Using vh instead of % to match viewport exactly
          maxHeight: '100vh', // Ensure it never exceeds viewport height
          zIndex: 0,
          display: 'block',
          outline: 'none',
          background: 'transparent',
          pointerEvents: transitionRequested ? 'none' : 'auto',
          touchAction: 'none', // Critical for consistent pointer events on iOS Safari
          overflow: 'hidden', // Ensure no overflow
        }}
      />
    </>
  );
};

export default Canvas;
