'use strict';
/* =========================================================
   RUNE DUEL – 앱 셸 : 라우터 · 헤더 · 하단 탭 · CRT · 모달 · 토스트 · 주스
   레이아웃 = 라이브 서비스형 / 디자인 = 레트로 CRT(포커 테이블)
   ========================================================= */
const TABS = [['home', '홈', 'home'], ['friend', '대전', 'battle'], ['cards', '카드', 'cards'], ['deck', '덱', 'deck'], ['history', '기록', 'history']];
const tabIdx = s => { const i = TABS.findIndex(t => t[0] === s); return i < 0 ? 0 : i; };
const Screens = {};

const store = {
  get(k, d) { try { const v = localStorage.getItem('runeduel.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('runeduel.' + k, JSON.stringify(v)); } catch (e) { } },
};

const App = {
  screen: null, timers: [], keyH: null, scale: 1,
  rules: { turnLimit: 0, turnTime: 60, startHP: 100 },
  diff: 'normal',
  player: { name: '플레이어', lv: 1 },
  battleOpt: { hl: 'size', cd: 'lock', forecast: false },
  lastResult: null,
  get myDeck() { return this._deck; },
  set myDeck(v) { this._deck = v; store.set('deck', v); },
  get history() { return this._hist; },
  set history(v) { this._hist = v; store.set('history', v); },

  init() {
    const d = store.get('deck', null);
    this._deck = Array.isArray(d) && d.every(id => EF[id]) ? d : [...DEFAULT_DECK];
    const h = store.get('history', null);
    this._hist = Array.isArray(h) && h.length ? h : [...SAMPLE_HISTORY];
    this.battleOpt = { ...this.battleOpt, ...store.get('battleOpt', {}) };
    this.diff = store.get('diff', 'normal'); if (!DIFFS[this.diff]) this.diff = 'normal';
    $('#chrome').innerHTML = `
      <header class="hd pe"><div class="hd-logo">RUNE DUEL<small>룬 결투</small></div><span class="hd-where" id="hdWhere"></span>
        <div class="hd-prof"><span class="av"></span><div><b>${this.player.name}</b><small>LV. ${this.player.lv}</small></div><button class="hd-snd ${AOPT.mute ? 'off' : ''}" id="hdSnd" title="${AOPT.mute ? '소리 켜기' : '음소거'}">${AOPT.mute ? '🔇' : '🔊'}</button><button class="hd-set" id="hdSet">설정</button></div></header>
      <nav class="tabbar pe">${TABS.map(([s, t, ic]) => `<button data-s="${s}">${ui(ic, 24)}<span>${t}</span></button>`).join('')}<i class="tab-ind"></i></nav>
      <div class="crt"></div><div class="vig"></div>`;
    $$('.tabbar button').forEach(b => b.onclick = () => { if (this.screen !== b.dataset.s) { juice(b); this.go(b.dataset.s); } });
    $('#hdSet').onclick = () => settingsModal();
    $('#hdSnd').onclick = () => setMute(!AOPT.mute);
    window.addEventListener('resize', () => this.fit());
    document.addEventListener('keydown', e => {
      if (e.target && e.target.matches && e.target.matches('input,textarea,select') && e.key !== 'Escape') return;
      if (this.keyH && this.keyH(e) === true) { e.preventDefault(); return; }
      if (e.key === 'Escape') { if ($('#layer .mwrap')) { closeModal(); return; } if (Screens[this.screen] && Screens[this.screen].tab && this.screen !== 'home') this.go('home'); }
    });
    document.addEventListener('pointerdown', e => { Sfx.init(); const b = e.target.closest('.btn,.chip,.back,.row-btn,.hd-set,.b-menu'); if (b && !b.disabled) { juice(b); Sfx.play('click'); } });
    document.addEventListener('keydown', () => Sfx.init(), { once: true });
    document.addEventListener('mouseover', e => {
      const b = e.target.closest('.btn:not([disabled]),.chip,.row-btn,.tabbar button,.mc:not(.empty),.ai,.vt button,.seg2 button,.hc,.oc,.dm-c,.rp-c,.fg,.hd-set');
      if (b && !b.contains(e.relatedTarget)) Sfx.play('hover');
    });
    BG.init();
    setTimeout(() => { if (!AU.ctx && !AOPT.mute) toast('🔊 화면을 한 번 클릭하면 배경음악과 효과음이 켜집니다'); }, 900);
    this.fit();
    this.go('home', {}, true);
  },
  fit() {
    const W = innerWidth, H = innerHeight, s = Math.min(W / 1440, H / 810);
    this.scale = s; const st = $('#stage');
    st.style.transform = `scale(${s})`; st.style.left = (W - 1440 * s) / 2 + 'px'; st.style.top = (H - 810 * s) / 2 + 'px';
  },
  go(screen, opts = {}, instant = false) {
    const S = Screens[screen]; if (!S) return;
    this.clear(); closeModal(true); hideTip();
    $('#screens').classList.remove('desat'); $$('.fx-crack,.fx-banner').forEach(x => x.remove());
    const host = $('#screens'), olds = [...host.children];
    // 사라지는 화면의 id를 지워, 새 화면과 id가 겹쳐 엉뚱한 곳에 그려지는 일을 막음
    olds.forEach(o => $$('[id]', o).forEach(x => x.removeAttribute('id')));
    const el = document.createElement('div');
    el.className = `screen s-${screen} ${S.full ? 'full' : ''}`;
    el.innerHTML = S.html(opts);
    host.appendChild(el);
    const from = this.screen; this.screen = screen;
    if (screen === 'battle') Music.play('battle'); else if (screen !== 'fame' && screen !== 'report') { Music.play('lobby'); Music.setIntense(false); }
    const ch = $('#chrome'); ch.classList.toggle('bare', !!S.full);
    $('#hdWhere').textContent = S.title || '';
    const i = tabIdx(S.tab || 'home');
    $$('.tabbar button').forEach((b, k) => b.classList.toggle('on', k === i && !!S.tab));
    $('.tab-ind').style.transform = `translateX(${i * 100}%)`;
    if (olds.length && !instant) {
      olds.slice(0, -1).forEach(o => o.remove());
      transition(olds[olds.length - 1], el, Screens[from], S, from, screen);
    } else olds.forEach(o => o.remove());
    S.bind && S.bind(el, opts);
  },
  after(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(() => clearTimeout(t)); return t; },
  every(fn, ms) { const t = setInterval(fn, ms); this.timers.push(() => clearInterval(t)); return t; },
  clear() { this.timers.forEach(f => f()); this.timers = []; this.keyH = null; },
  stagePt(cx, cy) { const r = $('#stage').getBoundingClientRect(); return { x: (cx - r.left) / this.scale, y: (cy - r.top) / this.scale }; },
  rectOf(el) { if (!el) return { x: 720, y: 405, w: 0, h: 0 }; const r = el.getBoundingClientRect(), p = this.stagePt(r.left, r.top); return { x: p.x, y: p.y, w: r.width / this.scale, h: r.height / this.scale }; },
  startBattle(o = {}) { this.go('battle', o); },
  addHistory(h) { this.history = [h, ...this.history].slice(0, 30); },
};

/* 전환 : 탭 사이 = 좌우 슬라이드 / 전투·결과 진입 = CRT 켜짐 */
function transition(old, el, A, B, from, to) {
  old.style.pointerEvents = 'none';
  if (from === 'match' || to === 'match') { old.remove(); return; }
  Sfx.play(B.full || (A && A.full) ? 'power' : 'tab');
  if (B.full || (A && A.full)) {
    FX.flash('#ffffff', .35, 300);
    old.animate([{ filter: 'brightness(1)', transform: 'none' }, { filter: 'brightness(3)', transform: 'scaleY(.01)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' });
    el.animate([{ transform: 'scaleY(.005) scaleX(.6)', filter: 'brightness(4)' }, { transform: 'scaleY(.02) scaleX(1)', filter: 'brightness(3)', offset: .35 }, { transform: 'none', filter: 'brightness(1)' }], { duration: 440, delay: 200, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' });
    setTimeout(() => old.remove(), 230); return;
  }
  const d = tabIdx(B.tab || to) >= tabIdx((A && A.tab) || from) ? 1 : -1;
  old.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-d * 80}px)`, opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
  el.animate([{ transform: `translateX(${d * 120}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 400, easing: 'cubic-bezier(.2,1,.3,1)' });
  setTimeout(() => old.remove(), 310);
}

/* ---------- 모달 / 토스트 / 툴팁 / 효과 ---------- */
function modal(html, { cls = '', onClose, backdrop = true } = {}) {
  closeModal(true);
  const w = document.createElement('div');
  w.className = 'mwrap ' + cls;
  w.innerHTML = `<div class="mback"></div><div class="mbox">${html}</div>`;
  $('#layer').appendChild(w);
  w._onClose = onClose;
  if (backdrop) w.querySelector('.mback').addEventListener('click', () => closeModal());
  requestAnimationFrame(() => w.classList.add('open'));
  Sfx.play('open');
  return w;
}
function closeModal(instant) {
  $$('#layer .mwrap').forEach(w => {
    if (w._closing) return; w._closing = true;
    w._onClose && w._onClose();
    w.classList.remove('open'); w.classList.add('closing');
    if (instant) w.remove(); else setTimeout(() => w.remove(), 240);
  });
}
function toast(msg, type = '') {
  Sfx.play(type === 'err' ? 'error' : type === 'ok' ? 'coin' : 'pop');
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 1900); setTimeout(() => t.remove(), 2300);
}
function burst(x, y, colors = ['#fff'], n = 16, spread = 110) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); p.className = 'ptc';
    const a = Math.random() * Math.PI * 2, d = spread * (.4 + Math.random() * .8);
    p.style.cssText = `left:${x}px;top:${y}px;background:${pick(colors)};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--s:${4 + rnd(7)}px`;
    $('#layer').appendChild(p); setTimeout(() => p.remove(), 800);
  }
}
function juice(btn) {
  const r = App.rectOf(btn), c = getComputedStyle(btn).getPropertyValue('--c').trim() || '#ffe08a';
  burst(r.x + r.w / 2, r.y + r.h / 2, [c, '#fff', '#ffe08a'], 12, 80);
  // 클릭 도중 화면을 흔들면 버튼이 커서 밑에서 벗어나 클릭이 빠질 수 있어, 버튼 자체만 살짝 튕김
  btn.animate([{ scale: 1 }, { scale: .94 }, { scale: 1 }], { duration: 160 });
}
function shake(el, cls = 'shake') { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }
function bump(el) { if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function countUp(el, to, ms = 900) {
  const from = +(el.dataset.v || 0), t0 = performance.now(); el.dataset.v = to;
  const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function bindTips(root) {
  root.addEventListener('mouseover', e => {
    const t = e.target.closest('[data-tip]'); if (!t) return;
    let tip = $('#tip'); if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; tip.className = 'tip'; $('#layer').appendChild(tip); }
    tip.innerHTML = t.dataset.tip; const r = App.rectOf(t);
    tip.style.left = clamp(r.x + r.w / 2, 140, 1300) + 'px'; tip.style.top = r.y + 'px'; tip.classList.add('show');
  });
  root.addEventListener('mouseout', e => { const t = e.target.closest('[data-tip]'); if (t && !t.contains(e.relatedTarget)) hideTip(); });
}
function hideTip() { const t = $('#tip'); t && t.classList.remove('show'); }
const btn = (label, sub, color, attrs = '', cls = '') => `<button class="btn ${cls}" style="--c:${color}" ${attrs}><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
const C = { red: '#ff5a3c', blue: '#2a6bbd', yellow: '#e6a33c', purple: '#7d4cc4', gray: '#3f4c47', green: '#2fa36b' };

function setMute(v) {
  AOPT.mute = v; saveAOPT(); AU.init(); AU.apply();
  const b = $('#hdSnd'); if (b) { b.classList.toggle('off', v); b.textContent = v ? '🔇' : '🔊'; b.title = v ? '소리 켜기' : '음소거'; }
}
function settingsModal() {
  const o = App.battleOpt;
  const seg = (k, opts) => `<div class="seg" data-k="${k}">${opts.map(([v, t]) => `<button data-v="${v}" class="${String(o[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const w = modal(`<div class="setm"><h3>설정</h3>
    <label>효과 카드 강조 방식 <small>(마우스를 올렸을 때)</small></label>${seg('hl', [['size', '크기 변화'], ['border', '테두리 색'], ['both', '둘 다']])}
    <label>쿨타임 표시</label>${seg('cd', [['lock', '자물쇠'], ['hourglass', '모래시계'], ['tint', '색상 변환']])}
    <label>피해 정산 연출</label>${seg('forecast', [[true, '전투 예측 먼저'], [false, '바로 정산']])}
    <label>연출 속도 <small>(피해 정산 중 화면 클릭·Space로 건너뛰기)</small></label><div class="seg" data-fx="speed">${[['normal', '보통'], ['fast', '빠르게']].map(([v, t]) => `<button data-v="${v}" class="${FXOPT.speed === v ? 'on' : ''}">${t}</button>`).join('')}</div>
    <label>사운드</label>
    <div class="vol"><span>효과음</span><input type="range" min="0" max="100" value="${Math.round(AOPT.sfx * 100)}" data-a="sfx"><b class="num">${Math.round(AOPT.sfx * 100)}</b></div>
    <div class="vol"><span>배경음악</span><input type="range" min="0" max="100" value="${Math.round(AOPT.music * 100)}" data-a="music"><b class="num">${Math.round(AOPT.music * 100)}</b></div>
    <div class="seg" data-mute="1">${[[false, '소리 켜기'], [true, '전체 음소거']].map(([v, t]) => `<button data-v="${v}" class="${AOPT.mute === v ? 'on' : ''}">${t}</button>`).join('')}</div>
    <label>화면 흔들림 · 타격감 <small>(멀미가 나면 줄이세요)</small></label><div class="seg" data-fx="shake">${[['off', '끄기'], ['normal', '보통'], ['strong', '강하게']].map(([v, t]) => `<button data-v="${v}" class="${FXOPT.shake === v ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="setm-f">${btn('기록 초기화', '', C.gray, 'id="stReset"')}${btn('닫기', '', C.blue, 'id="stX"')}</div></div>`, { cls: 'm-set' });
  $$('.seg', w).forEach(sg => sg.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; let v = b.dataset.v; if (v === 'true') v = true; if (v === 'false') v = false;
    if (sg.dataset.fx) { FXOPT[sg.dataset.fx] = v; saveFxOpt(); $$('button', sg).forEach(x => x.classList.toggle('on', x === b)); if (sg.dataset.fx === 'shake') FX.shake(1); Sfx.play('confirm'); return; }
    if (sg.dataset.mute) { setMute(v); $$('button', sg).forEach(x => x.classList.toggle('on', x === b)); Sfx.play('confirm'); return; }
    o[sg.dataset.k] = v; store.set('battleOpt', o); $$('button', sg).forEach(x => x.classList.toggle('on', x === b));
    const bt = $('#bt'); if (bt) bt.className = bt.className.replace(/hl-\w+/, 'hl-' + o.hl).replace(/cd-\w+/, 'cd-' + o.cd);
  });
  $$('.vol input', w).forEach(r => {
    r.oninput = () => { AOPT[r.dataset.a] = r.value / 100; r.nextElementSibling.textContent = r.value; AU.apply(); saveAOPT(); };
    r.onchange = () => { if (r.dataset.a === 'sfx') Sfx.play('coin'); };
  });
  $('#stX', w).onclick = () => closeModal();
  $('#stReset', w).onclick = () => { App.history = [...SAMPLE_HISTORY]; App.myDeck = [...DEFAULT_DECK]; toast('기록과 덱을 처음 상태로 되돌렸습니다'); closeModal(); if (Screens[App.screen].tab) App.go(App.screen); };
  return w;
}
