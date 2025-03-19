# Issue 07: Add Comprehensive JSDoc Documentation

## Description

Add thorough JSDoc documentation to all classes, methods, and functions in the codebase to improve maintainability, provide better IDE support, and make the code more approachable for new developers.

## Problem

The current codebase lacks consistent documentation:

- Most methods and classes lack JSDoc comments explaining their purpose
- Function parameters and return values are not documented
- Complex algorithms aren't explained
- Type definitions lack descriptions
- No clear documentation of the architecture and interactions between components

## Solution

1. Add JSDoc comments to all classes, interfaces, methods, and functions
2. Document parameters, return values, and thrown exceptions
3. Describe complex algorithms and non-obvious behavior
4. Add examples where helpful
5. Set up JSDoc generation as part of the build process

## Implementation Details

### 1. Document the Vector Class

```typescript
// src/lib/Vector.ts

/**
 * A 2D vector implementation with common operations.
 * Used for representing positions, velocities, and forces in the simulation.
 */
export class Vector {
  /** X component of the vector */
  x: number;

  /** Y component of the vector */
  y: number;

  /**
   * Creates a new Vector instance.
   * @param x - The x component
   * @param y - The y component
   */
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /**
   * Sets the x and y components of the vector.
   * @param x - The new x component
   * @param y - The new y component
   * @returns This vector for chaining
   */
  set(x: number, y: number): Vector {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Adds another vector to this vector.
   * @param v - The vector to add
   * @returns This vector for chaining
   */
  add(v: Vector): Vector {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  // ... document other methods similarly

  /**
   * Calculates the magnitude (length) of the vector.
   * @returns The magnitude of the vector
   */
  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Creates a copy of this vector.
   * @returns A new Vector with the same components
   */
  copy(): Vector {
    return new Vector(this.x, this.y);
  }

  /**
   * Generates a random vector with the specified magnitude around an offset.
   * @param offset - Base value to offset the random value
   * @param mag - Maximum magnitude of the random component
   * @returns A new random Vector
   */
  static noise(offset: number, mag: number): Vector {
    return new Vector(
      (Math.random() * 2 - 1) * mag + offset,
      (Math.random() * 2 - 1) * mag + offset
    );
  }
}
```

### 2. Document the Fish Class

```typescript
// src/lib/Fish.ts

import { Vector } from "./Vector";

/**
 * Represents the world in which fish exist and interact.
 */
export interface World {
  /** Width of the world in pixels */
  width: number;

  /** Height of the world in pixels */
  height: number;

  /** All fish in the world */
  creatures: Fish[];
}

/**
 * Represents a fish in the simulation with behavior, appearance, and physical properties.
 * Each fish has its own mass, speed, and can interact with other fish through
 * various behaviors like following, avoiding, chasing, and schooling.
 */
export class Fish {
  /** Flag to show behavior visualization lines */
  static showBehavior = false;

  // ... document other properties

  /**
   * Creates a new Fish.
   * @param mass - The fish's mass, which affects its size, speed, and force
   * @param x - Initial x position
   * @param y - Initial y position
   * @param color - Optional color override (defaults to black)
   */
  constructor(mass: number, x: number, y: number, color: string = "#000000") {
    // ... initialization code
  }

  /**
   * Renders the fish on the canvas.
   * Draws the fish shape and any behavior visualization if enabled.
   * @param ctx - The canvas rendering context
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // ... drawing code
  }

  /**
   * Draws behavior visualization lines when showBehavior is enabled.
   * Shows connections to fish that this fish is avoiding, chasing, or schooling with.
   * @param ctx - The canvas rendering context
   */
  private drawBehavior(ctx: CanvasRenderingContext2D): void {
    // ... behavior visualization code
  }

  /**
   * Updates the fish's position based on its velocity and acceleration.
   * Called once per simulation step.
   */
  update(): void {
    // ... update code
  }

  /**
   * Applies a force to the fish, affecting its acceleration.
   * @param f - The force vector to apply
   */
  applyForce(f: Vector): void {
    this.acceleration.add(f);
  }

  // ... document other methods

  /**
   * Implements schooling behavior with similar-sized fish.
   * This combines separation, alignment, and cohesion behaviors.
   * @param neighbors - List of fish to school with
   */
  shoal(neighbors: Fish[]): void {
    this.shoalList = neighbors;

    // Calculate separation, alignment, and cohesion forces
    const sep = this.separate(neighbors, this.separationRange).limit(
      this.maxforce
    );
    const ali = this.align(neighbors).limit(this.maxforce);
    const cohe = this.cohesion(neighbors).limit(this.maxforce);

    // Apply relative weights to each force
    sep.mul(1.4); // Separation has highest priority
    ali.mul(1.2); // Alignment has medium priority
    cohe.mul(1.0); // Cohesion has lowest priority

    // Apply the forces
    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(cohe);

    if (Fish.showBehavior) {
      this.color = "black";
    }
  }
}
```

