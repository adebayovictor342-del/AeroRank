import { useSyncExternalStore } from "react";
import type { GameId } from "../games/meta";
import { WEEK, weekFromKey, weekKey, weekStartOf, monthKey, monthStartOf, type Gender, type Profile } from "./board";

const KEY = "aerorank.v1";
const KEEP_WEEKS = 12;

function fresh(): Profile {
  return { name: `Player${100 + Math.floor(Math.random() * 900)}`, gender: null, weeks: {}, lastRank: {} };
}

function asGender(v: unknown): Gender | null {
  return v === "male" || v === "female" ? v : null;
}

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      return {
        name: typeof p.name === "string" && p.name.trim() ? p.name.slice(0, 14) : fresh().name,
        gender: asGender((p as Record<string, unknown>).gender),
        weeks: p.weeks && typeof p.weeks === "object" ? p.weeks : {},
        lastRank: p.lastRank && typeof p.lastRank === "object" ? p.lastRank : {},
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return fresh();
}

let state: Profile = load();
const listeners = new Set<() => void>();

function commit(next: Profile) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — profile just won't persist */
  }
  listeners.forEach((l) => l());
}
commit(state);

function prune(p: Profile, now: number): Profile {
  const oldest = weekStartOf(now) - KEEP_WEEKS * WEEK;
  const weeks = Object.fromEntries(Object.entries(p.weeks).filter(([k]) => weekFromKey(k) >= oldest));
  const lastRank = Object.fromEntries(Object.entries(p.lastRank).filter(([k]) => weekFromKey(k.split(":")[0]) >= oldest));
  return { ...p, weeks, lastRank };
}

export const profileStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  setName(name: string) {
    const clean = name.slice(0, 14);
    commit({ ...state, name: clean });
  },
  setGender(gender: Gender) {
    if (state.gender === gender) return;
    commit({ ...state, gender });
  },
  /** Records a finished run. Routes Final_XP integer into centralized weekly & monthly boards. */
  submit(game: GameId, score: number, now: number) {
    const wk = weekKey(weekStartOf(now));
    const mo = monthKey(monthStartOf(now));
    const prev = state.weeks[wk]?.[game] ?? 0;
    const prevMo = state.months?.[mo]?.[game] ?? 0;
    const isBest = score > prev;
    const nextWeeks = isBest ? { ...state.weeks, [wk]: { ...state.weeks[wk], [game]: score } } : state.weeks;
    const nextMonths = score > prevMo
      ? { ...(state.months || {}), [mo]: { ...(state.months?.[mo] || {}), [game]: score } }
      : state.months;

    if (isBest || score > prevMo) {
      commit(prune({ ...state, weeks: nextWeeks, months: nextMonths }, now));
      return { isBest, prev };
    }
    return { isBest: false, prev };
  },
  markRank(game: GameId, wk: number, rank: number | null) {
    const key = `${weekKey(wk)}:${game}`;
    if (rank === null || state.lastRank[key] === rank) return;
    commit({ ...state, lastRank: { ...state.lastRank, [key]: rank } });
  },
};

export function useProfile(): Profile {
  return useSyncExternalStore(profileStore.subscribe, profileStore.get, profileStore.get);
}
