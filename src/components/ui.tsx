import type { ReactNode } from "react";
import { countdown } from "../state/board";
import { cn } from "../utils/cn";

export function PageHeading({
  tag,
  title,
  emoji,
  children,
}: {
  tag: string;
  title: string;
  emoji: string;
  children?: ReactNode;
}) {
  return (
    <div className="animate-rise mb-8">
      <a
        href="#/"
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:border-white/25 hover:text-white"
      >
        <span aria-hidden>←</span> All games
      </a>
      <div className="flex items-start gap-4">
        <span className="text-5xl leading-none" aria-hidden>
          {emoji}
        </span>
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-cyan-300 uppercase">{tag}</p>
          <h1 className="font-display mt-1 text-4xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">{title}</h1>
          {children && <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">{children}</p>}
        </div>
      </div>
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass rounded-3xl p-5 sm:p-6", className)}>{children}</div>;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mb-2 text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase", className)}>{children}</p>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "bad" | "neutral" }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{label}</p>
      <p
        className={cn(
          "font-display mt-0.5 truncate text-xl font-bold tabular-nums",
          tone === "good" && "text-emerald-300",
          tone === "bad" && "text-rose-300",
          (!tone || tone === "neutral") && "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "3d 04h 12m" */
export function fmtLeft(ms: number) {
  const c = countdown(ms);
  return c.d > 0 ? `${c.d}d ${pad(c.h)}h ${pad(c.m)}m` : `${pad(c.h)}h ${pad(c.m)}m ${pad(c.s)}s`;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition",
        variant === "primary"
          ? "btn-gradient text-ink-950 shadow-lg shadow-indigo-500/20 hover:brightness-110"
          : "border border-white/15 bg-white/[0.04] text-slate-200 hover:border-white/30 hover:bg-white/10",
        className,
      )}
    >
      {children}
    </a>
  );
}
