import { useState } from "react";
import BestGame from "../components/BestGame";
import BoardRows from "../components/BoardRows";
import { ButtonLink, Label, PageHeading, Panel, fmtLeft } from "../components/ui";
import { GAME_BY_ID, GAME_LIST, type GameId } from "../games/meta";
import {
  MONTHLY_PRIZE_POOL_NAIRA,
  MONTHLY_TIERS,
  TIERS,
  WEEK,
  WEEKLY_PRIZE_POOL_NAIRA,
  boardFor,
  monthEndOf,
  monthLabel,
  monthStartOf,
  monthlyBoardFor,
  reigningChampion,
  weekLabel,
  weekStartOf,
} from "../state/board";
import { profileStore, useProfile } from "../state/profile";
import { scoresStore } from "../state/scores";
import { useNow } from "../state/useNow";
import { useOvertaken } from "../state/useOvertaken";
import { cn } from "../utils/cn";

export default function Leaderboard({ game }: { game: GameId }) {
  const meta = GAME_BY_ID[game];
  const profile = useProfile();
  const now = useNow(1000);
  const [boardPeriod, setBoardPeriod] = useState<"weekly" | "monthly">("weekly");
  const overtaken = useOvertaken(game);

  const isWeekly = boardPeriod === "weekly";

  // Weekly timing
  const wk = weekStartOf(now);
  const leftWk = wk + WEEK - now;

  // Monthly timing
  const mo = monthStartOf(now);
  const moEnd = monthEndOf(mo);
  const leftMo = moEnd - now;

  const board = isWeekly ? boardFor(game, wk, now, profile) : monthlyBoardFor(game, mo, now, profile);
  const reigning = isWeekly ? reigningChampion(game, now, profile) : undefined;
  const champ = board[0];
  const myIdx = board.findIndex((e) => e.you);
  const myRank = myIdx < 0 ? null : myIdx + 1;

  const resetCountdownFmt = isWeekly ? fmtLeft(leftWk) : fmtLeft(leftMo);
  const periodLabel = isWeekly ? `Week of ${weekLabel(wk)}` : `Month of ${monthLabel(mo)}`;
  const prizePoolLabel = isWeekly ? `${WEEKLY_PRIZE_POOL_NAIRA} Prize Pool` : `${MONTHLY_PRIZE_POOL_NAIRA} Championship Pool`;
  const prizesToDisplay = isWeekly ? TIERS : MONTHLY_TIERS;

  return (
    <div className="mx-auto w-full max-w-6xl px-[18px] pb-24 lg:px-8">
      <PageHeading
        tag={isWeekly ? "Weekly Board · Resets Monday 00:00 UTC" : "Monthly Championship · Resets 1st of each month"}
        title="Leaderboard"
        emoji="📈"
      />

      {overtaken && (
        <div className="animate-rise mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          <span>
            <strong className="font-semibold">{overtaken.by}</strong> passed you in {meta.name} — you slipped from #{overtaken.from}{" "}
            to #{overtaken.to}.
          </span>
          <a href={`#/play/${game}`} className="rounded-full bg-rose-200 px-4 py-1.5 text-sm font-bold text-rose-950 hover:brightness-105">
            Take it back
          </a>
        </div>
      )}

      {/* Period Toggle & Game Selector */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Game tabs */}
        <div role="tablist" aria-label="Choose a game" className="flex flex-wrap gap-2">
          {GAME_LIST.map((g) => (
            <a
              key={g.id}
              role="tab"
              aria-selected={g.id === game}
              href={`#/leaderboard/${g.id}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                g.id === game
                  ? "border-cyan-300/50 bg-cyan-300/10 text-white"
                  : "border-white/12 bg-white/[0.04] text-slate-300 hover:border-white/30 hover:bg-white/10",
              )}
            >
              <span aria-hidden>{g.emoji}</span> {g.name}
            </a>
          ))}
        </div>

        {/* Weekly / Monthly toggle */}
        <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setBoardPeriod("weekly")}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-bold transition",
              isWeekly ? "bg-cyan-400 text-ink-950" : "text-slate-300 hover:text-white",
            )}
          >
            Weekly (₦20k)
          </button>
          <button
            type="button"
            onClick={() => setBoardPeriod("monthly")}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-bold transition",
              !isWeekly ? "bg-violet-400 text-ink-950" : "text-slate-300 hover:text-white",
            )}
          >
            Monthly (₦200k)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
                <span>{prizePoolLabel}</span>
              </div>
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-white">
                {meta.emoji} {meta.name}
              </h2>
              <p className="text-xs text-slate-400">{periodLabel}</p>
            </div>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3.5 py-1.5 text-xs font-semibold text-amber-200 tabular-nums">
              Resets in {resetCountdownFmt}
            </span>
          </div>
          <BoardRows entries={board} limit={10} unit={meta.unit} showPrize reigning={reigning} />
        </Panel>

        <div className="min-w-0 space-y-5">
          <Panel>
            <Label>Your callsign</Label>
            <input
              value={profile.name}
              onChange={(e) => {
                profileStore.setName(e.target.value);
                scoresStore.setName(e.target.value);
              }}
              maxLength={14}
              aria-label="Your display name"
              className="w-full rounded-xl border border-white/10 bg-ink-900/80 px-4 py-2.5 text-white outline-none focus:border-cyan-300/60"
            />
          </Panel>

          <BestGame />

          <Panel>
            <Label>{myRank === 1 ? "You lead the board" : "Top spot benchmark"}</Label>
            {champ ? (
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-amber-300/10 text-3xl ring-2 ring-amber-300/40" aria-hidden>
                  {champ.face}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-white">
                    {champ.name} {champ.you && <span className="text-sm text-cyan-300">(you)</span>}
                  </p>
                  <p className="font-display text-3xl leading-none font-extrabold text-amber-200 tabular-nums">
                    {champ.score.toLocaleString()}
                    <span className="ml-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{meta.unit}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No scores yet.</p>
            )}
            <ButtonLink href={`#/play/${game}`} className="mt-4 w-full">
              Play {meta.name} →
            </ButtonLink>
          </Panel>

          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <Label className="mb-0">{isWeekly ? "Weekly Prizes (₦20,000 Pool)" : "Monthly Prizes (₦200,000 Pool)"}</Label>
              <a href="#/prizes" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                Prize board →
              </a>
            </div>
            <ul className="space-y-2">
              {prizesToDisplay.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl" aria-hidden>
                      {t.icon}
                    </span>
                    <div>
                      <span className="block font-semibold text-white">{t.title}</span>
                      <span className="block text-xs text-slate-400">{t.label}</span>
                    </div>
                  </div>
                  <span className="font-display font-black text-amber-300 tabular-nums">{t.nairaAmount}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
