import { useEffect, useState } from "react";
import type { GameId } from "../games/meta";
import { boardFor, rankOfYou, weekStartOf } from "./board";
import { profileStore } from "./profile";

/**
 * "While you were away, Rex passed you." Compares the rank you last saw with the
 * rank you hold now (rivals keep climbing during the week). Evaluated once per visit.
 */
export function useOvertaken(game: GameId): { by: string; from: number; to: number } | null {
  const [msg, setMsg] = useState<{ by: string; from: number; to: number } | null>(null);
  useEffect(() => {
    const now = Date.now();
    const wk = weekStartOf(now);
    const p = profileStore.get();
    const board = boardFor(game, wk, now, p);
    const rank = rankOfYou(board);
    const key = `${new Date(wk).toISOString().slice(0, 10)}:${game}`;
    const last = p.lastRank[key];
    if (rank && last && rank > last) setMsg({ by: board[rank - 2].name, from: last, to: rank });
    else setMsg(null);
    profileStore.markRank(game, wk, rank);
  }, [game]);
  return msg;
}
