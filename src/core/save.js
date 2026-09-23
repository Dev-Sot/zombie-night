import { SAVE_KEY } from './config.js';

const DEFAULT = { unlocked: 1, best: {}, last: 1, diff: 'normal', name: '', survival: {}, settings: { music: 60, sfx: 80, shake: true, cine: true } };

export const save = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw) return { ...DEFAULT, ...raw, settings: { ...DEFAULT.settings, ...raw.settings } };
  } catch { /* guardado corrupto o storage bloqueado: arrancar de cero */ }
  return structuredClone(DEFAULT);
}

export function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage bloqueado */ }
}

const RANKS = ['C', 'B', 'A', 'S'];
export function recordWin(id, rank, key = String(id)) {
  save.unlocked = Math.max(save.unlocked, id + 1);
  if (!save.best[key] || RANKS.indexOf(rank) > RANKS.indexOf(save.best[key])) save.best[key] = rank;
  save.last = Math.min(3, id + 1);
  persist();
}
