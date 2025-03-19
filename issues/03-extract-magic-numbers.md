# Issue 03: Extract Magic Numbers into Constants

## Description

Refactor the codebase to replace magic numbers and string literals with named constants to improve readability, maintainability, and prevent bugs from typos or inconsistent values.

## Problem

The codebase contains numerous numeric and string literals (magic numbers/strings) without clear meaning:

- Fish behavior calculations use values like 150, 100, 200, etc.
- Angles use Math.PI \* 2 without explanation
- Similar values are repeated in multiple places
- The purpose of many numeric values is unclear without context

## Solution

1. Identify all magic numbers/strings in the codebase
2. Create well-named constants for each value
3. Group related constants into namespaces or enum-like objects
4. Replace all occurrences with the new constants
5. Add comments to explain the purpose of non-obvious constants

## Implementation Details

1. Create a constants file for simulation settings:

   ```typescript
   // src/lib/constants.ts

   export const FISH = {
     // Fish behavior constants
     FOLLOW_RADIUS: 150,
     LOOK_RANGE_MULTIPLIER: 200,
     SEPARATION_RANGE_MULTIPLIER: 30,
     LENGTH_MULTIPLIER: 20,
     BASE_MULTIPLIER: 0.5,

     // Speed and force constants
     MAX_SPEED_MULTIPLIER: 12,
     MAX_FORCE_DIVISOR: 0.1,

     // Behavior weighting
     SEPARATION_WEIGHT: 1.4,
     ALIGNMENT_WEIGHT: 1.2,
     COHESION_WEIGHT: 1.0,

     // Visualization
     DEFAULT_COLOR: "black",
     AVOID_COLOR: "blue",
     CHASE_COLOR: "red",
     WANDER_COLOR: "gray",
     SHOAL_COLOR: "black",

     // Behavior thresholds
     MASS_THRESHOLD_BIGGER: 2, // X times current fish mass
     MASS_THRESHOLD_SMALLER: 0.5, // X times current fish mass
   };

   export const SIMULATION = {
     // Animation settings
     NORMAL_INTERVAL: 20,
     SLOW_INTERVAL: 45,
     ALPHA_STEP: 0.032,

     // Interaction settings
     CLICK_THRESHOLD: 300, // ms
     TOUCH_MOUSE_PREVENTION_TIMEOUT: 500, // ms

     // Boundary settings
     BOUNDARY_FORCE_MULTIPLIER: 3,
     BOUNDARY_DISTANCE: 50,
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
   ```

2. Replace occurrences in Fish.ts:

   ```typescript
   // Before
   this.maxspeed = 12 * this.mass;
   this.maxforce = 0.1 / this.mass;
   this.separationRange = this.mass * 30;
   this.lookRange = this.mass * 200;

   // After
   import { FISH, MATH } from "./constants";

   this.maxspeed = FISH.MAX_SPEED_MULTIPLIER * this.mass;
   this.maxforce = FISH.MAX_FORCE_DIVISOR / this.mass;
   this.separationRange = this.mass * FISH.SEPARATION_RANGE_MULTIPLIER;
   this.lookRange = this.mass * FISH.LOOK_RANGE_MULTIPLIER;
   this.HALF_PI = MATH.HALF_PI;
   this.RAD_TO_DEG = MATH.RAD_TO_DEG;
   ```

3. Replace occurrences in Simulation.ts:

   ```typescript
   // Before
   private static CLICK_THRESHOLD = 300;
   private static readonly TOUCH_MOUSE_PREVENTION_TIMEOUT = 500;
   this.interval = 20;

   // After
   import { SIMULATION } from './constants';

   private static CLICK_THRESHOLD = SIMULATION.CLICK_THRESHOLD;
   private static readonly TOUCH_MOUSE_PREVENTION_TIMEOUT = SIMULATION.TOUCH_MOUSE_PREVENTION_TIMEOUT;
   this.interval = SIMULATION.NORMAL_INTERVAL;
   ```

## Benefits

- Improved code readability with self-documenting constants
- Centralized configuration for easy tuning of simulation parameters
- Prevention of bugs from mistyped numeric values
- Easier maintenance when changing values (change in one place only)
- Better documentation of the meaning and purpose of specific values

## Acceptance Criteria

- [ ] All magic numbers and strings are identified and extracted to constants
- [ ] Constants are organized in a logical structure (by component, function, etc.)
- [ ] Constants have descriptive names that explain their purpose
- [ ] Important constants have comments explaining their meaning
- [ ] All occurrences of magic numbers are replaced with constants
- [ ] There are no direct numeric literals in the business logic (except for obvious cases like 0, 1)
