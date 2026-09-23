import { GW, GH, TILE } from '../core/config.js';
import { sheet } from '../core/assets.js';
import { ctx, sx, sy, sprite, fillPattern, rect, onScreen } from '../core/render.js';
import { pixelText, textWidth } from '../core/pixelfont.js';
import { S, net } from '../core/state.js';

// ---------------------------------------------------------------------------
// Props: caja de colisión relativa al sprite (x,y,w,h desde su esquina sup.
// izquierda). Perspectiva 3/4: solo "el pie" del objeto choca, así uno puede
// pararse detrás de un auto y quedar tapado por él.
// ---------------------------------------------------------------------------
const box = (x, y, w, h) => ({ x, y, w, h });
const CAR_V = (w, h) => box(2, 8, w - 4, h - 10);
const PROP_DEFS = {
  car_red: { hit: CAR_V, bullets: true, shadow: true }, car_blue: { hit: CAR_V, bullets: true, shadow: true },
  car_rust: { hit: CAR_V, bullets: true, shadow: true }, car_flipped: { hit: CAR_V, bullets: true, shadow: true },
  car_gray: { hit: (w, h) => box(2, 6, w - 4, h - 7), bullets: true, shadow: true },
  car_scrap: { hit: (w, h) => box(2, 6, w - 4, h - 7), bullets: true, shadow: true },
  van: { hit: (w, h) => box(2, 8, w - 4, h - 9), bullets: true, shadow: true },
  bus: { hit: (w, h) => box(2, 8, w - 4, h - 9), bullets: true, shadow: true },
  truck: { hit: (w, h) => box(8, 14, w - 16, h - 22), bullets: true, shadow: true },
  tractor: { hit: (w, h) => box(3, 10, w - 6, h - 12), bullets: true, shadow: true },
  container_gray: { hit: (w, h) => box(0, 8, w, h - 8), bullets: true, shadow: true },
  container_red: { hit: (w, h) => box(0, 8, w, h - 8), bullets: true, shadow: true },
  container_green_v: { hit: (w, h) => box(0, 10, w, h - 10), bullets: true, shadow: true },
  vending_red: { hit: (w, h) => box(1, 12, w - 2, h - 12), bullets: true },
  vending_blue: { hit: (w, h) => box(1, 12, w - 2, h - 12), bullets: true },
  fridge: { hit: (w, h) => box(1, 14, w - 2, h - 14), bullets: true },
  garbage_bin: { hit: (w, h) => box(1, 10, w - 2, h - 10), bullets: true },
  bench: { hit: (w, h) => box(1, 8, w - 2, h - 8) },
  barrel_red: { hit: (w, h) => box(2, 7, w - 4, h - 7), bullets: true, explosive: true },
  barrel_blue: { hit: (w, h) => box(1, 7, w - 2, h - 7), bullets: true },
  trash_can: { hit: (w, h) => box(2, 6, w - 4, h - 6) },
  hydrant: { hit: (w, h) => box(2, 9, w - 4, h - 9) },
  cart: { hit: (w, h) => box(1, 8, w - 2, h - 8) },
  streetlight: { hit: () => box(1, 45, 4, 4), bullets: true },
  stop_sign: { hit: () => box(6, 21, 4, 4) },
  spruce_green: { hit: () => box(5, 24, 6, 5), bullets: true }, spruce_dead: { hit: () => box(5, 24, 6, 5), bullets: true },
  pine_green: { hit: () => box(10, 43, 7, 6), bullets: true }, pine_dead: { hit: () => box(10, 43, 7, 6), bullets: true },
  tree_green: { hit: () => box(7, 25, 7, 5), bullets: true }, tree_dead: { hit: () => box(7, 25, 7, 5), bullets: true },
  birch_green: { hit: () => box(15, 39, 9, 6), bullets: true }, birch_dead: { hit: () => box(15, 39, 9, 6), bullets: true },
};
const FLAT = new Set(['tuft_green', 'tuft_dead', 'puddle', 'manhole', 'cardboard', 'posters', 'trash_bag']);

