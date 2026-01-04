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
  type IParticle,
} from '@cazala/party';

const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  // Track DPR changes
  const [dpr, setDpr] = useState(window.devicePixelRatio || 1);
  const spawner = useMemo(() => new Spawner(), []);
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
      // For mobile Safari, we need to be extra careful about the height
      // innerHeight is more reliable than screen.height for visible area
      const safeWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
      const safeHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);

      return { width: safeWidth, height: safeHeight };
    };

    const handleResize = () => {
      // Get safe dimensions that account for browser UI
      const safeDimensions = getSafeViewportDimensions();
      setDimensions(safeDimensions);

      // Check if DPR has changed
      const currentDpr = window.devicePixelRatio || 1;
      if (currentDpr !== dpr) {
        setDpr(currentDpr);
      }
    };

    // Handle display changes that might affect DPR
    const handleDisplayChange = () => {
      const currentDpr = window.devicePixelRatio || 1;
      if (currentDpr !== dpr) {
        setDpr(currentDpr);
      }
      // Party engine will handle size changes; we just update DPR state.
    };

    // Initial resize to ensure correct size
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Listen for display changes, zoom level changes, etc.
    const mediaQueryList = window.matchMedia('(resolution: 1dppx)');
    mediaQueryList.addEventListener('change', handleDisplayChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      mediaQueryList.removeEventListener('change', handleDisplayChange);
    };
  }, [dpr]);

  const runDemo = useCallback(
    async (canvas: HTMLCanvasElement, _isMobile: boolean = false) => {
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
        influenceRadius: 46,
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
        chase: 0,
        avoid: 0,
        separation: 10,
        viewRadius: 100,
        viewAngle: 4.71238898038469,
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

      engine.setConstrainIterations(20);
      engine.setCellSize(16);
      engine.setMaxNeighbors(1000);
      engine.setCamera(0, 0);
      engine.setZoom(0.340854657732216);

      // Particles
      const count = 10000;
      const shape = 'circle';
      const spacing = 12;
      const radius = 600;
      const innerRadius = 500;
      const squareSize = 200;
      const cornerRadius = 0;
      const size = 5;
      const mass = 0.25;

      const particles: IParticle[] = spawner.initParticles({
        count,
        shape,
        center: { x: 0, y: 0 },
        spacing,
        radius,
        innerRadius,
        squareSize,
        cornerRadius,
        size,
        mass,
        colors: [],
        velocity: {
          speed: 0,
          direction: 'random',
          angle: 0,
        },
        bounds: { width: canvas.width, height: canvas.height },
      });

      engine.setParticles(particles);
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

      engine.play();

      return { engine, interaction };
    },
    [spawner]
  );

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

      // Safari/WebGPU stability: ensure canvas is mounted, has explicit size attrs, and layout settled.
      if (!canvas.isConnected || !canvas.parentElement) {
        await sleep(100);
        if (!canvasRef.current || !canvasRef.current.isConnected) return;
      }

      // Use live viewport sizing here to avoid coupling initialization to `dimensions`.
      // Resizing after init is handled in a separate effect.
      const safeWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
      const safeHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
      canvas.style.width = `${safeWidth}px`;
      canvas.style.height = `${safeHeight}px`;

      // Critical for Safari WebGPU: width/height attributes must be set BEFORE engine.initialize()
      const { pixelW, pixelH } = getCanvasPixelSize(canvas);
      canvas.width = pixelW;
      canvas.height = pixelH;

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
  }, [getCanvasPixelSize, isMobile, runDemo]);

  // Resize Party engine when viewport/DPR changes
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
  }, [dimensions, dpr, getCanvasPixelSize]);

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

    // Constant center force: every ~frame, snap interaction back to screen center.
    // Pointer events can temporarily move it, but it will return on the next tick.
    const intervalId = window.setInterval(() => {
      const engine = getEngine();
      const interaction = getInteraction();
      if (!engine || !interaction || !interaction.isEnabled()) return;

      // "Center of screen" in world space is the current camera center.
      const { x: cx, y: cy } = engine.getCamera();
      interaction.setMode('repel');
      interaction.setActive(true);
      interaction.setPosition(cx, cy);
      interaction.setStrength(200_000);
      interaction.setRadius(1600);
    }, 16);

    const onPointerDown = (e: PointerEvent) => {
      // Keep canvas focused for keyboard handlers if you add them later
      canvas.focus();

      const engine = getEngine();
      if (!engine) return;
      const rect = canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
      const world = screenToWorld(engine, sx, sy);

      const interaction = getInteraction();
      if (interaction && interaction.isEnabled()) {
        interaction.setPosition(world.x, world.y);
        interaction.setActive(true);
        interaction.setMode('repel');
      }
    };

    const onPointerUp = () => {
      const interaction = getInteraction();
      if (interaction && interaction.isEnabled()) {
        interaction.setActive(false);
      }
    };

    const onPointerLeave = () => {
      const interaction = getInteraction();
      if (interaction && interaction.isEnabled()) {
        interaction.setActive(false);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.clearInterval(intervalId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

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
        overflow: 'hidden', // Ensure no overflow
        // Disable iOS text selection, magnifying glass and callout behavior
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation', // Optimizes for touch input, disables unnecessary browser behaviors
      }}
    />
  );
};

export default Canvas;
