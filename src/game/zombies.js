import { ZOMBIE_FRAMES } from '../core/assets.js';
import { frame, ctx, sx, sy, onScreen } from '../core/render.js';
import { S, rand, pick, dist, bus } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { moveEntity, lineClear, flowTarget, bulletSolidAt, updateFlow, cellFree, openDoor } from './world.js';
import { npcTargets } from './npc.js';
import { bark, anyone } from './barks.js';
import { blood, splat, float, shake, burst, light } from './fx.js';
import { hurtPlayer } from './player.js';
import { dropLoot, addPickup } from './pickups.js';

const D = () => S.diff || { zHp: 1, zDmg: 1, zSpeed: 1, loot: 1 };

export const ZTYPES = {
  walker: { sprite: 'walker', hp: 46, speed: 0.55, dmg: 10, r: 6, coin: 1 },
  runner: { sprite: 'runner', hp: 24, speed: 1.25, dmg: 7, r: 5, coin: 1 },
  thrower: { sprite: 'thrower', hp: 52, speed: 0.5, dmg: 9, r: 6, coin: 2, ranged: true },
  brute: { sprite: 'brute', hp: 200, speed: 0.42, dmg: 22, r: 9, scale: 1.2, knockRes: 0.75, coin: 4 },
  toxic: { sprite: 'runner', hp: 30, speed: 1.45, dmg: 8, r: 5, coin: 2, filter: 'hue-rotate(75deg) saturate(1.7)' },
  // gritón: al verte grita, alerta a la horda y llama corredores
  screamer: { sprite: 'walker', hp: 40, speed: 0.72, dmg: 6, r: 6, coin: 3, filter: 'grayscale(0.75) brightness(1.4) contrast(1.15)', screamer: true },
  // hinchado: lento, revienta en una nube tóxica al morir o al alcanzarte
  bloater: { sprite: 'brute', hp: 95, speed: 0.34, dmg: 0, r: 10, scale: 1.35, knockRes: 0.5, coin: 3, filter: 'hue-rotate(55deg) saturate(1.8) brightness(1.08)', bloater: true },
  // enfermero: el caminante del hospital
  nurse: { sprite: 'walker', hp: 52, speed: 0.6, dmg: 11, r: 6, coin: 1, filter: 'grayscale(0.55) hue-rotate(150deg) brightness(1.3)' },
  // Paciente Cero: jefe del Mundo 2, vomita gas y embiste
  pzero: { sprite: 'brute', hp: 2300, speed: 0.55, dmg: 30, r: 15, scale: 2.2, knockRes: 0.95, coin: 60, filter: 'grayscale(0.85) brightness(1.4) contrast(1.25)', boss: true, pzero: true },
  // El Coloso: jefe final, golpea el piso y derriba a los que están cerca
  colossus: { sprite: 'brute', hp: 3200, speed: 0.5, dmg: 36, r: 17, scale: 2.7, knockRes: 0.97, coin: 80, filter: 'brightness(0.62) contrast(1.4) sepia(0.45)', boss: true, colossus: true },
  boss: { sprite: 'brute', hp: 1700, speed: 0.6, dmg: 30, r: 15, scale: 2.1, knockRes: 0.95, coin: 40, filter: 'hue-rotate(-35deg) saturate(1.5) brightness(0.9)', boss: true },
};

let nextId = 1;
export function spawnZombie(type, x, y) {
  const T = ZTYPES[type];
  const z = {
    id: nextId++,
    type, T, x, y, r: T.r, scale: T.scale || 1, hp: T.hp * D().zHp * (S.zScale || 1), maxHp: T.hp * D().zHp * (S.zScale || 1),
    speed: T.speed * D().zSpeed * (S.zSpeed || 1) * rand(0.88, 1.12), vx: 0, vy: 0, kx: 0, ky: 0,
    state: 'walk', anim: rand(0, 8), dir: 'down', hitFlash: 0, atkCd: rand(20, 60), throwCd: rand(60, 160),
    groanT: rand(120, 500), alert: false, deathT: 0, deathDir: 'side', stuck: 0,
  };
  S.zombies.push(z);
  return z;
}

function dirFrom(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'side' : 'sideleft';
  return dy >= 0 ? 'down' : 'up';
}

function nearestPlayer(z) {
  let best = null, bd = 1e9;
  for (const p of [...S.players, ...npcTargets()]) {
    if (p.dead || p.boarded) continue;
    const d = dist(p.x, p.y, z.x, z.y);
    if (d < bd) { bd = d; best = p; }
  }
  return [best, bd];
}

