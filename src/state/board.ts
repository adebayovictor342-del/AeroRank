import { GAME_LIST, type GameId } from "../games/meta";

export const DAY = 86_400_000;
export const WEEK = 7 * DAY;
export const MONTH = 30 * DAY;
export const BOARD_SIZE = 14;

/** Player gender — mandatory at signup, drives Battle Mode team sorting. */
export type Gender = "male" | "female";

export interface Profile {
  name: string;
  /** mandatory signup choice: "male" | "female" | null until chosen */
  gender: Gender | null;
  /** weekKey → game → best Final_XP */
  weeks: Record<string, Partial<Record<GameId, number>>>;
  /** monthKey → game → best Final_XP */
  months?: Record<string, Partial<Record<GameId, number>>>;
  /** `${weekKey}:${game}` → last rank the player saw */
  lastRank: Record<string, number>;
}

export interface Entry {
  id: string;
  name: string;
  face: string;
  score: number; // Final_XP integer
  you: boolean;
}

export interface GrandEntry {
  id: string;
  name: string;
  face: string;
  points: number; // XP or Grand Championship points
  you: boolean;
}

/* ------------------------------------------------------------------ */
/* Periods — Weekly (Mondays 00:00 UTC) & Monthly (1st of each month)  */
/* ------------------------------------------------------------------ */
export function weekStartOf(ms: number): number {
  const d = new Date(ms);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow);
}

export const weekKey = (start: number) => new Date(start).toISOString().slice(0, 10);
export const weekFromKey = (key: string) => Date.parse(`${key}T00:00:00Z`);

