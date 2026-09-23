import { GW, GH } from '../core/config.js';
import { S, bus, rand, dist, clamp } from '../core/state.js';
import { canvas, ctx, sx, sy } from '../core/render.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { localControl, anyPressed, endFrame } from '../core/input.js';
import { sfx, playMusic, ambient, stopAllAmbient, setIntensity, setVolumes, audioReady } from '../core/audio.js';
import { save, recordWin } from '../core/save.js';
import { buildWorld, drawGround, worldDrawables } from './world.js';
import { settings as fxSettings, updateFx, drawDecals, drawParticles, drawFloaters, setWeather, updateWeather, drawWeather, drawLighting, drawCinema, light } from './fx.js';
import { updateBullets, drawBullets, WEAPONS, ORDER } from './weapons.js';
import { spawnZombie, updateZombies, zombieDrawables, pickSpawnPoint } from './zombies.js';
import { updatePickups, drawPickups, pickupLights } from './pickups.js';
import { createPlayer, updatePlayer, playerDrawables } from './player.js';
import { startObjectives, updateObjectives, objectiveTarget, interactHint, drawGroundMarkers, markerDrawables, markerLights } from './objectives.js';
import { LEVELS, SHOP_ITEMS } from './levels.js';
import * as ui from '../ui/ui.js';

// Modos: menu (escena de fondo) · intro · play · shop · paused · outro · results · dead
const G = { mode: 'menu', bars: 0, introT: 0, introDur: 0, introFrom: null, playT: 0, deathShown: false };
const WV = { queue: 0, alertQueue: 0, timer: 0, next: 0 };
const PAR = { 1: 300, 2: 330, 3: 400 };

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

