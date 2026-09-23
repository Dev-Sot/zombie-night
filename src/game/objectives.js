import { ctx, sx, sy, onScreen } from '../core/render.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { S, dist, bus, rand } from '../core/state.js';
import { sfx, playMusic, ambient } from '../core/audio.js';
import { addPickup } from './pickups.js';
import { spawnZombie } from './zombies.js';
import { burst, light, shake } from './fx.js';

// Cada nivel define una lista de pasos; se completan en orden.
//   collect  — juntar ítems en puntos fijos
//   reach    — llegar a un lugar
//   interact — pararse en uno o más puntos y apretar E
//   hold     — mantenerse dentro de un radio N segundos (la barra se congela si salís)
//   survive  — aguantar N segundos
//   boss     — matar al jefe
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
    const b = spawnZombie('boss', st.spawn.x, st.spawn.y);
    b.alert = true;
    S.boss = b;
  }
  runEvents(st.onStart);
  bus.emit('objective', st);
}

function runEvents(ev) {
  if (!ev) return;
  if (ev.surge) S.surge = (S.surge || 0) + ev.surge;
  if (ev.intensity) S.spawnBoost = ev.intensity;
  if (ev.music) playMusic(ev.music);
  if (ev.banner) bus.emit('banner', { text: ev.banner, danger: !!ev.danger });
  if (ev.sfx) sfx(ev.sfx);
  if (ev.marker) { const m = marker(ev.marker); if (m) m.state = ev.markerState ?? 1; }
  if (ev.subtitle) bus.emit('subtitle', ev.subtitle);
  if (ev.heli) { S.heli = { x: ev.heli.from.x, y: ev.heli.from.y, tx: ev.heli.to.x, ty: ev.heli.to.y, t: 0 }; ambient('heli', true); }
  if (ev.shake) shake(ev.shake);
  if (ev.lights) { S.world.lamps.forEach((l) => { l.lit = true; }); S.timeScale = 0.4; bus.emit('lightsOn'); }
}

function finishStep() {
  const st = S.objective.step;
  sfx('objective');
  runEvents(st.onDone);
  nextStep();
}

bus.on('collect', (p) => {
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
  } else if (st.type === 'survive') {
    O.count++;
    if (S.t % 30 === 0) bus.emit('objective', st);
    if (st.at) for (const [sec, ev] of Object.entries(st.at)) if (O.count === Number(sec) * 60) runEvents(ev);
    if (O.count >= O.total) finishStep();
  }
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
  if (st.type === 'reach' || st.type === 'hold') return st;
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
  } else if (m.type === 'flare') {
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(X - 1, Y - 6, 3, 6);
    if (m.state) {
      ctx.fillStyle = blink ? '#ff6a4a' : '#ffd08a'; ctx.fillRect(X - 1, Y - 8, 3, 3);
      if (S.t % 4 === 0) burst(m.x, m.y - 8, 1, { color: '#6a3a3a', type: 'smoke', lifeMul: 2.2, grav: -0.04, lift: 1, speed: 0.3, size: 2 });
    }
  }
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
  }
  if (S.heli) out.push({ x: S.heli.x, y: S.heli.y + 10, r: 70 + rand(-3, 3), a: 0.9, color: 'rgba(230,240,255,' });
  return out;
}
