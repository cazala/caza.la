import {
  Behavior,
  Boundary,
  Collisions,
  Engine,
  Environment,
  Fluids,
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

let toggleIntervalId: number | null = null;

export async function createPartyEngine(options: CreatePartyEngineOptions) {
  const { canvas, isMobile = false, onHueChange } = options;

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
    influenceRadius: 50,
    targetDensity: 10,
    pressureMultiplier: 100,
    viscosity: isMobile ? 5 : 8,
    nearPressureMultiplier: isMobile ? 35 : 50,
    nearThreshold: 40,
    enableNearPressure: true,
    maxAcceleration: 38,
  });

  const behavior = new Behavior({
    enabled: true,
    wander: 0,
    cohesion: 1.5,
    alignment: isMobile ? 0.5 : 1,
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
    if (toggleIntervalId) {
      window.clearInterval(toggleIntervalId);
    }
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

  return { engine, interaction, isGpu };
}
