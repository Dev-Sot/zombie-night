// Audio 100% Web Audio: efectos sintetizados + música procedural adaptativa.
// Si existe assets/audio/<nombre>.ogg para un efecto o pista, se usa el
// archivo en su lugar (ver FILE_SFX / FILE_MUSIC) — así se pueden sumar
// grabaciones reales sin tocar el resto del juego.

let ctx = null, master, musicBus, sfxBus, ambBus, noise = null;
const settings = { music: 0.6, sfx: 0.8 };
const buffers = {};

const FILE_SFX = ['pistol', 'shotgun', 'rifle', 'explosion', 'thunder', 'groan', 'hurt'];
const FILE_MUSIC = ['menu', 'explore', 'combat', 'final'];

export function audioReady() { return !!ctx; }

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
  musicBus = ctx.createGain(); musicBus.connect(comp);
  sfxBus = ctx.createGain(); sfxBus.connect(comp);
  ambBus = ctx.createGain(); ambBus.connect(comp);
  applyVolumes();
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // assets/audio/manifest.json lista los .ogg disponibles (así no se piden archivos que no existen)
  fetch('assets/audio/manifest.json').then((r) => (r.ok ? r.json() : [])).then((list) => {
    const known = new Set([...FILE_SFX, ...FILE_MUSIC.map((m) => 'music_' + m)]);
    list.filter((n) => known.has(n)).forEach(tryLoad);
  }).catch(() => { /* sin manifiesto: todo sintetizado */ });
}

async function tryLoad(name) {
  try {
    const res = await fetch(`assets/audio/${name}.ogg`);
    if (!res.ok) return;
    buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
  } catch { /* sin archivo: se usa la síntesis */ }
}

export function setVolumes(music, sfx) { settings.music = music; settings.sfx = sfx; applyVolumes(); }
function applyVolumes() {
  if (!ctx) return;
  musicBus.gain.value = settings.music * 0.55;
  sfxBus.gain.value = settings.sfx;
  ambBus.gain.value = settings.sfx * 0.8;
}

// ---------------- bloques de síntesis ----------------
const now = () => ctx.currentTime;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function env(g, t, a, peak, dec, end = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + dec);
}

function osc(type, f0, f1, t, dur, vol, bus = sfxBus, filt) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, 0.005, vol, dur);
  let node = o;
  if (filt) { const f = ctx.createBiquadFilter(); f.type = filt[0]; f.frequency.value = filt[1]; node.connect(f); node = f; }
  node.connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
}

