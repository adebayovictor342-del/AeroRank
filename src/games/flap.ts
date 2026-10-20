import {
  backdrop,
  clamp,
  H,
  hint,
  rand,
  rr,
  shakeOffset,
  W,
  type Callbacks,
  type Game,
  type Input,
} from "./common";

const GROUND = 56;
const BX = 96; // bird x
const R = 12; // bird visual radius
const HIT = 10; // forgiving hit box
const PW = 52; // gate body width
const CAPH = 20;
const CAPX = 6;
const GRAV = 1350;
const FLAP = 405;
const SPACING = 205;

interface Pipe {
  x: number;
  cy: number;
  gap: number;
  passed: boolean;
}

const speedAt = (s: number) => 128 + Math.min(42, (s / 10) * 1.4);
const gapAt = (s: number) => Math.max(128, 162 - (s / 10) * 0.9);

const box = (a0: number, b0: number, a1: number, b1: number, c0: number, d0: number, c1: number, d1: number) =>
  a0 < c1 && a1 > c0 && b0 < d1 && b1 > d0;

export function createFlap(cb: Callbacks): Game {
  let y = H * 0.42;
  let vy = 0;
  let t = 0;
  let scroll = 0;
  let spawn = 0;
  let gates = 0;
  let lastCy = H * 0.42;
  let shake = 0;
  let pipes: Pipe[] = [];

  const game: Game = {
    phase: "ready",
    score: 0,
    step,
    draw,
    debug: () => ({ y, vy, pipes, gap: gapAt(game.score), ground: H - GROUND }),
  };

  function spawnPipe() {
    const gap = gapAt(game.score);
    const lo = 70 + gap / 2;
    const hi = H - GROUND - 70 - gap / 2;
    const cy = clamp(lastCy + rand(-140, 140), lo, hi);
    lastCy = cy;
    pipes.push({ x: W + PW, cy, gap, passed: false });
  }

  function die() {
    game.phase = "over";
    shake = 0.4;
    vy = -140;
    cb.onOver(game.score);
  }

  function step(dt: number, input: Input) {
    t += dt;
    if (game.phase === "ready") {
      y = H * 0.42 + Math.sin(t * 5) * 7;
      scroll += 70 * dt;
      if (input.tap) {
        game.phase = "playing";
        vy = -FLAP;
        spawn = 0;
        spawnPipe();
        cb.onStart();
      }
      return;
    }

    shake = Math.max(0, shake - dt);

    if (game.phase === "over") {
      vy += GRAV * dt;
      y = Math.min(H - GROUND - R, y + vy * dt);
      if (y >= H - GROUND - R) vy = 0;
      return;
    }

    const sp = speedAt(game.score);
    scroll += sp * dt;
    vy += GRAV * dt;
    if (input.tap) vy = -FLAP;
    y += vy * dt;
    if (y < R) {
      y = R;
      if (vy < 0) vy = 0;
    }

    spawn += sp * dt;
    if (spawn >= SPACING) {
      spawn -= SPACING;
      spawnPipe();
    }

    let dead = false;
    for (const p of pipes) {
      p.x -= sp * dt;
      if (!p.passed && p.x + PW < BX - R) {
        p.passed = true;
        gates++;
        const finalXP = gates * 10;
        game.score = finalXP;
        cb.onScore(finalXP);
      }
      const top = p.cy - p.gap / 2;
      const bot = p.cy + p.gap / 2;
      const x0 = BX - HIT;
      const x1 = BX + HIT;
      const y0 = y - HIT;
      const y1 = y + HIT;
      if (
        box(x0, y0, x1, y1, p.x, -60, p.x + PW, top - CAPH) ||
        box(x0, y0, x1, y1, p.x - CAPX, top - CAPH, p.x + PW + CAPX, top) ||
        box(x0, y0, x1, y1, p.x - CAPX, bot, p.x + PW + CAPX, bot + CAPH) ||
        box(x0, y0, x1, y1, p.x, bot + CAPH, p.x + PW, H)
      ) {
        dead = true;
        break;
      }
    }
    pipes = pipes.filter((p) => p.x > -PW - 20);

    if (!dead && y + R >= H - GROUND) {
      y = H - GROUND - R;
      dead = true;
    }
    if (dead) die();
  }

  function drawPipe(ctx: CanvasRenderingContext2D, p: Pipe) {
    const top = p.cy - p.gap / 2;
    const bot = p.cy + p.gap / 2;
    const body = ctx.createLinearGradient(p.x, 0, p.x + PW, 0);
    body.addColorStop(0, "#16366b");
    body.addColorStop(0.5, "#24489a");
    body.addColorStop(1, "#2a2f7c");
    const cap = ctx.createLinearGradient(p.x - CAPX, 0, p.x + PW + CAPX, 0);
    cap.addColorStop(0, "#3f78d6");
    cap.addColorStop(1, "#6a56d6");

    ctx.save();
    ctx.shadowColor = "rgba(106,168,255,0.55)";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#8fc0ff";

    ctx.fillStyle = body;
    ctx.fillRect(p.x, -6, PW, top - CAPH + 6);
    ctx.fillRect(p.x, bot + CAPH, PW, H - GROUND - (bot + CAPH));
    ctx.strokeRect(p.x, -6, PW, top - CAPH + 6);
    ctx.strokeRect(p.x, bot + CAPH, PW, H - GROUND - (bot + CAPH));

    ctx.fillStyle = cap;
    rr(ctx, p.x - CAPX, top - CAPH, PW + CAPX * 2, CAPH, 6);
    ctx.fill();
    ctx.stroke();
    rr(ctx, p.x - CAPX, bot, PW + CAPX * 2, CAPH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // soft highlight
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(p.x + 8, -6, 6, top - CAPH + 6);
    ctx.fillRect(p.x + 8, bot + CAPH, 6, H - GROUND - (bot + CAPH));
  }

  function drawBird(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(BX, y);
    ctx.rotate(game.phase === "ready" ? 0 : clamp(vy / 650, -0.45, 1.0));
    const body = ctx.createLinearGradient(-R, -R, R, R);
    body.addColorStop(0, "#7be9ff");
    body.addColorStop(1, "#8b7cf0");
    ctx.shadowColor = "rgba(56,217,245,0.75)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, R + 4, R, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // wing
    const w = Math.sin(t * (game.phase === "playing" ? 24 : 10));
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.beginPath();
    ctx.ellipse(-4, 3 + w * 2, 8, 4.5 + w * 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(8, -4, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b1424";
    ctx.beginPath();
    ctx.arc(9.4, -4, 2.1, 0, Math.PI * 2);
    ctx.fill();
    // beak
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(R + 2, -2);
    ctx.lineTo(R + 11, 2);
    ctx.lineTo(R + 2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw(ctx: CanvasRenderingContext2D) {
    const [sx, sy] = shakeOffset(shake);
    ctx.save();
    ctx.translate(sx, sy);
    backdrop(ctx, scroll);

    for (const p of pipes) drawPipe(ctx, p);

    // ground
    const gy = H - GROUND;
    ctx.fillStyle = "#0a1328";
    ctx.fillRect(-20, gy, W + 40, GROUND + 20);
    ctx.fillStyle = "rgba(120,160,255,0.08)";
    for (let x = -((scroll * 1) % 36); x < W + 36; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, gy + 2);
      ctx.lineTo(x + 18, gy + 2);
      ctx.lineTo(x + 6, gy + GROUND);
      ctx.lineTo(x - 12, gy + GROUND);
      ctx.closePath();
      ctx.fill();
    }
    ctx.save();
    ctx.shadowColor = "rgba(56,217,245,0.8)";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#38d9f5";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-20, gy);
    ctx.lineTo(W + 20, gy);
    ctx.stroke();
    ctx.restore();

    drawBird(ctx);

    if (game.phase !== "ready") {
      ctx.save();
      ctx.restore();
    } else hint(ctx, t, "TAP TO FLAP", "Click, tap or press Space", H * 0.7);
    ctx.restore();
  }

  return game;
}
