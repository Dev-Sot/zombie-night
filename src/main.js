import { canvas } from './core/render.js';
import { initInput } from './core/input.js';
import { initTouch } from './core/touch.js';
import { loadAll } from './core/assets.js';
import { initAudio } from './core/audio.js';
import { save } from './core/save.js';
import { room, createRoom, joinRoom, leaveRoom, broadcastLobby, pickChar } from './net/net.js';
import * as ui from './ui/ui.js';
import * as game from './game/game.js';

initInput(canvas);
initTouch();

// El navegador no deja arrancar audio sin un gesto del usuario: se activa
// con el primer clic o tecla y a partir de ahí suena la música del menú.
function unlockAudio() {
  initAudio();
  game.settingsChanged(save.settings);
  game.menuAudio();
}
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

ui.setLoading(0, 'cargando');
const tips = ui.startTips();
await loadAll((p) => ui.setLoading(p, `cargando  ${Math.round(p * 100)}%`));
clearInterval(tips);

ui.initUI({
  onPlayLevel: (id) => game.startLevel(id),
  onPlaySurvival: (id) => game.startSurvival(id),
  onSettings: (st) => game.settingsChanged(st),
  onResume: () => game.resume(),
  onPause: () => game.pause(),
  onRestart: () => game.restart(),
  onQuit: () => game.quitToMenu(),
  onEndMenu: () => game.endMenu(),
  onNext: () => game.nextLevel(),
  onShopClose: () => game.resume(),
  onShopBuy: (k) => game.buy(k),
  onCoopCreate: (name, char) => createRoom(name, char),
  onCoopJoin: (code, name, char) => joinRoom(code, name, char),
  onCoopPick: (char) => pickChar(char),
  onCoopLeave: () => { leaveRoom(); ui.renderLobby(); },
  onCoopLevel: (id) => { if (room.role === 'host') { room.level = id; broadcastLobby(); } },
  onCoopStart: () => { if (room.role === 'host') game.hostStart(room.level); },
  onChat: (text) => game.sendChat(text),
  onCoopMode: (id) => { if (room.role === 'host') { room.mode = id; broadcastLobby(); } },
  onCoopDiff: (id) => { if (room.role === 'host') { room.diff = id; broadcastLobby(); } },
});
ui.setThumbs(game.levelThumbs());
game.settingsChanged(save.settings);
game.menuScene();
game.startLoop();

// enlace de invitación: ?sala=CODIGO abre directo la pantalla de unirse
const invite = new URLSearchParams(location.search).get('sala');
ui.fade(() => (invite ? ui.showCoop(invite.toUpperCase().slice(0, 5)) : ui.show('mainMenu')), 200);
window.addEventListener('beforeunload', () => leaveRoom());

// ?debug en la URL expone el estado para pruebas automáticas
if (new URLSearchParams(location.search).has('debug')) {
  const { S, bus, net } = await import('./core/state.js');
  const Z = await import('./game/zombies.js');
  window.__nsl = { S, bus, net, room, game, Z };
}
