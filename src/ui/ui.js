import { S, bus } from '../core/state.js';
import { save, persist } from '../core/save.js';
import { sfx } from '../core/audio.js';
import { LEVELS, WORLDS, SHOP_ITEMS } from '../game/levels.js';
import { WEAPONS, ORDER } from '../game/weapons.js';
import { objectiveText } from '../game/objectives.js';
import { room, cleanCode, MAX_PLAYERS } from '../net/net.js';
import { TINT_CSS } from '../game/player.js';
import { DIFFS, priceOf, bestKey } from '../game/difficulty.js';
import { SURVIVAL_DESC } from '../game/survival.js';
import { CHARACTERS, charById } from '../game/characters.js';

const $ = (id) => document.getElementById(id);
const OVERLAYS = ['mainMenu', 'levelMenu', 'charMenu', 'coopMenu', 'settingsMenu', 'howtoMenu', 'creditsMenu', 'pauseMenu', 'shopMenu', 'resultsMenu', 'deathMenu', 'loading'];
let H = {};
let backTo = 'mainMenu';
let thumbs = {};
let levelMode = 'story';
let levelWorld = 1;
export function setThumbs(t) { thumbs = t; }

// las fuentes de la interfaz traen tildes y Ñ: solo hace falta escapar el HTML
export const px = (t) => String(t);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const pxHtml = (t) => esc(t);
// la serif de los títulos dibuja los números "a la antigua" (el 1 parece una i): van en la de máquina
const digits = (html) => html.replace(/\d+/g, '<span class="dg">$&</span>');
const sprite = (id, k = 4, sheet = 'idle_down') => `<span class="sprite" style="--k:${k};background-image:url(assets/char/${id}/${sheet}.png)"></span>`;

export function show(id) {
  $('banner').classList.remove('show');
  OVERLAYS.forEach((o) => $(o).classList.toggle('hidden', o !== id));
}
// navegación de menús con joystick: cruceta/stick mueve el foco, A acepta, B vuelve
export function padNav(c) {
  const ov = OVERLAYS.map($).find((o) => !o.classList.contains('hidden') && o.id !== 'loading');
  if (!ov) return;
  const items = [...ov.querySelectorAll('button, input')].filter((b) => !b.disabled && b.offsetParent !== null);
  if (!items.length) return;
  let i = items.indexOf(document.activeElement);
  const move = (d) => {
    document.querySelector('.padfocus')?.classList.remove('padfocus');
    i = i < 0 ? 0 : (i + d + items.length) % items.length;
    items[i].focus(); items[i].classList.add('padfocus');
    sfx('uiHover');
  };
  if (c.pressed('PadDown') || c.pressed('PadRight')) move(1);
  if (c.pressed('PadUp') || c.pressed('PadLeft')) move(-1);
  if (c.pressed('PadA')) { if (i < 0) move(0); else items[i].click(); }
  if (c.pressed('PadB')) ov.querySelector('[data-back], #btnResume, #btnShopClose, #btnCoopBack')?.click();
}
export function hideOverlays() { OVERLAYS.forEach((o) => $(o).classList.add('hidden')); }
export function setHud(on) {
  $('hud').classList.toggle('hidden', !on);
  $('topControls').classList.toggle('hidden', !on);
  $('chat').classList.toggle('hidden', !on || !room.role);
  $('touch').classList.toggle('hidden', !on || !document.body.classList.contains('touch-device'));
  if (!on) closeChat();
}

// ---------------- chat ----------------
const chatLog = [];
function chatLine(m) {
  const d = document.createElement('div');
  d.className = 'msg';
  const n = document.createElement('b');
  n.style.color = TINT_CSS[m.idx] || '#e9e6df';
  n.textContent = `${m.name}: `;
  const t = document.createElement('span');
  t.textContent = m.text;
  d.append(n, t);
  return d;
}
export function chatMessage(m) {
  chatLog.push(m);
  if (chatLog.length > 40) chatLog.shift();
  for (const id of ['chatLog', 'lobbyChatLog']) {
    const box = $(id);
    const line = chatLine(m);
    box.appendChild(line);
    while (box.children.length > (id === 'chatLog' ? 6 : 30)) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
    if (id === 'chatLog') setTimeout(() => line.classList.add('old'), 9000);
  }
}
export function openChat() {
  const inp = $('chatInput');
  $('chat').classList.add('open');
  inp.classList.remove('hidden');
  setTimeout(() => inp.focus(), 0);
}
function closeChat() {
  const inp = $('chatInput');
  inp.value = ''; inp.blur(); inp.classList.add('hidden');
  $('chat').classList.remove('open');
}
function initChat() {
  $('chatInput').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { H.onChat(e.target.value); closeChat(); }
    if (e.key === 'Escape') closeChat();
  });
  $('chatInput').addEventListener('blur', () => setTimeout(closeChat, 0));
  $('lobbyChatInput').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { H.onChat(e.target.value); e.target.value = ''; }
  });
}

