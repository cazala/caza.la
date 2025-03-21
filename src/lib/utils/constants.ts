export const FISH = {
  // Fish behavior constants
  FOLLOW_RADIUS: 150,
  LOOK_RANGE_MULTIPLIER: 200,
  SEPARATION_RANGE_MULTIPLIER: 30,
  LENGTH_MULTIPLIER: 20,
  BASE_MULTIPLIER: 0.5,
  NEIGHBOR_RANGE_MULTIPLIER: 100,

  // Speed and force constants
  MAX_SPEED_MULTIPLIER: 12,
  MAX_FORCE_DIVISOR: 0.1,
  ATTRACTION_FORCE: 50,
  FOLLOW_FORCE_MULTIPLIER: 2,
  INITIAL_VELOCITY_RANGE: 2, // Random range for initial velocity (-1 to 1) * 2
  INITIAL_VELOCITY_FACTOR: 0.5, // Multiplier for initial velocity

  // Attraction limits
  MIN_ATTRACTION_DISTANCE: 5,
  MAX_ATTRACTION_DISTANCE: 25,

  // Behavior weighting
  SEPARATION_WEIGHT: 1.4,
  ALIGNMENT_WEIGHT: 1.2,
  COHESION_WEIGHT: 1.0,

  // Visualization
  DEFAULT_COLOR: 'black',
  AVOID_COLOR: 'blue',
  CHASE_COLOR: 'red',
  WANDER_COLOR: 'gray',
  SHOAL_COLOR: 'black',

  // Behavior thresholds
  MASS_THRESHOLD_BIGGER: 2, // X times current fish mass
  MASS_THRESHOLD_SMALLER: 0.5, // X times current fish mass

  // Avoid range
  AVOID_RANGE: 300,

  // Movement constants
  MIN_VELOCITY_MAG: 2,
  DEFAULT_VELOCITY_MAG: 5,
  WANDERING_CHANGE_PROBABILITY: 0.05,
  RANDOM_WANDER_VECTOR: 0.2,
  WANDER_FORCE_MULTIPLIER: 100,
};

export const SIMULATION = {
  // Animation settings
  NORMAL_INTERVAL: 20,
  SLOW_INTERVAL: 45,
  ALPHA_STEP: 0.032,
  SLOW_ALPHA: 0.5, // Alpha value for slow motion mode

  // Interaction settings
  CLICK_THRESHOLD: 300, // ms
  TOUCH_MOUSE_PREVENTION_TIMEOUT: 500, // ms
  SCROLL_TIMEOUT: 1000, // ms

  // Boundary settings
  BOUNDARY_FORCE_MULTIPLIER: 3,
  BOUNDARY_DISTANCE: 50,
  RESIZE_PADDING: 100,

  // Canvas settings
  DEFAULT_ALPHA: 1,
  BACKGROUND_COLOR: '#ffffff',
  MIN_ALPHA: 0.2,
  MAX_ALPHA_RANGE: 0.6,

  // Fish count settings
  MIN_FISH: 30,
  MAX_FISH: 200,
  BASE_FISH_COUNT: 50, // Base number of fish for reference screen width
  REFERENCE_WIDTH: 600, // Width in pixels that should have BASE_FISH_COUNT fish

  // Spatial partitioning settings
  SPATIAL_CELL_SIZE: 100, // Should be tuned based on typical fish interaction range
};

export const MATH = {
  FULL_CIRCLE: Math.PI * 2,
  HALF_PI: Math.PI * 0.5,
  RAD_TO_DEG: 57.29577951308232,
};

export const CANVAS = {
  DEFAULT_ALPHA: 1,
  TRAIL_ALPHA: 0.2,
};

/**
 * Calculates the optimal number of fish based on screen width
 *
 * @param width - Screen width (in pixels)
 * @param dpr - Device pixel ratio (defaults to 1)
 * @returns The optimal number of fish for the given width, bounded by MIN_FISH and MAX_FISH
 */
export function calculateOptimalFishCount(width: number): number {
  // For actual canvas dimensions that include DPR
  const baseCount = (width / SIMULATION.REFERENCE_WIDTH) * SIMULATION.BASE_FISH_COUNT;

  // Ensure we have a reasonable minimum and maximum
  return Math.min(Math.max(baseCount, SIMULATION.MIN_FISH), SIMULATION.MAX_FISH);
}
