import { GW, GH } from '../core/config.js';
import { S, bus, net, rand, dist, clamp } from '../core/state.js';
import { canvas, ctx, sx, sy } from '../core/render.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { localControl, anyPressed, endFrame } from '../core/input.js';
import { sfx, sfxHook, playMusic, ambient, stopAllAmbient, setIntensity, setVolumes, audioReady } from '../core/audio.js';
import { save, recordWin } from '../core/save.js';
import { buildWorld, drawGround, worldDrawables, moveEntity } from './world.js';
import { settings as fxSettings, updateFx, drawDecals, drawParticles, drawFloaters, setWeather, updateWeather, drawWeather, drawLighting, drawCinema, light } from './fx.js';
import { updateBullets, drawBullets, WEAPONS, ORDER } from './weapons.js';
import { spawnZombie, updateZombies, zombieDrawables, pickSpawnPoint } from './zombies.js';
import { updatePickups, drawPickups, pickupLights, addPickup } from './pickups.js';
import { DIFFS, priceOf, bestKey } from './difficulty.js';
import { createPlayer, updatePlayer, playerDrawables, updateRevives } from './player.js';
import { startObjectives, updateObjectives, objectiveTarget, interactHint, drawGroundMarkers, markerDrawables, markerLights } from './objectives.js';
import { LEVELS, SHOP_ITEMS } from './levels.js';
import { room, broadcast, broadcastLobby, sendToHost, leaveRoom, setNetHandlers } from '../net/net.js';
import { encodeSnapshot, applySnapshot, interpolate } from '../net/sync.js';
import * as ui from '../ui/ui.js';

// Modos: menu (escena de fondo) · intro · play · shop · paused · outro · dead · results
const G = { mode: 'menu', bars: 0, introT: 0, introDur: 0, introFrom: null, playT: 0, deathShown: false, remote: new Map() };
const WV = { queue: 0, alertQueue: 0, timer: 0, next: 0 };
const PAR = { 1: 300, 2: 330, 3: 400 };
const OVERLAY_MODES = new Set(['paused', 'shop']);
const me = () => S.players[net.me];
const mp = () => !!net.role;

function resetState() {
  Object.assign(S, {
    zombies: [], bullets: [], projectiles: [], pickups: [], particles: [], decals: [], lights: [], floaters: [],
    players: [], t: 0, timeScale: 1, hitstop: 0, shake: 0, wave: 0, kills: 0, shots: 0, hits: 0,
    objective: null, boss: null, heli: null, surge: 0, spawnBoost: 1, over: false, menuMode: false,
  });
  S.cam.cine = null;
  Object.assign(WV, { queue: 0, alertQueue: 0, timer: 0, next: 60 * 12 });
  G.playT = 0; G.deathShown = false;
}

// control vacío: se usa mientras un menú está abierto en multijugador
// (la partida sigue corriendo pero el jugador no se mueve ni dispara)
const IDLE = { moveX: 0, moveY: 0, fire: false, mouse: localControl.mouse, pressed: () => false, held: () => false, takeWheel: () => 0 };

function remoteControl() {
  return {
    remote: true, moveX: 0, moveY: 0, fire: false, aim: 0, heldE: false, wheel: 0, keys: new Set(), mouse: { x: 0, y: 0 },
    pressed(c) { return this.keys.has(c); },
    held(c) { return c === 'KeyE' && this.heldE; },
    takeWheel() { const w = this.wheel; this.wheel = 0; return w; },
  };
}

// ---------------------------------------------------------------------------
// Escena del menú: el barrio del nivel 1 bajo tormenta, con la cámara en
// un travelling lento y zombies deambulando.
// ---------------------------------------------------------------------------
export function menuScene() {
  resetState();
  net.role = null; net.me = 0;
  const L = LEVELS[0];
  S.diff = DIFFS.normal;
  S.level = { ...L, darkness: 0.8 };
  S.world = buildWorld(L);
  S.world.lamps.forEach((l) => { l.lit = true; });
  S.menuMode = true;
  for (let i = 0; i < 10; i++) spawnZombie(i % 4 === 0 ? 'runner' : 'walker', rand(380, 760), rand(260, 560));
  setWeather('storm');
  G.mode = 'menu'; G.bars = 0;
  canvas.classList.remove('dead');
  ui.setHud(false);
  if (audioReady()) { stopAllAmbient(); ambient('rain', true); playMusic('menu'); }
}

