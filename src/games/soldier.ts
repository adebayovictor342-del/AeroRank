import { rr } from "./common";

/*
 * Sambisa Fighter character renderer.
 *
 * Everything is drawn from the FEET anchor (translate(x, y) where y = ground
 * contact) so stances plant correctly. Facing is derived from the aim direction
 * (360°), the head/visor leans where the soldier is looking, and the rifle rides
 * the aim angle — so a soldier can shoot left, right, up and down.
 *
 * Stances:
 *   stand  — upright, full height, full speed
 *   kneel  — down on one knee to shoot, lower profile, slower
 *   prone  — flat on the ground, smallest profile, slowest
 */

export type Stance = "stand" | "kneel" | "prone";
export type Faction = "soldier" | "bandit";
export type GunKind = "rifle" | "mg" | "sword";

/** Half-height of the hitbox per stance (used by collision code). */
export const STANCE_HITBOX: Record<Stance, number> = { stand: 18, kneel: 15, prone: 10 };
/** Movement multiplier per stance. */
export const STANCE_SPEED: Record<Stance, number> = { stand: 1, kneel: 0.72, prone: 0.42 };
/** Jetpack thrust multiplier per stance. */
export const STANCE_THRUST: Record<Stance, number> = { stand: 1, kneel: 0.75, prone: 0.3 };

export const nextStance = (s: Stance): Stance => (s === "stand" ? "kneel" : s === "kneel" ? "prone" : "stand");

export interface SoldierOpts {
  x: number;
  y: number; // feet / ground contact
  aim: number; // world radians
  stance: Stance;
  phase: number; // animation clock
  moving: boolean;
  airborne: boolean;
  faction: Faction;
  team: string; // trim colour (squad identification stripe)
  gun: GunKind;
  flash: number;
  jet?: boolean;
  scale?: number;
  swordSwing?: number;
}

/** World position of the visible barrel tip. Keep projectiles and flashes on this point. */
export function soldierMuzzle(x: number, feetY: number, aim: number, stance: Stance, scale = 1, gun: GunKind = "rifle") {
  const facing = Math.cos(aim) >= 0 ? 1 : -1;
  const angle = Math.atan2(Math.sin(aim), Math.max(1e-3, Math.abs(Math.cos(aim))));
  const shoulder = stance === "prone" ? { x: 6, y: -9 } : stance === "kneel" ? { x: 2, y: -24 } : { x: 0, y: -32 };
  const barrel = (stance === "prone" ? 3 : 11) + (gun === "mg" ? 37 : 34);
  const yOffset = -1;
  return {
    x: x + facing * scale * (shoulder.x + Math.cos(angle) * barrel - Math.sin(angle) * yOffset),
    y: feetY + scale * (shoulder.y + Math.sin(angle) * barrel + Math.cos(angle) * yOffset),
  };
}

