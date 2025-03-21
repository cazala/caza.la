import { Vector } from './Vector';
import { FISH, MATH, SIMULATION } from './constants';
import { drawFishConnections, drawFishShape } from './drawing-utils';

export interface World {
  width: number;
  height: number;
  creatures: Fish[];
}

export class Fish {
  static showBehavior = false;
  private static uid = (() => {
    let id = 0;
    return () => id++;
  })();

  ID: number;
  mass: number;
  maxspeed: number;
  maxforce: number;
  separationRange: number;
  lookRange: number;
  length: number;
  base: number;
  HALF_PI: number;
  RAD_TO_DEG: number;
  location: Vector;
  velocity: Vector;
  acceleration: Vector;
  wandering: Vector;
  color: string;
  detailLevel: number = 3; // 3 = high, 2 = medium, 1 = low

  // For behavior visualization
  avoidList: Fish[] | null = null;
  chaseList: Fish[] | null = null;
  shoalList: Fish[] | null = null;

  constructor(mass: number, x: number, y: number, color: string = FISH.DEFAULT_COLOR) {
    this.ID = Fish.uid();
    this.mass = mass;
    this.maxspeed = FISH.MAX_SPEED_MULTIPLIER * this.mass;
    this.maxforce = FISH.MAX_FORCE_DIVISOR / this.mass;
    this.separationRange = this.mass * FISH.SEPARATION_RANGE_MULTIPLIER;
    this.lookRange = this.mass * FISH.LOOK_RANGE_MULTIPLIER;
    this.length = mass * FISH.LENGTH_MULTIPLIER;
    this.base = this.length * FISH.BASE_MULTIPLIER;
    this.HALF_PI = MATH.HALF_PI;
    this.RAD_TO_DEG = MATH.RAD_TO_DEG;
    this.location = new Vector(x, y);
    this.velocity = new Vector(
      (Math.random() * FISH.INITIAL_VELOCITY_RANGE - 1) *
        this.maxspeed *
        FISH.INITIAL_VELOCITY_FACTOR,
      (Math.random() * FISH.INITIAL_VELOCITY_RANGE - 1) *
        this.maxspeed *
        FISH.INITIAL_VELOCITY_FACTOR
    );
    this.acceleration = new Vector(0, 0);
    this.wandering = new Vector(FISH.RANDOM_WANDER_VECTOR, FISH.RANDOM_WANDER_VECTOR);
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.detailLevel >= 3) {
      this.drawBehavior(ctx);
    }

