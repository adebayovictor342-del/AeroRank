/* Logical world size. It is re-fitted to the screen once per run (see configureWorld),
   so every game fills the display edge to edge instead of sitting in a letterbox. */
export let W = 360;
export let H = 540;

export function configureWorld(w: number, h: number) {
  W = Math.round(w);
  H = Math.round(h);
}

/**
 * Picks a logical world with the same aspect ratio as the screen. One dimension stays at
 * its design value; the other stretches (within limits) to fill the display.
 */
export function fitWorld(sw: number, sh: number, baseW: number, baseH: number) {
  const a = sw / sh;
  if (a >= baseW / baseH) return { w: clamp(baseH * a, baseW * 0.8, baseW * 3), h: baseH };
  return { w: baseW, h: clamp(baseW / a, baseH * 0.8, baseH * 2.2) };
}

export type Phase = "ready" | "playing" | "over";

export interface Input {
  /** true for exactly one step after a press */
  tap: boolean;
  held: boolean;
  /** pointer position in world coords (moves the paddle / steers the climber) */
  px: number;
  py: number;
  /** pointer is over the game area */
  pointerActive: boolean;
  /** keyboard / on-screen buttons: -1 left, 0 idle, 1 right */
  dir: number;
  /** left stick: move (x) and jet (y, negative = up), -1..1 */
  lx: number;
  ly: number;
  /** right stick: aim direction, and whether it is pushed far enough to fire */
  rx: number;
  ry: number;
  rOn: boolean;
  /** desktop: the mouse button is held (fire at the cursor) */
  mouseFire: boolean;
  /** shield bubble held up */
  shield: boolean;
  /** one-shot: throw a bomb */
  bombTap: boolean;
}

export interface Callbacks {
  onStart(): void;
  onScore(n: number): void;
  onOver(n: number): void;
}

export interface Game {
  phase: Phase;
  score: number;
  step(dt: number, input: Input): void;
  draw(ctx: CanvasRenderingContext2D): void;
  /** internal state, used by automated tests */
  debug(): Record<string, unknown>;
}

export type Factory = (cb: Callbacks, options?: any) => Game;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), r);
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);
}

/** Shared night-sky backdrop with the same blueprint grid as the site. */
export function backdrop(ctx: CanvasRenderingContext2D, sx = 0, sy = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0e1c3a");
  g.addColorStop(1, "#060b16");
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  glow(ctx, W * 0.15, 0, W * 0.9, "56,217,245", 0.18);
  glow(ctx, W * 0.95, 60, W * 0.8, "155,135,245", 0.18);
  ctx.strokeStyle = "rgba(120,160,255,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const s = 44;
  const ox = -((sx * 0.35) % s);
  const oy = (sy * 0.35) % s;
  for (let x = ox; x < W + s; x += s) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = oy - s; y < H; y += s) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
}

/** Faded start prompt — plain text, no box, so the play area stays clean. */
export function hint(ctx: CanvasRenderingContext2D, t: number, title: string, sub: string, y = H * 0.68) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.45 + 0.15 * Math.sin(t * 4);
  ctx.fillStyle = "#ffffff";
  ctx.font = '800 20px Outfit, sans-serif';
  ctx.fillText(title, W / 2, y);
  ctx.globalAlpha *= 0.8;
  ctx.fillStyle = "#9fb2d8";
  ctx.font = '500 12px "Space Grotesk", sans-serif';
  ctx.fillText(sub, W / 2, y + 22);
  ctx.restore();
}

export function shakeOffset(amount: number): [number, number] {
  if (amount <= 0) return [0, 0];
  return [(Math.random() - 0.5) * amount * 26, (Math.random() - 0.5) * amount * 26];
}
