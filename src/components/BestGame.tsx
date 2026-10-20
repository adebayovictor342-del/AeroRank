import { useEffect, useMemo, useRef } from "react";
import { trackBestGame } from "../lib/analytics";
import { computeStandings, pct, type GameStanding } from "../lib/bestGame";
import { usePlayerScores } from "../state/scores";
import { useNow } from "../state/useNow";
import { cn } from "../utils/cn";
import { Label, Panel } from "./ui";

const TIER_STYLE: Record<string, string> = {
  elite: "border-amber-300/40 bg-amber-300/10 text-amber-200",
  strong: "border-rose-300/30 bg-rose-300/10 text-rose-200",
  solid: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  rising: "border-violet-300/30 bg-violet-300/10 text-violet-200",
  rookie: "border-white/15 bg-white/[0.05] text-slate-300",
  unplayed: "border-white/10 bg-white/[0.03] text-slate-500",
};

const BAR: Record<string, string> = {
  elite: "from-amber-300 to-amber-500",
  strong: "from-rose-300 to-rose-500",
  solid: "from-cyan-300 to-cyan-500",
  rising: "from-violet-300 to-violet-500",
  rookie: "from-slate-400 to-slate-500",
  unplayed: "from-slate-600 to-slate-600",
};

function Row({ s }: { s: GameStanding }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-center text-lg" aria-hidden>
        {s.game.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-white">{s.game.name}</span>
          <span className="shrink-0 text-xs text-slate-400 tabular-nums">
            {s.played ? (
              <>
                {s.score.toLocaleString("en-US")} / {s.max.toLocaleString("en-US")} {s.game.unit}
              </>
            ) : (
              "no score yet"
            )}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <span
              className={cn("block h-full rounded-full bg-gradient-to-r", BAR[s.tier.id])}
              style={{ width: `${Math.max(s.played ? 3 : 0, pct(s.ratio))}%` }}
            />
          </span>
          <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-slate-400 tabular-nums">
            {s.played ? `${pct(s.ratio)}%` : "—"}
          </span>
        </span>
      </span>
    </li>
  );
}

/**
 * Profile section: ranks the player's games by how close each score is to that
 * game's leaderboard maximum, so titles with wildly different scales compare
 * fairly, and surfaces the strongest one as "Best game".
 */
export default function BestGame({ className }: { className?: string }) {
  const row = usePlayerScores();
  const now = useNow(30000);
  const { best, standings } = useMemo(() => computeStandings(row, now), [row, now]);

  // report the computed best game once per change, not on every re-render
  const sent = useRef("");
  useEffect(() => {
    if (!best) return;
    const key = `${best.game.id}:${best.tier.id}`;
    if (sent.current === key) return;
    sent.current = key;
    trackBestGame(best.game.id, best.ratio, best.tier.id);
  }, [best]);

  return (
    <Panel className={className}>
      <Label className="mb-3">Your best game</Label>

      {best ? (
        <div className="flex items-center gap-3.5">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-3xl ring-1 ring-white/10"
            aria-hidden
          >
            {best.game.emoji}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white" data-testid="best-game-name">
              {best.game.name}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", TIER_STYLE[best.tier.id])}
                data-testid="best-game-tier"
              >
                {best.tier.icon} {best.tier.label}
              </span>
              <span className="text-xs text-slate-400 tabular-nums">
                {pct(best.ratio)}% of the leaderboard best
              </span>
            </p>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-slate-400">
          No scores yet.
        </p>
      )}

      <ul className="mt-5 space-y-3" data-testid="best-game-standings">
        {standings.map((s) => (
          <Row key={s.game.id} s={s} />
        ))}
      </ul>
    </Panel>
  );
}
