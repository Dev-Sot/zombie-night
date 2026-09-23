import { ctx, sx, sy, onScreen } from '../core/render.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { S, dist, bus, rand } from '../core/state.js';
import { sfx, playMusic, ambient } from '../core/audio.js';
import { addPickup } from './pickups.js';
import { spawnZombie } from './zombies.js';
import { burst, light, shake } from './fx.js';
import { survivalText, survivalTarget } from './survival.js';
import { npc } from './npc.js';
import { bark, anyone } from './barks.js';
import { openDoor, doorLocked } from './world.js';
import { damageZombie } from './zombies.js';
import { frame } from '../core/render.js';

// Cada nivel define una lista de pasos; se completan en orden.
//   collect  — juntar ítems en puntos fijos
//   reach    — llegar a un lugar
//   interact — pararse en uno o más puntos y apretar E
//   hold     — mantenerse dentro de un radio N segundos (la barra se congela si salís)
//   survive  — aguantar N segundos
//   boss     — matar al jefe
//   rescue   — llegar hasta un sobreviviente (desde ahí te sigue)
//   escort   — llevar al sobreviviente hasta un punto
export function startObjectives(L) {
  S.objective = { steps: L.objective, i: -1, step: null, count: 0, total: 0, timer: 0, markers: L.markers.map((m) => ({ ...m, state: 0 })) };
  nextStep();
}

export function marker(id) { return S.objective.markers.find((m) => m.id === id); }

function nextStep() {
  const O = S.objective;
  O.i++;
  if (O.i >= O.steps.length) { O.step = null; bus.emit('levelComplete'); return; }
  const st = O.step = O.steps[O.i];
  O.count = 0; O.timer = 0; O.total = 1;
  if (st.type === 'collect') {
    O.total = st.spots.length;
    st.spots.forEach((s, k) => addPickup('item', s.x, s.y, { item: st.item, persist: true, objIndex: k }));
  }
  if (st.type === 'interact') { O.total = st.spots.length; O.done = st.spots.map(() => false); }
  if (st.type === 'hold' || st.type === 'survive') O.total = st.seconds * 60;
  if (st.type === 'boss') {
    const b = spawnZombie(st.zombie || 'boss', st.spawn.x, st.spawn.y);
    b.alert = true;
    S.boss = b;
    setTimeout(() => bark(anyone(), 'boss', true), 1400);
  }
  runEvents(st.onStart);
  bus.emit('objective', st);
}

function runEvents(ev) {
  if (!ev) return;
  if (ev.surge) S.surge = (S.surge || 0) + ev.surge;
  if (ev.intensity) S.spawnBoost = ev.intensity;
  if (ev.music) { playMusic(ev.music); bus.emit('music', ev.music); }
  if (ev.banner) bus.emit('banner', { text: ev.banner, danger: !!ev.danger });
  if (ev.sfx) sfx(ev.sfx);
  if (ev.marker) { const m = marker(ev.marker); if (m) m.state = ev.markerState ?? 1; }
  if (ev.subtitle) bus.emit('subtitle', ev.subtitle);
  if (ev.heli) { S.heli = { x: ev.heli.from.x, y: ev.heli.from.y, tx: ev.heli.to.x, ty: ev.heli.to.y, t: 0 }; ambient('heli', true); }
  if (ev.shake) shake(ev.shake);
  if (ev.lights) {
    // las luces se prenden en cadena, desde donde está el equipo hacia afuera
    const o = S.players.find((p) => !p.dead) || { x: 0, y: 0 };
    S.world.lamps.forEach((l) => { if (!l.lit) l.litAt = S.t + Math.round(dist(l.x, l.y, o.x, o.y) * 0.12); });
    S.timeScale = 0.4; bus.emit('lightsOn');
  }
  if (ev.flag) (S.flags ||= new Set()).add(ev.flag);
  if (ev.power) {
    (S.flags ||= new Set()).add('power');
    for (const D of S.world.doors) if (D.autoPower && !doorLocked(D).length) openDoor(S.world, D);
  }
  if (ev.follow) { const n = npc(ev.follow); if (n) n.follow = true; }
  if (ev.exitCar) { const m = marker(ev.exitCar); if (m) { m.state = 1; S.exitCar = m; } }
  if (ev.open) { const D = S.world.doors.find((d) => d.id === ev.open); if (D) { openDoor(S.world, D); shake(5); sfx('explosion', 0.4); } }
  if (ev.gunship) { S.gunship = { x: S.players[0]?.x || 0, y: (S.players[0]?.y || 0) - 200, t: 0, cd: 60 }; ambient('heli', true); }
}

