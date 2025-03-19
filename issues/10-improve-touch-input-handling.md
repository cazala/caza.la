# Issue 10: Improve Touch Input Handling for Mobile Devices

## Description

Enhance the touch input handling to provide a better and more responsive experience on mobile devices, with support for multi-touch gestures and improved touch event handling.

## Problem

The current touch input implementation has several limitations:

- Limited support for multi-touch gestures
- Potential conflicts between mouse and touch events
- Touch event handling is mixed with mouse event logic
- Gestures like pinch-to-zoom and two-finger rotate aren't implemented
- No visual feedback for touch interactions
- Inconsistent behavior between desktop and mobile devices

## Solution

1. Refactor touch input handling into a dedicated system
2. Implement support for common gestures (pinch-to-zoom, rotate, swipe)
3. Add visual feedback for touch interactions
4. Properly separate mouse and touch event handling
5. Optimize event handlers for mobile performance
6. Add support for device-specific features (like iOS force touch)

## Implementation Details

### 1. Create a TouchInputManager Class

```typescript
// src/lib/TouchInputManager.ts

import { Vector } from "./Vector";
import { logger } from "./logging";

/**
 * Types of recognized gestures
 */
export enum GestureType {
  TAP,
  DOUBLE_TAP,
  LONG_PRESS,
  PAN,
  PINCH,
  ROTATE,
  SWIPE,
}

/**
 * Information about touch gesture state
 */
export interface GestureInfo {
  type: GestureType;
  position: Vector;
  startPosition: Vector;
  delta: Vector;
  scale: number;
  rotation: number;
  velocity: Vector;
  active: boolean;
  duration: number;
}

/**
 * Callback type for gesture events
 */
export type GestureCallback = (info: GestureInfo) => void;

/**
 * Manages touch input and gestures for mobile devices
 */
export class TouchInputManager {
  // Element to attach touch events to
  private element: HTMLElement;

  // Touch tracking
  private touches: TouchList | null = null;
  private touchStartPositions: Map<number, Vector> = new Map();
  private touchStartTime: number = 0;
  private touchMovePositions: Map<number, Vector> = new Map();
  private touchMoveTime: number = 0;
  private lastTouchCount: number = 0;
  private isLongPressing: boolean = false;
  private longPressTimer: number | null = null;

  // Gesture state
  private activeGesture: GestureType | null = null;
  private gestureInfo: GestureInfo = {
    type: GestureType.TAP,
    position: new Vector(0, 0),
    startPosition: new Vector(0, 0),
    delta: new Vector(0, 0),
    scale: 1,
    rotation: 0,
    velocity: new Vector(0, 0),
    active: false,
    duration: 0,
  };

  // Settings
  private settings = {
    doubleTapMaxDelay: 300, // ms
    longPressDelay: 500, // ms
    swipeMinVelocity: 0.5, // pixels/ms
    swipeMinDistance: 50, // pixels
    inertia: 0.95, // velocity retention per frame
  };

  // Callback maps
  private gestureCallbacks: Map<GestureType, GestureCallback[]> = new Map();

  /**
   * Creates a new TouchInputManager
   * @param element - DOM element to attach touch events to
   */
  constructor(element: HTMLElement) {
    this.element = element;
    this.setupEventListeners();

    // Initialize callback maps
    Object.values(GestureType).forEach((type) => {
      if (typeof type === "number") {
        this.gestureCallbacks.set(type, []);
      }
    });

    logger.info("TouchInputManager initialized");
  }

  /**
   * Set up all touch event listeners
   */
  private setupEventListeners(): void {
    this.element.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this),
      { passive: false }
    );
    this.element.addEventListener(
      "touchmove",
      this.handleTouchMove.bind(this),
      { passive: false }
    );
    this.element.addEventListener("touchend", this.handleTouchEnd.bind(this), {
      passive: false,
    });
    this.element.addEventListener(
      "touchcancel",
      this.handleTouchCancel.bind(this),
      { passive: false }
    );
  }

  /**
   * Remove all touch event listeners
   */
  public cleanup(): void {
    this.element.removeEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    );
    this.element.removeEventListener(
      "touchmove",
      this.handleTouchMove.bind(this)
    );
    this.element.removeEventListener(
      "touchend",
      this.handleTouchEnd.bind(this)
    );
    this.element.removeEventListener(
      "touchcancel",
      this.handleTouchCancel.bind(this)
    );

    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    logger.info("TouchInputManager cleaned up");
  }

  /**
   * Handle touch start event
   */
  private handleTouchStart(event: TouchEvent): void {
    // Prevent default behavior for touch events
    event.preventDefault();

    this.touches = event.touches;
    this.touchStartTime = Date.now();
    this.lastTouchCount = this.touches.length;

    // Record start positions for all touches
    for (let i = 0; i < this.touches.length; i++) {
      const touch = this.touches[i];
      this.touchStartPositions.set(
        touch.identifier,
        new Vector(touch.clientX, touch.clientY)
      );
      this.touchMovePositions.set(
        touch.identifier,
        new Vector(touch.clientX, touch.clientY)
      );
    }

    // Update gesture info with start position (average of all touches)
    this.gestureInfo.startPosition = this.getAverageTouchPosition();
    this.gestureInfo.position = this.gestureInfo.startPosition.copy();
    this.gestureInfo.active = true;
    this.gestureInfo.duration = 0;

    // Start long press timer
    if (this.touches.length === 1) {
      this.isLongPressing = false;
      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
      }
      this.longPressTimer = window.setTimeout(() => {
        if (this.touches && this.touches.length === 1) {
          this.isLongPressing = true;
          this.activeGesture = GestureType.LONG_PRESS;
          this.gestureInfo.type = GestureType.LONG_PRESS;
          this.triggerGestureCallbacks(GestureType.LONG_PRESS);
        }
      }, this.settings.longPressDelay);
    }

    // Initialize gesture type
    if (this.touches.length === 1) {
      this.activeGesture = null; // Will be determined on move or end
    } else if (this.touches.length === 2) {
      this.activeGesture = GestureType.PINCH; // Start with pinch, might become rotate
    }

    logger.debug(`Touch start: ${this.touches.length} touches`);
  }

  /**
   * Handle touch move event
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    this.touches = event.touches;
    const now = Date.now();
    const deltaTime = now - this.touchMoveTime;
    this.touchMoveTime = now;
    this.gestureInfo.duration = now - this.touchStartTime;

    // Cancel long press if moved beyond threshold
    if (this.longPressTimer !== null && !this.isLongPressing) {
      const touch = this.touches[0];
      const startPos = this.touchStartPositions.get(touch.identifier);
      if (startPos) {
        const currentPos = new Vector(touch.clientX, touch.clientY);
        if (startPos.dist(currentPos) > 10) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      }
    }

    // Update move positions for all touches
    for (let i = 0; i < this.touches.length; i++) {
      const touch = this.touches[i];
      const prevPos =
        this.touchMovePositions.get(touch.identifier) ||
        new Vector(touch.clientX, touch.clientY);
      const currentPos = new Vector(touch.clientX, touch.clientY);

      // Update velocity based on movement
      if (deltaTime > 0) {
        const moveVelocity = currentPos.minus(prevPos).dividedBy(deltaTime);
        this.gestureInfo.velocity = this.gestureInfo.velocity
          .times(0.5)
          .plus(moveVelocity.times(0.5));
      }

      this.touchMovePositions.set(touch.identifier, currentPos);
    }

    // Update current position (average of all touches)
    const newPosition = this.getAverageTouchPosition();
    this.gestureInfo.delta = newPosition.minus(this.gestureInfo.position);
    this.gestureInfo.position = newPosition;

    // Determine and update active gesture
    if (this.touches.length === 1 && !this.isLongPressing) {
      if (!this.activeGesture || this.activeGesture === GestureType.TAP) {
        this.activeGesture = GestureType.PAN;
        this.gestureInfo.type = GestureType.PAN;
      }

      // Trigger pan gesture
      this.triggerGestureCallbacks(GestureType.PAN);
    } else if (this.touches.length === 2) {
      // Handle pinch gesture
      const touch1 = this.touches[0];
      const touch2 = this.touches[1];
      const currentDistance = new Vector(touch1.clientX, touch1.clientY).dist(
        new Vector(touch2.clientX, touch2.clientY)
      );

      const startPos1 = this.touchStartPositions.get(touch1.identifier);
      const startPos2 = this.touchStartPositions.get(touch2.identifier);

      if (startPos1 && startPos2) {
        const startDistance = startPos1.dist(startPos2);
        this.gestureInfo.scale = currentDistance / startDistance;

        // Calculate rotation
        const startAngle = Math.atan2(
          startPos2.y - startPos1.y,
          startPos2.x - startPos1.x
        );
        const currentAngle = Math.atan2(
          touch2.clientY - touch1.clientY,
          touch2.clientX - touch1.clientX
        );
        this.gestureInfo.rotation = currentAngle - startAngle;

        // Determine if this is primarily a pinch or rotate gesture
        if (
          Math.abs(this.gestureInfo.scale - 1) >
          Math.abs(this.gestureInfo.rotation) * 0.5
        ) {
          this.activeGesture = GestureType.PINCH;
          this.gestureInfo.type = GestureType.PINCH;
          this.triggerGestureCallbacks(GestureType.PINCH);
        } else {
          this.activeGesture = GestureType.ROTATE;
          this.gestureInfo.type = GestureType.ROTATE;
          this.triggerGestureCallbacks(GestureType.ROTATE);
        }
      }
    }
  }

  /**
   * Handle touch end event
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    this.touches = event.touches;
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.touchStartTime;
    this.gestureInfo.duration = touchDuration;

    // Clear long press timer
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // If all touches are gone, finalize the gesture
    if (this.touches.length === 0) {
      this.gestureInfo.active = false;

      if (this.isLongPressing) {
        // Long press already handled
        this.isLongPressing = false;
      } else if (this.activeGesture === GestureType.PAN) {
        // Check if pan should be classified as swipe
        const velocity = this.gestureInfo.velocity.mag();
        const distance = this.gestureInfo.startPosition.dist(
          this.gestureInfo.position
        );

        if (
          velocity > this.settings.swipeMinVelocity &&
          distance > this.settings.swipeMinDistance
        ) {
          this.activeGesture = GestureType.SWIPE;
          this.gestureInfo.type = GestureType.SWIPE;
          this.triggerGestureCallbacks(GestureType.SWIPE);
        } else {
          // Finalize pan gesture
          this.triggerGestureCallbacks(GestureType.PAN);
        }
      } else if (
        !this.activeGesture ||
        this.activeGesture === GestureType.TAP
      ) {
        // Handle tap or double tap
        this.activeGesture = GestureType.TAP;
        this.gestureInfo.type = GestureType.TAP;
        this.triggerGestureCallbacks(GestureType.TAP);
      } else if (
        this.activeGesture === GestureType.PINCH ||
        this.activeGesture === GestureType.ROTATE
      ) {
        // Finalize pinch or rotate
        this.triggerGestureCallbacks(this.activeGesture);
      }

      // Reset active gesture
      this.activeGesture = null;
    }

    logger.debug(`Touch end: ${this.touches.length} touches remaining`);
  }

  /**
   * Handle touch cancel event
   */
  private handleTouchCancel(event: TouchEvent): void {
    event.preventDefault();
    this.touches = event.touches;

    // Cancel any active gestures
    this.gestureInfo.active = false;
    this.activeGesture = null;

    // Clear long press timer
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    logger.debug("Touch cancelled");
  }

  /**
   * Calculate the average position of all current touches
   */
  private getAverageTouchPosition(): Vector {
    if (!this.touches || this.touches.length === 0) {
      return new Vector(0, 0);
    }

    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < this.touches.length; i++) {
      sumX += this.touches[i].clientX;
      sumY += this.touches[i].clientY;
    }

    return new Vector(sumX / this.touches.length, sumY / this.touches.length);
  }

  /**
   * Register a callback for a specific gesture type
   * @param type - The gesture type to listen for
   * @param callback - Function to call when the gesture occurs
   */
  public on(type: GestureType, callback: GestureCallback): void {
    const callbacks = this.gestureCallbacks.get(type) || [];
    callbacks.push(callback);
    this.gestureCallbacks.set(type, callbacks);
  }

  /**
   * Remove a previously registered callback
   * @param type - The gesture type
   * @param callback - The callback function to remove
   */
  public off(type: GestureType, callback: GestureCallback): void {
    const callbacks = this.gestureCallbacks.get(type) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
      this.gestureCallbacks.set(type, callbacks);
    }
  }

  /**
   * Trigger all callbacks for a given gesture type
   * @param type - The gesture type
   */
  private triggerGestureCallbacks(type: GestureType): void {
    const callbacks = this.gestureCallbacks.get(type) || [];
    for (const callback of callbacks) {
      callback(this.gestureInfo);
    }
  }
}
```

