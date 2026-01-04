import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Behavior,
  Boundary,
  Collisions,
  Engine,
  Environment,
  Fluids,
  Interaction,
  Particles,
  Spawner,
} from '@cazala/party';

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const isMobile = useMemo(() => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

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

  // Handle window resize and display changes
  useEffect(() => {
    // Function to get safe viewport dimensions
    const getSafeViewportDimensions = () => {
      // For mobile Safari (and some first-paint timing scenarios), `documentElement.clientWidth/Height`
      // can momentarily be 0, which would incorrectly shrink the canvas backing store and cause a
      // stretched/pixelated render until the next real resize event.
      const innerW = window.innerWidth || 1;
      const innerH = window.innerHeight || 1;
      const clientW = document.documentElement.clientWidth || 0;
      const clientH = document.documentElement.clientHeight || 0;

      const safeWidth = clientW > 0 ? Math.min(innerW, clientW) : innerW;
      const safeHeight = clientH > 0 ? Math.min(innerH, clientH) : innerH;

      return { width: safeWidth, height: safeHeight };
    };

    const handleResize = () => {
      // Get safe dimensions that account for browser UI
      const safeDimensions = getSafeViewportDimensions();
      setDimensions(safeDimensions);
    };

    // Initial resize to ensure correct size
    handleResize();
    // Some deployments/browsers report incomplete layout metrics on the first tick.
    // Re-check on the next couple animation frames so the first paint isn't stretched.
    const raf1 = window.requestAnimationFrame(() => {
      handleResize();
      const raf2 = window.requestAnimationFrame(handleResize);
      return raf2;
    });
    // Also re-check once after the full window load event (covers late CSS/font/layout).
    const onLoad = () => handleResize();
    window.addEventListener('load', onLoad, { once: true });

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('load', onLoad);
      window.cancelAnimationFrame(raf1);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const runDemo = useCallback(async (canvas: HTMLCanvasElement, isMobile: boolean = false) => {
    const environment = new Environment({
      enabled: false,
      gravityStrength: 3000,
      gravityDirection: 'down',
    });

    const boundary = new Boundary({
      enabled: true,
      restitution: 0.9,
      friction: 0.1,
      mode: 'bounce',
    });

    const collisions = new Collisions({
      enabled: true,
      restitution: 0.8,
    });

    const fluids = new Fluids({
      enabled: true,
      influenceRadius: 50,
      targetDensity: 10,
      pressureMultiplier: 100,
      viscosity: 4,
      nearPressureMultiplier: 39,
      nearThreshold: 20,
      enableNearPressure: true,
      maxAcceleration: 38,
    });

    const behavior = new Behavior({
      enabled: true,
      wander: 20,
      cohesion: 1.5,
      alignment: 1.5,
      repulsion: 2,
      separation: 10,
      viewRadius: 100,
      viewAngle: 3.14,
    });

    const interaction = new Interaction({
      enabled: true,
      mode: 'attract',
      strength: 10000,
      radius: 700,
    });

    const particle = new Particles({
      enabled: true,
      colorType: 2,
      hue: 1,
    });

    const engine = new Engine({
      canvas,
      runtime: 'auto',
      forces: [environment, boundary, collisions, fluids, behavior, interaction],
      render: [particle],
    });

    await engine.initialize();

    const isGpu = engine.getActualRuntime() === 'webgpu';

    engine.setConstrainIterations(isGpu ? 20 : 5);
    engine.setCellSize(16);
    engine.setMaxNeighbors(1000);
    engine.setCamera(0, 0);
    engine.setZoom(0.35);

    const spawner = new Spawner();

    if (isGpu) {
      engine.setParticles(
        spawner.initParticles({
          count: isMobile ? 10000 : 25000,
          shape: 'circle',
          center: { x: 0, y: 0 },
          radius: 600,
          mass: 0.25,
          size: 5,
        })
      );
    } else {
      engine.setParticles(
        spawner.initParticles({
          count: 500,
          shape: 'grid',
          spacing: 110,
          center: { x: 0, y: 0 },
          mass: 0.5,
          size: 50,
        })
      );
    }

    engine.addOscillator({
      moduleName: 'particles',
      inputName: 'hue',
      min: 0,
      max: 1,
      speedHz: 0.01,
    });
    engine.addOscillatorListener('particles', 'hue', (value: number) => {
      // Set the hue for the text color
      const text = document.querySelector('.text') as HTMLElement | null;
      if (text) {
        text.style.color = `hsl(${value * 360}deg, 100%, 50%)`;
      }
    });

    if (!isGpu) {
      fluids.setEnabled(false);
      behavior.setEnabled(false);
      environment.setEnabled(true);
    }

    engine.play();

    // CPU demo interaction should be "hold to attract" (inactive by default).
    if (!isGpu) {
      interaction.setMode('attract');
      interaction.setActive(false);
    }

    return { engine, interaction };
  }, []);

  const screenToWorld = (engine: Engine, screenX: number, screenY: number) => {
    const { width, height } = engine.getSize();
    const { x: cx, y: cy } = engine.getCamera();
    const zoom = engine.getZoom() || 1;
    return {
      x: cx + (screenX - width / 2) / zoom,
      y: cy + (screenY - height / 2) / zoom,
    };
  };

  // Initialize Party engine and load demo6 session on mount
  useEffect(() => {
    const start = async () => {
      if (!canvasRef.current) {
        return;
      }

      const canvas = canvasRef.current;

      const { engine, interaction } = await runDemo(canvas, isMobile);
      engineRef.current = engine;
      interactionRef.current = interaction;
    };

    void start();

    return () => {
      if (engineRef.current) {
        engineRef.current = null;
        interactionRef.current = null;
      }
    };
    // Only run once on mount. Resize is handled by a separate effect.
  }, [isMobile, runDemo]);

  // Resize Party engine when viewport changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas) return;

    // Keep CSS size in sync. Backing store size is handled via engine.setSize() when available.
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const { pixelW, pixelH } = getCanvasPixelSize(canvas);

    if (engine) {
      engine.setSize(pixelW, pixelH);
    } else {
      // Pre-init sizing so CPU canvas has a sensible backing store.
      canvas.width = pixelW;
      canvas.height = pixelH;
    }
  }, [dimensions, getCanvasPixelSize]);

  // Add keyboard focus handling
  useEffect(() => {
    // Function to ensure the canvas has focus
    const ensureFocus = () => {
      if (canvasRef.current) {
        canvasRef.current.focus();
      }
    };

    // Set initial focus
    ensureFocus();

    // Add click handler to ensure focus when clicking on the canvas
    const handleClick = () => {
      ensureFocus();
    };

    // Add event listeners
    document.addEventListener('click', handleClick);

    // Log to verify this effect is running

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Pointer interaction wiring (Interaction + optional Grab)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getEngine = () => engineRef.current;
    const getInteraction = () => interactionRef.current;

    // Track recent user interaction so the GPU "center force" interval doesn't instantly overwrite
    // the click position (Safari timing differences made this feel flaky).
    const lastUserPointerAtRef = { current: 0 };
    const cpuPointerDownRef = { current: false };

    const getWorldFromPointerEvent = (engine: Engine, e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const rectW = rect.width || 1;
      const rectH = rect.height || 1;
      const sx = (e.clientX - rect.left) * (canvas.width / rectW);
      const sy = (e.clientY - rect.top) * (canvas.height / rectH);
      return screenToWorld(engine, sx, sy);
    };

    // Constant center force: every ~frame, snap interaction back to screen center.
    // Pointer events can temporarily move it, but it will return on the next tick.
    const intervalId = window.setInterval(() => {
      const engine = getEngine();
      const interaction = getInteraction();
      const isGpu = engine?.getActualRuntime() === 'webgpu';
      if (!engine || !interaction || !interaction.isEnabled() || !isGpu) return;

      // Give user clicks a brief window to be visible before snapping back to center.
      if (performance.now() - lastUserPointerAtRef.current < 90) return;

      // "Center of screen" in world space is the current camera center.
      const { x: cx, y: cy } = engine.getCamera();
      interaction.setMode('repel');
      interaction.setActive(true);
      interaction.setPosition(cx, cy);
      interaction.setStrength(200_000);
      interaction.setRadius(isMobile ? 1500 : 1600);
    }, 16);

    const onPointerDown = (e: PointerEvent) => {
      // Keep canvas focused for keyboard handlers if you add them later
      canvas.focus();
      // Avoid iOS Safari gesture/scroll interference.
      e.preventDefault();

      // Pointer capture makes Safari much more consistent across rapid taps/drags.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Some Safari edge cases can throw if capture isn't possible; safe to ignore.
      }

      const engine = getEngine();
      if (!engine) return;
      const isGpu = engine.getActualRuntime() === 'webgpu';
      const world = getWorldFromPointerEvent(engine, e);

      const interaction = getInteraction();
      if (interaction && interaction.isEnabled()) {
        interaction.setPosition(world.x, world.y);
        interaction.setActive(true);
        if (isGpu) {
          lastUserPointerAtRef.current = performance.now();
          interaction.setMode('repel');
          interaction.setStrength(100_000);
          interaction.setRadius(800);
        } else {
          // CPU demo: press/hold attracts, and dragging updates the position.
          cpuPointerDownRef.current = true;
          interaction.setMode('attract');
          interaction.setStrength(30_000);
          interaction.setRadius(1500);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const engine = getEngine();
      const interaction = getInteraction();
      if (!engine || !interaction || !interaction.isEnabled()) return;

      // Only CPU mode uses hold+drag.
      const isGpu = engine.getActualRuntime() === 'webgpu';
      if (isGpu || !cpuPointerDownRef.current) return;

      e.preventDefault();
      const world = getWorldFromPointerEvent(engine, e);
      interaction.setPosition(world.x, world.y);
      interaction.setActive(true);
      interaction.setMode('attract');
    };

    const onPointerUp = () => {
      const interaction = getInteraction();
      if (interaction && interaction.isEnabled()) {
        cpuPointerDownRef.current = false;
        // For CPU demo we want "hold = active". GPU demo is continuously driven by the interval anyway.
        const engine = getEngine();
        const isGpu = engine?.getActualRuntime() === 'webgpu';
        if (!isGpu) {
          interaction.setActive(false);
        }
      }
    };

    const onPointerLeave = () => {
      const interaction = getInteraction();
      if (interaction && interaction.isEnabled()) {
        cpuPointerDownRef.current = false;
        const engine = getEngine();
        const isGpu = engine?.getActualRuntime() === 'webgpu';
        if (!isGpu) {
          interaction.setActive(false);
        }
      }
    };

    const onPointerCancel = () => {
      cpuPointerDownRef.current = false;
      const engine = getEngine();
      const isGpu = engine?.getActualRuntime() === 'webgpu';
      const interaction = getInteraction();
      if (!isGpu && interaction && interaction.isEnabled()) {
        interaction.setActive(false);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.clearInterval(intervalId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [isMobile]);

  // Prevent scrolling on iOS
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    // Add event listeners to prevent scrolling
    document.body.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.body.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  return (
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
  );
};

export default Canvas;
