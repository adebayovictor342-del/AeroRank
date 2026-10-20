import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import BillboardScreen from "../components/BillboardScreen";
import DopamineGameOver from "../components/DopamineGameOver";
import GameCanvas from "../components/GameCanvas";
import MapSelectionModal from "../components/MapSelectionModal";
import MatchmakingScreen from "../components/MatchmakingScreen";
import NetDamageModal from "../components/NetDamageModal";
import Stick from "../components/Stick";
import { newBus, resetBus, type Bus } from "../games/bus";
import { nextStance, type Stance } from "../games/soldier";
import type { Phase } from "../games/common";
import { GAME_BY_ID, type GameId } from "../games/meta";
import type { SkirmishOptions } from "../games/skirmish";
import { trackGameOver, trackGameStart, trackHighScore } from "../lib/analytics";
import { boardFor, rankOfYou, weekStartOf, type Entry } from "../state/board";
import { profileStore } from "../state/profile";
import { scoresStore } from "../state/scores";
import {
  skirmishStore,
  useSkirmishState,
  type BattleFormat,
  type BattleResult,
  type CombatantBattleStats,
  type SkirmishGameMode,
  type SkirmishZone,
} from "../state/skirmishState";
import { cn } from "../utils/cn";

const STICK = 124; // diameter of the aim rings, in CSS px

interface Result {
  score: number;
  isBest: boolean;
  isRecord: boolean;
  prevRecord: number;
  prevBest: number;
  before: number | null;
  after: number | null;
  displaced?: string;
  target: Entry | null;
  need: number;
}

