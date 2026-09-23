import { GW, GH } from './config.js';

// Entrada local: teclado + mouse, joystick (Gamepad API) y controles
// táctiles. Todo termina en el mismo "control" ({moveX, moveY, aim, fire,
// pressed(), held()}), así el jugador remoto de la red usa la misma forma.
const keys = new Set();
const edges = new Set();
const mouse = { x: GW / 2, y: GH / 2, down: false, clicked: false };
let wheel = 0;

// entrada "virtual" (joystick o táctil); source dice cuál se usó por última vez
export const virt = { source: 'kb', mx: 0, my: 0, aim: null, fire: false, held: new Set() };

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (!keys.has(e.code)) edges.add(e.code);
    keys.add(e.code);
    virt.source = 'kb';
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width * GW;
    mouse.y = (e.clientY - r.top) / r.height * GH;
  };
  canvas.parentElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pos(e);
    if (virt.source === 'pad' && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) virt.source = 'kb';
  });
  canvas.parentElement.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') { pos(e); virt.source = 'kb'; }
    if (e.target !== canvas) return;
    if (e.button === 1) { edges.add('Ping'); e.preventDefault(); return; }
    if (e.button === 0) { mouse.down = e.pointerType === 'mouse'; mouse.clicked = true; }
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  canvas.parentElement.addEventListener('wheel', (e) => { wheel += Math.sign(e.deltaY); }, { passive: true });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // sin autoscroll con el clic del medio (se usa para marcar)
  canvas.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
}

const kb = (a, b) => (keys.has(a) || keys.has(b) ? 1 : 0);
export const localControl = {
  get moveX() { return kb('KeyD', 'ArrowRight') - kb('KeyA', 'ArrowLeft') || virt.mx; },
  get moveY() { return kb('KeyS', 'ArrowDown') - kb('KeyW', 'ArrowUp') || virt.my; },
  get fire() { return mouse.down || virt.fire; },
  // con joystick o táctil el ángulo viene directo; con mouse se calcula desde el cursor
  get aim() { return virt.source !== 'kb' ? virt.aim ?? undefined : undefined; },
  mouse,
  pressed(code) { return edges.has(code); },
  held(code) { return keys.has(code) || virt.held.has(code); },
  takeWheel() { const w = wheel; wheel = 0; return w; },
};

// usados por el táctil
export function pressVirtual(code) { if (code === 'wheel') wheel++; else edges.add(code); }
export function aimVirtual(a) {
  virt.aim = a;
  // cursor virtual por delante del jugador: mueve la cámara y sirve para marcar
  mouse.x = GW / 2 + Math.cos(a) * 70; mouse.y = GH / 2 + Math.sin(a) * 50;
}

// ---------------- joystick ----------------
// Xbox/estándar: A interactuar, B/LT esquivar, X recargar, Y curar,
// LB/RB cambiar arma, RT disparar, Back linterna, Start pausa, cruceta arriba marcar.
const PAD_MAP = { 0: 'KeyE', 1: 'Space', 2: 'KeyR', 3: 'KeyQ', 6: 'Space', 8: 'KeyF', 9: 'Escape', 12: 'KeyG' };
const PAD_NAV = { 0: 'PadA', 1: 'PadB', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight' };
let padPrev = [], stickPrev = 0;
export function pollGamepad() {
  const list = navigator.getGamepads ? [...navigator.getGamepads()] : [];
  const gp = list.find((p) => p && p.connected);
  if (!gp) return;
  const dz = (v) => (Math.abs(v || 0) < 0.22 ? 0 : v);
  const lx = dz(gp.axes[0]), ly = dz(gp.axes[1]), rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
  const btn = (i) => !!gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4);
  const used = lx || ly || Math.hypot(rx, ry) > 0.35 || gp.buttons.some((b, i) => btn(i));
  if (used) virt.source = 'pad';
  if (virt.source !== 'pad') { padPrev = gp.buttons.map((b, i) => btn(i)); return; }
  virt.mx = lx; virt.my = ly;
  if (Math.hypot(rx, ry) > 0.35) aimVirtual(Math.atan2(ry, rx));
  else if (virt.aim == null && (lx || ly)) aimVirtual(Math.atan2(ly, lx));
  virt.fire = btn(7);
  virt.held.clear();
  if (btn(0)) virt.held.add('KeyE');
  gp.buttons.forEach((b, i) => {
    const now = btn(i);
    if (now && !padPrev[i]) {
      if (PAD_MAP[i]) edges.add(PAD_MAP[i]);
      if (PAD_NAV[i]) edges.add(PAD_NAV[i]);
      if (i === 4) wheel--;
      if (i === 5) wheel++;
    }
    padPrev[i] = now;
  });
  // el stick izquierdo también navega menús (un paso por movimiento)
  const st = ly < -0.6 ? -1 : ly > 0.6 ? 1 : 0;
  if (st && st !== stickPrev) edges.add(st < 0 ? 'PadUp' : 'PadDown');
  stickPrev = st;
}

export function heldKeys() { return keys; }
export function anyPressed() { return edges.size > 0 || mouse.clicked; }
export function endFrame() { edges.clear(); mouse.clicked = false; }