    if (this.detailLevel === 1) {
      this.drawSimpleFish(ctx);
    } else {
      drawFishShape(ctx, this);
    }
  }

  drawBehavior(ctx: CanvasRenderingContext2D): void {
    if (Fish.showBehavior) {
      drawFishConnections(ctx, this, this.avoidList, FISH.AVOID_COLOR, 4);
      drawFishConnections(ctx, this, this.chaseList, FISH.CHASE_COLOR, 4);
      drawFishConnections(ctx, this, this.shoalList, FISH.SHOAL_COLOR, 1);

      this.avoidList = null;
      this.chaseList = null;
      this.shoalList = null;
    } else {
      this.color = FISH.DEFAULT_COLOR;
    }
  }

  drawSimpleFish(ctx: CanvasRenderingContext2D): void {
    const angle = this.velocity.angle();

    const x1 = this.location.x + Math.cos(angle) * this.base;
    const y1 = this.location.y + Math.sin(angle) * this.base;

    const x = this.location.x - Math.cos(angle) * this.length;
    const y = this.location.y - Math.sin(angle) * this.length;

    const x2 = this.location.x + Math.cos(angle + this.HALF_PI) * this.base;
    const y2 = this.location.y + Math.sin(angle + this.HALF_PI) * this.base;

    const x3 = this.location.x + Math.cos(angle - this.HALF_PI) * this.base;
    const y3 = this.location.y + Math.sin(angle - this.HALF_PI) * this.base;

    ctx.fillStyle = this.color || '#000000';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x, y);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
  }

  update(): void {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    if (this.velocity.mag() < FISH.MIN_VELOCITY_MAG) {
      this.velocity.setMag(FISH.DEFAULT_VELOCITY_MAG);
    }
    this.location.add(this.velocity);
    this.acceleration.mul(0);
  }

  applyForce(f: Vector): void {
    this.acceleration.add(f);
  }

  boundaries(world: World): void {
    if (this.location.x < SIMULATION.BOUNDARY_DISTANCE) {
      this.applyForce(new Vector(this.maxforce * SIMULATION.BOUNDARY_FORCE_MULTIPLIER, 0));
    }

    if (this.location.x > world.width - SIMULATION.BOUNDARY_DISTANCE) {
      this.applyForce(new Vector(-this.maxforce * SIMULATION.BOUNDARY_FORCE_MULTIPLIER, 0));
    }

    if (this.location.y < SIMULATION.BOUNDARY_DISTANCE) {
      this.applyForce(new Vector(0, this.maxforce * SIMULATION.BOUNDARY_FORCE_MULTIPLIER));
    }

    if (this.location.y > world.height - SIMULATION.BOUNDARY_DISTANCE) {
      this.applyForce(new Vector(0, -this.maxforce * SIMULATION.BOUNDARY_FORCE_MULTIPLIER));
    }
  }

  look(creatures: Fish[], radius: number, angle: number): Fish[] {
    const neighbors: Fish[] = [];
    for (const creature of creatures) {
      if (creature !== this) {
        const diff = this.location.copy().sub(creature.location);
        const a = this.velocity.angleBetween(diff);
        const d = this.location.dist(creature.location);
        if (d < radius && (a < angle / 2 || a > MATH.FULL_CIRCLE - angle / 2)) {
          neighbors.push(creature);
        }
      }
    }
    return neighbors;
  }

  /**
   * Filter a list of nearby fish to only include those in the fish's field of view
   * @param nearbyFish List of fish that are spatially close
   * @param angle The field of view angle
   * @returns Fish that are within the field of view
   */
  filterVisibleNeighbors(nearbyFish: Fish[], angle: number): Fish[] {
    const neighbors: Fish[] = [];
    for (const creature of nearbyFish) {
      if (creature !== this) {
        const diff = this.location.copy().sub(creature.location);
        const a = this.velocity.angleBetween(diff);
        if (a < angle / 2 || a > MATH.FULL_CIRCLE - angle / 2) {
          neighbors.push(creature);
        }
      }
    }
    return neighbors;
  }

  wander(): void {
    if (Math.random() < FISH.WANDERING_CHANGE_PROBABILITY) {
      this.wandering.rotate(MATH.FULL_CIRCLE * Math.random());
    }
    this.velocity.add(this.wandering);

    if (Fish.showBehavior) {
      this.color = FISH.WANDER_COLOR;
    }
  }

  chase(creatures: Fish[]): void {
    this.chaseList = creatures;

    if (creatures.length === 0) {
      return;
    }

    for (const creature of creatures) {
      this.applyForce(creature.attract(this, FISH.ATTRACTION_FORCE));
    }

    if (Fish.showBehavior) {
      this.color = FISH.CHASE_COLOR;
    }
  }

  follow(target: Vector, arrive: number): void {
    const dest = target.copy().sub(this.location);
    const d = dest.dist(this.location);

    if (d < arrive) {
      dest.setMag((d / arrive) * this.maxspeed);
    } else {
      dest.setMag(this.maxspeed);
    }

    this.applyForce(dest.limit(this.maxforce * FISH.FOLLOW_FORCE_MULTIPLIER));
  }

  seek(target: Vector): Vector {
    const seek = target.copy().sub(this.location);
    seek.normalize();
    seek.mul(this.maxspeed);
    seek.sub(this.velocity).limit(this.maxforce);

    return seek;
  }

  attract(body: Fish, f: number): Vector {
    const force = this.location.copy().sub(body.location);
    let distance = force.mag();
    distance =
      distance < FISH.MIN_ATTRACTION_DISTANCE
        ? FISH.MIN_ATTRACTION_DISTANCE
        : distance > FISH.MAX_ATTRACTION_DISTANCE
          ? FISH.MAX_ATTRACTION_DISTANCE
          : distance;
    force.normalize();

    const strength = (f * this.mass * body.mass) / (distance * distance);
    force.mul(strength);
    return force;
  }

  separate(neighbors: Fish[], range: number): Vector {
    const sum = new Vector(0, 0);

    if (neighbors.length) {
      for (const neighbor of neighbors) {
        const d = this.location.dist(neighbor.location);
        if (d < range) {
          const diff = this.location.copy().sub(neighbor.location);
          diff.normalize();
          diff.div(d);
          sum.add(diff);
        }
      }
      sum.div(neighbors.length);
      sum.normalize();
      sum.mul(this.maxspeed);
      sum.sub(this.velocity);
      sum.limit(this.maxforce);
    }

    return sum;
  }

  align(neighbors: Fish[]): Vector {
    const sum = new Vector(0, 0);

    if (neighbors.length) {
      for (const neighbor of neighbors) {
        sum.add(neighbor.velocity);
      }
      sum.div(neighbors.length);
      sum.normalize();
      sum.mul(this.maxspeed);

      sum.sub(this.velocity).limit(this.maxspeed);
    }

    return sum;
  }

  cohesion(neighbors: Fish[]): Vector {
    const sum = new Vector(0, 0);

    if (neighbors.length) {
      for (const neighbor of neighbors) {
        sum.add(neighbor.location);
      }
      sum.div(neighbors.length);
      return this.seek(sum);
    }

    return sum;
  }

  shoal(neighbors: Fish[]): void {
    this.shoalList = neighbors;

    const sep = this.separate(neighbors, this.separationRange).limit(this.maxforce);
    const ali = this.align(neighbors).limit(this.maxforce);
    const cohe = this.cohesion(neighbors).limit(this.maxforce);

    sep.mul(FISH.SEPARATION_WEIGHT);
    ali.mul(FISH.ALIGNMENT_WEIGHT);
    cohe.mul(FISH.COHESION_WEIGHT);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(cohe);

    if (Fish.showBehavior) {
      this.color = FISH.SHOAL_COLOR;
    }
  }

  avoid(creatures: Fish[], dist: number): void {
    this.avoidList = creatures;
    for (const creature of creatures) {
      const d = this.location.dist(creature.location);
      if (d < dist) {
        const v = creature.location.copy().sub(this.location).mul(-FISH.WANDER_FORCE_MULTIPLIER);
        this.applyForce(v);
      }
    }

    if (Fish.showBehavior) {
      this.color = FISH.AVOID_COLOR;
    }
  }
}
