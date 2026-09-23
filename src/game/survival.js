// Modo supervivencia: oleadas infinitas sobre los mapas de la historia.
// Cada oleada es más numerosa y más dura; cada 5 hay suministros y cada 10
// aparece el Gigante. Entre oleadas hay un respiro con bonus de monedas.
import { S, bus, rand, dist } from '../core/state.js';
import { sfx, playMusic } from '../core/audio.js';
import { spawnZombie, pickSpawnPoint } from './zombies.js';
import { addPickup } from './pickups.js';
import { cellFree } from './world.js';
import { float, light } from './fx.js';

export const BREATHER = 60 * 8;
const FIRST_DELAY = 60 * 6;
// [tipo, peso, desde qué oleada]
const MIX = [['walker', 6, 1], ['runner', 3, 2], ['thrower', 2, 3], ['screamer', 1, 4], ['brute', 1, 5], ['bloater', 1, 6], ['toxic', 2, 7]];

export const SURVIVAL_DESC = {
  1: 'El barrio bajo la lluvia. Calles abiertas, poca cobertura.',
  2: 'El centro con niebla. Esquinas ciegas y callejones.',
  3: 'Las afueras en tormenta. Campo abierto y la granja.',
};

export function survivalLevel(L) {
  return {
    ...L, survival: true, lampsOff: false, intro: null, outro: null,
    objective: [{ type: 'endless', text: 'Sobreviví' }],
    weaponSpots: [],
    loadout: { weapons: ['bat', 'pistol'], ammo: { pistol: 48 }, bandage: 1, coins: 20 },
    shopItems: ['ammo_pistol', 'ammo_shotgun', 'ammo_rifle', 'bandage', 'medkit', 'shotgun', 'rifle'],
  };
}

export function initSurvival() {
  S.surv = { wave: 0, queue: 0, total: 0, left: 0, breather: FIRST_DELAY, timer: 0 };
  // en supervivencia todo el decorado está "encendido"
  for (const m of S.objective?.markers || []) m.state = 1;
}

const team = () => S.players.filter((p) => !p.gone).length;

function pickType(wave) {
  const ok = MIX.filter(([, , from]) => wave + (S.diff?.early || 0) >= from);
  let r = Math.random() * ok.reduce((a, [, w]) => a + w, 0);
  for (const [t, w] of ok) { r -= w; if (r <= 0) return t; }
  return 'walker';
}

function startWave() {
  const V = S.surv, D = S.diff, n = team();
  V.wave++; S.wave = V.wave;
  V.queue = Math.round((5 + 2.4 * V.wave) * D.waves * (1 + 0.4 * (n - 1)));
  // refuerzos: grupos de brutos cada 5 oleadas
  if (V.wave % 5 === 0) V.queue += 2 * n;
  V.total = V.queue; V.timer = 0;
  // los zombies se vuelven más resistentes y algo más rápidos
  S.zScale = 1 + Math.max(0, V.wave - 4) * 0.05;
  S.zSpeed = Math.min(1.3, 1 + Math.max(0, V.wave - 4) * 0.012);
  const boss = V.wave % 10 === 0;
  bus.emit('banner', { text: boss ? `OLEADA ${V.wave} · EL GIGANTE` : `OLEADA ${V.wave}`, danger: V.wave % 5 === 0 });
  sfx('alarm', 0.6);
  const mood = boss ? 'final' : 'combat';
  playMusic(mood); bus.emit('music', mood);
  if (boss) {
    const sp = pickSpawnPoint();
    if (sp) { const b = spawnZombie('boss', sp.x, sp.y); b.alert = true; V.total++; }
  }
}

function endWave() {
  const V = S.surv;
  V.breather = BREATHER;
  bus.emit('banner', { text: `OLEADA ${V.wave} SUPERADA`, danger: false });
  sfx('objective');
  playMusic('explore'); bus.emit('music', 'explore');
  const bonus = 4 + V.wave * 2;
  for (const p of S.players) {
    if (p.gone) continue;
    if (p.dead) { // al terminar la oleada vuelven los caídos
      p.dead = false; p.hp = 40; p.invuln = 120; p.reviveT = 0; p.deadT = 0;
      bus.emit('teamToast', `${(p.name || 'JUGADOR').toUpperCase()} VOLVIO`);
    }
    p.coins += bonus;
    float(p.x, p.y - 24, `+${bonus}`, '#f3d27a');
  }
  if (V.wave % 5 === 0) supplyDrop();
}

// caja de suministros: el arma que al equipo le falte, o munición y botiquín
function supplyDrop() {
  const W = S.world;
  let x = W.W / 2, y = W.H / 2;
  for (let i = 0; i < 60; i++) {
    const cx = W.W / 2 + rand(-160, 160), cy = W.H / 2 + rand(-110, 110);
    if (cellFree(cx, cy) && cellFree(cx + 8, cy) && cellFree(cx - 8, cy)) { x = cx; y = cy; break; }
  }
  const missing = ['shotgun', 'rifle'].find((w) => S.players.some((p) => !p.gone && !p.inv.weapons.includes(w)));
  if (missing) addPickup('weapon', x, y, { weapon: missing, persist: true, supply: true });
  for (let i = 0; i < 3; i++) addPickup('ammo', x - 16 + i * 16, y + 16);
  addPickup('medkit', x + 22, y);
  light(x, y, 120, 'rgba(255,220,140,', 120);
  bus.emit('banner', { text: 'SUMINISTROS', danger: false });
  sfx('weapon');
}

export function updateSurvival() {
  const V = S.surv, D = S.diff;
  if (!V) return;
  if (V.breather > 0) {
    if (--V.breather === 0) startWave();
    return;
  }
  const alive = S.zombies.filter((z) => z.state !== 'dying' && z.state !== 'dead').length;
  const n = team();
  if (V.queue > 0 && --V.timer <= 0 && alive < 40 + n * 4) {
    const sp = pickSpawnPoint();
    if (sp) {
      const z = spawnZombie(pickType(V.wave), sp.x, sp.y);
      z.alert = true;
      V.queue--;
    }
    V.timer = Math.max(12, 70 - V.wave * 2.5) / D.rate / (1 + 0.25 * (n - 1)) * rand(0.5, 1.2);
  }
  V.left = V.queue + alive;
  if (V.left === 0) endWave();
}

export function survivalText() {
  const V = S.surv;
  if (!V) return { text: '', bar: null };
  if (V.breather > 0) {
    const s = Math.ceil(V.breather / 60);
    return { text: V.wave === 0 ? `La horda llega en ${s}` : `Próxima oleada en ${s}`, bar: 1 - V.breather / (V.wave === 0 ? FIRST_DELAY : BREATHER) };
  }
  return { text: `Oleada ${V.wave} · Quedan ${V.left}`, bar: V.total ? 1 - V.left / V.total : 0 };
}

// la flecha apunta a los suministros si hay
export function survivalTarget(from) {
  let best = null, bd = 1e9;
  for (const p of S.pickups) if (p.supply) { const d = dist(p.x, p.y, from.x, from.y); if (d < bd) { bd = d; best = p; } }
  return best;
}
