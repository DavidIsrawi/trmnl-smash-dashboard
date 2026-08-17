import {
  DEFAULT_TIME_ZONE,
  MS_PER_DAY,
  RETRY_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
} from "./constants.js";

/**
 * Time zone used for all user-facing dates.
 *
 * Read lazily rather than at module load: `dotenv.config()` runs after imports
 * are evaluated, so a top-level read would always miss values from `.env`.
 * Hosts also matter here — Azure App Service runs in UTC, so relying on the
 * system zone would render dates a day off for anyone west of it.
 *
 * The value is validated once and memoized. `Intl` throws a `RangeError` on a
 * bad IANA name, and because every caller sits inside the refresh loop's
 * `try`, an unchecked bad value would silently fail every cycle forever rather
 * than surfacing anywhere. Falling back loudly keeps the display updating.
 */
let resolvedTimeZone: string | undefined;

function getTimeZone(): string {
  if (resolvedTimeZone !== undefined) return resolvedTimeZone;

  const configured = process.env.TIMEZONE?.trim();
  if (!configured) {
    resolvedTimeZone = DEFAULT_TIME_ZONE;
    return resolvedTimeZone;
  }

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: configured });
    resolvedTimeZone = configured;
  } catch {
    console.error(
      `Invalid TIMEZONE "${configured}", falling back to ${DEFAULT_TIME_ZONE}. ` +
        "Expected an IANA name such as America/Los_Angeles.",
    );
    resolvedTimeZone = DEFAULT_TIME_ZONE;
  }

  return resolvedTimeZone;
}

/** Start.gg returns unix timestamps in seconds. */
function toDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Midnight of the given instant's calendar day, expressed as a UTC epoch.
 * Normalizing both sides of a comparison this way makes day arithmetic exact
 * regardless of the host's own time zone.
 */
function startOfDay(date: Date, timeZone: string): number {
  // "en-CA" formats as YYYY-MM-DD, which parses cleanly into parts.
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("-")
    .map(Number);

  return Date.UTC(year, month - 1, day);
}

export function formatDate(timestamp: number): string {
  return toDate(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: getTimeZone(),
  });
}

/**
 * Whole calendar days between today and the target date.
 *
 * Counts day boundaries rather than elapsed time, so an event tomorrow morning
 * reads "1 day" even when it is only a few hours away. Past dates go negative.
 */
export function calculateDaysRemaining(
  timestamp: number,
  now: Date = new Date(),
): number {
  const timeZone = getTimeZone();
  const target = startOfDay(toDate(timestamp), timeZone);
  const today = startOfDay(now, timeZone);

  // Both operands are UTC midnights, so the division is exact.
  return Math.round((target - today) / MS_PER_DAY);
}

/**
 * Compare start.gg identifiers without caring about their JSON type.
 *
 * The API returns `ID` fields as strings but `winnerId` fields as numbers, and
 * the same entrant shows up as both depending on where it is read from.
 */
export function sameId(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  return String(a) === String(b);
}

/**
 * Run an async operation, retrying transient failures with exponential backoff.
 * Network blips and start.gg rate limiting are common enough that a single
 * failure should not cost the display an entire refresh cycle.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  label: string,
  attempts: number = RETRY_ATTEMPTS,
  baseDelayMs: number = RETRY_BASE_DELAY_MS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) break;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `${label} failed (attempt ${attempt}/${attempts}), retrying in ${delay}ms:`,
        error instanceof Error ? error.message : error,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
