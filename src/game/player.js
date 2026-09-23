import { frame, ctx, sx, sy } from '../core/render.js';
import { S, dist, bus, net } from '../core/state.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { sfx } from '../core/audio.js';
import { moveEntity } from './world.js';
import { blood, shake, burst, float } from './fx.js';
import { WEAPONS, ORDER, tryFire, startReload, finishReload, drawHeldWeapon, dust } from './weapons.js';

// colores de los jugadores 2-4 (el 1 usa el sprite original)
export const TINTS = [null, 'hue-rotate(110deg) saturate(1.3)', 'hue-rotate(200deg) saturate(1.4)', 'hue-rotate(300deg) saturate(1.3)'];
export const TINT_CSS = ['#e9e6df', '#7cff8f', '#7cc4ff', '#ff8fd8'];

export function createPlayer(L, control, idx = 0, name = '') {
  const lo = L.loadout;
  const inv = {
    weapons: [...lo.weapons], cur: lo.weapons.includes('pistol') ? 'pistol' : lo.weapons[0],
    mag: {}, ammo: { pistol: 0, shotgun: 0, rifle: 0, ...lo.ammo },
    medkit: lo.medkit || 0, bandage: lo.bandage || 0,
  };
  for (const w of inv.weapons) inv.mag[w] = WEAPONS[w].mag || 0;
  return {
    idx, name, local: !control.remote, reviveT: 0,
    x: L.player.x + [0, 14, -14, 0][idx], y: L.player.y + [0, 6, 6, 14][idx], r: 5, hp: 100, maxHp: 100, speed: 1.3,
    aim: -Math.PI / 2, dir: 'up', walk: 0, moving: false, control, inv,
    coins: lo.coins || 0, lightOn: true,
    fireCd: 0, reloadT: 0, swingT: 0, recoil: 0, muzzleT: 0,
    dashT: 0, dashCd: 0, dvx: 0, dvy: 0, invuln: 0, hurtFlash: 0,
    kx: 0, ky: 0, dead: false, deadT: 0, lowHpBeat: 0,
  };
}

function dirFromAim(a) {
  const c = Math.cos(a), s = Math.sin(a);
  if (Math.abs(c) > Math.abs(s) * 0.9) return c >= 0 ? 'side' : 'sideleft';
  return s >= 0 ? 'down' : 'up';
}

export function hurtPlayer(p, dmg, angle, ignoreInvuln = false) {
  if (p.dead || (!ignoreInvuln && (p.invuln > 0 || p.dashT > 0))) return;
  p.dmgTaken = (p.dmgTaken || 0) + Math.min(dmg, p.hp);
  p.hp -= dmg;
  p.invuln = 45; p.hurtFlash = 1;
  p.kx += Math.cos(angle) * 3.5; p.ky += Math.sin(angle) * 3.5;
  blood(p.x, p.y - 8, angle, 10);
  shake(6);
  sfx('hurt');
  bus.emit('hurt', p);
  if (p.hp <= 0) {
    p.hp = 0; p.dead = true; p.deadT = 0;
    p.deathDir = Math.cos(angle) >= 0 ? 'side' : 'sideleft';
    if (!net.role) S.timeScale = 0.35;
    bus.emit('playerDown', p);
  }
}

export function heal(p) {
  const inv = p.inv;
  if (p.dead || p.hp >= p.maxHp) return;
  let amount = 0;
  if (inv.medkit > 0 && p.maxHp - p.hp > 25) { inv.medkit--; amount = 55; }
  else if (inv.bandage > 0) { inv.bandage--; amount = 22; }
  else if (inv.medkit > 0) { inv.medkit--; amount = 55; }
  if (!amount) { if (p.local) bus.emit('toast', 'SIN VENDAS NI BOTIQUINES'); return; }
  p.hp = Math.min(p.maxHp, p.hp + amount);
  burst(p.x, p.y - 8, 12, { color: '#8dff8d', type: 'spark', lifeMul: 0.8, grav: -0.03, speed: 0.8 });
  float(p.x, p.y - 20, `+${amount}`, '#9dff9d');
  sfx('heal');
}

function switchTo(p, w) {
  if (!p.inv.weapons.includes(w) || p.inv.cur === w) return;
  p.inv.cur = w; p.reloadT = 0; p.fireCd = Math.max(p.fireCd, 10); p.swingT = 0;
  sfx('uiClick', 0.6);
  bus.emit('weaponChanged', p);
}

