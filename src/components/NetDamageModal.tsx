import type { BattleResult } from "../state/skirmishState";

interface Props {
  result: BattleResult;
  onRematch: () => void;
  onNewSetup: () => void;
  onExit: () => void;
}

export default function NetDamageModal({ result, onRematch, onNewSetup, onExit }: Props) {
  const { playerWon, playerNetScore, mvp, combatants, mmrDelta, format } = result;

  // Sort combatants by Net Score descending
  const ranked = [...combatants].sort((a, b) => b.netScore - a.netScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-4 select-none backdrop-blur-md">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border p-6 text-center shadow-2xl sm:p-8"
        style={{
          borderColor: playerWon ? "rgba(56, 217, 245, 0.6)" : "rgba(251, 113, 133, 0.6)",
          background: "linear-gradient(160deg, #071022 0%, #050913 100%)",
          boxShadow: playerWon
            ? "0 25px 60px rgba(0,0,0,0.8), 0 0 45px rgba(56, 217, 245, 0.3)"
            : "0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(251, 113, 133, 0.2)",
        }}
      >
        {/* Top Tag & Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-bold text-cyan-200 uppercase">
          <span>⚔️</span>
          <span>Battle Mode · Match Over</span>
        </div>

        {/* Victory / Defeat Header */}
        <h2 className="font-display mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
          {playerWon ? (
            <span className="text-gradient-hero">VICTORY</span>
          ) : (
            <span className="text-rose-400">DEFEAT</span>
          )}
        </h2>

        {/* MMR Gain & Format & Player Net */}
        <div className="mt-1 flex items-center justify-center gap-3 text-xs text-slate-300 font-semibold">
          <span>Format: {format === "2v2" ? "2v2 Team Skirmish" : "1v1 Duel"}</span>
          <span>·</span>
          <span>Your Net: <strong className={playerNetScore >= 0 ? "text-cyan-300" : "text-rose-300"}>{playerNetScore >= 0 ? `+${playerNetScore}` : playerNetScore}</strong></span>
          <span>·</span>
          <span className={playerWon ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>
            {playerWon ? `+${mmrDelta} MMR Rating` : `${mmrDelta} MMR Rating`}
          </span>
        </div>

        {/* The Exact Calculation Formula Callout */}
        <div className="mt-5 rounded-3xl border border-white/15 bg-white/[0.03] p-4 text-center">
          <p className="text-[10px] font-bold tracking-widest text-cyan-300 uppercase">
            Net Damage Scoring Algorithm
          </p>
          <div className="font-mono mt-1 text-sm font-bold text-white sm:text-base">
            Inflicted − Received
          </div>
        </div>

        {/* Match MVP Highlight */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-2.5 text-left">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{mvp.avatarFace}</span>
            <div>
              <span className="text-[9px] font-bold tracking-wider text-amber-300 uppercase">Match MVP</span>
              <div className="font-display flex items-center gap-1.5 text-sm font-extrabold text-white">
                <span>
                  {mvp.name} {mvp.isPlayer && "(You)"}
                </span>
                <span
                  className={`rounded-full px-1.5 py-px text-[10px] font-black ${
                    mvp.gender === "female" ? "bg-rose-400/20 text-rose-300" : "bg-cyan-400/20 text-cyan-300"
                  }`}
                >
                  {mvp.gender === "female" ? "♀" : "♂"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400">Net Score</span>
            <div className="font-display text-lg font-black text-amber-300 tabular-nums">
              {mvp.netScore > 0 ? `+${mvp.netScore}` : mvp.netScore}
            </div>
          </div>
        </div>

        {/* Combatants Breakdown Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="py-2.5 px-3">Combatant</th>
                <th className="py-2.5 px-2 text-right">Inflicted</th>
                <th className="py-2.5 px-2 text-right">Received</th>
                <th className="py-2.5 px-2 text-right">K/D</th>
                <th className="py-2.5 px-3 text-right">Net Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ranked.map((c, idx) => {
                const isPositive = c.netScore >= 0;
                return (
                  <tr
                    key={c.id}
                    className={
                      c.isPlayer
                        ? "bg-cyan-500/15 font-bold text-white"
                        : c.isTeammate
                        ? "bg-blue-500/10 text-slate-200"
                        : "text-slate-300"
                    }
                  >
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <span className="text-sm font-mono text-slate-500">#{idx + 1}</span>
                      <span>{c.avatarFace}</span>
                      <span className="truncate max-w-[120px] font-semibold">
                        {c.name} {c.isPlayer && "(You)"}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-px text-[10px] font-black ${
                          c.gender === "female" ? "bg-rose-400/20 text-rose-300" : "bg-cyan-400/20 text-cyan-300"
                        }`}
                      >
                        {c.gender === "female" ? "♀" : "♂"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-emerald-300 font-mono">
                      +{c.damageInflicted}
                    </td>
                    <td className="py-2.5 px-2 text-right text-rose-300 font-mono">
                      -{c.damageReceived}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                      {c.kills}/{c.deaths}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-black ${
                        isPositive ? "text-cyan-300" : "text-rose-400"
                      }`}
                    >
                      {isPositive ? `+${c.netScore}` : c.netScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onRematch}
            className="btn-gradient flex-1 rounded-2xl py-3 text-sm font-extrabold text-ink-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-95"
          >
            Instant Rematch ➔
          </button>
          <button
            type="button"
            onClick={onNewSetup}
            className="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
          >
            Change Mode &amp; Map
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-400 hover:bg-white/10 hover:text-white"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
