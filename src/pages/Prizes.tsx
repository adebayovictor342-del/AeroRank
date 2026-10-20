import { useState } from "react";
import { ButtonLink, Label, PageHeading, Panel } from "../components/ui";
import { GAME_LIST } from "../games/meta";
import {
  MONTHLY_PRIZE_POOL_NAIRA,
  MONTHLY_TIERS,
  TIERS,
  WEEK,
  WEEKLY_PRIZE_POOL_NAIRA,
  boardFor,
  countdown,
  grandBoard,
  hallOfFame,
  monthEndOf,
  monthLabel,
  monthStartOf,
  monthlyBoardFor,
  monthlyGrandBoard,
  rankOfYou,
  reigningGrand,
  trophies,
  weekLabel,
  weekStartOf,
  type Entry,
} from "../state/board";
import { useProfile } from "../state/profile";
import { useNow } from "../state/useNow";
import { cn } from "../utils/cn";

const pad = (n: number) => String(n).padStart(2, "0");
const MEDAL = ["🥇", "🥈", "🥉"];

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900/70 px-3 py-3 text-center sm:px-5">
      <p className="font-display text-3xl leading-none font-extrabold text-white tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-1.5 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{label}</p>
    </div>
  );
}

function Cell({ e, unit }: { e?: Entry; unit: string }) {
  if (!e) return <span className="text-slate-600">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", e.you && "font-bold text-cyan-200")}>
      <span aria-hidden>{e.face}</span>
      {e.name}
      <span className="text-xs text-slate-500 tabular-nums">
        {e.score.toLocaleString()} {unit}
      </span>
    </span>
  );
}

