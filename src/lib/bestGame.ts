import { GAME_LIST, type GameMeta } from "../games/meta";
import { botEntries, weekStartOf } from "../state/board";
import { highScoreOf, type PlayerScoresRow } from "../state/scores";

/**
 * "Best game" across titles whose scores are not comparable — a 40-kill run in
 * Sambisa Fighter and a 900 m climb mean very different things.
 *
 * Each score is normalised against that game's leaderboard maximum, so what we
 * rank is "how close are you to the best anyone has done here", a 0–1 ratio
 * that is comparable across all four games.
 */

export interface GameStanding {
  game: GameMeta;
  score: number;
  /** leaderboard maximum this score was measured against */
  max: number;
  /** score ÷ max, clamped to 0–2 (over 1 = you are past the board's best) */
  ratio: number;
  tier: Tier;
  played: boolean;
}

export interface BestGameResult {
  /** highest-tier game, or null until something is played */
  best: GameStanding | null;
  /** every game, strongest first */
  standings: GameStanding[];
}

export interface Tier {
  id: "elite" | "strong" | "solid" | "rising" | "rookie" | "unplayed";
  label: string;
  icon: string;
  /** minimum ratio to reach this tier */
  from: number;
}

export const TIERS: Tier[] = [
  { id: "elite", label: "Elite", icon: "👑", from: 0.9 },
  { id: "strong", label: "Strong", icon: "🔥", from: 0.7 },
  { id: "solid", label: "Solid", icon: "💪", from: 0.45 },
  { id: "rising", label: "Rising", icon: "📈", from: 0.2 },
  { id: "rookie", label: "Rookie", icon: "🌱", from: 0.000001 },
  { id: "unplayed", label: "Not played", icon: "—", from: 0 },
];

export const tierForRatio = (ratio: number): Tier => TIERS.find((t) => ratio >= t.from) ?? TIERS[TIERS.length - 1];

/**
 * The yardstick for one game: the best score on its leaderboard. We take the
 * higher of the current leader and the full-week champion pace (meta.skill) so
 * the number stays stable on a Monday when the board has just reset.
 *
 * The player's own score is deliberately NOT folded in — otherwise anyone who
 * beats the benchmark saturates at exactly 100% and two such games could never
 * be told apart. Ratios above 1 are allowed and rank higher.
 */
export function leaderboardMax(game: GameMeta, now: number): number {
  const board = botEntries(game.id, weekStartOf(now), now);
  const top = board.length ? board[0].score : 0;
  return Math.max(top, game.skill, 1);
}

export function computeStandings(row: PlayerScoresRow, now: number): BestGameResult {
  const standings = GAME_LIST.map((game): GameStanding => {
    const score = highScoreOf(row, game.id);
    const max = leaderboardMax(game, now);
    const ratio = Math.min(2, score / max);
    return { game, score, max, ratio, tier: tierForRatio(ratio), played: score > 0 };
  }).sort((a, b) => b.ratio - a.ratio || b.score - a.score);

  const best = standings.find((s) => s.played) ?? null;
  return { best, standings };
}

export const pct = (ratio: number) => Math.round(Math.min(1, ratio) * 100);
