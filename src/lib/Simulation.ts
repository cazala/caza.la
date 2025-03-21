import { Fish, World } from './Fish';
import { Vector } from './Vector';
import { logger } from './logging';
import { FISH, SIMULATION, MATH } from './constants';
import {
  updatePositionFromEvent,
  isQuickInteraction,
  shouldIgnoreMouseAfterTouch,
} from './event-utils';
import { categorizeFishByMass } from './behavior-utils';
import { SpatialGrid } from './SpatialGrid';

/**
 * Configuration options for initializing a Simulation.
 */
export interface SimulationOptions {
  /**
   * The HTML canvas element where the simulation will be rendered.
   */
  canvasElement: HTMLCanvasElement;
  /**
   * Optional. The number of fish to create in the simulation.
   * If not provided, the number will be calculated based on screen size.
   */
  numFish?: number;
  /**
   * Optional. The initial animation interval in milliseconds.
   * Controls the simulation speed.
   */
  initialInterval?: number;
}

export class Simulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  // Add offscreen canvas for double buffering
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
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
  private alpha: number = SIMULATION.DEFAULT_ALPHA;
  private timeline: number | null = null;
  // Flag to show fish behavior visualization
  private showBehavior: boolean = false;

  // Spatial partitioning grid
  private spatialGrid: SpatialGrid;

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
  private boundDisplayChangeHandler: () => void;

  // Track highlighted fish index
  private highlightedFishIndex: number | undefined;

  // Add FPS tracking
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsUpdateInterval: number = 500; // ms
  private lastFpsUpdate: number = 0;
  private animationFrameId: number | null = null;
  private showFps: boolean = false; // For debugging

  // Add adaptive quality settings
  private adaptiveQuality: boolean = true;
  private qualityLevels = {
    high: { fishMax: SIMULATION.MAX_FISH, detailLevel: 3 },
    medium: { fishMax: 60, detailLevel: 2 },
    low: { fishMax: 30, detailLevel: 1 },
  };
  private currentQuality: 'high' | 'medium' | 'low' = 'high';
  private fpsThreshold = { low: 30, medium: 45 };
  private fpsHistory: number[] = [];
  private fpsHistorySize = 10;

  /**
   * Creates a new fish simulation instance.
   *
   * @param options - Configuration options for the simulation
   * @throws Error if canvas context cannot be obtained
   */
  constructor(options: SimulationOptions) {
    this.canvas = options.canvasElement;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    this.ctx = context;

    // Set up offscreen canvas for double buffering
    try {
      // Try to use OffscreenCanvas for better performance
      this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
    } catch (e) {
      // Fall back to regular canvas if OffscreenCanvas is not supported
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
    }

    const offContext = this.offscreenCanvas.getContext('2d');
    if (!offContext) {
      throw new Error('Could not get offscreen canvas context');
    }
    this.offscreenCtx = offContext as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

    this.interval = options.initialInterval || SIMULATION.NORMAL_INTERVAL;

    logger.info(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);

    // Initialize world dimensions
    this.world.width = this.canvas.width;
    this.world.height = this.canvas.height;

    // Initialize spatial grid
    this.spatialGrid = new SpatialGrid(
      this.world.width,
      this.world.height,
      SIMULATION.SPATIAL_CELL_SIZE
    );
    logger.info('Spatial grid initialized');

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
    this.boundDisplayChangeHandler = this.handleDisplayChange.bind(this);

    this.setupEventListeners();
    this.resize();
    this.initFish(options.numFish);

    // Draw once immediately to ensure fish are visible
    this.timestep();

    // Then start the animation loop
    this.start();
  }

  /**
   * Handles mouse movement events.
   *
   * Updates the internal mouse position vector based on the current mouse coordinates.
   * Implements touch prevention logic to avoid conflicts between touch and mouse events.
   *
   * @param e - The mouse move event containing position information
   * @private
   */
  private handleMouseMove(e: MouseEvent): void {
    if (
      shouldIgnoreMouseAfterTouch(
        this.isTouchDevice,
        this.lastTouchTime,
        SIMULATION.TOUCH_MOUSE_PREVENTION_TIMEOUT
      )
    ) {
      return;
    }
    updatePositionFromEvent(e, this.mouse, this.canvas);
  }

  /**
   * Handles mouse button down events.
   *
   * Activates fish following behavior and records the time of the mouse press.
   * Implements touch prevention logic to avoid conflicts between touch and mouse events.
   *
   * @private
   */
  private handleMouseDown(): void {
    if (
      shouldIgnoreMouseAfterTouch(
        this.isTouchDevice,
        this.lastTouchTime,
        SIMULATION.TOUCH_MOUSE_PREVENTION_TIMEOUT
      )
    ) {
      return;
    }
    this.follow = true;
    this.mouseDownTime = Date.now();
    logger.info('Mouse down event triggered, follow set to:', this.follow);
  }

  /**
   * Handles keyboard key down events.
   *
   * Currently only logs the key press - may be expanded for keyboard controls.
   *
   * @param e - The keyboard event containing key information
   * @private
   */
  private handleKeyDown(e: KeyboardEvent): void {
    logger.info('Key down event triggered:', e.key);
  }

  /**
   * Handles keyboard key up events.
   *
   * Processes specific key releases to trigger simulation actions:
   * - Space key: Toggles slow motion mode by switching between fast and slow intervals
   * - F key: Toggles FPS display
   *
   * @param e - The keyboard event containing key information
   * @private
   */
  private handleKeyUp(e: KeyboardEvent): void {
    logger.info('Key up event triggered:', e.key);

    if (e.key === ' ' || e.key === 'Spacebar') {
      logger.info('Space key detected, toggling slowmo');
      if (this.slowmo) {
        this.fast();
      } else {
        this.slow();
      }
      this.slowmo = !this.slowmo;
    } else if (e.key === 'f' || e.key === 'F') {
      logger.info('F key detected, toggling FPS display');
      this.toggleFps();
    }
  }

  /**
   * Handles mouse button up events.
   *
   * Deactivates fish following behavior and processes quick interactions:
   * - Quick clicks toggle behavior visualization
   *
   * Implements touch prevention logic to avoid conflicts between touch and mouse events.
   *
   * @private
   */
  private handleMouseUp(): void {
    if (
      shouldIgnoreMouseAfterTouch(
        this.isTouchDevice,
        this.lastTouchTime,
        SIMULATION.TOUCH_MOUSE_PREVENTION_TIMEOUT
      )
    ) {
      return;
    }

    this.follow = false;

    // Only toggle behavior if it was a quick click
    if (isQuickInteraction(this.mouseDownTime, SIMULATION.CLICK_THRESHOLD)) {
      logger.info('Quick click detected, toggling behavior');
      this.showBehavior = !this.showBehavior;
      Fish.showBehavior = this.showBehavior; // Keep for backward compatibility
    } else {
      logger.info('Not a quick click, just stopping follow');
    }

    this.mouseDownTime = null;
  }

  /**
   * Handles touch start events.
   *
   * This method:
   * 1. Marks the device as a touch device to help handle synthetic mouse events
   * 2. Records the current time for touch-mouse conflict prevention
   * 3. Activates fish following behavior
   * 4. Updates the mouse position to the touch location
   *
   * @param e - The touch event containing touch information
   * @private
   */
  private handleTouchStart(e: TouchEvent): void {
    // Mark that this is a touch device - this helps ignore subsequent mouse events
    this.isTouchDevice = true;
    this.lastTouchTime = Date.now();

    this.follow = true;
    this.mouseDownTime = Date.now();
    updatePositionFromEvent(e.changedTouches[0], this.mouse, this.canvas);
  }

  /**
   * Handles touch move events.
   *
   * Updates the internal mouse position to match the touch position
   * and refreshes the touch timestamp to prevent synthetic mouse events.
   *
   * @param e - The touch event containing touch information
   * @private
   */
  private handleTouchMove(e: TouchEvent): void {
    // Update touch timestamp to continue ignoring synthetic mouse events
    this.lastTouchTime = Date.now();
    updatePositionFromEvent(e.changedTouches[0], this.mouse, this.canvas);
    e.preventDefault();
  }

  /**
   * Handles touch end events.
   *
   * This method:
   * 1. Updates touch timestamp to prevent synthetic mouse events
   * 2. Deactivates fish following behavior
   * 3. Processes quick taps to toggle behavior visualization
   * 4. Handles multi-touch gestures (2+ fingers) to toggle behavior visualization
   *
   * @param e - The touch event containing touch information
   * @private
   */
  private handleTouchEnd(e: TouchEvent): void {
    // Update touch timestamp to ignore upcoming synthetic mouse events
    this.lastTouchTime = Date.now();
    this.follow = false;

    // Only toggle behavior if it was a quick tap
    if (isQuickInteraction(this.mouseDownTime, SIMULATION.CLICK_THRESHOLD)) {
      logger.info('Quick tap detected, toggling behavior');
      this.showBehavior = !this.showBehavior;
      Fish.showBehavior = this.showBehavior; // Keep for backward compatibility
    }

    this.mouseDownTime = null;

    // Keep the multi-touch gesture for toggling behavior
    if (e.changedTouches.length >= 2) {
      this.showBehavior = !this.showBehavior;
      Fish.showBehavior = this.showBehavior; // Keep for backward compatibility
    }
  }

  /**
   * Sets up all event listeners needed by the simulation.
   *
   * This method attaches event handlers for:
   * - Mouse movement, clicks, and up/down events
   * - Touch events for mobile devices
   * - Keyboard events for controls
   * - Window resize events
   *
   * All handlers are properly bound to this instance to maintain correct context.
   *
   * @private
   */
  private setupEventListeners(): void {
    logger.info('Setting up event listeners for simulation instance');

    window.addEventListener('mousemove', this.boundMouseMoveHandler);
    window.addEventListener('mousedown', this.boundMouseDownHandler);
    window.addEventListener('mouseup', this.boundMouseUpHandler);
    window.addEventListener('keydown', this.boundKeyDownHandler);
    window.addEventListener('keyup', this.boundKeyUpHandler);
    document.body.addEventListener('touchstart', this.boundTouchStartHandler, false);
    document.body.addEventListener('touchmove', this.boundTouchMoveHandler, false);
    document.body.addEventListener('touchend', this.boundTouchEndHandler, false);
    window.addEventListener('resize', this.boundResizeHandler);

    // Add listener for possible DPR changes
    window
      .matchMedia('(resolution: 1dppx)')
      .addEventListener('change', this.boundDisplayChangeHandler);

    logger.info('All event listeners attached successfully');
  }

  /**
   * Cleans up resources used by the simulation.
   *
   * This method performs a complete cleanup by:
   * 1. Stopping the animation loop
   * 2. Removing all event listeners that were added during initialization
   *
   * This should be called when the simulation is no longer needed or
   * before the component containing it is unmounted to prevent memory leaks.
   */
  public cleanup(): void {
    logger.info('Starting simulation cleanup process');

    // Stop the animation
    this.stop();
    logger.info('Animation stopped');

    // Remove event listeners
    logger.info('Removing event listeners');
    window.removeEventListener('mousemove', this.boundMouseMoveHandler);
    window.removeEventListener('mousedown', this.boundMouseDownHandler);
    window.removeEventListener('mouseup', this.boundMouseUpHandler);
    window.removeEventListener('keydown', this.boundKeyDownHandler);
    window.removeEventListener('keyup', this.boundKeyUpHandler);
    document.body.removeEventListener('touchstart', this.boundTouchStartHandler);
    document.body.removeEventListener('touchmove', this.boundTouchMoveHandler);
    document.body.removeEventListener('touchend', this.boundTouchEndHandler);
    window.removeEventListener('resize', this.boundResizeHandler);

    // Remove display change listener
    try {
      window
        .matchMedia('(resolution: 1dppx)')
        .removeEventListener('change', this.boundDisplayChangeHandler);
    } catch (e) {
      logger.warn('Could not remove display change listener', e);
    }

    logger.info('Simulation cleanup completed');
  }

  /**
   * Handles window resize events by adjusting the simulation dimensions.
   *
   * This method:
   * 1. Updates the world width and height based on the canvas dimensions
   * 2. Resizes the spatial partitioning grid
   * 3. Ensures all fish remain within the new boundaries
   * 4. Resizes the offscreen canvas to match
   * 5. Adjusts fish count when window size changes significantly
   *
   * It's called automatically when the window is resized.
   *
   * @private
   */
  private resize(): void {
    logger.info('Resizing simulation');

    // Store previous dimensions for scaling
    const prevWidth = this.world.width;
    const prevHeight = this.world.height;

    // Ensure canvas dimensions match the container/window
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;

    // Update world dimensions
    this.world.width = this.canvas.width;
    this.world.height = this.canvas.height;

    // Resize spatial grid
    this.spatialGrid.resize(this.world.width, this.world.height);

    // Resize offscreen canvas
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;

    // Scale fish positions to match the new dimensions
    if (prevWidth > 0 && prevHeight > 0) {
      const widthRatio = this.world.width / prevWidth;
      const heightRatio = this.world.height / prevHeight;

      for (const fish of this.world.creatures) {
        // Scale fish position by the ratio of new to old dimensions
        fish.location.x *= widthRatio;
        fish.location.y *= heightRatio;

        // Ensure fish are within bounds
        fish.location.x = Math.min(
          Math.max(fish.location.x, SIMULATION.BOUNDARY_DISTANCE),
          this.world.width - SIMULATION.BOUNDARY_DISTANCE
        );
        fish.location.y = Math.min(
          Math.max(fish.location.y, SIMULATION.BOUNDARY_DISTANCE),
          this.world.height - SIMULATION.BOUNDARY_DISTANCE
        );
      }

      // If the window size increased significantly, adjust fish count
      if (this.currentQuality === 'high' && (widthRatio > 1.2 || heightRatio > 1.2)) {
        // Calculate the ideal fish count for this screen size
        const scaledWidth = this.canvas.width / dpr;
        const idealFishCount = Math.min(
          Math.max((scaledWidth / 600) * 50, SIMULATION.MIN_FISH),
          SIMULATION.MAX_FISH
        );

        // Only add more fish if we're below the ideal count
        if (idealFishCount > this.world.creatures.length) {
          const additionalFish = Math.min(
            idealFishCount - this.world.creatures.length,
            SIMULATION.MAX_FISH - this.world.creatures.length
          );

          if (additionalFish > 0) {
            this.addFish(additionalFish);
            logger.info(
              `Added ${additionalFish} fish after resize, new total: ${this.world.creatures.length}`
            );
          }
        }
      }
    }

    logger.info(`Canvas resized to ${this.canvas.width}x${this.canvas.height} (DPR: ${dpr})`);
  }

  /**
   * Initializes the fish population for the simulation.
   *
   * This method:
   * 1. Clears any existing fish from the world
   * 2. Calculates an appropriate number of fish based on screen size (if not specified)
   * 3. Creates fish with random positions, masses, and initial velocities
   *
   * Each fish is assigned properties that affect its appearance and behavior
   * based on its randomly generated mass.
   *
   * @param numFish - Optional number of fish to create. If not provided,
   *                 the number is calculated based on screen width.
   * @private
   */
  private initFish(numFish?: number): void {
    // Clear any existing fish
    this.world.creatures = [];

    // Calculate number of fish based on screen size or use provided value
    // Use canvas.width which already factors in DPR instead of window.innerWidth
    const dpr = window.devicePixelRatio || 1;
    const scaledWidth = this.canvas.width / dpr; // Convert back to CSS pixels for comparison
    const fishCount =
      numFish ||
      Math.min(
        Math.max((scaledWidth / 600) * 50, SIMULATION.MIN_FISH),
        // Base number on actual canvas size (with DPR)
        Math.min((this.canvas.width / 600) * 50, SIMULATION.MAX_FISH)
      );

    logger.info(
      `Initializing ${fishCount} fish for simulation (DPR: ${dpr}, canvas width: ${this.canvas.width})`
    );

    // Create fish with random positions and sizes
    for (let i = 0; i < fishCount; i++) {
      const mass = 0.5 + Math.random() * Math.random() * Math.random() * Math.random() * 2;
      const x = Math.random() * this.world.width;
      const y = Math.random() * this.world.height;

      logger.debug(
        `Creating fish ${i}: mass=${mass.toFixed(2)}, position=(${x.toFixed(0)}, ${y.toFixed(0)})`
      );

      this.world.creatures.push(new Fish(mass, x, y));
    }

    logger.info(`Created ${this.world.creatures.length} fish successfully`);
  }

  /**
   * Performs a single simulation step, updating and rendering all fish.
   *
   * This is the core simulation method that:
   * 1. Clears the canvas
   * 2. Updates the spatial partitioning grid with current fish positions
   * 3. Draws the spatial grid visualization if enabled
   * 4. Finds and highlights the fish closest to the mouse cursor
   * 5. Updates each fish's behavior based on nearby fish (using spatial queries)
   * 6. Applies forces, updates positions, and renders each fish
   * 7. Draws the information panel if behavior visualization is enabled
   *
   * This method is called repeatedly by the animation loop to create the simulation.
   *
   * @private
   */
  private timestep(): void {
    // Clear the offscreen canvas
    this.offscreenCtx.globalAlpha = 0.2 + 0.6 * this.alpha;
    this.offscreenCtx.fillStyle = SIMULATION.BACKGROUND_COLOR;
    this.offscreenCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.offscreenCtx.globalAlpha = this.alpha;

    // Ensure Fish.showBehavior is in sync with this instance's showBehavior
    Fish.showBehavior = this.showBehavior;

    // Update spatial grid with current fish positions
    this.spatialGrid.updateGrid(this.world.creatures);

    // Draw the spatial grid when showBehavior is enabled
    if (this.showBehavior) {
      // Find the fish closest to the mouse cursor instead of selecting a random one
      if (this.world.creatures.length > 0) {
        let closestFish = this.world.creatures[0];
        let minDistance = this.mouse.dist(closestFish.location);

        // Find the fish closest to the mouse cursor
        for (const fish of this.world.creatures) {
          const distance = this.mouse.dist(fish.location);
          if (distance < minDistance) {
            minDistance = distance;
            closestFish = fish;
          }
        }

        // Store the index of the closest fish
        this.highlightedFishIndex = this.world.creatures.indexOf(closestFish);
      }

      if (this.highlightedFishIndex !== undefined && this.world.creatures.length > 0) {
        const highlightedFish = this.world.creatures[this.highlightedFishIndex];
        this.spatialGrid.drawGrid(
          this.offscreenCtx as CanvasRenderingContext2D,
          this.world.width,
          this.world.height,
          highlightedFish.lookRange,
          highlightedFish.location
        );

        // Save canvas state
        this.offscreenCtx.save();

        // Draw a line from the mouse to the highlighted fish
        this.offscreenCtx.strokeStyle = 'rgba(70, 130, 180, 0.6)'; // Steel blue, semi-transparent
        this.offscreenCtx.setLineDash([8, 4]); // Dashed line
        this.offscreenCtx.lineWidth = 2;
        this.offscreenCtx.beginPath();
        this.offscreenCtx.moveTo(this.mouse.x, this.mouse.y);
        this.offscreenCtx.lineTo(highlightedFish.location.x, highlightedFish.location.y);
        this.offscreenCtx.stroke();

        // Draw a small circle at the mouse position
        this.offscreenCtx.fillStyle = 'rgba(70, 130, 180, 0.6)';
        this.offscreenCtx.beginPath();
        this.offscreenCtx.arc(this.mouse.x, this.mouse.y, 6, 0, Math.PI * 2);
        this.offscreenCtx.fill();

        this.offscreenCtx.restore();
      } else {
        this.spatialGrid.drawGrid(
          this.offscreenCtx as CanvasRenderingContext2D,
          this.world.width,
          this.world.height
        );
      }
    }

    for (const fish of this.world.creatures) {
      // Only update and render fish that are on-screen or close to the edges (culling)
      if (this.isFishVisible(fish)) {
        if (this.follow) {
          fish.follow(this.mouse, FISH.FOLLOW_RADIUS);
        }

        // Use spatial partitioning for more efficient neighbor lookup
        const nearbyFish = this.spatialGrid.query(fish.location, fish.lookRange);
        const neighbors = fish.filterVisibleNeighbors(nearbyFish, MATH.FULL_CIRCLE);

        const { bigger, similar, smaller } = categorizeFishByMass(
          fish,
          neighbors,
          FISH.MASS_THRESHOLD_BIGGER,
          FISH.MASS_THRESHOLD_SMALLER
        );

        if (similar.length) {
          fish.shoal(similar);
        } else {
          fish.wander();
        }

        fish.boundaries(this.world);

        if (bigger.length) {
          fish.avoid(bigger, FISH.AVOID_RANGE);
        }

        if (smaller.length) {
          fish.chase(smaller);
        }

        fish.update();
        fish.draw(this.offscreenCtx as CanvasRenderingContext2D);
      }
    }

    // If showBehavior is enabled, display additional information about the spatial grid
    if (this.showBehavior) {
      this.drawGridInfo();
    }

    // Draw FPS counter if enabled or if behavior visualization is enabled
    if (this.showFps || this.showBehavior) {
      this.drawFps(this.offscreenCtx as CanvasRenderingContext2D);
    }

    // Copy offscreen canvas to visible canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  /**
   * Draw FPS counter for debugging
   *
   * @param ctx - The canvas context to draw the FPS counter
   * @private
   */
  private drawFps(ctx: CanvasRenderingContext2D): void {
    const dpr = window.devicePixelRatio || 1;
    const baseFontSize = 16;
    const scaledFontSize = baseFontSize * Math.max(1, Math.min(1.75, dpr)); // Cap the scaling to 1.75x

    ctx.fillStyle = 'black';
    ctx.font = `${scaledFontSize}px Arial`;

    // Position at bottom left corner with some margin
    const margin = 10 * Math.max(1, Math.min(1.2, dpr));
    const text = `FPS: ${this.fps} (${this.currentQuality})`;
    const metrics = ctx.measureText(text);
    const textHeight = scaledFontSize;

    // Draw with background for better visibility
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(
      margin - 5,
      this.canvas.height - margin - textHeight - 5,
      metrics.width + 10,
      textHeight + 10
    );

    ctx.fillStyle = 'black';
    ctx.fillText(text, margin, this.canvas.height - margin);
  }

  /**
   * Draws additional information about the spatial grid as an overlay panel.
   *
   * This method renders a semi-transparent information panel in the top-left corner
   * of the canvas that displays statistics and details about the spatial partitioning
   * grid and the currently highlighted fish. The panel includes:
   *
   * - Cell size of the spatial grid
   * - Explanation of visualization elements (grid lines and cell colors)
   * - Number of occupied cells and total fish count
   * - Maximum fish count in any single cell
   * - Details about the highlighted fish (if any)
   *
   * The panel automatically adapts its layout and content based on the screen size,
   * with different displays for desktop, narrow, and mobile screens.
   *
   * @private
   */
  private drawGridInfo(): void {
    const cellSize = this.spatialGrid.getCellSize();
    const stats = this.spatialGrid.getGridStats();

    // Scale font size based on DPR - make text larger
    const dpr = window.devicePixelRatio || 1;
    const baseFontSize = 14; // Increased from 12
    const scaledFontSize = baseFontSize * Math.max(1, Math.min(1.75, dpr)); // Cap scaling to 1.75x
    const lineHeight = scaledFontSize * 1.5;

    // Set up font and measure text to determine background size
    this.offscreenCtx.font = `${scaledFontSize}px Arial`;
    this.offscreenCtx.save();

    // Position the info at the top-left corner with a small margin
    const margin = 15 * Math.max(1, Math.min(1.2, dpr)); // Increased margin
    const x = margin;
    const y = margin + lineHeight;

    // Create text lines for the info panel, adapting to screen width
    const isNarrowScreen = this.canvas.width < 500 * dpr; // Adjust threshold for DPR
    const isMobileScreen = this.canvas.width < 380 * dpr; // Adjust threshold for DPR

    const lines = [];
    lines.push(`Spatial Grid: Cell Size = ${cellSize}px`);

    if (isNarrowScreen) {
      lines.push(`Blue lines = grid boundaries`);
      lines.push(`Blue cells = occupied with fish`);
    } else {
      lines.push(`Grid Visualization: Blue lines = grid boundaries, Blue cells = occupied`);
    }

    lines.push(`Occupied Cells: ${stats.occupiedCells}, Total Fish: ${stats.fishCount}`);
    lines.push(`Maximum Fish in a Single Cell: ${stats.maxFishInCell}`);

    // Add highlighted fish info as potentially multiple lines for narrow screens
    if (this.highlightedFishIndex !== undefined && this.world.creatures.length > 0) {
      const highlightedFish = this.world.creatures[this.highlightedFishIndex];
      const distanceToMouse = Math.round(this.mouse.dist(highlightedFish.location));

      if (isMobileScreen) {
        lines.push(`Highlighted Fish:`);
        lines.push(`  Mass = ${highlightedFish.mass.toFixed(2)}`);
        lines.push(`  Look Range = ${Math.round(highlightedFish.lookRange)}px`);
        lines.push(`  Distance from Mouse = ${distanceToMouse}px`);
      } else if (isNarrowScreen) {
        lines.push(`Highlighted Fish: Mass = ${highlightedFish.mass.toFixed(2)}`);
        lines.push(
          `Look Range = ${Math.round(highlightedFish.lookRange)}px, Distance = ${distanceToMouse}px`
        );
      } else {
        lines.push(
          `Highlighted Fish: Mass = ${highlightedFish.mass.toFixed(2)}, Look Range = ${Math.round(
            highlightedFish.lookRange
          )}px, Distance = ${distanceToMouse}px`
        );
      }
    }

    // Measure the maximum text width to determine background width
    let maxWidth = 0;
    for (const line of lines) {
      const width = this.offscreenCtx.measureText(line).width;
      maxWidth = Math.max(maxWidth, width);
    }

    // Draw the background rectangle with appropriate size
    const paddingX = 25 * Math.max(1, Math.min(1.2, dpr)); // Increased padding
    const paddingY = 15 * Math.max(1, Math.min(1.2, dpr)); // Increased padding
    const rectWidth = maxWidth + paddingX * 2;
    const rectHeight = lines.length * lineHeight + paddingY * 2;

    this.offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.offscreenCtx.fillRect(x - paddingX, y - lineHeight - paddingY, rectWidth, rectHeight);

    // Draw the text
    this.offscreenCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < lines.length; i++) {
      this.offscreenCtx.fillText(lines[i], x, y + i * lineHeight);
    }

    this.offscreenCtx.restore();
  }

  /**
   * Helper method to check if a fish is visible
   *
   * @param fish - The fish to check
   * @returns - True if the fish is visible, false otherwise
   * @private
   */
  private isFishVisible(fish: Fish): boolean {
    const margin = fish.length * 2; // Add margin so fish don't pop in/out suddenly
    return (
      fish.location.x + margin >= 0 &&
      fish.location.x - margin <= this.canvas.width &&
      fish.location.y + margin >= 0 &&
      fish.location.y - margin <= this.canvas.height
    );
  }

  /**
   * Transitions the simulation to slow motion.
   *
   * This method gradually decreases the animation speed by incrementing the interval
   * between frames and adjusting the alpha (opacity) for trail effects. It uses a
   * recursive approach to create a smooth transition from normal to slow motion.
   *
   * Once the target slow interval is reached, it sets up a regular interval for the animation.
   *
   * @private
   */
  private slow(): void {
    this.interval = SIMULATION.SLOW_INTERVAL;
    this.alpha = SIMULATION.SLOW_ALPHA;
    this.slowmo = true;
    logger.info('Simulation slowed down');
  }

  /**
   * Transitions the simulation back to normal speed.
   *
   * This method gradually increases the animation speed by decrementing the interval
   * between frames and adjusting the alpha (opacity) to reduce trail effects.
   * It uses a recursive approach to create a smooth transition from slow motion to normal speed.
   *
   * Once the target normal interval is reached, it resets the alpha to the default value
   * and sets up a regular interval for the animation.
   *
   * @private
   */
  private fast(): void {
    this.interval = SIMULATION.NORMAL_INTERVAL;
    this.alpha = SIMULATION.DEFAULT_ALPHA;
    this.slowmo = false;
    logger.info('Simulation at normal speed');
  }

  /**
   * Starts the simulation animation loop.
   *
   * This method initializes the simulation by:
   * 1. Drawing the first frame immediately to ensure fish are visible
   * 2. Starting the animation loop at normal speed
   * 3. Scrolling the window to minimize browser chrome (after a short delay)
   *
   * It should be called once after the simulation is constructed.
   */
  public start(): void {
    logger.info('Starting simulation with', this.world.creatures.length, 'fish');
    logger.info('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);

    // Start animation loop with requestAnimationFrame
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    setTimeout(() => {
      window.scrollTo(0, 1);
      logger.debug('Window scrolled to minimize browser chrome');
    }, SIMULATION.SCROLL_TIMEOUT);
  }

  /**
   * Stops the simulation animation loop.
   *
   * This method halts the animation by clearing the animation interval.
   * It can be called to pause the simulation or before cleanup.
   */
  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clean up any remaining interval (for backward compatibility)
    if (this.timeline) {
      clearInterval(this.timeline);
      this.timeline = null;
    }

    logger.info('Simulation stopped');
  }

  /**
   * Update the animate method to use requestAnimationFrame
   *
   * @param timestamp - The current timestamp
   * @private
   */
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
      this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsUpdate));
      this.lastFpsUpdate = timestamp;
      this.frameCount = 0;

      // Optionally log FPS for debugging
      logger.debug(`Current FPS: ${this.fps}`);

      // Update quality settings based on performance
      this.updateAdaptiveQuality();
    }

    // Only update at the desired interval
    if (elapsed >= this.interval) {
      this.lastFrameTime = timestamp;
      this.timestep();
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  /**
   * Update FPS monitoring to adjust quality
   *
   * @private
   */
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
    const avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;

    // Adjust quality based on FPS
    const previousQuality = this.currentQuality;

    if (avgFps < this.fpsThreshold.low && this.currentQuality !== 'low') {
      this.currentQuality = 'low';
    } else if (
      avgFps >= this.fpsThreshold.low &&
      avgFps < this.fpsThreshold.medium &&
      this.currentQuality !== 'medium'
    ) {
      this.currentQuality = 'medium';
    } else if (avgFps >= this.fpsThreshold.medium && this.currentQuality !== 'high') {
      this.currentQuality = 'high';

      // When upgrading to high quality, calculate the appropriate fish count for the screen size
      const dpr = window.devicePixelRatio || 1;
      const scaledWidth = this.canvas.width / dpr;
      const idealFishCount = Math.min(
        Math.max((scaledWidth / 600) * 50, SIMULATION.MIN_FISH),
        SIMULATION.MAX_FISH
      );

      // Update the high quality fish max based on screen size
      // This ensures we don't add too many fish on smaller screens
      this.qualityLevels.high.fishMax = Math.min(idealFishCount, SIMULATION.MAX_FISH);
      logger.debug(`Updated high quality fishMax to ${this.qualityLevels.high.fishMax}`);
    }

    // If quality changed, adjust settings
    if (previousQuality !== this.currentQuality) {
      this.applyQualitySettings();
    }
  }

  private applyQualitySettings(): void {
    const settings = this.qualityLevels[this.currentQuality];

    // If upgrading to high quality, recalculate the max fish value based on screen size
    if (this.currentQuality === 'high') {
      const dpr = window.devicePixelRatio || 1;
      const scaledWidth = this.canvas.width / dpr;
      const idealFishCount = Math.min(
        Math.max((scaledWidth / 600) * 50, SIMULATION.MIN_FISH),
        SIMULATION.MAX_FISH
      );

      // Update the target based on current screen size, but don't exceed MAX_FISH
      settings.fishMax = Math.min(idealFishCount, SIMULATION.MAX_FISH);
    }

    // Adjust number of fish
    const currentFishCount = this.world.creatures.length;
    const targetFishCount = settings.fishMax;

    if (currentFishCount > targetFishCount) {
      // Remove excess fish
      this.world.creatures = this.world.creatures.slice(0, targetFishCount);
    } else if (currentFishCount < targetFishCount) {
      // Add more fish
      this.addFish(targetFishCount - currentFishCount);
    }

    // Set detail level on fish
    for (const fish of this.world.creatures) {
      fish.detailLevel = settings.detailLevel;
    }

    logger.info(
      `Adjusted quality to ${this.currentQuality}: ${this.world.creatures.length} fish, max ${settings.fishMax}`
    );
  }

  // Method to add fish
  private addFish(count: number): void {
    for (let i = 0; i < count; i++) {
      const mass = 0.5 + Math.random() * Math.random() * Math.random() * Math.random() * 2;
      const x = Math.random() * this.world.width;
      const y = Math.random() * this.world.height;
      this.world.creatures.push(new Fish(mass, x, y));
    }
  }

  // Toggle FPS display
  public toggleFps(): void {
    this.showFps = !this.showFps;
  }

  /**
   * Handles display changes that might affect device pixel ratio.
   *
   * This method should be called when:
   * - The window is moved to a display with different DPR
   * - The browser zoom level changes
   * - Any other scenario where DPR might change without a resize event
   *
   * It forces a recalculation of canvas dimensions and fish positions.
   */
  public handleDisplayChange(): void {
    logger.info('Handling display change or DPR update');

    // Re-apply resize which will adjust for any DPR changes
    this.resize();

    // If quality adjustments are needed based on new display
    this.updateAdaptiveQuality();
  }
}
