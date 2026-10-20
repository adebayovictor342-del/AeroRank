import { useSyncExternalStore } from "react";
import { PEOPLE, type Gender } from "./board";
import { scoresStore } from "./scores";

/**
 * Social layer — profile identity and the follow graph.
 *
 * Same honesty note as the leaderboard: there is no server in this build, so the
 * people you can follow are the simulated players from the boards, and follower
 * counts are deterministic per person. What is genuinely yours: your photo, your
 * name, your bio and exactly who you follow. The store is behind an adapter so
 * it can be pointed at a real API later (see setSocialAdapter).
 */

export interface SocialState {
  /** data URL of the uploaded photo, or null for the generated avatar */
  avatar: string | null;
  name: string;
  bio: string;
  /** mandatory signup choice */
  gender: Gender | null;
  /** when this profile was first created */
  since: number;
  /** ids of the people this player follows */
  following: string[];
}

/** A profile that can be viewed and followed. */
export interface Person {
  id: string;
  name: string;
  face: string;
  gender: Gender;
  bio: string;
  avatar: string | null;
  followers: number;
  following: number;
  joined: string;
  isYou: boolean;
}

/** Curated 12/12 gender split so Battle Mode can always field single-gender teams. */
const MALE_IDS = new Set(["Rex", "Mako", "Zed", "Bram", "Vex", "Rune", "Hex", "Dash", "Otto", "Blitz", "Sable", "Orbit"]);

export function genderForId(id: string): Gender {
  if (MALE_IDS.has(id)) return "male";
  if (PEOPLE.some((p) => p.id === id)) return "female";
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h % 2 === 0 ? "male" : "female";
}

const KEY = "aerorank.social.v1";

/* ------------------------------------------------------------------ */
/* Adapter                                                             */
/* ------------------------------------------------------------------ */
export interface SocialAdapter {
  load(): Partial<SocialState> | null;
  save(s: SocialState): void;
}

const localAdapter: SocialAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Partial<SocialState>) : null;
    } catch {
      return null;
    }
  },
  save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable — profile just won't persist */
    }
  },
};

let adapter: SocialAdapter = localAdapter;

export function setSocialAdapter(next: SocialAdapter) {
  adapter = next;
  state = normalise(adapter.load());
  emit();
}

/* ------------------------------------------------------------------ */
/* Deterministic simulated people                                      */
/* ------------------------------------------------------------------ */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const BIOS = [
  "Chasing the top of the board since day one.",
  "One more run. Always one more run.",
  "Plays on the train, wins on the sofa.",
  "Collector of personal bests.",
  "Here for the leaderboard, staying for the bragging rights.",
  "Retired button masher. Not really.",
  "Climb, flap, smash, repeat.",
  "Slow thumbs, fast brain.",
  "Currently #1 in my living room.",
  "If it has a scoreboard, I'm on it.",
];

const joinedFor = (id: string) => {
  const days = 40 + (hash(id + "j") % 900);
  return new Date(Date.now() - days * 86_400_000).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

export function personById(id: string): Person | null {
  const base = personByIdRaw(id);
  if (!base) return null;
  const h = hash(id);
  return {
    id: base.id,
    name: base.name,
    face: base.face,
    gender: genderForId(base.id),
    bio: BIOS[(h + id.length) % BIOS.length],
    avatar: null,
    followers: 180 + (hash(id + "f") % 18_000),
    following: 24 + (hash(id + "g") % 420),
    joined: joinedFor(id),
    isYou: false,
  };
}

function personByIdRaw(id: string) {
  return PEOPLE.find((p) => p.id === id);
}

export const followedPeople = (following: string[]) =>
  following.map((id) => personById(id)).filter((p): p is Person => p !== null);

/** Other people to follow, most relevant first. */
export function followSuggestions(following: string[]): Person[] {
  return PEOPLE.map((p) => personById(p.id))
    .filter((p): p is Person => p !== null && !following.includes(p.id))
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
function normalise(raw: Partial<SocialState> | null): SocialState {
  const g = (raw as Record<string, unknown> | null)?.gender;
  return {
    avatar: typeof raw?.avatar === "string" && raw.avatar.startsWith("data:image/") ? raw.avatar : null,
    name: typeof raw?.name === "string" ? raw.name : "",
    bio: typeof raw?.bio === "string" ? raw.bio : "",
    gender: g === "male" || g === "female" ? g : null,
    since: typeof raw?.since === "number" && raw.since > 0 ? raw.since : Date.now(),
    following: Array.isArray(raw?.following) ? raw.following.filter((id) => personByIdRaw(id)) : [],
  };
}

let state: SocialState = normalise(adapter.load());
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function commit(next: SocialState) {
  state = next;
  adapter.save(state);
  emit();
}

export const socialStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  setAvatar(dataUrl: string | null) {
    commit({ ...state, avatar: dataUrl });
  },
  setName(name: string) {
    commit({ ...state, name: name.slice(0, 24) });
    scoresStore.setName(name.slice(0, 24));
  },
  setBio(bio: string) {
    commit({ ...state, bio: bio.slice(0, 160) });
  },
  setGender(gender: "male" | "female") {
    if (state.gender === gender) return;
    commit({ ...state, gender });
    scoresStore.setGender(gender);
  },
  toggleFollow(id: string) {
    if (!personByIdRaw(id) || id === "you") return;
    const has = state.following.includes(id);
    commit({
      ...state,
      following: has ? state.following.filter((x) => x !== id) : [...state.following, id],
    });
    return !has;
  },
  isFollowing(id: string) {
    return state.following.includes(id);
  },
};

export function useSocial(): SocialState {
  return useSyncExternalStore(socialStore.subscribe, socialStore.get, socialStore.get);
}

/** The player's own profile, as seen by everyone else. */
export function me(state: SocialState, name: string, days: number): Person {
  const base = 240 + (hash(String(state.since)) % 2400);
  return {
    id: "you",
    name: name || "Player",
    face: state.gender === "female" ? "👩‍🚀" : state.gender === "male" ? "👨‍🚀" : "🧑‍🚀",
    gender: state.gender ?? "male",
    bio: state.bio,
    avatar: state.avatar,
    followers: base + Math.floor(days * 2.5),
    following: state.following.length,
    joined: new Date(state.since).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    isYou: true,
  };
}

export const daysSince = (since: number) => Math.max(0, Math.floor((Date.now() - since) / 86_400_000));

/* ------------------------------------------------------------------ */
/* Photo upload                                                        */
/* ------------------------------------------------------------------ */
export const MAX_UPLOAD = 4 * 1024 * 1024;
export const AVATAR_SIZE = 256;

/**
 * Reads an image file and writes a square 256px JPEG data URL.
 * Rejects with a human-readable message for anything unusable.
 */
export function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("That file isn't an image. Choose a JPG, PNG or WebP."));
      return;
    }
    if (file.size > MAX_UPLOAD) {
      reject(new Error("That image is over 4 MB. Pick a smaller one."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Your browser can't process images.");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_SIZE,
          AVATAR_SIZE,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      } catch (e) {
        reject(e instanceof Error ? e : new Error("That image couldn't be processed."));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image couldn't be read. Try another file."));
    };
    img.src = url;
  });
}