### 2. Integrate TouchInputManager with Simulation

```typescript
// src/lib/Simulation.ts (partial)

import {
  TouchInputManager,
  GestureType,
  GestureInfo,
} from "./TouchInputManager";

export class Simulation {
  // Add TouchInputManager
  private touchManager: TouchInputManager | null = null;

  constructor(options: SimulationOptions) {
    // ... existing initialization

    // Initialize touch manager if we're on a touch device
    if ("ontouchstart" in window) {
      this.touchManager = new TouchInputManager(this.canvas);
      this.setupTouchGestures();
      logger.info("Touch input manager initialized");
    }

    // ... rest of constructor
  }

  /**
   * Set up touch gesture handlers
   */
  private setupTouchGestures(): void {
    if (!this.touchManager) return;

    // Handle tap for toggling fish behavior
    this.touchManager.on(GestureType.TAP, (info: GestureInfo) => {
      logger.debug("Tap detected");
      Fish.showBehavior = !Fish.showBehavior;
    });

    // Handle pan for fish following
    this.touchManager.on(GestureType.PAN, (info: GestureInfo) => {
      // Update mouse position to follow finger
      this.mouse.set(info.position.x, info.position.y);
      this.follow = true;

      logger.debug(`Pan at ${info.position.x}, ${info.position.y}`);
    });

    // End following when pan ends
    this.touchManager.on(GestureType.PAN, (info: GestureInfo) => {
      if (!info.active) {
        this.follow = false;
      }
    });

    // Handle pinch for zoom effect
    this.touchManager.on(GestureType.PINCH, (info: GestureInfo) => {
      // Example: adjust fish size based on pinch
      const scale = info.scale;
      logger.debug(`Pinch scale: ${scale}`);

      // Adjust fish size or simulation speed based on pinch
    });

    // Handle long press for special behaviors
    this.touchManager.on(GestureType.LONG_PRESS, (info: GestureInfo) => {
      logger.debug("Long press detected");
      // Toggle slow motion on long press
      if (this.slowmo) {
        this.fast();
      } else {
        this.slow();
      }
      this.slowmo = !this.slowmo;
    });
  }

  /**
   * Clean up the simulation
   */
  public cleanup(): void {
    // ... existing cleanup

    // Clean up touch manager
    if (this.touchManager) {
      this.touchManager.cleanup();
      this.touchManager = null;
    }

    // ... rest of cleanup
  }
}
```

