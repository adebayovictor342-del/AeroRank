import { useEffect, useState } from "react";
import { skirmishStore } from "../state/skirmishState";

interface Props {
  score: number; // Final_XP integer
  kills: number;
  rank: number | null;
  isRecord: boolean;
  prevRecord: number;
  ticketsLeft: number;
  onPlayAgain: () => void;
  onSelectZone: () => void;
  onExit: () => void;
}

export default function DopamineGameOver({
  score,
  kills,
  rank,
  isRecord,
  prevRecord,
  ticketsLeft,
  onPlayAgain,
  onSelectZone,
  onExit,
}: Props) {
  const [cashTally, setCashTally] = useState(0);

  // Determine wallet spot locked based on ₦20,000 Weekly / ₦200,000 Monthly prize boards
  const currentRank = rank || 99;
  let walletPrizeNaira = 0;
  let walletSpotTitle = "Leaderboard Placement";

  if (currentRank === 1) {
    walletPrizeNaira = 10000;
    walletSpotTitle = "👑 LOCKED SPOT #1 · ₦10,000 WEEKLY (₦100,000 MONTHLY)";
  } else if (currentRank === 2) {
    walletPrizeNaira = 5000;
    walletSpotTitle = "🥈 LOCKED SPOT #2 · ₦5,000 WEEKLY (₦50,000 MONTHLY)";
  } else if (currentRank === 3) {
    walletPrizeNaira = 3000;
    walletSpotTitle = "🥉 LOCKED SPOT #3 · ₦3,000 WEEKLY (₦30,000 MONTHLY)";
  } else if (currentRank <= 10) {
    walletPrizeNaira = 2000;
    walletSpotTitle = "🎖️ TOP 10 QUALIFIED · ₦2,000 WEEKLY POOL SHARE";
  } else {
    walletSpotTitle = "CHASE TOP 3 TO UNLOCK NAIRA PRIZE WALLET";
  }

  // Record locked cash to store
  useEffect(() => {
    if (rank) {
      skirmishStore.recordWalletSpot(rank);
    }
  }, [rank]);

  // Animated cash tally
  useEffect(() => {
    if (walletPrizeNaira === 0) return;
    const duration = 1200;
    const t0 = performance.now();
    const interval = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / duration);
      setCashTally(Math.round(p * walletPrizeNaira));
      if (p >= 1) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [walletPrizeNaira]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 select-none backdrop-blur-md">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border p-6 text-center shadow-2xl transition-all sm:p-8"
        style={{
          borderColor: currentRank <= 3 ? "#ffd16699" : "rgba(255,255,255,0.15)",
          background: "linear-gradient(160deg, #0e1a33 0%, #070d1a 100%)",
          boxShadow:
            currentRank <= 3
              ? "0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255, 209, 102, 0.35)"
              : "0 25px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl opacity-30"
          style={{ background: currentRank <= 3 ? "#ffd166" : "#38d9f5" }}
        />

        {/* Mode Tag */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1 text-[11px] font-bold text-amber-200 uppercase">
          <span>🏆</span>
          <span>Journey to the Top · Result</span>
        </div>

        {/* High-Dopamine Wallet Spot Box */}
        <div
          className={`mt-4 rounded-3xl border p-4 transition-all ${
            currentRank <= 3
              ? "border-amber-300/60 bg-gradient-to-b from-amber-400/20 to-amber-500/5 shadow-lg shadow-amber-500/15"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <p className="text-[10px] font-black tracking-widest text-amber-300 uppercase">{walletSpotTitle}</p>

          <div className="font-display mt-1 text-4xl font-black text-white sm:text-5xl">
            {walletPrizeNaira > 0 ? (
              <span className="text-gradient-gold tabular-nums">₦{cashTally.toLocaleString()}</span>
            ) : (
              <span className="text-slate-400 text-3xl">Rank #{currentRank}</span>
            )}
          </div>
        </div>

        {/* Final XP & Record Display */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Final Score</span>
            <div className="font-display text-2xl font-black text-white tabular-nums">
              {score.toLocaleString()} XP
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{kills} Kills (10 XP/kill)</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Board Rank</span>
            <div className="font-display text-2xl font-black text-cyan-300 tabular-nums">
              {rank ? `#${rank}` : "Pending"}
            </div>
            <div className="text-[10px] text-cyan-200/70 mt-0.5">Centralized Index</div>
          </div>
        </div>

        {/* All-time record banner if achieved */}
        {isRecord && (
          <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/15 px-3 py-2 text-xs font-bold text-emerald-200">
            🔥 NEW ALL-TIME RECORD! (Previous: {prevRecord.toLocaleString()} XP)
          </div>
        )}

        {/* Tickets Available */}
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-950/60 p-3 text-xs text-slate-300">
          <span>🎟️ Rank Tickets</span>
          <strong className="text-amber-300 font-bold">{ticketsLeft} / 5</strong>
        </div>

        {/* Action Buttons: Play Again loops to Step 1 */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="btn-gradient w-full rounded-2xl py-3.5 text-base font-black text-ink-950 shadow-xl shadow-cyan-500/25 transition hover:brightness-110 active:scale-95"
          >
            Play Again (-1 Ticket) ➔
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSelectZone}
              className="rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Select Zone
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-2xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Exit to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
