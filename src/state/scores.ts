import { useSyncExternalStore } from "react";
import { GAME_LIST, type GameId } from "../games/meta";
import type { Gender } from "./board";

/**
 * Per-game all-time high scores.
 *
 * The shape below is one row of the `player_scores` table in src/data/schema.sql.
 * There is no server in this build, so the row lives in localStorage behind a
 * swappable adapter — point `setScoresAdapter()` at an API and nothing else in
 * the app has to change.
 */
export interface PlayerScoresRow {
  player_id: string;
  player_name: string;
  /** mandatory signup choice, stored alongside username + high scores */
  player_gender: Gender | null;
  sambisa_highscore: number;
  cliff_highscore: number;
  brick_highscore: number;
  flap_highscore: number;
  updated_at: string;
}

/** game id → database column. */
export const SCORE_COLUMN = {
  skirmish: "sambisa_highscore",
  climb: "cliff_highscore",
  brick: "brick_highscore",
  flap: "flap_highscore",
} as const satisfies Record<GameId, keyof PlayerScoresRow>;

export type ScoreColumn = (typeof SCORE_COLUMN)[GameId];

export const highScoreOf = (row: PlayerScoresRow, game: GameId): number => Number(row[SCORE_COLUMN[game]]) || 0;

/* ------------------------------------------------------------------ */
/* Storage adapter                                                     */
/* ------------------------------------------------------------------ */
export interface ScoresAdapter {
  load(): PlayerScoresRow | null;
  save(row: PlayerScoresRow): void;
}

const KEY = "aerorank.scores.v1";

const localAdapter: ScoresAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as PlayerScoresRow) : null;
    } catch {
      return null;
    }
  },
  save(row) {
    try {
      localStorage.setItem(KEY, JSON.stringify(row));
    } catch {
      /* storage unavailable — scores just won't persist */
    }
  },
};

let adapter: ScoresAdapter = localAdapter;

/**
 * Swap in a real backend, e.g.
 *   setScoresAdapter({ load: () => cached, save: (row) => void fetch("/api/scores", { method: "PUT", body: JSON.stringify(row) }) });
 */
export function setScoresAdapter(next: ScoresAdapter) {
  adapter = next;
  state = normalise(adapter.load());
  emit();
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
function newId() {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

const int = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function normalise(row: Partial<PlayerScoresRow> | null): PlayerScoresRow {
  const g = row?.player_gender;
  return {
    player_id: typeof row?.player_id === "string" && row.player_id ? row.player_id : newId(),
    player_name: typeof row?.player_name === "string" ? row.player_name : "",
    player_gender: g === "male" || g === "female" ? g : null,
    sambisa_highscore: int(row?.sambisa_highscore),
    cliff_highscore: int(row?.cliff_highscore),
    brick_highscore: int(row?.brick_highscore),
    flap_highscore: int(row?.flap_highscore),
    updated_at: typeof row?.updated_at === "string" ? row.updated_at : new Date(0).toISOString(),
  };
}

let state: PlayerScoresRow = normalise(adapter.load());
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function commit(next: PlayerScoresRow) {
  state = next;
  adapter.save(state);
  emit();
}

export interface RecordResult {
  /** the run beat the stored record for this game */
  isHighScore: boolean;
  previous: number;
  current: number;
  row: PlayerScoresRow;
}

export const scoresStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  setName(name: string) {
    if (name === state.player_name) return;
    commit({ ...state, player_name: name });
  },
  setGender(gender: Gender) {
    if (state.player_gender === gender) return;
    commit({ ...state, player_gender: gender, updated_at: new Date().toISOString() });
  },
  /** Write a finished run. A worse run never lowers the record. */
  record(game: GameId, score: number): RecordResult {
    const col = SCORE_COLUMN[game];
    const previous = highScoreOf(state, game);
    const value = int(score);
    if (value <= previous) return { isHighScore: false, previous, current: previous, row: state };
    const row: PlayerScoresRow = { ...state, [col]: value, updated_at: new Date().toISOString() };
    commit(row);
    return { isHighScore: true, previous, current: value, row };
  },
  /** Test/admin helper. */
  reset() {
    commit(normalise(null));
  },
};

export function usePlayerScores(): PlayerScoresRow {
  return useSyncExternalStore(scoresStore.subscribe, scoresStore.get, scoresStore.get);
}

/** All four highs as a plain list, handy for profile UIs. */
export const highScoreList = (row: PlayerScoresRow) =>
  GAME_LIST.map((g) => ({ game: g, column: SCORE_COLUMN[g.id], score: highScoreOf(row, g.id) }));
