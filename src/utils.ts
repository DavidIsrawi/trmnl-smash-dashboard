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