export function fade(fn, ms = 450) {
  $('fade').classList.add('on');
  setTimeout(() => { fn(); setTimeout(() => $('fade').classList.remove('on'), 60); }, ms);
}

export function setLoading(p, text) {
  $('loadingFill').style.width = `${Math.round(p * 100)}%`;
  if (text) $('loadingText').textContent = text;
}

export function initUI(handlers) {
  H = handlers;
  // sonidos de menú
  document.querySelectorAll('#wrap button').forEach((b) => {
    b.addEventListener('mouseenter', () => sfx('uiHover'));
    b.addEventListener('click', () => sfx('uiClick'));
  });
  document.querySelectorAll('.menu-list button').forEach((b) => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'continue') H.onPlayLevel(save.last || 1);
    if (act === 'levels') { levelMode = 'story'; levelWorld = (save.last || 1) > 3 ? 2 : 1; renderLevels(); show('levelMenu'); }
    if (act === 'survival') { levelMode = 'survival'; renderLevels(); show('levelMenu'); }
    if (act === 'settings') { backTo = 'mainMenu'; show('settingsMenu'); }
    if (act === 'howto') show('howtoMenu');
    if (act === 'credits') show('creditsMenu');
    if (act === 'coop') showCoop();
    if (act === 'chars') { backTo = 'mainMenu'; renderChars(); show('charMenu'); }
  }));
  $('survivorStrip').addEventListener('click', () => { renderChars(); show('charMenu'); });
  updateStrip();
  startVhsClock();
  document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => show(backTo === 'pauseMenu' && b.closest('#settingsMenu') ? 'pauseMenu' : 'mainMenu')));

  // ajustes
  const st = save.settings;
  $('volMusic').value = st.music; $('volSfx').value = st.sfx; $('optShake').checked = st.shake; $('optCine').checked = st.cine;
  const onSet = () => {
    st.music = +$('volMusic').value; st.sfx = +$('volSfx').value; st.shake = $('optShake').checked; st.cine = $('optCine').checked;
    persist(); H.onSettings(st);
  };
  ['volMusic', 'volSfx', 'optShake', 'optCine'].forEach((id) => $(id).addEventListener('input', onSet));

  $('btnResume').addEventListener('click', () => H.onResume());
  $('btnPauseSettings').addEventListener('click', () => { backTo = 'pauseMenu'; show('settingsMenu'); });
  $('btnRestart').addEventListener('click', () => H.onRestart());
  $('btnQuit').addEventListener('click', () => H.onQuit());
  $('pauseBtn').addEventListener('click', () => H.onPause());
  $('btnShopClose').addEventListener('click', () => H.onShopClose());
  $('btnNext').addEventListener('click', () => H.onNext());
  $('btnResultsMenu').addEventListener('click', () => H.onEndMenu());
  $('btnRetry').addEventListener('click', () => H.onRestart());
  $('btnDeathMenu').addEventListener('click', () => H.onEndMenu());
  initCoop();
  initChat();

  bus.on('banner', ({ text, danger }) => banner(text, danger));
  bus.on('toast', (t) => toast(t));
  bus.on('bark', (b) => {
    const box = $('barks'), line = document.createElement('div');
    line.innerHTML = `<b style="color:${b.color}">${esc(b.name)}</b> ${esc(b.text)}`;
    box.appendChild(line);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => line.classList.add('out'), 3600);
    setTimeout(() => line.remove(), 4400);
  });
  bus.on('subtitle', (t) => subtitles([t], 5000));
  bus.on('objective', () => $('objective').classList.add('flash') || setTimeout(() => $('objective').classList.remove('flash'), 800));
  bus.on('coins', () => { const c = document.querySelector('.hud-coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
  updateContinue();
}

export function updateContinue() {
  $('btnContinue').textContent = save.unlocked > 1 ? 'Continuar' : 'Jugar';
}

function renderDiffToggle(box, current, onPick, enabled = true) {
  box.innerHTML = '';
  for (const D of Object.values(DIFFS)) {
    const b = document.createElement('button');
    b.className = `diff ${D.id}${current === D.id ? ' on' : ''}`;
    b.textContent = D.name;
    b.disabled = !enabled;
    b.addEventListener('mouseenter', () => sfx('uiHover'));
    b.addEventListener('click', () => { sfx('uiClick'); onPick(D.id); });
    box.appendChild(b);
  }
}

function renderToggle(box, options, current, onPick, enabled = true) {
  box.innerHTML = '';
  for (const [id, name] of options) {
    const b = document.createElement('button');
    b.className = `diff${current === id ? ' on' : ''}`;
    b.textContent = name;
    b.disabled = !enabled;
    b.addEventListener('mouseenter', () => sfx('uiHover'));
    b.addEventListener('click', () => { sfx('uiClick'); onPick(id); });
    box.appendChild(b);
  }
}
const MODES = [['story', 'Historia'], ['survival', 'Supervivencia']];

function renderSurvivalCards(wrap) {
  for (const L of LEVELS.filter((q) => q.world === levelWorld)) {
    // los mapas del mundo 2 se habilitan al llegar a esa noche en la historia
    const locked = L.world > 1 && L.id > save.unlocked;
    const c = document.createElement('button');
    c.className = `card${locked ? ' locked' : ''}`;
    const rn = save.survival[`${L.id}_normal`], rp = save.survival[`${L.id}_pesadilla`];
    c.innerHTML = `
      <div class="photo" style="--c:${thumbs[L.id] ? `url(${thumbs[L.id]}) center/cover` : L.color}"></div>
      <div class="bests">${rn ? `<span class="best">${rn}</span>` : ''}${rp ? `<span class="best p">${rp}</span>` : ''}</div>
      <div class="num">${esc(L.tag.toLowerCase())}</div>
      <div class="cap">${esc(L.name)}</div>
      <div class="desc">${SURVIVAL_DESC[L.id]}</div>
      <div class="lockmsg${locked ? '' : ' go'}">${locked ? 'llegá a esta noche en la historia' : `récord: oleada ${save.survival[`${L.id}_${save.diff}`] || 0}`}</div>`;
    c.addEventListener('mouseenter', () => sfx('uiHover'));
    if (!locked) c.addEventListener('click', () => { sfx('uiClick'); H.onPlaySurvival(L.id); });
    wrap.appendChild(c);
  }
}

function renderLevels() {
  const wrap = $('levelCards');
  renderToggle($('modeToggle'), MODES, levelMode, (id) => { levelMode = id; renderLevels(); });
  $('levelTitle').textContent = levelMode === 'survival' ? 'Registro · Supervivencia' : 'Expediente · Historia';
  renderToggle($('worldToggle'), WORLDS, levelWorld, (id) => { levelWorld = id; renderLevels(); });
  wrap.classList.add('three');
  renderDiffToggle($('diffToggle'), save.diff, (id) => { save.diff = id; persist(); renderLevels(); });
  $('diffDesc').textContent = DIFFS[save.diff].desc;
  $('levelMenu').classList.toggle('nightmare', save.diff === 'pesadilla');
  wrap.innerHTML = '';
  if (levelMode === 'survival') { renderSurvivalCards(wrap); return; }
  LEVELS.filter((q) => q.world === levelWorld).forEach((L) => {
    const locked = L.id > save.unlocked;
    const c = document.createElement('button');
    c.className = `card${locked ? ' locked' : ''}`;
    const th = thumbs[L.id];
    const bn = save.best[bestKey(L.id, 'normal')], bp = save.best[bestKey(L.id, 'pesadilla')];
    c.innerHTML = `
      <div class="photo" style="--c:${th ? `url(${th}) center/cover` : L.color}"></div>
      <div class="bests">${bn ? `<span class="best">${bn}</span>` : ''}${bp ? `<span class="best p">${bp}</span>` : ''}</div>
      <div class="num">noche ${L.id} · ${esc(L.tag.toLowerCase())}</div>
      <div class="cap">${esc(L.name)}</div>
      <div class="desc">${L.desc}</div>
      ${locked ? '<div class="lockmsg">superá la noche anterior</div>' : ''}`;
    c.addEventListener('mouseenter', () => sfx('uiHover'));
    if (!locked) c.addEventListener('click', () => { sfx('uiClick'); H.onPlayLevel(L.id); });
    wrap.appendChild(c);
  });
}

// ---------------- sobrevivientes ----------------
function renderChars() {
  const wrap = $('charCards');
  wrap.innerHTML = '';
  for (const c of CHARACTERS) {
    const b = document.createElement('button');
    b.className = `dossier${save.char === c.id || (!save.char && c.id === 'tomas') ? ' on' : ''}`;
    b.innerHTML = `
      <div class="pic">${sprite(c.id, 6)}</div>
      <div class="dn">${c.name}</div>
      <div class="dr">${c.role}</div>
      <div class="db">${c.bio}</div>
      <div class="dp"><b>${c.perk}</b>${c.perkDesc}</div>`;
    b.addEventListener('mouseenter', () => sfx('uiHover'));
    b.addEventListener('click', () => { sfx('uiClick'); save.char = c.id; persist(); renderChars(); updateStrip(); });
    wrap.appendChild(b);
  }
}
function updateStrip() {
  const c = charById(save.char);
  $('ssPortrait').innerHTML = sprite(c.id, 3);
  $('ssName').textContent = c.name;
  $('ssRole').textContent = `${c.role} · ${c.perk}`;
}

// reloj de la cámara de seguridad del menú
function startVhsClock() {
  const base = new Date(); base.setHours(3, 12, 0, 0);
  const t0 = Date.now();
  const tick = () => {
    const d = new Date(base.getTime() + (Date.now() - t0));
    $('vhsClock').textContent = d.toTimeString().slice(0, 8);
    $('vhsDate').textContent = d.toLocaleDateString('es', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase().replace('.', '');
  };
  tick();
  setInterval(tick, 1000);
}

// consejos en la pantalla de carga
const TIPS = [
  'Los gritones llaman a la horda. Matalos antes de que te vean.',
  'Los hinchados revientan en gas tóxico. No los mates de cerca.',
  'Mantené E al lado de un compañero caído para levantarlo.',
  'Revisá armarios y escritorios: casi siempre hay algo.',
  'En Pesadilla cada bala cuenta. Usá el bate cuando puedas.',
  'La linterna (F) te deja ver... y deja que te vean.',
  'Los barriles rojos explotan. Los zombies no lo saben.',
];
export function startTips() {
  let i = Math.floor(Math.random() * TIPS.length);
  const show1 = () => { $('loadingTip').textContent = TIPS[i++ % TIPS.length]; };
  show1();
  return setInterval(show1, 2600);
}

// tarjeta de capítulo: número, título, hora y lugar, como en una película
export function chapterCard(num, title, meta, ms = 3200) {
  const el = $('chapter');
  $('chNum').textContent = num; $('chTitle').textContent = title; $('chMeta').textContent = meta;
  el.classList.remove('hidden');
  void el.offsetWidth;
  el.classList.add('on');
  sfx('thunder', 0.35);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      el.classList.remove('on');
      setTimeout(() => el.classList.add('hidden'), 900);
      resolve();
    };
    setTimeout(finish, ms);
    chapterSkip = finish;
  });
}
let chapterSkip = null;
export function skipChapter() { chapterSkip?.(); }