export function damageZombie(z, dmg, angle, knock, by) {
  if (z.state === 'dying' || z.state === 'dead') return;
  z.hp -= dmg;
  z.hitFlash = 5;
  z.alert = true;
  const k = knock * (1 - (z.T.knockRes || 0));
  z.kx += Math.cos(angle) * k; z.ky += Math.sin(angle) * k;
  blood(z.x, z.y - 8 * z.scale, angle, z.T.boss ? 6 : 8);
  sfx('zhit', 0.7);
  if (z.hp <= 0) killZombie(z, angle, by);
}

function killZombie(z, angle, by) {
  z.state = 'dying'; z.deathT = 0;
  z.deathDir = Math.cos(angle) >= 0 ? 'side' : 'sideleft';
  S.kills++;
  splat(z.x, z.y, z.T.boss ? 10 : 5);
  blood(z.x, z.y - 6, angle, 14);
  sfx('zdie');
  if (z.T.boss) { shake(14); S.hitstop = 10; bus.emit('bossDown', z); }
  else if (z.type === 'brute') { shake(5); S.hitstop = 3; }
  const coins = z.T.coin;
  if (by) { by.coins += coins; float(z.x, z.y - 18 * z.scale, `+${coins}`); bus.emit('coins'); }
  dropLoot(z.x, z.y, z.T.boss ? 1 : 0.18 * D().loot);
  // el lanzador puede soltar su hacha (si alguien del equipo no la tiene)
  if (z.type === 'thrower' && Math.random() < 0.3 && !S.pickups.some((p) => p.weapon === 'axe')
    && S.players.some((p) => !p.gone && !p.inv.weapons.includes('axe'))) addPickup('weapon', z.x, z.y + 2, { weapon: 'axe', life: 1500 });
  if (z.T.bloater) gasCloud(z.x, z.y - 6);
  bus.emit('kill', z);
}

