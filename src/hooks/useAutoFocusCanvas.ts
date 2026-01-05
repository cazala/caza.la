import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useAutoFocusCanvas(canvasRef: RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const ensureFocus = () => {
      canvasRef.current?.focus();
    };

    // Set initial focus
    ensureFocus();

    // Ensure focus when clicking anywhere (matches previous behavior)
    const handleClick = () => ensureFocus();
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [canvasRef]);
}