// Ramiro en el helicóptero: gira sobre el equipo y dispara a los zombies cercanos
function updateGunship() {
  const g = S.gunship;
  if (!g) return;
  g.t++;
  const alive = S.players.filter((p) => !p.dead && !p.boarded);
  const cx = alive.reduce((a, p) => a + p.x, 0) / (alive.length || 1), cy = alive.reduce((a, p) => a + p.y, 0) / (alive.length || 1);
  const tx = cx + Math.cos(g.t * 0.012) * 110, ty = cy - 40 + Math.sin(g.t * 0.012) * 70;
  g.x += (tx - g.x) * 0.02; g.y += (ty - g.y) * 0.02;
  if (--g.cd > 0) return;
  let best = null, bd = 150;
  for (const z of S.zombies) {
    if (z.state === 'dying' || z.state === 'dead') continue;
    const d = dist(z.x, z.y, g.x, g.y + 30);
    if (d < bd) { bd = d; best = z; }
  }
  if (!best) { g.cd = 20; return; }
  g.cd = 26;
  sfx('rifle', 0.7);
  light(best.x, best.y - 6, 40, 'rgba(255,200,120,', 6);
  burst(best.x, best.y - 8, 6, { color: '#ffe08a', type: 'spark', lifeMul: 0.4, speed: 2 });
  damageZombie(best, 55, Math.atan2(best.y - g.y, best.x - g.x), 2, null);
}

function finishStep() {
  const st = S.objective.step;
  sfx('objective');
  runEvents(st.onDone);
  nextStep();
}

bus.on('collect', (p) => {
  (S.flags ||= new Set()).add(p.item);
  const O = S.objective;
  if (!O?.step || O.step.type !== 'collect' || p.item !== O.step.item) return;
  O.count++;
  bus.emit('objective', O.step);
  if (O.count >= O.total) finishStep();
});
bus.on('bossDown', () => {
  const O = S.objective;
  if (O?.step?.type === 'boss') finishStep();
});

export function updateObjectives() {
  const O = S.objective;
  if (!O?.step) return;
  const st = O.step;
  const alive = S.players.filter((p) => !p.dead);
  if (st.type === 'reach') {
    if (alive.some((p) => dist(p.x, p.y, st.x, st.y) < st.r)) finishStep();
  } else if (st.type === 'interact') {
    st.spots.forEach((s, k) => {
      if (O.done[k]) return;
      const near = alive.find((p) => dist(p.x, p.y, s.x, s.y) < (s.r || 18));
      if (near && near.control.pressed('KeyE')) {
        O.done[k] = true; O.count++;
        if (s.marker) { const m = marker(s.marker); if (m) m.state = 1; }
        sfx(st.sfx || 'flare');
        light(s.x, s.y, 90, 'rgba(255,80,60,', 60);
        bus.emit('objective', st);
        if (O.count >= O.total) finishStep();
      }
    });
  } else if (st.type === 'hold') {
    const inside = alive.some((p) => dist(p.x, p.y, st.x, st.y) < st.r);
    O.inside = inside;
    if (inside) O.count++;
    if (S.t % 30 === 0) bus.emit('objective', st);
    if (O.count >= O.total) finishStep();
  } else if (st.type === 'rescue') {
    const n = npc(st.npc);
    if (n && alive.some((p) => dist(p.x, p.y, n.x, n.y) < (st.r || 24))) { n.follow = true; finishStep(); }
  } else if (st.type === 'escort') {
    const n = npc(st.npc);
    if (n && !n.dead && dist(n.x, n.y, st.x, st.y) < st.r) finishStep();
  } else if (st.type === 'survive') {
    O.count++;
    if (S.t % 30 === 0) bus.emit('objective', st);
    if (st.at) for (const [sec, ev] of Object.entries(st.at)) if (O.count === Number(sec) * 60) runEvents(ev);
    if (st.dawn) S.dawn = Math.max(S.dawn || 0, O.count / O.total * st.dawn);
    if (O.count >= O.total) finishStep();
  }
  updateGunship();
  // vehículo de la escapa final alejándose
  // el barco zarpa despacio (se ve durante todo el epílogo); la ambulancia arranca rápido
  if (S.exitCar?.leaving) { const m = S.exitCar, top = m.type === 'ship' ? 0.32 : 3.2; m.vx = Math.min(top, (m.vx || 0) + (m.type === 'ship' ? 0.004 : 0.035)); m.x += m.vx; }
  // helicóptero de rescate acercándose
  if (S.heli) {
    const h = S.heli;
    h.t += h.leaving ? -1.5 : 1;
    h.x += (h.tx - h.x) * 0.006; h.y += (h.ty - h.y) * 0.006;
  }
}

