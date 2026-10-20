import { useState } from "react";
import Avatar from "../components/Avatar";
import BestGame from "../components/BestGame";
import { ButtonLink, Label, Panel } from "../components/ui";
import { GAME_LIST, type GameMeta } from "../games/meta";
import { computeStandings, pct } from "../lib/bestGame";
import { botEntries, weekStartOf } from "../state/board";
import { useProfile } from "../state/profile";
import { highScoreList, usePlayerScores } from "../state/scores";
import {
  daysSince,
  followSuggestions,
  followedPeople,
  me as myProfile,
  personById,
  socialStore,
  useSocial,
  type Person,
} from "../state/social";
import { useNow } from "../state/useNow";
import { cn } from "../utils/cn";

type Tab = "overview" | "scores" | "people";

const TABS: [Tab, string][] = [
  ["overview", "Overview"],
  ["scores", "High scores"],
  ["people", "People"],
];

function FollowButton({ id, full = false }: { id: string; full?: boolean }) {
  const state = useSocial();
  const following = state.following.includes(id);
  return (
    <button
      type="button"
      onClick={() => socialStore.toggleFollow(id)}
      aria-pressed={following}
      data-testid="follow-button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-[15px] font-semibold transition active:scale-[0.98]",
        full && "flex-1",
        following
          ? "border border-white/20 bg-white/[0.06] text-slate-200 hover:border-white/35 hover:bg-white/10"
          : "btn-gradient text-ink-950 shadow-lg shadow-indigo-500/20 hover:brightness-110",
      )}
    >
      {following ? "✓ Following" : "+ Follow"}
    </button>
  );
}

function PersonRow({ person, action }: { person: Person; action: "follow" | "unfollow" }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <a href={`#/profile/${person.id}`} className="shrink-0">
        <Avatar avatar={person.avatar} face={person.face} name={person.name} size={44} />
      </a>
      <a href={`#/profile/${person.id}`} className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{person.name}</p>
        <p className="truncate text-xs text-slate-500">
          {person.followers.toLocaleString("en-US")} followers
        </p>
      </a>
      <button
        type="button"
        onClick={() => socialStore.toggleFollow(person.id)}
        className={cn(
          "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
          action === "unfollow"
            ? "border border-white/15 bg-white/[0.05] text-slate-300 hover:bg-white/10"
            : "btn-gradient text-ink-950 hover:brightness-110",
        )}
      >
        {action === "unfollow" ? "Following" : "+ Follow"}
      </button>
    </li>
  );
}