export function updatePlayer(p) {
  const c = p.control;
  if (p.hurtFlash > 0) p.hurtFlash = Math.max(0, p.hurtFlash - 0.03);
  if (p.dead) { p.deadT++; return; }
  if (p.invuln > 0) p.invuln--;
  if (p.fireCd > 0) p.fireCd--;
  if (p.swingT > 0) p.swingT--;
  if (p.muzzleT > 0) p.muzzleT--;
  if (p.dashCd > 0) p.dashCd--;
  p.recoil *= 0.7;

  // apuntar
  if (c.aim != null) p.aim = c.aim;
  else { const m = c.mouse; p.aim = Math.atan2(m.y + S.cam.y - (p.y - 7), m.x + S.cam.x - p.x); }
  p.dir = dirFromAim(p.aim);

  // mover / esquivar
  let mx = c.moveX, my = c.moveY;
  const ml = Math.hypot(mx, my);
  if (ml) { mx /= ml; my /= ml; }
  if (c.pressed('Space') && p.dashCd <= 0) {
    const a = ml ? Math.atan2(my, mx) : p.aim;
    p.dashT = 11; p.dashCd = 55; p.dvx = Math.cos(a) * 3.6; p.dvy = Math.sin(a) * 3.6;
    sfx('dash');
  }
  if (p.dashT > 0) {
    p.dashT--;
    moveEntity(p, p.dvx, p.dvy);
    if (p.dashT % 3 === 0) dust(p.x, p.y);
    p.walk += 0.4;
  } else if (ml) {
    const slow = p.reloadT > 0 ? 0.8 : 1;
    moveEntity(p, mx * p.speed * slow, my * p.speed * slow);
    p.walk += 0.18;
    p.moving = true;
  } else p.moving = false;
  if (Math.abs(p.kx) + Math.abs(p.ky) > 0.05) { moveEntity(p, p.kx, p.ky); p.kx *= 0.75; p.ky *= 0.75; }

  // armas
  const wheel = c.takeWheel();
  if (wheel) {
    const owned = p.inv.weapons, i = owned.indexOf(p.inv.cur);
    switchTo(p, owned[(i + wheel + owned.length) % owned.length]);
  }
  ORDER.forEach((w, i) => { if (c.pressed(`Digit${i + 1}`)) switchTo(p, w); });
  if (c.pressed('KeyR')) startReload(p);
  if (p.reloadT > 0 && --p.reloadT === 0) finishReload(p);
  if (c.fire) tryFire(p);

  if (c.pressed('KeyQ')) heal(p);
  if (c.pressed('KeyF')) { p.lightOn = !p.lightOn; sfx('uiClick', 0.5); }

  // latido con poca vida
  if (p.local && p.hp < 30 && --p.lowHpBeat <= 0) { sfx('heartbeat', 0.8); p.lowHpBeat = 70; }
}

export function playerDrawables() {
  return S.players.filter((p) => !p.boarded).map((p) => ({ y: p.dead ? p.y - 4 : p.y, draw: () => drawPlayer(p) }));
}

export function drawPlayer(p) {
  const tint = TINTS[p.idx || 0];
  if (p.dead) {
    frame(`char/death_${p.deathDir}`, Math.min(5, p.deadT / 6), p.x, p.y, { filter: tint || undefined });
    if (S.players.length > 1) drawReviveBar(p);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y), 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  if (S.players.length > 1) {
    ctx.strokeStyle = TINT_CSS[p.idx || 0]; ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y), 7, 3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const blink = p.invuln > 0 && Math.floor(S.t / 3) % 2 === 0;
  const opt = { filter: blink ? 'brightness(2.2)' : tint || undefined, alpha: p.dashT > 0 ? 0.75 : 1 };
  const body = p.moving || p.dashT > 0 ? `char/run_${p.dir}` : `char/idle_${p.dir}`;
  const f = p.moving || p.dashT > 0 ? p.walk : S.t / 9;
  const behind = p.dir === 'up';
  if (behind) drawHeldWeapon(p);
  frame(body, f, p.x, p.y, opt);
  if (!behind) drawHeldWeapon(p);
  // nombre sobre la cabeza en multijugador
  if (S.players.length > 1 && p.name) {
    const n = p.name.toUpperCase(), w = textWidth(n);
    pixelText(ctx, n, sx(p.x) - Math.floor(w / 2) + 1, sy(p.y) - 29, '#000');
    pixelText(ctx, n, sx(p.x) - Math.floor(w / 2), sy(p.y) - 30, TINT_CSS[p.idx || 0]);
  }
}

function drawReviveBar(p) {
  const X = sx(p.x), Y = sy(p.y) - 22;
  const t = 'CAIDO', w = textWidth(t);
  if (Math.floor(S.t / 20) % 2) pixelText(ctx, t, X - Math.floor(w / 2), Y - 8, '#e8483f');
  ctx.fillStyle = '#000'; ctx.fillRect(X - 12, Y, 24, 3);
  ctx.fillStyle = '#7cff8f'; ctx.fillRect(X - 12, Y, Math.round(24 * (p.reviveT || 0) / REVIVE_T), 3);
}

// Revivir: un compañero vivo parado al lado mantiene E
export const REVIVE_T = 150;
export function updateRevives() {
  if (S.players.length < 2) return;
  for (const p of S.players) {
    if (!p.dead || p.boarded) continue;
    const helper = S.players.find((o) => !o.dead && o !== p && dist(o.x, o.y, p.x, p.y) < 20 && o.control.held?.('KeyE'));
    if (helper) {
      p.reviveT = (p.reviveT || 0) + 1;
      if (p.reviveT >= REVIVE_T) {
        p.dead = false; p.hp = 35; p.invuln = 120; p.reviveT = 0; p.deadT = 0;
        burst(p.x, p.y - 8, 16, { color: '#8dff8d', type: 'spark', lifeMul: 0.8, grav: -0.03, speed: 0.8 });
        sfx('heal');
        bus.emit('teamToast', `${(p.name || 'JUGADOR').toUpperCase()} VOLVIO`);
      }
    } else p.reviveT = Math.max(0, (p.reviveT || 0) - 2);
  }
}

export function nearestPlayerTo(x, y) {
  let best = null, bd = 1e9;
  for (const p of S.players) { const d = dist(p.x, p.y, x, y); if (!p.dead && d < bd) { bd = d; best = p; } }
  return best;
}
