import { S, bus } from '../core/state.js';
import { save, persist } from '../core/save.js';
import { sfx } from '../core/audio.js';
import { LEVELS, LEVEL4, SHOP_ITEMS } from '../game/levels.js';
import { WEAPONS, ORDER } from '../game/weapons.js';
import { objectiveText } from '../game/objectives.js';

const $ = (id) => document.getElementById(id);
const OVERLAYS = ['mainMenu', 'levelMenu', 'settingsMenu', 'howtoMenu', 'creditsMenu', 'pauseMenu', 'shopMenu', 'resultsMenu', 'deathMenu', 'loading'];
let H = {};
let backTo = 'mainMenu';

export function show(id) {
  $('banner').classList.remove('show');
  OVERLAYS.forEach((o) => $(o).classList.toggle('hidden', o !== id));
}
export function hideOverlays() { OVERLAYS.forEach((o) => $(o).classList.add('hidden')); }
export function setHud(on) {
  $('hud').classList.toggle('hidden', !on);
  $('topControls').classList.toggle('hidden', !on);
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
    if (act === 'levels') { renderLevels(); show('levelMenu'); }
    if (act === 'settings') { backTo = 'mainMenu'; show('settingsMenu'); }
    if (act === 'howto') show('howtoMenu');
    if (act === 'credits') show('creditsMenu');
  }));
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
  $('btnResultsMenu').addEventListener('click', () => H.onQuit());
  $('btnRetry').addEventListener('click', () => H.onRestart());
  $('btnDeathMenu').addEventListener('click', () => H.onQuit());

  bus.on('banner', ({ text, danger }) => banner(text, danger));
  bus.on('toast', (t) => toast(t));
  bus.on('subtitle', (t) => subtitles([t], 5000));
  bus.on('objective', () => $('objective').classList.add('flash') || setTimeout(() => $('objective').classList.remove('flash'), 800));
  bus.on('coins', () => { const c = document.querySelector('.hud-coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
  updateContinue();
}

export function updateContinue() {
  $('btnContinue').innerHTML = `<span class="arrow"></span>${save.unlocked > 1 ? 'CONTINUAR' : 'JUGAR'}`;
}

function renderLevels() {
  const wrap = $('levelCards');
  wrap.innerHTML = '';
  [...LEVELS, LEVEL4].forEach((L) => {
    const locked = L.id === 4 || L.id > save.unlocked;
    const c = document.createElement('button');
    c.className = `card${locked ? ' locked' : ''}`;
    c.style.setProperty('--c', `linear-gradient(160deg, ${L.color}, #07070a)`);
    c.innerHTML = `
      <div class="tag">${L.tag}</div>
      ${save.best[L.id] ? `<div class="best">${save.best[L.id]}</div>` : ''}
      <div class="num">NOCHE ${L.id}</div>
      <div class="name">${L.name.toUpperCase()}</div>
      <div class="desc">${L.desc}</div>
      ${locked ? `<div class="lockmsg">${L.id === 4 ? 'PRÓXIMAMENTE' : 'SUPERÁ LA NOCHE ANTERIOR'}</div>` : ''}`;
    c.addEventListener('mouseenter', () => sfx('uiHover'));
    if (!locked) c.addEventListener('click', () => { sfx('uiClick'); H.onPlayLevel(L.id); });
    wrap.appendChild(c);
  });
}

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
  set('hudLevel', 'textContent', `NOCHE ${S.level.id} · ${S.level.name.toUpperCase()}`);
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
  b.textContent = text; b.classList.toggle('danger', !!danger); b.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 2600);
}

let toastT = null;
export function toast(text) {
  const t = $('toast');
  t.textContent = text; t.classList.add('show');
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
      ci++;
      el.textContent = line.slice(0, ci);
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
      b.disabled = owned || needGun || p.coins < it.price;
      b.querySelector('small').textContent = owned ? 'ya la tenés' : needGun ? 'necesitás el arma' : it.sub;
    });
  };
  for (const k of items) {
    const it = SHOP_ITEMS[k];
    const b = document.createElement('button');
    b.className = 'item'; b.dataset.k = k;
    b.innerHTML = `<img src="assets/ui/${it.icon}.png" alt=""><span class="t">${it.name}<small></small></span><span class="p">${it.price}</span>`;
    b.addEventListener('mouseenter', () => sfx('uiHover'));
    b.addEventListener('click', () => { if (H.onShopBuy(k)) refresh(); });
    grid.appendChild(b);
  }
  refresh();
  show('shopMenu');
}

// ---------------- resultados ----------------
export function showResults(stats, rank, hasNext) {
  $('resultsRank').textContent = rank;
  $('resultsStats').innerHTML = stats.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('');
  $('btnNext').classList.toggle('hidden', !hasNext);
  $('resultsTitle').textContent = hasNext ? 'NOCHE SUPERADA' : 'SOBREVIVISTE';
  show('resultsMenu');
}
export function showDeath(stats) {
  $('deathStats').innerHTML = stats.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('');
  show('deathMenu');
}
