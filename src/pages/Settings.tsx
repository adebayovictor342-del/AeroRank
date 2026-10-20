import { useRef, useState } from "react";
import Avatar from "../components/Avatar";
import { Label, PageHeading, Panel } from "../components/ui";
import type { Gender } from "../state/board";
import { profileStore } from "../state/profile";
import { scoresStore } from "../state/scores";
import {
  fileToAvatar,
  socialStore,
  useSocial,
  type SocialState,
} from "../state/social";
import { themeStore, useTheme } from "../state/theme";
import { cn } from "../utils/cn";

const MAX_NAME = 24;
const MAX_BIO = 160;

export default function Settings() {
  const social = useSocial();
  const theme = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(social.name);
  const [bio, setBio] = useState(social.bio);
  const [gender, setGender] = useState<Gender | null>(social.gender);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = name !== social.name || bio !== social.bio || gender !== social.gender;

  const applyPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await fileToAvatar(file);
      socialStore.setAvatar(dataUrl as SocialState["avatar"]);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That image couldn't be used.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = () => {
    const clean = name.trim();
    if (!clean) {
      setError("Enter a display name.");
      return;
    }
    if (!gender) {
      setError("Choose Male or Female — gender is required for Battle Mode teams.");
      return;
    }
    setError("");
    socialStore.setName(clean);
    profileStore.setName(clean);
    socialStore.setBio(bio.trim());
    socialStore.setGender(gender);
    profileStore.setGender(gender);
    scoresStore.setGender(gender);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-[18px] pb-24 lg:px-8">
      <PageHeading tag="Account" title="Settings" emoji="⚙" />

      <Panel>
        <Label>Appearance</Label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Color theme">
          <button
            type="button"
            role="radio"
            aria-checked={theme === "light"}
            onClick={() => themeStore.set("light")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
              theme === "light"
                ? "border-cyan-300/60 bg-cyan-300/10 text-white"
                : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10",
            )}
          >
            <span aria-hidden>☀️</span> Light
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === "dark"}
            onClick={() => themeStore.set("dark")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
              theme === "dark"
                ? "border-cyan-300/60 bg-cyan-300/10 text-white"
                : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10",
            )}
          >
            <span aria-hidden>🌙</span> Dark
          </button>
        </div>
      </Panel>

      <Panel className="mt-4">
        <Label>Profile photo</Label>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar avatar={social.avatar} name={social.name || "Player"} size={104} ring />
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold transition",
                  busy
                    ? "cursor-wait bg-white/10 text-slate-400"
                    : "btn-gradient text-ink-950 shadow-lg shadow-indigo-500/20 hover:brightness-110",
                )}
                data-testid="upload-photo"
              >
                {busy ? "Processing…" : "Upload photo"}
              </button>
              {social.avatar && (
                <button
                  type="button"
                  onClick={() => {
                    socialStore.setAvatar(null);
                    setError("");
                  }}
                  className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              aria-label="Upload profile photo"
              className="hidden"
              onChange={(e) => void applyPhoto(e.target.files?.[0])}
            />
            <p className="mt-3 text-xs text-slate-500">JPG, PNG or WebP · up to 4 MB</p>
            {error && (
              <p className="mt-2 rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-200" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="mt-4">
        <Label>About you</Label>

        <label className="mt-1 block">
          <span className="text-sm text-slate-300">Display name</span>
          <input
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            placeholder="Player"
            data-testid="name-input"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/80 px-4 py-2.5 text-white outline-none focus:border-cyan-300/60"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-sm text-slate-300">Bio</span>
          <textarea
            value={bio}
            maxLength={MAX_BIO}
            rows={3}
            onChange={(e) => {
              setBio(e.target.value);
              setSaved(false);
            }}
            placeholder="Say something short."
            data-testid="bio-input"
            className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-ink-900/80 px-4 py-2.5 text-white outline-none focus:border-cyan-300/60"
          />
        </label>

        <div className="mt-4">
          <span className="text-sm text-slate-300">
            Gender <span className="text-rose-300">*</span>
            <span className="ml-2 text-[11px] font-normal text-slate-500">required · decides your Battle squad</span>
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
            <button
              type="button"
              role="radio"
              aria-checked={gender === "male"}
              onClick={() => {
                setGender("male");
                setSaved(false);
                setError("");
              }}
              data-testid="gender-male"
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                gender === "male"
                  ? "border-cyan-300/70 bg-cyan-300/15 text-white shadow-lg shadow-cyan-500/20"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10",
              )}
            >
              <span aria-hidden>♂</span> Male
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={gender === "female"}
              onClick={() => {
                setGender("female");
                setSaved(false);
                setError("");
              }}
              data-testid="gender-female"
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                gender === "female"
                  ? "border-rose-300/70 bg-rose-300/15 text-white shadow-lg shadow-rose-500/20"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10",
              )}
            >
              <span aria-hidden>♀</span> Female
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            data-testid="save-button"
            className={cn(
              "rounded-full px-6 py-2.5 text-sm font-semibold transition",
              dirty
                ? "btn-gradient text-ink-950 shadow-lg shadow-indigo-500/20 hover:brightness-110"
                : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-slate-500",
            )}
          >
            Save
          </button>
          {saved && (
            <span className="text-sm font-semibold text-emerald-300" role="status" data-testid="saved-note">
              ✓ Saved
            </span>
          )}
          <a href="#/profile" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            View profile →
          </a>
        </div>
      </Panel>
    </div>
  );
}