let flowTimer = 0;
export function updateZombies() {
  const alive = [...S.players.filter((p) => !p.dead && !p.boarded), ...npcTargets()];
  if (alive.length && --flowTimer <= 0) { updateFlow(alive); flowTimer = 20; }

  for (const z of S.zombies) {
    if (z.hitFlash > 0) z.hitFlash--;
    if (z.state === 'dying') {
      z.deathT += 0.18;
      const frames = ZOMBIE_FRAMES[z.T.sprite].death;
      if (z.deathT >= frames - 1) { z.state = 'dead'; z.deathT = frames - 1; z.corpse = 600; }
      moveEntity(z, z.kx, z.ky); z.kx *= 0.8; z.ky *= 0.8;
      continue;
    }
    if (z.state === 'dead') { z.corpse--; continue; }

    if (S.menuMode) { wander(z); continue; }
    const [p, d] = nearestPlayer(z);
    // retroceso por golpes
    if (Math.abs(z.kx) + Math.abs(z.ky) > 0.05) { moveEntity(z, z.kx, z.ky); z.kx *= 0.78; z.ky *= 0.78; }
    if (!p) { z.state = 'walk'; z.anim += 0.08; continue; }

    const dx = p.x - z.x, dy = p.y - z.y;
    z.dir = dirFrom(dx, dy);

    // sonidos
    if (--z.groanT <= 0) {
      z.groanT = rand(240, 700);
      if (d < 260) sfx('groan', Math.max(0.15, 1 - d / 260) * (z.T.boss ? 1.6 : 0.8));
    }

    if (z.state === 'attack') {
      const frames = ZOMBIE_FRAMES[z.T.sprite].attack;
      z.anim += 0.22;
      if (!z.hitDone && z.anim >= frames * 0.55) {
        z.hitDone = true;
        if (d < z.r + p.r + 10 * z.scale) hurtPlayer(p, Math.round(z.T.dmg * D().zDmg), Math.atan2(dy, dx));
      }
      if (z.anim >= frames) { z.state = 'walk'; z.atkCd = z.T.boss ? 40 : 55; }
      continue;
    }
    if (z.state === 'scream') {
      z.anim += 0.12;
      if (z.anim >= ZOMBIE_FRAMES.walker.attack) { z.state = 'walk'; z.anim = 0; }
      continue;
    }
    if (z.state === 'throw') {
      z.anim += 0.2;
      if (!z.hitDone && z.anim >= 5) {
        z.hitDone = true;
        const a = Math.atan2(p.y - 6 - (z.y - 12), p.x - z.x);
        S.projectiles.push({ x: z.x, y: z.y - 12, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6, life: 110, spin: 0, dmg: Math.round((z.T.dmg + 3) * D().zDmg) });
        sfx('axe', 0.8);
      }
      if (z.anim >= ZOMBIE_FRAMES.thrower.attack) { z.state = 'walk'; z.throwCd = rand(150, 220); }
      continue;
    }

    z.atkCd--; z.throwCd--;
    if (z.T.screamer && !z.screamed && d < 170 && lineClear(z.x, z.y - 8, p.x, p.y - 8)) { scream(z); continue; }
    const reach = z.r + p.r + 4 * z.scale;
    if (z.T.bloater && d < reach + 4) { damageZombie(z, 1e6, Math.atan2(dy, dx), 0, null); continue; }
    if (d < reach && z.atkCd <= 0) {
      z.state = 'attack'; z.anim = 0; z.hitDone = false;
      if (Math.random() < 0.5) sfx('zattack', z.T.boss ? 1 : 0.7);
      continue;
    }
    if (z.T.ranged && z.throwCd <= 0 && d > 60 && d < 150 && lineClear(z.x, z.y - 8, p.x, p.y - 8)) {
      z.state = 'throw'; z.anim = 0; z.hitDone = false; continue;
    }

    // navegación: directo si hay línea de visión, si no, por el campo de flujo
    let tx = p.x, ty = p.y;
    if (d > 20 && !lineClear(z.x, z.y - 4, p.x, p.y - 4)) {
      const f = flowTarget(z.x, z.y);
      if (f) { tx = f.x; ty = f.y; }
    }
    let mx = tx - z.x, my = ty - z.y;
    const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    // separación entre zombies
    let sepx = 0, sepy = 0;
    for (const o of S.zombies) {
      if (o === z || o.state === 'dying' || o.state === 'dead') continue;
      const ox = z.x - o.x, oy = z.y - o.y, od = Math.hypot(ox, oy);
      const min = z.r + o.r + 2;
      if (od > 0 && od < min) { sepx += ox / od * (min - od) / min; sepy += oy / od * (min - od) / min; }
    }
    // los lanzadores mantienen distancia
    let sp = z.speed * (z.alert || d < 280 ? 1 : 0.6);
    if (z.T.colossus) {
      z.special = (z.special ?? 200) - 1;
      if (z.special <= 0 && d < 90) {
        z.special = 280;
        shake(14); sfx('explosion', 0.8);
        burst(z.x, z.y, 40, { speed: 3.4, color: '#6b5a48', type: 'smoke', lifeMul: 1.4, grav: 0.02, lift: 0.6, size: 2 });
        for (const q of [...S.players, ...npcTargets()]) {
          const dq = dist(q.x, q.y, z.x, z.y);
          if (dq < 70 && !q.dead) hurtPlayer(q, Math.round(26 * D().zDmg), Math.atan2(q.y - z.y, q.x - z.x), true);
        }
      }
    }
    if (z.T.pzero) {
      z.special = (z.special ?? 240) - 1;
      if (z.special <= 0) { z.special = 330; gasCloud(z.x, z.y - 10); z.charge = 55; sfx('scream'); }
      if (z.charge > 0) { z.charge--; sp *= 2.8; }
    }
    if (z.T.ranged && d < 80 && lineClear(z.x, z.y, p.x, p.y)) { mx = -mx; my = -my; sp *= 0.7; }
    const vx = (mx + sepx * 1.2) * sp, vy = (my + sepy * 1.2) * sp;
    const ox = z.x, oy = z.y;
    moveEntity(z, vx, vy);
    const moved = Math.hypot(z.x - ox, z.y - oy);
    if (moved < sp * 0.2) {
      z.stuck++;
      // contra una puerta sin cerradura: la golpea hasta romperla
      const door = z.stuck > 8 && S.world.doors.find((D) => !D.open && !D.lock && Math.abs(D.x + D.w / 2 - z.x) < 18 && Math.abs(D.y + D.h / 2 - z.y) < 18);
      if (door) {
        door.hp -= z.T.boss ? 6 : 1; z.stuck = 9;
        if (S.t % 40 === 0) sfx('bat', 0.5);
        if (door.hp <= 0) { openDoor(S.world, door, true); burst(door.x + 8, door.y, 14, { color: '#704f48', type: 'blood', speed: 2, size: 2 }); sfx('explosion', 0.3); }
      } else if (z.stuck > 40) { moveEntity(z, rand(-2, 2), rand(-2, 2)); z.stuck = 0; }
    } else z.stuck = 0;
    z.anim += 0.1 + moved * 0.12;
  }
  S.zombies = S.zombies.filter((z) => z.state !== 'dead' || z.corpse > 0);

  // hachas lanzadas
  for (const pr of S.projectiles) {
    pr.x += pr.vx; pr.y += pr.vy; pr.spin += 0.5; pr.life--;
    if (bulletSolidAt(pr.x, pr.y)) { pr.life = 0; burst(pr.x, pr.y, 4, { color: '#aaa', type: 'spark', lifeMul: 0.4 }); continue; }
    for (const p of S.players) {
      if (p.dead) continue;
      if (Math.abs(pr.x - p.x) < 6 && Math.abs(pr.y - (p.y - 7)) < 9) {
        hurtPlayer(p, pr.dmg, Math.atan2(pr.vy, pr.vx)); pr.life = 0;
      }
    }
  }
  S.projectiles = S.projectiles.filter((pr) => pr.life > 0);
  updateGas();
}

