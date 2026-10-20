import { backdrop, clamp, H, hint, rand, rr, shakeOffset, W, type Callbacks, type Game, type Input } from "./common";

/*
 * Brick Smash: endless waves of bricks with slow-pace XP matrix:
 * Final_XP = (Total_Bricks_Smashed * 14) + (Total_Rows_Cleared * 100)
 * Accounts for 1 brick every ~3 seconds vs high-density combat kills.
 */

const padY = () => H - 42;
const PAD_H = 13;
const BALL_R = 6.5;
const columns = () => Math.max(8, Math.min(18, Math.round(W / 54)));
const ballSpeed = (wave: number) => Math.min(1100, Math.max(470, W * 0.84, H * 0.62) + (wave - 1) * 22);

interface Brick {
  rowKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  max: number;
  c: string;
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

const PALETTE = ["#38d9f5", "#6aa8ff", "#9b87f5", "#e0568a", "#ffd166", "#5eead4"];

export function createBrick(cb: Callbacks): Game {
  let padX = W / 2;
  let bx = W / 2;
  let by = padY() - BALL_R - 2;
  let vx = 0;
  let vy = 0;
  let speed = ballSpeed(1);
  let lastWidth = W;
  let wave = 1;
  let lives = 3;
  let broken = 0; // Total_Bricks_Smashed
  let rowsCleared = 0; // Total_Rows_Cleared
  let clearedRowKeys = new Set<string>();
  let relaunch = 0;
  let shake = 0;
  let t = 0;
  let bricks: Brick[] = [];
  let puffs: Puff[] = [];

  const calcXP = (b: number, r: number) => b * 14 + r * 100;

  const game: Game = {
    phase: "ready",
    score: 0,
    step,
    draw,
    debug: () => ({
      padX,
      bx,
      by,
      vx,
      vy,
      speed,
      wave,
      lives,
      broken,
      rowsCleared,
      finalXP: calcXP(broken, rowsCleared),
      bricks,
      padW: padWidth(),
    }),
  };

  const padWidth = () => Math.max(54, 88 - (wave - 1) * 5);

  function buildWave() {
    const rows = Math.min(9, 4 + Math.floor((wave - 1) / 2));
    const cols = columns();
    const gap = 4;
    const bw = (W - 28 - (cols - 1) * gap) / cols;
    const bh = 17;
    const x0 = 14;
    const y0 = 76;
    bricks = [];
    for (let r = 0; r < rows; r++) {
      const rowKey = `w${wave}_r${r}`;
      for (let c = 0; c < cols; c++) {
        if (wave > 1 && Math.random() < 0.16) continue;
        const tough = wave >= 3 && Math.random() < Math.min(0.4, 0.12 + wave * 0.04);
        bricks.push({
          rowKey,
          x: x0 + c * (bw + gap),
          y: y0 + r * (bh + gap),
          w: bw,
          h: bh,
          hp: tough ? 2 : 1,
          max: tough ? 2 : 1,
          c: PALETTE[(r + wave) % PALETTE.length],
        });
      }
    }
    if (!bricks.length) {
      bricks.push({ rowKey: `w${wave}_0`, x: W / 2 - 40, y: y0, w: 80, h: bh, hp: 1, max: 1, c: PALETTE[0] });
    }
  }

  function burst(x: number, y: number, c: string, n = 7) {
    for (let i = 0; i < n; i++) {
      puffs.push({ x, y, vx: rand(-150, 150), vy: rand(-200, 40), life: rand(0.3, 0.7), max: 0.7, c });
    }
  }

  function renorm() {
    const up = vy <= 0;
    if (Math.abs(vx) < 0.32 * speed) {
      const sgn = vx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(vx);
      vx = sgn * Math.max(0.32 * speed, Math.abs(vx));
    }
    if (Math.abs(vx) > 0.95 * speed) vx = Math.sign(vx) * 0.95 * speed;
    vy = (up ? -1 : 1) * Math.sqrt(Math.max(speed * speed - vx * vx, (0.31 * speed) ** 2));
  }

  function launch() {
    const a = rand(-1.05, 1.05);
    vx = Math.sin(a) * speed;
    vy = -Math.cos(a) * speed;
    renorm();
    relaunch = 0;
  }

  function loseBall() {
    lives--;
    shake = 0.35;
    if (lives <= 0) {
      const finalXP = calcXP(broken, rowsCleared);
      game.score = finalXP;
      game.phase = "over";
      cb.onOver(finalXP);
      return;
    }
    bx = padX;
    by = padY() - BALL_R - 2;
    vx = 0;
    vy = 0;
    relaunch = 0.9;
  }

  function step(dt: number, input: Input) {
    if (W !== lastWidth) {
      const factor = W / lastWidth;
      lastWidth = W;
      padX *= factor;
      bx *= factor;
      vx *= factor;
      if (game.phase === "ready") buildWave(); // no missing side on first load or resize
      else for (const b of bricks) { b.x *= factor; b.w *= factor; }
      speed = ballSpeed(wave);
    }
    t += dt;
    shake = Math.max(0, shake - dt);
    for (const p of puffs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 700 * dt;
      p.life -= dt;
    }
    puffs = puffs.filter((p) => p.life > 0);

    const pw = padWidth();
    const half = pw / 2 + 2;
    if (input.dir !== 0) padX += input.dir * 620 * dt;
    else if (input.pointerActive) padX += (input.px - padX) * Math.min(1, dt * 24);
    padX = clamp(padX, half, W - half);

    if (game.phase === "ready") {
      bx = padX;
      by = padY() - BALL_R - 2;
      if (input.tap) {
        game.phase = "playing";
        cb.onStart();
        launch();
      }
      return;
    }
    if (game.phase === "over") return;

    if (relaunch > 0) {
      relaunch -= dt;
      bx = padX;
      by = padY() - BALL_R - 2;
      if (input.tap || relaunch <= 0) launch();
      return;
    }

    const steps = 2;
    for (let k = 0; k < steps; k++) {
      bx += (vx * dt) / steps;
      by += (vy * dt) / steps;

      if (bx < BALL_R) {
        bx = BALL_R;
        vx = Math.abs(vx);
      } else if (bx > W - BALL_R) {
        bx = W - BALL_R;
        vx = -Math.abs(vx);
      }
      if (by < 58 + BALL_R) {
        by = 58 + BALL_R;
        vy = Math.abs(vy);
        renorm();
      }

      if (vy > 0 && by + BALL_R >= padY() && by - BALL_R <= padY() + PAD_H && bx > padX - half && bx < padX + half) {
        by = padY() - BALL_R;
        const off = clamp((bx - padX) / (pw / 2), -1, 1);
        let ang = off * (Math.PI / 3);
        if (Math.abs(off) < 0.3) ang = (Math.random() < 0.5 ? -1 : 1) * rand(0.48, 1.0);
        vx = Math.sin(ang) * speed;
        vy = -Math.cos(ang) * speed;
        renorm();
      }

      for (const b of bricks) {
        if (b.hp <= 0) continue;
        const cx = clamp(bx, b.x, b.x + b.w);
        const cy = clamp(by, b.y, b.y + b.h);
        const dx = bx - cx;
        const dy = by - cy;
        if (dx * dx + dy * dy > BALL_R * BALL_R) continue;
        const ox = b.w / 2 + BALL_R - Math.abs(bx - (b.x + b.w / 2));
        const oy = b.h / 2 + BALL_R - Math.abs(by - (b.y + b.h / 2));
        if (ox < oy) {
          vx = bx < b.x + b.w / 2 ? -Math.abs(vx) : Math.abs(vx);
          bx += bx < b.x + b.w / 2 ? -ox : ox;
        } else {
          vy = by < b.y + b.h / 2 ? -Math.abs(vy) : Math.abs(vy);
          by += by < b.y + b.h / 2 ? -oy : oy;
        }
        b.hp--;
        if (b.hp <= 0) {
          broken++; // Total_Bricks_Smashed

          // Check if this entire row is cleared
          const remainingInRow = bricks.filter((other) => other !== b && other.rowKey === b.rowKey && other.hp > 0);
          if (remainingInRow.length === 0 && !clearedRowKeys.has(b.rowKey)) {
            clearedRowKeys.add(b.rowKey);
            rowsCleared++; // Total_Rows_Cleared
            burst(W / 2, b.y, "#ffd166", 12);
          }

          // Balanced XP Calculation Matrix:
          // Final_XP = (Total_Bricks_Smashed * 14) + (Total_Rows_Cleared * 100)
          const finalXP = calcXP(broken, rowsCleared);
          game.score = finalXP;
          cb.onScore(finalXP);
          burst(b.x + b.w / 2, b.y + b.h / 2, b.c, 8);
        } else {
          burst(b.x + b.w / 2, b.y + b.h / 2, "#ffffff", 4);
        }
        renorm();
        break;
      }
      if (by > H + 20) {
        loseBall();
        return;
      }
    }

    bricks = bricks.filter((b) => b.hp > 0);
    if (!bricks.length) {
      wave++;
      speed = ballSpeed(wave);
      buildWave();
      shake = 0.2;
      burst(W / 2, 120, "#ffd166", 16);
    }
  }

  function draw(ctx: CanvasRenderingContext2D) {
    const [sx, sy] = shakeOffset(shake);
    ctx.save();
    ctx.translate(sx, sy);
    backdrop(ctx, bx * 0.2, by * 0.1);

    ctx.fillStyle = "rgba(10,16,34,0.85)";
    ctx.fillRect(0, 0, 8, H);
    ctx.fillRect(W - 8, 0, 8, H);
    ctx.strokeStyle = "rgba(120,160,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(8, H);
    ctx.moveTo(W - 8, 0);
    ctx.lineTo(W - 8, H);
    ctx.stroke();

    for (const b of bricks) {
      ctx.save();
      ctx.shadowColor = b.c;
      ctx.shadowBlur = 10;
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
      g.addColorStop(0, b.c);
      g.addColorStop(1, "rgba(10,16,34,0.9)");
      ctx.fillStyle = b.max > 1 && b.hp > 1 ? g : b.c;
      rr(ctx, b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      rr(ctx, b.x + 3, b.y + 3, b.w - 6, 4, 2);
      ctx.fill();
      if (b.hp > 1) {
        ctx.strokeStyle = "rgba(5,9,19,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + 6, b.y + b.h - 4);
        ctx.lineTo(b.x + b.w / 2, b.y + 5);
        ctx.lineTo(b.x + b.w - 6, b.y + b.h - 4);
        ctx.stroke();
      }
    }

    const pw = padWidth();
    ctx.save();
    ctx.shadowColor = "rgba(56,217,245,0.85)";
    ctx.shadowBlur = 16;
    const pg = ctx.createLinearGradient(padX - pw / 2, 0, padX + pw / 2, 0);
    pg.addColorStop(0, "#7be9ff");
    pg.addColorStop(1, "#8b7cf0");
    ctx.fillStyle = pg;
    rr(ctx, padX - pw / 2, padY(), pw, PAD_H, 6);
    ctx.fill();
    ctx.restore();

    if (game.phase !== "over" && relaunch <= 0) {
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of puffs) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < lives ? "#fb7185" : "rgba(255,255,255,0.16)";
      ctx.beginPath();
      const x = 20 + i * 20;
      ctx.moveTo(x, 24);
      ctx.bezierCurveTo(x - 8, 16, x - 16, 26, x, 36);
      ctx.bezierCurveTo(x + 16, 26, x + 8, 16, x, 24);
      ctx.fill();
    }

    if (relaunch > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = '700 13px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("tap to serve", W / 2, padY() - 24);
    }

    if (game.phase === "ready") hint(ctx, t, "TAP TO START", "Move the paddle — pointer, tap or ← →", H * 0.72);
    if (game.phase === "over") {
      ctx.fillStyle = "rgba(5,9,19,0.5)";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  buildWave();
  return game;
}
