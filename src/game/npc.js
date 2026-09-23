// Personajes no jugables: sobrevivientes para rescatar y escoltar.
// Siguen al jugador vivo más cercano por el "rastro" de posiciones que va
// dejando (así doblan esquinas y cruzan puertas sin pathfinding propio).
// Los zombies los atacan igual que a un jugador: si mueren, se pierde la noche.
import { frame, ctx, sx, sy } from '../core/render.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { S, dist } from '../core/state.js';
import { moveEntity, lineClear } from './world.js';

export function spawnNpcs(L) {
  S.npcs = (L.npcs || []).map((n) => ({
    ...n, isNpc: true, r: 5, hp: n.hp || 80, maxHp: n.hp || 80, dir: n.dir || 'down', walk: 0, moving: false,
    dead: false, deadT: 0, invuln: 0, hurtFlash: 0, dashT: 0, follow: !!n.follow, trail: [], kx: 0, ky: 0,
  }));
}

export const npc = (id) => S.npcs?.find((n) => n.id === id);

const dirFrom = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 'side' : 'sideleft') : dy >= 0 ? 'down' : 'up');

// objetivos que los zombies pueden perseguir (los NPC sentados no cuentan)
export function npcTargets() {
  return (S.npcs || []).filter((n) => !n.dead && !n.boarded && !n.static);
}

export function updateNpcs() {
  for (const n of S.npcs || []) {
    if (n.hurtFlash > 0) n.hurtFlash = Math.max(0, n.hurtFlash - 0.03);
    if (n.invuln > 0) n.invuln--;
    if (n.dead) { n.deadT++; continue; }
    if (Math.abs(n.kx) + Math.abs(n.ky) > 0.05) { moveEntity(n, n.kx, n.ky); n.kx *= 0.75; n.ky *= 0.75; }
    if (n.boarded || n.static || !n.follow) { n.moving = false; continue; }
    let leader = null, ld = 1e9;
    for (const p of S.players) {
      if (p.dead || p.boarded || p.gone) continue;
      const d = dist(p.x, p.y, n.x, n.y);
      if (d < ld) { ld = d; leader = p; }
    }
    if (!leader) { n.moving = false; continue; }
    const last = n.trail[n.trail.length - 1];
    if (!last || dist(last.x, last.y, leader.x, leader.y) > 10) {
      n.trail.push({ x: leader.x, y: leader.y });
      if (n.trail.length > 90) n.trail.shift();
    }
    if (ld < 20) { n.moving = false; n.trail = n.trail.slice(-2); continue; }
    // si ve al líder va directo; si no, sigue el rastro
    let t;
    if (lineClear(n.x, n.y - 4, leader.x, leader.y - 4)) { t = leader; n.trail = n.trail.slice(-2); } else {
      while (n.trail.length > 1 && dist(n.x, n.y, n.trail[0].x, n.trail[0].y) < 8) n.trail.shift();
      t = n.trail[0] || leader;
    }
    // demasiado lejos (se quedó trabada): aparece en el rastro cerca del líder
    if (ld > 280 && n.trail.length > 4) { const q = n.trail[n.trail.length - 4]; n.x = q.x; n.y = q.y; n.trail = n.trail.slice(-4); }
    const dx = t.x - n.x, dy = t.y - n.y, d = Math.hypot(dx, dy) || 1;
    const sp = ld > 90 ? 1.45 : 1.2;
    const ox = n.x, oy = n.y;
    moveEntity(n, dx / d * sp, dy / d * sp);
    n.moving = Math.hypot(n.x - ox, n.y - oy) > 0.1;
    n.walk += 0.18;
    n.dir = dirFrom(dx, dy);
  }
}

export function npcDrawables() {
  return (S.npcs || []).filter((n) => !n.boarded).map((n) => ({ y: n.dead ? n.y - 4 : n.y, draw: () => drawNpc(n) }));
}

function drawNpc(n) {
  const f = n.filter || 'none';
  if (n.dead) { frame(`char/death_${n.deathDir || 'side'}`, Math.min(5, n.deadT / 6), n.x, n.y, { filter: f }); return; }
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(sx(n.x), sy(n.y), 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const blink = n.invuln > 0 && Math.floor(S.t / 3) % 2 === 0;
  if (n.static) {
    // sentado y herido: cuadro quieto, un poco más bajo
    frame('char/idle_down', 0, n.x, n.y + 3, { filter: f });
    ctx.fillStyle = '#7a1515'; ctx.fillRect(sx(n.x) + 1, sy(n.y) - 4, 3, 2);
  } else {
    frame(n.moving ? `char/run_${n.dir}` : `char/idle_${n.dir}`, n.moving ? n.walk : S.t / 9, n.x, n.y, { filter: blink ? 'brightness(2.2)' : f });
  }
  const name = n.name.toUpperCase(), w = textWidth(name);
  pixelText(ctx, name, sx(n.x) - Math.floor(w / 2) + 1, sy(n.y) - 29, '#000');
  pixelText(ctx, name, sx(n.x) - Math.floor(w / 2), sy(n.y) - 30, n.color || '#ffcf6b');
  if (!n.static && n.hp < n.maxHp) {
    ctx.fillStyle = '#000'; ctx.fillRect(sx(n.x) - 8, sy(n.y) - 23, 16, 2);
    ctx.fillStyle = '#7cff8f'; ctx.fillRect(sx(n.x) - 8, sy(n.y) - 23, Math.round(16 * n.hp / n.maxHp), 2);
  }
}

export function npcLights() {
  return (S.npcs || []).filter((n) => !n.dead && !n.boarded).map((n) => ({ x: n.x, y: n.y - 6, r: 34, a: 0.75 }));
}
