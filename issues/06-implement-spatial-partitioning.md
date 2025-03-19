# Issue 06: Implement Spatial Partitioning for Performance Optimization

## Description

Implement a spatial partitioning system to optimize fish interaction calculations, reducing the O(n²) complexity of the current implementation to improve performance, especially with larger numbers of fish.

## Problem

Currently, every fish checks its interactions with all other fish in the simulation:

- This results in an O(n²) complexity, which becomes inefficient as the number of fish increases
- The `look()` method in the Fish class iterates through all other fish to find neighbors
- Performance will degrade significantly with larger fish populations
- Mobile devices may experience lag with the current implementation

## Solution

1. Implement a spatial partitioning system (Quadtree or Grid-based) to divide the world into regions
2. Only check interactions between fish in the same or adjacent regions
3. Update the simulation loop to use the partitioning system
4. Optimize the `look()` method to query the spatial partitioning structure instead of checking all fish

## Implementation Details

### 1. Create a Grid-based Spatial Partitioning System

```typescript
// src/lib/SpatialGrid.ts

import { Fish } from "./Fish";
import { Vector } from "./Vector";
import { logger } from "./logging";

/**
 * A spatial partitioning grid to optimize collision detection and neighbor searches
 */
export class SpatialGrid {
  private cells: Map<string, Fish[]> = new Map();
  private cellSize: number;
  private width: number;
  private height: number;

  /**
   * Create a new spatial grid
   * @param width The total width of the space
   * @param height The total height of the space
   * @param cellSize The size of each cell in the grid
   */
  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    logger.debug(
      `Created spatial grid: ${width}x${height}, cell size: ${cellSize}`
    );
  }

  /**
   * Get the cell key for a position
   * @param x X coordinate
   * @param y Y coordinate
   * @returns String key for the cell
   */
  private getCellKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return `${gridX},${gridY}`;
  }

  /**
   * Clear all cells in the grid
   */
  public clear(): void {
    this.cells.clear();
  }

  /**
   * Resize the grid
   * @param width New width
   * @param height New height
   */
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.clear();
  }

  /**
   * Insert a fish into the appropriate cell in the grid
   * @param fish The fish to insert
   */
  public insert(fish: Fish): void {
    const key = this.getCellKey(fish.location.x, fish.location.y);

    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }

    this.cells.get(key)!.push(fish);
  }

  /**
   * Update the grid with all fish
   * @param fishes Array of all fish
   */
  public updateGrid(fishes: Fish[]): void {
    this.clear();
    for (const fish of fishes) {
      this.insert(fish);
    }
  }

  /**
   * Get all fish within a radius of a position
   * @param position Center position
   * @param radius Search radius
   * @returns Array of fish within the radius
   */
  public query(position: Vector, radius: number): Fish[] {
    const neighbors: Fish[] = [];

    // Determine grid cells that need to be checked
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const minY = Math.floor((position.y - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const maxY = Math.floor((position.y + radius) / this.cellSize);

    // Check each potentially overlapping cell
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const cell = this.cells.get(key);

        if (cell) {
          for (const fish of cell) {
            const distance = position.dist(fish.location);
            if (distance <= radius) {
              neighbors.push(fish);
            }
          }
        }
      }
    }

    return neighbors;
  }
}
```

### 2. Update the Simulation Class to Use Spatial Partitioning

```typescript
// src/lib/Simulation.ts (partial)

import { SpatialGrid } from "./SpatialGrid";
import { SIMULATION } from "./constants";

export class Simulation {
  // ... existing properties

  // Add spatial grid
  private spatialGrid: SpatialGrid;

  constructor(options: SimulationOptions) {
    // ... existing initialization

    // Initialize spatial grid with cell size based on average interaction distance
    this.spatialGrid = new SpatialGrid(
      this.world.width,
      this.world.height,
      SIMULATION.SPATIAL_CELL_SIZE
    );

    // ... rest of constructor
  }

  // Update resize method to also resize the spatial grid
  private resize(): void {
    // ... existing resize code

    // Update spatial grid dimensions
    this.spatialGrid.resize(this.world.width, this.world.height);
  }

  private timestep(): void {
    // ... existing setup code

    // Update spatial grid with current fish positions
    this.spatialGrid.updateGrid(this.world.creatures);

    for (const fish of this.world.creatures) {
      // ... follow behavior code

      // Use spatial partitioning for neighbor lookups
      const nearbyFish = this.spatialGrid.query(fish.location, fish.lookRange);

      const neighbors = fish.filterVisibleNeighbors(nearbyFish, Math.PI * 2);

      // ... rest of fish behavior code
    }

    // ... rest of timestep code
  }

  // ... rest of class
}
```

### 3. Update the Fish Class to Work with Spatial Partitioning

```typescript
// src/lib/Fish.ts (partial)

// Update look method to filter a pre-filtered list rather than checking all creatures
filterVisibleNeighbors(nearbyFish: Fish[], angle: number): Fish[] {
  const neighbors: Fish[] = [];
  for (const creature of nearbyFish) {
    if (creature !== this) {
      const diff = this.location.copy().sub(creature.location);
      const a = this.velocity.angleBetween(diff);
      if (a < angle / 2 || a > Math.PI * 2 - angle / 2) {
        neighbors.push(creature);
      }
    }
  }
  return neighbors;
}
```

### 4. Add Constants for Spatial Partitioning

```typescript
// src/lib/constants.ts (partial)

export const SIMULATION = {
  // ... existing constants

  // Spatial partitioning settings
  SPATIAL_CELL_SIZE: 100, // Should be tuned based on typical fish interaction range
};
```

## Benefits

- Significant performance improvement, especially with larger numbers of fish
- Reduced computational complexity from O(n²) to closer to O(n)
- Better performance on mobile devices
- Ability to increase the number of fish without degrading performance
- More efficient neighbor lookups
- Scalable solution for future enhancements

## Acceptance Criteria

- [ ] Implementation of a spatial partitioning system (Grid or Quadtree)
- [ ] Integration with the simulation loop
- [ ] Updated fish interaction logic to use spatial partitioning
- [ ] Performance testing shows improvement compared to the original implementation
- [ ] System adjusts correctly to window resizing
- [ ] No regression in fish behavior
- [ ] Documentation of the spatial partitioning system and its usage