/** Weapon silhouette: assault rifle / heavy MG / sword, drawn facing +x. */
function drawWeapon(ctx: CanvasRenderingContext2D, gun: GunKind, flash: number) {
  if (gun === "sword") {
    ctx.fillStyle = "#352115";
    ctx.fillRect(-8, -2, 14, 4);
    ctx.fillStyle = "#c89b59";
    ctx.fillRect(4, -7, 3, 14); // guard
    const blade = ctx.createLinearGradient(8, -4, 52, 0);
    blade.addColorStop(0, "#828fa0");
    blade.addColorStop(0.6, "#e6edf3");
    blade.addColorStop(1, "#ffffff");
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(7, -4);
    ctx.lineTo(44, -6);
    ctx.quadraticCurveTo(52, -8, 56, -14);
    ctx.quadraticCurveTo(54, -5, 46, -1);
    ctx.lineTo(7, 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.lineTo(48, -4);
    ctx.stroke();
    return;
  }

  const heavy = gun === "mg";
  ctx.fillStyle = "#0e1116"; // stock
  ctx.beginPath();
  ctx.moveTo(-4, -4.5);
  ctx.lineTo(-13, -3);
  ctx.lineTo(-13, 3);
  ctx.lineTo(-4, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#161a22";
  rr(ctx, -4, -4.6, heavy ? 12 : 10, heavy ? 8 : 7.4, 1.6);
  ctx.fill();
  ctx.fillStyle = "#0b0e13";
  rr(ctx, -1, -8.5, heavy ? 7 : 6, 4, 1); // optic
  ctx.fill();
  ctx.fillStyle = "#0e1116";
  if (heavy) {
    rr(ctx, 3, 1, 7, 8, 1); // box magazine
    ctx.fill();
  } else {
    ctx.save();
    ctx.translate(4, 2);
    ctx.rotate(0.35);
    rr(ctx, 0, 0, 4.5, 8, 1); // curved magazine
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#161a22";
  rr(ctx, 8, -4, heavy ? 17 : 14, heavy ? 7 : 6, 1.6); // handguard
  ctx.fill();
  ctx.fillStyle = "#0e1116";
  rr(ctx, 22, -2.6, heavy ? 14 : 11, heavy ? 3.4 : 2.8, 1); // barrel
  ctx.fill();
  ctx.beginPath(); // front sight
  ctx.moveTo(20, -6);
  ctx.lineTo(23, -6);
  ctx.lineTo(23, -4);
  ctx.lineTo(20, -4);
  ctx.closePath();
  ctx.fill();
  if (heavy) {
    ctx.strokeStyle = "#0b0e13";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(26, 2);
    ctx.lineTo(23, 7);
    ctx.moveTo(30, 2);
    ctx.lineTo(33, 7); // bipod
    ctx.stroke();
  }
  if (flash > 0) {
    const tip = heavy ? 37 : 34;
    const alpha = Math.min(1, flash * 8);
    ctx.shadowColor = "#ffae48";
    ctx.shadowBlur = 13;
    ctx.fillStyle = `rgba(255,148,31,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(tip - 1, -3);
    ctx.lineTo(tip + 7, -6);
    ctx.lineTo(tip + 18, 0);
    ctx.lineTo(tip + 7, 6);
    ctx.lineTo(tip - 1, 3);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255,244,194,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(tip, -2);
    ctx.lineTo(tip + 11, 0);
    ctx.lineTo(tip, 2);
    ctx.closePath();
    ctx.fill();
  }
}

/** Both arms reaching to the rifle, drawn inside the rotated shoulder group. */
function drawArms(ctx: CanvasRenderingContext2D, skin: string, sleeve: string) {
  ctx.strokeStyle = sleeve;
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(-3, -1); // rear shoulder→grip
  ctx.lineTo(3, 2);
  ctx.stroke();
  ctx.strokeStyle = sleeve;
  ctx.beginPath();
  ctx.moveTo(1, 1);
  ctx.lineTo(14, -1); // front shoulder→handguard
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(3.5, 2, 2.6, 0, Math.PI * 2); // gloved hands
  ctx.arc(15, -1, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function helmet(ctx: CanvasRenderingContext2D, kind: Faction, team: string) {
  if (kind === "soldier") {
    ctx.fillStyle = "#26313f";
    ctx.beginPath();
    ctx.arc(0, -2, 7.6, Math.PI, Math.PI * 2);
    ctx.lineTo(7.6, -1);
    ctx.lineTo(-7.6, -1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#161d28";
    rr(ctx, -7.6, -1.6, 15.2, 3, 1.4); // brim
    ctx.fill();
    ctx.fillStyle = "#3d4c5f";
    rr(ctx, -2.4, -10.5, 5, 3.4, 1.2); // NVG mount
    ctx.fill();
    ctx.fillStyle = team;
    ctx.fillRect(-6.5, -6, 3, 1.6); // team band
  } else {
    // Distinct rough headscarf, no helmet or tactical night-vision mount.
    ctx.fillStyle = "#352a20";
    ctx.beginPath();
    ctx.arc(0, -2, 7.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#413024";
    ctx.beginPath();
    ctx.moveTo(-7.4, -1);
    ctx.lineTo(7.4, -1);
    ctx.lineTo(6, 5.6);
    ctx.lineTo(-6, 5.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8a6a4f";
    ctx.beginPath();
    ctx.arc(2.2, -4.4, 1.7, 0, Math.PI * 2); // eye
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(2.6, -4.8, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = team; // wrapped cloth band
    rr(ctx, -7.6, -6.4, 15.2, 3, 1.4);
    ctx.fill();
    ctx.strokeStyle = team;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.quadraticCurveTo(-13, -4, -15, 4);
    ctx.stroke();
  }
}

/**
 * A combatant. `y` is the ground contact point; the whole figure is mirrored by
 * the sign of the aim direction so it faces its target, and the gun/head follow
 * the aim angle so soldiers look up, down, left and right.
 */
export function drawSoldier(ctx: CanvasRenderingContext2D, o: SoldierOpts) {
  const sc = o.scale ?? 1;
  const facing = Math.cos(o.aim) >= 0 ? 1 : -1;
  const la = Math.atan2(Math.sin(o.aim), Math.max(1e-3, Math.abs(Math.cos(o.aim))));

  const bandit = o.faction === "bandit";
  const cloth = bandit ? "#785944" : "#3d4a60";
  const clothDark = bandit ? "#493629" : "#273348";
  const skin = bandit ? "#8a6a4f" : "#c08e6b";
  const sleeve = clothDark;
  const vest = bandit ? "#72523d" : o.team;

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(facing * sc, sc);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const stance = o.stance;
  const swing = o.moving && !o.airborne ? Math.sin(o.phase * 11) * 6.5 : 0;

  /* ---- legs + torso by stance ---- */
  ctx.strokeStyle = clothDark;
  ctx.lineWidth = bandit ? 5 : 5.6;
  if (stance === "prone") {
    // legs trailing along the ground behind the torso
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.lineTo(-22, -4);
    ctx.lineTo(-31, -2);
    ctx.moveTo(-11, -4);
    ctx.lineTo(-23, -6);
    ctx.lineTo(-31, -6);
    ctx.stroke();
    ctx.fillStyle = "#10130f";
    rr(ctx, -35, -3.6, 7, 5, 2);
    ctx.fill();
  } else if (stance === "kneel") {
    ctx.beginPath();
    ctx.moveTo(-1, -11); // rear knee down
    ctx.lineTo(-6, -1.5);
    ctx.lineTo(-13, 0.5);
    ctx.moveTo(0, -11); // front leg planted
    ctx.lineTo(7, -9);
    ctx.lineTo(7, 0);
    ctx.stroke();
    ctx.fillStyle = "#14181f";
    rr(ctx, -16, -2.2, 8, 5, 2);
    rr(ctx, 4, -2.2, 8, 5, 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-4 - swing * 0.5, -9);
    ctx.lineTo(-5 - swing, 0);
    ctx.moveTo(0, -18);
    ctx.lineTo(4 + swing * 0.5, -9);
    ctx.lineTo(5 + swing, 0);
    ctx.stroke();
    if (o.airborne) {
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(7, -11);
      ctx.lineTo(12, -7);
      ctx.stroke();
    }
    ctx.fillStyle = "#14181f";
    rr(ctx, -8 - swing, -2.4, 9, 5, 2);
    rr(ctx, -2 + swing, -2.4, 9, 5, 2);
    ctx.fill();
  }

  // torso
  ctx.fillStyle = cloth;
  if (stance === "prone") {
    rr(ctx, -16, -11, 30, 8, 4);
    ctx.fill();
  } else if (stance === "kneel") {
    ctx.beginPath();
    ctx.moveTo(-6, -11);
    ctx.lineTo(5, -13);
    ctx.lineTo(4, -24);
    ctx.lineTo(-5, -23);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-7, -17);
    ctx.lineTo(7, -17);
    ctx.lineTo(6, -31);
    ctx.lineTo(-6, -31);
    ctx.closePath();
    ctx.fill();
  }

  // Loose wrap for bandits; only friendly soldiers carry a tactical vest.
  ctx.fillStyle = vest;
  if (stance === "prone") {
    rr(ctx, -12, -11.4, 20, 8.6, 3);
    ctx.fill();
    ctx.fillStyle = o.team;
    ctx.fillRect(-9, -11.8, 14, 1.8);
    ctx.fillStyle = vest;
    if (!bandit) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-6, -5.6, 4, 3.4);
      ctx.fillRect(-1, -5.6, 4, 3.4);
      ctx.fillRect(4, -5.6, 4, 3.4);
    }
  } else {
    const top = stance === "kneel" ? -24 : -31;
    const bot = stance === "kneel" ? -12 : -17;
    rr(ctx, -6.6, top + 1.4, 13.2, bot - top - 2, 3);
    ctx.fill();
    if (bandit) {
      ctx.strokeStyle = o.team;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, top + 3);
      ctx.lineTo(5, bot - 2);
      ctx.stroke();
      ctx.fillStyle = cloth;
      ctx.beginPath();
      ctx.moveTo(-5, bot - 2);
      ctx.lineTo(5, bot - 2);
      ctx.lineTo(10, bot + 5);
      ctx.lineTo(-8, bot + 5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = o.team;
      ctx.fillRect(-5.4, top + 2.6, 10.8, 2.2);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      const pouchY = top + (bot - top) * 0.55;
      ctx.fillRect(-4.6, pouchY, 3.6, 3);
      ctx.fillRect(-0.6, pouchY, 3.6, 3);
      ctx.fillRect(3.4, pouchY, 3.6, 3);
    }
  }

  // backpack for soldiers (squads carry gear)
  if (!bandit && stance === "stand") {
    ctx.fillStyle = clothDark;
    rr(ctx, -10.5, -30, 6, 12, 2);
    ctx.fill();
  }

  // head — leans toward where the soldier is looking
  const shoulder = stance === "prone" ? { x: 6, y: -9 } : stance === "kneel" ? { x: 2, y: -24 } : { x: 0, y: -32 };
  const headOff = { x: Math.cos(la) * 2.4, y: Math.sin(la) * 3.2 };
  const headY = shoulder.y - 8 + headOff.y;
  const headX = shoulder.x * 0.5 + headOff.x;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(headX, headY, 7.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(headX, headY);
  helmet(ctx, o.faction, o.team);
  ctx.restore();

  // arms + weapon rotate around the shoulder so the gun tracks the aim (360°)
  ctx.save();
  ctx.translate(shoulder.x, shoulder.y);
  ctx.rotate(la + (o.gun === "sword" ? (o.swordSwing ?? 0) * 1.15 : 0));
  if (stance !== "prone") {
    drawArms(ctx, skin, sleeve);
    ctx.translate(11, -1);
  } else {
    ctx.translate(3, -1);
  }
  drawWeapon(ctx, o.gun, o.flash);
  ctx.restore();

  // jetpack flame
  if (o.jet) {
    const fl = 9 + Math.random() * 9;
    const g = ctx.createLinearGradient(0, 0, 0, fl + 14);
    g.addColorStop(0, "rgba(255,209,102,0.95)");
    g.addColorStop(1, "rgba(255,90,60,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8, stance === "prone" ? -9 : stance === "kneel" ? -10 : -16);
    ctx.lineTo(-14, (stance === "prone" ? -9 : stance === "kneel" ? -10 : -16) + fl);
    ctx.lineTo(-5, (stance === "prone" ? -9 : stance === "kneel" ? -10 : -16) + fl);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3b4670";
    rr(ctx, -11, stance === "prone" ? -12 : stance === "kneel" ? -21 : -30, 6, 12, 3);
    ctx.fill();
  }

  ctx.restore();
}
