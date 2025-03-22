import { Vector } from '../lib/Vector';
import { logger } from './logging';

/**
 * Updates mouse/touch position from an event
 * @param event Mouse or touch event
 * @param position Vector to update with new position
 * @param canvas The canvas element to get correct coordinates relative to DPR
 * @returns The updated position vector
 */
export function updatePositionFromEvent(
  event: MouseEvent | Touch,
  position: Vector,
  canvas?: HTMLCanvasElement
): Vector {
  if (canvas) {
    // Get DPR and calculate scaling
    const dpr = window.devicePixelRatio || 1;

    // Get the canvas bounding rect
    const rect = canvas.getBoundingClientRect();

    // Calculate the correct position taking into account DPR
    const x = (event.clientX - rect.left) * dpr;
    const y = (event.clientY - rect.top) * dpr;

    position.set(x, y);
    logger.debug(`Position updated with DPR ${dpr}: (${position.x}, ${position.y})`);
  } else {
    // Legacy behavior for backward compatibility
    position.set(event.clientX, event.clientY);
    logger.debug(`Position updated to: (${position.x}, ${position.y})`);
  }

  return position;
}

/**
 * Determines if an interaction was a quick tap/click
 * @param startTime Time when interaction started
 * @param threshold Maximum duration for quick interaction in ms
 * @returns Boolean indicating if interaction was quick
 */
export function isQuickInteraction(startTime: number | null, threshold: number): boolean {
  if (!startTime) return false;
  return Date.now() - startTime < threshold;
}

/**
 * Checks whether to ignore mouse events after touch events
 * @param isTouchDevice Whether the device supports touch
 * @param lastTouchTime The timestamp of the last touch event
 * @param preventionTimeout The timeout duration after which mouse events should be processed
 * @returns Boolean indicating whether mouse events should be ignored
 */
export function shouldIgnoreMouseAfterTouch(
  isTouchDevice: boolean,
  lastTouchTime: number,
  preventionTimeout: number
): boolean {
  return isTouchDevice && Date.now() - lastTouchTime < preventionTimeout;
}
