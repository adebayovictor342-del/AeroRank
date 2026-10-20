import { useSyncExternalStore } from "react";
import type { Gender } from "./board";

/**
 * State for Sambisa Fighter's two flagship modes:
 * - "Journey to the Top" (The Prize 🏆 Grid)
 * - "Battle Mode" (Online Multiplayer ⚔️)
 */

export type SkirmishZone = "forest" | "city" | "hideout";
export type SkirmishGameMode = "journey" | "battle";
export type BattleFormat = "1v1" | "2v2";
export type { Gender };

export interface ZoneMeta {
  id: SkirmishZone;
  name: string;
  tagline: string;
  emoji: string;
  hazard: string;
  bgGradient: string;
  accent: string;
  description: string;
}

export const ZONES: ZoneMeta[] = [
  {
    id: "forest",
    name: "Sambisa Forest",
    tagline: "Dense Jungle & Hidden Camps",
    emoji: "🌲",
    hazard: "Extreme Foliage & Snipers",
    bgGradient: "from-emerald-950 via-slate-900 to-ink-950",
    accent: "text-emerald-300",
    description: "The classic combat theatre. Dark pine trees, deep canopies, watchtowers, and night moonlight.",
  },
  {
    id: "city",
    name: "City Center",
    tagline: "Urban Warzone & Rooftops",
    emoji: "🏙️",
    hazard: "Crossfire & Neon Billboards",
    bgGradient: "from-blue-950 via-slate-900 to-ink-950",
    accent: "text-cyan-300",
    description: "Concrete skyscrapers with glowing windows, steel construction cranes, and street barricades.",
  },
  {
    id: "hideout",
    name: "Desert Hideout",
    tagline: "Underground Bunker & Sand Dunes",
    emoji: "🏜️",
    hazard: "Sandstorms & Heavy Artillery",
    bgGradient: "from-amber-950 via-slate-900 to-ink-950",
    accent: "text-amber-300",
    description: "Heavily fortified military bunker surrounded by sand dunes, radar antennas, and ammo crates.",
  },
];

export interface CombatantBattleStats {
  id: string;
  name: string;
  avatarFace: string;
  gender: Gender;
  isPlayer: boolean;
  isTeammate: boolean;
  damageInflicted: number;
  damageReceived: number;
  kills: number;
  deaths: number;
  netScore: number;
}

export interface LobbyBot {
  id: string;
  name: string;
  avatarFace: string;
  gender: Gender;
  level: number;
}

/** Male operative pool — Blue Squad in gender-sorted matchmaking. */
export const MALE_LOBBY_BOTS: LobbyBot[] = [
  { id: "vex", name: "Vex_Reaper", avatarFace: "🤖", gender: "male", level: 48 },
  { id: "bram", name: "Bram_Havoc", avatarFace: "🐨", gender: "male", level: 41 },
  { id: "rex", name: "Rex_Blitz", avatarFace: "🐸", gender: "male", level: 37 },
  { id: "zed", name: "Zed_Striker", avatarFace: "🐲", gender: "male", level: 52 },
  { id: "otto", name: "Otto_Breach", avatarFace: "🐻", gender: "male", level: 44 },
  { id: "dash", name: "Dash_Magnum", avatarFace: "🐢", gender: "male", level: 33 },
];

/** Female operative pool — Red Squad in gender-sorted matchmaking. */
export const FEMALE_LOBBY_BOTS: LobbyBot[] = [
  { id: "nova", name: "Nova_Vixen", avatarFace: "🦊", gender: "female", level: 46 },
  { id: "juno", name: "Juno_Valkyrie", avatarFace: "🦄", gender: "female", level: 51 },
  { id: "kite", name: "Kite_Sniper", avatarFace: "🐼", gender: "female", level: 54 },
  { id: "lumi", name: "Lumi_Siren", avatarFace: "🦁", gender: "female", level: 39 },
  { id: "cleo", name: "Cleo_Widow", avatarFace: "🐱", gender: "female", level: 43 },
  { id: "skye", name: "Skye_Talon", avatarFace: "🦅", gender: "female", level: 36 },
];

const blankStats = {
  damageInflicted: 0,
  damageReceived: 0,
  kills: 0,
  deaths: 0,
  netScore: 0,
};