function summarize(r: Result, unit: string): { headline: string; lines: string[] } {
  const lines: string[] = [];
  let headline = "Good run";
  if (r.score === 0) {
    return { headline: "Not this time", lines: ["Score one point to get on the board."] };
  }
  if (r.isBest) headline = "New weekly best!";
  if (r.isRecord) headline = "New all-time record!";
  if (r.after === null) return { headline, lines };
  if (r.before === null) lines.push(`You're on the board at #${r.after}.`);
  else if (r.isBest && r.after < r.before)
    lines.push(`Up from #${r.before} to #${r.after}${r.displaced ? ` — you took ${r.displaced}'s position` : ""}.`);
  else if (r.isBest) lines.push(`New best of ${r.score} ${unit}. You're still #${r.after}.`);
  else lines.push(`Your best this week (${r.prevBest} ${unit}) holds at #${r.after}.`);

  if (r.isRecord && r.prevRecord > 0) lines.push(`Personal record: ${r.prevRecord} → ${r.score} ${unit}.`);
  if (r.after === 1) lines.push("👑 You're #1 — defend it until Monday's reset.");
  else if (r.target) lines.push(`Next up: ${r.target.name}. ${r.need} more ${unit} to take #${r.after - 1}.`);
  return { headline, lines };
}

const BTN =
  "absolute z-20 grid place-items-center rounded-full border border-white/35 bg-white/10 font-display font-bold text-white opacity-40 shadow-lg backdrop-blur-[2px] select-none touch-none transition-[opacity,transform] active:scale-95 active:opacity-80";

function Controls({
  game,
  bus,
  mode,
  stance,
  setStance,
}: {
  game: GameId;
  bus: Bus;
  mode: SkirmishGameMode;
  stance: Stance;
  setStance: (s: Stance) => void;
}) {
  const hold = (key: "jet" | "left" | "right" | "shield") => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      bus[key] = true;
      bus.tap = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    onPointerUp: () => {
      bus[key] = false;
    },
    onPointerCancel: () => {
      bus[key] = false;
    },
    onLostPointerCapture: () => {
      bus[key] = false;
    },
    onContextMenu: (e: { preventDefault(): void }) => e.preventDefault(),
  });

  if (game === "skirmish") {
    return (
      <>
        <Stick bus={bus} side="left" size={STICK} label="Move left and right, push up to fly" className="bottom-4 left-4 z-20" />
        <Stick bus={bus} side="right" size={STICK} label="Aim and fire" className="right-4 bottom-4 z-20" />
        <button
          type="button"
          aria-label="Shield"
          className={cn(BTN, "h-16 w-16 text-[11px] tracking-wide")}
          style={{ left: STICK + 28, bottom: 86 }}
          {...hold("shield")}
        >
          SHIELD
        </button>
        <button
          type="button"
          aria-label="Bomb"
          className={cn(BTN, "h-16 w-16 text-[11px] tracking-wide")}
          style={{ right: STICK + 28, bottom: 86 }}
          onPointerDown={(e) => {
            e.preventDefault();
            bus.bomb = true;
            bus.tap = true;
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          BOMB
        </button>
        {mode === "journey" && (
          <button
            type="button"
            aria-label={`Pose: ${stance}. Tap to change stance`}
            data-testid="pose-button"
            onClick={() => setStance(nextStance(stance))}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(BTN, "h-16 w-16")}
            style={{ right: STICK + 28, bottom: 158 }}
          >
            <span className="flex flex-col items-center leading-none">
              <span className="text-[9px] font-bold tracking-wider opacity-75">POSE</span>
              <span className="mt-0.5 text-[11px] font-extrabold uppercase">{stance}</span>
            </span>
          </button>
        )}
      </>
    );
  }
  if (game === "flap") {
    return (
      <button
        type="button"
        aria-label="Flap"
        className={cn(BTN, "bottom-8 left-1/2 h-20 w-20 -translate-x-1/2 text-sm tracking-wide")}
        onPointerDown={(e) => {
          e.preventDefault();
          bus.tap = true;
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        FLAP
      </button>
    );
  }
  return (
    <>
      <button type="button" aria-label="Move left" className={cn(BTN, "bottom-6 left-6 h-20 w-20 text-3xl")} {...hold("left")}>
        ◀
      </button>
      <button type="button" aria-label="Move right" className={cn(BTN, "right-6 bottom-6 h-20 w-20 text-3xl")} {...hold("right")}>
        ▶
      </button>
    </>
  );
}

// Stages for Sambisa Fighter
type SkirmishStage =
  | "hub" // Mode selection: Button 1 Journey vs Button 2 Battle
  | "billboard" // Step 1: 10s Billboard loading screen (5 sponsors)
  | "map-select" // Step 2: Zone / parameters selection
  | "matchmaking" // Step 3: Battle mode programmatic matchmaking with video ad
  | "battlefield" // The live game
  | "journey-over" // Step 4: High-dopamine Game Over screen (Rank, Wallet cash spot lock)
  | "battle-calc"; // Step 5: Net damage calculation (Inflicted - Received)

type ArcadeMode = "journey" | "fun";
type ArcadeStage = "hub" | "billboard" | "battlefield" | "over";

export default function Play({ game }: { game: GameId }) {
  const meta = GAME_BY_ID[game];
  const skirmishState = useSkirmishState();

  const [bus] = useState<Bus>(newBus);
  const [runKey, setRunKey] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [result, setResult] = useState<Result | null>(null);
  const [canRestart, setCanRestart] = useState(false);
  const [arcadeMode, setArcadeMode] = useState<ArcadeMode>("journey");
  const [arcadeStage, setArcadeStage] = useState<ArcadeStage>("hub");
  const [ticketError, setTicketError] = useState("");

  // Sambisa Fighter upgraded mode state
  const isSkirmish = game === "skirmish";
  const [skirmishStage, setSkirmishStage] = useState<SkirmishStage>(isSkirmish ? "hub" : "battlefield");
  const [selectedMode, setSelectedMode] = useState<SkirmishGameMode>("journey");
  const [selectedZone, setSelectedZone] = useState<SkirmishZone>("forest");
  const [battleDurationSec, setBattleDurationSec] = useState<number>(180);
  const [battleFormat, setBattleFormat] = useState<BattleFormat>("2v2");
  const [respawnCountdown, setRespawnCountdown] = useState<number | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [stance, setStance] = useState<Stance>("stand");
  const stanceRef = useRef<Stance>("stand");
  const [battleRoster, setBattleRoster] = useState<CombatantBattleStats[]>([]);
  const [lastKills, setLastKills] = useState<number>(0);

  useEffect(() => {
    if (phase !== "playing") resetBus(bus);
  }, [phase, bus]);

  // the game reads the stance through this ref, so posing never re-creates the run
  useEffect(() => {
    stanceRef.current = stance;
  }, [stance]);

  useEffect(() => {
    if (!isSkirmish) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.code === "KeyC" || e.code === "KeyX") {
        e.preventDefault();
        setStance((prev) => nextStance(prev));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSkirmish]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const startedAt = useRef(0);

  const handleStart = useCallback(() => {
    startedAt.current = Date.now();
    setPhase("playing");
    setResult(null);
    trackGameStart(game);
  }, [game]);

  const handleOver = useCallback(
    (n: number) => {
      const t = Date.now();
      // Fun, including Sambisa's AI battle, is unranked. Only Journey writes to prize boards.
      if ((isSkirmish && selectedMode === "battle") || (!isSkirmish && arcadeMode === "fun")) {
        trackGameOver(game, n, { durationMs: startedAt.current ? t - startedAt.current : undefined });
        if (!isSkirmish) setResult({ score: n, isBest: false, isRecord: false, prevRecord: 0, prevBest: 0, before: null, after: null, target: null, need: 0 });
        setPhase("over");
        if (!isSkirmish) setArcadeStage("over");
        return;
      }
      const wkNow = weekStartOf(t);
      const before = rankOfYou(boardFor(game, wkNow, t, profileStore.get()));
      const sub = profileStore.submit(game, n, t);
      const afterBoard = boardFor(game, wkNow, t, profileStore.get());
      const after = rankOfYou(afterBoard);
      if (after !== null) profileStore.markRank(game, wkNow, after);
      const idx = after === null ? -1 : after - 1;
      const displaced =
        sub.isBest && idx >= 0 && idx + 1 < afterBoard.length && (before === null || after! < before)
          ? afterBoard[idx + 1].name
          : undefined;

      scoresStore.setName(profileStore.get().name);
      const rec = scoresStore.record(game, n);

      trackGameOver(game, n, {
        durationMs: startedAt.current ? t - startedAt.current : undefined,
        isHighScore: rec.isHighScore,
        rank: after,
      });
      if (rec.isHighScore) trackHighScore(game, n, rec.previous);

      setLastKills(Math.round(n / 10));
      setResult({
        score: n, // Final_XP integer
        isBest: sub.isBest,
        isRecord: rec.isHighScore,
        prevRecord: rec.previous,
        prevBest: sub.prev,
        before,
        after,
        displaced,
        target: idx > 0 ? afterBoard[idx - 1] : null,
        need: idx > 0 ? afterBoard[idx - 1].score - afterBoard[idx].score + 1 : 0,
      });

      setPhase("over");
      setCanRestart(false);
      window.setTimeout(() => setCanRestart(true), 650);

      if (isSkirmish && selectedMode === "journey") {
        setSkirmishStage("journey-over");
      }
      if (!isSkirmish) setArcadeStage("over");
    },
    [game, isSkirmish, selectedMode, arcadeMode],
  );

  const restart = useCallback(() => {
    setRunKey((k) => k + 1);
    setPhase("ready");
    setResult(null);
  }, []);

  // Standard keyboard restart for generic games
  useEffect(() => {
    if (phase !== "over" || !canRestart || isSkirmish) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, canRestart, restart, isSkirmish]);

  const exit = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  // ==========================================
  // SAMBISA FIGHTER SPECIFIC ACTIONS
  // ==========================================

  // Button 1: "Journey to the Top" (The Prize 🏆 Grid)
  const startJourneyMode = () => {
    setSelectedMode("journey");
    if (!skirmishStore.burnTicket()) {
      setTicketError("No tickets left. Refill to play Journey.");
      return;
    }
    setTicketError("");
    // Step 1: Drops instantly into the 10-Second Billboard Loading Screen
    setSkirmishStage("billboard");
  };

  // Button 2: "Battle Mode" (Online Multiplayer ⚔️)
  const startBattleMode = () => {
    setSelectedMode("battle");
    // Step 1: Hits the 10-Second Billboard Loading Screen (Sponsor monetization)
    setSkirmishStage("billboard");
  };

  // Step 1 complete -> Step 2: Map Selection
  const handleBillboardComplete = () => {
    setSkirmishStage("map-select");
  };

  // Step 2 complete -> Deploy to battlefield (Journey) or Matchmaking (Battle)
  const handleMapSelected = (zone: SkirmishZone, opts?: { durationSec: number; format: BattleFormat }) => {
    setSelectedZone(zone);
    if (selectedMode === "battle" && opts) {
      setBattleDurationSec(opts.durationSec);
      setBattleFormat(opts.format);
      // Step 3: Matchmaking Screen with programmatic video ad
      setSkirmishStage("matchmaking");
    } else {
      // Step 3: Battlefield for Journey mode (Arcade combat, no respawns)
      setSkirmishStage("battlefield");
      restart();
    }
  };

  // Step 3 complete (Battle mode) -> Battlefield (Continuous action, 3s respawns)
  const handleMatchFound = (combatants: CombatantBattleStats[]) => {
    setBattleRoster(combatants);
    setSkirmishStage("battlefield");
    restart();
  };

  // Step 4 (Battle mode) -> Match timer hits 0:00 -> Step 5: Net Damage Winner Calculation
  const handleBattleEnd = (res: BattleResult) => {
    setBattleResult(res);
    skirmishStore.recordBattleResult(res);
    setSkirmishStage("battle-calc");
  };

  // Step 5 (Journey mode): User Restart -> Loops straight back to Step 1 (10s billboard), burning 1 Ticket
  const handleJourneyRestart = () => {
    if (!skirmishStore.burnTicket()) {
      setTicketError("No tickets left. Refill to play Journey.");
      setSkirmishStage("hub");
      return;
    }
    setSkirmishStage("billboard");
  };

  const startArcade = (mode: ArcadeMode) => {
    if (mode === "journey" && !skirmishStore.burnTicket()) {
      setTicketError("No tickets left. Refill to play Journey.");
      return;
    }
    setTicketError("");
    setArcadeMode(mode);
    setArcadeStage("billboard");
  };

  const handleBattleRematch = () => {
    setSkirmishStage("billboard");
  };

  const skirmishOptions: SkirmishOptions = {
    mode: selectedMode,
    zone: selectedZone,
    matchDurationSec: battleDurationSec,
    matchType: battleFormat,
    playerName: profileStore.get().name || "You",
    playerGender: scoresStore.get().player_gender ?? profileStore.get().gender ?? "male",
    roster: battleRoster.length ? battleRoster : undefined,
    getStance: () => stanceRef.current,
    onBattleEnd: handleBattleEnd,
    onRespawnCountdown: setRespawnCountdown,
  };

  const summary = result ? summarize(result, meta.unit) : null;

  if (!isSkirmish && arcadeStage === "hub") {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-ink-950 p-5">
        <div className="w-full max-w-2xl">
          <a href="#/" onClick={exit} className="mb-9 inline-block text-sm text-slate-400 hover:text-white">← All games</a>
          <p className="text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase">{meta.emoji} {meta.name}</p>
          <h1 className="font-display mb-8 mt-2 text-4xl font-black text-white sm:text-5xl">Choose your mode.</h1>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => startArcade("journey")} className="rounded-3xl border border-amber-300/30 bg-amber-300/[0.08] p-7 text-left transition hover:border-amber-300/80 hover:bg-amber-300/[0.13]">
              <span className="text-3xl">🏆</span>
              <span className="font-display mt-5 block text-2xl font-bold text-white">Journey to the Top</span>
              <span className="mt-2 block text-sm text-amber-200">Ranked · 1 ticket · {skirmishState.tickets} left</span>
            </button>
            <button type="button" onClick={() => startArcade("fun")} className="rounded-3xl border border-cyan-300/30 bg-cyan-300/[0.08] p-7 text-left transition hover:border-cyan-300/80 hover:bg-cyan-300/[0.13]">
              <span className="text-3xl">🎮</span>
              <span className="font-display mt-5 block text-2xl font-bold text-white">Fun Mode</span>
              <span className="mt-2 block text-sm text-cyan-200">Practice · unranked · free</span>
            </button>
          </div>
          {ticketError && <p role="alert" className="mt-4 text-sm text-rose-300">{ticketError}</p>}
          {skirmishState.tickets === 0 && <button type="button" onClick={() => skirmishStore.refillTickets()} className="mt-4 text-sm font-semibold text-cyan-300">Refill tickets</button>}
        </div>
      </div>
    );
  }

  if (!isSkirmish && arcadeStage === "billboard") {
    return <BillboardScreen mode={arcadeMode === "fun" ? "battle" : "journey"} gameName={meta.name} ticketsLeft={skirmishState.tickets} onComplete={() => { restart(); setArcadeStage("battlefield"); }} onCancel={() => setArcadeStage("hub")} />;
  }

  if (!isSkirmish && arcadeStage === "over" && result) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-ink-950 p-5">
        <div className="glass w-full max-w-sm rounded-3xl p-7 text-center">
          <p className="text-xs font-bold tracking-widest text-cyan-300 uppercase">{arcadeMode === "journey" ? "Journey complete" : "Fun run"}</p>
          <h2 className="font-display mt-2 text-6xl font-black text-white tabular-nums" data-testid="over-score">{result.score.toLocaleString()}</h2>
          <p className="mt-1 text-sm text-slate-400">XP{arcadeMode === "journey" && result.after ? ` · Rank #${result.after}` : " · Unranked"}</p>
          {arcadeMode === "journey" && result.isRecord && <p className="mt-3 text-sm font-semibold text-amber-200">New personal best</p>}
          <button type="button" className="btn-gradient mt-7 w-full rounded-full py-3 font-bold text-ink-950" onClick={() => arcadeMode === "journey" ? startArcade("journey") : (restart(), setArcadeStage("battlefield"))}>Play again</button>
          {ticketError && <p role="alert" className="mt-3 text-sm text-rose-300">{ticketError}</p>}
          <div className="mt-4 flex justify-center gap-5 text-sm text-slate-400"><button type="button" onClick={() => setArcadeStage("hub")}>Modes</button><a href="#/leaderboard/flap">Leaderboard</a></div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: SAMBISA FIGHTER UPGRADED MODE HUB & SCREENS
  // ==========================================
  if (isSkirmish) {
    // Stage 1: Mode Selection Hub (when entering or backing out)
    if (skirmishStage === "hub") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-950 p-4 select-none sm:p-6">
          <div className="relative w-full max-w-4xl rounded-[2.5rem] border border-white/15 bg-gradient-to-b from-ink-900 to-ink-950 p-6 shadow-2xl sm:p-10">
            {/* Top Bar: Title & Stats */}
            <div className="flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3.5 py-1 text-[11px] font-bold text-amber-200 uppercase tracking-widest">
                  <span>🪖</span>
                  <span>Mini Militia Combat Suite</span>
                </div>
                <h1 className="font-display mt-2 text-3xl font-black text-white sm:text-4xl">
                  Sambisa Fighter
                </h1>
              </div>

              {/* Status Chips: Tickets & Virtual Wallet */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold ${
                    (scoresStore.get().player_gender ?? profileStore.get().gender ?? "male") === "female"
                      ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                  }`}
                >
                  <span>
                    {(scoresStore.get().player_gender ?? profileStore.get().gender ?? "male") === "female"
                      ? "♀ Female Squad"
                      : "♂ Male Squad"}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-200">
                  <span>🎟️</span>
                  <span>{skirmishState.tickets} / 5 Tickets</span>
                  {skirmishState.tickets === 0 && (
                    <button
                      type="button"
                      onClick={() => skirmishStore.refillTickets()}
                      className="ml-1 underline text-white hover:text-emerald-300"
                    >
                      Refill
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200">
                  <span>💰</span>
                  <span>Locked Cash: ${skirmishState.virtualWalletLockedUsd}</span>
                </div>

                <a
                  href="#/"
                  onClick={exit}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white"
                  title="Return to Menu"
                >
                  ✕
                </a>
              </div>
            </div>

            {/* THE TWO FLAGSHIP BUTTONS */}
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* BUTTON 1: "Journey to the Top" (The Prize 🏆 Grid) */}
              <div
                role="button"
                tabIndex={0}
                onClick={startJourneyMode}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") startJourneyMode();
                }}
                className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[2rem] border border-amber-300/40 bg-gradient-to-br from-amber-500/15 via-slate-900 to-ink-950 p-7 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-300/80 hover:shadow-2xl hover:shadow-amber-500/20 active:scale-95"
              >
                {/* Glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl transition-opacity group-hover:opacity-100 opacity-60"
                />

                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-3xl shadow-lg shadow-amber-500/15">
                      🏆
                    </span>
                    <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-black tracking-wider text-amber-200 uppercase">
                      Prize Grid Mode
                    </span>
                  </div>

                  <h2 className="font-display mt-5 text-2xl font-black text-white sm:text-3xl">
                    Journey to the Top
                  </h2>
                  <p className="mt-1 text-xs font-bold text-amber-300 uppercase tracking-widest">
                    1 life · 1 ticket
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-xs font-bold text-slate-400">{skirmishState.tickets}/5 left</span>
                  <span className="btn-gradient rounded-full px-5 py-2 text-sm font-extrabold text-ink-950 shadow-lg group-hover:brightness-110">
                    Start ➔
                  </span>
                </div>
              </div>

              {/* BUTTON 2: "Battle Mode" (Online Multiplayer ⚔️) */}
              <div
                role="button"
                tabIndex={0}
                onClick={startBattleMode}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") startBattleMode();
                }}
                className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[2rem] border border-cyan-300/40 bg-gradient-to-br from-cyan-500/15 via-slate-900 to-ink-950 p-7 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-cyan-300/80 hover:shadow-2xl hover:shadow-cyan-500/20 active:scale-95"
              >
                {/* Glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl transition-opacity group-hover:opacity-100 opacity-60"
                />

                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/20 text-3xl shadow-lg shadow-cyan-500/15">
                      ⚔️
                    </span>
                    <span className="rounded-full border border-cyan-300/40 bg-cyan-300/15 px-3 py-1 text-xs font-black tracking-wider text-cyan-200 uppercase">
                      Multiplayer Arena
                    </span>
                  </div>

                  <h2 className="font-display mt-5 text-2xl font-black text-white sm:text-3xl">
                      Fun Mode
                  </h2>
                  <p className="mt-1 text-xs font-bold text-cyan-300 uppercase tracking-widest">
                    Battle arena · Respawns · Net damage wins
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Free</span>
                  </span>
                  <span className="btn-gradient rounded-full px-5 py-2 text-sm font-extrabold text-ink-950 shadow-lg group-hover:brightness-110">
                    Enter ➔
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Stage 2: Step 1 Billboard Loading Screen (10s, 5 sponsors)
    if (skirmishStage === "billboard") {
      return (
        <BillboardScreen
          mode={selectedMode}
          gameName={meta.name}
          ticketsLeft={skirmishState.tickets}
          onComplete={handleBillboardComplete}
          onCancel={() => setSkirmishStage("hub")}
        />
      );
    }

    // Stage 3: Step 2 Map Selection (Sambisa Forest, City Center, Hideout)
    if (skirmishStage === "map-select") {
      return (
        <MapSelectionModal
          mode={selectedMode}
          onDeploy={handleMapSelected}
          onBack={() => setSkirmishStage("hub")}
        />
      );
    }

    // Stage 4: Step 3 Matchmaking Screen (Battle Mode only)
    if (skirmishStage === "matchmaking") {
      return (
        <MatchmakingScreen
          zone={selectedZone}
          durationSec={battleDurationSec}
          format={battleFormat}
          playerMmr={skirmishState.battleMmr}
          playerName={profileStore.get().name || "You"}
          playerGender={scoresStore.get().player_gender ?? profileStore.get().gender ?? "male"}
          onMatchFound={handleMatchFound}
          onCancel={() => setSkirmishStage("hub")}
        />
      );
    }

    // Stage 5: Step 4 High-Dopamine Game Over Screen (Journey Mode only)
    if (skirmishStage === "journey-over") {
      return (
        <DopamineGameOver
          score={result?.score ?? lastKills * 10}
          kills={lastKills}
          rank={result?.after || null}
          isRecord={result?.isRecord || false}
          prevRecord={result?.prevRecord || 0}
          ticketsLeft={skirmishState.tickets}
          onPlayAgain={handleJourneyRestart}
          onSelectZone={() => setSkirmishStage("map-select")}
          onExit={() => setSkirmishStage("hub")}
        />
      );
    }

    // Stage 6: Step 5 Net Damage Winner Calculation (Battle Mode only)
    if (skirmishStage === "battle-calc" && battleResult) {
      return (
        <NetDamageModal
          result={battleResult}
          onRematch={handleBattleRematch}
          onNewSetup={() => setSkirmishStage("map-select")}
          onExit={() => setSkirmishStage("hub")}
        />
      );
    }
  }

  // ==========================================
  // RENDER THE LIVE GAME CANVAS
  // ==========================================
  return (
    <GameCanvas
      game={game}
      runKey={runKey}
      bus={bus}
      options={isSkirmish ? skirmishOptions : undefined}
      onStart={handleStart}
      onOver={handleOver}
    >
      {phase !== "over" && (
        <Controls game={game} bus={bus} mode={selectedMode} stance={stance} setStance={setStance} />
      )}

      {/* 3-Second Respawn Overlay for Battle Mode */}
      {isSkirmish && selectedMode === "battle" && respawnCountdown !== null && respawnCountdown > 0 && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm select-none">
          <p className="text-xs font-bold tracking-widest text-cyan-300 uppercase">Eliminated in Action</p>
          <div className="font-display mt-2 text-7xl font-black text-white tabular-nums animate-bounce">
            {respawnCountdown}
          </div>
          <p className="mt-2 text-sm text-slate-300 font-semibold">
            Dropping back into arena with spawn shield...
          </p>
        </div>
      )}

      {/* Back to Hub / Menu Button */}
      <a
        href="#/"
        onClick={(e) => {
          if (isSkirmish && skirmishStage === "battlefield") {
            e.preventDefault();
            setSkirmishStage("hub");
          } else {
            exit();
          }
        }}
        aria-label="Back to games"
        className="absolute top-3 right-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-sm text-white opacity-40 transition-opacity select-none hover:opacity-90 active:opacity-90"
      >
        ✕
      </a>

      {/* Generic Game Over overlay for flap, brick, climb */}
      {!isSkirmish && phase === "over" && result && summary && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-[2px]">
          <div className="animate-pop w-full max-w-[18rem] rounded-3xl border border-white/12 bg-ink-800/90 p-5 text-center shadow-2xl">
            <p className="text-[11px] font-bold tracking-[0.2em] text-cyan-300 uppercase">{summary.headline}</p>
            <p className="font-display mt-1 text-6xl leading-none font-extrabold text-white tabular-nums" data-testid="over-score">
              {result.score}
            </p>
            <p className="mt-1 text-xs tracking-wide text-slate-500 uppercase">{meta.unit}</p>
            <div className="mt-3 space-y-1.5 text-sm leading-snug text-slate-300" data-testid="over-lines">
              {summary.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
            <button
              type="button"
              onClick={restart}
              disabled={!canRestart}
              className="btn-gradient mt-4 w-full rounded-2xl py-3 text-base font-bold text-ink-950 shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {canRestart ? "Play again" : "…"}
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a
                href={`#/leaderboard/${game}`}
                className="rounded-2xl border border-white/12 bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Leaderboard
              </a>
              <a
                href="#/"
                onClick={exit}
                className="rounded-2xl border border-white/12 bg-white/[0.04] py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Games
              </a>
            </div>
          </div>
        </div>
      )}
    </GameCanvas>
  );
}
