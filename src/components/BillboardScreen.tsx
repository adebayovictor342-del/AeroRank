import { useEffect, useRef, useState } from "react";
import { loadVideoAd, sendAdBeacons, type VideoAd } from "../lib/ads";
import type { SkirmishGameMode } from "../state/skirmishState";

interface Props {
  mode: SkirmishGameMode;
  gameName?: string;
  ticketsLeft: number;
  onComplete: () => void;
  onCancel?: () => void;
}

/** A configurable VAST video placement. Never invents impressions or sponsors. */
export default function BillboardScreen({ mode, gameName, ticketsLeft, onComplete, onCancel }: Props) {
  const [ad, setAd] = useState<VideoAd | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "playing" | "complete" | "unavailable">("loading");
  const [elapsed, setElapsed] = useState(0);
  const completed = useRef(false);
  const startedAt = useRef(0);
  const reported = useRef(new Set<string>());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const tag = window.AERORANK_AD_CONFIG?.vastTagUrl?.trim();
    if (!tag) { setStatus("unavailable"); return; }
    let cancelled = false;
    loadVideoAd(tag).then((creative) => {
      if (!cancelled) { setAd(creative); setStatus("ready"); }
    }).catch(() => { if (!cancelled) setStatus("unavailable"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== "playing" && status !== "complete") return;
    const id = window.setInterval(() => setElapsed(performance.now() - startedAt.current), 100);
    return () => clearInterval(id);
  }, [status]);

  const report = (event: string) => {
    if (!ad || reported.current.has(event)) return;
    reported.current.add(event);
    sendAdBeacons(ad.tracking[event] || []);
  };
  const advance = () => {
    if (completed.current || (ad && status !== "complete")) return;
    completed.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    if (status === "complete" && elapsed >= 10000) advance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, elapsed]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050913] p-4 text-white sm:p-7">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.19em] text-cyan-300 uppercase">{mode === "journey" ? "Journey to the Top" : "Fun Mode"}</p>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{gameName || "AeroRank"}</h1>
        </div>
        {onCancel && <button type="button" aria-label="Close" onClick={onCancel} className="rounded-full border border-white/15 px-3 py-2 text-slate-300">✕</button>}
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-4">
        {ad ? (
          <>
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black">
              <video
                src={ad.mediaUrl}
                autoPlay muted playsInline controls
                className="aspect-video w-full object-contain"
                aria-label={ad.title}
                onPlaying={() => {
                  if (status !== "playing" && status !== "complete") {
                    startedAt.current = performance.now();
                    setStatus("playing");
                    sendAdBeacons(ad.impressions);
                    report("start");
                  }
                }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration > 0) {
                    const p = v.currentTime / v.duration;
                    if (p >= 0.25) report("firstQuartile");
                    if (p >= 0.5) report("midpoint");
                    if (p >= 0.75) report("thirdQuartile");
                  }
                }}
                onEnded={() => { report("complete"); setStatus("complete"); }}
                onError={() => { setAd(null); setStatus("unavailable"); }}
              />
              <span className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold">Ad</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="truncate text-sm text-slate-300">{ad.title}</span>
              {ad.clickThrough && <a href={ad.clickThrough} target="_blank" rel="noopener noreferrer sponsored" onClick={() => report("clickThrough")} className="shrink-0 rounded-full border border-white/20 px-4 py-1.5 text-xs font-bold text-white">Visit advertiser ↗</a>}
            </div>
          </>
        ) : (
          <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-center">
            <div><span className="text-4xl">{mode === "journey" ? "🏆" : "🎮"}</span><p className="mt-3 text-sm text-slate-400">{status === "loading" ? "Loading ad…" : "No ad available"}</p></div>
          </div>
        )}
        {mode === "journey" && <p className="mt-3 text-xs text-slate-500">{ticketsLeft} tickets remaining</p>}
        {ad && status !== "complete" && <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-[width]" style={{ width: `${Math.min(100, elapsed / 100)}%` }} /></div>}
        <button type="button" onClick={advance} disabled={status === "loading" || (!!ad && (status !== "complete" || elapsed < 10000))} className="btn-gradient mt-5 self-end rounded-full px-7 py-3 font-bold text-ink-950 disabled:cursor-wait disabled:opacity-40">Continue →</button>
      </div>
    </div>
  );
}