const FACADE = 30; // alto visible de la pared en perspectiva 3/4

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------------------
export function buildWorld(L) {
  const R = seeded(L.id * 7919 + 13);
  const W = {
    W: L.W, H: L.H, base: L.ground, baseFilter: L.groundFilter,
    areas: L.areas || [], lines: L.lines || [], zebras: L.zebras || [],
    solids: [], props: [], buildings: [], lamps: [], hash: new Map(), R,
  };

  for (const b of L.buildings || []) addBuilding(W, b, R);
  for (const p of L.props || []) addProp(W, p.k, p.x, p.y, p);
  for (const l of L.lamps || []) {
    addProp(W, 'streetlight', l.x - 3, l.y - 49, {});
    W.lamps.push({ x: l.x, y: l.y, r: l.r || 78, flicker: !!l.flicker, on: true, t: R() * 100 });
  }
  for (const f of L.fences || []) {
    for (let i = 0; i < f.len; i += 48) addProp(W, 'fence', f.x + i, f.y, { solid: false });
  }
  // relleno decorativo (árboles, pasto) sin pisar calles, edificios ni zonas de juego
  const clear = [...(L.keepClear || []), ...W.areas.filter((a) => a.road)];
  for (const sc of L.scatter || []) {
    for (let i = 0, tries = 0; i < sc.n && tries < sc.n * 12; tries++) {
      const k = Array.isArray(sc.k) ? sc.k[Math.floor(R() * sc.k.length)] : sc.k;
      const s = sheet(`env/${k}`);
      if (!s) break;
      const a = sc.area || { x: 0, y: 0, w: L.W, h: L.H };
      const x = a.x + R() * (a.w - s.fw), y = a.y + R() * (a.h - s.fh);
      const r = { x: x - 4, y: y + s.fh * 0.5, w: s.fw + 8, h: s.fh * 0.5 + 4 };
      if (clear.some((c) => overlap(r, c)) || W.solids.some((c) => overlap(r, c))) continue;
      if (W.props.some((p) => !p.flat && Math.abs(p.x - x) < 10 && Math.abs(p.y - y) < 10)) continue;
      addProp(W, k, x, y, {});
      i++;
    }
  }
  rebuildHash(W);
  buildGrid(W);
  return W;
}

function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function addBuilding(W, b, R) {
  const B = {
    ...b, kind: 'building', sortY: b.y + b.h, doorX: b.door ?? 0.5,
    roofDecor: [],
  };
  const roofH = b.h - FACADE;
  const n = Math.max(1, Math.floor(b.w / 60));
  for (let i = 0; i < n; i++) {
    const k = ['vent', 'hvac', 'antenna'][Math.floor(R() * 3)];
    B.roofDecor.push({ k, x: b.x + 8 + R() * (b.w - 30), y: b.y + 6 + R() * Math.max(1, roofH - 24) });
  }
  W.buildings.push(B);
  W.solids.push({ x: b.x, y: b.y, w: b.w, h: b.h, bullets: true, ref: B });
}

export function addProp(W, k, x, y, opt = {}) {
  const s = sheet(`env/${k}`);
  if (!s) return null;
  const def = PROP_DEFS[k];
  const P = { id: W.props.length, k, x, y, w: s.fw, h: s.fh, sortY: FLAT.has(k) ? -1e9 : y + s.fh, flat: FLAT.has(k), def, hp: def?.explosive ? 20 : 0, ...opt };
  W.props.push(P);
  if (def && opt.solid !== false) {
    const hb = def.hit(s.fw, s.fh);
    const solid = { x: x + hb.x, y: y + hb.y, w: hb.w, h: hb.h, bullets: !!def.bullets, ref: P };
    P.solid = solid;
    W.solids.push(solid);
  }
  return P;
}

export function removeProp(W, P) {
  if (net.capture && net.rec) net.rec('propGone', [P.id]);
  W.props = W.props.filter((p) => p !== P);
  if (P.solid) W.solids = W.solids.filter((s) => s !== P.solid);
  rebuildHash(W);
  buildGrid(W);
}

// ---------------- colisiones (hash espacial de 64px) ----------------
const HC = 64;
function rebuildHash(W) {
  W.hash = new Map();
  for (const s of W.solids) {
    for (let cx = Math.floor(s.x / HC); cx <= Math.floor((s.x + s.w) / HC); cx++) {
      for (let cy = Math.floor(s.y / HC); cy <= Math.floor((s.y + s.h) / HC); cy++) {
        const key = cx * 1000 + cy;
        if (!W.hash.has(key)) W.hash.set(key, []);
        W.hash.get(key).push(s);
      }
    }
  }
}
function near(W, x, y, r) {
  const out = new Set();
  for (let cx = Math.floor((x - r) / HC); cx <= Math.floor((x + r) / HC); cx++) {
    for (let cy = Math.floor((y - r) / HC); cy <= Math.floor((y + r) / HC); cy++) {
      const l = W.hash.get(cx * 1000 + cy);
      if (l) l.forEach((s) => out.add(s));
    }
  }
  return out;
}

export function solidAtCircle(x, y, r) {
  const W = S.world;
  for (const s of near(W, x, y, r)) {
    const nx = Math.max(s.x, Math.min(x, s.x + s.w)), ny = Math.max(s.y, Math.min(y, s.y + s.h));
    if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return s;
  }
  return null;
}

