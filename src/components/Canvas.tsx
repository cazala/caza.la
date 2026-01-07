import { useRef } from 'react';
import { useAutoFocusCanvas } from '../hooks/useAutoFocusCanvas';
import { useCanvasBackingStore } from '../hooks/useCanvasBackingStore';
import { useHueTextColor } from '../hooks/useHueTextColor';
import { useIsMobile } from '../hooks/useIsMobile';
import { usePartyEngine } from '../hooks/usePartyEngine';
import { usePointerInteraction } from '../hooks/usePointerInteraction';
import { usePreventTouchScroll } from '../hooks/usePreventTouchScroll';
import { useViewportSize } from '../hooks/useViewportSize';
import WebGPUFallbackBanner from './WebGPUFallbackBanner';

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isMobile = useIsMobile();
  const viewport = useViewportSize();
  const onHueChange = useHueTextColor('.text');

  const { engine, engineRef, interactionRef, isGpu } = usePartyEngine({
    canvasRef,
    isMobile,
    enabled: viewport.ready,
    onHueChange,
  });

  useCanvasBackingStore({ canvasRef, viewport, engine });
  useAutoFocusCanvas(canvasRef);
  usePointerInteraction({ canvasRef, engineRef, interactionRef, isMobile });
  usePreventTouchScroll();

  return (
    <>
      {isGpu === false ? <WebGPUFallbackBanner /> : null}
      <canvas
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
          pointerEvents: 'auto',
          touchAction: 'none', // Critical for consistent pointer events on iOS Safari
          overflow: 'hidden', // Ensure no overflow
        }}
      />
    </>
  );
};

export default Canvas;
