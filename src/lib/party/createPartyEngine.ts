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

export type CreatePartyEngineOptions = {
  canvas: HTMLCanvasElement;
  isMobile?: boolean;
  onHueChange?: (value: number) => void;
};

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
    strength: 10_000,
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
  engine.setZoom(0.1);

  const spawner = new Spawner();

  if (isGpu) {
    engine.setParticles(
      spawner.initParticles({
        count: isMobile ? 10_000 : 45_000,
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
  if (onHueChange) {
    engine.addOscillatorListener('particles', 'hue', onHueChange);
  }

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
}