// escena del menú: los zombies deambulan entre puntos al azar, sin atacar
function wander(z) {
  if (!z.wx || dist(z.x, z.y, z.wx, z.wy) < 6) { z.wx = z.x + rand(-120, 120); z.wy = z.y + rand(-60, 60); }
  const dx = z.wx - z.x, dy = z.wy - z.y, d = Math.hypot(dx, dy) || 1;
  const ox = z.x, oy = z.y;
  moveEntity(z, dx / d * z.speed * 0.5, dy / d * z.speed * 0.5);
  if (Math.hypot(z.x - ox, z.y - oy) < 0.05) z.wx = null;
  z.dir = dirFrom(dx, dy);
  z.anim += 0.08;
}

function scream(z) {
  z.screamed = true; z.state = 'scream'; z.anim = 0;
  sfx('scream');
  bark(anyone(), 'scream');
  shake(4);
  light(z.x, z.y - 10, 170, 'rgba(210,220,255,', 40);
  float(z.x, z.y - 30, 'GRITO', '#e8e2c8');
  burst(z.x, z.y - 12, 18, { speed: 2.6, color: '#d8dce8', type: 'spark', lifeMul: 0.5, grav: 0, size: 1 });
  for (const o of S.zombies) if (dist(o.x, o.y, z.x, z.y) < 360) o.alert = true;
  // refuerzos
  for (let i = 0; i < 3; i++) { const sp = pickSpawnPoint(); if (sp) { const r = spawnZombie('runner', sp.x, sp.y); r.alert = true; } }
}

// nube tóxica del hinchado: daña a quien quede adentro (también a zombies)
function gasCloud(x, y) {
  (S.gas ||= []).push({ x, y, t: 260 });
  burst(x, y, 30, { speed: 2.4, color: '#8fcf4a', type: 'smoke', lifeMul: 2, grav: -0.02, lift: 1.2, size: 3 });
  sfx('explosion', 0.45);
  shake(5);
}
function updateGas() {
  if (!S.gas?.length) return;
  for (const g of S.gas) {
    g.t--;
    if (g.t % 6 === 0) burst(g.x + rand(-22, 22), g.y + rand(-12, 12), 2, { speed: 0.3, color: Math.random() < 0.5 ? '#7fbf3a' : '#a6d85a', type: 'smoke', lifeMul: 2.4, grav: -0.015, lift: 0.4, size: 3 });
    if (g.t % 30 !== 0) continue;
    for (const p of S.players) if (!p.dead && dist(p.x, p.y, g.x, g.y) < 36) hurtPlayer(p, Math.round(6 * D().zDmg), Math.atan2(p.y - g.y, p.x - g.x), true);
    for (const o of S.zombies) if (!o.T.bloater && o.state !== 'dying' && o.state !== 'dead' && dist(o.x, o.y, g.x, g.y) < 36) damageZombie(o, 8, 0, 0, null);
  }
  S.gas = S.gas.filter((g) => g.t > 0);
}

