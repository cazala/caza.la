import { Fish, World } from "./Fish";
import { Vector } from "./Vector";

export class Simulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private static mouse: Vector = new Vector(0, 0);
  private world: World = {
    width: 0,
    height: 0,
    creatures: [],
  };
  private static follow: boolean = false;
  private slowmo: boolean = false;
  private static mouseDownTime: number | null = null;
  private interval: number = 20;
  private alpha: number = 1;
  private timeline: number | null = null;
  private static eventListenersInitialized = false;
  // Define a threshold for what counts as a "quick click" (in milliseconds)
  private static CLICK_THRESHOLD = 300;
  // Static reference to the current simulation instance for event handlers
  private static currentInstance: Simulation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }
    this.ctx = context;

    console.log(`Canvas size: ${canvas.width}x${canvas.height}`);

    // Initialize world dimensions
    this.world.width = canvas.width;
    this.world.height = canvas.height;

    // Store reference to current instance for event handlers
    Simulation.currentInstance = this;

    if (!Simulation.eventListenersInitialized) {
      this.setupEventListeners();
      Simulation.eventListenersInitialized = true;
    }

    this.resize();
    this.initFish();

    // Draw once immediately to ensure fish are visible
    this.timestep();

    // Then start the animation loop
    this.start();
  }

  private setupEventListeners(): void {
    console.log("Setting up event listeners");

    window.addEventListener("mousemove", (e) => {
      Simulation.mouse.set(e.clientX, e.clientY);
    });

    window.addEventListener("mousedown", () => {
      Simulation.follow = true;
      Simulation.mouseDownTime = Date.now();
      console.log(
        "Mouse down event triggered, follow set to:",
        Simulation.follow
      );
    });

    // Add keydown event listener for debugging
    window.addEventListener("keydown", (e) => {
      console.log("Key down event triggered:", e.key);
    });

    // Improve keyup event handler
    window.addEventListener("keyup", (e) => {
      console.log("Key up event triggered:", e.key);

      // Make sure we have a current instance
      if (Simulation.currentInstance) {
        if (e.key === " " || e.key === "Spacebar") {
          console.log("Space key detected, toggling slowmo");
          if (Simulation.currentInstance.slowmo) {
            Simulation.currentInstance.fast();
          } else {
            Simulation.currentInstance.slow();
          }
          Simulation.currentInstance.slowmo =
            !Simulation.currentInstance.slowmo;
        }
      }
    });

    const handleMouseUp = () => {
      Simulation.follow = false;
      const currentTime = Date.now();

      // Only toggle behavior if it was a quick click
      if (
        Simulation.mouseDownTime &&
        currentTime - Simulation.mouseDownTime < Simulation.CLICK_THRESHOLD
      ) {
        console.log("Quick click detected, toggling behavior");
        Fish.showBehavior = !Fish.showBehavior;
      } else {
        console.log("Not a quick click, just stopping follow");
      }

      Simulation.mouseDownTime = null;
    };

    window.addEventListener("mouseup", handleMouseUp);

    document.body.addEventListener(
      "touchstart",
      (e) => {
        Simulation.follow = true;
        Simulation.mouseDownTime = Date.now();
        const touchobj = e.changedTouches[0];
        Simulation.mouse.set(touchobj.clientX, touchobj.clientY);
      },
      false
    );

    document.body.addEventListener(
      "touchmove",
      (e) => {
        const touchobj = e.changedTouches[0];
        Simulation.mouse.set(touchobj.clientX, touchobj.clientY);
        e.preventDefault();
      },
      false
    );

    document.body.addEventListener(
      "touchend",
      (e) => {
        Simulation.follow = false;
        const currentTime = Date.now();

        // Only toggle behavior if it was a quick tap
        if (
          Simulation.mouseDownTime &&
          currentTime - Simulation.mouseDownTime < Simulation.CLICK_THRESHOLD
        ) {
          console.log("Quick tap detected, toggling behavior");
          Fish.showBehavior = !Fish.showBehavior;
        }

        Simulation.mouseDownTime = null;

        // Keep the multi-touch gesture for toggling behavior
        if (e.changedTouches.length >= 2) {
          Fish.showBehavior = !Fish.showBehavior;
        }
      },
      false
    );

    window.addEventListener("resize", () => this.resize());
  }

  private resize(): void {
    console.log("Resizing simulation");

    // Update world dimensions
    this.world.width = this.canvas.width;
    this.world.height = this.canvas.height;

    console.log(
      `New world dimensions: ${this.world.width}x${this.world.height}`
    );

    // Make sure fish are within the new boundaries
    for (const fish of this.world.creatures) {
      if (fish.location.x > this.world.width) {
        fish.location.x = this.world.width - 100;
      }
      if (fish.location.y > this.world.height) {
        fish.location.y = this.world.height - 100;
      }
    }
  }

  private initFish(): void {
    // Clear any existing fish
    this.world.creatures = [];

    // Calculate number of fish based on screen size
    const numFish = Math.min((window.innerWidth / 600) * 50, 50);
    console.log(`Creating ${numFish} fish`);

    // Create fish with random positions and sizes
    for (let i = 0; i < numFish; i++) {
      const mass =
        0.5 + Math.random() * Math.random() * Math.random() * Math.random() * 2;
      const x = Math.random() * this.world.width;
      const y = Math.random() * this.world.height;

      console.log(`Fish ${i}: mass=${mass}, position=(${x}, ${y})`);

      this.world.creatures.push(new Fish(mass, x, y));
    }
  }

  private timestep(): void {
    this.ctx.globalAlpha = 0.2 + 0.6 * this.alpha;
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = this.alpha;

    for (const fish of this.world.creatures) {
      if (Simulation.follow) {
        fish.follow(Simulation.mouse, 150);
      }

      const neighbors = fish.look(
        this.world.creatures,
        100 * fish.mass,
        Math.PI * 2
      );

      const friends: Fish[] = [];
      for (const neighbor of neighbors) {
        if (neighbor.mass < fish.mass * 2 && neighbor.mass > fish.mass / 2) {
          friends.push(neighbor);
        }
      }

      if (friends.length) {
        fish.shoal(friends);
      } else {
        fish.wander();
      }

      fish.boundaries(this.world);

      const bigger: Fish[] = [];
      for (const neighbor of neighbors) {
        if (neighbor.mass > fish.mass * 2) {
          bigger.push(neighbor);
        }
      }

      if (bigger.length) {
        fish.avoid(bigger, 300);
      }

      const smaller: Fish[] = [];
      for (const neighbor of neighbors) {
        if (neighbor.mass < fish.mass / 2) {
          smaller.push(neighbor);
        }
      }

      if (smaller.length) {
        fish.chase(smaller);
      }

      fish.update();
      fish.draw(this.ctx);
    }
  }

  private slow(): void {
    if (this.timeline) {
      clearInterval(this.timeline);
      this.timeline = null;
    }

    if (this.interval < 45) {
      this.alpha -= 0.032;
      this.timestep();
      setTimeout(() => this.slow(), this.interval++);
    } else {
      this.timeline = window.setInterval(() => this.timestep(), this.interval);
    }
  }

  private fast(): void {
    if (this.timeline) {
      clearInterval(this.timeline);
      this.timeline = null;
    }

    if (this.interval > 20) {
      this.alpha += 0.032;
      this.timestep();
      setTimeout(() => this.fast(), this.interval--);
    } else {
      this.alpha = 1;
      this.timeline = window.setInterval(() => this.timestep(), this.interval);
    }
  }

  public start(): void {
    console.log(
      "Starting simulation with",
      this.world.creatures.length,
      "fish"
    );
    console.log(
      "Canvas dimensions:",
      this.canvas.width,
      "x",
      this.canvas.height
    );
    console.log("Initial follow state:", Simulation.follow);

    this.fast();

    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 1000);
  }

  public stop(): void {
    if (this.timeline) {
      clearInterval(this.timeline);
      this.timeline = null;
    }
  }
}
