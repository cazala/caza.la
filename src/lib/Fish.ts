import { Vector } from "./Vector";

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

  // For behavior visualization
  avoidList: Fish[] | null = null;
  chaseList: Fish[] | null = null;
  shoalList: Fish[] | null = null;

  constructor(mass: number, x: number, y: number, color: string = "#000000") {
    this.ID = Fish.uid();
    this.mass = mass;
    this.maxspeed = 12 * this.mass;
    this.maxforce = 0.1 / this.mass;
    this.separationRange = this.mass * 30;
    this.lookRange = this.mass * 200;
    this.length = mass * 20;
    this.base = this.length * 0.5;
    this.HALF_PI = Math.PI * 0.5;
    this.RAD_TO_DEG = 57.29577951308232;
    this.location = new Vector(x, y);
    this.velocity = new Vector(
      (Math.random() * 2 - 1) * this.maxspeed * 0.5,
      (Math.random() * 2 - 1) * this.maxspeed * 0.5
    );
    this.acceleration = new Vector(0, 0);
    this.wandering = new Vector(0.2, 0.2);
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawBehavior(ctx);

    const angle = this.velocity.angle();

    const x1 = this.location.x + Math.cos(angle) * this.base;
    const y1 = this.location.y + Math.sin(angle) * this.base;

    const x = this.location.x - Math.cos(angle) * this.length;
    const y = this.location.y - Math.sin(angle) * this.length;

    const x2 = this.location.x + Math.cos(angle + this.HALF_PI) * this.base;
    const y2 = this.location.y + Math.sin(angle + this.HALF_PI) * this.base;

    const x3 = this.location.x + Math.cos(angle - this.HALF_PI) * this.base;
    const y3 = this.location.y + Math.sin(angle - this.HALF_PI) * this.base;

    // Make sure fish are visible
    ctx.lineWidth = 2;
    ctx.fillStyle = this.color || "#000000";
    ctx.strokeStyle = this.color || "#000000";

    // Save current state
    ctx.save();

    // Ensure global alpha is set properly
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x2, y2, x, y);
    ctx.quadraticCurveTo(x3, y3, x1, y1);
    ctx.stroke();
    ctx.fill();

    // Restore previous state
    ctx.restore();
  }

  drawBehavior(ctx: CanvasRenderingContext2D): void {
    if (Fish.showBehavior) {
      const oldAlpha = ctx.globalAlpha;
      ctx.globalAlpha = 0.2;

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

      if (this.shoalList && this.shoalList.length) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.beginPath();
        for (const fish of this.shoalList) {
          ctx.moveTo(this.location.x, this.location.y);
          ctx.lineTo(fish.location.x, fish.location.y);
        }
        ctx.stroke();
      }

      this.avoidList = null;
      this.chaseList = null;
      this.shoalList = null;
      ctx.globalAlpha = oldAlpha;
    } else {
      this.color = "black";
    }
  }

  update(): void {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    if (this.velocity.mag() < 2) {
      this.velocity.setMag(5);
    }
    this.location.add(this.velocity);
    this.acceleration.mul(0);
  }

  applyForce(f: Vector): void {
    this.acceleration.add(f);
  }

  boundaries(world: World): void {
    if (this.location.x < 50) {
      this.applyForce(new Vector(this.maxforce * 3, 0));
    }

    if (this.location.x > world.width - 50) {
      this.applyForce(new Vector(-this.maxforce * 3, 0));
    }

    if (this.location.y < 50) {
      this.applyForce(new Vector(0, this.maxforce * 3));
    }

    if (this.location.y > world.height - 50) {
      this.applyForce(new Vector(0, -this.maxforce * 3));
    }
  }

  look(creatures: Fish[], radius: number, angle: number): Fish[] {
    const neighbors: Fish[] = [];
    for (const creature of creatures) {
      if (creature !== this) {
        const diff = this.location.copy().sub(creature.location);
        const a = this.velocity.angleBetween(diff);
        const d = this.location.dist(creature.location);
        if (d < radius && (a < angle / 2 || a > Math.PI * 2 - angle / 2)) {
          neighbors.push(creature);
        }
      }
    }
    return neighbors;
  }

  wander(): void {
    if (Math.random() < 0.05) {
      this.wandering.rotate(Math.PI * 2 * Math.random());
    }
    this.velocity.add(this.wandering);

    if (Fish.showBehavior) {
      this.color = "gray";
    }
  }

  chase(creatures: Fish[]): void {
    this.chaseList = creatures;

    if (creatures.length === 0) {
      return;
    }

    for (const creature of creatures) {
      this.applyForce(creature.attract(this, 50));
    }

    if (Fish.showBehavior) {
      this.color = "red";
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

    this.applyForce(dest.limit(this.maxforce * 2));
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
    distance = distance < 5 ? 5 : distance > 25 ? 25 : distance;
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

    const sep = this.separate(neighbors, this.separationRange).limit(
      this.maxforce
    );
    const ali = this.align(neighbors).limit(this.maxforce);
    const cohe = this.cohesion(neighbors).limit(this.maxforce);

    sep.mul(1.4);
    ali.mul(1.2);
    cohe.mul(1);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(cohe);

    if (Fish.showBehavior) {
      this.color = "black";
    }
  }

  avoid(creatures: Fish[], dist: number): void {
    this.avoidList = creatures;
    for (const creature of creatures) {
      const d = this.location.dist(creature.location);
      if (d < dist) {
        const v = creature.location.copy().sub(this.location).mul(-100);
        this.applyForce(v);
      }
    }

    if (Fish.showBehavior) {
      this.color = "blue";
    }
  }
}
