// Controles táctiles: dos joysticks flotantes (mover a la izquierda,
// apuntar y disparar a la derecha) y botones de acción.
import { virt, pressVirtual, aimVirtual } from './input.js';

export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const R = 46; // radio del joystick en px de pantalla

function stick(zone, el, onMove, onEnd) {
  let id = null, ox = 0, oy = 0;
  const knob = el.firstElementChild;
  zone.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    id = e.pointerId;
    virt.source = 'touch';
    try { zone.setPointerCapture(id); } catch { /* evento sin puntero real */ }
    const r = zone.parentElement.getBoundingClientRect();
    ox = e.clientX; oy = e.clientY;
    el.style.left = `${ox - r.left}px`; el.style.top = `${oy - r.top}px`;
    el.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)';
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    onMove(dx / R, dy / R);
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null; el.classList.remove('on');
    onEnd();
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
}

export function initTouch() {
  if (!isTouch()) return;
  document.body.classList.add('touch-device');
  const box = document.getElementById('touch');
  stick(box.querySelector('.tzone.left'), document.getElementById('stickL'),
    (x, y) => { const m = Math.hypot(x, y) < 0.18 ? 0 : 1; virt.mx = x * m; virt.my = y * m; },
    () => { virt.mx = 0; virt.my = 0; });
  stick(box.querySelector('.tzone.right'), document.getElementById('stickR'),
    (x, y) => { if (Math.hypot(x, y) > 0.2) aimVirtual(Math.atan2(y, x)); virt.fire = Math.hypot(x, y) > 0.55; },
    () => { virt.fire = false; });
  box.querySelectorAll('.tbtns button').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); virt.source = 'touch';
      pressVirtual(k);
      if (b.dataset.hold !== undefined) virt.held.add(k);
      b.classList.add('down');
    });
    const up = () => { virt.held.delete(k); b.classList.remove('down'); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  });
  // pantalla completa y horizontal al primer toque
  window.addEventListener('pointerdown', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
    }
  }, { once: true });
}
