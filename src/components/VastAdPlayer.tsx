import { useEffect, useRef, useState } from "react";
import { loadVideoAd, sendAdBeacons, type VideoAd } from "../lib/ads";

/** Non-blocking placement for matchmaking. Plays only contracted VAST creatives. */
export default function VastAdPlayer() {
  const [ad, setAd] = useState<VideoAd | null>(null);
  const [loading, setLoading] = useState(true);
  const sent = useRef(new Set<string>());
  useEffect(() => {
    const tag = window.AERORANK_AD_CONFIG?.vastTagUrl?.trim();
    if (!tag) { setLoading(false); return; }
    let cancelled = false;
    loadVideoAd(tag).then((creative) => { if (!cancelled) { setAd(creative); setLoading(false); } }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const report = (event: string) => {
    if (!ad || sent.current.has(event)) return;
    sent.current.add(event);
    sendAdBeacons(ad.tracking[event] || []);
  };
  return (
    <div className="flex flex-col justify-center overflow-hidden rounded-3xl border border-white/15 bg-black/60 p-5">
      <p className="mb-3 text-[11px] font-bold tracking-widest text-slate-400 uppercase">Ad</p>
      {ad ? (
        <>
          <video
            src={ad.mediaUrl} autoPlay muted playsInline controls
            aria-label={ad.title}
            className="aspect-video w-full rounded-xl bg-black object-contain"
            onPlaying={() => { if (!sent.current.has("start")) { sendAdBeacons(ad.impressions); report("start"); } }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration > 0) {
                if (v.currentTime / v.duration >= 0.25) report("firstQuartile");
                if (v.currentTime / v.duration >= 0.5) report("midpoint");
                if (v.currentTime / v.duration >= 0.75) report("thirdQuartile");
              }
            }}
            onEnded={() => report("complete")}
            onError={() => setAd(null)}
          />
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-300">
            <span className="truncate">{ad.title}</span>
            {ad.clickThrough && <a href={ad.clickThrough} target="_blank" rel="noopener noreferrer sponsored" className="shrink-0 font-semibold text-cyan-300" onClick={() => report("clickThrough")}>Visit ↗</a>}
          </div>
        </>
      ) : <div className="grid aspect-video place-items-center rounded-xl bg-white/[0.03] text-sm text-slate-500">{loading ? "Loading ad…" : "No ad available"}</div>}
    </div>
  );
}