// ---------------- HUD ----------------
const cache = {};
function set(id, prop, val) {
  if (cache[id + prop] === val) return;
  cache[id + prop] = val;
  $(id)[prop] = val;
}

export function buildHud(p) {
  const hearts = $('hearts');
  hearts.innerHTML = '';
  for (let i = 0; i < 5; i++) { const im = document.createElement('img'); im.src = 'assets/ui/heart_full.png'; hearts.appendChild(im); }
  $('hotbar').innerHTML = '';
  ORDER.forEach((w, i) => {
    const s = document.createElement('div');
    s.className = 'slot'; s.id = `slot_${w}`;
    s.innerHTML = `<span class="k">${i + 1}</span><img src="assets/ui/icon_${WEAPONS[w].icon}.png" alt=""><span class="n"></span>`;
    $('hotbar').appendChild(s);
  });
  [['bandage', 'Q'], ['medkit', '']].forEach(([k, key], i) => {
    const s = document.createElement('div');
    s.className = `slot${i === 0 ? ' sep' : ''}`; s.id = `slot_${k}`;
    s.innerHTML = `<span class="k">${key}</span><img src="assets/ui/icon_${k}.png" alt=""><span class="n"></span>`;
    $('hotbar').appendChild(s);
  });
  Object.keys(cache).forEach((k) => delete cache[k]);
  const ch = charById(p.char);
  $('hudPortrait').src = `assets/char/${ch.id}/portrait.png`;
  $('hudName').textContent = ch.name;
  $('hudName').style.color = ch.color;
  set('hudLevel', 'innerHTML', digits(esc(`${S.level.survival ? 'Supervivencia' : `Noche ${S.level.id}`} · ${S.level.name}`)) + (S.diff?.id === 'pesadilla' ? ' <span class="hard">· pesadilla</span>' : ''));
  updateHud(p);
}

