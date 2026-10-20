import { useEffect, useMemo, useRef, useState } from "react";
import VastAdPlayer from "./VastAdPlayer";
import {
  ZONES,
  buildGenderSortedLobby,
  teamLabelFor,
  type BattleFormat,
  type CombatantBattleStats,
  type SkirmishZone,
} from "../state/skirmishState";
import type { Gender } from "../state/board";
import { scoresStore } from "../state/scores";

interface Props {
  zone: SkirmishZone;
  durationSec: number;
  format: BattleFormat;
  playerMmr: number;
  playerName: string;
  playerGender?: Gender | null;
  onMatchFound: (combatants: CombatantBattleStats[]) => void;
  onCancel: () => void;
}

const genderBadge = (g: Gender) =>
  g === "male" ? "♂" : "♀";

export default function MatchmakingScreen({
  zone,
  durationSec,
  format,
  playerMmr,
  playerName,
  playerGender,
  onMatchFound,
  onCancel,
}: Props) {
  const resolvedGender: Gender =
    playerGender ?? scoresStore.get().player_gender ?? "male";
  const [statusText, setStatusText] = useState("Preparing AI fighters…");
  const [matchedCount, setMatchedCount] = useState(1); // 1 = player
  const [isMatchReady, setIsMatchReady] = useState(false);

  const zoneMeta = ZONES.find((z) => z.id === zone) || ZONES[0];
  const is2v2 = format === "2v2";
  const totalNeeded = is2v2 ? 4 : 2;

  // Gender sorting matrix: males one side, females the other.
  const lobby = useMemo(
    () => buildGenderSortedLobby(playerName || "You", resolvedGender, format),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerName, resolvedGender, format],
  );

  // Synthesize combatants — starts with player, reveals rest on timeline
  const combatantsRef = useRef<CombatantBattleStats[]>([lobby[0]]);
  const [revealed, setRevealed] = useState<CombatantBattleStats[]>([lobby[0]]);

  // Matchmaking simulation timeline — gender-sorted reveals
  useEffect(() => {
    combatantsRef.current = [lobby[0]];
    setRevealed([lobby[0]]);
    setMatchedCount(1);
    setIsMatchReady(false);

    const oppLabel = resolvedGender === "male" ? "♀ Female Squad" : "♂ Male Squad";
    const ownLabel = teamLabelFor(resolvedGender);

    const t1 = setTimeout(() => {
      setStatusText(`${ownLabel} vs ${oppLabel} · Training rating ${playerMmr}`);
    }, 1200);

    const reveal = (idx: number, label: string) => {
      const c = lobby[idx];
      if (!c) return;
      combatantsRef.current.push(c);
      setRevealed((r) => [...r, c]);
      setMatchedCount((n) => Math.min(totalNeeded, n + 1));
      setStatusText(label);
    };

    const t2 = setTimeout(() => {
      const c = lobby[1];
      reveal(1, `Rival Located: ${c.name} ${genderBadge(c.gender)} · ${oppLabel}`);
    }, 2400);

    let t3: number | undefined;
    let t4: number | undefined;

    if (is2v2) {
      t3 = window.setTimeout(() => {
        const c = lobby[1 + 1]; // teammate is index 1 in 2v2? lobby order: player, mate, rival, rival
        const mate = lobby[1];
        combatantsRef.current = [lobby[0], lobby[2]];
        setRevealed([lobby[0], lobby[2]]);
        setMatchedCount(3);
        setStatusText(`Teammate Slot Filled: ${mate.name} ${genderBadge(mate.gender)} · ${ownLabel}`);
        // fix ordering: show player, rival1, mate — then push mate properly
        combatantsRef.current = [lobby[0], lobby[2], mate];
        setRevealed([lobby[0], lobby[2], mate]);
        void c;
      }, 3400);

      t4 = window.setTimeout(() => {
        const last = lobby[3];
        combatantsRef.current = lobby.slice();
        setRevealed(lobby.slice());
        setMatchedCount(4);
        setStatusText(`Enemy Slot Filled: ${last.name} ${genderBadge(last.gender)} · ${oppLabel} · Ready!`);
        setIsMatchReady(true);
      }, 4600);
    } else {
      t4 = window.setTimeout(() => {
        setStatusText(`1v1 Duel Confirmed! ${ownLabel} vs ${oppLabel} · Ready`);
        setIsMatchReady(true);
      }, 3500);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (t3) clearTimeout(t3);
      if (t4) clearTimeout(t4);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerMmr, is2v2, totalNeeded, resolvedGender, format]);

  // Handle auto-deploy once match is ready or user clicks deploy
  const handleDeploy = () => {
    onMatchFound(lobby.slice(0, totalNeeded));
  };

  const maleSide = teamLabelFor("male");
  const femaleSide = teamLabelFor("female");

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-ink-950 p-4 select-none sm:p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/20 text-lg">⚔️</span>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-cyan-300 uppercase">
              Fun Mode · AI Arena · {is2v2 ? "2v2 Team Skirmish" : "1v1 Duel"}
            </p>
            <h2 className="font-display text-base font-extrabold text-white">
              {zoneMeta.name} · {Math.floor(durationSec / 60)} Minute Combat
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Gender sorting matrix banner */}
      <div className="mx-auto mt-3 flex w-full max-w-4xl items-center justify-center gap-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase">
          <span className="text-cyan-300">♂ {maleSide.replace("♂ ", "")}</span>
          <span className="text-slate-500">vs</span>
          <span className="text-rose-300">♀ {femaleSide.replace("♀ ", "")}</span>
        </span>
        <span className="hidden text-[11px] text-slate-500 sm:inline">Teams sorted by gender from player profiles</span>
      </div>

      {/* Main Grid: Combatant Slots & Embedded Programmatic Video Ad */}
      <div className="my-auto mx-auto grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
        {/* Left Column: Matchmaking Radar & Slot Cards */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-ink-900/80 p-5">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                <span>Fighters: {matchedCount} / {totalNeeded}</span>
              </span>
              <span className="font-mono text-xs text-cyan-300">AI match</span>
            </div>

            <p className="mt-2.5 text-xs font-medium text-slate-400 min-h-[1.5rem]">{statusText}</p>

            {/* Combatant Slot Badges */}
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: totalNeeded }).map((_, i) => {
                const combatant = revealed[i];
                const isFound = !!combatant;
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 transition-all ${
                      isFound
                        ? combatant.isTeammate
                          ? "border-cyan-400/40 bg-cyan-400/10"
                          : "border-rose-400/40 bg-rose-400/10"
                        : "border-dashed border-white/10 bg-white/[0.02] opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{isFound ? combatant.avatarFace : "⏳"}</span>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <span>{isFound ? combatant.name : "Preparing fighter..."}</span>
                          {isFound && (
                            <span
                              className={`rounded-full px-1.5 py-px text-[10px] font-black ${
                                combatant.gender === "male"
                                  ? "bg-cyan-400/20 text-cyan-300"
                                  : "bg-rose-400/20 text-rose-300"
                              }`}
                            >
                              {genderBadge(combatant.gender)}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isFound
                            ? combatant.isPlayer
                              ? `You · Host · ${teamLabelFor(combatant.gender)}`
                              : combatant.isTeammate
                              ? `${teamLabelFor(combatant.gender)} (Teammate)`
                              : `${teamLabelFor(combatant.gender)} (Rival)`
                            : "Joining arena..."}
                        </div>
                      </div>
                    </div>

                    {isFound && (
                      <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase">
                        Ready
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            {isMatchReady ? (
              <button
                type="button"
                onClick={handleDeploy}
                className="btn-gradient w-full rounded-2xl py-3 text-sm font-black text-ink-950 shadow-lg shadow-cyan-400/20 transition hover:brightness-110 active:scale-95"
              >
                Drop In ➔
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <span>Matching…</span>
              </div>
            )}
          </div>
        </div>

        <VastAdPlayer />
      </div>

    </div>
  );
}
