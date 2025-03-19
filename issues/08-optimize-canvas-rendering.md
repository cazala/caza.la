# Issue 08: Optimize Canvas Rendering Performance

## Description

Optimize the canvas rendering process to improve performance, reduce unnecessary redraws, and enable smoother animation, especially on mobile devices.

## Problem

The current canvas rendering implementation has several inefficiencies:

- Full screen is cleared and redrawn on every frame
- No usage of requestAnimationFrame for optimal timing
- No double buffering to prevent flickering
- No optimization for offscreen elements
- Alpha blending could be more efficient
- No detection of animation frame drops

## Solution

1. Implement proper requestAnimationFrame-based animation loop
2. Use double buffering to prevent flickering
3. Add performance monitoring to track FPS
4. Optimize clearing/redrawing strategy
5. Add culling for offscreen fish
6. Implement adaptive quality based on device performance

## Implementation Details

### 1. Implement requestAnimationFrame Animation Loop

```typescript
// src/lib/Simulation.ts (partial)

export class Simulation {
  // ... existing properties

  // Add FPS tracking
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsUpdateInterval: number = 500; // ms
  private lastFpsUpdate: number = 0;
  private animationFrameId: number | null = null;
  private showFps: boolean = false; // For debugging

  // Replace interval-based animation with requestAnimationFrame
  private animate(timestamp: number): void {
    // Calculate FPS
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
      this.lastFpsUpdate = timestamp;
    }

    const elapsed = timestamp - this.lastFrameTime;
    this.frameCount++;

    // Update FPS every fpsUpdateInterval
    if (timestamp - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (timestamp - this.lastFpsUpdate)
      );
      this.lastFpsUpdate = timestamp;
      this.frameCount = 0;

      // Optionally log FPS for debugging
      logger.debug(`Current FPS: ${this.fps}`);
    }

    // Only update at the desired interval
    if (elapsed >= this.interval) {
      this.lastFrameTime = timestamp;
      this.timestep();
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  // Update start and stop methods
  public start(): void {
    logger.info("Starting simulation");
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    logger.info("Simulation stopped");
  }
}
```

### 2. Implement Double Buffering

```typescript
// src/lib/Simulation.ts (partial)

export class Simulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  // Add offscreen canvas for double buffering
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  constructor(options: SimulationOptions) {
    this.canvas = options.canvasElement;
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }
    this.ctx = context;

    // Set up offscreen canvas
    try {
      // Try to use OffscreenCanvas for better performance
      this.offscreenCanvas = new OffscreenCanvas(
        this.canvas.width,
        this.canvas.height
      );
    } catch (e) {
      // Fall back to regular canvas if OffscreenCanvas is not supported
      this.offscreenCanvas = document.createElement("canvas");
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
    }

    const offContext = this.offscreenCanvas.getContext("2d");
    if (!offContext) {
      throw new Error("Could not get offscreen canvas context");
    }
    this.offscreenCtx = offContext;

    // ... rest of constructor
  }

  // Update resize method to handle offscreen canvas
  private resize(): void {
    // ... existing resize code

    // Resize offscreen canvas
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
  }

  // Update timestep to use double buffering
  private timestep(): void {
    // Clear the offscreen canvas
    this.offscreenCtx.globalAlpha = 0.2 + 0.6 * this.alpha;
    this.offscreenCtx.fillStyle = "#ffffff";
    this.offscreenCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.offscreenCtx.globalAlpha = this.alpha;

    // Render fish to offscreen canvas
    for (const fish of this.world.creatures) {
      // Only render fish that are on-screen or close to the edges
      if (this.isFishVisible(fish)) {
        // ... existing fish update code

        // Use offscreenCtx instead of ctx
        fish.update();
        fish.draw(this.offscreenCtx);
      }
    }

    // Draw FPS counter if enabled
    if (this.showFps) {
      this.drawFps(this.offscreenCtx);
    }

    // Copy offscreen canvas to visible canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  // Helper to check if a fish is visible or close to screen
  private isFishVisible(fish: Fish): boolean {
    const margin = fish.length * 2; // Add margin so fish don't pop in/out suddenly
    return (
      fish.location.x + margin >= 0 &&
      fish.location.x - margin <= this.canvas.width &&
      fish.location.y + margin >= 0 &&
      fish.location.y - margin <= this.canvas.height
    );
  }

  // Draw FPS counter for debugging
  private drawFps(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText(`FPS: ${this.fps}`, 10, 20);
  }
}
```

### 3. Implement Adaptive Quality