export function objectiveText() {
  const O = S.objective, st = O?.step;
  if (!st) return { text: 'Completado', bar: null };
  if (st.type === 'endless') return survivalText();
  let text = st.text, bar = null;
  if (st.type === 'collect' || st.type === 'interact') text += ` ${O.count}/${O.total}`;
  if (st.type === 'hold') { bar = O.count / O.total; if (!O.inside) text = st.outside || 'Volvé a la zona'; }
  if (st.type === 'survive') { const s = Math.ceil((O.total - O.count) / 60); text += ` ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; bar = O.count / O.total; }
  if (st.type === 'boss' && S.boss) bar = Math.max(0, S.boss.hp / S.boss.maxHp);
  return { text, bar };
}

// punto hacia donde apunta la flecha del HUD
export function objectiveTarget(from) {
  const O = S.objective, st = O?.step;
  if (!st) return null;
  if (st.type === 'endless') return survivalTarget(from);
  if (st.type === 'collect') {
    let best = null, bd = 1e9;
    for (const p of S.pickups) if (p.kind === 'item' && p.item === st.item) { const d = dist(p.x, p.y, from.x, from.y); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  if (st.type === 'interact') {
    let best = null, bd = 1e9;
    st.spots.forEach((s, k) => { if (O.done[k]) return; const d = dist(s.x, s.y, from.x, from.y); if (d < bd) { bd = d; best = s; } });
    return best;
  }
  if (st.type === 'reach' || st.type === 'hold' || st.type === 'escort') return st;
  if (st.type === 'rescue') return npc(st.npc) || null;
  if (st.type === 'boss' && S.boss && S.boss.state !== 'dead') return S.boss;
  return null;
}

// aviso de "E" si hay algo para activar cerca
export function interactHint(p) {
  const O = S.objective, st = O?.step;
  if (!st || st.type !== 'interact') return null;
  const k = st.spots.findIndex((s, i) => !O.done[i] && dist(p.x, p.y, s.x, s.y) < (s.r || 18));
  return k >= 0 ? st.prompt : null;
}

// ---------------- marcadores dibujados en el mundo ----------------
export function drawGroundMarkers() {
  for (const m of S.objective?.markers || []) {
    if (m.type !== 'helipad' || !onScreen(m.x, m.y, 70)) continue;
    const X = sx(m.x), Y = sy(m.y);
    ctx.fillStyle = 'rgba(40,42,48,0.9)';
    ctx.beginPath(); ctx.ellipse(X, Y, 44, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = m.state ? '#ffcf6b' : '#c9c4b4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(X, Y, 38, 25, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = m.state ? '#ffcf6b' : '#c9c4b4';
    ctx.fillRect(X - 10, Y - 12, 4, 24); ctx.fillRect(X + 6, Y - 12, 4, 24); ctx.fillRect(X - 6, Y - 2, 12, 4);
  }
}

export function markerDrawables() {
  const out = [];
  for (const m of S.objective?.markers || []) {
    if (m.type === 'helipad' || !onScreen(m.x, m.y, 60)) continue;
    out.push({ y: m.y, draw: () => drawMarker(m) });
  }
  if (S.heli) out.push({ y: 1e9, draw: drawHeli });
  if (S.gunship) out.push({ y: 1e9 + 1, draw: drawGunship });
  return out;
}

function drawMarker(m) {
  const X = sx(m.x), Y = sy(m.y), blink = Math.floor(S.t / 20) % 2;
  if (m.type === 'generator') {
    ctx.fillStyle = '#24282b'; ctx.fillRect(X - 13, Y - 18, 26, 18);
    ctx.fillStyle = '#353b3f'; ctx.fillRect(X - 13, Y - 18, 26, 4);
    ctx.fillStyle = '#1a1d1f'; for (let i = 0; i < 4; i++) ctx.fillRect(X - 10 + i * 6, Y - 11, 3, 8);
    ctx.fillStyle = m.state ? (blink ? '#7cff8f' : '#3a9a48') : (blink ? '#ff5e4e' : '#6a2020');
    ctx.fillRect(X + 7, Y - 15, 3, 3);
    pixelText(ctx, 'ALTA TENSION', X - textWidth('ALTA TENSION') / 2, Y - 26, '#ffcf6b');
  } else if (m.type === 'antenna') {
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(X - 1, Y - 60, 3, 60);
    for (let i = 0; i < 6; i++) { ctx.fillRect(X - 5 + i, Y - 10 - i * 9, 1, 8); ctx.fillRect(X + 5 - i, Y - 10 - i * 9, 1, 8); }
    ctx.fillStyle = m.state ? (blink ? '#7cff8f' : '#2f6f3a') : (blink ? '#ff4040' : '#5a1515');
    ctx.fillRect(X - 1, Y - 63, 3, 3);
    if (m.state) {
      ctx.strokeStyle = `rgba(124,255,143,${0.5 - (S.t % 60) / 120})`;
      ctx.beginPath(); ctx.arc(X, Y - 62, (S.t % 60) / 2, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (m.type === 'wreck') {
    // helicóptero caído de costado: cuerpo, cabina rota, cola partida y aspa en el piso
    ctx.fillStyle = 'rgba(10,8,8,0.55)'; ctx.beginPath(); ctx.ellipse(X + 4, Y + 1, 44, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - 26, Y - 22, 40, 22);
    ctx.fillStyle = '#39413a'; ctx.fillRect(X - 25, Y - 21, 38, 20);
    ctx.fillStyle = '#4a544a'; ctx.fillRect(X - 25, Y - 21, 38, 4);
    ctx.fillStyle = '#243039'; ctx.fillRect(X - 25, Y - 16, 11, 11);
    ctx.fillStyle = '#6a8fa8'; ctx.fillRect(X - 23, Y - 15, 3, 4); ctx.fillRect(X - 19, Y - 12, 2, 5);
    ctx.fillStyle = '#e8483f'; ctx.fillRect(X - 6, Y - 12, 8, 2);
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(X + 13, Y - 17, 30, 7);
    ctx.fillStyle = '#39413a'; ctx.fillRect(X + 13, Y - 16, 27, 5);
    ctx.fillStyle = '#1a1d1f'; ctx.fillRect(X + 40, Y - 26, 3, 16); ctx.fillRect(X + 36, Y - 20, 11, 2);
    ctx.fillStyle = '#23262a'; ctx.fillRect(X - 48, Y + 4, 46, 2); ctx.fillRect(X - 50, Y + 3, 4, 4);
    ctx.fillStyle = '#1a1d1f'; ctx.fillRect(X - 22, Y - 1, 32, 2);
    for (const [fx, fy] of [[-12, -18], [4, -20], [16, -14]]) {
      if (Math.random() < 0.55) burst(m.x + fx + rand(-4, 4), m.y + fy, 1, { color: '#ffb347', type: 'fire', lifeMul: 0.8, grav: -0.06, lift: 1.4, speed: 0.4, size: 2 });
    }
    if (S.t % 4 === 0) burst(m.x + rand(-12, 16), m.y - 24, 1, { color: '#2a2624', type: 'smoke', lifeMul: 3.6, grav: -0.06, lift: 1.6, speed: 0.35, size: 3 });
  } else if (m.type === 'breaker') {
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - 7, Y - 22, 14, 18);
    ctx.fillStyle = '#5e5d6b'; ctx.fillRect(X - 6, Y - 21, 12, 16);
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - 1, Y - 18, 3, 9);
    ctx.fillStyle = '#a3a3a8'; ctx.fillRect(X - 2, m.state ? Y - 18 : Y - 12, 5, 3);
    ctx.fillStyle = m.state ? '#7cff8f' : (blink ? '#ff4a3a' : '#6a1c16'); ctx.fillRect(X + 3, Y - 20, 2, 2);
    pixelText(ctx, 'ALTA TENSION', X - textWidth('ALTA TENSION') / 2, Y - 30, '#ffcf6b');
  } else if (m.type === 'ambulance') {
    frame('env/ambulance', 0, m.x, m.y, {});
    if (m.state) {
      const on = Math.floor(S.t / 8) % 2;
      ctx.fillStyle = on ? '#ff4040' : '#401010'; ctx.fillRect(X - 5, Y - 26, 3, 2);
      ctx.fillStyle = on ? '#202848' : '#5078ff'; ctx.fillRect(X + 3, Y - 26, 3, 2);
    }
  } else if (m.type === 'crane') {
    // grúa portuaria: torre reticulada, cabina y pluma sobre el muelle
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - 7, Y - 118, 14, 118);
    ctx.fillStyle = '#c98f1e'; ctx.fillRect(X - 6, Y - 117, 12, 116);
    ctx.fillStyle = '#8a5f12'; for (let i = 0; i < 12; i++) { ctx.fillRect(X - 6, Y - 112 + i * 9, 12, 1); ctx.fillRect(X - 6 + (i % 2) * 10, Y - 112 + i * 9, 2, 9); }
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - 70, Y - 124, 120, 7);
    ctx.fillStyle = '#e0a52a'; ctx.fillRect(X - 69, Y - 123, 118, 5);
    ctx.fillStyle = '#39413a'; ctx.fillRect(X + 4, Y - 132, 16, 12);
    ctx.fillStyle = m.state ? '#ffcf6b' : '#1a1d1f'; ctx.fillRect(X + 7, Y - 129, 10, 5);
    const hx = X - 56 + (m.state ? Math.min(40, (S.t % 400) / 6) : 0);
    ctx.fillStyle = '#1a1d1f'; ctx.fillRect(hx, Y - 118, 1, 40); ctx.fillRect(hx - 3, Y - 78, 7, 3);
    ctx.fillStyle = m.state ? (blink ? '#7cff8f' : '#2f6f3a') : (blink ? '#ff4040' : '#5a1515'); ctx.fillRect(X - 2, Y - 10, 4, 3);
  } else if (m.type === 'lighthouse') {
    // faro: torre a franjas blancas y rojas con la linterna arriba
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(X, Y, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const w = 22 - i, y0 = Y - 12 - i * 13;
      ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - w / 2 - 1, y0 - 13, w + 2, 14);
      ctx.fillStyle = i % 2 ? '#b33a3a' : '#d8d0c2'; ctx.fillRect(X - w / 2, y0 - 12, w, 13);
    }
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - 10, Y - 128, 20, 16);
    ctx.fillStyle = m.state ? (Math.floor(S.t / 6) % 2 ? '#fff6c8' : '#ffe08a') : '#3a3a44'; ctx.fillRect(X - 8, Y - 126, 16, 11);
    ctx.fillStyle = '#39413a'; ctx.fillRect(X - 12, Y - 132, 24, 5);
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - 3, Y - 16, 6, 12);
  } else if (m.type === 'ship') {
    // La Esperanza: casco, cubierta, puente iluminado y la pasarela
    const L0 = X - 110, T0 = Y - 64;
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(L0 - 1, T0 + 20, 222, 46);
    ctx.fillStyle = '#4a1f1f'; ctx.fillRect(L0, T0 + 21, 220, 44);
    ctx.fillStyle = '#6b2a24'; ctx.fillRect(L0, T0 + 21, 220, 5);
    ctx.fillStyle = '#d8d0c2'; ctx.fillRect(L0, T0 + 50, 220, 3);
    ctx.fillStyle = '#5e5d6b'; ctx.fillRect(L0 + 6, T0 + 12, 208, 10);
    ctx.fillStyle = '#2c1d35'; ctx.fillRect(L0 + 140, T0 - 22, 54, 36);
    ctx.fillStyle = '#cccacb'; ctx.fillRect(L0 + 141, T0 - 21, 52, 34);
    ctx.fillStyle = '#ffcf6b'; for (let i = 0; i < 5; i++) ctx.fillRect(L0 + 145 + i * 10, T0 - 14, 6, 4);
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(L0 + 160, T0 - 40, 8, 19);
    ctx.fillStyle = '#7a1a14'; for (let i = 0; i < 6; i++) ctx.fillRect(L0 + 20 + i * 18, T0 + 4, 14, 9);
    pixelText(ctx, 'LA ESPERANZA', L0 + 20, T0 + 34, '#d8d0c2');
    ctx.fillStyle = Math.floor(S.t / 18) % 2 ? '#ff4040' : '#401010'; ctx.fillRect(L0 + 2, T0 + 14, 3, 3);
    ctx.fillStyle = Math.floor(S.t / 18) % 2 ? '#40ff60' : '#104018'; ctx.fillRect(L0 + 215, T0 + 14, 3, 3);
    if (m.state && !m.leaving) { ctx.fillStyle = '#704f48'; ctx.fillRect(X - 7, T0 + 64, 14, 22); ctx.fillStyle = '#5c393d'; for (let i = 0; i < 5; i++) ctx.fillRect(X - 7, T0 + 66 + i * 4, 14, 1); }
  } else if (m.type === 'flare') {
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(X - 1, Y - 6, 3, 6);
    if (m.state) {
      ctx.fillStyle = blink ? '#ff6a4a' : '#ffd08a'; ctx.fillRect(X - 1, Y - 8, 3, 3);
      if (S.t % 4 === 0) burst(m.x, m.y - 8, 1, { color: '#6a3a3a', type: 'smoke', lifeMul: 2.2, grav: -0.04, lift: 1, speed: 0.3, size: 2 });
    }
  }
}

function drawGunship() {
  const g = S.gunship, X = sx(g.x), Y = sy(g.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(X + 22, Y + 64, 24, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c1d35'; ctx.fillRect(X - 17, Y - 10, 34, 18); ctx.fillRect(X + 13, Y - 5, 26, 7);
  ctx.fillStyle = '#39413a'; ctx.fillRect(X - 16, Y - 9, 32, 16); ctx.fillRect(X + 14, Y - 4, 24, 5);
  ctx.fillStyle = '#6a8fa8'; ctx.fillRect(X - 16, Y - 7, 9, 11);
  ctx.fillStyle = Math.floor(S.t / 10) % 2 ? '#ff4040' : '#401010'; ctx.fillRect(X + 36, Y - 6, 3, 3);
  ctx.strokeStyle = 'rgba(200,210,220,0.55)'; ctx.lineWidth = 1;
  const a = S.t * 0.6;
  ctx.beginPath(); ctx.moveTo(X - Math.cos(a) * 34, Y - 12 - Math.sin(a) * 8); ctx.lineTo(X + Math.cos(a) * 34, Y - 12 + Math.sin(a) * 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X - Math.sin(a) * 34, Y - 12 + Math.cos(a) * 8); ctx.lineTo(X + Math.sin(a) * 34, Y - 12 - Math.cos(a) * 8); ctx.stroke();
  pixelText(ctx, 'RAMIRO', X - textWidth('RAMIRO') / 2, Y - 24, '#e8e2c8');
}

function drawHeli() {
  const h = S.heli, X = sx(h.x), Y = sy(h.y);
  const alt = Math.max(0, 60 - h.t * 0.12);
  // sombra en el piso, el cuerpo arriba con las aspas girando
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(X + alt * 0.4, Y + 4, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
  const bx = X, by = Y - alt;
  ctx.fillStyle = '#39413a'; ctx.fillRect(bx - 16, by - 9, 32, 16); ctx.fillRect(bx + 14, by - 4, 24, 5);
  ctx.fillStyle = '#6a8fa8'; ctx.fillRect(bx - 16, by - 7, 9, 11);
  ctx.fillStyle = '#e8483f'; ctx.fillRect(bx + 36, by - 6, 3, 3);
  ctx.strokeStyle = 'rgba(200,210,220,0.55)'; ctx.lineWidth = 1;
  const a = h.t * 0.6;
  ctx.beginPath(); ctx.moveTo(bx - Math.cos(a) * 34, by - 11 - Math.sin(a) * 8); ctx.lineTo(bx + Math.cos(a) * 34, by - 11 + Math.sin(a) * 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx - Math.sin(a) * 34, by - 11 + Math.cos(a) * 8); ctx.lineTo(bx + Math.sin(a) * 34, by - 11 - Math.cos(a) * 8); ctx.stroke();
  if (S.t % 50 === 0) light(h.x, h.y, 110, 'rgba(255,255,230,', 20);
}

export function markerLights() {
  const out = [];
  for (const m of S.objective?.markers || []) {
    if (m.type === 'generator') out.push({ x: m.x, y: m.y - 10, r: m.state ? 120 : 26, a: m.state ? 0.9 : 0.5, color: m.state ? 'rgba(124,255,143,' : 'rgba(255,80,60,' });
    if (m.type === 'antenna') out.push({ x: m.x, y: m.y - 30, r: m.state ? 90 : 20, a: 0.7, color: m.state ? 'rgba(124,255,143,' : 'rgba(255,60,60,' });
    if (m.type === 'flare' && m.state) out.push({ x: m.x, y: m.y - 8, r: 95 + Math.sin(S.t * 0.4) * 6, a: 0.95, color: 'rgba(255,70,50,' });
    if (m.type === 'helipad' && m.state) out.push({ x: m.x, y: m.y, r: 80, a: 0.6, color: 'rgba(255,207,107,' });
    if (m.type === 'wreck') out.push({ x: m.x, y: m.y - 10, r: 105 + Math.sin(S.t * 0.3) * 8 + rand(-4, 4), a: 0.9, color: 'rgba(255,120,40,' });
    if (m.type === 'breaker') out.push({ x: m.x, y: m.y - 14, r: m.state ? 40 : 22, a: 0.6, color: m.state ? 'rgba(124,255,143,' : 'rgba(255,60,60,' });
    if (m.type === 'lighthouse' && m.state) {
      out.push({ x: m.x, y: m.y - 120, r: 70, a: 0.95, color: 'rgba(255,240,190,' });
      out.push({ beam: true, x: m.x, y: m.y - 120, angle: S.t * 0.02, len: 420, half: 0.22 });
    }
    if (m.type === 'crane' && m.state) out.push({ x: m.x + 10, y: m.y - 126, r: 40, a: 0.7, color: 'rgba(255,207,107,' });
    if (m.type === 'ship') out.push({ x: m.x + 57, y: m.y - 76, r: 90, a: 0.8, color: 'rgba(255,207,107,' }, { x: m.x, y: m.y - 30, r: 60, a: 0.6 });
    if (m.type === 'ambulance') out.push({ x: m.x, y: m.y - 14, r: m.state ? 70 : 34, a: 0.8, color: m.state && Math.floor(S.t / 8) % 2 ? 'rgba(80,120,255,' : 'rgba(255,60,60,' });
  }
  if (S.heli) out.push({ x: S.heli.x, y: S.heli.y + 10, r: 70 + rand(-3, 3), a: 0.9, color: 'rgba(230,240,255,' });
  if (S.gunship) out.push({ x: S.gunship.x, y: S.gunship.y + 60, r: 62, a: 0.85, color: 'rgba(230,240,255,' });
  return out;
}