function nz(type, freq, t, dur, vol, q = 0.7, bus = sfxBus, freqEnd) {
  const s = ctx.createBufferSource(); s.buffer = noise;
  s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain(); env(g, t, 0.004, vol, dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

// ---------------- efectos ----------------
const SFX = {
  pistol(t) { nz('highpass', 2600, t, 0.05, 0.5); nz('lowpass', 1400, t, 0.12, 0.35); osc('sine', 160, 45, t, 0.08, 0.5); nz('lowpass', 500, t + 0.03, 0.3, 0.08); },
  shotgun(t) { nz('highpass', 1800, t, 0.06, 0.55); nz('lowpass', 900, t, 0.35, 0.6); osc('sine', 110, 32, t, 0.22, 0.7); nz('lowpass', 380, t + 0.05, 0.55, 0.12); },
  rifle(t) { nz('highpass', 3200, t, 0.035, 0.4); nz('bandpass', 1600, t, 0.08, 0.3, 1.2); osc('square', 140, 60, t, 0.05, 0.18); },
  empty(t) { osc('square', 1800, 1200, t, 0.02, 0.08); },
  reload(t) { osc('square', 900, 700, t, 0.03, 0.08); nz('bandpass', 3000, t + 0.12, 0.06, 0.15, 3); osc('square', 1300, 900, t + 0.3, 0.03, 0.1); },
  swing(t) { nz('bandpass', 1400, t, 0.16, 0.25, 1.5, sfxBus, 300); },
  bat(t) { osc('sine', 180, 60, t, 0.12, 0.5); nz('lowpass', 900, t, 0.1, 0.4); },
  zhit(t) { nz('bandpass', 700, t, 0.09, 0.35, 2); osc('sine', 120, 70, t, 0.07, 0.2); },
  zdie(t) { nz('lowpass', 500, t, 0.35, 0.3); osc('sawtooth', 110, 40, t, 0.45, 0.12, sfxBus, ['lowpass', 500]); },
  groan(t, v = 1) {
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    const base = 65 + Math.random() * 40, dur = 0.7 + Math.random() * 0.6;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 0.7, t + dur);
    lfo.frequency.value = 5 + Math.random() * 4; lg.gain.value = 6; lfo.connect(lg).connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 350 + Math.random() * 250; f.Q.value = 3;
    env(g, t, 0.1, 0.16 * v, dur);
    o.connect(f).connect(g).connect(sfxBus);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  },
  hurt(t) { nz('lowpass', 600, t, 0.2, 0.45); osc('sawtooth', 200, 70, t, 0.18, 0.18, sfxBus, ['lowpass', 900]); },
  coin(t) { osc('sine', 1320, 0, t, 0.08, 0.16); osc('sine', 1760, 0, t + 0.06, 0.12, 0.14); },
  item(t) { [523, 659, 784].forEach((f, i) => osc('triangle', f, 0, t + i * 0.06, 0.12, 0.14)); },
  weapon(t) { [392, 523, 659, 784].forEach((f, i) => osc('square', f, 0, t + i * 0.07, 0.1, 0.07)); nz('bandpass', 3000, t + 0.3, 0.08, 0.15, 3); },
  heal(t) { [440, 554, 659].forEach((f, i) => osc('sine', f, f * 1.01, t + i * 0.09, 0.25, 0.14)); },
  dash(t) { nz('highpass', 1200, t, 0.18, 0.25, 0.7, sfxBus, 4000); },
  explosion(t) { nz('lowpass', 1500, t, 0.08, 0.6); nz('lowpass', 420, t, 1.3, 0.8, 0.8, sfxBus, 120); osc('sine', 70, 28, t, 0.7, 0.8); },
  thunder(t) {
    nz('highpass', 900, t, 0.12, 0.35);
    for (let i = 0; i < 5; i++) nz('lowpass', 260 + Math.random() * 120, t + 0.1 + i * 0.35 + Math.random() * 0.2, 0.9, 0.45 - i * 0.06, 0.6, ambBus);
  },
  axe(t) { nz('bandpass', 900, t, 0.3, 0.2, 2, sfxBus, 2200); },
  pickupFuel(t) { osc('triangle', 330, 660, t, 0.18, 0.2); osc('triangle', 660, 990, t + 0.1, 0.16, 0.16); },
  objective(t) { [262, 330, 392, 523].forEach((f, i) => osc('triangle', f, 0, t + i * 0.1, 0.3, 0.16)); },
  alarm(t) { for (let i = 0; i < 3; i++) { osc('square', 880, 660, t + i * 0.4, 0.3, 0.07); } },
  generator(t) { osc('sawtooth', 40, 90, t, 1.4, 0.25, sfxBus, ['lowpass', 400]); nz('lowpass', 300, t + 0.2, 1.4, 0.2); },
  radio(t) { nz('bandpass', 2200, t, 0.6, 0.18, 4); osc('sine', 1100, 1100, t + 0.2, 0.15, 0.06); },
  flare(t) { nz('highpass', 2000, t, 0.5, 0.25, 0.7, sfxBus, 800); osc('sine', 300, 900, t, 0.3, 0.08); },
  heartbeat(t) { osc('sine', 60, 40, t, 0.12, 0.35); osc('sine', 60, 40, t + 0.18, 0.1, 0.25); },
  win(t) { [392, 494, 587, 784].forEach((f, i) => osc('triangle', f, 0, t + i * 0.13, 0.5, 0.16)); },
  uiHover(t) { osc('square', 1400, 0, t, 0.015, 0.04); },
  uiClick(t) { osc('square', 700, 1100, t, 0.05, 0.08); },
  land(t) { nz('lowpass', 800, t, 0.12, 0.15); },
};

export const sfxHook = { fn: null };
export function sfx(name, vol = 1) {
  sfxHook.fn?.(name, vol);
  if (!ctx || vol <= 0.01) return;
  const t = now();
  if (buffers[name]) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buffers[name]; g.gain.value = vol;
    s.playbackRate.value = 0.95 + Math.random() * 0.1;
    s.connect(g).connect(sfxBus); s.start(t);
    return;
  }
  if (!SFX[name]) return;
  if (vol >= 0.99) { SFX[name](t, vol); return; }
  const prev = sfxBus; const g = ctx.createGain(); g.gain.value = vol; g.connect(prev);
  sfxBus = g;
  try { SFX[name](t, vol); } finally { sfxBus = prev; }
}

