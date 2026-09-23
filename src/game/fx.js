import { GW, GH } from '../core/config.js';
import { ctx, lctx, lightCanvas, sx, sy, frame, onScreen } from '../core/render.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { S, rand, net } from '../core/state.js';
import { sfx } from '../core/audio.js';

export const settings = { shake: true };

// Solo se graba la llamada de más afuera (blood llama a burst/splat: se
// reenvía "blood" y el cliente recrea todo lo demás).
let depth = 0;
function R(name, args, fn) {
  if (depth === 0 && net.capture && net.rec) net.rec(name, args);
  depth++;
  try { fn(); } finally { depth--; }
}

// ---------------- partículas ----------------
export function burst(x, y, n, o = {}) {
  R('burst', [x, y, n, o], () => {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + rand(-(o.spread ?? 0.6), o.spread ?? 0.6) : rand(0, Math.PI * 2);
      const sp = rand(o.speedMin ?? 0.4, o.speed ?? 2);
      S.particles.push({
        x, y, z: o.z ?? 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(0.2, o.lift ?? 1.4),
        life: rand(18, 32) * (o.lifeMul ?? 1), max: 32 * (o.lifeMul ?? 1), color: o.color || '#8e1c1c',
        size: o.size ?? (Math.random() < 0.3 ? 2 : 1), type: o.type || 'blood', grav: o.grav ?? 0.12,
      });
    }
  });
}

export function blood(x, y, angle, n = 8) {
  R('blood', [x, y, angle, n], () => {
    burst(x, y, n, { angle, spread: 0.7, speed: 2.2, color: Math.random() < 0.5 ? '#8e1c1c' : '#b02a2a', type: 'blood' });
    if (Math.random() < 0.6) splat(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6, 3);
  });
}

export function splat(x, y, size = 4) {
  R('splat', [x, y, size], () => {
    const pix = [];
    const n = size * 5;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), r = Math.pow(Math.random(), 0.7) * size * 1.6;
      pix.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r * 0.7), Math.random() < 0.3 ? '#5e1010' : '#7a1515']);
    }
    S.decals.push({ x, y, pix, a: 0.85 });
    if (S.decals.length > 320) S.decals.shift();
  });
}

export function scorch(x, y) {
  R('scorch', [x, y], () => {
    const pix = [];
    for (let i = 0; i < 90; i++) {
      const a = rand(0, Math.PI * 2), r = Math.pow(Math.random(), 0.6) * 16;
      pix.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r * 0.7), Math.random() < 0.5 ? '#141210' : '#2a2320']);
    }
    S.decals.push({ x, y, pix, a: 0.8 });
  });
}

export function casing(x, y, angle) {
  S.particles.push({ x, y, z: 8, vx: Math.cos(angle + 1.6) * rand(0.8, 1.4), vy: Math.sin(angle + 1.6) * rand(0.8, 1.4), vz: rand(1, 1.8), life: 50, max: 50, color: '#d8b24a', size: 1, type: 'casing', grav: 0.15 });
}

export function sparks(x, y, angle) {
  burst(x, y, 5, { angle: angle + Math.PI, spread: 0.9, speed: 2.4, color: '#ffe08a', type: 'spark', lifeMul: 0.4, grav: 0.05, size: 1 });
}

export function explosion(x, y) {
  R('explosion', [x, y], () => {
    burst(x, y, 26, { speed: 3.2, color: '#ffb347', type: 'fire', lifeMul: 0.8, grav: -0.02, lift: 2, size: 2 });
    burst(x, y, 16, { speed: 1.2, color: '#3a3533', type: 'smoke', lifeMul: 2.4, grav: -0.03, lift: 1, size: 3 });
    scorch(x, y);
    light(x, y, 140, 'rgba(255,170,80,', 36);
    shake(10);
    S.hitstop = 4;
    sfx('explosion');
  });
}

export function float(x, y, text, color = '#f3d27a') {
  R('float', [x, y, text, color], () => {
    S.floaters.push({ x, y, text, color, life: 50 });
  });
}

