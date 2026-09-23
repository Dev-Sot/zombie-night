// Transporte de red: salas por código con WebRTC (PeerJS).
// El anfitrión registra un id público "nsl-v1-<CÓDIGO>" en el servidor de
// señalización de PeerJS; los demás se conectan directo a su navegador.
// No hay servidor de juego: el anfitrión simula y reenvía el estado.

const PREFIX = 'nochesinluna-v1-';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
export const MAX_PLAYERS = 4;

export const room = {
  role: null,        // 'host' | 'client' | null
  code: null,
  me: 0,             // índice (color) del jugador local
  players: [],       // [{ id, name, idx }]
  inGame: false,
  level: 1,
  diff: 'normal',
  mode: 'story',     // 'story' | 'survival'
};

let peer = null;
let hostConn = null;
const conns = new Map();
let H = { onLobby() {}, onMsg() {}, onClosed() {} };
export function setNetHandlers(h) { H = { ...H, ...h }; }

function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PEERJS;
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar la librería de red'));
    document.head.appendChild(s);
  });
}

function openPeer(id) {
  return new Promise((resolve, reject) => {
    const p = id ? new window.Peer(id, { debug: 0 }) : new window.Peer({ debug: 0 });
    const fail = (e) => { p.destroy(); reject(e); };
    p.once('open', () => { p.off('error', fail); resolve(p); });
    p.once('error', fail);
  });
}

const genCode = () => Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
export const cleanCode = (c) => (c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

function friendly(e) {
  const t = e?.type || '';
  if (t === 'peer-unavailable') return 'No existe una sala con ese código';
  if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Sin conexión con el servidor de salas';
  if (t === 'browser-incompatible') return 'Tu navegador no soporta WebRTC';
  return e?.message || 'Error de red';
}

// ---------------- anfitrión ----------------
export async function createRoom(name) {
  await loadPeerJS();
  let lastErr = null;
  for (let i = 0; i < 4 && !peer; i++) {
    const code = genCode();
    try { peer = await openPeer(PREFIX + code); room.code = code; } catch (e) {
      lastErr = e;
      if (e.type !== 'unavailable-id') throw new Error(friendly(e));
    }
  }
  if (!peer) throw new Error(friendly(lastErr));
  Object.assign(room, { role: 'host', me: 0, inGame: false, players: [{ id: 'host', name, idx: 0 }] });
  peer.on('connection', acceptClient);
  peer.on('disconnected', () => { if (peer && !peer.destroyed) peer.reconnect(); });
  peer.on('error', (e) => console.warn('red:', e.type));
  H.onLobby();
  return room.code;
}

function acceptClient(conn) {
  conn.on('data', (msg) => {
    if (msg?.t === 'hello') {
      if (room.players.length >= MAX_PLAYERS) { conn.send({ t: 'reject', why: 'La sala está llena' }); setTimeout(() => conn.close(), 300); return; }
      if (room.inGame) { conn.send({ t: 'reject', why: 'La partida ya empezó' }); setTimeout(() => conn.close(), 300); return; }
      const used = new Set(room.players.map((p) => p.idx));
      const idx = [0, 1, 2, 3].find((i) => !used.has(i));
      const name = String(msg.name || `JUGADOR ${idx + 1}`).slice(0, 10);
      room.players.push({ id: conn.peer, name, idx });
      conns.set(conn.peer, conn);
      broadcastLobby();
      return;
    }
    if (conns.has(conn.peer)) H.onMsg(conn.peer, msg);
  });
  conn.on('close', () => dropClient(conn.peer));
  conn.on('error', () => dropClient(conn.peer));
}

function dropClient(id) {
  if (!conns.has(id)) return;
  conns.delete(id);
  const p = room.players.find((q) => q.id === id);
  room.players = room.players.filter((q) => q.id !== id);
  H.onMsg(id, { t: 'left', idx: p?.idx, name: p?.name });
  broadcastLobby();
}

export function broadcastLobby() {
  if (room.role !== 'host') return;
  const msg = { t: 'lobby', code: room.code, players: room.players, level: room.level, diff: room.diff, mode: room.mode, inGame: room.inGame };
  for (const c of conns.values()) {
    const me = room.players.find((p) => p.id === c.peer);
    if (c.open) c.send({ ...msg, me: me?.idx ?? 0 });
  }
  H.onLobby();
}

export function broadcast(msg) {
  for (const c of conns.values()) if (c.open) c.send(msg);
}

// ---------------- cliente ----------------
export async function joinRoom(code, name) {
  await loadPeerJS();
  try { peer = await openPeer(null); } catch (e) { throw new Error(friendly(e)); }
  return new Promise((resolve, reject) => {
    let done = false;
    const fail = (e) => { if (done) return; done = true; leaveRoom(); reject(new Error(friendly(e))); };
    const timer = setTimeout(() => fail({ message: 'La sala no respondió' }), 12000);
    peer.on('error', fail);
    hostConn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
    hostConn.on('open', () => {
      hostConn.send({ t: 'hello', name });
    });
    hostConn.on('data', (msg) => {
      if (msg?.t === 'reject') { clearTimeout(timer); fail({ message: msg.why }); return; }
      if (msg?.t === 'lobby') {
        Object.assign(room, { role: 'client', code: msg.code, players: msg.players, level: msg.level, diff: msg.diff, mode: msg.mode, me: msg.me, inGame: msg.inGame });
        if (!done) { done = true; clearTimeout(timer); resolve(); }
        H.onLobby();
        return;
      }
      H.onMsg('host', msg);
    });
    hostConn.on('close', () => { if (done && room.role === 'client') { leaveRoom(); H.onClosed('Se cortó la conexión con el anfitrión'); } });
  });
}

export function sendToHost(msg) { if (hostConn?.open) hostConn.send(msg); }

export function leaveRoom() {
  for (const c of conns.values()) try { c.close(); } catch { /* ya cerrada */ }
  conns.clear();
  try { hostConn?.close(); } catch { /* ya cerrada */ }
  hostConn = null;
  try { peer?.destroy(); } catch { /* ya destruido */ }
  peer = null;
  Object.assign(room, { role: null, code: null, me: 0, players: [], inGame: false });
}