// ---------------- ambiente en loop: lluvia, viento, helicóptero ----------------
const loops = {};
function noiseLoop(name, type, freq, vol, lfoRate = 0, lfoDepth = 0, q = 0.7) {
  if (!ctx || loops[name]) return;
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = 0.0001;
  g.gain.linearRampToValueAtTime(vol, now() + 1.5);
  s.connect(f).connect(g).connect(ambBus);
  let lfo = null;
  if (lfoRate) {
    lfo = ctx.createOscillator(); const lg = ctx.createGain();
    lfo.frequency.value = lfoRate; lg.gain.value = lfoDepth;
    lfo.connect(lg).connect(g.gain); lfo.start();
  }
  s.start();
  loops[name] = { s, g, lfo };
}
export function ambient(name, on) {
  if (!ctx) return;
  if (!on) {
    const l = loops[name]; if (!l) return;
    l.g.gain.cancelScheduledValues(now()); l.g.gain.setValueAtTime(l.g.gain.value, now());
    l.g.gain.linearRampToValueAtTime(0.0001, now() + 1);
    setTimeout(() => { try { l.s.stop(); l.lfo?.stop(); } catch { /* ya detenido */ } }, 1200);
    delete loops[name];
    return;
  }
  if (name === 'rain') noiseLoop('rain', 'bandpass', 2400, 0.09, 0, 0, 0.4);
  if (name === 'storm') noiseLoop('storm', 'lowpass', 1500, 0.14, 0.2, 0.05);
  if (name === 'wind') noiseLoop('wind', 'lowpass', 380, 0.1, 0.15, 0.06);
  if (name === 'heli') noiseLoop('heli', 'lowpass', 700, 0.22, 17, 0.2, 1.4);
}
export function ambientVolume(name, v) { const l = loops[name]; if (l && ctx) l.g.gain.setTargetAtTime(v, now(), 0.3); }
export function stopAllAmbient() { Object.keys(loops).forEach((k) => ambient(k, false)); }

// ---------------- música procedural ----------------
// Secuenciador con lookahead: agenda semicorcheas un poco por delante del
// reloj de audio, así el tempo no depende del frame rate.
const PROG = {
  menu: [[45, 52, 57, 60, 64], [41, 53, 57, 60, 65], [48, 52, 55, 60, 64], [40, 52, 56, 59, 64]],
  explore: [[45, 52, 57, 60, 64], [41, 53, 57, 60, 65], [43, 50, 55, 59, 62], [40, 52, 56, 59, 64]],
  combat: [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [43, 55, 58, 62, 67], [45, 52, 57, 61, 64]],
  final: [[50, 57, 62, 65, 69], [48, 55, 60, 63, 67], [46, 53, 58, 62, 65], [45, 52, 57, 61, 64]],
};
const BPM = { menu: 70, explore: 78, combat: 104, final: 118 };
const music = { mood: null, step: 0, next: 0, timer: null, intensity: 0, fileSrc: null };

