# Issue 05: Refactor Static State to Instance Properties

## Description

Refactor the Simulation class to replace static state with instance properties to improve encapsulation, testing, and allow for potential multiple simulation instances.

## Problem

The current implementation uses static properties and methods in the Simulation class:

- `static mouse`, `static follow`, `static mouseDownTime`, etc.
- Global variable `globalSimulation` used across components
- Static event handlers that reference the static state
- This creates tight coupling between instances and makes testing difficult
- Prevents having multiple independent simulations

## Solution

1. Convert static properties to instance properties
2. Implement event handling that targets specific simulation instances
3. Create a proper API for external systems to interact with simulation instances
4. Update references to use instance properties instead of static ones

## Implementation Details

### 1. Refactor Simulation Class

```typescript
// src/lib/Simulation.ts

import { Fish, World } from "./Fish";
import { Vector } from "./Vector";
import { logger } from "./logging";
import { SIMULATION, CANVAS } from "./constants";

export interface SimulationOptions {
  canvasElement: HTMLCanvasElement;
  // Additional configuration options
  numFish?: number;
  initialInterval?: number;
}

export class Simulation {
  // Convert static properties to instance properties
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mouse: Vector = new Vector(0, 0);
  private world: World = {
    width: 0,
    height: 0,
    creatures: [],
  };
  private follow: boolean = false;
  private slowmo: boolean = false;
  private mouseDownTime: number | null = null;
  private interval: number;
  private alpha: number = CANVAS.DEFAULT_ALPHA;
  private timeline: number | null = null;

  // Track if user is on a touch device
  private isTouchDevice: boolean = false;
  // Timestamp of the last touch event
  private lastTouchTime: number = 0;

  // Event handlers (stored to allow removal)
  private boundMouseMoveHandler: (e: MouseEvent) => void;
  private boundMouseDownHandler: (e: MouseEvent) => void;
  private boundMouseUpHandler: (e: MouseEvent) => void;
  private boundKeyDownHandler: (e: KeyboardEvent) => void;
  private boundKeyUpHandler: (e: KeyboardEvent) => void;
  private boundTouchStartHandler: (e: TouchEvent) => void;
  private boundTouchMoveHandler: (e: TouchEvent) => void;
  private boundTouchEndHandler: (e: TouchEvent) => void;
  private boundResizeHandler: () => void;

  constructor(options: SimulationOptions) {
    this.canvas = options.canvasElement;
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }
    this.ctx = context;
    this.interval = options.initialInterval || SIMULATION.NORMAL_INTERVAL;

    logger.info(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);

    // Initialize world dimensions
    this.world.width = this.canvas.width;
    this.world.height = this.canvas.height;

    // Set up bound event handlers to allow removal
    this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
    this.boundMouseDownHandler = this.handleMouseDown.bind(this);
    this.boundMouseUpHandler = this.handleMouseUp.bind(this);
    this.boundKeyDownHandler = this.handleKeyDown.bind(this);
    this.boundKeyUpHandler = this.handleKeyUp.bind(this);
    this.boundTouchStartHandler = this.handleTouchStart.bind(this);
    this.boundTouchMoveHandler = this.handleTouchMove.bind(this);
    this.boundTouchEndHandler = this.handleTouchEnd.bind(this);
    this.boundResizeHandler = this.resize.bind(this);

    this.setupEventListeners();
    this.resize();
    this.initFish(options.numFish);

    // Draw once immediately to ensure fish are visible
    this.timestep();

    // Then start the animation loop
    this.start();
  }

  // Instance methods for event handling
  private handleMouseMove(e: MouseEvent): void {
    if (
      this.isTouchDevice &&
      Date.now() - this.lastTouchTime <
        SIMULATION.TOUCH_MOUSE_PREVENTION_TIMEOUT
    ) {
      return;
    }
    this.mouse.set(e.clientX, e.clientY);
  }

  private handleMouseDown(): void {
    if (
      this.isTouchDevice &&
      Date.now() - this.lastTouchTime <
        SIMULATION.TOUCH_MOUSE_PREVENTION_TIMEOUT
    ) {
      return;
    }
    this.follow = true;
    this.mouseDownTime = Date.now();
    logger.debug("Mouse down event triggered, follow set to:", this.follow);
  }

  private handleMouseUp(): void {
    if (
      this.isTouchDevice &&
      Date.now() - this.lastTouchTime <
        SIMULATION.TOUCH_MOUSE_PREVENTION_TIMEOUT
    ) {
      return;
    }

    this.follow = false;
    const currentTime = Date.now();

    // Only toggle behavior if it was a quick click
    if (
      this.mouseDownTime &&
      currentTime - this.mouseDownTime < SIMULATION.CLICK_THRESHOLD
    ) {
      logger.debug("Quick click detected, toggling behavior");
      Fish.showBehavior = !Fish.showBehavior;
    } else {
      logger.debug("Not a quick click, just stopping follow");
    }

    this.mouseDownTime = null;
  }

  // Additional event handlers...

  private setupEventListeners(): void {
    logger.info("Setting up event listeners");

    window.addEventListener("mousemove", this.boundMouseMoveHandler);
    window.addEventListener("mousedown", this.boundMouseDownHandler);
    window.addEventListener("mouseup", this.boundMouseUpHandler);
    window.addEventListener("keydown", this.boundKeyDownHandler);
    window.addEventListener("keyup", this.boundKeyUpHandler);
    document.body.addEventListener(
      "touchstart",
      this.boundTouchStartHandler,
      false
    );
    document.body.addEventListener(
      "touchmove",
      this.boundTouchMoveHandler,
      false
    );
    document.body.addEventListener(
      "touchend",
      this.boundTouchEndHandler,
      false
    );
    window.addEventListener("resize", this.boundResizeHandler);
  }

  public cleanup(): void {
    // Stop the animation
    this.stop();

    // Remove event listeners
    window.removeEventListener("mousemove", this.boundMouseMoveHandler);
    window.removeEventListener("mousedown", this.boundMouseDownHandler);
    window.removeEventListener("mouseup", this.boundMouseUpHandler);
    window.removeEventListener("keydown", this.boundKeyDownHandler);
    window.removeEventListener("keyup", this.boundKeyUpHandler);
    document.body.removeEventListener(
      "touchstart",
      this.boundTouchStartHandler
    );
    document.body.removeEventListener("touchmove", this.boundTouchMoveHandler);
    document.body.removeEventListener("touchend", this.boundTouchEndHandler);
    window.removeEventListener("resize", this.boundResizeHandler);

    logger.info("Simulation cleaned up");
  }

  // Rest of the simulation methods updated to use instance properties
  // ...
}
```

