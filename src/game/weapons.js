import { ctx, sx, sy, frame } from '../core/render.js';
import { S, rand, dist, net } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { bulletSolidAt } from './world.js';
import { blood, sparks, casing, light, shake, burst } from './fx.js';
import { damageZombie } from './zombies.js';
import { hitProp } from './props.js';
import { bark } from './barks.js';

// sprite: arte de costado apuntando a la derecha; grip = punto de la mano
// (fracción del sprite), ang0 = hacia dónde "apunta" el sprite sin rotar.
export const WEAPONS = {
  bat: { name: 'Bate', melee: true, sprite: 'weapons/bat', icon: 'bat', dmg: 36, cd: 26, range: 24, arc: 1.5, knock: 5, grip: [0.8, 0.85], ang0: -2.35 },
  pistol: { name: 'Pistola', sprite: 'weapons/pistol', icon: 'pistol', ammo: 'pistol', mag: 12, dmg: 22, cd: 12, spread: 0.05, pellets: 1, speed: 8, reload: 55, knock: 1.4, recoil: 2, shake: 1.5, sfx: 'pistol', grip: [0.2, 0.7], ang0: 0 },
  shotgun: { name: 'Escopeta', sprite: 'weapons/shotgun', icon: 'shotgun', ammo: 'shotgun', mag: 6, dmg: 14, cd: 34, spread: 0.34, pellets: 7, speed: 7, reload: 80, knock: 3.4, recoil: 4, shake: 4, sfx: 'shotgun', grip: [0.25, 0.6], ang0: 0 },
  axe: { name: 'Hacha', melee: true, sprite: 'weapons/axe', icon: 'axe', dmg: 64, cd: 40, range: 27, arc: 1.8, knock: 7, grip: [0.12, 0.2], ang0: 0.54, heavy: true },
  rifle: { name: 'Rifle', sprite: 'weapons/rifle', icon: 'rifle', ammo: 'rifle', mag: 30, dmg: 16, cd: 6, spread: 0.07, pellets: 1, speed: 9.5, reload: 90, auto: true, knock: 1.1, recoil: 1.5, shake: 1.2, sfx: 'rifle', grip: [0.3, 0.65], ang0: 0 },
};
export const ORDER = ['bat', 'pistol', 'shotgun', 'rifle', 'axe'];

// posición de la mano/boca del arma a partir del ángulo de apuntado
export function weaponPose(p) {
  const a = p.aim, cx = p.x, cy = p.y - 7;
  const k = p.recoil * -1;
  return { hx: cx + Math.cos(a) * (4 + k), hy: cy + Math.sin(a) * (4 + k) };
}

export function muzzlePos(p) {
  const w = WEAPONS[p.inv.cur], { hx, hy } = weaponPose(p);
  const len = { pistol: 7, shotgun: 12, rifle: 13 }[p.inv.cur] || 8;
  return { x: hx + Math.cos(p.aim) * len, y: hy + Math.sin(p.aim) * len - (w.melee ? 0 : 1) };
}

export function tryFire(p) {
  const w = WEAPONS[p.inv.cur];
  if (p.fireCd > 0 || p.reloadT > 0 || p.dashT > 0) return;
  if (w.melee) return swing(p, w);
  const inv = p.inv;
  if (inv.mag[p.inv.cur] <= 0) {
    if (inv.ammo[w.ammo] > 0) startReload(p);
    else { sfx('empty'); p.fireCd = 20; }
    return;
  }
  inv.mag[p.inv.cur]--;
  p.fireCd = w.cd;
  const m = muzzlePos(p);
  for (let i = 0; i < w.pellets; i++) {
    const spread = w.spread * (p.mods?.spread || 1);
    const a = p.aim + rand(-spread, spread) * (w.pellets > 1 ? 1 : 0.5);
    const sp = w.speed * rand(0.9, 1.1);
    S.bullets.push({ x: m.x, y: m.y, px: m.x, py: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: w.dmg * (p.mods?.gunDmg || 1), knock: w.knock, life: 48, owner: p });
    if (net.rec) net.rec('shot', [m.x, m.y, Math.cos(a) * sp, Math.sin(a) * sp]);
  }
  S.shots++;
  p.recoil = w.recoil;
  p.muzzleT = 4;
  casing(p.x, p.y - 8, p.aim);
  light(m.x, m.y, 60, 'rgba(255,190,110,', 5);
  shake(w.shake);
  sfx(w.sfx);
  if (p.inv.cur === 'shotgun') sfx('pump', 0.8, 0.32);
  // el ruido atrae a los zombies cercanos
  for (const z of S.zombies) if (!z.alert && dist(z.x, z.y, p.x, p.y) < 260) z.alert = true;
  if (inv.mag[p.inv.cur] === 0 && inv.ammo[w.ammo] > 0) setTimeout(() => startReload(p), 200);
}

