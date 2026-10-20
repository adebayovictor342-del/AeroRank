export type GameId = "skirmish" | "flap" | "brick" | "climb";
export type Accent = "amber" | "cyan" | "violet" | "rose";

export interface GameMeta {
  id: GameId;
  letter: string;
  emoji: string;
  name: string;
  tag: string;
  blurb: string;
  chips: string[];
  accent: Accent;
  /** what one point is called on the board (standardized to XP) */
  unit: string;
  /** design size of the play field (scaled to fill the screen) */
  world: { w: number; h: number };
  /** phones are forced into landscape for this game */
  landscape: boolean;
  /** rough weekly score of the strongest simulated rival */
  skill: number;
  how: string;
}

export const GAME_LIST: GameMeta[] = [
  {
    id: "skirmish",
    letter: "A",
    emoji: "🪖",
    name: "Sambisa Fighter",
    tag: "Game A · High-Velocity Combat · 10 XP/Kill",
    blurb:
      "Mini Militia style dual-stick combat over the forest. High-velocity matrix: Final_XP = Total_Kills * 10 (76 kills = 760 XP). Fly with jetpack fuel, shield against heavy attacks, and lob bombs at armored tanks with air support.",
    chips: ["10 XP / Kill", "Shield & Bombs", "Allies that fight"],
    accent: "amber",
    unit: "XP",
    skill: 760,
    world: { w: 640, h: 360 },
    landscape: true,
    how: "Left stick moves and flies you, right stick aims and fires. High-velocity matrix: each kill awards 10 XP (76 kills = 760 XP baseline). SHIELD blocks attacks; BOMB lobs a grenade.",
  },
  {
    id: "brick",
    letter: "B",
    emoji: "🧱",
    name: "Brick Smash",
    tag: "Game B · Slow-Pace Matrix · 14 XP/Brick + 100 XP/Row",
    blurb:
      "Precision paddle arcade. Slow-pace matrix: Final_XP = (Total_Bricks * 14) + (Total_Rows_Cleared * 100). Balances lower action rate (1 brick every 3s) against high-density combat kills.",
    chips: ["14 XP / Brick", "+100 XP / Row", "3 Balls"],
    accent: "violet",
    unit: "XP",
    skill: 760,
    world: { w: 360, h: 540 },
    landscape: false,
    how: "Move the paddle with pointer, tap, or ←/→. Balanced matrix: each smashed brick awards 14 XP plus 100 XP for every full row cleared.",
  },
  {
    id: "flap",
    letter: "C",
    emoji: "🐦",
    name: "Sky Flap",
    tag: "Game C · One Tap · 10 XP/Gate",
    blurb:
      "Tap to flap, slip through glowing gates. Standardized matrix: each gate cleared awards 10 XP towards the centralized weekly and monthly leaderboards.",
    chips: ["10 XP / Gate", "One Tap", "Endless"],
    accent: "cyan",
    unit: "XP",
    skill: 760,
    world: { w: 360, h: 540 },
    landscape: false,
    how: "Tap, click or press Space to flap. Thread the gates — each cleared gate awards 10 XP.",
  },
  {
    id: "climb",
    letter: "D",
    emoji: "🧗",
    name: "Cliff Climber",
    tag: "Game D · Endless Ascent · 2 XP/Metre",
    blurb:
      "Steer across the cliff face and dodge falling boulders. Standardized matrix: each metre ascended awards 2 XP towards the centralized prize boards.",
    chips: ["2 XP / Metre", "Dodge Spikes", "Endless Ascent"],
    accent: "rose",
    unit: "XP",
    skill: 760,
    world: { w: 360, h: 540 },
    landscape: false,
    how: "Steer with pointer, tap, or ←/→ — you climb automatically. Height awards 2 XP per metre.",
  },
];

export const GAME_BY_ID = Object.fromEntries(GAME_LIST.map((g) => [g.id, g])) as Record<GameId, GameMeta>;
export const GAME_IDS = GAME_LIST.map((g) => g.id);