export function updateHud(p) {
  const imgs = $('hearts').children, per = p.maxHp / 5;
  for (let i = 0; i < 5; i++) {
    const r = p.hp - i * per;
    const src = r >= per ? 'full' : r > 0 ? 'half' : 'empty';
    if (imgs[i].dataset.s !== src) { imgs[i].dataset.s = src; imgs[i].src = `assets/ui/heart_${src}.png`; }
  }
  set('hpText', 'textContent', `${Math.ceil(p.hp)}`);
  set('hudWave', 'textContent', `OLEADA ${S.wave} · BAJAS ${S.kills}`);
  set('hudCoins', 'textContent', `${p.coins}`);
  const inv = p.inv;
  for (const w of ORDER) {
    const el = $(`slot_${w}`);
    const own = inv.weapons.includes(w);
    el.classList.toggle('locked', !own);
    el.classList.toggle('active', inv.cur === w);
    const n = own && WEAPONS[w].ammo ? inv.mag[w] + inv.ammo[WEAPONS[w].ammo] : '';
    if (el.lastChild.textContent !== String(n)) el.lastChild.textContent = n;
  }
  for (const k of ['bandage', 'medkit']) {
    const el = $(`slot_${k}`);
    el.classList.toggle('locked', inv[k] <= 0);
    if (el.lastChild.textContent !== String(inv[k])) el.lastChild.textContent = inv[k];
  }
  const w = WEAPONS[inv.cur];
  set('ammoMag', 'textContent', w.melee ? '∞' : `${inv.mag[inv.cur]}`);
  set('ammoRes', 'textContent', w.melee ? w.name.toUpperCase() : `/ ${inv.ammo[w.ammo]}  ${w.name.toUpperCase()}`);
  $('ammoReload').classList.toggle('hidden', !(p.reloadT > 0));
  const o = objectiveText();
  set('objText', 'textContent', o.text);
  $('objBar').classList.toggle('hidden', o.bar == null);
  if (o.bar != null) $('objBarFill').style.width = `${Math.round(o.bar * 100)}%`;
}

