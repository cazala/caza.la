import { Fish } from './Fish';
import { Vector } from './Vector';
import { logger } from './logging';

/**
 * A spatial partitioning grid to optimize collision detection and neighbor searches
 */
export class SpatialGrid {
  private cells: Map<string, Fish[]> = new Map();
  private cellSize: number;

  /**
   * Create a new spatial grid
   * @param width The total width of the space
   * @param height The total height of the space
   * @param cellSize The size of each cell in the grid
   */
  constructor(width: number, height: number, cellSize: number) {
    this.cellSize = cellSize;
    logger.debug(`Created spatial grid: ${width}x${height}, cell size: ${cellSize}`);
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
    // Since we're using a dynamic cell-based system, we just need to clear the grid
    // The width and height parameters are kept for API consistency
    this.clear();
    logger.debug(`Resized spatial grid: ${width}x${height}`);
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

  /**
   * Draw the spatial grid for visualization purposes
   * @param ctx The canvas rendering context
   * @param worldWidth Total width of the world
   * @param worldHeight Total height of the world
   * @param highlightRadius Optional radius to highlight (e.g., to show active query area)
   * @param highlightPosition Optional position to center the highlight
   */
  public drawGrid(
    ctx: CanvasRenderingContext2D,
    worldWidth: number,
    worldHeight: number,
    highlightRadius?: number,
    highlightPosition?: Vector
  ): void {
    // Save the current canvas state
    ctx.save();

    // Set grid style - using a more subtle blue for grid lines
    ctx.strokeStyle = 'rgba(120, 140, 180, 0.2)'; // Soft blue, very transparent
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = 0; x <= worldWidth; x += this.cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, worldHeight);
      ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= worldHeight; y += this.cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(worldWidth, y);
      ctx.stroke();
    }

    // Highlight cells that contain fish
    ctx.fillStyle = 'rgba(72, 118, 164, 0.15)'; // Steel blue, very transparent

    for (const [key, fishes] of this.cells.entries()) {
      if (fishes.length > 0) {
        // Parse the key to get grid coordinates
        const [gridX, gridY] = key.split(',').map(Number);

        // Calculate pixel coordinates
        const x = gridX * this.cellSize;
        const y = gridY * this.cellSize;

        // Fill the cell
        ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // Optionally, show fish count in each cell
        ctx.fillStyle = 'rgba(40, 60, 80, 0.5)'; // Dark blue for text
        ctx.font = '10px Arial';
        ctx.fillText(
          fishes.length.toString(),
          x + this.cellSize / 2 - 3,
          y + this.cellSize / 2 + 3
        );
        ctx.fillStyle = 'rgba(72, 118, 164, 0.15)'; // Reset for the next cell
      }
    }

    // If a highlight position and radius are provided, draw the active query area
    if (highlightPosition && highlightRadius) {
      // Determine grid cells that need to be checked
      const minX = Math.floor((highlightPosition.x - highlightRadius) / this.cellSize);
      const minY = Math.floor((highlightPosition.y - highlightRadius) / this.cellSize);
      const maxX = Math.floor((highlightPosition.x + highlightRadius) / this.cellSize);
      const maxY = Math.floor((highlightPosition.y + highlightRadius) / this.cellSize);

      // Highlight cells within query radius
      ctx.fillStyle = 'rgba(144, 174, 206, 0.25)'; // Lighter blue for query area

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
        }
      }

      // Draw the actual query circle
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)'; // Brighter blue for the radius circle
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(highlightPosition.x, highlightPosition.y, highlightRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Restore the canvas state
    ctx.restore();
  }

  /**
   * Get the cell size used by this grid
   */
  public getCellSize(): number {
    return this.cellSize;
  }

  /**
   * Get the total number of currently occupied cells
   */
  public getOccupiedCellCount(): number {
    return this.cells.size;
  }

  /**
   * Get stats about the cells in the grid
   * @returns Object with statistics about the grid
   */
  public getGridStats(): {
    totalCells: number;
    occupiedCells: number;
    fishCount: number;
    maxFishInCell: number;
  } {
    const occupiedCells = this.cells.size;
    let totalFishCount = 0;
    let maxFishInCell = 0;

    for (const fishes of this.cells.values()) {
      totalFishCount += fishes.length;
      maxFishInCell = Math.max(maxFishInCell, fishes.length);
    }

    return {
      totalCells: occupiedCells,
      occupiedCells,
      fishCount: totalFishCount,
      maxFishInCell,
    };
  }
}
