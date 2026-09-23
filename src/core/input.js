import { GW, GH } from './config.js';

// Entrada local (teclado + mouse). Cada jugador tiene un "control" con la
// misma forma ({move, aim, fire, pressed()}), así un jugador remoto puede
// alimentar el mismo objeto desde la red más adelante.
const keys = new Set();
const edges = new Set();
const mouse = { x: GW / 2, y: GH / 2, down: false, clicked: false };
let wheel = 0;
let canvasEl = null;

export function initInput(canvas) {
  canvasEl = canvas;
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (!keys.has(e.code)) edges.add(e.code);
    keys.add(e.code);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width * GW;
    mouse.y = (e.clientY - r.top) / r.height * GH;
  };
  canvas.parentElement.addEventListener('pointermove', pos);
  canvas.parentElement.addEventListener('pointerdown', (e) => {
    pos(e);
    if (e.target === canvas) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  canvas.parentElement.addEventListener('wheel', (e) => { wheel += Math.sign(e.deltaY); }, { passive: true });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export const localControl = {
  get moveX() { return (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0); },
  get moveY() { return (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0); },
  get fire() { return mouse.down; },
  mouse,
  pressed(code) { return edges.has(code); },
  held(code) { return keys.has(code); },
  takeWheel() { const w = wheel; wheel = 0; return w; },
};

export function heldKeys() { return keys; }
export function anyPressed() { return edges.size > 0 || mouse.clicked; }
export function endFrame() { edges.clear(); mouse.clicked = false; }
