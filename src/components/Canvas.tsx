import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Behavior,
  Boundary,
  Collisions,
  Engine,
  Environment,
  Fluids,
  Grab,
  Interaction,
  Joints,
  Lines,
  Particles,
  Sensors,
  Spawner,
  Trails,
  type GravityDirection,
  type IParticle,
  type SensorBehavior,
  type VelocityDirection,
} from '@cazala/party';
import { logger } from '../utils/logging';

type PartySession = {
  id: string;
  name: string;
  metadata: {
    particleCount: number;
    createdAt: string;
    lastModified: string;
    hasParticleData: boolean;
  };
  modules: {
    environment: {
      enabled: boolean;
      gravityStrength: number;
      dirX: number;
      dirY: number;
      inertia: number;
      friction: number;
      damping: number;
      mode: GravityDirection;
    };
    boundary: {
      enabled: boolean;
      restitution: number;
      friction: number;
      mode: 'bounce' | 'warp' | 'kill' | 'none';
      repelDistance: number;
      repelStrength: number;
    };
    collisions: {
      enabled: boolean;
      restitution: number;
    };
    fluids: {
      enabled: boolean;
      influenceRadius: number;
      targetDensity: number;
      pressureMultiplier: number;
      viscosity: number;
      nearPressureMultiplier: number;
      nearThreshold: number;
      enableNearPressure: boolean;
      maxAcceleration: number;
    };
    behavior: {
      enabled: boolean;
      wander: number;
      cohesion: number;
      alignment: number;
      repulsion: number;
      chase: number;
      avoid: number;
      separation: number;
      viewRadius: number;
      viewAngle: number;
    };
    sensors: {
      enabled: boolean;
      sensorDistance: number;
      sensorAngle: number;
      sensorRadius: number;
      sensorThreshold: number;
      sensorStrength: number;
      followValue: SensorBehavior;
      fleeValue: SensorBehavior;
      colorSimilarityThreshold: number;
      fleeAngle: number;
    };
    trails: {
      enabled: boolean;
      trailDecay: number;
      trailDiffuse: number;
    };
    interaction: {
      enabled: boolean;
      mode: 'attract' | 'repel';
      strength: number;
      radius: number;
    };
    particles: {
      enabled: boolean;
      colorType: number;
      customColor: { r: number; g: number; b: number; a: number };
      hue: number;
    };
    joints: {
      enabled: boolean;
      enableParticleCollisions: boolean;
      enableJointCollisions: boolean;
      list: Array<{ aIndex: number; bIndex: number; restLength: number }>;
      momentum: number;
      restitution: number;
      separation: number;
      steps: number;
      friction: number;
    };
    lines: {
      enabled: boolean;
      list: Array<{ aIndex: number; bIndex: number }>;
      lineWidth: number;
      lineColor: { r: number; g: number; b: number; a: number } | null;
    };
    grab: {
      enabled: boolean;
      grabbedIndex: number;
      positionX: number;
      positionY: number;
    };
  };
  init: {
    numParticles: number;
    shape: 'grid' | 'random' | 'circle' | 'donut' | 'square';
    spacing: number;
    particleSize: number;
    particleMass: number;
    radius: number;
    innerRadius: number;
    squareSize: number;
    cornerRadius: number;
    colors: string[];
    velocityConfig: {
      speed: number;
      direction: VelocityDirection;
      angle: number;
    };
    gridJoints: boolean;
    hasInitialSpawned: boolean;
    isSpawnLocked: boolean;
  };
  engine: {
    constrainIterations: number;
    gridCellSize: number;
    maxNeighbors: number;
    camera: { x: number; y: number };
    zoom: number;
  };
  render: {
    invertColors: boolean;
  };
  oscillators: Record<string, unknown>;
  oscillatorsElapsedSeconds: number;
};

const FishCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const engineReadyRef = useRef(false);
  const startupTokenRef = useRef(0);
  const interactionRef = useRef<Interaction | null>(null);
  const grabRef = useRef<Grab | null>(null);
  const destroyInFlightRef = useRef<Promise<void> | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  // Track DPR changes
  const [dpr, setDpr] = useState(window.devicePixelRatio || 1);
  const spawner = useMemo(() => new Spawner(), []);
  const isSafari = useMemo(() => {
    // iOS Safari UAs include "Safari" and "Mobile" (and not "CriOS"/"FxiOS").
    // macOS Safari includes "Safari" and not "Chrome".
    const ua = navigator.userAgent;
    const isWebKitSafari =
      /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/CriOS\//.test(ua) && !/FxiOS\//.test(ua);
    return isWebKitSafari;
  }, []);

  const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
  const getCanvasPixelSize = useCallback(
    (canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      return {
        pixelW: Math.max(1, Math.floor((rect.width || dimensions.width) * ratio)),
        pixelH: Math.max(1, Math.floor((rect.height || dimensions.height) * ratio)),
      };
    },
    [dimensions.width, dimensions.height]
  );

  const destroyEngine = async (engine: Engine | null) => {
    if (!engine) return;
    try {
      engineReadyRef.current = false;
      engine.stop();
      // Safari/WebGPU can wedge on destroy; cap wait so we don't deadlock init.
      await Promise.race([engine.destroy(), sleep(400)]);
    } catch (e) {
      logger.warn('Error destroying Party engine', e);
    } finally {
      // Safari workaround: give WebGPU context time to fully release between engines.
      if (isSafari) {
        await sleep(200);
      }
    }
  };

  // Handle window resize and display changes
  useEffect(() => {
    // Function to get safe viewport dimensions
    const getSafeViewportDimensions = () => {
      // For mobile Safari, we need to be extra careful about the height
      // innerHeight is more reliable than screen.height for visible area
      const safeWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
      const safeHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);

      logger.debug(`Safe viewport dimensions: ${safeWidth}x${safeHeight}`);
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
      logger.info('Display properties changed, updating canvas');
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
      try {
        mediaQueryList.removeEventListener('change', handleDisplayChange);
      } catch (e) {
        logger.warn('Could not remove display change listener', e);
      }
    };
  }, [dpr]);

  const applyPartySession = async (
    engine: Engine,
    session: PartySession,
    canvas: HTMLCanvasElement
  ) => {
    const sessionEngine = session.engine;
    const sessionInit = session.init;

    // Engine + view
    if (typeof sessionEngine.constrainIterations === 'number') {
      engine.setConstrainIterations(sessionEngine.constrainIterations);
    }
    if (typeof sessionEngine.gridCellSize === 'number') {
      engine.setCellSize(sessionEngine.gridCellSize);
    }
    if (typeof sessionEngine.maxNeighbors === 'number') {
      engine.setMaxNeighbors(sessionEngine.maxNeighbors);
    }

    const camX = typeof sessionEngine.camera?.x === 'number' ? sessionEngine.camera.x : 0;
    const camY = typeof sessionEngine.camera?.y === 'number' ? sessionEngine.camera.y : 0;
    const zoom = typeof sessionEngine.zoom === 'number' ? sessionEngine.zoom : 1;

    engine.setCamera(camX, camY);
    engine.setZoom(zoom);

    // Particles
    const count =
      typeof sessionInit.numParticles === 'number'
        ? sessionInit.numParticles
        : session.metadata.particleCount;

    const shape = sessionInit.shape;
    const spacing = sessionInit.spacing;
    const radius = sessionInit.radius;
    const innerRadius = sessionInit.innerRadius;
    const squareSize = sessionInit.squareSize;
    const cornerRadius = sessionInit.cornerRadius;
    const size = sessionInit.particleSize;
    const mass = sessionInit.particleMass;
    const colors = sessionInit.colors;

    const velocityConfig = sessionInit.velocityConfig;
    const velocity = {
      speed: velocityConfig.speed,
      direction: velocityConfig.direction,
      angle: velocityConfig.angle,
    };

    const particles: IParticle[] =
      count > 0
        ? spawner.initParticles({
            count,
            shape,
            center: { x: camX, y: camY },
            spacing,
            radius,
            innerRadius,
            squareSize,
            cornerRadius,
            size,
            mass,
            colors,
            velocity,
            bounds: { width: canvas.width, height: canvas.height },
          })
        : [];

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
      const hello = document.querySelector('.text') as HTMLElement | null;
      if (hello) {
        hello.style.color = `hsl(${value * 360}deg, 100%, 50%)`;
      }
    });
    engine.setOscillatorsElapsedSeconds(session.oscillatorsElapsedSeconds);
  };

  const buildPartyEngineFromSession = (
    canvas: HTMLCanvasElement,
    session: PartySession,
    runtime: 'auto' | 'cpu' | 'webgpu'
  ) => {
    const m = session.modules;

    const environmentCfg = m.environment;
    const environmentMode = environmentCfg.mode;
    const gravityDirection =
      typeof environmentMode === 'string' ? (environmentMode as GravityDirection) : undefined;

    const environment = new Environment({
      enabled: !!environmentCfg.enabled,
      gravityStrength: environmentCfg.gravityStrength,
      dirX: environmentCfg.dirX,
      dirY: environmentCfg.dirY,
      inertia: environmentCfg.inertia,
      friction: environmentCfg.friction,
      damping: environmentCfg.damping,
      gravityDirection,
    });

    const boundaryCfg = m.boundary;
    const boundary = new Boundary({
      enabled: !!boundaryCfg.enabled,
      restitution: boundaryCfg.restitution,
      friction: boundaryCfg.friction,
      mode: boundaryCfg.mode,
      repelDistance: boundaryCfg.repelDistance,
      repelStrength: boundaryCfg.repelStrength,
    });

    const collisionsCfg = m.collisions;
    const collisions = new Collisions({
      enabled: !!collisionsCfg.enabled,
      restitution: collisionsCfg.restitution,
    });

    const fluidsCfg = m.fluids;
    const fluids = new Fluids({
      enabled: !!fluidsCfg.enabled,
      influenceRadius: fluidsCfg.influenceRadius,
      targetDensity: fluidsCfg.targetDensity,
      pressureMultiplier: fluidsCfg.pressureMultiplier,
      viscosity: fluidsCfg.viscosity,
      nearPressureMultiplier: fluidsCfg.nearPressureMultiplier,
      nearThreshold: fluidsCfg.nearThreshold,
      enableNearPressure: fluidsCfg.enableNearPressure,
      maxAcceleration: fluidsCfg.maxAcceleration,
    });

    const behaviorCfg = m.behavior;
    const behavior = new Behavior({
      enabled: !!behaviorCfg.enabled,
      wander: behaviorCfg.wander,
      cohesion: behaviorCfg.cohesion,
      alignment: behaviorCfg.alignment,
      repulsion: behaviorCfg.repulsion,
      chase: behaviorCfg.chase,
      avoid: behaviorCfg.avoid,
      separation: behaviorCfg.separation,
      viewRadius: behaviorCfg.viewRadius,
      viewAngle: behaviorCfg.viewAngle,
    });

    const sensorsCfg = m.sensors;
    const sensors = new Sensors({
      enabled: !!sensorsCfg.enabled,
      sensorDistance: sensorsCfg.sensorDistance,
      sensorAngle: sensorsCfg.sensorAngle,
      sensorRadius: sensorsCfg.sensorRadius,
      sensorThreshold: sensorsCfg.sensorThreshold,
      sensorStrength: sensorsCfg.sensorStrength,
      colorSimilarityThreshold: sensorsCfg.colorSimilarityThreshold,
      followBehavior: sensorsCfg.followValue,
      fleeBehavior: sensorsCfg.fleeValue,
      fleeAngle: sensorsCfg.fleeAngle,
    });

    const interactionCfg = m.interaction;
    const interaction = new Interaction({
      enabled: !!interactionCfg.enabled,
      mode: interactionCfg.mode,
      strength: interactionCfg.strength,
      radius: interactionCfg.radius,
      active: false,
      action: 'click',
      position: { x: 0, y: 0 },
    });

    const jointsCfg = m.joints;
    const joints = new Joints({
      enabled: !!jointsCfg.enabled,
      joints: jointsCfg.list,
      enableParticleCollisions: jointsCfg.enableParticleCollisions,
      enableJointCollisions: jointsCfg.enableJointCollisions,
      momentum: jointsCfg.momentum,
      restitution: jointsCfg.restitution,
      separation: jointsCfg.separation,
      steps: jointsCfg.steps,
      friction: jointsCfg.friction,
    });

    const grabCfg = m.grab;
    const grab = new Grab({
      enabled: !!grabCfg.enabled,
      grabbedIndex: grabCfg.grabbedIndex,
      positionX: grabCfg.positionX,
      positionY: grabCfg.positionY,
    });

    const trailsCfg = m.trails;
    const trails = new Trails({
      enabled: !!trailsCfg.enabled,
      trailDecay: trailsCfg.trailDecay,
      trailDiffuse: trailsCfg.trailDiffuse,
    });

    const particlesCfg = m.particles;
    const particlesModule = new Particles({
      enabled: !!particlesCfg.enabled,
      colorType: particlesCfg.colorType,
      customColor: particlesCfg.customColor,
      hue: particlesCfg.hue,
    });

    const linesCfg = m.lines;
    const lines = new Lines({
      enabled: !!linesCfg.enabled,
      lines: linesCfg.list,
      lineWidth: linesCfg.lineWidth,
    });
    lines.setLineColor(linesCfg.lineColor);

    interactionRef.current = interaction;
    grabRef.current = grab;

    return new Engine({
      canvas,
      runtime,
      forces: [
        environment,
        boundary,
        collisions,
        fluids,
        behavior,
        sensors,
        interaction,
        joints,
        grab,
      ],
      render: [trails, lines, particlesModule],
      maxParticles: session.init.numParticles,
    });
  };

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
    let cancelled = false;
    const myToken = ++startupTokenRef.current;
    const isStale = () => cancelled || startupTokenRef.current !== myToken;

    const start = async () => {
      if (!canvasRef.current) {
        logger.error('Canvas element not found');
        return;
      }

      const canvas = canvasRef.current;
      logger.info('Canvas element found, initializing Party engine');
      engineReadyRef.current = false;

      // Safari/WebGPU stability: ensure canvas is mounted, has explicit size attrs, and layout settled.
      if (!canvas.isConnected || !canvas.parentElement) {
        await sleep(100);
        if (!canvasRef.current || !canvasRef.current.isConnected) return;
      }

      canvas.style.width = `${dimensions.width}px`;
      canvas.style.height = `${dimensions.height}px`;

      // Critical for Safari WebGPU: width/height attributes must be set BEFORE engine.initialize()
      const { pixelW, pixelH } = getCanvasPixelSize(canvas);
      canvas.width = pixelW;
      canvas.height = pixelH;

      // Load the session JSON from src on page load
      const sessionUrl = new URL('../demo6.json', import.meta.url);
      const session = (await fetch(sessionUrl).then(r => r.json())) as PartySession;

      // Serialize teardown/setup (React StrictMode dev mounts can overlap)
      if (destroyInFlightRef.current) {
        await destroyInFlightRef.current;
        destroyInFlightRef.current = null;
      }
      if (engineRef.current) {
        destroyInFlightRef.current = destroyEngine(engineRef.current);
        await destroyInFlightRef.current;
        destroyInFlightRef.current = null;
        engineRef.current = null;
      }

      const preferredRuntime: 'webgpu' | 'auto' = isSafari ? 'webgpu' : 'auto';

      const tryStartWithRuntime = async (runtime: 'webgpu' | 'auto' | 'cpu') => {
        const engine = buildPartyEngineFromSession(canvas, session, runtime);
        engineRef.current = engine;
        engineReadyRef.current = false;

        // Mandatory: yield frames so Safari has a settled layout and WebGPU has a configured canvas.
        if (isStale()) {
          destroyInFlightRef.current = destroyEngine(engine);
          await destroyInFlightRef.current;
          destroyInFlightRef.current = null;
          return;
        }

        await engine.initialize();
        engineReadyRef.current = true;

        // Size in device pixels. Let the engine own backing store updates (important for WebGPU).
        if (isStale()) return;
        const { pixelW, pixelH } = getCanvasPixelSize(canvas);
        engine.setSize(pixelW, pixelH);

        // Safari can report tiny sizes initially; wait a few frames before big spawns.
        let attempts = 0;
        while (attempts < 10) {
          const s = engine.getSize();
          if (s.width >= 4 && s.height >= 4) break;
          attempts++;
        }

        await applyPartySession(engine, session, canvas);

        if (!cancelled) {
          engine.play();
          logger.info(
            `Party engine initialized (${engine.getActualRuntime()}) and demo6 session loaded`
          );
        } else {
          // If we were cancelled mid-init, immediately tear down to avoid racing render loops.
          destroyInFlightRef.current = destroyEngine(engine);
          await destroyInFlightRef.current;
          destroyInFlightRef.current = null;
        }
      };

      try {
        await tryStartWithRuntime(preferredRuntime);
      } catch (error) {
        logger.error(`Error initializing Party engine with runtime=${preferredRuntime}:`, error);

        // Fallback for Safari/WebGPU instability: if WebGPU fails, restart on CPU so the page stays alive.
        if (!cancelled && preferredRuntime === 'webgpu') {
          if (engineRef.current) {
            destroyInFlightRef.current = destroyEngine(engineRef.current);
            await destroyInFlightRef.current;
            destroyInFlightRef.current = null;
            engineRef.current = null;
          }
          try {
            await tryStartWithRuntime('cpu');
          } catch (cpuError) {
            logger.error('Error initializing Party engine with CPU fallback:', cpuError);
          }
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (engineRef.current) {
        logger.info('Destroying Party engine on component unmount');
        const engine = engineRef.current;
        engineRef.current = null;
        engineReadyRef.current = false;
        interactionRef.current = null;
        grabRef.current = null;
        destroyInFlightRef.current = destroyEngine(engine);
      }
    };
    // Only run once on mount. Resize is handled by a separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize Party engine when viewport/DPR changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas) return;

    // Keep CSS size in sync. Backing store size is handled via engine.setSize() when available.
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const { pixelW, pixelH } = getCanvasPixelSize(canvas);

    if (engine && engineReadyRef.current) {
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
    logger.info('Setting up keyboard focus handling');

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
      if (!engine || !interaction || !interaction.isEnabled() || !engineReadyRef.current) return;

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
      if (!engine || !engineReadyRef.current) return;
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

export default FishCanvas;