function pickBots(pool: LobbyBot[], count: number, seed: number): LobbyBot[] {
  const arr = pool.slice();
  // deterministic shuffle so a lobby is stable per matchmaking tick
  let s = seed || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/**
 * Gender sorting matrix: males fill one team side, females fill the other.
 * The player's own gender decides which side they fight on — teammates always
 * share the player's gender, rivals are always the opposite gender.
 */
export function buildGenderSortedLobby(
  playerName: string,
  playerGender: Gender,
  format: BattleFormat,
  seed = Date.now(),
): CombatantBattleStats[] {
  const player: CombatantBattleStats = {
    id: "player",
    name: playerName || "You",
    avatarFace: playerGender === "female" ? "👩‍🚀" : "👨‍🚀",
    gender: playerGender,
    isPlayer: true,
    isTeammate: true,
    ...blankStats,
  };
  const samePool = playerGender === "male" ? MALE_LOBBY_BOTS : FEMALE_LOBBY_BOTS;
  const oppPool = playerGender === "male" ? FEMALE_LOBBY_BOTS : MALE_LOBBY_BOTS;

  if (format === "1v1") {
    const [rival] = pickBots(oppPool, 1, seed);
    return [
      player,
      {
        id: rival.id,
        name: rival.name,
        avatarFace: rival.avatarFace,
        gender: rival.gender,
        isPlayer: false,
        isTeammate: false,
        ...blankStats,
      },
    ];
  }

  const [mate] = pickBots(samePool, 1, seed + 7);
  const rivals = pickBots(oppPool, 2, seed + 131);
  return [
    player,
    {
      id: mate.id,
      name: mate.name,
      avatarFace: mate.avatarFace,
      gender: mate.gender,
      isPlayer: false,
      isTeammate: true,
      ...blankStats,
    },
    ...rivals.map((r) => ({
      id: r.id,
      name: r.name,
      avatarFace: r.avatarFace,
      gender: r.gender,
      isPlayer: false,
      isTeammate: false,
      ...blankStats,
    })),
  ];
}

export const teamLabelFor = (gender: Gender) => (gender === "male" ? "♂ Male Squad" : "♀ Female Squad");

export interface BattleResult {
  matchDurationSec: number;
  format: BattleFormat;
  zone: SkirmishZone;
  playerWon: boolean;
  playerNetScore: number;
  mvp: CombatantBattleStats;
  combatants: CombatantBattleStats[];
  mmrDelta: number;
}

export interface SkirmishStoredState {
  tickets: number; // default 5, burns 1 per Journey run
  maxTickets: number;
  lastTicketRegen: number;
  battleMmr: number; // default 1200
  battleMatches: number;
  battleWins: number;
  highestNetScore: number;
  virtualWalletLockedUsd: number; // accumulated locked cash prize qualification
}

const STORAGE_KEY = "aerorank.skirmish.state.v1";
const REGEN_MS = 15 * 60 * 1000; // 1 ticket every 15 minutes

function loadState(): SkirmishStoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // check ticket regen
      const now = Date.now();
      let tickets = parsed.tickets ?? 5;
      const last = parsed.lastTicketRegen || now;
      const elapsed = now - last;
      if (elapsed >= REGEN_MS && tickets < 5) {
        const added = Math.min(5 - tickets, Math.floor(elapsed / REGEN_MS));
        tickets += added;
      }
      return {
        tickets: Math.max(0, Math.min(5, tickets)),
        maxTickets: 5,
        lastTicketRegen: now,
        battleMmr: parsed.battleMmr || 1250,
        battleMatches: parsed.battleMatches || 0,
        battleWins: parsed.battleWins || 0,
        highestNetScore: parsed.highestNetScore || 0,
        virtualWalletLockedUsd: parsed.virtualWalletLockedUsd || 0,
      };
    }
  } catch {
    // fallback
  }
  return {
    tickets: 5,
    maxTickets: 5,
    lastTicketRegen: Date.now(),
    battleMmr: 1250,
    battleMatches: 0,
    battleWins: 0,
    highestNetScore: 0,
    virtualWalletLockedUsd: 0,
  };
}

let state: SkirmishStoredState = loadState();
const listeners = new Set<() => void>();

function save(next: SkirmishStoredState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export const skirmishStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  burnTicket: (): boolean => {
    if (state.tickets <= 0) return false;
    save({
      ...state,
      tickets: state.tickets - 1,
      lastTicketRegen: state.tickets === 5 ? Date.now() : state.lastTicketRegen,
    });
    return true;
  },
  refillTickets: () => {
    save({ ...state, tickets: 5, lastTicketRegen: Date.now() });
  },
  recordBattleResult: (res: BattleResult) => {
    const won = res.playerWon;
    const newMmr = Math.max(800, state.battleMmr + res.mmrDelta);
    save({
      ...state,
      battleMmr: newMmr,
      battleMatches: state.battleMatches + 1,
      battleWins: state.battleWins + (won ? 1 : 0),
      highestNetScore: Math.max(state.highestNetScore, res.playerNetScore),
    });
  },
  recordWalletSpot: (rank: number) => {
    let cashReward = 0;
    if (rank === 1) cashReward = 500;
    else if (rank === 2) cashReward = 250;
    else if (rank === 3) cashReward = 100;
    else if (rank <= 10) cashReward = 25;

    if (cashReward > 0) {
      save({
        ...state,
        virtualWalletLockedUsd: Math.max(state.virtualWalletLockedUsd, cashReward),
      });
    }
  },
};

export function useSkirmishState(): SkirmishStoredState {
  return useSyncExternalStore(skirmishStore.subscribe, skirmishStore.get, skirmishStore.get);
}
