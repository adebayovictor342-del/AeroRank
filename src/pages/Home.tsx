import BestGame from "../components/BestGame";
import { ButtonLink, fmtLeft } from "../components/ui";
import { GAME_LIST, type Accent, type GameMeta } from "../games/meta";
import { WEEK, boardFor, rankOfYou, reigningGrand, weekLabel, weekStartOf, type Entry } from "../state/board";
import { useProfile } from "../state/profile";
import { useNow } from "../state/useNow";
import { cn } from "../utils/cn";

const ACCENTS: Record<Accent, { bg: string; glow: string; letter: string; chip: string; cta: string }> = {
  cyan: {
    bg: "linear-gradient(135deg, rgba(56,217,245,0.16) 0%, rgba(70,110,220,0.10) 45%, rgba(255,255,255,0.015) 100%)",
    glow: "bg-cyan-400/25",
    letter: "text-cyan-100/[0.14]",
    chip: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100",
    cta: "text-cyan-200",
  },
  amber: {
    bg: "linear-gradient(225deg, rgba(255,170,60,0.17) 0%, rgba(255,120,60,0.07) 45%, rgba(255,255,255,0.015) 100%)",
    glow: "bg-amber-400/25",
    letter: "text-amber-100/[0.14]",
    chip: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
    cta: "text-amber-200",
  },
  violet: {
    bg: "linear-gradient(135deg, rgba(155,135,245,0.18) 0%, rgba(110,80,220,0.09) 45%, rgba(255,255,255,0.015) 100%)",
    glow: "bg-violet-400/25",
    letter: "text-violet-100/[0.14]",
    chip: "border-violet-300/20 bg-violet-300/[0.07] text-violet-100",
    cta: "text-violet-200",
  },
  rose: {
    bg: "linear-gradient(225deg, rgba(251,113,160,0.17) 0%, rgba(255,150,100,0.07) 45%, rgba(255,255,255,0.015) 100%)",
    glow: "bg-rose-400/25",
    letter: "text-rose-100/[0.14]",
    chip: "border-rose-300/20 bg-rose-300/[0.07] text-rose-100",
    cta: "text-rose-200",
  },
};

function GameCard({ g, index, board }: { g: GameMeta; index: number; board: Entry[] }) {
  const a = ACCENTS[g.accent];
  const champ = board[0];
  const rank = rankOfYou(board);
  const mine = rank ? board[rank - 1].score : 0;
  return (
    <a
      href={`#/play/${g.id}`}
      style={{ background: a.bg, animationDelay: `${120 + index * 90}ms` }}
      className="group animate-rise relative flex flex-col overflow-hidden rounded-[2.25rem] border border-white/10 px-[34px] pt-7 pb-8 transition duration-300 hover:-translate-y-1 hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-16 -right-16 h-52 w-52 rounded-full opacity-60 blur-3xl transition group-hover:opacity-100",
          a.glow,
        )}
      />
      <span
        aria-hidden
        className={cn(
          "font-display pointer-events-none absolute top-[30px] right-[30px] text-[3.5rem] leading-none font-extrabold select-none",
          a.letter,
        )}
      >
        {g.letter}
      </span>

      <div className="relative flex items-center gap-4">
        <span
          className="shrink-0 text-[2.5rem] leading-none transition duration-300 group-hover:scale-110 group-hover:-rotate-6"
          aria-hidden
        >
          {g.emoji}
        </span>
        <div className="min-w-0 pr-6">
          <p className="text-[10px] leading-[1.5] font-bold tracking-[0.12em] text-cyan-300 uppercase">{g.tag}</p>
          <h3 className="font-display mt-0.5 text-[1.625rem] leading-[1.25] font-bold tracking-[-0.02em] text-white">{g.name}</h3>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {g.id === "skirmish" && (
          <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-200">
            🏆 Journey Mode + ⚔️ Battle Mode
          </span>
        )}
        {g.chips.map((c) => (
          <span key={c} className={cn("rounded-full border px-3 py-1 text-xs font-medium", a.chip)}>
            {c}
          </span>
        ))}
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-2.5 text-sm">
        <div className="rounded-2xl border border-white/10 bg-ink-950/40 px-3.5 py-2.5">
          <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500 uppercase">Top score</p>
          <p className="mt-0.5 truncate font-semibold text-white">
            {champ ? (
              <>
                <span aria-hidden>👑 </span>
                {champ.name} · <span className="tabular-nums">{champ.score}</span>
              </>
            ) : (
              <span className="text-slate-400">Open — be first</span>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-950/40 px-3.5 py-2.5">
          <p className="text-[10px] font-bold tracking-[0.16em] text-slate-500 uppercase">Your rank</p>
          <p className="mt-0.5 truncate font-semibold text-white">
            {rank ? (
              <>
                #{rank} · <span className="tabular-nums">{mine}</span>
              </>
            ) : (
              <span className="text-slate-400">Not ranked yet</span>
            )}
          </p>
        </div>
      </div>

      <span className={cn("relative mt-6 inline-flex items-center gap-2 text-[15px] font-semibold", a.cta)}>
        Play {g.name}
        <span className="transition duration-300 group-hover:translate-x-1.5" aria-hidden>
          →
        </span>
      </span>
    </a>
  );
}



