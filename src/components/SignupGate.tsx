import { useState } from "react";
import type { Gender } from "../state/board";
import { profileStore, useProfile } from "../state/profile";
import { scoresStore, usePlayerScores } from "../state/scores";
import { socialStore, useSocial } from "../state/social";
import { cn } from "../utils/cn";

/**
 * Mandatory account signup: display name + gender (Male / Female).
 * Saves into the primary player profile stores (profile + scores + social)
 * so username, gender and high scores live together in one schema.
 */
export default function SignupGate() {
  const profile = useProfile();
  const scores = usePlayerScores();
  const social = useSocial();

  const [name, setName] = useState(profile.name || social.name || "");
  const [gender, setGender] = useState<Gender | null>(
    scores.player_gender ?? profile.gender ?? social.gender ?? null,
  );
  const [error, setError] = useState("");

  const complete = Boolean(scores.player_gender && profile.gender && social.gender);
  if (complete) return null;

  const save = () => {
    const clean = name.trim().slice(0, 14);
    if (!clean) {
      setError("Enter a display name to create your account.");
      return;
    }
    if (!gender) {
      setError("Choose Male or Female to finish signup — gender is required for Battle Mode teams.");
      return;
    }
    setError("");
    profileStore.setName(clean);
    profileStore.setGender(gender);
    scoresStore.setName(clean);
    scoresStore.setGender(gender);
    socialStore.setName(clean);
    socialStore.setGender(gender);
  };

  const Card = ({
    value,
    icon,
    title,
    sub,
    active,
  }: {
    value: Gender;
    icon: string;
    title: string;
    sub: string;
    active: boolean;
  }) => (
    <button
      type="button"
      role="radio"
      aria-checked={gender === value}
      onClick={() => {
        setGender(value);
        setError("");
      }}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-2xl border p-4 text-center transition active:scale-[0.98]",
        active
          ? value === "male"
            ? "border-cyan-300/70 bg-cyan-300/10 shadow-lg shadow-cyan-500/20"
            : "border-rose-300/70 bg-rose-300/10 shadow-lg shadow-rose-500/20"
          : "border-white/12 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.07]",
      )}
    >
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <span className="font-display text-base font-extrabold text-white">{title}</span>
      <span className="text-[11px] text-slate-400">{sub}</span>
      <span
        className={cn(
          "mt-1 grid h-5 w-5 place-items-center rounded-full border text-[11px]",
          active ? "border-transparent bg-emerald-400 text-ink-950" : "border-white/25 text-transparent",
        )}
        aria-hidden
      >
        ✓
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink-950/95 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/15 bg-ink-900 p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <p className="text-[11px] font-bold tracking-[0.22em] text-cyan-300 uppercase">Create your fighter</p>
          <h2 className="font-display mt-1 text-3xl font-black text-white">Sign up</h2>
          <p className="mt-1 text-sm text-slate-400">
            Pick a callsign and your squad. Gender decides your Battle Mode team.
          </p>
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-200">
            Display name <span className="text-rose-300">*</span>
          </span>
          <input
            value={name}
            maxLength={14}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ShadowFox"
            data-testid="signup-name"
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-ink-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          />
        </label>

        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-200">
            Gender <span className="text-rose-300">*</span>
            <span className="ml-2 text-[11px] font-normal text-slate-500">required · ♂ vs ♀ squads</span>
          </p>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Gender">
            <Card value="male" icon="👨‍✈️" title="Male" sub="♂ Blue Squad" active={gender === "male"} />
            <Card value="female" icon="👩‍✈️" title="Female" sub="♀ Red Squad" active={gender === "female"} />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-200" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          data-testid="signup-save"
          className="btn-gradient mt-5 w-full rounded-2xl py-3.5 text-base font-black text-ink-950 shadow-xl transition hover:brightness-110 active:scale-[0.99]"
        >
          Create account ➔
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Stored with your username + high scores · change anytime in Settings
        </p>
      </div>
    </div>
  );
}