```typescript
// src/lib/Simulation.ts (partial)

export class Simulation {
  // Add adaptive quality settings
  private adaptiveQuality: boolean = true;
  private qualityLevels = {
    high: { fishMax: 100, detailLevel: 3 },
    medium: { fishMax: 60, detailLevel: 2 },
    low: { fishMax: 30, detailLevel: 1 },
  };
  private currentQuality: "high" | "medium" | "low" = "high";
  private fpsThreshold = { low: 30, medium: 45 };
  private fpsHistory: number[] = [];
  private fpsHistorySize = 10;

  // Update FPS monitoring to adjust quality
  private updateAdaptiveQuality(): void {
    if (!this.adaptiveQuality) return;

    // Add current FPS to history
    this.fpsHistory.push(this.fps);
    if (this.fpsHistory.length > this.fpsHistorySize) {
      this.fpsHistory.shift();
    }

    // Need enough samples to make a decision
    if (this.fpsHistory.length < this.fpsHistorySize) return;

    // Calculate average FPS
    const avgFps =
      this.fpsHistory.reduce((sum, fps) => sum + fps, 0) /
      this.fpsHistory.length;

    // Adjust quality based on FPS
    const previousQuality = this.currentQuality;

    if (avgFps < this.fpsThreshold.low && this.currentQuality !== "low") {
      this.currentQuality = "low";
    } else if (
      avgFps >= this.fpsThreshold.low &&
      avgFps < this.fpsThreshold.medium &&
      this.currentQuality !== "medium"
    ) {
      this.currentQuality = "medium";
    } else if (
      avgFps >= this.fpsThreshold.medium &&
      this.currentQuality !== "high"
    ) {
      this.currentQuality = "high";
    }

    // If quality changed, adjust settings
    if (previousQuality !== this.currentQuality) {
      this.applyQualitySettings();
    }
  }

  private applyQualitySettings(): void {
    const settings = this.qualityLevels[this.currentQuality];

    // Adjust number of fish
    const currentFishCount = this.world.creatures.length;
    const targetFishCount = settings.fishMax;

    if (currentFishCount > targetFishCount) {
      // Remove excess fish
      this.world.creatures = this.world.creatures.slice(0, targetCount);
    } else if (currentFishCount < targetFishCount) {
      // Add more fish
      this.addFish(targetCount - currentFishCount);
    }

    // Set detail level on fish
    for (const fish of this.world.creatures) {
      fish.detailLevel = settings.detailLevel;
    }

    logger.info(
      `Adjusted quality to ${this.currentQuality}: ${this.world.creatures.length} fish`
    );
  }

  // Method to add fish
  private addFish(count: number): void {
    for (let i = 0; i < count; i++) {
      const mass =
        0.5 + Math.random() * Math.random() * Math.random() * Math.random() * 2;
      const x = Math.random() * this.world.width;
      const y = Math.random() * this.world.height;
      this.world.creatures.push(new Fish(mass, x, y));
    }
  }

  // Update animate method to call quality adjustment
  private animate(timestamp: number): void {
    // ... existing animation code

    // Update adaptive quality every few seconds
    if (timestamp - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      // ... existing FPS update code

      // Update quality settings based on performance
      this.updateAdaptiveQuality();
    }

    // ... rest of animation code
  }
}
```

### 4. Update Fish Class for Adaptive Detail

```typescript
// src/lib/Fish.ts (partial)

export class Fish {
  // Add detail level property
  detailLevel: number = 3; // 3 = high, 2 = medium, 1 = low

  // Update draw method to adapt to detail level
  draw(ctx: CanvasRenderingContext2D): void {
    // Only draw behavior lines at high detail
    if (this.detailLevel === 3) {
      this.drawBehavior(ctx);
    }

    const angle = this.velocity.angle();

    // Draw simpler shapes for lower detail levels
    if (this.detailLevel === 1) {
      // Simple triangle for low detail
      const x1 = this.location.x + Math.cos(angle) * this.base;
      const y1 = this.location.y + Math.sin(angle) * this.base;

      const x = this.location.x - Math.cos(angle) * this.length;
      const y = this.location.y - Math.sin(angle) * this.length;

      const x2 = this.location.x + Math.cos(angle + this.HALF_PI) * this.base;
      const y2 = this.location.y + Math.sin(angle + this.HALF_PI) * this.base;

      const x3 = this.location.x + Math.cos(angle - this.HALF_PI) * this.base;
      const y3 = this.location.y + Math.sin(angle - this.HALF_PI) * this.base;

      ctx.fillStyle = this.color || "#000000";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x, y);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
    } else {
      // Full detail fish with outline for medium/high detail
      // ... existing draw code
    }
  }
}
```

## Benefits

- Smoother animation with consistent frame timing
- Better performance, especially on mobile devices
- Prevention of flickering through double buffering
- Automatic adaptation to device capabilities
- Visible performance metrics for debugging
- Reduced power consumption by optimizing rendering

## Acceptance Criteria

- [ ] Animation uses requestAnimationFrame instead of setInterval
- [ ] Double buffering is implemented to prevent flickering
- [ ] Offscreen fish are not processed (culling)
- [ ] FPS monitoring is implemented
- [ ] Adaptive quality adjusts based on device performance
- [ ] No visual regression on high-end devices
- [ ] Improved performance on low-end devices
- [ ] Option to show/hide FPS counter for debugging