export function light(x, y, r, color, life, follow) {
  if (!follow && depth === 0 && net.capture && net.rec) net.rec('light', [x, y, r, color, life]);
  S.lights.push({ x, y, r, color, life, max: life, follow });
}

export function shake(v) { if (settings.shake) S.shake = Math.max(S.shake, v); }

export function updateFx() {
  for (const p of S.particles) {
    p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vz -= p.grav;
    if (p.type === 'smoke') { p.vx *= 0.96; p.vy *= 0.96; }
    if (p.z <= 0 && p.grav > 0) {
      p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6;
      if (p.type === 'blood' && !p.landed) { p.landed = true; if (Math.random() < 0.25) splat(p.x, p.y, 1); }
    }
    p.life--;
  }
  S.particles = S.particles.filter((p) => p.life > 0);
  if (S.particles.length > 900) S.particles.splice(0, S.particles.length - 900);
  for (const f of S.floaters) { f.y -= 0.35; f.life--; }
  S.floaters = S.floaters.filter((f) => f.life > 0);
  for (const l of S.lights) { l.life--; if (l.follow) { l.x = l.follow.x; l.y = l.follow.y; } }
  S.lights = S.lights.filter((l) => l.life > 0);
  S.shake *= 0.86; if (S.shake < 0.15) S.shake = 0;
}

export function drawDecals() {
  for (const d of S.decals) {
    if (!onScreen(d.x, d.y, 24)) continue;
    ctx.globalAlpha = d.a;
    for (const [dx, dy, c] of d.pix) { ctx.fillStyle = c; ctx.fillRect(sx(d.x + dx), sy(d.y + dy), 1, 1); }
  }
  ctx.globalAlpha = 1;
}

