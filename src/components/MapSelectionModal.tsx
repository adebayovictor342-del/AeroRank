import { useState } from "react";
import {
  ZONES,
  type BattleFormat,
  type SkirmishGameMode,
  type SkirmishZone,
  type ZoneMeta,
} from "../state/skirmishState";
import { cn } from "../utils/cn";

interface Props {
  mode: SkirmishGameMode;
  onDeploy: (zone: SkirmishZone, options?: { durationSec: number; format: BattleFormat }) => void;
  onBack: () => void;
}

export default function MapSelectionModal({ mode, onDeploy, onBack }: Props) {
  const [selectedZone, setSelectedZone] = useState<SkirmishZone>("forest");
  const [durationSec, setDurationSec] = useState<number>(180); // default 3 minutes
  const [format, setFormat] = useState<BattleFormat>("2v2"); // default 2v2 team skirmish

  const isBattle = mode === "battle";
  const activeZoneMeta: ZoneMeta = ZONES.find((z) => z.id === selectedZone) || ZONES[0];

  const handleStart = () => {
    onDeploy(selectedZone, isBattle ? { durationSec, format } : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-950/95 p-4 select-none sm:p-6 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-[2.5rem] border border-white/15 bg-ink-900/90 p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-cyan-300 uppercase">
              <span>{mode === "journey" ? "Step 2 · Zone Selection" : "Step 2 · Map & Mode Setup"}</span>
            </div>
            <h2 className="font-display mt-1 text-2xl font-black text-white sm:text-3xl">
              {mode === "journey" ? "Select Zone" : "Battle Setup"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* 3 Map Zones Selection Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ZONES.map((z) => {
            const isSel = selectedZone === z.id;
            return (
              <div
                key={z.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedZone(z.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedZone(z.id);
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border p-5 text-left transition-all duration-300",
                  isSel
                    ? "scale-[1.02] border-cyan-300/80 bg-cyan-400/10 shadow-xl shadow-cyan-500/15 ring-2 ring-cyan-300/40"
                    : "border-white/10 bg-white/[0.03] opacity-75 hover:border-white/30 hover:opacity-100",
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{z.emoji}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        isSel ? "bg-cyan-300 text-ink-950 font-black" : "bg-white/10 text-slate-400",
                      )}
                    >
                      {isSel ? "Selected" : "Select"}
                    </span>
                  </div>

                  <h3 className="font-display mt-3 text-xl font-black text-white">{z.name}</h3>
                  <p className="text-xs font-semibold text-cyan-200/80">{z.tagline}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Mode Setup for Battle Mode */}
        {isBattle && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-2 block">
                  Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { sec: 120, label: "2 min" },
                    { sec: 180, label: "3 min" },
                    { sec: 300, label: "5 min" },
                  ].map((d) => (
                    <button
                      key={d.sec}
                      type="button"
                      onClick={() => setDurationSec(d.sec)}
                      className={cn(
                        "rounded-2xl border p-2.5 text-center transition",
                        durationSec === d.sec
                          ? "border-cyan-300 bg-cyan-400/20 text-white font-bold"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-white",
                      )}
                    >
                      <div className="font-display text-sm">{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-2 block">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "1v1" as BattleFormat, label: "1v1" },
                    { id: "2v2" as BattleFormat, label: "2v2" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={cn(
                        "rounded-2xl border p-2.5 text-center transition",
                        format === f.id
                          ? "border-cyan-300 bg-cyan-400/20 text-white font-bold"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-white",
                      )}
                    >
                      <div className="font-display text-sm">{f.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer & Deploy Action */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeZoneMeta.emoji}</span>
            <strong className="text-sm text-white">{activeZoneMeta.name}</strong>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="btn-gradient w-full rounded-2xl px-8 py-3.5 text-base font-extrabold text-ink-950 shadow-xl shadow-cyan-500/20 transition hover:brightness-110 active:scale-95 sm:w-auto"
          >
            {isBattle ? "Continue ➔" : "Deploy ➔"}
          </button>
        </div>
      </div>
    </div>
  );
}