### 3. Add Visual Feedback for Touch Interactions

```typescript
// src/lib/TouchFeedback.ts

import { Vector } from "./Vector";

/**
 * Provides visual feedback for touch interactions
 */
export class TouchFeedback {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private effects: TouchEffect[] = [];
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }
    this.ctx = context;

    this.startAnimation();
  }

  /**
   * Add a touch effect at the specified position
   */
  public addTouchEffect(
    position: Vector,
    type: "tap" | "long-press" | "swipe" = "tap"
  ): void {
    this.effects.push(new TouchEffect(position, type));
  }

  /**
   * Start the animation loop
   */
  private startAnimation(): void {
    const animate = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Stop the animation loop
   */
  public cleanup(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.effects = [];
  }

  /**
   * Update all touch effects
   */
  private update(): void {
    // Remove finished effects
    this.effects = this.effects.filter((effect) => !effect.isFinished());

    // Update remaining effects
    for (const effect of this.effects) {
      effect.update();
    }
  }

  /**
   * Render all touch effects
   */
  private render(): void {
    // Don't clear the canvas - draw on top of the existing content
    // The main simulation will clear it on the next frame

    for (const effect of this.effects) {
      effect.render(this.ctx);
    }
  }
}

/**
 * Represents a single touch effect animation
 */
class TouchEffect {
  private position: Vector;
  private type: string;
  private radius: number;
  private alpha: number;
  private lifespan: number;
  private age: number;
  private color: string;

  constructor(position: Vector, type: string) {
    this.position = position.copy();
    this.type = type;
    this.age = 0;

    // Set properties based on effect type
    switch (type) {
      case "tap":
        this.radius = 20;
        this.alpha = 0.7;
        this.lifespan = 20;
        this.color = "rgba(255, 255, 255, 0.7)";
        break;
      case "long-press":
        this.radius = 30;
        this.alpha = 0.7;
        this.lifespan = 40;
        this.color = "rgba(255, 200, 0, 0.7)";
        break;
      case "swipe":
        this.radius = 15;
        this.alpha = 0.5;
        this.lifespan = 15;
        this.color = "rgba(0, 200, 255, 0.5)";
        break;
      default:
        this.radius = 20;
        this.alpha = 0.5;
        this.lifespan = 20;
        this.color = "rgba(255, 255, 255, 0.5)";
    }
  }

  /**
   * Update the effect's state
   */
  public update(): void {
    this.age++;
    this.alpha = Math.max(0, this.alpha - this.alpha / this.lifespan);
    this.radius += 2;
  }

  /**
   * Render the effect
   */
  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Draw circle
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace(/[\d\.]+\)$/, `${this.alpha})`);
    ctx.fill();

    if (this.type === "tap") {
      // Draw ripple effect
      ctx.beginPath();
      ctx.arc(
        this.position.x,
        this.position.y,
        this.radius * 1.2,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = this.color.replace(
        /[\d\.]+\)$/,
        `${this.alpha * 0.5})`
      );
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Check if the effect is finished
   */
  public isFinished(): boolean {
    return this.age >= this.lifespan;
  }
}
```

