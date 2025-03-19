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

  // Track highlighted fish index
  private highlightedFishIndex: number | undefined;

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
    updatePositionFromEvent(e, this.mouse);
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
    updatePositionFromEvent(e.changedTouches[0], this.mouse);
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
    updatePositionFromEvent(e.changedTouches[0], this.mouse);
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

    logger.info('Simulation cleanup completed');
  }

  /**
   * Handles window resize events by adjusting the simulation dimensions.
   *
   * This method:
   * 1. Updates the world width and height based on the canvas dimensions
   * 2. Resizes the spatial partitioning grid
   * 3. Ensures all fish remain within the new boundaries
   *
   * It's called automatically when the window is resized.
   *
   * @private
   */
  private resize(): void {
    logger.info('Resizing simulation');

    // Update world dimensions
    this.world.width = this.canvas.width;
    this.world.height = this.canvas.height;

    logger.info(`New world dimensions: ${this.world.width}x${this.world.height}`);

    // Update spatial grid dimensions
    this.spatialGrid.resize(this.world.width, this.world.height);
    logger.info('Spatial grid resized');

    // Make sure fish are within the new boundaries
    for (const fish of this.world.creatures) {
      if (fish.location.x > this.world.width) {
        fish.location.x = this.world.width - SIMULATION.RESIZE_PADDING;
      }
      if (fish.location.y > this.world.height) {
        fish.location.y = this.world.height - SIMULATION.RESIZE_PADDING;
      }
    }
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
    const fishCount = numFish || Math.min((window.innerWidth / 600) * 50, 50);
    logger.info(`Initializing ${fishCount} fish for simulation`);

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
    logger.debug('Timestep called, drawing frame with', this.world.creatures.length, 'fish');

    this.ctx.globalAlpha = SIMULATION.MIN_ALPHA + SIMULATION.MAX_ALPHA_RANGE * this.alpha;
    this.ctx.fillStyle = SIMULATION.BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = this.alpha;

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
          this.ctx,
          this.world.width,
          this.world.height,
          highlightedFish.lookRange,
          highlightedFish.location
        );

        // Save canvas state
        this.ctx.save();

        // Draw a line from the mouse to the highlighted fish
        this.ctx.strokeStyle = 'rgba(70, 130, 180, 0.6)'; // Steel blue, semi-transparent
        this.ctx.setLineDash([8, 4]); // Dashed line
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouse.x, this.mouse.y);
        this.ctx.lineTo(highlightedFish.location.x, highlightedFish.location.y);
        this.ctx.stroke();

        // Draw a small circle at the mouse position
        this.ctx.fillStyle = 'rgba(70, 130, 180, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, 6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
      } else {
        this.spatialGrid.drawGrid(this.ctx, this.world.width, this.world.height);
      }
    }

    for (const fish of this.world.creatures) {
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
      fish.draw(this.ctx);
    }

    // If showBehavior is enabled, display additional information about the spatial grid
    if (this.showBehavior) {
      this.drawGridInfo();
    }
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

    // Set up font and measure text to determine background size
    this.ctx.font = '12px Arial';
    this.ctx.save();

    // Position the info at the top-left corner with a small margin
    const margin = 10;
    const x = margin;
    const lineHeight = 18;
    const y = margin + lineHeight;

    // Create text lines for the info panel, adapting to screen width
    const isNarrowScreen = this.canvas.width < 500;
    const isMobileScreen = this.canvas.width < 380;

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
          `Highlighted Fish: Mass = ${highlightedFish.mass.toFixed(2)}, Look Range = ${Math.round(highlightedFish.lookRange)}px, Distance = ${distanceToMouse}px`
        );
      }
    }

    // Measure the maximum text width to determine background width
    let maxWidth = 0;
    for (const line of lines) {
      const width = this.ctx.measureText(line).width;
      maxWidth = Math.max(maxWidth, width);
    }

    // Draw the background rectangle with appropriate size
    const paddingX = 20;
    const paddingY = 10;
    const rectWidth = maxWidth + paddingX * 2;
    const rectHeight = lines.length * lineHeight + paddingY * 2;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - paddingX, y - lineHeight - paddingY, rectWidth, rectHeight);

    // Draw the text
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], x, y + i * lineHeight);
    }

    this.ctx.restore();
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
    logger.debug(`Slowing animation, current interval: ${this.interval}`);
    if (this.timeline) {
      clearInterval(this.timeline);
      this.timeline = null;
      logger.debug('Cleared existing animation timeline');
    }

    if (this.interval < SIMULATION.SLOW_INTERVAL) {
      this.alpha -= SIMULATION.ALPHA_STEP;
      this.timestep();
      setTimeout(() => this.slow(), this.interval++);
      logger.debug(`Transitioning to slower speed, new interval: ${this.interval}`);
    } else {
      this.timeline = window.setInterval(() => this.timestep(), this.interval);
      logger.debug(`Reached target slow interval: ${this.interval}`);
    }
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
    logger.debug(`Speeding up animation, current interval: ${this.interval}`);
    if (this.timeline) {
      clearInterval(this.timeline);
      this.timeline = null;
      logger.debug('Cleared existing animation timeline');
    }

    if (this.interval > SIMULATION.NORMAL_INTERVAL) {
      this.alpha += SIMULATION.ALPHA_STEP;
      this.timestep();
      setTimeout(() => this.fast(), this.interval--);
      logger.debug(`Transitioning to faster speed, new interval: ${this.interval}`);
    } else {
      this.alpha = SIMULATION.DEFAULT_ALPHA;
      this.timeline = window.setInterval(() => this.timestep(), this.interval);
      logger.debug(`Reached target fast interval: ${this.interval}`);
    }
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
    logger.info('Initial follow state:', this.follow);

    // Make sure we draw at least one frame immediately
    this.timestep();

    // Then start the animation loop
    this.fast();
    logger.info('Animation loop started with interval:', this.interval);

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
    logger.info('Stopping simulation animation loop');
    if (this.timeline) {
      clearInterval(this.timeline);
      this.timeline = null;
      logger.info('Animation timeline cleared');
    } else {
      logger.info('No active timeline to clear');
    }
  }
}