export function weekLabel(start: number): string {
  const f = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f(start)} – ${f(start + WEEK - DAY)}`;
}

export function monthStartOf(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export const monthKey = (start: number) => new Date(start).toISOString().slice(0, 7);

export function monthLabel(start: number): string {
  return new Date(start).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function monthEndOf(start: number): number {
  const d = new Date(start);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/* ------------------------------------------------------------------ */
/* Simulated rivals (deterministic per game + period)                 */
/* ------------------------------------------------------------------ */
export const POOL: [string, string][] = [
  ["Nova", "🦊"],
  ["Kite", "🐼"],
  ["Rex", "🐸"],
  ["Juno", "🦄"],
  ["Mako", "🐙"],
  ["Pixel", "🐯"],
  ["Sable", "🦉"],
  ["Orbit", "🐧"],
  ["Zed", "🐲"],
  ["Lumi", "🦁"],
  ["Bram", "🐨"],
  ["Echo", "🐵"],
  ["Vex", "🤖"],
  ["Tango", "🦜"],
  ["Rune", "🐺"],
  ["Piper", "🦋"],
  ["Hex", "🦈"],
  ["Dash", "🐢"],
  ["Cleo", "🐱"],
  ["Otto", "🐻"],
  ["Skye", "🦅"],
  ["Fizz", "🐝"],
  ["Yuki", "🐰"],
  ["Blitz", "🦎"],
];

/** Everyone who can be found, followed and viewed on a profile. */
export const PEOPLE: { id: string; name: string; face: string }[] = POOL.map(([name, face]) => ({ id: name, name, face }));

export function personById(id: string) {
  return PEOPLE.find((p) => p.id === id);
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Bot {
  id: string;
  name: string;
  face: string;
  final: number; // Final_XP integer
  join: number;
}

const botCache = new Map<string, Bot[]>();

function botsFor(game: GameId, periodStart: number): Bot[] {
  const k = `${game}:${periodStart}`;
  const hit = botCache.get(k);
  if (hit) return hit;
  const rng = mulberry32(hash(k));
  const pool = POOL.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Base skill benchmark is 760 XP (verified 2-minute baseline: 76 kills * 10 XP)
  const skill = GAME_LIST.find((g) => g.id === game)?.skill || 760;
  const top = skill * (0.85 + rng() * 0.35);
  const bots = pool.slice(0, BOARD_SIZE).map(([name, face], i) => ({
    id: name,
    name,
    face,
    final: Math.max(10, Math.round(top * Math.pow(1 - i / (BOARD_SIZE + 3), 1.8) * (0.93 + rng() * 0.14))),
    join: rng() * 0.45,
  }));
  botCache.set(k, bots);
  return bots;
}

function botScore(b: Bot, progress: number): number {
  const e = clamp((progress - b.join) / (0.95 - b.join), 0, 1);
  return Math.round(b.final * (1 - (1 - e) * (1 - e)));
}

/* ------------------------------------------------------------------ */
/* Boards (Weekly & Monthly Centralized Indexing)                     */
/* ------------------------------------------------------------------ */
export function botEntries(game: GameId, wk: number, now: number): Entry[] {
  const p = clamp((now - wk) / WEEK, 0, 1);
  return botsFor(game, wk)
    .map((b) => ({ id: b.id, name: b.name, face: b.face, score: botScore(b, p), you: false }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Full ranked weekly board for one game, with the player's Final_XP slotted in. */
export function boardFor(game: GameId, wk: number, now: number, profile: Profile): Entry[] {
  const list = botEntries(game, wk, now);
  const mine = profile.weeks[weekKey(wk)]?.[game] ?? 0;
  if (mine > 0) {
    let idx = list.findIndex((e) => e.score < mine);
    if (idx < 0) idx = list.length;
    list.splice(idx, 0, { id: "you", name: profile.name, face: "🧑‍🚀", score: mine, you: true });
  }
  return list;
}

/** Full ranked monthly board for one game, with the player's monthly Final_XP slotted in. */
export function monthlyBoardFor(game: GameId, mo: number, now: number, profile: Profile): Entry[] {
  const end = monthEndOf(mo);
  const p = clamp((now - mo) / (end - mo), 0, 1);
  const list = botsFor(game, mo)
    .map((b) => ({
      id: b.id,
      name: b.name,
      face: b.face,
      // Monthly baseline scales up to 1.5x of weekly XP benchmark
      score: Math.round(botScore(b, p) * 1.45),
      you: false,
    }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);

  const mKey = monthKey(mo);
  const mineMonthly = profile.months?.[mKey]?.[game] ?? profile.weeks[weekKey(weekStartOf(now))]?.[game] ?? 0;
  if (mineMonthly > 0) {
    let idx = list.findIndex((e) => e.score < mineMonthly);
    if (idx < 0) idx = list.length;
    list.splice(idx, 0, { id: "you", name: profile.name, face: "🧑‍🚀", score: mineMonthly, you: true });
  }
  return list;
}

export const rankOfYou = (board: Entry[]): number | null => {
  const i = board.findIndex((e) => e.you);
  return i < 0 ? null : i + 1;
};

export function runStanding(bots: Entry[], score: number) {
  const ahead = bots.filter((b) => b.score >= score);
  const target = ahead.length ? ahead[ahead.length - 1] : null;
  return { rank: ahead.length + 1, target, need: target ? target.score - score + 1 : 0 };
}

export function grandBoard(wk: number, now: number, profile: Profile): GrandEntry[] {
  const map = new Map<string, GrandEntry>();
  for (const g of GAME_LIST) {
    boardFor(g.id, wk, now, profile)
      .slice(0, 10)
      .forEach((e, i) => {
        const cur = map.get(e.id) ?? { id: e.id, name: e.name, face: e.face, points: 0, you: e.you };
        cur.points += 10 - i;
        map.set(e.id, cur);
      });
  }
  return [...map.values()].sort((a, b) => b.points - a.points || Number(a.you) - Number(b.you));
}

export function monthlyGrandBoard(mo: number, now: number, profile: Profile): GrandEntry[] {
  const map = new Map<string, GrandEntry>();
  for (const g of GAME_LIST) {
    monthlyBoardFor(g.id, mo, now, profile)
      .slice(0, 10)
      .forEach((e, i) => {
        const cur = map.get(e.id) ?? { id: e.id, name: e.name, face: e.face, points: 0, you: e.you };
        cur.points += 10 - i;
        map.set(e.id, cur);
      });
  }
  return [...map.values()].sort((a, b) => b.points - a.points || Number(a.you) - Number(b.you));
}

/* ------------------------------------------------------------------ */
/* Prize Structures — ₦20,000 Weekly Prize Board & ₦200,000 Monthly   */
/* ------------------------------------------------------------------ */
export interface Tier {
  id: string;
  label: string;
  icon: string;
  title: string;
  nairaAmount: string;
  perks: string[];
  from: number;
  to: number;
}

export const WEEKLY_PRIZE_POOL_NAIRA = "₦20,000";
export const MONTHLY_PRIZE_POOL_NAIRA = "₦200,000";

/** ₦20,000 Weekly Prize Board breakdown */
export const TIERS: Tier[] = [
  {
    id: "gold",
    label: "1st Place",
    icon: "👑",
    title: "Weekly Champion",
    nairaAmount: "₦10,000",
    perks: ["₦10,000 Instant Cash Payout", "Name in Hall of Fame", "Reigning-champion crown on board all next week"],
    from: 1,
    to: 1,
  },
  {
    id: "silver",
    label: "2nd Place",
    icon: "🥈",
    title: "Silver Runner-Up",
    nairaAmount: "₦5,000",
    perks: ["₦5,000 Instant Cash Payout", "Hall of Fame podium badge", "Silver medal on trophy shelf"],
    from: 2,
    to: 2,
  },
  {
    id: "bronze",
    label: "3rd Place",
    icon: "🥉",
    title: "Bronze Podium",
    nairaAmount: "₦3,000",
    perks: ["₦3,000 Instant Cash Payout", "Hall of Fame podium badge", "Bronze medal on trophy shelf"],
    from: 3,
    to: 3,
  },
  {
    id: "top10",
    label: "4th – 10th",
    icon: "🎖️",
    title: "Top-10 Pool Share",
    nairaAmount: "₦2,000 Pool",
    perks: ["Share of ₦2,000 Prize Pool (₦285+ each)", "Top-10 Competitor Badge beside callsign"],
    from: 4,
    to: 10,
  },
];

/** ₦200,000 Monthly Championship Leaderboard breakdown */
export const MONTHLY_TIERS: Tier[] = [
  {
    id: "monthly_gold",
    label: "1st Place",
    icon: "💎",
    title: "Monthly Grand Champion",
    nairaAmount: "₦100,000",
    perks: ["₦100,000 Grand Prize Payout", "Pinned on Home Page header all month", "Permanent Grand Champion Trophy"],
    from: 1,
    to: 1,
  },
  {
    id: "monthly_silver",
    label: "2nd Place",
    icon: "🥈",
    title: "Monthly Runner-Up",
    nairaAmount: "₦50,000",
    perks: ["₦50,000 Cash Payout", "Monthly Silver Hall of Fame Crest"],
    from: 2,
    to: 2,
  },
  {
    id: "monthly_bronze",
    label: "3rd Place",
    icon: "🥉",
    title: "Monthly 3rd Place",
    nairaAmount: "₦30,000",
    perks: ["₦30,000 Cash Payout", "Monthly Bronze Hall of Fame Crest"],
    from: 3,
    to: 3,
  },
  {
    id: "monthly_top10",
    label: "4th – 10th",
    icon: "🎖️",
    title: "Monthly Top-10 Share",
    nairaAmount: "₦20,000 Pool",
    perks: ["Share of ₦20,000 Prize Pool (₦2,850+ each)", "Elite Monthly Competitor Star"],
    from: 4,
    to: 10,
  },
];

export const GRAND_PRIZE = {
  icon: "💎",
  title: "₦200,000 Monthly Championship",
  nairaAmount: "₦200,000",
  perks: [
    "₦100,000 to #1 Grand Champion",
    "₦50,000 to #2 Runner-Up · ₦30,000 to #3",
    "₦20,000 split across 4th–10th places",
    "Calculated 100% fairly across all game XP indices",
  ],
};

export const tierFor = (rank: number): Tier | undefined => TIERS.find((t) => rank >= t.from && rank <= t.to);
export const monthlyTierFor = (rank: number): Tier | undefined => MONTHLY_TIERS.find((t) => rank >= t.from && rank <= t.to);

/* ------------------------------------------------------------------ */
/* History & Trophies                                                 */
/* ------------------------------------------------------------------ */
export function pastWeeks(now: number, count: number): number[] {
  const cur = weekStartOf(now);
  return Array.from({ length: count }, (_, i) => cur - (i + 1) * WEEK);
}

export function hallOfFame(now: number, profile: Profile, count = 4) {
  return pastWeeks(now, count).map((wk) => ({
    wk,
    champs: Object.fromEntries(GAME_LIST.map((g) => [g.id, boardFor(g.id, wk, wk + WEEK, profile)[0]])) as Record<GameId, Entry | undefined>,
    grand: grandBoard(wk, wk + WEEK, profile)[0],
  }));
}

export function trophies(now: number, profile: Profile) {
  const cur = weekStartOf(now);
  const t = { gold: 0, silver: 0, bronze: 0 };
  for (const key of Object.keys(profile.weeks)) {
    const wk = weekFromKey(key);
    if (!(wk < cur)) continue;
    for (const g of GAME_LIST) {
      if (!profile.weeks[key]?.[g.id]) continue;
      const rank = rankOfYou(boardFor(g.id, wk, wk + WEEK, profile));
      if (rank === 1) t.gold++;
      else if (rank === 2) t.silver++;
      else if (rank === 3) t.bronze++;
    }
  }
  return t;
}

export function reigningChampion(game: GameId, now: number, profile: Profile): string | undefined {
  const wk = weekStartOf(now) - WEEK;
  return boardFor(game, wk, wk + WEEK, profile)[0]?.id;
}

export function reigningGrand(now: number, profile: Profile): GrandEntry | undefined {
  const wk = weekStartOf(now) - WEEK;
  return grandBoard(wk, wk + WEEK, profile)[0];
}
