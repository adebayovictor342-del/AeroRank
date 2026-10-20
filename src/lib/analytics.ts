import { GAME_BY_ID, type GameId } from "../games/meta";

/**
 * Google Analytics 4 events.
 *
 * The gtag snippet lives in index.html — replace the G-XXXXXXXXXX placeholder
 * there with your Measurement ID and these events start flowing. Until then
 * gtag() still queues into dataLayer, so nothing here throws and every call is
 * visible via `recentEvents()` (and in the console with ?ga_debug=1).
 */

type GtagArgs = [string, string, Record<string, unknown>?];
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs | [string, unknown]) => void;
    GA_MEASUREMENT_ID?: string;
    __aerorankEvents?: TrackedEvent[];
  }
}

export interface TrackedEvent {
  name: string;
  params: Record<string, unknown>;
  at: number;
}

const RING = 50;
const debugOn = () => {
  try {
    return new URLSearchParams(window.location.search).has("ga_debug");
  } catch {
    return false;
  }
};

/** Measurement ID currently configured, or undefined while the placeholder is in place. */
export function measurementId(): string | undefined {
  const id = typeof window !== "undefined" ? window.GA_MEASUREMENT_ID : undefined;
  return id && !id.includes("XXXX") ? id : undefined;
}

export const analyticsReady = () => Boolean(measurementId());

/** Last events fired, newest last. Used by the test suite and the ?ga_debug=1 view. */
export const recentEvents = (): TrackedEvent[] => (typeof window !== "undefined" && window.__aerorankEvents) || [];

function track(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const payload = { ...params, measurement_configured: analyticsReady() };
  const evt: TrackedEvent = { name, params: payload, at: Date.now() };

  const log = (window.__aerorankEvents ||= []);
  log.push(evt);
  if (log.length > RING) log.shift();

  try {
    window.gtag?.("event", name, payload);
  } catch {
    /* never let analytics break a run */
  }
  if (debugOn()) console.info("[ga4]", name, payload);
}

const gameParams = (game: GameId) => {
  const meta = GAME_BY_ID[game];
  return { game_id: game, game_name: meta.name, score_unit: meta.unit };
};

/* ------------------------------------------------------------------ */
/* Public events                                                       */
/* ------------------------------------------------------------------ */

/** A run has begun. */
export function trackGameStart(game: GameId) {
  track("game_start", gameParams(game));
}

/** A run ended (the player died or finished). */
export function trackGameOver(
  game: GameId,
  score: number,
  extra: { durationMs?: number; isHighScore?: boolean; rank?: number | null } = {},
) {
  track("game_over", {
    ...gameParams(game),
    score,
    duration_sec: extra.durationMs !== undefined ? Math.round(extra.durationMs / 1000) : undefined,
    is_high_score: Boolean(extra.isHighScore),
    leaderboard_rank: extra.rank ?? undefined,
  });
}

/** The run beat the player's stored record for this game. */
export function trackHighScore(game: GameId, score: number, previous: number) {
  track("high_score", {
    ...gameParams(game),
    score,
    previous_score: previous,
    improvement: score - previous,
  });
}

/** Optional: which game the profile currently rates as the player's strongest. */
export function trackBestGame(game: GameId, ratio: number, tier: string) {
  track("best_game_computed", { ...gameParams(game), normalised_ratio: Math.round(ratio * 100) / 100, tier });
}

/** Optional: SPA page views, since this app routes on the hash. */
export function trackPageView(path: string, title?: string) {
  track("page_view", { page_path: path, page_title: title ?? document.title, page_location: window.location.href });
}
