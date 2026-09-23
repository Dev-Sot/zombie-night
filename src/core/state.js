// Estado de la partida en curso. Los módulos de juego lo leen y mutan
// directamente; los eventos que cruzan capas (ganar, morir, UI) van por el bus.
export const S = {
  level: null,        // definición del nivel activo (levels.js)
  world: null,        // mundo construido (world.js)
  players: [],        // array aunque hoy haya uno: el multijugador lo va a llenar
  zombies: [],
  bullets: [],
  projectiles: [],    // proyectiles enemigos (hachas)
  pickups: [],
  particles: [],
  decals: [],
  lights: [],         // luces temporales (fogonazos, explosiones, bengalas)
  floaters: [],       // textos flotantes (+monedas)
  t: 0,
  timeScale: 1,
  hitstop: 0,
  shake: 0,
  cam: { x: 0, y: 0, tx: 0, ty: 0, cine: null },
  wave: 0,
  kills: 0,
  shots: 0,
  hits: 0,
  startTime: 0,
  objective: null,
  paused: false,
  over: false,
};

const handlers = {};
export const bus = {
  on(ev, fn) { (handlers[ev] ||= []).push(fn); },
  emit(ev, data) { (handlers[ev] || []).forEach((fn) => fn(data)); },
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
