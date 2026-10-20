import { useProfile } from "../state/profile";
import type { Route } from "../state/router";
import { useSocial } from "../state/social";
import Avatar from "./Avatar";
import { cn } from "../utils/cn";

export function Logo() {
  return (
    <a
      href="#/"
      aria-label="AeroRank home"
      className="font-display text-[21px] leading-none font-extrabold tracking-[-0.02em] text-white select-none"
    >
      AERO<span className="text-gradient-gold">RANK</span>
    </a>
  );
}

export function Header({ route }: { route: Route }) {
  const social = useSocial();
  const profile = useProfile();
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-3 px-[18px] py-[26px] lg:px-8">
      <Logo />
      <nav className="ml-auto flex items-center gap-2.5">
        <a
          href="#/leaderboard/flap"
          aria-label="Leaderboard"
          className={cn(
            "rounded-full border px-3 py-2 text-sm font-medium transition min-[480px]:px-4 min-[480px]:text-[15px]",
            route.page === "leaderboard"
              ? "border-cyan-300/50 bg-cyan-300/10 text-white"
              : "border-white/15 bg-white/[0.04] text-slate-200 hover:border-white/30 hover:bg-white/10",
          )}
        >
          <span className="min-[480px]:hidden">Ranks</span>
          <span className="hidden min-[480px]:inline">Leaderboard</span>
        </a>
        <a
          href="#/prizes"
          aria-label="Prize board"
          className={cn(
            "btn-gradient rounded-full px-3 py-2 text-sm font-semibold text-ink-950 shadow-lg shadow-indigo-500/20 transition hover:brightness-110 min-[480px]:px-4 min-[480px]:text-[15px]",
            route.page === "prizes" && "ring-2 ring-white/60 ring-offset-2 ring-offset-ink-950",
          )}
        >
          <span className="min-[480px]:hidden">Prizes</span>
          <span className="hidden min-[480px]:inline">Prize board</span>
        </a>
      </nav>
      <a
        href="#/profile"
        aria-label="Your profile"
        className={cn(
          "ml-1 shrink-0 rounded-full transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300",
          route.page === "profile" && "ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-ink-950",
        )}
      >
        <Avatar avatar={social.avatar} name={profile.name || "Player"} size={38} ring />
      </a>
    </header>
  );
}
