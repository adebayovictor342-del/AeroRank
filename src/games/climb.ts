import { backdrop, clamp, H, hint, rand, shakeOffset, W, type Callbacks, type Game, type Input } from "./common";

/* Cliff Climber: you climb automatically, steer left/right, never stop. */

const pY = () => H * 0.56; // player's screen y
const PLAYER_X_PAD = 22;

interface Spike {
  x: number;
  w: number;
  wy: number;
}
interface Rock {
  x: number;
  y: number;
  vy: number;
  r: number;
  spin: number;
  rot: number;
}
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  c: string;
}

export function createClimb(cb: Callbacks): Game {
  let x = W / 2;
  let scroll = 0;
  let speed = 95;
  let hearts = 3;
  let metres = 0;
  let invuln = 0;
  let shake = 0;
  let t = 0;
  let rockT = 1.4;
  let nextSpike = 0;
  let armT = 0;
  let spikes: Spike[] = [];
  let rocks: Rock[] = [];
  let puffs: Puff[] = [];

  const game: Game = {
    phase: "ready",
    score: 0,
    step,
    draw,
    debug: () => ({ x, scroll, speed, hearts, metres, spikes, rocks, py: pY() }),
  };

  function hurt() {
    if (game.phase !== "playing" || invuln > 0) return;
    hearts--;
    invuln = 1.25;
    shake = 0.4;
    for (let i = 0; i < 14; i++) {
      puffs.push({ x, y: pY(), vx: rand(-160, 160), vy: rand(-160, 160), life: rand(0.3, 0.7), max: 0.7, c: "#fb7185" });
    }
    if (hearts <= 0) {
      hearts = 0;
      game.phase = "over";
      shake = 0.5;
      const finalXP = metres * 2;
      game.score = finalXP;
      cb.onOver(finalXP);
    }
  }

  function step(dt: number, input: Input) {
    t += dt;
    shake = Math.max(0, shake - dt);
    invuln = Math.max(0, invuln - dt);
    for (const p of puffs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
    }
    puffs = puffs.filter((p) => p.life > 0);

    if (game.phase === "ready") {
      x = W / 2 + Math.sin(t * 2) * 14;
      if (input.tap) {
        game.phase = "playing";
        nextSpike = scroll + H + 140;
        cb.onStart();
      }
      return;
    }
    if (game.phase === "over") return;

    // --- ascent
    speed = Math.min(300, 95 + scroll * 0.013);
    scroll += speed * dt;
    const m = Math.floor(scroll / 10);
    if (m !== metres) {
      metres = m;
      const finalXP = metres * 2;
      game.score = finalXP;
      cb.onScore(finalXP);
    }

    // --- steering
    armT += dt;
    if (input.dir !== 0) x += input.dir * 340 * dt;
    else if (input.pointerActive) x += (input.px - x) * Math.min(1, dt * 15);
    x = clamp(x, PLAYER_X_PAD, W - PLAYER_X_PAD);

    // --- spikes ahead
    while (nextSpike < scroll + H + 220) {
      spikes.push({ x: rand(26, W - 130), w: rand(56, 124), wy: nextSpike });
      nextSpike += Math.max(150, rand(250, 380) - scroll * 0.02);
    }
    spikes = spikes.filter((s) => s.wy - scroll > -80);

    // --- falling rocks
    rockT -= dt;
    if (rockT <= 0) {
      rocks.push({ x: rand(24, W - 24), y: -24, vy: rand(190, 300) + speed * 0.3, r: rand(10, 19), spin: rand(-3, 3), rot: 0 });
      rockT = Math.max(0.55, rand(1.1, 2.3) - scroll * 0.0003);
    }
    for (const r of rocks) {
      r.y += r.vy * dt;
      r.rot += r.spin * dt;
    }
    rocks = rocks.filter((r) => r.y < H + 50);

    // --- collisions
    for (const s of spikes) {
      const sy = s.wy - scroll;
      if (sy < pY() + 20 && sy + 32 > pY() - 20 && x > s.x - 12 && x < s.x + s.w + 12) hurt();
    }
    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i];
      if (Math.hypot(r.x - x, r.y - pY()) < r.r + 13) {
        rocks.splice(i, 1);
        hurt();
      }
    }
  }

  /* ------------------------------ drawing ------------------------------ */

  function drawRock(ctx: CanvasRenderingContext2D, r: Rock) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.fillStyle = "#5b4a7a";
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rr2 = r.r * (0.78 + ((i * 37) % 5) / 12);
      const px = Math.cos(a) * rr2;
      const py = Math.sin(a) * rr2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.arc(-r.r * 0.3, -r.r * 0.3, r.r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw(ctx: CanvasRenderingContext2D) {
    const [sx, sy] = shakeOffset(shake);
    ctx.save();
    ctx.translate(sx, sy);
    backdrop(ctx, 0, scroll * 0.4);

    // distant range (parallax)
    ctx.fillStyle = "rgba(120,160,255,0.07)";
    for (let i = 0; i < 6; i++) {
      const y = ((i * 120 - scroll * 0.25) % 720) - 120;
      ctx.beginPath();
      ctx.moveTo(-20, y + 160);
      ctx.lineTo(90, y);
      ctx.lineTo(200, y + 160);
      ctx.closePath();
      ctx.fill();
    }

    // the wall
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#1a1440");
    g.addColorStop(0.5, "#2a2160");
    g.addColorStop(1, "#171239");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // strata scrolling with the climb
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    const stepY = 64;
    const off = -((scroll % stepY) + stepY) % stepY;
    for (let y = off - stepY; y < H + stepY; y += stepY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let px = 0; px <= W; px += 40) ctx.lineTo(px, y + Math.sin((px + y) * 0.03) * 5);
      ctx.stroke();
    }
    // holds + moss
    for (let i = 0; i < 26; i++) {
      const hx = ((i * 97) % 340) + 12;
      const hy = ((i * 211 - scroll * 1) % 620 + 620) % 620 - 60;
      ctx.fillStyle = i % 4 === 0 ? "rgba(80,220,160,0.35)" : "rgba(255,255,255,0.10)";
      ctx.beginPath();
      ctx.arc(hx, hy, i % 4 === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // spikes (stalactite bands on the wall)
    for (const s of spikes) {
      const y = s.wy - scroll;
      if (y < -60 || y > H + 60) continue;
      ctx.save();
      ctx.shadowColor = "rgba(251,113,133,0.7)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      const n = Math.max(2, Math.round(s.w / 18));
      const wEach = s.w / n;
      ctx.moveTo(s.x, y);
      for (let i = 0; i < n; i++) {
        ctx.lineTo(s.x + i * wEach + wEach / 2, y + 30);
        ctx.lineTo(s.x + (i + 1) * wEach, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(s.x, y, s.w, 4);
    }

    for (const r of rocks) if (r.y > -40) drawRock(ctx, r);

    // the climber
    if (game.phase !== "over") {
      const blink = invuln > 0 && Math.floor(t * 16) % 2 === 0;
      if (!blink) {
        const swing = Math.sin(armT * 7);
        ctx.save();
        ctx.translate(x, pY());
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#e6ecf8";
        ctx.lineWidth = 3.6;
        ctx.shadowColor = "rgba(123,233,255,0.75)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, -17, 5.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 4);
        // arms reaching up, alternating
        ctx.moveTo(0, -8);
        ctx.lineTo(-9 - swing * 4, -22 - swing * 5);
        ctx.moveTo(0, -8);
        ctx.lineTo(9 + swing * 4, -22 + swing * 5);
        // legs
        ctx.moveTo(0, 4);
        ctx.lineTo(-8 - swing * 3, 15);
        ctx.moveTo(0, 4);
        ctx.lineTo(8 + swing * 3, 15);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#7be9ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-5, -6);
        ctx.lineTo(5, -6);
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const p of puffs) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // hearts (status, not a score)
    for (let i = 0; i < 3; i++) {
      const cx = 22 + i * 24;
      ctx.fillStyle = i < hearts ? "#fb7185" : "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.moveTo(cx, 24);
      ctx.bezierCurveTo(cx - 9, 15, cx - 18, 27, cx, 38);
      ctx.bezierCurveTo(cx + 18, 27, cx + 9, 15, cx, 24);
      ctx.fill();
    }

    if (game.phase === "ready") hint(ctx, t, "DRAG TO MOVE", "You climb automatically · ← → also work", H * 0.8);
    if (game.phase === "over") {
      ctx.fillStyle = "rgba(5,9,19,0.55)";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  return game;
}
