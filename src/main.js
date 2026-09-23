import { canvas } from './core/render.js';
import { initInput } from './core/input.js';
import { loadAll } from './core/assets.js';
import { initAudio } from './core/audio.js';
import { save } from './core/save.js';
import * as ui from './ui/ui.js';
import * as game from './game/game.js';

initInput(canvas);

// El navegador no deja arrancar audio sin un gesto del usuario: se activa
// con el primer clic o tecla y a partir de ahí suena la música del menú.
function unlockAudio() {
  initAudio();
  game.settingsChanged(save.settings);
  game.menuAudio();
}
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

ui.setLoading(0, 'CARGANDO');
await loadAll((p) => ui.setLoading(p, `CARGANDO  ${Math.round(p * 100)}%`));

ui.initUI({
  onPlayLevel: (id) => game.startLevel(id),
  onSettings: (st) => game.settingsChanged(st),
  onResume: () => game.resume(),
  onPause: () => game.pause(),
  onRestart: () => game.restart(),
  onQuit: () => game.quitToMenu(),
  onNext: () => game.nextLevel(),
  onShopClose: () => game.resume(),
  onShopBuy: (k) => game.buy(k),
});
game.settingsChanged(save.settings);
game.menuScene();
game.startLoop();
ui.fade(() => ui.show('mainMenu'), 200);

// ?debug en la URL expone el estado para pruebas automáticas
if (new URLSearchParams(location.search).has('debug')) {
  const { S, bus } = await import('./core/state.js');
  const Z = await import('./game/zombies.js');
  window.__nsl = { S, bus, game, Z };
}
