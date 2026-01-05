import type { Engine } from '@cazala/party';

export function screenToWorld(engine: Engine, screenX: number, screenY: number) {
  const { width, height } = engine.getSize();
  const { x: cx, y: cy } = engine.getCamera();
  const zoom = engine.getZoom() || 1;
  return {
    x: cx + (screenX - width / 2) / zoom,
    y: cy + (screenY - height / 2) / zoom,
  };
}

export function pointerEventToWorld(canvas: HTMLCanvasElement, engine: Engine, e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const rectW = rect.width || 1;
  const rectH = rect.height || 1;

  // Convert CSS pixels → canvas backing-store pixels.
  const sx = (e.clientX - rect.left) * (canvas.width / rectW);
  const sy = (e.clientY - rect.top) * (canvas.height / rectH);

  return screenToWorld(engine, sx, sy);
}
