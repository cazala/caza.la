import { Fish } from '../models/Fish';
import { CANVAS } from './constants';

/**
 * Draws connections between a fish and a list of other fish
 * @param ctx The canvas rendering context
 * @param fish The central fish
 * @param connections List of fish to draw connections to
 * @param color The color of the connection lines
 * @param lineWidth The width of the connection lines
 */
export function drawFishConnections(
  ctx: CanvasRenderingContext2D,
  fish: Fish,
  connections: Fish[] | null,
  color: string,
  lineWidth: number = 1
): void {
  if (!connections || connections.length === 0) return;

  const oldAlpha = ctx.globalAlpha;
  ctx.globalAlpha = CANVAS.TRAIL_ALPHA;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  for (const connection of connections) {
    ctx.moveTo(fish.location.x, fish.location.y);
    ctx.lineTo(connection.location.x, connection.location.y);
  }

  ctx.stroke();
  ctx.globalAlpha = oldAlpha;
}

/**
 * Draws a fish shape on the canvas
 * @param ctx The canvas rendering context
 * @param fish The fish to draw
 */
export function drawFishShape(ctx: CanvasRenderingContext2D, fish: Fish): void {
  const angle = fish.velocity.angle();

  const x1 = fish.location.x + Math.cos(angle) * fish.base;
  const y1 = fish.location.y + Math.sin(angle) * fish.base;

  const x = fish.location.x - Math.cos(angle) * fish.length;
  const y = fish.location.y - Math.sin(angle) * fish.length;

  const x2 = fish.location.x + Math.cos(angle + fish.HALF_PI) * fish.base;
  const y2 = fish.location.y + Math.sin(angle + fish.HALF_PI) * fish.base;

  const x3 = fish.location.x + Math.cos(angle - fish.HALF_PI) * fish.base;
  const y3 = fish.location.y + Math.sin(angle - fish.HALF_PI) * fish.base;

  // Make sure fish are visible
  ctx.lineWidth = 2;
  ctx.fillStyle = fish.color || '#000000';
  ctx.strokeStyle = fish.color || '#000000';

  // Save current state
  ctx.save();

  // Ensure global alpha is set properly
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(x2, y2, x, y);
  ctx.quadraticCurveTo(x3, y3, x1, y1);
  ctx.stroke();
  ctx.fill();

  // Restore previous state
  ctx.restore();
}
