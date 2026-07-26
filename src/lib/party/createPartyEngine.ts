import {
  Behavior,
  Boundary,
  Collisions,
  Engine,
  Environment,
  Fluids,
  FluidsMethod,
  Interaction,
  Particles,
  Sensors,
  Spawner,
  Trails,
} from '@cazala/party';

export type CreatePartyEngineOptions = {
  canvas: HTMLCanvasElement;
  isMobile?: boolean;
  onHueChange?: (value: number) => void;
};

export async function createPartyEngine(options: CreatePartyEngineOptions) {
  const { canvas, isMobile = false, onHueChange } = options;
  let toggleIntervalId: number | null = null;
  let transitionFrameId: number | null = null;

  // Demo tuning is intentionally inline so it's easy to tweak without jumping files.
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
    repelDistance: 100,
    repelStrength: 1000,
  });

  const collisions = new Collisions({
    enabled: true,
    restitution: 0.8,
  });

  const fluids = new Fluids({
    enabled: true,
    method: FluidsMethod.Picflip,
    influenceRadius: 100,
    targetDensity: 2,
    pressureMultiplier: 80,
  });

  const behavior = new Behavior({
    enabled: true,
    wander: 0,
    cohesion: 1.5,
    alignment: isMobile ? 0.3 : 0.5,
    repulsion: 2,
    separation: 10,
    viewRadius: isMobile ? 50 : 30,
    viewAngle: 3.14,
  });

  const interaction = new Interaction({
    enabled: true,
    mode: 'attract',
    strength: 10_000,
    radius: 700,
  });

  const particles = new Particles({
    enabled: true,
    colorType: 2,
    hue: 1,
  });

  const sensors = new Sensors({
    enabled: false,
    sensorRadius: 3,
    sensorDistance: 20,
    sensorStrength: 3000,
    sensorAngle: Math.PI / 6,
    sensorThreshold: 0.005,
  });

  const trails = new Trails({
    enabled: false,
    trailDecay: 10,
    trailDiffuse: 0,
  });

  const engine = new Engine({
    canvas,
    runtime: 'auto',
    forces: [environment, boundary, collisions, fluids, behavior, interaction, sensors],
    render: [trails, particles],
  });

  await engine.initialize();

  const isGpu = engine.getActualRuntime() === 'webgpu';

  engine.setConstrainIterations(isGpu ? 20 : 5);
  engine.setCellSize(16);
  engine.setMaxNeighbors(500);
  engine.setCamera(0, 0);
  engine.setZoom(0.3);

  const spawner = new Spawner();

  if (isGpu) {
    engine.setParticles(
      spawner.initParticles({
        count: isMobile ? 15_000 : 45_000,
        shape: 'circle',
        center: { x: 0, y: 0 },
        radius: isMobile ? 1200 : 2000,
        mass: 0.25,
        size: 5,
      })
    );
  } else {
    engine.setParticles(
      spawner.initParticles({
        count: 506,
        shape: 'grid',
        spacing: 70,
        center: { x: 0, y: 1500 },
        mass: 0.5,
        size: 35,
      })
    );
  }

  engine.addOscillator({
    moduleName: particles.name,
    inputName: 'hue',
    min: 0,
    max: 1,
    speedHz: 0.01,
  });

  if (onHueChange) {
    engine.addOscillatorListener(particles.name, 'hue', onHueChange);
  }

  if (!isGpu) {
    fluids.setEnabled(false);
    behavior.setEnabled(false);
    environment.setEnabled(true);
  } else {
    // WebGPU: start in the default config, then toggle to the alternate config every 30s.
    const applyDefaultConfig = () => {
      sensors.setEnabled(false);
      trails.setEnabled(false);
      behavior.setEnabled(true);
      fluids.setEnabled(true);
      collisions.setEnabled(true);
    };

    const applyAlternateConfig = () => {
      sensors.setEnabled(true);
      trails.setEnabled(true);
      behavior.setEnabled(false);
      fluids.setEnabled(false);
      collisions.setEnabled(false);
    };

    applyDefaultConfig();

    let useAlternate = false;
    toggleIntervalId = window.setInterval(() => {
      useAlternate = !useAlternate;
      if (useAlternate) applyAlternateConfig();
      else applyDefaultConfig();
    }, 60_000);
  }

  engine.play();

  // CPU demo interaction should be "hold to attract" (inactive by default).
  if (!isGpu) {
    interaction.setMode('attract');
    interaction.setActive(false);
  }

  const applyWorkTransitionScene = () => {
    environment.setEnabled(true);
    environment.setGravityStrength(0);
    environment.setGravityDirection('down');
    environment.setInertia(0);
    environment.setFriction(0);
    environment.setDamping(0);

    boundary.setEnabled(true);
    boundary.setMode('warp');
    boundary.setRestitution(0.9);
    boundary.setFriction(0.1);
    boundary.setRepelDistance(0);
    boundary.setRepelStrength(0);

    collisions.setEnabled(false);

    fluids.setEnabled(true);
    fluids.setMethod(FluidsMethod.Sph);
    fluids.setInfluenceRadius(27);
    fluids.setTargetDensity(5);
    fluids.setPressureMultiplier(20);
    fluids.setViscosity(1);
    fluids.setNearPressureMultiplier(50);
    fluids.setNearThreshold(20);
    fluids.setEnableNearPressure(true);
    fluids.setMaxAcceleration(68);

    behavior.setEnabled(true);
    behavior.setWander(20);
    behavior.setCohesion(1.5);
    behavior.setAlignment(6.9);
    behavior.setRepulsion(5.5);
    behavior.setChase(0);
    behavior.setAvoid(0);
    behavior.setSeparation(11);
    behavior.setViewRadius(100);
    behavior.setViewAngle(Math.PI * 2);

    sensors.setEnabled(true);
    sensors.setSensorDistance(30);
    sensors.setSensorAngle(0.5061454830783556);
    sensors.setSensorRadius(5);
    sensors.setSensorThreshold(0.12);
    sensors.setSensorStrength(3000);
    sensors.setFollowBehavior('any');
    sensors.setFleeBehavior('none');
    sensors.setColorSimilarityThreshold(0.4);
    sensors.setFleeAngle(Math.PI / 2);

    trails.setEnabled(true);
    trails.setTrailDecay(10);
    trails.setTrailDiffuse(0);

    engine.setConstrainIterations(1);
    engine.setCellSize(40);
    engine.setMaxNeighbors(109);
  };

  const startWorkTransition = (durationMs = 600) =>
    new Promise<void>(resolve => {
      if (toggleIntervalId !== null) {
        window.clearInterval(toggleIntervalId);
        toggleIntervalId = null;
      }
      if (transitionFrameId !== null) {
        window.cancelAnimationFrame(transitionFrameId);
      }

      applyWorkTransitionScene();

      const camera = engine.getCamera();
      const size = engine.getSize();
      const zoom = Math.max(engine.getZoom(), 0.001);
      const startRadius = interaction.getRadius();
      const cornerRadius = Math.hypot(size.width, size.height) / (2 * zoom);
      const endRadius = Math.max(startRadius * 1.5, cornerRadius * 1.45);
      const startStrength = Math.max(interaction.getStrength(), 200_000);
      const endStrength = startStrength * 1.8;
      const startedAt = performance.now();

      interaction.setMode('repel');
      interaction.setPosition(camera.x, camera.y);
      interaction.setStrength(startStrength);
      interaction.setActive(true);

      const animate = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / durationMs);
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        interaction.setPosition(camera.x, camera.y);
        interaction.setRadius(startRadius + (endRadius - startRadius) * eased);
        interaction.setStrength(startStrength + (endStrength - startStrength) * eased);

        if (progress < 1) {
          transitionFrameId = window.requestAnimationFrame(animate);
          return;
        }

        transitionFrameId = null;
        resolve();
      };

      transitionFrameId = window.requestAnimationFrame(animate);
    });

  const dispose = async () => {
    if (toggleIntervalId !== null) {
      window.clearInterval(toggleIntervalId);
      toggleIntervalId = null;
    }
    if (transitionFrameId !== null) {
      window.cancelAnimationFrame(transitionFrameId);
      transitionFrameId = null;
    }
    try {
      engine.stop();
    } catch {
      // The engine may already be stopped during a route change.
    }
    await engine.destroy();
  };

  return { engine, interaction, isGpu, startWorkTransition, dispose };
}