export default function Prizes() {
  const profile = useProfile();
  const now = useNow(1000);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");

  // Weekly timing
  const wk = weekStartOf(now);
  const leftWk = wk + WEEK - now;
  const cWk = countdown(leftWk);
  const elapsedWk = Math.min(100, Math.max(0, ((now - wk) / WEEK) * 100));

  // Monthly timing
  const mo = monthStartOf(now);
  const moEnd = monthEndOf(mo);
  const leftMo = moEnd - now;
  const cMo = countdown(leftMo);
  const elapsedMo = Math.min(100, Math.max(0, ((now - mo) / (moEnd - mo)) * 100));

  const isWeekly = period === "weekly";
  const c = isWeekly ? cWk : cMo;
  const elapsed = isWeekly ? elapsedWk : elapsedMo;

  const grand = isWeekly ? grandBoard(wk, now, profile) : monthlyGrandBoard(mo, now, profile);
  const hof = hallOfFame(now, profile, 4);
  const tr = trophies(now, profile);
  const reign = reigningGrand(now, profile);

  const tiersToDisplay = isWeekly ? TIERS : MONTHLY_TIERS;
  const poolTitle = isWeekly ? `${WEEKLY_PRIZE_POOL_NAIRA} Weekly Prize Board` : `${MONTHLY_PRIZE_POOL_NAIRA} Monthly Championship`;

  return (
    <div className="mx-auto w-full max-w-6xl px-[18px] pb-24 lg:px-8">
      <PageHeading
        tag={isWeekly ? "Resets every Monday · 00:00 UTC" : "Resets 1st of every month"}
        title="Prize Board"
        emoji="🏆"
      />

      {/* Prize Board Period Selector: ₦20,000 Weekly vs ₦200,000 Monthly */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setPeriod("weekly")}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition",
            isWeekly
              ? "btn-gradient text-ink-950 shadow-lg shadow-cyan-500/20"
              : "border border-white/12 bg-white/[0.04] text-slate-300 hover:bg-white/10",
          )}
        >
          <span>🏆</span>
          <span>{WEEKLY_PRIZE_POOL_NAIRA} Weekly Prize Board</span>
        </button>

        <button
          type="button"
          onClick={() => setPeriod("monthly")}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition",
            !isWeekly
              ? "btn-gradient text-ink-950 shadow-lg shadow-violet-500/20"
              : "border border-white/12 bg-white/[0.04] text-slate-300 hover:bg-white/10",
          )}
        >
          <span>💎</span>
          <span>{MONTHLY_PRIZE_POOL_NAIRA} Monthly Championship</span>
        </button>
      </div>

      {/* Countdown Card */}
      <Panel className="mb-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-0.5 text-xs font-bold text-amber-200 uppercase">
              <span>{isWeekly ? "Weekly Pool: ₦20,000" : "Monthly Pool: ₦200,000"}</span>
            </div>
            <h2 className="font-display mt-1 text-2xl font-black text-white sm:text-3xl">{poolTitle}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Period: {isWeekly ? weekLabel(wk) : monthLabel(mo)} · Standardized Final_XP Indexing
            </p>
            <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="btn-gradient h-full rounded-full" style={{ width: `${elapsed}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label="Time until reset">
            <Tile value={String(c.d)} label="Days" />
            <Tile value={pad(c.h)} label="Hours" />
            <Tile value={pad(c.m)} label="Min" />
            <Tile value={pad(c.s)} label="Sec" />
          </div>
        </div>
      </Panel>

      {/* Prize Ladder with exact Naira values */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-white">
            {isWeekly ? "Weekly Prize Payouts (₦20,000 Pool)" : "Monthly Championship Payouts (₦200,000 Pool)"}
          </h2>
          <span className="font-mono text-xs font-bold text-cyan-300">{isWeekly ? "WEEKLY" : "MONTHLY"}</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiersToDisplay.map((t) => (
            <div
              key={t.id}
              className={cn(
                "rounded-3xl border p-5 transition hover:scale-[1.01]",
                t.id.includes("gold") && "border-amber-300/40 bg-gradient-to-br from-amber-300/15 to-transparent",
                t.id.includes("silver") && "border-slate-300/30 bg-gradient-to-br from-slate-300/10 to-transparent",
                t.id.includes("bronze") && "border-orange-300/30 bg-gradient-to-br from-orange-300/10 to-transparent",
                t.id.includes("top10") && "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden>
                  {t.icon}
                </span>
                <span className="font-display text-xl font-black text-amber-300">{t.nairaAmount}</span>
              </div>
              <p className="mt-2 text-[10px] font-bold tracking-[0.18em] text-cyan-300 uppercase">{t.label}</p>
              <p className="font-display text-lg font-bold text-white">{t.title}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {t.perks.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Live Podiums for All Games */}
      <section className="mb-8">
        <h2 className="font-display mb-3 text-2xl font-extrabold tracking-[-0.02em] text-white">
          {isWeekly ? "Live Weekly Leaderboard Podiums" : "Live Monthly Championship Podiums"}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {GAME_LIST.map((g) => {
            const b = isWeekly ? boardFor(g.id, wk, now, profile) : monthlyBoardFor(g.id, mo, now, profile);
            const rank = rankOfYou(b);
            return (
              <Panel key={g.id} className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-display flex items-center gap-2 text-xl font-bold text-white">
                    <span aria-hidden>{g.emoji}</span> {g.name}
                  </p>
                  <a href={`#/leaderboard/${g.id}`} className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                    Leaderboard →
                  </a>
                </div>
                {b.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-slate-400">
                    No scores yet.
                  </p>
                ) : (
                  <ol className="space-y-1.5">
                    {b.slice(0, 3).map((e, i) => (
                      <li
                        key={e.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2",
                          e.you ? "bg-cyan-300/[0.1] ring-1 ring-cyan-300/30" : "bg-white/[0.04]",
                        )}
                      >
                        <span className="text-xl" aria-hidden>
                          {MEDAL[i]}
                        </span>
                        <span aria-hidden>{e.face}</span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-white">{e.name}</span>
                        <span className="font-display font-bold text-white tabular-nums">
                          {e.score.toLocaleString()} {g.unit}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                  <p className="text-xs font-semibold text-slate-400">
                    {rank === null ? "Your rank: Unranked" : `Your rank: #${rank}`}
                  </p>
                  <ButtonLink href={`#/play/${g.id}`} variant="ghost" className="py-1 px-3 text-xs">
                    Play {g.name}
                  </ButtonLink>
                </div>
              </Panel>
            );
          })}
        </div>
      </section>

      {/* Grand Championship Race */}
      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-white">
              💎 {isWeekly ? "Weekly Grand Aggregate" : "₦200,000 Monthly Grand Championship"}
            </h2>
            <span className="font-display text-base font-bold text-amber-300">
              {isWeekly ? "10 Pts Scale" : "₦100,000 #1 Prize"}
            </span>
          </div>

          <ol className="mt-4 space-y-1.5">
            {grand.slice(0, 5).map((e, i) => (
              <li
                key={e.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                  e.you ? "bg-cyan-300/[0.1] ring-1 ring-cyan-300/30" : i === 0 ? "bg-violet-400/[0.12]" : "bg-white/[0.03]",
                )}
              >
                <span className="font-display w-8 text-center text-lg font-bold text-slate-300">{i === 0 ? "💎" : i + 1}</span>
                <span className="text-xl" aria-hidden>
                  {e.face}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-white">
                  {e.name} {e.you && <span className="text-xs text-cyan-300">(you)</span>}
                </span>
                <span className="font-display text-xl font-extrabold text-white tabular-nums">
                  {e.points.toLocaleString()}
                  <span className="ml-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">pts</span>
                </span>
              </li>
            ))}
            {grand.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                No points yet.
              </li>
            )}
          </ol>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <Label>Reigning Grand Champion</Label>
            {reign ? (
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-violet-400/15 text-3xl ring-2 ring-violet-300/40" aria-hidden>
                  {reign.face}
                </span>
                <div>
                  <p className="text-lg font-bold text-white">{reign.name}</p>
                  <p className="text-sm text-slate-400">{reign.points} pts · {weekLabel(wk - WEEK)}</p>
                </div>
              </div>
            ) : null}
          </Panel>
          <Panel>
            <Label>Your Trophy Shelf</Label>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["🥇", tr.gold],
                ["🥈", tr.silver],
                ["🥉", tr.bronze],
              ].map(([icon, n]) => (
                <div key={String(icon)} className="rounded-xl bg-white/[0.04] py-3">
                  <p className="text-2xl" aria-hidden>
                    {icon}
                  </p>
                  <p className="font-display text-2xl font-extrabold text-white tabular-nums">{n}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      {/* Hall of Fame */}
      <section>
        <h2 className="font-display mb-3 text-2xl font-extrabold tracking-[-0.02em] text-white">Hall of Fame</h2>
        <Panel className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] tracking-[0.14em] text-slate-500 uppercase">
                <th className="px-4 py-3 font-bold">Week</th>
                <th className="px-4 py-3 font-bold">💎 Grand</th>
                {GAME_LIST.map((g) => (
                  <th key={g.id} className="px-4 py-3 font-bold">
                    {g.emoji} {g.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hof.map((row) => (
                <tr key={row.wk} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300">{weekLabel(row.wk)}</td>
                  <td className="px-4 py-3">
                    {row.grand ? (
                      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", row.grand.you && "font-bold text-cyan-200")}>
                        <span aria-hidden>{row.grand.face}</span>
                        {row.grand.name}
                        <span className="text-xs text-slate-500">{row.grand.points} pts</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  {GAME_LIST.map((g) => (
                    <td key={g.id} className="px-4 py-3 text-slate-200">
                      <Cell e={row.champs[g.id]} unit={g.unit} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>
    </div>
  );
}
