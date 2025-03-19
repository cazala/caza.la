# Issue 04: Refactor Duplicate Code into Shared Utilities

## Description

Identify and refactor duplicate code patterns throughout the codebase into shared utility functions to improve maintainability and reduce the potential for bugs.

## Problem

The codebase contains several instances of duplicate or very similar code:

- Similar drawing logic repeated for different fish behaviors
- Redundant code in event handling between mouse and touch events
- Similar calculation patterns repeated in multiple places
- Common operations that could be abstracted into reusable functions

## Solution

1. Identify patterns of duplicate code
2. Extract common functionality into utility functions
3. Replace duplicated code with calls to the utility functions
4. Ensure utility functions are well-documented and type-safe

## Implementation Details

### 1. Canvas Drawing Utilities

Create a drawing utilities file for common canvas operations:

```typescript
// src/lib/drawing-utils.ts

import { Fish } from "./Fish";

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
  ctx.globalAlpha = 0.2;
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
```

Replace duplicate drawing code in Fish.ts:

```typescript
// Before
if (this.avoidList && this.avoidList.length) {
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (const fish of this.avoidList) {
    ctx.moveTo(this.location.x, this.location.y);
    ctx.lineTo(fish.location.x, fish.location.y);
  }
  ctx.stroke();
}

if (this.chaseList && this.chaseList.length) {
  ctx.strokeStyle = "red";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (const fish of this.chaseList) {
    ctx.moveTo(this.location.x, this.location.y);
    ctx.lineTo(fish.location.x, fish.location.y);
  }
  ctx.stroke();
}

// After
import { drawFishConnections } from "./drawing-utils";
import { FISH } from "./constants";

drawFishConnections(ctx, this, this.avoidList, FISH.AVOID_COLOR, 4);
drawFishConnections(ctx, this, this.chaseList, FISH.CHASE_COLOR, 4);
drawFishConnections(ctx, this, this.shoalList, FISH.SHOAL_COLOR, 1);
```

### 2. Event Handling Utilities

Create utility functions for common event handling patterns:

```typescript
// src/lib/event-utils.ts

import { Vector } from "./Vector";
import { logger } from "./logging";

/**
 * Updates mouse/touch position from an event
 * @param event Mouse or touch event
 * @param position Vector to update with new position
 * @returns The updated position vector
 */
export function updatePositionFromEvent(
  event: MouseEvent | Touch,
  position: Vector
): Vector {
  position.set(event.clientX, event.clientY);
  logger.debug(`Position updated to: (${position.x}, ${position.y})`);
  return position;
}

/**
 * Determines if an interaction was a quick tap/click
 * @param startTime Time when interaction started
 * @param threshold Maximum duration for quick interaction in ms
 * @returns Boolean indicating if interaction was quick
 */
export function isQuickInteraction(
  startTime: number | null,
  threshold: number
): boolean {
  if (!startTime) return false;
  return Date.now() - startTime < threshold;
}
```

### 3. Fish Behavior Utilities

Extract common fish behavior calculations into utility functions:

```typescript
// src/lib/behavior-utils.ts

import { Fish } from "./Fish";

/**
 * Categorizes fish into groups based on their mass relative to a reference fish
 * @param fish The reference fish
 * @param neighbors List of neighboring fish
 * @param biggerThreshold Threshold for "bigger" fish (multiplier of reference mass)
 * @param smallerThreshold Threshold for "smaller" fish (multiplier of reference mass)
 * @returns Object containing categorized lists of fish
 */
export function categorizeFishByMass(
  fish: Fish,
  neighbors: Fish[],
  biggerThreshold: number,
  smallerThreshold: number
): { bigger: Fish[]; similar: Fish[]; smaller: Fish[] } {
  const bigger: Fish[] = [];
  const similar: Fish[] = [];
  const smaller: Fish[] = [];

  for (const neighbor of neighbors) {
    if (neighbor.mass > fish.mass * biggerThreshold) {
      bigger.push(neighbor);
    } else if (neighbor.mass < fish.mass * smallerThreshold) {
      smaller.push(neighbor);
    } else {
      similar.push(neighbor);
    }
  }

  return { bigger, similar, smaller };
}
```

## Benefits

- Reduced code size and complexity
- Improved maintainability through DRY principles
- Better testability with isolated functions
- Improved readability with well-named utility functions
- Easier bug fixing (fix in one place instead of multiple places)
- More consistent behavior across the application

## Acceptance Criteria

- [ ] Common drawing logic is extracted to shared utilities
- [ ] Event handling duplicate code is refactored into reusable functions
- [ ] Fish behavior calculations are factored into utilities where appropriate
- [ ] All utility functions are properly documented with JSDoc comments
- [ ] Type safety is maintained or improved throughout the refactoring
- [ ] No functionality is lost or changed during the refactoring
- [ ] Code is more concise and readable after the changes