// glow=true dibuja solo chispas/fuego (van encima de la oscuridad para que brillen)
const GLOW = new Set(['spark', 'fire']);
export function drawParticles(glow = false) {
  for (const p of S.particles) {
    if (GLOW.has(p.type) !== glow || !onScreen(p.x, p.y, 10)) continue;
    const a = Math.min(1, p.life / p.max * 1.6);
    ctx.globalAlpha = p.type === 'smoke' ? a * 0.5 : a;
    ctx.fillStyle = p.type === 'fire' ? (p.life > p.max * 0.5 ? '#ffe08a' : '#ff7a3a') : p.color;
    ctx.fillRect(sx(p.x), sy(p.y - p.z), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

export function drawFloaters() {
  for (const f of S.floaters) {
    ctx.globalAlpha = Math.min(1, f.life / 20);
    pixelText(ctx, f.text, sx(f.x) - textWidth(f.text) / 2 + 1, sy(f.y) + 1, '#000');
    pixelText(ctx, f.text, sx(f.x) - textWidth(f.text) / 2, sy(f.y), f.color);
  }
  ctx.globalAlpha = 1;
}

// ---------------- clima ----------------
const drops = Array.from({ length: 160 }, () => ({ x: rand(0, GW), y: rand(0, GH), l: rand(5, 11), v: rand(4, 6.5) }));
const splashes = [];
const fog = Array.from({ length: 14 }, () => ({ x: rand(0, 1400), y: rand(0, 1000), r: rand(60, 130), v: rand(0.08, 0.25) }));
export const weather = { kind: 'none', flash: 0, nextBolt: 300, intensity: 1 };

export function setWeather(kind) {
  weather.kind = kind; weather.flash = 0; weather.nextBolt = 200 + Math.random() * 300;
}

export function updateWeather() {
  const heavy = weather.kind === 'storm';
  if (weather.kind === 'rain' || heavy) {
    const n = heavy ? 160 : 90;
    for (let i = 0; i < n; i++) {
      const d = drops[i];
      d.x -= heavy ? 2.2 : 1.3; d.y += d.v * (heavy ? 1.25 : 1);
      if (d.y > GH || d.x < -12) {
        if (Math.random() < 0.3) splashes.push({ x: d.x, y: rand(20, GH), life: 8 });
        d.y = rand(-20, 0); d.x = rand(0, GW + 60);
      }
    }
    for (const s of splashes) s.life--;
    while (splashes.length && splashes[0].life <= 0) splashes.shift();
  }
  if (heavy) {
    weather.flash *= 0.88;
    if (--weather.nextBolt <= 0) {
      weather.flash = 1; weather.nextBolt = 260 + Math.random() * 420;
      setTimeout(() => { weather.flash = Math.max(weather.flash, 0.7); }, 120);
      setTimeout(() => sfx('thunder'), 300 + Math.random() * 900);
    }
  }
  if (weather.kind === 'fog') for (const f of fog) { f.x += f.v; if (f.x > S.world.W + 150) f.x = -150; }
  if (weather.kind === 'ash') {
    for (let i = 0; i < 70; i++) {
      const d = drops[i];
      d.x += Math.sin((S.t + i * 37) * 0.02) * 0.3 - 0.15; d.y += d.v * 0.1;
      if (d.y > GH) { d.y = rand(-10, 0); d.x = rand(0, GW); }
      if (d.x < -4) d.x = GW;
    }
  }
}

export function drawWeather() {
  const heavy = weather.kind === 'storm';
  if (weather.kind === 'rain' || heavy) {
    ctx.strokeStyle = heavy ? 'rgba(170,190,220,0.4)' : 'rgba(170,190,220,0.3)';
    ctx.lineWidth = 1; ctx.beginPath();
    const n = heavy ? 160 : 90, dx = heavy ? 4 : 3;
    for (let i = 0; i < n; i++) { const d = drops[i]; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + dx, d.y - d.l); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(190,210,235,0.35)';
    for (const s of splashes) { ctx.fillRect(s.x - 1, s.y, 1, 1); ctx.fillRect(s.x + 1, s.y, 1, 1); ctx.fillRect(s.x, s.y - 1, 1, 1); }
  }
  if (weather.kind === 'ash') {
    for (let i = 0; i < 70; i++) {
      const d = drops[i];
      ctx.fillStyle = i % 9 === 0 ? `rgba(255,${140 + (i % 5) * 20},60,${0.5 + Math.sin(S.t * 0.1 + i) * 0.3})` : 'rgba(170,165,160,0.45)';
      ctx.fillRect(Math.round(d.x), Math.round(d.y), i % 4 === 0 ? 2 : 1, 1);
    }
    // cielo tiñido por el incendio
    ctx.fillStyle = 'rgba(120,50,20,0.08)'; ctx.fillRect(0, 0, GW, GH);
  }
  if (weather.kind === 'fog') {
    for (const f of fog) {
      const X = f.x - S.cam.x * 0.9, Y = f.y - S.cam.y * 0.9;
      if (X < -f.r || X > GW + f.r || Y < -f.r || Y > GH + f.r) continue;
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, f.r);
      g.addColorStop(0, 'rgba(150,155,165,0.16)'); g.addColorStop(1, 'rgba(150,155,165,0)');
      ctx.fillStyle = g; ctx.fillRect(X - f.r, Y - f.r, f.r * 2, f.r * 2);
    }
  }
}

// ---------------- iluminación ----------------
// Se pinta oscuridad en lightCanvas y se "recorta" con destination-out en
// cada fuente de luz; después se suma un tinte cálido con 'lighter'.
function hole(x, y, r, a = 1) {
  const g = lctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, Math.PI * 2); lctx.fill();
}

export function drawLighting(extra) {
  const L = S.level, W = S.world;
  const dark = Math.min(0.97, (L.darkness ?? 0.9) + (S.diff?.dark || 0)) * (1 - weather.flash * 0.85);
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, GW, GH);
  lctx.fillStyle = `rgba(3,5,12,${dark})`;
  lctx.fillRect(0, 0, GW, GH);
  lctx.globalCompositeOperation = 'destination-out';
  for (const p of S.players) {
    if ((p.dead && p.deadT > 120) || p.boarded) continue;
    const X = sx(p.x), Y = sy(p.y - 6);
    hole(X, Y, p.lightOn ? 50 : 26, 0.9);
    if (p.lightOn && !p.dead) {
      const len = 150, half = 0.46;
      lctx.save(); lctx.translate(X, Y); lctx.rotate(p.aim);
      const g = lctx.createRadialGradient(0, 0, 6, 0, 0, len);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.7, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      lctx.fillStyle = g; lctx.beginPath(); lctx.moveTo(0, 0); lctx.arc(0, 0, len, -half, half); lctx.closePath(); lctx.fill();
      lctx.restore();
    }
  }
  for (const l of W.lamps) if (l.on && onScreen(l.x, l.y, l.r)) hole(sx(l.x), sy(l.y - 8), l.r, l.emergency ? 0.55 : 0.85);
  for (const l of S.lights) if (onScreen(l.x, l.y, l.r)) hole(sx(l.x), sy(l.y), l.r * (0.6 + 0.4 * l.life / l.max), Math.min(1, l.life / l.max * 1.5));
  extra?.forEach((e) => { if (onScreen(e.x, e.y, e.r)) hole(sx(e.x), sy(e.y), e.r, e.a ?? 0.8); });
  lctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0);

  // tinte de color de las luces (suma)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of W.lamps) {
    if (!l.on || !onScreen(l.x, l.y, l.r)) continue;
    const X = sx(l.x), Y = sy(l.y - 8);
    const col = l.color || 'rgba(255,180,90,';
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, l.r * 0.8);
    g.addColorStop(0, `${col}${l.emergency ? 0.3 : 0.16})`); g.addColorStop(1, `${col}0)`);
    ctx.fillStyle = g; ctx.fillRect(X - l.r, Y - l.r, l.r * 2, l.r * 2);
  }
  for (const l of S.lights) {
    if (!l.color || !onScreen(l.x, l.y, l.r)) continue;
    const X = sx(l.x), Y = sy(l.y), a = (l.life / l.max) * 0.45;
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, l.r * 0.7);
    g.addColorStop(0, `${l.color}${a})`); g.addColorStop(1, `${l.color}0)`);
    ctx.fillStyle = g; ctx.fillRect(X - l.r, Y - l.r, l.r * 2, l.r * 2);
  }
  extra?.forEach((e) => {
    if (!e.color || !onScreen(e.x, e.y, e.r)) return;
    const X = sx(e.x), Y = sy(e.y);
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, e.r * 0.8);
    g.addColorStop(0, `${e.color}0.25)`); g.addColorStop(1, `${e.color}0)`);
    ctx.fillStyle = g; ctx.fillRect(X - e.r, Y - e.r, e.r * 2, e.r * 2);
  });
  if (weather.flash > 0.05) { ctx.fillStyle = `rgba(200,215,255,${weather.flash * 0.25})`; ctx.fillRect(0, 0, GW, GH); }
  ctx.restore();
}

