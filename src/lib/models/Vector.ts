import { logger } from '../utils/logging';

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
   * Adds another vector to this vector (mutable).
   * @param v - The vector to add
   * @returns This vector for chaining
   */
  add(v: Vector): Vector {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Returns a new vector that is the sum of this vector and another (immutable).
   * @param v - The vector to add
   * @returns A new vector representing the sum
   */
  plus(v: Vector): Vector {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  /**
   * Subtracts another vector from this vector (mutable).
   * @param v - The vector to subtract
   * @returns This vector for chaining
   */
  sub(v: Vector): Vector {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Returns a new vector that is the subtraction of another vector from this one (immutable).
   * @param v - The vector to subtract
   * @returns A new vector representing the difference
   */
  minus(v: Vector): Vector {
    return new Vector(this.x - v.x, this.y - v.y);
  }

  /**
   * Multiplies this vector by a scalar (mutable).
   * @param s - The scalar value
   * @returns This vector for chaining
   */
  mul(s: number): Vector {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /**
   * Returns a new vector that is this vector multiplied by a scalar (immutable).
   * @param s - The scalar value
   * @returns A new vector representing the product
   */
  times(s: number): Vector {
    return new Vector(this.x * s, this.y * s);
  }

  /**
   * Divides this vector by a scalar (mutable).
   * @param s - The scalar value
   * @returns This vector for chaining
   * @throws Error if attempting to divide by zero
   */
  div(s: number): Vector {
    if (!s) {
      logger.warn('Division by zero error in Vector.div');
      return this;
    }
    this.x /= s;
    this.y /= s;
    return this;
  }

  /**
   * Returns a new vector that is this vector divided by a scalar (immutable).
   * @param s - The scalar value
   * @returns A new vector representing the quotient
   * @throws Error if attempting to divide by zero
   */
  dividedBy(s: number): Vector {
    if (s === 0) {
      logger.warn('Division by zero error in Vector.dividedBy');
      throw new Error('Division by zero error in Vector.dividedBy');
    }
    return new Vector(this.x / s, this.y / s);
  }

  /**
   * Safely divides this vector by a scalar, using a default value for division by zero (mutable).
   * @param s - The scalar value
   * @param defaultValue - The value to use if s is zero
   * @returns This vector for chaining
   */
  safeDivide(s: number, defaultValue: number = 0): Vector {
    if (s === 0) {
      logger.debug(`Using default value ${defaultValue} for division by zero in Vector.safeDivide`);
      this.x = defaultValue;
      this.y = defaultValue;
    } else {
      this.x /= s;
      this.y /= s;
    }
    return this;
  }

  /**
   * Calculates the magnitude (length) of the vector.
   * @returns The magnitude of the vector
   */
  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Calculates the squared magnitude of the vector.
   * More efficient than mag() when only comparing magnitudes.
   * @returns The squared magnitude of the vector
   */
  magSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Normalizes this vector to a unit vector (length of 1) (mutable).
   * @returns This vector for chaining
   */
  normalize(): Vector {
    const mag = this.mag();
    if (mag > 0) {
      return this.div(mag);
    }
    return this;
  }

  /**
   * Returns a new normalized unit vector in the same direction as this vector (immutable).
   * @returns A new unit vector in the same direction
   */
  normalized(): Vector {
    const mag = this.mag();
    if (mag > 0) {
      return new Vector(this.x / mag, this.y / mag);
    }
    return new Vector(0, 0);
  }

  /**
   * Calculates the angle of the vector in radians.
   * @returns The angle in radians
   */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Sets the magnitude of the vector to the specified value (mutable).
   * @param m - The desired magnitude
   * @returns This vector for chaining
   */
  setMag(m: number): Vector {
    const angle = this.angle();
    this.x = m * Math.cos(angle);
    this.y = m * Math.sin(angle);
    return this;
  }

  /**
   * Returns a new vector with the same direction but specified magnitude (immutable).
   * @param m - The desired magnitude
   * @returns A new vector with the specified magnitude
   */
  withMag(m: number): Vector {
    const angle = this.angle();
    return new Vector(m * Math.cos(angle), m * Math.sin(angle));
  }

  /**
   * Sets the angle of the vector, maintaining magnitude (mutable).
   * @param a - The desired angle in radians
   * @returns This vector for chaining
   */
  setAngle(a: number): Vector {
    const mag = this.mag();
    this.x = mag * Math.cos(a);
    this.y = mag * Math.sin(a);
    return this;
  }

  /**
   * Returns a new vector with the same magnitude but specified angle (immutable).
   * @param a - The desired angle in radians
   * @returns A new vector with the specified angle
   */
  withAngle(a: number): Vector {
    const mag = this.mag();
    return new Vector(mag * Math.cos(a), mag * Math.sin(a));
  }

  /**
   * Rotates the vector by the specified angle in radians (mutable).
   * @param a - The angle in radians to rotate by
   * @returns This vector for chaining
   */
  rotate(a: number): Vector {
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  /**
   * Returns a new vector rotated by the specified angle (immutable).
   * @param a - The angle in radians to rotate by
   * @returns A new rotated vector
   */
  rotated(a: number): Vector {
    const newAngle = this.angle() + a;
    return this.withAngle(newAngle);
  }

  /**
   * Limits the magnitude of the vector to the specified maximum (mutable).
   * @param l - The maximum magnitude
   * @returns This vector for chaining
   */
  limit(l: number): Vector {
    const mag = this.mag();
    if (mag > l) {
      this.setMag(l);
    }
    return this;
  }

  /**
   * Returns a new vector with magnitude limited to the specified maximum (immutable).
   * @param l - The maximum magnitude
   * @returns A new vector with limited magnitude
   */
  limited(l: number): Vector {
    const mag = this.mag();
    if (mag > l) {
      return this.withMag(l);
    }
    return this.copy();
  }

  /**
   * Calculates the angle between this vector and another vector.
   * @param v - The other vector
   * @returns The angle in radians
   */
  angleBetween(v: Vector): number {
    return this.angle() - v.angle();
  }

  /**
   * Calculates the dot product of this vector and another vector.
   * @param v - The other vector
   * @returns The dot product
   */
  dot(v: Vector): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Calculates the cross product of this vector and another vector.
   * @param v - The other vector
   * @returns The cross product (in 2D, this is a scalar value)
   */
  cross(v: Vector): number {
    return this.x * v.y - this.y * v.x;
  }

  /**
   * Linearly interpolates this vector toward another vector (mutable).
   * @param v - The target vector
   * @param amt - The amount to interpolate (0-1)
   * @returns This vector for chaining
   */
  lerp(v: Vector, amt: number): Vector {
    this.x += (v.x - this.x) * amt;
    this.y += (v.y - this.y) * amt;
    return this;
  }

  /**
   * Returns a new vector that is a linear interpolation between this vector and another (immutable).
   * @param v - The target vector
   * @param amt - The amount to interpolate (0-1)
   * @returns A new interpolated vector
   */
  lerped(v: Vector, amt: number): Vector {
    return new Vector(this.x + (v.x - this.x) * amt, this.y + (v.y - this.y) * amt);
  }

  /**
   * Calculates the distance between this vector and another vector.
   * @param v - The other vector
   * @returns The distance
   */
  dist(v: Vector): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculates the squared distance between this vector and another vector.
   * More efficient than dist() when only comparing distances.
   * @param v - The other vector
   * @returns The squared distance
   */
  distSq(v: Vector): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Creates a copy of this vector.
   * @returns A new Vector with the same components
   */
  copy(): Vector {
    return new Vector(this.x, this.y);
  }

  /**
   * Returns a string representation of the vector.
   * @returns A string in the format "Vector(x, y)"
   */
  toString(): string {
    return `Vector(${this.x}, ${this.y})`;
  }

  /**
   * Checks if this vector is equal to another vector.
   * @param v - The other vector
   * @returns True if the vectors have the same components
   */
  equals(v: Vector): boolean {
    return this.x === v.x && this.y === v.y;
  }

  // Static methods for vector creation

  /**
   * Creates a new vector from an angle and magnitude.
   * @param angle - The angle in radians
   * @param magnitude - The magnitude
   * @returns A new vector
   */
  static fromAngle(angle: number, magnitude: number = 1): Vector {
    return new Vector(magnitude * Math.cos(angle), magnitude * Math.sin(angle));
  }

  /**
   * Creates a new random vector with the specified magnitude.
   * @param magnitude - The magnitude of the vector
   * @returns A new random unit vector scaled to the magnitude
   */
  static random(magnitude: number = 1): Vector {
    const angle = Math.random() * Math.PI * 2;
    return Vector.fromAngle(angle, magnitude);
  }

  /**
   * Generates a random vector with the specified magnitude around an offset.
   * @param offset - Base value to offset the random value
   * @param magnitude - Maximum magnitude of the random component
   * @returns A new random Vector
   */
  static noise(offset: number, magnitude: number): Vector {
    return new Vector(
      (Math.random() * 2 - 1) * magnitude + offset,
      (Math.random() * 2 - 1) * magnitude + offset
    );
  }

  /**
   * Creates a zero vector (0, 0).
   * @returns A new zero vector
   */
  static zero(): Vector {
    return new Vector(0, 0);
  }
}