function swing(p, w) {
  p.fireCd = w.cd;
  p.swingT = 14;
  sfx('swing', w.heavy ? 1.3 : 1);
  let hit = false;
  for (const z of S.zombies) {
    if (z.state === 'dying' || z.state === 'dead') continue;
    const d = dist(z.x, z.y, p.x, p.y);
    if (d > w.range + z.r) continue;
    let da = Math.atan2(z.y - p.y, z.x - p.x) - p.aim;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > w.arc / 2) continue;
    damageZombie(z, w.dmg * (p.mods?.melee || 1), p.aim, w.knock, p);
    hit = true;
  }
  for (const pr of S.world.props) {
    if (!pr.def?.explosive) continue;
    if (dist(pr.x + pr.w / 2, pr.y + pr.h - 4, p.x, p.y) < w.range + 6) { hitProp(pr, w.dmg, p); hit = true; }
  }
  if (hit) { sfx('bat', w.heavy ? 1.3 : 1); shake(w.heavy ? 5 : 3); S.hitstop = w.heavy ? 4 : 2; }
}

export function startReload(p) {
  const w = WEAPONS[p.inv.cur];
  if (w.melee || p.reloadT > 0) return;
  if (p.inv.mag[p.inv.cur] >= w.mag || p.inv.ammo[w.ammo] <= 0) return;
  p.reloadT = Math.round(w.reload * (p.mods?.reload || 1));
  bark(p, 'reload');
  sfx(p.inv.cur === 'rifle' ? 'reloadRifle' : 'reload');
}

export function finishReload(p) {
  const w = WEAPONS[p.inv.cur], inv = p.inv;
  const take = Math.min(w.mag - inv.mag[inv.cur], inv.ammo[w.ammo]);
  inv.mag[inv.cur] += take; inv.ammo[w.ammo] -= take;
}

export function updateBullets() {
  for (const b of S.bullets) {
    b.px = b.x; b.py = b.y;
    const steps = Math.ceil(Math.hypot(b.vx, b.vy) / 3);
    for (let s = 0; s < steps && b.life > 0; s++) {
      b.x += b.vx / steps; b.y += b.vy / steps;
      const solid = bulletSolidAt(b.x, b.y);
      if (solid) {
        if (b.ghost) { sparks(b.x, b.y, Math.atan2(b.vy, b.vx)); b.life = 0; break; }
        if (solid.ref?.def?.explosive) hitProp(solid.ref, b.dmg, b.owner);
        else { sparks(b.x, b.y, Math.atan2(b.vy, b.vx)); if (solid.ref?.kind !== 'building') solid.ref.hitFlash = 3; }
        b.life = 0; break;
      }
      for (const z of S.zombies) {
        if (z.state === 'dying' || z.state === 'dead') continue;
        const zy = z.y - 8 * (z.scale || 1);
        if (Math.abs(b.x - z.x) < z.r + 2 && Math.abs(b.y - zy) < z.r + 7 * (z.scale || 1)) {
          if (!b.ghost) { S.hits++; damageZombie(z, b.dmg, Math.atan2(b.vy, b.vx), b.knock, b.owner); }
          b.life = 0; break;
        }
      }
    }
    b.life--;
    if (b.x < -20 || b.y < -20 || b.x > S.world.W + 20 || b.y > S.world.H + 20) b.life = 0;
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
  for (const p of S.world.props) if (p.hitFlash > 0) p.hitFlash--;
}

// balas "fantasma" en el cliente: solo se ven, el daño lo calcula el anfitrión
export function ghostShot(x, y, vx, vy) {
  S.bullets.push({ x, y, px: x, py: y, vx, vy, life: 48, ghost: true });
  light(x, y, 60, 'rgba(255,190,110,', 5);
}

export function drawBullets() {
  ctx.save();
  ctx.lineCap = 'round';
  for (const b of S.bullets) {
    ctx.strokeStyle = 'rgba(255,220,140,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx(b.px - b.vx), sy(b.py - b.vy)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke();
    ctx.strokeStyle = '#fff2c4'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx(b.px), sy(b.py)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke();
  }
  ctx.restore();
}

// Arma en la mano: rota con la mira, se da vuelta al apuntar a la izquierda
// (para que no quede cabeza abajo) y el bate hace un arco al golpear.
export function drawHeldWeapon(p) {
  const w = WEAPONS[p.inv.cur];
  const { hx, hy } = weaponPose(p);
  const left = Math.cos(p.aim) < 0;
  if (w.melee) {
    let a = p.aim - 1.1;
    if (p.swingT > 0) a = p.aim - 1.3 + (1 - p.swingT / 14) * 2.6;
    const rot = a - w.ang0;
    frame(w.sprite, 0, hx, hy, { rot, ax: w.grip[0], ay: w.grip[1] });
    if (p.swingT > 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y - 7), w.range - 4, p.aim - 0.8, p.aim + 0.8); ctx.stroke();
    }
  } else {
    frame(w.sprite, 0, hx, hy, { rot: p.aim, flipY: left, ax: w.grip[0], ay: w.grip[1] });
    if (p.muzzleT > 0) {
      const m = muzzlePos(p);
      frame('fx/muzzle', 3 - p.muzzleT * 0.75, m.x, m.y, { rot: p.aim, ax: 0, ay: 0.5 });
    }
  }
  // mano
  ctx.fillStyle = '#e0a57a';
  ctx.fillRect(sx(hx) - 1, sy(hy) - 1, 2, 2);
}

export function dust(x, y) { burst(x, y, 3, { speed: 0.6, color: '#8a7a68', type: 'smoke', lifeMul: 0.8, grav: -0.01, lift: 0.3, size: 1 }); }
export { blood };
