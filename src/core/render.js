import { GW, GH } from './config.js';
import { sheet } from './assets.js';
import { S } from './state.js';

export const canvas = document.getElementById('game');
canvas.width = GW; canvas.height = GH;
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// capa de oscuridad/luces: se pinta aparte y se compone encima del mundo
export const lightCanvas = document.createElement('canvas');
lightCanvas.width = GW; lightCanvas.height = GH;
export const lctx = lightCanvas.getContext('2d');

export const sx = (x) => Math.round(x - S.cam.x);
export const sy = (y) => Math.round(y - S.cam.y);
export const onScreen = (x, y, m = 40) => x - S.cam.x > -m && x - S.cam.x < GW + m && y - S.cam.y > -m && y - S.cam.y < GH + m;

// Dibuja un frame de una tira. anchor 'feet' = (x,y) es el centro de los pies.
export function frame(key, f, x, y, o = {}) {
  const s = sheet(key);
  if (!s || !s.img.naturalWidth) return;
  const fi = Math.floor(f) % s.frames;
  const scale = o.scale || 1;
  const w = s.fw * scale, h = s.fh * scale;
  ctx.save();
  ctx.translate(sx(x), sy(y));
  if (o.rot) ctx.rotate(o.rot);
  if (o.flipX) ctx.scale(-1, 1);
  if (o.flipY) ctx.scale(1, -1);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.filter) ctx.filter = o.filter;
  const ax = o.ax ?? 0.5, ay = o.ay ?? (o.anchor === 'center' ? 0.5 : 1);
  ctx.drawImage(s.img, fi * s.fw, 0, s.fw, s.fh, -w * ax, -h * ay, w, h);
  ctx.restore();
}

// Sprite de un solo frame dibujado con su esquina superior izquierda en (x,y).
export function sprite(key, x, y, o = {}) {
  const s = sheet(key);
  if (!s || !s.img.naturalWidth) return;
  if (o.alpha != null || o.filter) {
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.filter) ctx.filter = o.filter;
    ctx.drawImage(s.img, sx(x), sy(y));
    ctx.restore();
  } else ctx.drawImage(s.img, sx(x), sy(y));
}

export function spriteSize(key) {
  const s = sheet(key);
  return s ? { w: s.fw, h: s.fh } : { w: 0, h: 0 };
}

// Patrón repetido anclado a coordenadas de mundo (no se "desliza" al mover la cámara).
const patterns = {};
export function fillPattern(key, x, y, w, h, filter) {
  const s = sheet(key);
  if (!s || !s.img.naturalWidth) return;
  const p = patterns[key] ||= ctx.createPattern(s.img, 'repeat');
  p.setTransform(new DOMMatrix().translate(-S.cam.x, -S.cam.y));
  if (filter) { ctx.save(); ctx.filter = filter; }
  ctx.fillStyle = p;
  ctx.fillRect(sx(x), sy(y), Math.round(w), Math.round(h));
  if (filter) ctx.restore();
}

export function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(sx(x), sy(y), Math.round(w), Math.round(h));
}
