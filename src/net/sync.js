// Snapshots del anfitrión -> clientes. Arrays compactos (no objetos) para
// que viajen livianos; el cliente interpola posiciones entre snapshots.
import { S, bus } from '../core/state.js';
import { sfx, playMusic } from '../core/audio.js';
import { ZTYPES } from '../game/zombies.js';
import { FX } from '../game/fx.js';
import { ghostShot } from '../game/weapons.js';
import { removeProp } from '../game/world.js';

const DIRS = ['down', 'up', 'side', 'sideleft'];
const ZSTATES = ['walk', 'attack', 'throw', 'dying', 'dead'];
const ZT = Object.keys(ZTYPES);
const KINDS = ['ammo', 'bandage', 'medkit', 'weapon', 'item'];
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

// ---------------- anfitrión ----------------
export function encodeSnapshot(events) {
  const O = S.objective;
  return {
    t: 's',
    p: S.players.map((p) => [
      r1(p.x), r1(p.y), r2(p.aim), DIRS.indexOf(p.dir), p.moving ? 1 : 0, r1(p.walk), Math.ceil(p.hp), p.dead ? 1 : 0, p.deadT,
      p.deathDir === 'sideleft' ? 1 : 0, Math.min(p.invuln, 99), r2(p.hurtFlash), p.dashT, p.reloadT, p.swingT, p.muzzleT, r1(p.recoil),
      p.lightOn ? 1 : 0, p.coins, p.reviveT || 0, p.boarded ? 1 : 0, p.inv, p.dmgTaken || 0,
    ]),
    z: S.zombies.map((z) => [
      z.id, ZT.indexOf(z.type), r1(z.x), r1(z.y), ZSTATES.indexOf(z.state), DIRS.indexOf(z.dir), r1(z.anim), Math.ceil(z.hp),
      z.hitFlash, r2(z.deathT), z.deathDir === 'sideleft' ? 1 : 0, z.corpse || 0,
    ]),
    a: S.projectiles.map((pr) => [r1(pr.x), r1(pr.y), r1(pr.spin)]),
    k: S.pickups.map((p) => [KINDS.indexOf(p.kind), r1(p.x), r1(p.y), p.item || p.weapon || '', p.life < 180 ? 1 : 0]),
    o: O ? [O.i, O.count, O.total, O.done || 0, O.inside ? 1 : 0, O.markers.map((m) => m.state)] : null,
    w: [S.wave, S.kills, S.shots, S.hits],
    h: S.heli ? [r1(S.heli.x), r1(S.heli.y), r1(S.heli.t), S.heli.leaving ? 1 : 0] : null,
    l: S.world.lamps.map((l) => (l.lit ? 1 : 0)).join(''),
    b: S.boss ? S.boss.id : 0,
    v: S.surv ? [S.surv.wave, S.surv.left, S.surv.total, S.surv.breather] : null,
    e: events,
  };
}

// ---------------- cliente ----------------
function makeZombie(id, type) {
  const T = ZTYPES[type];
  return { id, type, T, r: T.r, scale: T.scale || 1, maxHp: T.hp * (S.diff?.zHp || 1), kx: 0, ky: 0, puppet: true };
}

export function applySnapshot(s, me) {
  // jugadores
  s.p.forEach((a, i) => {
    const p = S.players[i];
    if (!p) return;
    const [x, y, aim, dir, moving, walk, hp, dead, deadT, dd, invuln, hurt, dashT, reloadT, swingT, muzzleT, recoil, lightOn, coins, reviveT, boarded, inv, dmg] = a;
    p.sx = x; p.sy = y;
    if (i !== me) { p.aim = aim; p.dir = DIRS[dir]; p.moving = !!moving; p.walk = walk; }
    if (p.x == null || i !== me) { if (p.x == null || Math.hypot(p.x - x, p.y - y) > 40) { p.x = x; p.y = y; } }
    if (hp < p.hp && i === me) p.hurtFlash = 1;
    Object.assign(p, {
      hp, dead: !!dead, deadT, deathDir: dd ? 'sideleft' : 'side', invuln, dashT, reloadT, swingT, muzzleT, recoil,
      lightOn: !!lightOn, coins, reviveT, boarded: !!boarded, inv, dmgTaken: dmg,
    });
    if (i !== me) p.hurtFlash = hurt;
  });
  // zombies
  const byId = new Map(S.zombies.map((z) => [z.id, z]));
  S.zombies = s.z.map((a) => {
    const [id, t, x, y, st, dir, anim, hp, hit, deathT, dd, corpse] = a;
    let z = byId.get(id);
    if (!z) { z = makeZombie(id, ZT[t]); z.x = x; z.y = y; }
    Object.assign(z, { tx: x, ty: y, state: ZSTATES[st], dir: DIRS[dir], anim, hp, hitFlash: hit, deathT, deathDir: dd ? 'sideleft' : 'side', corpse });
    return z;
  });
  S.boss = s.b ? S.zombies.find((z) => z.id === s.b) || null : null;
  S.projectiles = s.a.map(([x, y, spin]) => ({ x, y, spin }));
  S.pickups = s.k.map(([k, x, y, what, low], i) => {
    const kind = KINDS[k];
    return { kind, x, y, item: kind === 'item' ? what : undefined, weapon: kind === 'weapon' ? what : undefined, bob: i * 1.7, life: low ? 100 : 1e9 };
  });
  if (s.o && S.objective) {
    const O = S.objective, [i, count, total, done, inside, marks] = s.o;
    O.i = i; O.step = O.steps[i] || null; O.count = count; O.total = total; O.done = done || []; O.inside = !!inside;
    marks.forEach((st, k) => { if (O.markers[k]) O.markers[k].state = st; });
  }
  [S.wave, S.kills, S.shots, S.hits] = s.w;
  if (s.v && S.surv) [S.surv.wave, S.surv.left, S.surv.total, S.surv.breather] = s.v;
  if (s.h) {
    const [x, y, t, leaving] = s.h;
    S.heli = S.heli || { x, y };
    Object.assign(S.heli, { tx: x, ty: y, t, leaving: !!leaving });
  } else S.heli = null;
  [...s.l].forEach((c, i) => { if (S.world.lamps[i]) S.world.lamps[i].lit = c === '1'; });
  for (const [name, args] of s.e) replay(name, args);
}

function replay(name, args) {
  if (name === 'sfx') return sfx(args[0], args[1]);
  if (name === 'music') return playMusic(args[0]);
  if (name === 'shot') return ghostShot(...args);
  if (name === 'bus') return bus.emit(args[0], args[1]);
  if (name === 'propGone') { const P = S.world.props.find((p) => p.id === args[0]); if (P) removeProp(S.world, P); return; }
  FX[name]?.(...args);
}

// Interpolación suave entre snapshots (corre cada paso en el cliente)
export function interpolate(me) {
  for (const z of S.zombies) {
    if (z.tx == null) continue;
    z.x += (z.tx - z.x) * 0.3; z.y += (z.ty - z.y) * 0.3;
  }
  S.players.forEach((p, i) => {
    if (i === me || p.sx == null) return;
    p.x += (p.sx - p.x) * 0.3; p.y += (p.sy - p.y) * 0.3;
  });
  if (S.heli?.tx != null) { S.heli.x += (S.heli.tx - S.heli.x) * 0.2; S.heli.y += (S.heli.ty - S.heli.y) * 0.2; }
}