export function menuAudio() {
  if (G.mode !== 'menu') return;
  ambient('rain', true);
  playMusic('menu');
}

// Miniaturas reales de cada nivel para las tarjetas del menú
const THUMB_CAM = { 1: [560, 330], 2: [210, 170], 3: [560, 230] };
export function levelThumbs() {
  const out = {};
  for (const L of LEVELS) {
    resetState();
    S.level = L;
    S.world = buildWorld(L);
    S.world.lamps.forEach((l) => { l.lit = true; l.on = true; });
    snapCamera(...THUMB_CAM[L.id]);
    ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, GW, GH);
    drawGround();
    const list = worldDrawables().sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    drawLighting([]);
    out[L.id] = canvas.toDataURL('image/png');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Inicio de nivel. opts.roster = [{idx,name,id}] en multijugador.
// ---------------------------------------------------------------------------
export function startLevel(id, opts = {}) {
  ui.fade(() => {
    resetState();
    const L = LEVELS[id - 1];
    S.diff = DIFFS[opts.diff || save.diff] || DIFFS.normal;
    S.level = L;
    S.world = buildWorld(L);
    S.world.lamps.forEach((l) => { l.lit = !L.lampsOff; });
    G.remote.clear();
    if (opts.roster) {
      net.role = room.role;
      const roster = [...opts.roster].sort((a, b) => a.idx - b.idx);
      net.me = roster.findIndex((r) => r.idx === room.me);
      S.players = roster.map((r, i) => {
        const ctrl = i === net.me ? localControl : remoteControl();
        const p = createPlayer(L, ctrl, r.idx, r.name);
        if (net.role === 'host' && i !== net.me) G.remote.set(r.id, p);
        return p;
      });
    } else {
      net.role = null; net.me = 0;
      S.players = [createPlayer(L, localControl)];
    }
    const p = me();
    if (net.role === 'client') {
      S.objective = { steps: L.objective, i: 0, step: L.objective[0], count: 0, total: 1, done: [], markers: L.markers.map((m) => ({ ...m, state: 0 })) };
    } else {
      startObjectives(L);
      for (const w of L.weaponSpots || []) addPickup('weapon', w.x, w.y, { weapon: w.weapon, persist: true });
      // algunos zombies ya rondando el mapa (no alertados)
      for (let i = 0; i < 5; i++) { const sp = pickSpawnPoint(); if (sp) spawnZombie(i === 4 ? 'runner' : 'walker', sp.x, sp.y); }
    }
    setWeather(L.weather);
    stopAllAmbient();
    if (L.weather === 'rain') ambient('rain', true);
    if (L.weather === 'storm') { ambient('storm', true); ambient('wind', true); }
    if (L.weather === 'fog') ambient('wind', true);
    playMusic(L.music || 'explore');
    setIntensity(0);
    canvas.classList.remove('dead');
    ui.hideOverlays();
    ui.buildHud(p);
    snapCamera(p.x, p.y);
    if (!mp() && save.settings.cine && L.intro?.length) beginIntro(L, p);
    else {
      G.mode = 'play'; G.bars = 0; ui.setHud(true);
      levelBanner();
      if (mp()) ui.subtitles(L.intro || [], 1400);
    }
  });
}

function beginIntro(L, p) {
  G.mode = 'intro'; G.bars = 1; G.introT = 0;
  ui.setHud(false);
  ui.skipHint(true);
  // la cámara arranca mirando el objetivo y termina en el jugador
  const first = L.objective[0];
  const tgt = objectiveTarget(p) || (first.x != null ? first : L.markers[0]) || p;
  G.introFrom = { x: tgt.x, y: tgt.y };
  G.introDur = L.intro.reduce((a, l) => a + l.length * 28 + 1600, 0) / 1000 * 60;
  snapCamera(tgt.x, tgt.y);
  ui.subtitles(L.intro).then(() => { if (G.mode === 'intro') endIntro(); });
}

function endIntro() {
  ui.skipSubtitles();
  ui.skipHint(false);
  G.mode = 'play';
  ui.setHud(true);
  levelBanner();
}

function levelBanner() {
  const L = S.level, hard = S.diff.id !== 'normal';
  ui.banner(`NOCHE ${L.id} · ${L.name.toUpperCase()}${hard ? ` · ${S.diff.name}` : ''}`, hard);
}

function beginOutro() {
  G.mode = 'outro';
  ui.closeOverlaysForOutro();
  ui.setHud(false);
  ui.prompt(null);
  ui.subtitles(S.level.outro || []).then(() => { if (net.role !== 'client') showResults(); });
}

bus.on('levelComplete', () => {
  if (G.mode !== 'play' && !OVERLAY_MODES.has(G.mode)) return;
  const L = S.level;
  for (const p of S.players) p.invuln = 1e9;
  if (!mp()) S.timeScale = 0.5;
  sfx('win');
  if (L.id === 3 && S.heli) {
    S.players.forEach((p) => { if (!p.dead) p.boarded = true; });
    S.heli.leaving = true; S.heli.tx = S.heli.x + 700; S.heli.ty = S.heli.y - 500;
  }
  WV.queue = 0; S.surge = 0;
  if (net.role === 'host') broadcast({ t: 'outro' });
  setTimeout(beginOutro, 900);
});

function stats() {
  const secs = Math.floor(G.playT / 60);
  const dmg = S.players.reduce((a, p) => a + (p.dmgTaken || 0), 0) / S.players.length;
  const coins = S.players.reduce((a, p) => a + p.coins, 0);
  return {
    secs, dmg,
    rows: [
      ['DIFICULTAD', S.diff.name],
      ['TIEMPO', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
      ['BAJAS', S.kills],
      ['PRECISION', S.shots ? `${Math.round(S.hits / S.shots * 100)}%` : '-'],
      [mp() ? 'DAÑO PROMEDIO' : 'DAÑO RECIBIDO', Math.round(dmg)],
      ['MONEDAS', coins],
    ],
  };
}

function showResults() {
  if (G.mode !== 'outro') return;
  const L = S.level, st = stats();
  let pts = 0;
  if (st.secs < PAR[L.id]) pts++;
  if (st.dmg < 120) pts++;
  if (st.dmg < 50) pts++;
  if (S.shots && S.hits / S.shots > 0.45) pts++;
  const rank = ['C', 'B', 'B', 'A', 'S'][pts];
  const key = bestKey(L.id, S.diff.id);
  recordWin(L.id, rank, key);
  ui.updateContinue();
  G.mode = 'results';
  const hasNext = L.id < LEVELS.length;
  if (net.role === 'host') broadcast({ t: 'end', win: true, rows: st.rows, rank, level: L.id, key, hasNext });
  ui.showResults(st.rows, rank, hasNext, net.role);
}

function showDeath() {
  G.deathShown = true;
  G.mode = 'results';
  canvas.classList.add('dead');
  ui.setHud(false);
  ui.prompt(null);
  const rows = stats().rows;
  if (net.role === 'host') broadcast({ t: 'end', win: false, rows });
  ui.showDeath(rows, net.role);
}

// ---------------------------------------------------------------------------
// Pausa, tienda y salida
// ---------------------------------------------------------------------------
export function pause() {
  if (G.mode !== 'play') return;
  G.mode = 'paused';
  ui.show('pauseMenu');
  ui.pauseOptions(net.role);
}
export function resume() {
  if (!OVERLAY_MODES.has(G.mode)) return;
  G.mode = 'play';
  ui.hideOverlays();
}
export function restart() {
  if (net.role === 'client') return;
  if (net.role === 'host') return hostStart(S.level.id);
  startLevel(S.level.id);
}
export function nextLevel() {
  const id = Math.min(LEVELS.length, S.level.id + 1);
  if (net.role === 'host') return hostStart(id);
  startLevel(id);
}
export function quitToMenu(msg) {
  if (room.role) leaveRoom();
  ui.fade(() => {
    ui.skipSubtitles(); ui.skipHint(false); ui.prompt(null);
    menuScene();
    ui.show('mainMenu');
    if (msg) ui.toast(msg);
  });
}
// botón "menú" de resultados/muerte: en multijugador vuelve a la sala
export function endMenu() {
  if (net.role === 'host') {
    room.inGame = false;
    broadcast({ t: 'toLobby' });
    broadcastLobby();
    return toLobby();
  }
  quitToMenu();
}

function nearShop(p) {
  const s = S.level.shop;
  return s && !p.dead && dist(p.x, p.y, s.x, s.y) < 22;
}

function openShop(p) {
  G.mode = 'shop';
  ui.prompt(null);
  sfx('coin');
  ui.openShop(p, S.level.shopItems);
}

export function buy(k, p = me()) {
  const it = SHOP_ITEMS[k], inv = p.inv;
  const price = priceOf(it, S.diff);
  if (!it || p.coins < price) return false;
  if (it.weapon) {
    if (inv.weapons.includes(it.weapon)) return false;
    inv.weapons.push(it.weapon);
    inv.weapons.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    inv.mag[it.weapon] = WEAPONS[it.weapon].mag;
    inv.ammo[WEAPONS[it.weapon].ammo] += WEAPONS[it.weapon].mag * 2;
    inv.cur = it.weapon;
  } else if (k.startsWith('ammo_')) {
    const w = k.slice(5);
    if (!inv.weapons.includes(w)) return false;
    inv.ammo[WEAPONS[w].ammo] += parseInt(it.sub.replace('+', ''), 10);
  } else {
    inv[k]++;
  }
  p.coins -= price;
  if (p === me()) {
    sfx(it.weapon ? 'weapon' : 'item'); sfx('coin');
    ui.updateHud(p);
    if (net.role === 'client') sendToHost({ t: 'buy', k });
  }
  return true;
}

export function settingsChanged(st) {
  setVolumes(st.music / 100, st.sfx / 100);
  fxSettings.shake = st.shake;
}

document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------------------------------------------------------------------------
// Multijugador: sala, arranque y mensajes
// ---------------------------------------------------------------------------
let evBuf = [];
const NO_FORWARD = new Set(['thunder', 'heartbeat', 'uiHover', 'uiClick']);
net.rec = null;
sfxHook.fn = (name, vol) => {
  if (net.role === 'host' && net.capture && !NO_FORWARD.has(name)) evBuf.push(['sfx', [name, vol]]);
};
for (const ev of ['banner', 'subtitle', 'lightsOn', 'objective', 'teamToast']) {
  bus.on(ev, (data) => { if (net.role === 'host' && G.mode !== 'menu') evBuf.push(['bus', [ev, data]]); });
}
bus.on('teamToast', (t) => ui.toast(t));
bus.on('music', (m) => { if (net.role === 'host') evBuf.push(['music', [m]]); });

export function toLobby() {
  ui.fade(() => {
    ui.skipSubtitles(); ui.prompt(null);
    menuScene();
    ui.showLobby();
  });
}

export function hostStart(level) {
  room.inGame = true; room.level = level;
  broadcastLobby();
  const roster = room.players.map(({ idx, name, id }) => ({ idx, name, id }));
  broadcast({ t: 'start', level, diff: room.diff, roster: roster.map(({ idx, name }) => ({ idx, name })) });
  startLevel(level, { roster, diff: room.diff });
}

setNetHandlers({
  onLobby: () => ui.renderLobby(),
  onClosed: (why) => quitToMenu(why),
  onMsg: (from, msg) => {
    if (net.role === 'host' || room.role === 'host') return hostMsg(from, msg);
    clientMsg(msg);
  },
});

function hostMsg(from, msg) {
  const p = G.remote.get(from);
  if (msg.t === 'left') {
    if (p) { p.gone = true; p.boarded = true; p.dead = false; }
    if (room.inGame) bus.emit('teamToast', `${(msg.name || 'JUGADOR').toUpperCase()} SE FUE`);
    return;
  }
  if (!p) return;
  if (msg.t === 'i') {
    const c = p.control;
    c.moveX = msg.mx; c.moveY = msg.my; c.fire = !!msg.f; c.aim = msg.a; c.heldE = !!msg.e;
    c.wheel += msg.w || 0;
    for (const k of msg.k || []) c.keys.add(k);
  } else if (msg.t === 'buy') buy(msg.k, p);
}

function clientMsg(msg) {
  if (msg.t === 'start') return startLevel(msg.level, { roster: msg.roster, diff: msg.diff });
  if (msg.t === 'toLobby') return toLobby();
  if (!S.world || G.mode === 'menu') return;
  if (msg.t === 's') {
    const hadHeli = !!S.heli;
    applySnapshot(msg, net.me);
    if (!hadHeli && S.heli) ambient('heli', true);
  } else if (msg.t === 'outro') {
    setTimeout(beginOutro, 900);
  } else if (msg.t === 'end') {
    G.mode = 'results';
    ui.skipSubtitles();
    ui.setHud(false); ui.prompt(null);
    if (msg.win) { recordWin(msg.level, msg.rank, msg.key); ui.updateContinue(); ui.showResults(msg.rows, msg.rank, msg.hasNext, 'client'); }
    else { canvas.classList.add('dead'); ui.showDeath(msg.rows, 'client'); }
  }
}

// ---------------------------------------------------------------------------
// Oleadas
// ---------------------------------------------------------------------------
function pickType(mix) {
  const ok = mix.filter(([, , from]) => S.wave + S.diff.early >= from);
  let r = Math.random() * ok.reduce((a, [, w]) => a + w, 0);
  for (const [t, w] of ok) { r -= w; if (r <= 0) return t; }
  return 'walker';
}

function updateWaves() {
  const L = S.level, cfg = L.waves;
  const team = S.players.filter((p) => !p.gone).length;
  if (S.surge) { const n = Math.round(S.surge * (1 + 0.35 * (team - 1)) * S.diff.waves); WV.queue += n; WV.alertQueue += n; S.surge = 0; WV.timer = 0; }
  const alive = S.zombies.filter((z) => z.state !== 'dying' && z.state !== 'dead').length;
  if (--WV.next <= 0) {
    S.wave++;
    WV.queue += Math.round(Math.min(cfg.cap, cfg.first + cfg.grow * (S.wave - 1)) * (1 + 0.4 * (team - 1)) * S.diff.waves);
    WV.next = 60 * 40;
    bus.emit('banner', { text: `OLEADA ${S.wave}`, danger: S.wave > 2 });
    sfx('alarm', 0.5);
  }
  // si limpiaste la oleada, la siguiente llega antes
  if (S.wave > 0 && WV.queue === 0 && alive <= 1 && WV.next > 60 * 6) WV.next = 60 * 6;
  if (WV.queue > 0 && --WV.timer <= 0 && alive < 42 + team * 4) {
    const sp = pickSpawnPoint();
    if (sp) {
      const z = spawnZombie(pickType(cfg.mix), sp.x, sp.y);
      if (WV.alertQueue > 0) { WV.alertQueue--; z.alert = true; } else z.alert = Math.random() < 0.5;
      WV.queue--;
    }
    WV.timer = cfg.rate / (S.spawnBoost || 1) / (1 + 0.25 * (team - 1)) / S.diff.rate * rand(0.5, 1.2);
  }
}

// ---------------------------------------------------------------------------
// Cámara
// ---------------------------------------------------------------------------
function snapCamera(x, y) {
  const c = S.cam, W = S.world;
  c.x = c.tx = clamp(x - GW / 2, 0, W.W - GW);
  c.y = c.ty = clamp(y - GH / 2, 0, W.H - GH);
}

const ease = (t) => t * t * (3 - 2 * t);
function updateCamera() {
  const c = S.cam, W = S.world, p = me();
  let tx, ty, k = 0.1;
  if (G.mode === 'menu') {
    const t = S.t * 0.0016;
    tx = 560 + Math.sin(t) * 300; ty = 380 + Math.sin(t * 0.7) * 120; k = 0.05;
  } else if (G.mode === 'intro') {
    // quieto en el objetivo, después travelling hasta el jugador
    const u = ease(clamp((G.introT / G.introDur - 0.4) / 0.45, 0, 1));
    tx = G.introFrom.x + (p.x - G.introFrom.x) * u; ty = G.introFrom.y + (p.y - G.introFrom.y) * u; k = 0.08;
  } else if (p.boarded && S.heli) {
    tx = S.heli.x; ty = S.heli.y; k = 0.04;
  } else {
    const m = localControl.mouse;
    tx = p.x + (m.x - GW / 2) * 0.28; ty = p.y - 8 + (m.y - GH / 2) * 0.28;
  }
  c.tx = clamp(tx - GW / 2, 0, W.W - GW); c.ty = clamp(ty - GH / 2, 0, W.H - GH);
  c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k;
}

// ---------------------------------------------------------------------------
// Update (paso fijo de 60 Hz)
// ---------------------------------------------------------------------------
function updateLamps() {
  for (const l of S.world.lamps) {
    let on = !!l.lit;
    if (on && l.flicker) { l.t++; if (Math.random() < 0.03 || (l.t % 240 < 14 && Math.random() < 0.7)) on = false; }
    l.on = on;
  }
}

// avisos de interacción del jugador local
function localPrompt(p) {
  if (p.dead || p.boarded) return null;
  const hint = interactHint(p);
  if (hint) return hint;
  const fallen = S.players.find((o) => o !== p && o.dead && !o.boarded && dist(o.x, o.y, p.x, p.y) < 20);
  if (fallen) return 'MANTENE E  REVIVIR';
  return nearShop(p) ? 'E  TIENDA' : null;
}

function simulate(m) {
  net.capture = net.role === 'host';
  for (const p of S.players) if (!p.boarded) updatePlayer(p);
  updateRevives();
  updateObjectives();
  if (m === 'play' || OVERLAY_MODES.has(m)) {
    if (S.players.some((p) => !p.dead && !p.gone)) updateWaves();
  }
  updateBullets();
  updateZombies();
  updatePickups();
  net.capture = false;
  for (const p of S.players) if (p.control.remote) p.control.keys.clear();
}

function step() {
  const m = G.mode;
  if (m === 'shop' && (localControl.pressed('KeyE') || localControl.pressed('Escape'))) resume();
  if (m === 'paused' && localControl.pressed('Escape')) resume();
  // en un jugador los menús congelan la partida; en red la partida sigue
  if (m === 'results' || (!mp() && OVERLAY_MODES.has(m))) { endFrame(); return; }
  S.t++;
  updateWeather();
  updateLamps();
  if (m === 'menu') { updateZombies(); updateFx(); updateCamera(); endFrame(); return; }

  if (m === 'intro') {
    G.introT++;
    if (G.introT > 30 && anyPressed()) endIntro();
  }
  if (m === 'play' && (localControl.pressed('Escape') || localControl.pressed('KeyP'))) { pause(); endFrame(); return; }
  if (S.hitstop > 0 && !mp()) { S.hitstop--; updateCamera(); endFrame(); return; }
  S.hitstop = 0;

  const p = me();
  if (m !== 'intro') {
    if (m === 'play' || OVERLAY_MODES.has(m)) G.playT++;
    p.control = G.mode === 'play' || G.mode === 'outro' || G.mode === 'dead' ? localControl : IDLE;
    if (net.role === 'client') clientStep(p);
    else simulate(G.mode);

    if (G.mode === 'play') {
      ui.prompt(localPrompt(p));
      if (!interactHint(p) && nearShop(p) && localControl.pressed('KeyE')) openShop(p);
    }
    ui.updateHud(p);
    if (S.t % 20 === 0) {
      const n = S.zombies.filter((z) => z.state !== 'dead' && z.state !== 'dying' && (z.alert || z.puppet) && dist(z.x, z.y, p.x, p.y) < 200).length;
      setIntensity(Math.min(1, n / 8));
    }
    if (mp()) canvas.classList.toggle('dead', p.dead);
    if (net.role !== 'client') {
      const team = S.players.filter((q) => !q.gone);
      const allDown = team.every((q) => q.dead);
      if (allDown && G.mode !== 'dead' && G.mode !== 'outro') { G.mode = 'dead'; ui.hideOverlays(); }
      if (G.mode === 'dead' && !G.deathShown && Math.min(...team.map((q) => q.deadT)) > 90) showDeath();
    }
    if (net.role === 'host' && S.t % 3 === 0) { broadcast(encodeSnapshot(evBuf)); evBuf = []; }
  }
  // el tiempo vuelve a velocidad normal después de una cámara lenta
  if (!mp()) S.timeScale += (1 - S.timeScale) * (p.dead ? 0.012 : 0.03);
  else S.timeScale = 1;
  updateFx();
  updateCamera();
  endFrame();
}

// Cliente: predice su propio movimiento, interpola al resto y manda su input
const SEND_KEYS = ['Space', 'KeyR', 'KeyQ', 'KeyF', 'KeyE', 'Digit1', 'Digit2', 'Digit3', 'Digit4'];
let pendingKeys = new Set(), pendingWheel = 0;
function clientStep(p) {
  const c = p.control, active = c === localControl;
  const m = localControl.mouse;
  const aim = Math.atan2(m.y + S.cam.y - (p.y - 7), m.x + S.cam.x - p.x);
  if (active) {
    for (const k of SEND_KEYS) if (localControl.pressed(k)) pendingKeys.add(k);
    pendingWheel += localControl.takeWheel();
  }
  if (!p.dead && !p.boarded) {
    p.aim = aim;
    const cs = Math.cos(aim), sn = Math.sin(aim);
    p.dir = Math.abs(cs) > Math.abs(sn) * 0.9 ? (cs >= 0 ? 'side' : 'sideleft') : (sn >= 0 ? 'down' : 'up');
    let mx = active ? localControl.moveX : 0, my = active ? localControl.moveY : 0;
    const ml = Math.hypot(mx, my);
    if (ml && p.dashT <= 0) {
      mx /= ml; my /= ml;
      const sp = p.speed * (p.reloadT > 0 ? 0.8 : 1);
      moveEntity(p, mx * sp, my * sp);
      p.walk += 0.18; p.moving = true;
    } else { p.moving = p.dashT > 0; if (p.dashT > 0) p.walk += 0.4; }
  }
  // corrección suave hacia la posición del anfitrión
  if (p.sx != null) {
    const e = dist(p.x, p.y, p.sx, p.sy);
    if (e > 60) { p.x = p.sx; p.y = p.sy; } else if (e > 10 || !p.moving) { const k = e > 10 ? 0.25 : 0.1; p.x += (p.sx - p.x) * k; p.y += (p.sy - p.y) * k; }
  }
  if (p.hurtFlash > 0) p.hurtFlash = Math.max(0, p.hurtFlash - 0.03);
  if (p.local && p.hp < 30 && !p.dead && --p.lowHpBeat <= 0) { sfx('heartbeat', 0.8); p.lowHpBeat = 70; }
  interpolate(net.me);
  updateBullets();
  if (S.t % 2 === 0) {
    sendToHost({
      t: 'i', mx: active ? localControl.moveX : 0, my: active ? localControl.moveY : 0, f: active && localControl.fire, a: Math.round(aim * 100) / 100,
      e: active && localControl.held('KeyE'), k: [...pendingKeys], w: pendingWheel,
    });
    pendingKeys = new Set(); pendingWheel = 0;
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function drawShop(label) {
  const s = S.level.shop;
  if (!s || S.menuMode) return;
  const X = sx(s.x), Y = sy(s.y);
  const b = Math.sin(S.t * 0.08) * 1.5;
  if (!label) {
    ctx.fillStyle = 'rgba(255,207,107,0.5)';
    ctx.beginPath(); ctx.ellipse(X, Y + 2, 9 + b, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }
  // el cartel va encima de todo (después de la luz) para que se lea
  const txt = 'TIENDA', w = textWidth(txt);
  ctx.fillStyle = 'rgba(10,10,14,0.85)'; ctx.fillRect(X - w / 2 - 3, Math.round(Y - 44 + b), w + 6, 9);
  pixelText(ctx, txt, Math.round(X - w / 2), Math.round(Y - 42 + b), '#ffcf6b');
}

function edgeArrow(t, color, label) {
  const X = t.x - S.cam.x, Y = t.y - S.cam.y;
  const cx = GW / 2, cy = GH / 2, a = Math.atan2(Y - cy, X - cx);
  const ex = clamp(cx + Math.cos(a) * 400, 14, GW - 14), ey = clamp(cy + Math.sin(a) * 400, 30, GH - 40);
  ctx.fillStyle = color;
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-2, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (label) pixelText(ctx, label, Math.round(ex - textWidth(label) / 2), Math.round(ey + 8), color);
}

function drawObjectiveArrow() {
  const p = me();
  if (!p || p.dead || (G.mode !== 'play' && !OVERLAY_MODES.has(G.mode))) return;
  // compañeros fuera de pantalla
  for (const o of S.players) {
    if (o === p || o.boarded) continue;
    const X = o.x - S.cam.x, Y = o.y - S.cam.y;
    if (X < 0 || X > GW || Y < 0 || Y > GH) edgeArrow(o, o.dead ? '#e8483f' : ['#e9e6df', '#7cff8f', '#7cc4ff', '#ff8fd8'][o.idx], o.dead ? 'AYUDA' : '');
  }
  const t = objectiveTarget(p);
  if (!t) return;
  const X = t.x - S.cam.x, Y = t.y - S.cam.y;
  if (X > 8 && X < GW - 8 && Y > 30 && Y < GH - 8) {
    // en pantalla: flecha flotando sobre el objetivo
    ctx.fillStyle = '#ffcf6b';
    const yy = Math.round(Y - (t.scale ? 22 * t.scale + 8 : 26) + Math.sin(S.t * 0.12) * 2), xx = Math.round(X);
    for (let i = 0; i < 4; i++) ctx.fillRect(xx - 3 + i, yy + i, 7 - i * 2, 1);
    return;
  }
  edgeArrow(t, '#ffcf6b', `${Math.round(dist(p.x, p.y, t.x, t.y) / 16)}M`);
}

function render() {
  const c = S.cam, ox = c.x, oy = c.y;
  if (S.shake > 0) { c.x += rand(-S.shake, S.shake); c.y += rand(-S.shake, S.shake); }
  ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, GW, GH);
  drawGround();
  drawDecals();
  drawGroundMarkers();
  drawShop();
  drawPickups();
  const list = [...worldDrawables(), ...zombieDrawables(), ...playerDrawables(), ...markerDrawables()];
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.draw();
  drawBullets();
  drawParticles(false);
  const extra = [...pickupLights(), ...markerLights()];
  if (S.level.shop && !S.menuMode) extra.push({ x: S.level.shop.x, y: S.level.shop.y - 10, r: 46, a: 0.7, color: 'rgba(255,190,90,' });
  drawLighting(extra);
  drawParticles(true);
  drawFloaters();
  drawWeather();
  drawShop(true);
  drawObjectiveArrow();
  c.x = ox; c.y = oy;

  const p = me();
  let hurt = 0;
  if (p) {
    hurt = p.hurtFlash * 0.5;
    if (p.hp < 30 && !p.dead) hurt = Math.max(hurt, 0.22 + Math.sin(S.t * 0.1) * 0.08);
  }
  const wantBars = G.mode === 'intro' || G.mode === 'outro' ? 1 : 0;
  G.bars += (wantBars - G.bars) * 0.06;
  drawCinema(hurt, G.bars);
}

// ---------------------------------------------------------------------------
// Bucle principal: paso fijo con acumulador; timeScale estira el tiempo
// (cámara lenta) sin cambiar la física.
// ---------------------------------------------------------------------------
const STEP = 1000 / 60;
let last = 0, acc = 0;
function loop(now) {
  const dt = Math.min(100, now - (last || now));
  last = now;
  acc += dt * (S.timeScale || 1);
  let n = 0;
  while (acc >= STEP && n < 5) { step(); acc -= STEP; n++; }
  if (n === 5) acc = 0;
  if (S.world) render();
  requestAnimationFrame(loop);
}
export function startLoop() { requestAnimationFrame(loop); }

// en segundo plano el navegador frena requestAnimationFrame: el anfitrión
// sigue simulando con un temporizador para no congelar a los demás
setInterval(() => {
  if (!document.hidden || net.role !== 'host' || G.mode === 'menu' || G.mode === 'results') return;
  for (let i = 0; i < 6; i++) step();
}, 100);

export function mode() { return G.mode; }

bus.on('lightsOn', () => { for (const l of S.world.lamps) light(l.x, l.y - 8, 110, 'rgba(255,200,120,', 40); });