function pad(notes, t, dur, vol) {
  notes.forEach((m) => {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 0.5;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.1);
      o.connect(f).connect(g).connect(musicBus); o.start(t); o.stop(t + dur * 1.15);
    }
  });
}
function pluck(m, t, vol) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = mtof(m); o2.frequency.value = mtof(m + 12);
  f.type = 'lowpass'; f.frequency.value = 2200;
  env(g, t, 0.004, vol, 0.9);
  o.connect(f); o2.connect(f); f.connect(g).connect(musicBus);
  o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1);
}
function bass(m, t, dur, vol) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = mtof(m - 12);
  f.type = 'lowpass'; f.frequency.setValueAtTime(420, t); f.frequency.exponentialRampToValueAtTime(140, t + dur);
  env(g, t, 0.01, vol, dur);
  o.connect(f).connect(g).connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
}
function kick(t, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
  env(g, t, 0.003, vol, 0.25);
  o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.3);
}
function hat(t, vol) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; f.type = 'highpass'; f.frequency.value = 7000;
  env(g, t, 0.002, vol, 0.045);
  s.connect(f).connect(g).connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.08);
}

function scheduleStep(t) {
  const mood = music.mood, step = music.step, beat = step % 16;
  const prog = PROG[mood], chord = prog[Math.floor(step / 32) % prog.length];
  const I = music.intensity, stepDur = 60 / BPM[mood] / 4;
  if (step % 32 === 0) pad(chord.slice(1), t, stepDur * 32, mood === 'menu' ? 0.035 : 0.028);
  if (mood === 'menu') {
    if (beat % 4 === 0 && Math.random() < 0.55) pluck(chord[1 + Math.floor(Math.random() * 4)] + 12, t, 0.07);
    if (beat === 0) bass(chord[0], t, stepDur * 14, 0.09);
    return;
  }
  if (mood === 'explore') {
    if (beat === 0 || beat === 8) bass(chord[0], t, stepDur * 7, 0.08 + I * 0.05);
    if (beat % 2 === 0 && Math.random() < 0.18 + I * 0.3) pluck(chord[1 + Math.floor(Math.random() * 4)] + 12, t, 0.05);
    if (I > 0.35 && beat % 4 === 2) hat(t, 0.04 * I);
    if (I > 0.6 && beat % 8 === 0) kick(t, 0.25 * I);
    return;
  }
  // combat / final: pulso constante
  if (beat % 2 === 0) bass(chord[0] + (beat % 8 === 6 ? 7 : 0), t, stepDur * 1.8, 0.1);
  if (beat % 4 === 0) kick(t, mood === 'final' ? 0.42 : 0.32);
  if (beat % 2 === 1) hat(t, 0.045);
  if (mood === 'final' && beat % 4 === 2) hat(t, 0.08);
  if (beat % 4 === 0 && Math.random() < 0.5) pluck(chord[2 + Math.floor(Math.random() * 3)] + 12, t, 0.05);
}

export function playMusic(mood) {
  if (!ctx || music.mood === mood) return;
  stopMusic();
  music.mood = mood;
  if (buffers['music_' + mood]) {
    const s = ctx.createBufferSource(); s.buffer = buffers['music_' + mood]; s.loop = true;
    s.connect(musicBus); s.start(); music.fileSrc = s;
    return;
  }
  music.step = 0; music.next = now() + 0.1;
  music.timer = setInterval(() => {
    const stepDur = 60 / BPM[music.mood] / 4;
    while (music.next < now() + 0.15) { scheduleStep(music.next); music.next += stepDur; music.step++; }
  }, 25);
}
export function stopMusic() {
  clearInterval(music.timer); music.timer = null;
  try { music.fileSrc?.stop(); } catch { /* ya detenido */ }
  music.fileSrc = null; music.mood = null;
}
export function setIntensity(v) { music.intensity = v; }
export function currentMood() { return music.mood; }
