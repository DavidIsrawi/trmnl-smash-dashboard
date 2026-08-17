export const STARTGG_API_URL = "https://api.smash.gg/gql/alpha";
export const SMASH_ULTIMATE_ID = 1386;

/** Number of recent sets used to compute season stats and per-event records. */
export const RECENT_SETS_LIMIT = 25;

/**
 * Sets requested per API call. start.gg rejects any request estimated to return
 * 1000 or more objects; GET_PLAYER_SETS costs roughly 25 objects per set, so
 * this stays comfortably under the cap. Larger limits are fetched by paging.
 */
export const SETS_PER_REQUEST = 25;

/** Only character picks are counted toward character usage stats. */
export const CHARACTER_SELECTION_TYPE = "CHARACTER";
