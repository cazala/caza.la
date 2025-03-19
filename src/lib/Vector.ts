export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  set(x: number, y: number): Vector {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v: Vector): Vector {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector): Vector {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mul(s: number): Vector {
    this.x *= s;
    this.y *= s;
    return this;
  }

  div(s: number): Vector {
    if (!s) console.log("Division by zero!");
    this.x /= s;
    this.y /= s;
    return this;
  }

  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector {
    const mag = this.mag();
    if (mag) this.div(mag);
    return this;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  setMag(m: number): Vector {
    const angle = this.angle();
    this.x = m * Math.cos(angle);
    this.y = m * Math.sin(angle);
    return this;
  }

  setAngle(a: number): Vector {
    const mag = this.mag();
    this.x = mag * Math.cos(a);
    this.y = mag * Math.sin(a);
    return this;
  }

  rotate(a: number): Vector {
    this.setAngle(this.angle() + a);
    return this;
  }

  limit(l: number): Vector {
    const mag = this.mag();
    if (mag > l) this.setMag(l);
    return this;
  }

  angleBetween(v: Vector): number {
    return this.angle() - v.angle();
  }

  dot(v: Vector): number {
    return this.x * v.x + this.y * v.y;
  }

  lerp(v: Vector, amt: number): Vector {
    this.x += (v.x - this.x) * amt;
    this.y += (v.y - this.y) * amt;
    return this;
  }

  dist(v: Vector): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  copy(): Vector {
    return new Vector(this.x, this.y);
  }

  static noise(offset: number, mag: number): Vector {
    return new Vector(
      (Math.random() * 2 - 1) * mag + offset,
      (Math.random() * 2 - 1) * mag + offset
    );
  }
}