// la nube se dibuja encima de la oscuridad: un gas que brilla apenas, verdoso
export function drawGas() {
  for (const g of S.gas || []) {
    if (!onScreen(g.x, g.y, 50)) continue;
    const a = Math.min(1, g.t / 60) * 0.32, X = sx(g.x), Y = sy(g.y);
    for (let i = 0; i < 3; i++) {
      const ox = Math.sin(S.t * 0.03 + i * 2.1) * 8, oy = Math.cos(S.t * 0.025 + i * 1.7) * 4;
      const grd = ctx.createRadialGradient(X + ox, Y + oy, 0, X + ox, Y + oy, 30);
      grd.addColorStop(0, `rgba(140,210,70,${a})`); grd.addColorStop(1, 'rgba(140,210,70,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(X + ox, Y + oy, 34, 20, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function zombieDrawables() {
  const out = [];
  for (const z of S.zombies) {
    if (!onScreen(z.x, z.y, 40)) continue;
    out.push({ y: z.state === 'dead' || z.state === 'dying' ? z.y - 6 : z.y, draw: () => drawZombie(z) });
  }
  for (const pr of S.projectiles) {
    if (onScreen(pr.x, pr.y)) out.push({ y: pr.y + 12, draw: () => frame('fx/axe_spin', pr.spin, pr.x, pr.y, { anchor: 'center' }) });
  }
  return out;
}

function drawZombie(z) {
  const t = z.T.sprite, F = ZOMBIE_FRAMES[t];
  const filt = z.hitFlash > 0 ? 'brightness(3) grayscale(1)' : z.T.filter;
  const alpha = z.state === 'dead' ? Math.min(1, z.corpse / 90) : 1;
  if (z.state !== 'dead' && z.state !== 'dying') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx(z.x), sy(z.y), z.r * 1.1, 2.5 * z.scale, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (z.state === 'dying' || z.state === 'dead') {
    frame(`zombies/${t}_death_${z.deathDir}`, Math.min(z.deathT, F.death - 1), z.x, z.y, { scale: z.scale, filter: filt, alpha });
  } else if (z.state === 'attack' || z.state === 'scream') {
    frame(`zombies/${t}_attack_${z.dir}`, Math.min(z.anim, F.attack - 1), z.x, z.y, { scale: z.scale, filter: filt });
  } else if (z.state === 'throw') {
    frame(`zombies/thrower_attack_${z.dir}`, Math.min(z.anim, F.attack - 1), z.x, z.y, { scale: z.scale, filter: filt });
  } else {
    frame(`zombies/${t}_walk_${z.dir}`, z.anim, z.x, z.y, { scale: z.scale, filter: filt });
  }
  if (z.T.screamer && !z.screamed && z.state === 'walk' && Math.floor(S.t / 15) % 2) {
    ctx.fillStyle = '#e8e2c8'; ctx.fillRect(sx(z.x), sy(z.y - 26), 1, 3); ctx.fillRect(sx(z.x), sy(z.y - 22), 1, 1);
  }
  // barra de vida (solo si está herido y no es el jefe: el jefe tiene la suya en el HUD)
  if (!z.T.boss && z.hp < z.maxHp && z.state !== 'dying' && z.state !== 'dead') {
    const w = 14, y = z.y - 20 * z.scale - 4;
    ctx.fillStyle = '#000'; ctx.fillRect(sx(z.x - w / 2), sy(y), w, 2);
    ctx.fillStyle = '#c23b2e'; ctx.fillRect(sx(z.x - w / 2), sy(y), Math.max(0, w * z.hp / z.maxHp), 2);
  }
}

// ---------------- oleadas ----------------
// Aparecen en puntos del borde (o en los spawns del nivel), fuera de pantalla y lejos del jugador.
export function pickSpawnPoint() {
  const W = S.world, L = S.level;
  const ps = S.players;
  for (let i = 0; i < 40; i++) {
    let x, y;
    if (L.spawns && Math.random() < 0.7) { const s = pick(L.spawns); x = s.x + rand(-20, 20); y = s.y + rand(-20, 20); }
    else {
      const side = Math.floor(Math.random() * 4);
      x = side === 0 ? 12 : side === 1 ? W.W - 12 : rand(20, W.W - 20);
      y = side === 2 ? 20 : side === 3 ? W.H - 10 : rand(20, W.H - 20);
    }
    if (!cellFree(x, y)) continue;
    if (ps.some((p) => dist(x, y, p.x, p.y) < 200 || (Math.abs(x - p.x) < 210 && Math.abs(y - p.y) < 130))) continue;
    return { x, y };
  }
  return null;
}