### 3. Document the Simulation Class

```typescript
// src/lib/Simulation.ts

/**
 * Configuration options for creating a simulation.
 */
export interface SimulationOptions {
  /** The canvas element where the simulation will be rendered */
  canvasElement: HTMLCanvasElement;

  /** Optional number of fish to create (defaults to a calculation based on screen width) */
  numFish?: number;

  /** Optional initial animation interval in ms (defaults to SIMULATION.NORMAL_INTERVAL) */
  initialInterval?: number;
}

/**
 * The main simulation class that manages the fish, rendering, and user interaction.
 * Handles the animation loop, event processing, and coordinates all fish behaviors.
 */
export class Simulation {
  // ... properties

  /**
   * Creates a new fish simulation.
   * Initializes the canvas, sets up event listeners, and creates the initial fish.
   * @param options - Configuration options for the simulation
   * @throws Error if canvas context cannot be obtained
   */
  constructor(options: SimulationOptions) {
    // ... initialization
  }

  /**
   * Handles window resize events by updating the simulation dimensions.
   * Adjusts the world size and ensures fish remain within the new boundaries.
   */
  private resize(): void {
    // ... resize logic
  }

  /**
   * Initializes the fish population based on screen size.
   * Creates fish with random positions, sizes, and initial velocities.
   * @param numFish - Optional override for the number of fish to create
   */
  private initFish(numFish?: number): void {
    // ... fish initialization
  }

  /**
   * Performs a single simulation step.
   * Updates fish behavior, positions, and renders all fish.
   * Called repeatedly by the animation loop.
   */
  private timestep(): void {
    // ... simulation step logic
  }

  /**
   * Starts the simulation loop.
   * Sets up the animation interval and initializes any necessary state.
   */
  public start(): void {
    // ... start logic
  }

  /**
   * Stops the simulation loop.
   * Clears the animation interval and performs any necessary cleanup.
   */
  public stop(): void {
    // ... stop logic
  }

  /**
   * Cleans up resources used by the simulation.
   * Removes event listeners and stops the animation.
   * Should be called when the simulation is no longer needed.
   */
  public cleanup(): void {
    // ... cleanup logic
  }
}
```

### 4. Set Up JSDoc Generation

Add JSDoc configuration:

```json
// jsdoc.json
{
  "source": {
    "include": ["src"],
    "exclude": ["node_modules", "dist"]
  },
  "opts": {
    "destination": "./docs",
    "recurse": true,
    "template": "node_modules/clean-jsdoc-theme",
    "theme_opts": {
      "default_theme": "light",
      "homepageTitle": "Fish Simulation Documentation"
    }
  },
  "plugins": ["plugins/markdown"],
  "markdown": {
    "hardwrap": false,
    "idInHeadings": true
  },
  "templates": {
    "cleverLinks": true,
    "monospaceLinks": false
  }
}
```

Add JSDoc generation script to package.json:

```json
"scripts": {
  "docs": "jsdoc -c jsdoc.json"
}
```

## Benefits

- Improved code understanding for new developers
- Better IDE support with accurate type information and descriptions
- Self-documenting codebase that explains architectural decisions
- Easier maintenance and updates
- Clear expectations for function inputs and outputs
- Documentation of complex algorithms and behaviors

## Acceptance Criteria

- [ ] All public classes, methods, and functions have JSDoc comments
- [ ] All method parameters and return values are documented
- [ ] Complex algorithms and behaviors have explanatory comments
- [ ] Type definitions and interfaces are documented
- [ ] JSDoc configuration is set up for generating HTML documentation
- [ ] Documentation script is added to package.json
- [ ] Documentation is generated successfully without errors
- [ ] Generated documentation accurately reflects the codebase