export default function Home() {
  const profile = useProfile();
  const now = useNow(15000);
  const wk = weekStartOf(now);
  const boards = GAME_LIST.map((g) => boardFor(g.id, wk, now, profile));
  const reign = reigningGrand(now, profile);

  return (
    <div className="mx-auto w-full max-w-6xl px-[18px] pb-24 lg:px-8">
      <section className="flex flex-col items-center pt-[27px] text-center">
        <div className="animate-rise inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-[7px] text-[11px] leading-4 font-bold tracking-[0.22em] text-cyan-300/90 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          Four games · One crown · Resets weekly
        </div>

        <h1
          className="font-display animate-rise mt-[22px] max-w-4xl text-[clamp(2.6rem,8.6vw,5rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-white"
          style={{ animationDelay: "60ms" }}
        >
          Beat the top score, <span className="text-gradient-hero">take their place</span>
        </h1>

      </section>

      <section className="mt-[50px] grid gap-4 sm:grid-cols-2">
        {GAME_LIST.map((g, i) => (
          <GameCard key={g.id} g={g} index={i} board={boards[i]} />
        ))}
      </section>

      {/* prize board strip */}
      <section className="glass mt-5 overflow-hidden rounded-[2.25rem] p-7 sm:p-8">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
          <div>
            <p className="text-[10px] leading-[1.5] font-bold tracking-[0.12em] text-cyan-300 uppercase">
              ₦20,000 Weekly Prize Board · ₦200,000 Monthly Pool · {weekLabel(wk)}
            </p>
            <h2 className="font-display mt-1 text-[1.625rem] leading-[1.25] font-bold tracking-[-0.02em] text-white">
              Resets in <span className="text-gradient-gold tabular-nums">{fmtLeft(wk + WEEK - now)}</span>
            </h2>
            {reign && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/10 px-3.5 py-1.5 text-sm text-violet-100">
                <span aria-hidden>💎</span> Reigning Grand Champion: <strong className="font-semibold">{reign.name}</strong>
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <ButtonLink href="#/prizes">Open the prize board</ButtonLink>
              <ButtonLink href="#/leaderboard/flap" variant="ghost">
                See leaderboards
              </ButtonLink>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-2.5">
            {GAME_LIST.map((g, i) => {
              const champ = boards[i][0];
              return (
                <li key={g.id}>
                  <a
                    href={`#/leaderboard/${g.id}`}
                    className="block rounded-2xl border border-white/10 bg-ink-950/40 px-4 py-3 transition hover:border-white/25 hover:bg-white/[0.05]"
                  >
                    <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                      <span aria-hidden>{g.emoji}</span> {g.name}
                    </p>
                    <p className="mt-1 truncate font-semibold text-white">
                      {champ ? (
                        <>
                          <span aria-hidden>👑 </span>
                          {champ.name}
                        </>
                      ) : (
                        <span className="text-slate-400">No score yet</span>
                      )}
                    </p>
                    <p className="font-display text-2xl leading-tight font-extrabold text-amber-200 tabular-nums">
                      {champ ? champ.score : "—"}
                      <span className="ml-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">{g.unit}</span>
                    </p>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mt-5">
        <BestGame />
      </section>
    </div>
  );
}
