import { tierFor, type Entry } from "../state/board";
import { cn } from "../utils/cn";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Row({
  e,
  rank,
  unit,
  showPrize,
  reigning,
}: {
  e: Entry;
  rank: number;
  unit: string;
  showPrize: boolean;
  reigning?: string;
}) {
  const tier = tierFor(rank);
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
        e.you
          ? "border-cyan-300/35 bg-cyan-300/[0.09]"
          : rank === 1
            ? "border-amber-300/25 bg-amber-300/[0.06]"
            : "border-transparent bg-white/[0.03]",
      )}
      data-you={e.you ? "true" : undefined}
    >
      <span className="font-display w-8 shrink-0 text-center text-lg font-bold text-slate-300 tabular-nums">
        {MEDAL[rank] ?? rank}
      </span>
      <a
        href={e.you ? "#/profile" : `#/profile/${encodeURIComponent(e.id)}`}
        aria-label={`${e.name}'s profile`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-xl transition hover:bg-white/[0.14]"
      >
        <span aria-hidden>{e.face}</span>
      </a>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <a
            href={e.you ? "#/profile" : `#/profile/${encodeURIComponent(e.id)}`}
            className={cn(
              "truncate text-[15px] font-semibold hover:underline",
              e.you ? "text-cyan-100" : "text-white",
            )}
          >
            {e.name}
          </a>
          {e.you && (
            <span className="rounded-full bg-cyan-300 px-2 py-px text-[10px] font-extrabold tracking-wide text-ink-950 uppercase">
              You
            </span>
          )}
          {reigning === e.id && (
            <span title="Last week's champion" className="shrink-0 text-sm">
              👑
            </span>
          )}
        </span>
      </span>
      {showPrize && tier && (
        <span
          className={cn(
            "hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold sm:inline-block",
            tier.id === "gold" && "border-amber-300/40 bg-amber-300/10 text-amber-200",
            tier.id === "silver" && "border-slate-300/30 bg-slate-300/10 text-slate-200",
            tier.id === "bronze" && "border-orange-300/30 bg-orange-300/10 text-orange-200",
            tier.id === "top10" && "border-white/10 bg-white/[0.05] text-slate-300",
          )}
        >
          {tier.icon} {tier.title}
        </span>
      )}
      <span className="font-display shrink-0 text-right text-xl font-extrabold text-white tabular-nums">
        {e.score.toLocaleString("en-US")}
        <span className="ml-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">{unit}</span>
      </span>
    </li>
  );
}

export default function BoardRows({
  entries,
  limit = 10,
  unit,
  showPrize = false,
  reigning,
  empty = "No scores yet.",
}: {
  entries: Entry[];
  limit?: number;
  unit: string;
  showPrize?: boolean;
  reigning?: string;
  empty?: string;
}) {
  if (!entries.length) {
    return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">{empty}</p>;
  }
  const youIdx = entries.findIndex((e) => e.you);
  const outside = youIdx >= limit ? entries[youIdx] : null;
  return (
    <ol className="space-y-1.5">
      {entries.slice(0, limit).map((e, i) => (
        <Row key={e.id} e={e} rank={i + 1} unit={unit} showPrize={showPrize} reigning={reigning} />
      ))}
      {outside && (
        <>
          <li aria-hidden className="py-0.5 text-center text-xs tracking-[0.3em] text-slate-600">
            ···
          </li>
          <Row e={outside} rank={youIdx + 1} unit={unit} showPrize={showPrize} reigning={reigning} />
        </>
      )}
    </ol>
  );
}
