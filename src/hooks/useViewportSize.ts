import { useEffect, useState } from 'react';

export type ViewportSize = { width: number; height: number; ready: boolean };

export function useViewportSize(): ViewportSize {
  const [dimensions, setDimensions] = useState<ViewportSize>({
    width: window.innerWidth,
    height: window.innerHeight,
    ready: false,
  });

  useEffect(() => {
    const getSafeViewportDimensions = (): ViewportSize => {
      // For mobile Safari (and some first-paint timing scenarios), `documentElement.clientWidth/Height`
      // can momentarily be 0, which would incorrectly shrink the canvas backing store and cause a
      // stretched/pixelated render until the next real resize event.
      const innerW = window.innerWidth || 1;
      const innerH = window.innerHeight || 1;
      const clientW = document.documentElement.clientWidth || 0;
      const clientH = document.documentElement.clientHeight || 0;

      const safeWidth = clientW > 0 ? Math.min(innerW, clientW) : innerW;
      const safeHeight = clientH > 0 ? Math.min(innerH, clientH) : innerH;

      return { width: safeWidth, height: safeHeight, ready: true };
    };

    const handleResize = () => {
      setDimensions(getSafeViewportDimensions());
    };

    // Initial resize to ensure correct size
    handleResize();

    // Some deployments/browsers report incomplete layout metrics on the first tick.
    // Re-check on the next couple animation frames so the first paint isn't stretched.
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      handleResize();
      raf2 = window.requestAnimationFrame(() => {
        handleResize();
        // Mark as ready after the post-first-paint resize has happened.
        setDimensions(prev => ({ ...prev, ready: true }));
      });
    });

    // Also re-check once after the full window load event (covers late CSS/font/layout).
    const onLoad = () => handleResize();
    window.addEventListener('load', onLoad, { once: true });

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('load', onLoad);
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return dimensions;
}
