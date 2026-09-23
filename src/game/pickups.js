import { frame, ctx, sx, sy, onScreen } from '../core/render.js';
import { S, rand, dist, bus } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { burst, float } from './fx.js';
import { WEAPONS, ORDER } from './weapons.js';

// kind: ammo | bandage | medkit | weapon | item (objetivo)
const SPRITES = { ammo: 'pickups/ammo', bandage: 'pickups/bandage', medkit: 'pickups/medkit', fuel: 'pickups/fuel', radio: 'pickups/radio' };
const AMMO_GIVE = { pistol: 12, shotgun: 6, rifle: 30 };

export function addPickup(kind, x, y, extra = {}) {
  const p = { kind, x, y, bob: rand(0, 6), life: extra.persist ? Infinity : 1800, ...extra };
  S.pickups.push(p);
  return p;
}

export function dropLoot(x, y, chance) {
  if (Math.random() > chance) return;
  const r = Math.random();
  addPickup(r < 0.55 ? 'ammo' : r < 0.85 ? 'bandage' : 'medkit', x + rand(-4, 4), y + rand(-4, 4));
}

function give(pl, p) {
  const inv = pl.inv;
  if (p.kind === 'ammo') {
    const guns = inv.weapons.filter((w) => !WEAPONS[w].melee);
    if (!guns.length) return false;
    const w = guns.includes(inv.cur) && !WEAPONS[inv.cur].melee && Math.random() < 0.6 ? inv.cur : guns[Math.floor(Math.random() * guns.length)];
    const type = WEAPONS[w].ammo;
    inv.ammo[type] += AMMO_GIVE[type];
    float(p.x, p.y - 10, `+${AMMO_GIVE[type]} ${WEAPONS[w].name.toUpperCase()}`, '#e8e2c8');
    sfx('item');
  } else if (p.kind === 'bandage' || p.kind === 'medkit') {
    inv[p.kind]++;
    float(p.x, p.y - 10, p.kind === 'medkit' ? '+BOTIQUIN' : '+VENDA', '#9dff9d');
    sfx('item');
  } else if (p.kind === 'weapon') {
    if (!inv.weapons.includes(p.weapon)) {
      inv.weapons.push(p.weapon);
      inv.weapons.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
      inv.mag[p.weapon] = WEAPONS[p.weapon].mag || 0;
    }
    const w = WEAPONS[p.weapon];
    if (w.ammo) inv.ammo[w.ammo] += AMMO_GIVE[w.ammo] * 2;
    inv.cur = p.weapon;
    sfx('weapon');
    if (pl.local) bus.emit('toast', `${w.name.toUpperCase()} EQUIPADA  ·  TECLA ${ORDER.indexOf(p.weapon) + 1}`);
  } else if (p.kind === 'item') {
    sfx('pickupFuel');
    bus.emit('collect', p);
  }
  burst(p.x, p.y, 6, { color: '#fff3b0', type: 'spark', lifeMul: 0.5, speed: 1.2 });
  return true;
}

export function updatePickups() {
  for (const p of S.pickups) {
    p.life--;
    for (const pl of S.players) {
      if (pl.dead) continue;
      const d = dist(pl.x, pl.y - 4, p.x, p.y);
      if (p.kind !== 'item' && p.kind !== 'weapon' && d < 26) { p.x += (pl.x - p.x) * 0.12; p.y += (pl.y - 4 - p.y) * 0.12; }
      if (d < 9 && give(pl, p)) { p.taken = true; break; }
    }
  }
  S.pickups = S.pickups.filter((p) => !p.taken && p.life > 0);
}

export function pickupLights() {
  return S.pickups.filter((p) => p.kind === 'item' || p.kind === 'weapon').map((p) => ({ x: p.x, y: p.y, r: 34, a: 0.6, color: p.glow || 'rgba(255,200,90,' }));
}

export function drawPickups() {
  for (const p of S.pickups) {
    if (!onScreen(p.x, p.y)) continue;
    const bob = Math.sin(S.t * 0.08 + p.bob) * 1.5;
    if (p.life < 180 && Math.floor(S.t / 6) % 2) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y + 2), 5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    const key = p.kind === 'weapon' ? WEAPONS[p.weapon].sprite : p.kind === 'item' ? SPRITES[p.item] : SPRITES[p.kind];
    if (p.kind === 'item' || p.kind === 'weapon') {
      const r = 7 + Math.sin(S.t * 0.1) * 1.5;
      ctx.strokeStyle = 'rgba(255,207,107,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(sx(p.x), sy(p.y + 1), r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (p.item === 'flare') drawFlare(p, bob);
    else frame(key, 0, p.x, p.y + bob, { anchor: 'center' });
  }
}

function drawFlare(p, bob) {
  const X = sx(p.x), Y = sy(p.y + bob);
  ctx.fillStyle = '#b3261e'; ctx.fillRect(X - 1, Y - 4, 3, 7);
  ctx.fillStyle = '#e8e2c8'; ctx.fillRect(X - 1, Y - 5, 3, 1);
}
