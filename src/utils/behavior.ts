import { Fish } from '../lib/Fish';

/**
 * Categorizes fish into groups based on their mass relative to a reference fish
 * @param fish The reference fish
 * @param neighbors List of neighboring fish
 * @param biggerThreshold Threshold for "bigger" fish (multiplier of reference mass)
 * @param smallerThreshold Threshold for "smaller" fish (multiplier of reference mass)
 * @returns Object containing categorized lists of fish
 */
export function categorizeFishByMass(
  fish: Fish,
  neighbors: Fish[],
  biggerThreshold: number,
  smallerThreshold: number
): { bigger: Fish[]; similar: Fish[]; smaller: Fish[] } {
  const bigger: Fish[] = [];
  const similar: Fish[] = [];
  const smaller: Fish[] = [];

  for (const neighbor of neighbors) {
    if (neighbor.mass > fish.mass * biggerThreshold) {
      bigger.push(neighbor);
    } else if (neighbor.mass < fish.mass * smallerThreshold) {
      smaller.push(neighbor);
    } else {
      similar.push(neighbor);
    }
  }

  return { bigger, similar, smaller };
}