export function prompt(text) {
  $('prompt').classList.toggle('hidden', !text);
  if (text) set('prompt', 'textContent', text);
}

let bannerT = null;
export function banner(text, danger) {
  const b = $('banner');
  b.innerHTML = digits(pxHtml(text)); b.classList.toggle('danger', !!danger); b.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 2600);
}

let toastT = null;
export function toast(text) {
  const t = $('toast');
  t.innerHTML = pxHtml(text); t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

// Subtítulos con efecto de máquina de escribir. Devuelve una promesa que se
// resuelve al terminar (o al saltarlos).
let subRun = 0;
export function subtitles(lines, hold = 1600) {
  const el = $('subtitles'), run = ++subRun;
  el.classList.remove('hidden');
  return new Promise((resolve) => {
    let li = 0, ci = 0;
    const tick = () => {
      if (run !== subRun) return resolve();
      if (li >= lines.length) { el.classList.add('hidden'); return resolve(); }
      const line = lines[li];
      const m = line.match(/^([A-ZÁÉÍÓÚÑ]{3,}):\s*/);
      const who = m ? m[1] : null, body = m ? line.slice(m[0].length) : line;
      ci++;
      el.innerHTML = (who ? `<span class="speaker">${esc(who[0] + who.slice(1).toLowerCase())}</span>` : '') + esc(body.slice(0, ci));
      if (ci >= body.length) ci = line.length;
      if (ci % 3 === 0) sfx('uiHover', 0.25);
      if (ci >= line.length) { li++; ci = 0; setTimeout(tick, hold); } else setTimeout(tick, 28);
    };
    tick();
  });
}
export function skipSubtitles() { subRun++; $('subtitles').classList.add('hidden'); }
export function skipHint(on) { $('skipHint').classList.toggle('hidden', !on); }

// ---------------- tienda ----------------
export function openShop(p, items) {
  const grid = $('shopGrid');
  grid.innerHTML = '';
  const refresh = () => {
    $('shopCoins').textContent = p.coins;
    grid.querySelectorAll('.item').forEach((b) => {
      const it = SHOP_ITEMS[b.dataset.k];
      const owned = it.weapon && p.inv.weapons.includes(it.weapon);
      const needGun = b.dataset.k.startsWith('ammo_') && !p.inv.weapons.includes(b.dataset.k.slice(5));
      b.disabled = owned || needGun || p.coins < priceOf(it, S.diff);
      b.querySelector('small').textContent = owned ? 'ya la tenés' : needGun ? 'necesitás el arma' : it.sub;
    });
  };
  for (const k of items) {
    const it = SHOP_ITEMS[k];
    const b = document.createElement('button');
    b.className = 'item'; b.dataset.k = k;
    b.innerHTML = `<img src="assets/ui/${it.icon}.png" alt=""><span class="t">${it.name}<small></small></span><span class="p">${priceOf(it, S.diff)}</span>`;
    b.addEventListener('mouseenter', () => sfx('uiHover'));
    b.addEventListener('click', () => { if (H.onShopBuy(k)) refresh(); });
    grid.appendChild(b);
  }
  refresh();
  show('shopMenu');
}

// ---------------- resultados ----------------
// role: null (un jugador) | 'host' | 'client'
const endLabel = (role) => (role === 'host' ? 'volver a la sala' : role === 'client' ? 'salir de la sala' : 'menú');
export function showResults(stats, rank, hasNext, role = null) {
  $('resultsRank').textContent = rank;
  $('resultsStats').innerHTML = stats.map(([k, v]) => `<span>${pxHtml(k)}</span><span>${pxHtml(v)}</span>`).join('');
  $('btnNext').classList.toggle('hidden', !hasNext || role === 'client');
  $('resultsNote').classList.toggle('hidden', role !== 'client');
  $('btnResultsMenu').textContent = endLabel(role);
  $('resultsTitle').textContent = hasNext ? 'Noche superada' : 'Sobrevivieron';
  if (!role && !hasNext) $('resultsTitle').textContent = 'Sobreviviste';
  show('resultsMenu');
}
export function showDeath(stats, role = null, title = null) {
  $('deathStats').innerHTML = stats.map(([k, v]) => `<span>${pxHtml(k)}</span><span>${pxHtml(v)}</span>`).join('');
  $('btnRetry').classList.toggle('hidden', role === 'client');
  $('deathNote').classList.toggle('hidden', role !== 'client');
  $('btnDeathMenu').textContent = endLabel(role);
  document.querySelector('#deathMenu .screen-title').textContent = px(title || (role ? 'CAYÓ TODO EL EQUIPO' : 'TE ATRAPARON'));
  show('deathMenu');
}
export function pauseOptions(role) {
  $('btnRestart').classList.toggle('hidden', role === 'client');
  $('btnQuit').textContent = role ? 'salir de la sala' : 'menú principal';
}
export function closeOverlaysForOutro() { hideOverlays(); }

// ---------------- JUNTOS (multijugador) ----------------
function status(text, bad) {
  const s = $('coopStatus');
  s.textContent = text || '';
  s.classList.toggle('bad', !!bad);
}

function showCoop(code) {
  if (code) $('coopCode').value = code;
  renderLobby();
  show('coopMenu');
}
export { showCoop };
export function showLobby() { renderLobby(); show('coopMenu'); }

function initCoop() {
  const name = $('coopName');
  name.value = save.name || '';
  const getName = () => {
    const n = name.value.trim().replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ ]/g, '').slice(0, 10) || 'Jugador';
    save.name = n; persist();
    return n;
  };
  $('coopCode').addEventListener('input', (e) => { e.target.value = cleanCode(e.target.value); });
  $('btnCreateRoom').addEventListener('click', async () => {
    status('Abriendo frecuencia...');
    try { await H.onCoopCreate(getName(), save.char || 'tomas'); status(''); } catch (e) { status(e.message, true); }
  });
  const join = async () => {
    const code = cleanCode($('coopCode').value);
    if (code.length !== 5) { status('El código tiene 5 letras o números', true); return; }
    status('Sintonizando...');
    try { await H.onCoopJoin(code, getName(), save.char || 'tomas'); status(''); } catch (e) { status(e.message, true); }
  };
  $('btnJoinRoom').addEventListener('click', join);
  $('coopCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
  $('btnStartCoop').addEventListener('click', () => H.onCoopStart());
  $('btnCoopBack').addEventListener('click', () => { if (room.role) H.onCoopLeave(); status(''); renderLobby(); show('mainMenu'); });
  $('btnCopyLink').addEventListener('click', async () => {
    const link = `${location.origin}${location.pathname}?sala=${room.code}`;
    try { await navigator.clipboard.writeText(link); status('Enlace copiado. Mandáselo a tus amigos.'); } catch { status(link); }
  });
}