// ---------------- look de cine ----------------
const grain = Array.from({ length: 60 }, () => [0, 0]);
export function drawCinema(hurt, bars) {
  // viñeta
  const g = ctx.createRadialGradient(GW / 2, GH / 2, GH * 0.35, GW / 2, GH / 2, GW * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, GW, GH);
  if (hurt > 0) {
    const h = ctx.createRadialGradient(GW / 2, GH / 2, GH * 0.25, GW / 2, GH / 2, GW * 0.6);
    h.addColorStop(0, 'rgba(120,0,0,0)'); h.addColorStop(1, `rgba(140,0,0,${hurt})`);
    ctx.fillStyle = h; ctx.fillRect(0, 0, GW, GH);
  }
  // grano de película
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (const p of grain) { p[0] = Math.random() * GW; p[1] = Math.random() * GH; ctx.fillRect(p[0], p[1], 1, 1); }
  // franjas de cine
  if (bars > 0) {
    const h = Math.round(24 * bars);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, GW, h); ctx.fillRect(0, GH - h, GW, h);
  }
}

export function drawMuzzle(x, y, angle, f) {
  frame('fx/muzzle', f, x, y, { rot: angle, ax: 0, ay: 0.5 });
}

// para que el cliente reproduzca los efectos que manda el anfitrión
export const FX = { burst: (...a) => burst(...a), blood: (...a) => blood(...a), splat: (...a) => splat(...a), scorch: (...a) => scorch(...a), explosion: (...a) => explosion(...a), float: (...a) => float(...a), light: (...a) => light(...a) };