### 2. Update FishCanvas Component

```typescript
// src/components/FishCanvas.tsx

import { useEffect, useRef, useState } from "react";
import { Simulation } from "../lib/Simulation";
import { logger } from "../lib/logging";

const FishCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Store simulation instance in a ref
  const simulationRef = useRef<Simulation | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize simulation
  useEffect(() => {
    if (canvasRef.current) {
      logger.info("Canvas element found, initializing simulation");

      // Make sure canvas is properly sized before initializing simulation
      const canvas = canvasRef.current;
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      try {
        // Create a new simulation instance
        simulationRef.current = new Simulation({
          canvasElement: canvas,
          numFish: Math.min((window.innerWidth / 600) * 50, 50),
        });
        logger.info("Simulation initialized successfully");
      } catch (error) {
        logger.error("Error initializing simulation:", error);
      }
    } else {
      logger.error("Canvas element not found");
    }

    return () => {
      // Clean up the simulation properly when component unmounts
      if (simulationRef.current) {
        simulationRef.current.cleanup();
        simulationRef.current = null;
      }
    };
  }, [dimensions]);

  // The rest of the component remains unchanged
  // ...
};

export default FishCanvas;
```

## Benefits

- Better encapsulation of simulation state
- Improved testability by removing global state
- Ability to create multiple independent simulations if needed
- Proper cleanup of event listeners to prevent memory leaks
- Clearer separation of concerns
- More maintainable and modular codebase

## Acceptance Criteria

- [ ] All static properties in Simulation class are converted to instance properties
- [ ] Event handlers are properly bound to simulation instances
- [ ] Event listeners are properly cleaned up when a simulation is destroyed
- [ ] The FishCanvas component properly manages a simulation instance
- [ ] No global simulation variable is used across components
- [ ] Simulation functions correctly with the new architecture
- [ ] The code remains framework-agnostic in its core functionality
