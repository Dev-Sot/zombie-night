import { frame, ctx, sx, sy } from '../core/render.js';
import { S, dist, bus } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { moveEntity } from './world.js';
import { blood, shake, burst, float } from './fx.js';
import { WEAPONS, ORDER, tryFire, startReload, finishReload, drawHeldWeapon, dust } from './weapons.js';

export function createPlayer(L, control) {
  const lo = L.loadout;
  const inv = {
    weapons: [...lo.weapons], cur: lo.weapons.includes('pistol') ? 'pistol' : lo.weapons[0],
    mag: {}, ammo: { pistol: 0, shotgun: 0, rifle: 0, ...lo.ammo },
    medkit: lo.medkit || 0, bandage: lo.bandage || 0,
  };
  for (const w of inv.weapons) inv.mag[w] = WEAPONS[w].mag || 0;
  return {
    x: L.player.x, y: L.player.y, r: 5, hp: 100, maxHp: 100, speed: 1.3,
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
    S.timeScale = 0.35;
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
  if (!amount) { bus.emit('toast', 'SIN VENDAS NI BOTIQUINES'); return; }
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
  const m = c.mouse;
  p.aim = Math.atan2(m.y + S.cam.y - (p.y - 7), m.x + S.cam.x - p.x);
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
  if (p.hp < 30 && --p.lowHpBeat <= 0) { sfx('heartbeat', 0.8); p.lowHpBeat = 70; }
}

export function playerDrawables() {
  return S.players.filter((p) => !p.boarded).map((p) => ({ y: p.dead ? p.y - 4 : p.y, draw: () => drawPlayer(p) }));
}

function drawPlayer(p) {
  if (p.dead) {
    frame(`char/death_${p.deathDir}`, Math.min(5, p.deadT / 6), p.x, p.y);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y), 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const blink = p.invuln > 0 && Math.floor(S.t / 3) % 2 === 0;
  const opt = { filter: blink ? 'brightness(2.2)' : undefined, alpha: p.dashT > 0 ? 0.75 : 1 };
  const body = p.moving || p.dashT > 0 ? `char/run_${p.dir}` : `char/idle_${p.dir}`;
  const f = p.moving || p.dashT > 0 ? p.walk : S.t / 9;
  const behind = p.dir === 'up';
  if (behind) drawHeldWeapon(p);
  frame(body, f, p.x, p.y, opt);
  if (!behind) drawHeldWeapon(p);
}

export function nearestPlayerTo(x, y) {
  let best = null, bd = 1e9;
  for (const p of S.players) { const d = dist(p.x, p.y, x, y); if (!p.dead && d < bd) { bd = d; best = p; } }
  return best;
}
