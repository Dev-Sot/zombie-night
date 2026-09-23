// Marcas en el mapa ("vengan acá", "zombie grande"). Son cosméticas: cada
// cliente las dibuja; la red solo reenvía {idx, x, y, kind, zid}.
import { GW, GH } from '../core/config.js';
import { ctx, sx, sy } from '../core/render.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { S, dist, clamp } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { TINT_CSS } from './player.js';

const LIFE = 360;
const LABEL = { here: 'AQUI', zombie: 'ZOMBIE', item: 'ITEM', shop: 'TIENDA', help: 'AYUDA' };
const COLOR = { zombie: '#e8483f', item: '#ffcf6b', shop: '#ffcf6b' };

// qué hay bajo el cursor
export function pingTarget(x, y, from) {
  let z = null, zd = 18;
  for (const q of S.zombies) {
    if (q.state === 'dying' || q.state === 'dead') continue;
    const d = dist(q.x, q.y - 8 * (q.scale || 1), x, y);
    if (d < zd * (q.scale || 1)) { zd = d; z = q; }
  }
  if (z) return { x: z.x, y: z.y, kind: 'zombie', zid: z.id };
  const it = S.pickups.find((p) => dist(p.x, p.y, x, y) < 14);
  if (it) return { x: it.x, y: it.y, kind: 'item' };
  const s = S.level?.shop;
  if (s && dist(s.x, s.y, x, y) < 26) return { x: s.x, y: s.y, kind: 'shop' };
  const fallen = S.players.find((p) => p !== from && p.dead && dist(p.x, p.y, x, y) < 16);
  if (fallen) return { x: fallen.x, y: fallen.y, kind: 'help' };
  return { x, y, kind: 'here' };
}

export function addPing(pg) {
  S.pings = (S.pings || []).filter((p) => p.idx !== pg.idx);
  S.pings.push({ ...pg, t: LIFE });
  sfx('ping');
}

export function updatePings() {
  if (!S.pings) return;
  for (const p of S.pings) {
    p.t--;
    if (p.zid) {
      const z = S.zombies.find((q) => q.id === p.zid);
      if (z && z.state !== 'dying' && z.state !== 'dead') { p.x = z.x; p.y = z.y; } else p.t = Math.min(p.t, 20);
    }
  }
  S.pings = S.pings.filter((p) => p.t > 0);
}

export function drawPings() {
  for (const p of S.pings || []) {
    const col = COLOR[p.kind] || TINT_CSS[p.idx] || '#e9e6df';
    const a = Math.min(1, p.t / 30);
    const label = LABEL[p.kind];
    const X = p.x - S.cam.x, Y = p.y - S.cam.y;
    ctx.globalAlpha = a;
    if (X > -4 && X < GW + 4 && Y > -4 && Y < GH + 4) {
      const k = (S.t % 50) / 50;
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(Math.round(X), Math.round(Y), 5 + k * 9, (5 + k * 9) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      // pin
      const top = Math.round(Y - 24 - Math.sin(S.t * 0.15) * 2);
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(X), top + 7, 1, Y - top - 7);
      ctx.fillRect(Math.round(X) - 2, top + 2, 5, 5);
      ctx.fillStyle = '#000'; ctx.fillRect(Math.round(X) - 1, top + 3, 3, 3);
      ctx.fillStyle = col; ctx.fillRect(Math.round(X), top + 4, 1, 1);
      const w = textWidth(label);
      pixelText(ctx, label, Math.round(X - w / 2) + 1, top - 5, '#000');
      pixelText(ctx, label, Math.round(X - w / 2), top - 6, col);
    } else {
      // fuera de pantalla: rombo en el borde
      const cx = GW / 2, cy = GH / 2, ang = Math.atan2(Y - cy, X - cx);
      const ex = clamp(cx + Math.cos(ang) * 400, 10, GW - 10), ey = clamp(cy + Math.sin(ang) * 400, 26, GH - 36);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(ex, ey - 5); ctx.lineTo(ex + 5, ey); ctx.lineTo(ex, ey + 5); ctx.lineTo(ex - 5, ey); ctx.closePath(); ctx.fill();
      const w = textWidth(label);
      pixelText(ctx, label, Math.round(clamp(ex - w / 2, 2, GW - w - 2)), Math.round(ey + 8), col);
    }
    ctx.globalAlpha = 1;
  }
}
