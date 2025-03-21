import { Fish } from './Fish';
import { Vector } from './Vector';
import { logger } from './logging';

/**
 * A spatial partitioning grid system that optimizes collision detection and neighbor searches.
 *
 * This class implements a grid-based spatial partitioning system that divides the world space
 * into cells of equal size. Each cell contains a list of fish that are currently located within
 * that cell's boundaries. This allows for efficient queries of nearby objects without having to
 * check against every object in the world.
 *
 * The grid uses a hash map with string keys of format "x,y" to store cells, making lookups efficient.
 * When querying for objects within a radius, only the cells that overlap with the query circle
 * are checked, significantly reducing the number of distance calculations needed.
 */
export class SpatialGrid {
  /** Map of cell coordinates to lists of fish in each cell */
  private cells: Map<string, Fish[]> = new Map();

  /** The size of each cell in the grid (in pixels) */
  private cellSize: number;

  /**
   * Creates a new spatial grid for efficient spatial queries.
   *
   * @param width - The total width of the space to partition
   * @param height - The total height of the space to partition
   * @param cellSize - The size of each cell in the grid (smaller cells = more precision but higher memory usage)
   */
  constructor(width: number, height: number, cellSize: number) {
    this.cellSize = cellSize;
    logger.debug(`Created spatial grid: ${width}x${height}, cell size: ${cellSize}`);
  }

  /**
   * Converts a world position to a cell key string.
   *
   * @param x - X coordinate in world space
   * @param y - Y coordinate in world space
   * @returns A string key in the format "gridX,gridY" that uniquely identifies a cell
   * @private
   */
  private getCellKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return `${gridX},${gridY}`;
  }

  /**
   * Clears all cells in the grid, removing all tracked objects.
   * This is typically called before updating the grid with new object positions.
   */
  public clear(): void {
    this.cells.clear();
  }

  /**
   * Resizes the grid to accommodate a new world size.
   * Since this implementation uses dynamic cell allocation, it only needs to clear the grid.
   *
   * @param width - New width of the world
   * @param height - New height of the world
   */
  public resize(width: number, height: number): void {
    // Since we're using a dynamic cell-based system, we just need to clear the grid
    // The width and height parameters are kept for API consistency
    this.clear();
    logger.debug(`Resized spatial grid: ${width}x${height}`);
  }

  /**
   * Inserts a fish into the appropriate cell in the grid based on its current location.
   *
   * @param fish - The fish to insert into the grid
   */
  public insert(fish: Fish): void {
    const key = this.getCellKey(fish.location.x, fish.location.y);

    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }

    this.cells.get(key)!.push(fish);
  }

  /**
   * Updates the entire grid with the current positions of all fish.
   * Clears the grid and re-inserts all fish.
   *
   * @param fishes - Array of all fish to track in the grid
   */
  public updateGrid(fishes: Fish[]): void {
    this.clear();
    for (const fish of fishes) {
      this.insert(fish);
    }
  }

  /**
   * Queries the grid for all fish within a specified radius of a position.
   * This is the core optimization method that only checks fish in grid cells that
   * intersect with the query circle.
   *
   * @param position - Center position of the query circle
   * @param radius - Radius of the query circle
   * @returns Array of fish that are within the specified radius
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
   * Visualizes the spatial grid for debugging purposes.
   * Draws the grid lines, occupied cells, and optionally highlights a query area.
   *
   * @param ctx - The canvas rendering context to draw on
   * @param worldWidth - Total width of the world
   * @param worldHeight - Total height of the world
   * @param highlightRadius - Optional radius to highlight (e.g., to show active query area)
   * @param highlightPosition - Optional position to center the highlight
   */
  public drawGrid(
    ctx: CanvasRenderingContext2D,
    worldWidth: number,
    worldHeight: number,
    highlightRadius?: number,
    highlightPosition?: Vector
  ): void {
    // Get device pixel ratio for appropriate scaling
    const dpr = window.devicePixelRatio || 1;

    // Save the current canvas state
    ctx.save();

    // Set grid style - using a more subtle blue for grid lines
    ctx.strokeStyle = 'rgba(120, 140, 180, 0.2)'; // Soft blue, very transparent
    ctx.lineWidth = Math.max(1, dpr * 0.5); // Scale line width with DPR, but keep a minimum

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

        // Optionally, show fish count in each cell - scale font with DPR
        const baseFontSize = 10;
        const scaledFontSize = baseFontSize * Math.max(1, Math.min(1.5, dpr));

        ctx.fillStyle = 'rgba(40, 60, 80, 0.5)'; // Dark blue for text
        ctx.font = `${scaledFontSize}px Arial`;
        ctx.fillText(
          fishes.length.toString(),
          x + this.cellSize / 2 - scaledFontSize / 3,
          y + this.cellSize / 2 + scaledFontSize / 3
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
      ctx.lineWidth = Math.max(2, dpr); // Scale line width with DPR
      ctx.beginPath();
      ctx.arc(highlightPosition.x, highlightPosition.y, highlightRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Restore the canvas state
    ctx.restore();
  }

  /**
   * Gets the cell size used by this grid.
   *
   * @returns The size of each cell in pixels
   */
  public getCellSize(): number {
    return this.cellSize;
  }

  /**
   * Gets the total number of currently occupied cells in the grid.
   *
   * @returns The number of cells containing at least one fish
   */
  public getOccupiedCellCount(): number {
    return this.cells.size;
  }

  /**
   * Gets statistics about the current state of the grid.
   *
   * @returns An object containing stats about the grid:
   *   - totalCells: total number of occupied cells
   *   - occupiedCells: alias for totalCells (for backward compatibility)
   *   - fishCount: total number of fish in the grid
   *   - maxFishInCell: maximum number of fish in any single cell
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
