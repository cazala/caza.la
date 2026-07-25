import { useEffect, useRef, useState } from 'react';
import { Engine, Neural, gridForCanvas } from '@cazala/automata';

const CELL_SIZE = 1.5;
const MAX_CELLS = 2048;
const ERASE_RADIUS = 22;
const HUE_SPEED_HZ = 0.01;
const HUE_UPDATE_INTERVAL_MS = 50;
const CENTER_CLEAR_INTERVAL_MS = 32;
const CENTER_CLEAR_MARGIN_PX = 14;
const EMPTY_NEURAL_CELL = [0, 0, 0, 0, 0, 0];

type AutomataCanvasProps = {
  onHueChange?: (value: number) => void;
};

const hueToRgba = (hue: number) => {
  const channel = (offset: number) => {
    const k = (offset + hue * 12) % 12;
    return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };

  return {
    r: channel(0),
    g: channel(8),
    b: channel(4),
    a: 1,
  };
};

const eraseCircle = (engine: Engine, x: number, y: number, radius: number) => {
  engine.fillCircle(x, y, radius, EMPTY_NEURAL_CELL);
};

const screenToWorld = (engine: Engine, canvas: HTMLCanvasElement, event: PointerEvent) => {
  const rect = canvas.getBoundingClientRect();
  const size = engine.getSize();
  const camera = engine.getCamera();
  const zoom = engine.getZoom();

  return {
    x: camera.x + (event.clientX - rect.left - size.width / 2) / zoom,
    y: camera.y + (event.clientY - rect.top - size.height / 2) / zoom,
  };
};

const AutomataCanvas = ({ onHueChange }: AutomataCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let engine: Engine | null = null;
    let stopAutoResize: (() => void) | null = null;
    let hueFrameId: number | null = null;
    let centerClearIntervalId: number | null = null;

    const start = async () => {
      const width = canvas.clientWidth || window.innerWidth || 1;
      const height = canvas.clientHeight || window.innerHeight || 1;
      const automaton = new Neural();
      const seed = automaton.applyPreset('worms');
      const initialHue = (performance.now() * HUE_SPEED_HZ * 0.001) % 1;

      engine = new Engine({
        canvas,
        automaton,
        grid: {
          ...gridForCanvas(width, height, {
            cellSize: CELL_SIZE,
            maxCells: MAX_CELLS,
          }),
          wrap: true,
          maxCells: MAX_CELLS,
        },
        stepsPerSecond: Neural.recommendedStepsPerSecond,
        render: {
          colorOn: hueToRgba(initialHue),
          colorOff: { r: 0, g: 0, b: 0, a: 1 },
          colorBg: { r: 0, g: 0, b: 0, a: 1 },
          showGrid: false,
          gridThreshold: 6,
        },
        onError: error => {
          console.error('Automata background failed:', error);
          if (!cancelled) setFailed(true);
        },
      });

      try {
        await engine.initialize();
        if (cancelled) {
          engine.destroy();
          return;
        }

        engineRef.current = engine;
        if (window.matchMedia('(pointer: coarse)').matches) {
          engine.setCoverMinZoom(true);
        }
        engine.coverGrid();
        engine.reset(seed);
        stopAutoResize = engine.autoResize();

        const clearCenter = () => {
          if (!engine) return;
          const panel = document.querySelector<HTMLElement>('.work-panel');
          if (!panel) return;

          const panelRect = panel.getBoundingClientRect();
          const radiusInPixels =
            Math.max(panelRect.width, panelRect.height) / 2 + CENTER_CLEAR_MARGIN_PX;
          const radiusInCells = radiusInPixels / engine.getZoom();
          const camera = engine.getCamera();
          eraseCircle(engine, camera.x, camera.y, radiusInCells);
        };

        clearCenter();
        centerClearIntervalId = window.setInterval(clearCenter, CENTER_CLEAR_INTERVAL_MS);
        engine.play();
        onHueChange?.(initialHue);

        let lastHueUpdate = 0;
        const animateHue = (now: number) => {
          if (now - lastHueUpdate >= HUE_UPDATE_INTERVAL_MS) {
            const hue = (now * HUE_SPEED_HZ * 0.001) % 1;
            engine?.setRenderConfig({ colorOn: hueToRgba(hue) });
            onHueChange?.(hue);
            lastHueUpdate = now;
          }
          hueFrameId = window.requestAnimationFrame(animateHue);
        };
        hueFrameId = window.requestAnimationFrame(animateHue);
        setReady(true);
      } catch (error) {
        console.error('Unable to initialize Automata background:', error);
        if (!cancelled) setFailed(true);
        engine.destroy();
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (hueFrameId !== null) {
        window.cancelAnimationFrame(hueFrameId);
      }
      if (centerClearIntervalId !== null) {
        window.clearInterval(centerClearIntervalId);
      }
      stopAutoResize?.();
      engineRef.current = null;
      engine?.destroy();
    };
  }, [onHueChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let erasing = false;
    let previous: { x: number; y: number } | null = null;

    const eraseAt = (event: PointerEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const point = screenToWorld(engine, canvas, event);
      if (previous) {
        const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
        const steps = Math.floor(distance / (ERASE_RADIUS * 0.5));
        for (let index = 1; index <= steps; index += 1) {
          const progress = index / (steps + 1);
          eraseCircle(
            engine,
            previous.x + (point.x - previous.x) * progress,
            previous.y + (point.y - previous.y) * progress,
            ERASE_RADIUS
          );
        }
      }

      eraseCircle(engine, point.x, point.y, ERASE_RADIUS);
      previous = point;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      erasing = true;
      previous = null;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional; dragging still works without it.
      }
      eraseAt(event);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!erasing) return;
      event.preventDefault();
      eraseAt(event);
    };

    const stopErasing = () => {
      erasing = false;
      previous = null;
    };

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', stopErasing);
    window.addEventListener('pointercancel', stopErasing);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopErasing);
      window.removeEventListener('pointercancel', stopErasing);
    };
  }, []);

  return (
    <>
      <div className={`automata-fallback${failed ? ' is-visible' : ''}`} aria-hidden="true" />
      <canvas
        aria-hidden="true"
        className={`background-canvas automata-canvas${ready ? ' is-ready' : ''}`}
        ref={canvasRef}
      />
      {failed ? (
        <p className="simulation-status" role="status">
          WebGPU is unavailable. The background is taking a break.
        </p>
      ) : null}
    </>
  );
};

export default AutomataCanvas;