export function bulletSolidAt(x, y) {
  const W = S.world;
  for (const s of near(W, x, y, 1)) {
    if (s.bullets && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}

// Mueve por ejes separados: si choca en X se desliza en Y (y viceversa).
export function moveEntity(e, dx, dy) {
  const W = S.world;
  if (dx && !solidAtCircle(e.x + dx, e.y - 2, e.r)) e.x += dx;
  if (dy && !solidAtCircle(e.x, e.y + dy - 2, e.r)) e.y += dy;
  e.x = Math.max(e.r, Math.min(W.W - e.r, e.x));
  e.y = Math.max(e.r + 4, Math.min(W.H - 2, e.y));
}

export function lineClear(x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 6);
  for (let i = 1; i < n; i++) {
    if (bulletSolidAt(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n)) return false;
  }
  return true;
}

// ---------------- navegación: campo de flujo por BFS ----------------
// Cada ~1/3 s se recalcula la distancia (en celdas de 16px) desde el jugador
// a todo el mapa; los zombies bajan por el gradiente y rodean edificios.
function buildGrid(W) {
  W.cols = Math.ceil(W.W / TILE); W.rows = Math.ceil(W.H / TILE);
  W.block = new Uint8Array(W.cols * W.rows);
  for (let cy = 0; cy < W.rows; cy++) {
    for (let cx = 0; cx < W.cols; cx++) {
      const x = cx * TILE + 8, y = cy * TILE + 8;
      W.block[cy * W.cols + cx] = W.solids.some((s) => x > s.x - 5 && x < s.x + s.w + 5 && y > s.y - 5 && y < s.y + s.h + 5) ? 1 : 0;
    }
  }
  W.flow = new Int16Array(W.cols * W.rows).fill(-1);
}

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// targets: lista de {x,y}; BFS con varias fuentes (cada zombie va al jugador más cercano por camino)
export function updateFlow(targets) {
  const W = S.world, { cols, rows, block, flow } = W;
  flow.fill(-1);
  const q = new Int32Array(cols * rows);
  let head = 0, tail = 0;
  for (const t of targets) {
    const sx0 = Math.max(0, Math.min(cols - 1, Math.floor(t.x / TILE)));
    const sy0 = Math.max(0, Math.min(rows - 1, Math.floor(t.y / TILE)));
    const start = sy0 * cols + sx0;
    if (flow[start] === 0) continue;
    flow[start] = 0; q[tail++] = start;
  }
  while (head < tail) {
    const c = q[head++], cx = c % cols, cy = (c / cols) | 0, d = flow[c];
    for (const [ox, oy] of NB) {
      const nx = cx + ox, ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = ny * cols + nx;
      if (flow[n] !== -1 || block[n]) continue;
      if (ox && oy && (block[cy * cols + nx] || block[ny * cols + cx])) continue;
      flow[n] = d + 1; q[tail++] = n;
    }
  }
}

// Devuelve el centro de la celda vecina con menor distancia al jugador.
export function flowTarget(x, y) {
  const W = S.world, { cols, rows, flow } = W;
  const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
  if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return null;
  let best = flow[cy * cols + cx], bx = -1, by = -1;
  for (const [ox, oy] of NB) {
    const nx = cx + ox, ny = cy + oy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    const v = flow[ny * cols + nx];
    if (v >= 0 && (best < 0 || v < best)) { best = v; bx = nx; by = ny; }
  }
  return bx < 0 ? null : { x: bx * TILE + 8, y: by * TILE + 8 };
}

export function cellFree(x, y) {
  const W = S.world;
  const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
  if (cx < 0 || cy < 0 || cx >= W.cols || cy >= W.rows) return false;
  return !W.block[cy * W.cols + cx];
}

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------
export function drawGround() {
  const W = S.world, c = S.cam;
  fillPattern(`env/${W.base}`, c.x, c.y, GW, GH, W.baseFilter);
  for (const a of W.areas) {
    if (a.x > c.x + GW || a.y > c.y + GH || a.x + a.w < c.x || a.y + a.h < c.y) continue;
    fillPattern(`env/${a.tile}`, a.x, a.y, a.w, a.h, a.filter);
    if (a.edge) {
      ctx.strokeStyle = a.edge; ctx.lineWidth = 1;
      ctx.strokeRect(sx(a.x) + 0.5, sy(a.y) + 0.5, Math.round(a.w) - 1, Math.round(a.h) - 1);
    }
  }
  ctx.fillStyle = 'rgba(235,230,210,0.55)';
  for (const l of W.lines) {
    if (l.y1 === l.y2) {
      for (let x = l.x1; x < l.x2; x += 24) if (onScreen(x, l.y1)) ctx.fillRect(sx(x), sy(l.y1), 12, 2);
    } else {
      for (let y = l.y1; y < l.y2; y += 24) if (onScreen(l.x1, y)) ctx.fillRect(sx(l.x1), sy(y), 2, 12);
    }
  }
  for (const z of W.zebras) {
    ctx.fillStyle = 'rgba(225,225,215,0.7)';
    if (z.dir === 'v') { for (let x = z.x; x < z.x + z.w; x += 8) ctx.fillRect(sx(x), sy(z.y), 4, z.h); }
    else { for (let y = z.y; y < z.y + z.h; y += 8) ctx.fillRect(sx(z.x), sy(y), z.w, 4); }
  }
  // sombras suaves al sur/este de edificios y vehículos (da volumen)
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  for (const b of W.buildings) {
    if (!onScreen(b.x, b.y, b.w + b.h)) continue;
    ctx.fillRect(sx(b.x + 5), sy(b.y + b.h), b.w, 7);
    ctx.fillRect(sx(b.x + b.w), sy(b.y + 8), 6, b.h - 1);
  }
  for (const p of W.props) {
    if (!p.def?.shadow || !onScreen(p.x, p.y)) continue;
    ctx.beginPath(); ctx.ellipse(sx(p.x + p.w / 2 + 2), sy(p.y + p.h - 2), p.w / 2 + 1, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of W.props) if (p.flat && onScreen(p.x, p.y)) sprite(`env/${p.k}`, p.x, p.y);
}

function drawRoof(b) {
  const roofH = b.h - FACADE;
  const s = sheet(`env/roof_${b.roof || 'gray'}`);
  if (!s) { rect(b.x, b.y, b.w, roofH, '#3a3a44'); return; }
  ctx.save();
  if (b.roofFilter) ctx.filter = b.roofFilter;
  // el techo se arma en "naves" de hasta 80px con su cumbrera al medio
  for (let by = 0; by < roofH; by += 80) {
    const bayH = Math.min(80, roofH - by), top = Math.floor((bayH - 8) / 2), bot = bayH - 8 - top;
    for (let bx = 0; bx < b.w; bx += 48) {
      const w = Math.min(48, b.w - bx), X = sx(b.x + bx), Y = sy(b.y + by);
      ctx.drawImage(s.img, 0, 36 - top, w, top, X, Y, w, top);
      ctx.drawImage(s.img, 0, 36, w, 8, X, Y + top, w, 8);
      ctx.drawImage(s.img, 0, 44, w, bot, X, Y + top + 8, w, bot);
    }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
  ctx.strokeRect(sx(b.x) + 0.5, sy(b.y) + 0.5, b.w - 1, roofH);
  for (const d of b.roofDecor) sprite(`env/${d.k}`, d.x, d.y);
}

function drawBuilding(b) {
  const roofH = b.h - FACADE, fy = b.y + roofH;
  drawRoof(b);
  fillPattern(`env/wall_${b.wall || 'beige'}`, b.x, fy, b.w, FACADE, b.wallFilter);
  rect(b.x, fy, b.w, 2, 'rgba(0,0,0,0.55)');
  rect(b.x, b.y + b.h - 2, b.w, 2, 'rgba(0,0,0,0.4)');
  const doorX = b.x + b.w * b.doorX - 8;
  const winKeys = { normal: ['window'], boarded: ['window_boarded', 'window_broken'], mixed: ['window', 'window_broken', 'window_boarded'], beige: ['window_beige'] }[b.windows || 'normal'];
  let wi = 0;
  for (let wx = b.x + 8; wx < b.x + b.w - 18; wx += 22) {
    if (Math.abs(wx - doorX) < 22) continue;
    sprite(`env/${winKeys[(wi++ + b.x) % winKeys.length]}`, wx, fy + 7);
  }
  if (b.door !== false) sprite(`env/${b.doorKey || 'door'}`, doorX, b.y + b.h - 25);
  if (b.awning) sprite(`env/awning_${b.awning}`, doorX - 8, fy - 2);
  if (b.label) {
    const tw = textWidth(b.label), lx = sx(b.x + b.w * b.doorX) - Math.floor(tw / 2);
    const ly = sy(fy) - (b.awning ? 9 : 8);
    ctx.fillStyle = 'rgba(10,10,14,0.9)'; ctx.fillRect(lx - 3, ly - 2, tw + 6, 9);
    pixelText(ctx, b.label, lx, ly, b.labelColor || '#ffcf6b');
  }
}

// Lista de dibujables ordenados por "pies" (painter's algorithm en 3/4).
export function worldDrawables() {
  const W = S.world, out = [];
  for (const b of W.buildings) if (onScreen(b.x, b.y, Math.max(b.w, b.h) + 20)) out.push({ y: b.sortY, draw: () => drawBuilding(b) });
  for (const p of W.props) {
    if (p.flat || !onScreen(p.x + p.w / 2, p.y + p.h / 2, 60)) continue;
    out.push({ y: p.sortY, draw: () => sprite(`env/${p.k}`, p.x, p.y, p.hitFlash > 0 ? { filter: 'brightness(2.2)' } : undefined) });
  }
  return out;
}
