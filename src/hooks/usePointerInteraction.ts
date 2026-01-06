import { useEffect, useRef } from 'react';
import type { Engine, Interaction } from '@cazala/party';
import type { RefObject } from 'react';
import { pointerEventToWorld } from '../lib/coords';

// Pointer tuning (kept local to this hook; stable module-level constants avoid hook dep noise)
const GPU_SNAP_BACK_MS = 90;
const GPU_INTERVAL_MS = 16;
const GPU_DOWN = { strength: 100_000, radius: 800, mode: 'repel' as const };
const GPU_CENTER_DESKTOP_RADIUS = 1600;
const GPU_CENTER = {
  strength: 200_000,
  // On smaller screens (e.g. iPhone SE) we need a tighter radius, while larger viewports
  // can use a bigger one. Because the overall "feel" is impacted by both width + height
  // (framing/scale), we blend normalized width and normalized area, then clamp.
  //
  // Anchors:
  // - iPhone SE portrait: 375x667 -> ~1250
  // - iPhone 14 Pro Max portrait: 430x932 -> ~1800
  radius: {
    min: 1250,
    max: 1800,
    minWidth: 375,
    maxWidth: 430,
    minHeight: 667,
    maxHeight: 932,
    // Small shaping tweak: boosts mid-range slightly and reduces high-mid slightly.
    // Keeps endpoints stable because sin(2πt) = 0 at t=0 and t=1.
    warp: 0.7,
  },
  mode: 'repel' as const,
};
const CPU_DOWN = { strength: 30_000, radius: 1500, mode: 'attract' as const };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const normalize = (value: number, min: number, max: number) => clamp01((value - min) / (max - min));

const getGpuCenterRadius = (viewportWidth: number, viewportHeight: number) => {
  // Normalize to portrait-like dimensions so orientation changes don't flip behavior.
  const w = Math.min(viewportWidth, viewportHeight);
  const h = Math.max(viewportWidth, viewportHeight);
  const area = w * h;

  const cfg = GPU_CENTER.radius;
  const minArea = cfg.minWidth * cfg.minHeight;
  const maxArea = cfg.maxWidth * cfg.maxHeight;

  const tWidth = normalize(w, cfg.minWidth, cfg.maxWidth);
  const tArea = normalize(area, minArea, maxArea);

  // Blend width + area so "tall but not that wide" devices don't drift too far.
  let t = (tWidth + tArea) / 2;

  // Gentle S-curve: increases mid-range a touch and reduces high-mid a touch.
  t = clamp01(t + cfg.warp * Math.sin(2 * Math.PI * t));

  return lerp(cfg.min, cfg.max, t);
};

export type UsePointerInteractionOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  engineRef: RefObject<Engine | null>;
  interactionRef: RefObject<Interaction | null>;
  isMobile: boolean;
};

export function usePointerInteraction({
  canvasRef,
  engineRef,
  interactionRef,
  isMobile,
}: UsePointerInteractionOptions) {
  // Track recent user interaction so the GPU "center force" interval doesn't instantly overwrite
  // the click position (Safari timing differences made this feel flaky).
  const lastUserPointerAtRef = useRef(0);
  const cpuPointerDownRef = useRef(false);

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
      const isGpu = engine?.getActualRuntime() === 'webgpu';
      if (!engine || !interaction || !interaction.isEnabled() || !isGpu) return;

      // Give user clicks a brief window to be visible before snapping back to center.
      if (performance.now() - lastUserPointerAtRef.current < GPU_SNAP_BACK_MS) {
        return;
      }

      // "Center of screen" in world space is the current camera center.
      const { x: cx, y: cy } = engine.getCamera();
      interaction.setMode(GPU_CENTER.mode);
      interaction.setActive(true);
      interaction.setPosition(cx, cy);
      interaction.setStrength(GPU_CENTER.strength);
      interaction.setRadius(
        isMobile
          ? getGpuCenterRadius(window.innerWidth, window.innerHeight)
          : GPU_CENTER_DESKTOP_RADIUS
      );
    }, GPU_INTERVAL_MS);

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
      const world = pointerEventToWorld(canvas, engine, e);

      const interaction = getInteraction();
      if (!interaction || !interaction.isEnabled()) return;

      interaction.setPosition(world.x, world.y);
      interaction.setActive(true);

      if (isGpu) {
        lastUserPointerAtRef.current = performance.now();
        interaction.setMode(GPU_DOWN.mode);
        interaction.setStrength(GPU_DOWN.strength);
        interaction.setRadius(GPU_DOWN.radius);
      } else {
        // CPU demo: press/hold attracts, and dragging updates the position.
        cpuPointerDownRef.current = true;
        interaction.setMode(CPU_DOWN.mode);
        interaction.setStrength(CPU_DOWN.strength);
        interaction.setRadius(CPU_DOWN.radius);
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
      const world = pointerEventToWorld(canvas, engine, e);
      interaction.setPosition(world.x, world.y);
      interaction.setActive(true);
      interaction.setMode(CPU_DOWN.mode);
    };

    const onPointerUp = () => {
      const interaction = getInteraction();
      if (!interaction || !interaction.isEnabled()) return;

      cpuPointerDownRef.current = false;

      // For CPU demo we want "hold = active". GPU demo is continuously driven by the interval anyway.
      const engine = getEngine();
      const isGpu = engine?.getActualRuntime() === 'webgpu';
      if (!isGpu) {
        interaction.setActive(false);
      }
    };

    const onPointerLeave = () => {
      const interaction = getInteraction();
      if (!interaction || !interaction.isEnabled()) return;

      cpuPointerDownRef.current = false;
      const engine = getEngine();
      const isGpu = engine?.getActualRuntime() === 'webgpu';
      if (!isGpu) {
        interaction.setActive(false);
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
  }, [canvasRef, engineRef, interactionRef, isMobile]);
}