export function renderLobby() {
  const inRoom = !!room.role;
  $('coopJoin').classList.toggle('hidden', inRoom);
  if (!inRoom) { chatLog.length = 0; $('lobbyChatLog').innerHTML = ''; $('chatLog').innerHTML = ''; }
  $('coopLobby').classList.toggle('hidden', !inRoom);
  $('btnCoopBack').textContent = inRoom ? 'salir de la sala' : 'volver';
  if (!inRoom) return;
  $('roomCode').textContent = room.code;
  const slots = $('lobbySlots');
  slots.innerHTML = '';
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const p = room.players.find((q) => q.idx === i);
    const d = document.createElement('div');
    d.className = `pslot${p ? '' : ' empty'}`;
    d.style.setProperty('--pc', TINT_CSS[i]);
    d.innerHTML = p
      ? `${sprite(p.char || 'tomas', 2.6)}<span class="who"><span class="pn">${esc(p.name)}</span><span class="pc">${charById(p.char).name} · ${charById(p.char).role}</span>${i === 0 ? '<span class="ptag">anfitrión</span>' : ''}${i === room.me ? '<span class="ptag you">vos</span>' : ''}</span>`
      : '<span class="who"><span class="pn">esperando señal...</span></span>';
    slots.appendChild(d);
  }
  const mine = room.players.find((q) => q.idx === room.me);
  const pick = $('lobbyPick');
  pick.innerHTML = '';
  for (const c of CHARACTERS) {
    const b = document.createElement('button');
    const takenBy = room.players.find((q) => q.char === c.id && q.idx !== room.me);
    b.className = mine?.char === c.id ? 'on' : '';
    b.disabled = !!takenBy || room.inGame;
    b.title = takenBy ? `lo eligió ${takenBy.name}` : `${c.name} · ${c.perk}`;
    b.innerHTML = `${sprite(c.id, 2.2)}<span>${c.name}</span>`;
    b.addEventListener('click', () => { sfx('uiClick'); save.char = c.id; persist(); updateStrip(); H.onCoopPick(c.id); });
    pick.appendChild(b);
  }
  const host = room.role === 'host';
  const lv = $('lobbyLevels');
  lv.innerHTML = '';
  for (const L of LEVELS) {
    const b = document.createElement('button');
    b.className = `lvl${room.level === L.id ? ' on' : ''}`;
    b.disabled = !host;
    if (thumbs[L.id]) b.style.backgroundImage = `url(${thumbs[L.id]})`;
    b.innerHTML = `<span>${room.mode === 'survival' ? 'mapa' : 'noche'} ${L.id}</span><b>${esc(L.name)}</b>`;
    b.addEventListener('click', () => { sfx('uiClick'); H.onCoopLevel(L.id); });
    lv.appendChild(b);
  }
  renderDiffToggle($('lobbyDiff'), room.diff, (id) => H.onCoopDiff(id), host);
  renderToggle($('lobbyMode'), MODES, room.mode, (id) => H.onCoopMode(id), host);
  $('btnStartCoop').classList.toggle('hidden', !host);
  $('lobbyWait').classList.toggle('hidden', host);
  $('btnStartCoop').textContent = room.players.length > 1 ? `empezar · ${room.players.length} sobrevivientes` : 'empezar solo';
}