export default function Profile({ id }: { id: string | null }) {
  const social = useSocial();
  const profile = useProfile();
  const scores = usePlayerScores();
  const now = useNow(30000);
  const [tab, setTab] = useState<Tab>("overview");

  const isYou = !id || id === "you";
  const base: Person = isYou
    ? myProfile(social, profile.name, daysSince(social.since))
    : (personById(id ?? "") ?? {
        id: id ?? "",
        name: id ?? "Player",
        face: "🙂",
        gender: "male" as const,
        bio: "",
        avatar: null,
        followers: 0,
        following: 0,
        joined: "",
        isYou: false,
      });
  // a person you follow counts you as one of their followers
  const person: Person = isYou || !id ? base : { ...base, followers: base.followers + (social.following.includes(id) ? 1 : 0) };

  // what to show under "High scores"
  const standings = computeStandings(scores, now).standings;
  const rows = isYou
    ? highScoreList(scores).map((r) => ({ game: r.game, score: r.score, note: "Personal best" }))
    : GAME_LIST.map((g) => {
        const board = botEntries(g.id, weekStartOf(now), now);
        const e = board.find((b) => b.id === person.id);
        return {
          game: g as GameMeta,
          score: e ? e.score : 0,
          note: e ? `#${board.indexOf(e) + 1} this week` : "No score yet",
        };
      });

  const people = isYou
    ? {
        primary: { title: `You follow ${social.following.length}`, items: followedPeople(social.following), action: "unfollow" as const },
        secondary: { title: "Suggested people", items: followSuggestions(social.following), action: "follow" as const },
      }
    : {
        primary: {
          title: "Followers",
          items: [
            ...followSuggestions([person.id]).slice(0, 4),
            { ...person, isYou: false },
          ].filter((p) => p.id !== person.id),
          action: "follow" as const,
        },
        secondary: {
          title: `Follows ${person.following}`,
          items: followSuggestions([person.id]).slice(0, 3),
          action: "follow" as const,
        },
      };

  return (
    <div className="mx-auto w-full max-w-5xl px-[18px] pb-24 lg:px-8">
      {/* cover */}
      <div className="relative">
        <div
          className="relative h-40 overflow-hidden rounded-b-3xl sm:h-56"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(56,217,245,0.85) 0%, rgba(106,140,255,0.8) 32%, rgba(155,135,245,0.75) 62%, rgba(255,209,102,0.7) 100%)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div aria-hidden className="absolute -right-10 -bottom-16 h-56 w-56 rounded-full bg-white/25 blur-3xl" />
        </div>

        {/* identity bar */}
        <div className="px-1 sm:px-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <div className="-mt-12 sm:-mt-14">
              <Avatar
                avatar={person.avatar}
                face={person.face}
                name={person.name}
                size={112}
                ring
                className="shadow-2xl shadow-black/40"
              />
            </div>
            <div className="flex-1 text-center sm:pb-1 sm:text-left">
              <h1 className="font-display flex flex-wrap items-center justify-center gap-2 text-3xl font-extrabold tracking-[-0.02em] text-white sm:justify-start sm:text-[2.35rem]">
                <span>{person.name}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 align-middle text-xs font-black ${
                    person.gender === "female"
                      ? "border border-rose-300/40 bg-rose-300/15 text-rose-200"
                      : "border border-cyan-300/40 bg-cyan-300/15 text-cyan-200"
                  }`}
                >
                  {person.gender === "female" ? "♀ Female" : "♂ Male"}
                </span>
                {isYou && <span className="align-middle text-sm font-semibold text-cyan-300">(you)</span>}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                <span className="font-semibold text-white" data-testid="follower-count">
                  {person.followers.toLocaleString("en-US")}
                </span>{" "}
                followers
                <span className="mx-2 text-slate-600">·</span>
                <span className="font-semibold text-white">{person.following.toLocaleString("en-US")}</span> following
                <span className="mx-2 text-slate-600">·</span>
                <span className="font-semibold text-white">{person.joined}</span>
              </p>
              {person.bio && (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{person.bio}</p>
              )}
            </div>
            <div className="flex w-full flex-wrap justify-center gap-2 pb-1 sm:w-auto sm:justify-end">
              {isYou ? (
                <>
                  <ButtonLink href="#/settings">Edit profile</ButtonLink>
                  <ButtonLink href="#/settings" variant="ghost">
                    ⚙ Settings
                  </ButtonLink>
                </>
              ) : (
                <>
                  <FollowButton id={person.id} />
                  <ButtonLink href={`#/leaderboard/flap`} variant="ghost">
                    Leaderboard
                  </ButtonLink>
                </>
              )}
            </div>
          </div>

          {/* tabs */}
          <div role="tablist" aria-label="Profile sections" className="mt-5 flex gap-1 border-t border-white/10">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-t-xl px-4 py-3 text-sm font-semibold transition",
                  tab === key
                    ? "border-b-2 border-cyan-300 text-white"
                    : "border-b-2 border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* content */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel>
            <Label>Intro</Label>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2.5">
                <span aria-hidden className="text-lg">🗓</span> Joined {person.joined}
              </li>
              <li className="flex items-center gap-2.5">
                <span aria-hidden className="text-lg">🏆</span>{" "}
                {isYou
                  ? `${highScoreList(scores).filter((r) => r.score > 0).length} games on the board`
                  : `Weekly rank: ${
                      GAME_LIST.map((g) => {
                        const board = botEntries(g.id, weekStartOf(now), now);
                        const i = board.findIndex((b) => b.id === person.id);
                        return i < 0 ? null : `#${i + 1}`;
                      })
                        .filter(Boolean)
                        .join(", ") || "unranked"
                    }`}
              </li>
            </ul>
          </Panel>

          {isYou && (
            <Panel>
              <Label>Your best game</Label>
              <div className="mt-1 space-y-3">
                {standings.map((s) => (
                  <div key={s.game.id} className="flex items-center gap-2.5">
                    <span className="w-5 text-center" aria-hidden>
                      {s.game.emoji}
                    </span>
                    <span className="flex-1">
                      <span className="flex justify-between text-xs">
                        <span className="text-slate-300">{s.game.name}</span>
                        <span className="text-slate-500 tabular-nums">{s.played ? `${pct(s.ratio)}%` : "—"}</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400"
                          style={{ width: `${s.played ? Math.max(3, pct(s.ratio)) : 0}%` }}
                        />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          {tab === "overview" && (
            <>
              <Panel>
                <div className="mb-3 flex items-center justify-between">
                  <Label className="mb-0">High scores</Label>
                  <button
                    type="button"
                    onClick={() => setTab("scores")}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    See all →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {rows.map((r) => (
                    <div key={r.game.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-center">
                      <p className="text-xl" aria-hidden>
                        {r.game.emoji}
                      </p>
                      <p className="font-display mt-1 text-2xl font-extrabold text-white tabular-nums">
                        {r.score.toLocaleString("en-US")}
                      </p>
                      <p className="text-[11px] text-slate-500">{r.game.unit}</p>
                    </div>
                  ))}
                </div>
              </Panel>
              {isYou && <BestGame />}
            </>
          )}

          {tab === "scores" && (
            <Panel>
              <Label>{isYou ? "Personal bests" : `${person.name} this week`}</Label>
              <ul className="divide-y divide-white/5">
                {rows.map((r) => (
                  <li key={r.game.id} className="flex items-center gap-3 py-3">
                    <span className="text-2xl" aria-hidden>
                      {r.game.emoji}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{r.game.name}</p>
                    </div>
                    <p className="font-display text-2xl font-extrabold text-white tabular-nums">
                      {r.score.toLocaleString("en-US")}
                      <span className="ml-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                        {r.game.unit}
                      </span>
                    </p>
                    <a
                      href={`#/play/${r.game.id}`}
                      className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Play
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {tab === "people" && (
            <div className="space-y-4">
              <Panel>
                <Label>{people.primary.title}</Label>
                {people.primary.items.length ? (
                  <ul className="space-y-2">
                    {people.primary.items.map((p) => (
                      <PersonRow key={p.id} person={p} action={people.primary.action} />
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                    Nothing here yet.
                  </p>
                )}
              </Panel>
              <Panel>
                <Label>{people.secondary.title}</Label>
                <ul className="space-y-2">
                  {people.secondary.items.map((p) => (
                    <PersonRow key={p.id} person={p} action={people.secondary.action} />
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

