export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000); // Start.gg uses unix timestamp (seconds)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function calculateDaysRemaining(timestamp: number): number {
  const now = Date.now();
  const target = timestamp * 1000;
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the Upset Factor (UF) for a tournament result.
 * UF measures how many bracket "rounds" a player over- or under-performed
 * relative to their seed. A positive value means they placed better than
 * expected (upset); negative means they underperformed.
 *
 * Uses bracket round tiers: seed/placement 1 → round 0, 2 → round 1,
 * 3-4 → round 2, 5-8 → round 3, etc.
 */
export function calculateUpsetFactor(seed: number, placement: number): number {
  const seedRound = Math.floor(Math.log2(seed));
  const placementRound = Math.floor(Math.log2(placement));
  return seedRound - placementRound;
}
