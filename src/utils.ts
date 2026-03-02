export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000); // Start.gg uses unix timestamp (seconds)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function calculateDaysRemaining(timestamp: number): number {
  const now = Date.now();
  const target = timestamp * 1000;
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Map a seed or placement to its double-elimination bracket tier.
 *
 * Double-elimination tiers differ from single-elimination because placements
 * 1–4 are each distinct, and after that tiers come in pairs that double every
 * two rounds (reflecting the losers bracket structure):
 *   1→0, 2→1, 3→2, 4→3, 5-6→4, 7-8→5, 9-12→6, 13-16→7, 17-24→8, 25-32→9, ...
 */
export function getDoubleElimRound(n: number): number {
  if (n <= 1) return 0;
  const k = Math.ceil(Math.log2(n));
  const mid = 3 * Math.pow(2, k - 2);
  return 2 * (k - 1) + (n > mid ? 1 : 0);
}

/**
 * Calculate the Upset Factor (UF) for a tournament result.
 * UF measures how many double-elimination bracket "rounds" a player over- or
 * under-performed relative to their seed. A positive value means they placed
 * better than expected (upset); negative means they underperformed.
 *
 * Uses the industry-standard double-elimination tier mapping as defined by
 * PGStats and used by SmashExplorer and upsets.gg.
 */
export function calculateUpsetFactor(seed: number, placement: number): number {
  return getDoubleElimRound(seed) - getDoubleElimRound(placement);
}