### 4. Integrate Touch Feedback with Simulation

```typescript
// src/lib/Simulation.ts (partial)

import { TouchFeedback } from "./TouchFeedback";

export class Simulation {
  // Add TouchFeedback
  private touchFeedback: TouchFeedback | null = null;

  constructor(options: SimulationOptions) {
    // ... existing initialization

    // Initialize touch feedback
    if ("ontouchstart" in window) {
      this.touchFeedback = new TouchFeedback(this.canvas);
    }

    // ... rest of constructor
  }

  /**
   * Set up touch gesture handlers
   */
  private setupTouchGestures(): void {
    if (!this.touchManager) return;

    // Handle tap with visual feedback
    this.touchManager.on(GestureType.TAP, (info: GestureInfo) => {
      logger.debug("Tap detected");
      Fish.showBehavior = !Fish.showBehavior;

      // Add visual feedback
      if (this.touchFeedback) {
        this.touchFeedback.addTouchEffect(info.position, "tap");
      }
    });

    // Handle long press with visual feedback
    this.touchManager.on(GestureType.LONG_PRESS, (info: GestureInfo) => {
      logger.debug("Long press detected");
      if (this.slowmo) {
        this.fast();
      } else {
        this.slow();
      }
      this.slowmo = !this.slowmo;

      // Add visual feedback
      if (this.touchFeedback) {
        this.touchFeedback.addTouchEffect(info.position, "long-press");
      }
    });

    // ... other gesture handlers
  }

  /**
   * Clean up the simulation
   */
  public cleanup(): void {
    // ... existing cleanup

    // Clean up touch feedback
    if (this.touchFeedback) {
      this.touchFeedback.cleanup();
      this.touchFeedback = null;
    }

    // ... rest of cleanup
  }
}
```

## Benefits

- Improved touch handling for mobile and tablet devices
- Support for multi-touch gestures like pinch-to-zoom and rotate
- Visual feedback for touch interactions
- Clear separation of mouse and touch event handling
- Better responsiveness and accuracy for touch inputs
- Enhanced user experience on mobile devices
- Proper event listener cleanup to prevent memory leaks

## Acceptance Criteria

- [ ] Implementation of a dedicated TouchInputManager
- [ ] Support for common gestures (tap, long press, pan, pinch, rotate, swipe)
- [ ] Visual feedback for touch interactions
- [ ] Proper handling of multi-touch input
- [ ] Clean separation of mouse and touch events
- [ ] Efficient memory usage with proper event cleanup
- [ ] Detection of device touch capabilities
- [ ] Testing on various mobile devices (iOS, Android)
- [ ] No regression in desktop mouse behavior