// ---------------------------------------------------------------------------
// Escena del menú: el barrio del nivel 1 bajo tormenta, con la cámara en
// un travelling lento y zombies deambulando.
// ---------------------------------------------------------------------------
export function menuScene() {
  resetState();
  const L = LEVELS[0];
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

// ---------------------------------------------------------------------------
// Inicio de nivel
// ---------------------------------------------------------------------------
export function startLevel(id) {
  ui.fade(() => {
    resetState();
    const L = LEVELS[id - 1];
    S.level = L;
    S.world = buildWorld(L);
    S.world.lamps.forEach((l) => { l.lit = !L.lampsOff; });
    const p = createPlayer(L, localControl);
    S.players = [p];
    startObjectives(L);
    // algunos zombies ya rondando el mapa (no alertados)
    for (let i = 0; i < 5; i++) { const sp = pickSpawnPoint(); if (sp) spawnZombie(i === 4 ? 'runner' : 'walker', sp.x, sp.y); }
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
    if (save.settings.cine && L.intro?.length) beginIntro(L, p);
    else { G.mode = 'play'; G.bars = 0; ui.setHud(true); }
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
  ui.banner(`NOCHE ${S.level.id} · ${S.level.name.toUpperCase()}`);
}

bus.on('levelComplete', () => {
  if (G.mode !== 'play') return;
  G.mode = 'outro';
  const L = S.level, p = S.players[0];
  p.invuln = 1e9;
  S.timeScale = 0.5;
  sfx('win');
  if (L.id === 3 && S.heli) {
    p.boarded = true;
    S.heli.leaving = true; S.heli.tx = S.heli.x + 700; S.heli.ty = S.heli.y - 500;
  }
  WV.queue = 0; S.surge = 0;
  ui.setHud(false);
  ui.prompt(null);
  setTimeout(() => ui.subtitles(L.outro || []).then(showResults), 900);
});

bus.on('playerDown', () => { ui.prompt(null); });

function stats() {
  const p = S.players[0], secs = Math.floor(G.playT / 60);
  return {
    secs,
    rows: [
      ['TIEMPO', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
      ['BAJAS', S.kills],
      ['PRECISION', S.shots ? `${Math.round(S.hits / S.shots * 100)}%` : '-'],
      ['DAÑO RECIBIDO', Math.round(p.dmgTaken || 0)],
      ['MONEDAS', p.coins],
    ],
  };
}

function showResults() {
  if (G.mode !== 'outro') return;
  const L = S.level, p = S.players[0], st = stats();
  let pts = 0;
  if (st.secs < PAR[L.id]) pts++;
  if ((p.dmgTaken || 0) < 120) pts++;
  if ((p.dmgTaken || 0) < 50) pts++;
  if (S.shots && S.hits / S.shots > 0.45) pts++;
  const rank = ['C', 'B', 'B', 'A', 'S'][pts];
  recordWin(L.id, rank);
  ui.updateContinue();
  G.mode = 'results';
  ui.showResults(st.rows, rank, L.id < LEVELS.length);
}

// ---------------------------------------------------------------------------
// Pausa, tienda y salida
// ---------------------------------------------------------------------------
export function pause() {
  if (G.mode !== 'play') return;
  G.mode = 'paused';
  ui.show('pauseMenu');
}
export function resume() {
  if (G.mode !== 'paused' && G.mode !== 'shop') return;
  G.mode = 'play';
  ui.hideOverlays();
}
export function restart() { startLevel(S.level.id); }
export function nextLevel() { startLevel(Math.min(LEVELS.length, S.level.id + 1)); }
export function quitToMenu() {
  ui.fade(() => {
    ui.skipSubtitles(); ui.skipHint(false); ui.prompt(null);
    menuScene();
    ui.show('mainMenu');
  });
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

export function buy(k) {
  const p = S.players[0], it = SHOP_ITEMS[k], inv = p.inv;
  if (!it || p.coins < it.price) return false;
  if (it.weapon) {
    if (inv.weapons.includes(it.weapon)) return false;
    inv.weapons.push(it.weapon);
    inv.weapons.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    inv.mag[it.weapon] = WEAPONS[it.weapon].mag;
    inv.ammo[WEAPONS[it.weapon].ammo] += WEAPONS[it.weapon].mag * 2;
    inv.cur = it.weapon;
    sfx('weapon');
  } else if (k.startsWith('ammo_')) {
    const w = k.slice(5);
    if (!inv.weapons.includes(w)) return false;
    inv.ammo[WEAPONS[w].ammo] += parseInt(it.sub.replace('+', ''), 10);
    sfx('item');
  } else {
    inv[k]++;
    sfx('item');
  }
  p.coins -= it.price;
  sfx('coin');
  ui.updateHud(p);
  return true;
}

export function settingsChanged(st) {
  setVolumes(st.music / 100, st.sfx / 100);
  fxSettings.shake = st.shake;
}

document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------------------------------------------------------------------------
// Oleadas
// ---------------------------------------------------------------------------
function pickType(mix) {
  const ok = mix.filter(([, , from]) => S.wave >= from);
  let r = Math.random() * ok.reduce((a, [, w]) => a + w, 0);
  for (const [t, w] of ok) { r -= w; if (r <= 0) return t; }
  return 'walker';
}

function updateWaves() {
  const L = S.level, cfg = L.waves;
  if (S.surge) { WV.queue += S.surge; WV.alertQueue += S.surge; S.surge = 0; WV.timer = 0; }
  const alive = S.zombies.filter((z) => z.state !== 'dying' && z.state !== 'dead').length;
  if (--WV.next <= 0) {
    S.wave++;
    WV.queue += Math.min(cfg.cap, cfg.first + cfg.grow * (S.wave - 1));
    WV.next = 60 * 40;
    ui.banner(`OLEADA ${S.wave}`, S.wave > 2);
    sfx('alarm', 0.5);
  }
  // si limpiaste la oleada, la siguiente llega antes
  if (S.wave > 0 && WV.queue === 0 && alive <= 1 && WV.next > 60 * 6) WV.next = 60 * 6;
  if (WV.queue > 0 && --WV.timer <= 0 && alive < 42) {
    const sp = pickSpawnPoint();
    if (sp) {
      const z = spawnZombie(pickType(cfg.mix), sp.x, sp.y);
      if (WV.alertQueue > 0) { WV.alertQueue--; z.alert = true; } else z.alert = Math.random() < 0.5;
      WV.queue--;
    }
    WV.timer = cfg.rate / (S.spawnBoost || 1) * rand(0.5, 1.2);
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
  const c = S.cam, W = S.world, p = S.players[0];
  let tx, ty, k = 0.1;
  if (G.mode === 'menu') {
    const t = S.t * 0.0016;
    tx = 560 + Math.sin(t) * 300; ty = 380 + Math.sin(t * 0.7) * 120; k = 0.05;
  } else if (G.mode === 'intro') {
    // quieto en el objetivo, después travelling hasta el jugador
    const u = ease(clamp((G.introT / G.introDur - 0.4) / 0.45, 0, 1));
    tx = G.introFrom.x + (p.x - G.introFrom.x) * u; ty = G.introFrom.y + (p.y - G.introFrom.y) * u; k = 0.08;
  } else if (G.mode === 'outro' && p.boarded && S.heli) {
    tx = S.heli.x; ty = S.heli.y; k = 0.04;
  } else {
    const m = p.control.mouse;
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

function step() {
  const m = G.mode;
  if (m === 'shop' && (localControl.pressed('KeyE') || localControl.pressed('Escape'))) resume();
  if (m === 'paused' && localControl.pressed('Escape')) resume();
  if (m === 'paused' || m === 'shop' || m === 'results') { endFrame(); return; }
  S.t++;
  updateWeather();
  updateLamps();
  if (m === 'menu') { updateZombies(); updateFx(); updateCamera(); endFrame(); return; }

  if (m === 'intro') {
    G.introT++;
    if (G.introT > 30 && anyPressed()) endIntro();
  }
  if (m === 'play' && (localControl.pressed('Escape') || localControl.pressed('KeyP'))) { pause(); endFrame(); return; }

  if (S.hitstop > 0) { S.hitstop--; updateCamera(); endFrame(); return; }
  const p = S.players[0];
  if (m === 'play' || m === 'outro' || m === 'dead') {
    if (m === 'play') {
      G.playT++;
      updatePlayer(p);
      updateObjectives();
      if (!p.dead) updateWaves();
      // interacción: primero objetivos, después tienda
      const hint = p.dead ? null : interactHint(p) || (nearShop(p) ? 'E  TIENDA' : null);
      ui.prompt(hint);
      if (!interactHint(p) && nearShop(p) && localControl.pressed('KeyE')) openShop(p);
    } else {
      updatePlayer(p);
      updateObjectives();
    }
    updateBullets();
    updateZombies();
    updatePickups();
    ui.updateHud(p);
    // intensidad de la música según zombies alertados cerca
    if (S.t % 20 === 0) {
      const n = S.zombies.filter((z) => z.alert && z.state !== 'dead' && z.state !== 'dying' && dist(z.x, z.y, p.x, p.y) < 220).length;
      setIntensity(Math.min(1, n / 8));
    }
    if (p.dead && m === 'play') G.mode = 'dead';
    if (G.mode === 'dead' && p.deadT > 90 && !G.deathShown) {
      G.deathShown = true;
      canvas.classList.add('dead');
      ui.setHud(false);
      ui.showDeath(stats().rows);
    }
  }
  // el tiempo vuelve a velocidad normal después de una cámara lenta
  if (p) S.timeScale += (1 - S.timeScale) * (p.dead ? 0.012 : 0.03);
  updateFx();
  updateCamera();
  endFrame();
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

function drawObjectiveArrow() {
  const p = S.players[0];
  if (!p || p.dead || G.mode !== 'play') return;
  const t = objectiveTarget(p);
  if (!t) return;
  const X = t.x - S.cam.x, Y = t.y - S.cam.y;
  ctx.fillStyle = '#ffcf6b';
  if (X > 8 && X < GW - 8 && Y > 30 && Y < GH - 8) {
    // en pantalla: flecha flotando sobre el objetivo
    const yy = Math.round(Y - (t.scale ? 22 * t.scale + 8 : 26) + Math.sin(S.t * 0.12) * 2), xx = Math.round(X);
    for (let i = 0; i < 4; i++) ctx.fillRect(xx - 3 + i, yy + i, 7 - i * 2, 1);
    return;
  }
  // fuera de pantalla: flecha en el borde con la distancia
  const cx = GW / 2, cy = GH / 2, a = Math.atan2(Y - cy, X - cx);
  const ex = clamp(cx + Math.cos(a) * 400, 14, GW - 14), ey = clamp(cy + Math.sin(a) * 400, 30, GH - 40);
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-2, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  const m = `${Math.round(dist(p.x, p.y, t.x, t.y) / 16)}M`;
  pixelText(ctx, m, Math.round(ex - textWidth(m) / 2), Math.round(ey + 8), '#ffcf6b');
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

  const p = S.players[0];
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

export function mode() { return G.mode; }

bus.on('lightsOn', () => { for (const l of S.world.lamps) light(l.x, l.y - 8, 110, 'rgba(255,200,120,', 40); });
