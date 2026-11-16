'use strict';
/* =========================================================
   RUNE DUEL – 공통 데이터 / 라우터 / 유틸
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function injectCSS(css) { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }

/* ---------- 카드 데이터 ---------- */
const SUITS = ['♠', '♥', '♣', '◆'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITNAME = { '♠': '스페이드', '♥': '하트', '♣': '클로버', '◆': '다이아' };
const isRed = s => s === '♥' || s === '◆';
const GRADES = { C: { ko: '일반', en: 'Common' }, R: { ko: '희귀', en: 'Rare' }, E: { ko: '영웅', en: 'Epic' }, L: { ko: '전설', en: 'Legend' } };
const GRADE_ORDER = { C: 0, R: 1, E: 2, L: 3 };

// 코드|이름|등급|A액티브/P패시브|분류|쿨타임|설명|효과값
const RAW = `
♠A|강타|C|A|공격|1|이번 턴 최종 점수에 고정 피해 +3|bonus:3
♠2|일격|R|A|공격|2|이번 턴 치명타 확률 +5% (중첩 가능)|crit:5
♠3|일격|R|A|공격|2|이번 턴 치명타 확률 +5% (중첩 가능)|crit:5
♠4|제련|C|P|강화|0|턴 시작마다 최종 피해 +1 누적|smelt:1
♠5|제련|C|P|강화|0|턴 시작마다 최종 피해 +1 누적|smelt:1
♠6|열상|R|A|공격/방해|4|적중 시 상대에게 지속 피해 3 (2턴)|dot:3
♠7|연격|E|A|공격|1|적중 시 입힌 피해의 절반을 추가로 입힘|chain:0.5
♠8|파괴|R|A|방해|2|상대의 실드 효과를 20% 확률로 무효화|breakS:20
♠9|매의 눈|E|A|방해|3|상대의 실드·감면을 즉시 무시하고 공격|pierce:1
♠10|찬스 스텝|L|A|공격/방해|2|적중 시 피해 결산 한 번 더 (실패 시 불발)|again:1
♠J|강타|C|A|공격|1|이번 턴 최종 점수에 고정 피해 +3|bonus:3
♠Q|심판|L|A|공격|2|이번 턴 최종 데미지 ×2|mult:2
♠K|힘|R|P|와일드|0|♠ 스페이드 드로우 가중치 소폭 증가|wS:1
♥A|무적|L|A|유틸/방어|5|이번 턴 받는 모든 피해를 한 번 무시|immune:1
♥2|집중|C|A|유틸/방어|1|급소 회피 +20% (받는 피해 20% 감면)|reduce:20
♥3|반격|R|A|유틸/방어|3|피해를 받지 않으면 다음 턴 최종 피해 +3|counter:3
♥4|반격|R|A|유틸/방어|3|피해를 받지 않으면 다음 턴 최종 피해 +3|counter:3
♥5|예측|E|A|유틸/방어|1|100% 급소 회피 (받는 피해 50% 감면)|reduce:50
♥6|금강|E|A|유틸/방어|3|즉시 실드 +4, 체력 +4|shield:4,heal:4
♥7|방패|C|A|방어|2|즉시 실드 +6 (1턴 뒤 소멸)|shield:6
♥8|방패|C|A|방어|2|즉시 실드 +6 (1턴 뒤 소멸)|shield:6
♥9|강건|L|A|방어|2|잃은 체력의 50%만큼 실드 (최대 20)|sturdy:1
♥10|평화|R|P|와일드|0|♥ 하트 드로우 가중치 소폭 증가|wH:1
♥J|불사|L|P|특수|0|HP가 0이 되면 HP 1로 1회 생존|undying:1
♥Q|긴급 치료|C|A|유틸|2|즉시 체력 +6 회복|heal:6
♥K|귀족|E|P|와일드|0|♠/♥ 드로우 가중치 증가|wS:1,wH:1
♣A|운명|L|A|와일드|2|패의 포커 카드 1장을 원하는 카드로 교체|fate:1
♣2|정화|R|A|유틸|5|상대가 부여한 지속 디버프 즉시 제거|cleanse:1
♣3|순환|C|P|특수|0|액티브 사용 시 5% 확률로 즉시 재사용|recycle:5
♣4|순환|C|P|특수|0|액티브 사용 시 5% 확률로 즉시 재사용|recycle:5
♣5|신속|E|P|특수|0|턴 시작 시 무작위 액티브 쿨타임 -1|haste:1
♣6|짐꾼|R|P|특수|0|효과 카드 소지 칸 +2|slots:2
♣7|행운|R|P|특수|0|턴 시작 시 50% 확률로 추가 리롤 +1|luck:50
♣8|결실|R|P|와일드|0|♣ 클로버 드로우 가중치 소폭 증가|wC:1
♣9|서민|E|P|와일드|0|♣ 클로버 드로우 가중치 대폭 증가|wC:2.5
♣10|마법 거울|E|A|와일드|2|방금 사용한 효과 카드의 효과를 복제|mirror:1
♣J|복수|E|P|강화|0|체력이 10% 감소할 때마다 최종 피해 +1|revenge:1
♣Q|화신|L|P|강화|0|공격 적중/실패 시 상대에게 지속 피해 2 (2턴)|avatar:2
♣K|계략|R|P|강화|0|방해 카드 3장 이상 시 방해 액티브 쿨타임 -1|scheme:1
◆A|조커|L|P|와일드|0|보유 시 모든 특성 +1|joker:1
◆2|간파|C|P|함정|0|상대 방해 발동 시 10% 확률로 무효화|
◆3|흐트러짐|C|P|함정|0|상대 유틸 사용 시 30% 확률로 지속 피해 1턴|
◆4|방패 파괴자|R|P|함정|0|상대가 실드 보유 시 최종 피해 +3|shieldBreaker:3
◆5|전염|R|P|함정|0|내가 지속 피해 중이면 상대에게도 1턴 적용|contagion:1
◆6|마법 방패|E|P|함정|0|상대 방해 발동 시 50% 확률로 상대에게도 적용|
◆7|역각성|L|P|함정|0|상대가 유틸/방어 카드를 쓸 때마다 최종 피해 +2|awaken:2
◆8|혼란|E|A|방해|4|상대의 무작위 포커 카드 1장을 강제로 교체|confuse:1
◆9|재정비|R|A|유틸|2|쿨타임 중인 액티브 1장의 쿨타임 -1|refit:1
◆10|지식|R|P|와일드|0|◆ 다이아 드로우 가중치 소폭 증가|wD:1
◆J|교역|E|P|와일드|0|◆ 다이아 드로우 가중치 대폭 증가|wD:2.5
◆Q|폭풍|L|A|방해|5|상대의 모든 패시브를 2턴 동안 비활성화|storm:2
◆K|연계|R|P|강화|0|공격 액티브 2장 이상 사용 시 최종 피해 +3|link:3`;

const EFFECTS = RAW.trim().split('\n').map(line => {
  const [id, name, g, k, cat, cd, desc, fxs] = line.split('|');
  const fx = {};
  (fxs || '').split(',').filter(Boolean).forEach(p => { const [a, b] = p.split(':'); fx[a] = +b; });
  return { id, suit: id[0], rank: id.slice(1), name, g, k, cat, cd: +cd, desc, fx };
});
const EF = Object.fromEntries(EFFECTS.map(e => [e.id, e]));

const TRAITS = [
  { id: 'S', icon: '♠', name: '명예와 권위', req: '♠ 스페이드', tiers: [3, 5, 7], fx: ['최종 피해 ×2', '최종 피해 ×2.5', '최종 피해 ×3'], val: [2, 2.5, 3] },
  { id: 'H', icon: '♥', name: '치유의 맹세', req: '♥ 하트', tiers: [2, 4, 6], fx: ['라운드 시작 HP +3', '라운드 시작 HP +6', '라운드 시작 HP +10'], val: [3, 6, 10] },
  { id: 'C', icon: '♣', name: '네잎의 행운', req: '♣ 클로버', tiers: [2, 4, 6], fx: ['리롤 +1', '리롤 +2', '리롤 +3'], val: [1, 2, 3] },
  { id: 'D', icon: '◆', name: '다이아의 환호', req: '◆ 다이아', tiers: [2, 4, 7], fx: ['라운드 시작 실드 +2', '실드 +4', '실드 +7'], val: [2, 4, 7] },
  { id: '7', icon: '7', name: '럭키 펀치', req: '숫자 7 카드', tiers: [1, 2, 3], fx: ['치명타 10%', '치명타 30%', '치명타 50%'], val: [10, 30, 50] },
  { id: 'T', icon: 'Ⅲ', name: '삼위일체', req: '같은 숫자 카드', tiers: [2, 3], fx: ['리롤 +1', '리롤 +2'], val: [1, 2] },
];
function traitCounts(ids) {
  const es = ids.map(id => EF[id]);
  const joker = es.some(e => e.fx.joker) ? 1 : 0;
  const by = r => es.filter(e => e.rank === r).length;
  const rankMax = Math.max(0, ...RANKS.map(by));
  const n = { S: es.filter(e => e.suit === '♠').length, H: es.filter(e => e.suit === '♥').length, C: es.filter(e => e.suit === '♣').length, D: es.filter(e => e.suit === '◆').length, 7: by('7'), T: rankMax };
  return TRAITS.map(t => {
    const c = n[t.id] + (n[t.id] > 0 || t.id !== 'T' ? joker : 0);
    let tier = -1; t.tiers.forEach((th, i) => { if (c >= th) tier = i; });
    const next = t.tiers.find(th => th > c);
    return { t, n: c, tier, next: next ?? t.tiers[t.tiers.length - 1], val: tier >= 0 ? t.val[tier] : 0 };
  });
}

/* ---------- 덱 규칙 ---------- */
const DECK_MAX = 26, EPIC_MAX = 6, LEG_MAX = 2;
const DEFAULT_DECK = ['♠A', '♠2', '♠3', '♠4', '♠5', '♠6', '♠7', '♠8', '♠9', '♠J', '♠Q', '♠K', '♥2', '♥3', '♥5', '♥6', '♥7', '♥8', '♥Q', '♣2', '♣6', '♣7', '♣8', '◆4', '◆9', '◆K'];
function deckInfo(ids) { const es = ids.map(id => EF[id]); return { n: ids.length, E: es.filter(e => e.g === 'E').length, L: es.filter(e => e.g === 'L').length, suit: Object.fromEntries(SUITS.map(s => [s, es.filter(e => e.suit === s).length])) }; }
function canAdd(ids, id) {
  if (ids.includes(id)) return '이미 덱에 있는 카드입니다';
  const i = deckInfo(ids);
  if (i.n >= DECK_MAX) return `덱은 최대 ${DECK_MAX}장입니다`;
  if (EF[id].g === 'E' && i.E >= EPIC_MAX) return `영웅 등급은 최대 ${EPIC_MAX}장입니다`;
  if (EF[id].g === 'L' && i.L >= LEG_MAX) return `전설 등급은 최대 ${LEG_MAX}장입니다`;
  return null;
}
function deckSummary(ids) { const s = deckInfo(ids).suit; const top = SUITS.slice().sort((a, b) => s[b] - s[a])[0]; return `${SUITNAME[top]} 집중`; }

/* ---------- 아이콘 ---------- */
const ICONP = {
  공격: 'M5 19L15 9M13 5l6-1-1 6M7 13l4 4M4 20l2-2',
  방어: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  유틸: 'M12 5v14M5 12h14',
  방해: 'M6 6l12 12M18 6L6 18',
  강화: 'M12 19V5M6 11l6-6 6 6',
  특수: 'M12 3l8 9-8 9-8-9z',
  함정: 'M6 19L10 5M11 19l4-14M16 19l4-14',
  와일드: 'M12 3l2.6 6 6.4.6-4.9 4.3 1.5 6.3L12 17l-5.6 3.2 1.5-6.3L3 9.6l6.4-.6z',
};
function icon(cat, size = 22) {
  const key = Object.keys(ICONP).find(k => cat.startsWith(k)) || '특수';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONP[key]}"/></svg>`;
}
const UI_ICON = {
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
  battle: '<path d="M5 5l14 14M19 5L5 19M4 8V4h4M20 8V4h-4"/>',
  cards: '<rect x="6" y="3" width="11" height="15" rx="2"/><path d="M9 21h9a2 2 0 002-2V7"/>',
  deck: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M6 5h12M8 2h8"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M9 9h6M9 13h4"/>',
  scroll: '<path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7"/><path d="M7 3a2 2 0 00-2 2v1h4V5a2 2 0 00-2-2zM10 9h6M10 13h6M10 17h3"/>',
  box: '<path d="M3 8l9-5 9 5-9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  glass: '<path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12M7 21c0-3 10-3 10 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
};
const ui = (k, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${UI_ICON[k]}</svg>`;

/* ---------- 카드 마크업 ---------- */
function cardHTML(e, extra = '', attrs = '', inner = '') {
  return `<div class="ec ${e.k === 'A' ? 'act' : 'pas'} g-${e.g} ${isRed(e.suit) ? 'red' : ''} ${extra}" data-id="${e.id}" ${attrs}>
    <div class="ec-h"><span class="ec-code">${e.suit}${e.rank}</span><span class="ec-g">${GRADES[e.g].en}</span></div>
    <div class="ec-n">${e.name}</div>
    <div class="ec-t">${e.k === 'A' ? '액티브' : '패시브'} · ${e.cat}</div>
    <div class="ec-ic">${icon(e.cat, 30)}</div>
    <div class="ec-d">${e.desc}</div>
    <div class="ec-f">${e.k === 'A' ? '쿨타임 ' + e.cd + '턴' : '상시 · 공개'}</div>${inner}
  </div>`;
}
function pokerHTML(c, extra = '', attrs = '') {
  return `<div class="pc ${isRed(c.s) ? 'red' : ''} ${extra}" ${attrs}><span class="pc-tl">${c.r}<i>${c.s}</i></span><span class="pc-c">${c.s}</span><span class="pc-br">${c.r}<i>${c.s}</i></span></div>`;
}

/* ---------- 대전 기록(예시 데이터) ---------- */
const SAMPLE_HISTORY = [
  { win: true, mode: '무작위', rounds: 8, mvp: '심판', dmg: 312, opp: 'Rival_K', date: '11.14', hp: 18 },
  { win: true, mode: '친구', rounds: 6, mvp: '연격', dmg: 268, opp: '은빛딜러', date: '11.13', hp: 41 },
  { win: false, mode: '무작위', rounds: 9, mvp: '방패', dmg: 188, opp: 'HeartGuard', date: '11.13', hp: 0 },
  { win: true, mode: '연습', rounds: 5, mvp: '심판', dmg: 240, opp: 'CPU LV.5', date: '11.12', hp: 57 },
  { win: true, mode: '무작위', rounds: 7, mvp: '강타', dmg: 221, opp: 'ClubKing', date: '11.12', hp: 22 },
  { win: true, mode: '무작위', rounds: 6, mvp: '심판', dmg: 254, opp: 'Joker_77', date: '11.11', hp: 35 },
  { win: false, mode: '친구', rounds: 10, mvp: '연격', dmg: 176, opp: '룬마스터', date: '11.10', hp: 0 },
  { win: true, mode: '연습', rounds: 4, mvp: '심판', dmg: 205, opp: 'CPU LV.3', date: '11.10', hp: 70 },
  { win: false, mode: '무작위', rounds: 8, mvp: '제련', dmg: 160, opp: 'SpadeAce', date: '11.09', hp: 0 },
  { win: true, mode: '무작위', rounds: 7, mvp: '심판', dmg: 233, opp: '다이아몬드', date: '11.08', hp: 12 },
];
function historyStats(h) {
  const wins = h.filter(x => x.win).length;
  let best = 0, cur = 0; [...h].reverse().forEach(x => { cur = x.win ? cur + 1 : 0; best = Math.max(best, cur); });
  const mv = {}; h.forEach(x => mv[x.mvp] = (mv[x.mvp] || 0) + 1);
  const topMvp = Object.entries(mv).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  return { n: h.length, wins, losses: h.length - wins, rate: h.length ? Math.round(wins / h.length * 100) : 0, best, maxDmg: Math.max(0, ...h.map(x => x.dmg)), topMvp: topMvp[0], topMvpN: topMvp[1] };
}
const OPP_NAMES = ['Rival_K', '은빛딜러', 'HeartGuard', 'ClubKing', 'Joker_77', '룬마스터', 'SpadeAce', '다이아몬드'];

/* ---------- 앱 / 라우터 ---------- */
const App = {
  V: {}, order: [], v: 'A', screen: 'lobby', timers: [], keyH: null, scale: 1,
  rules: { turnLimit: 0, turnTime: 60, startHP: 100, traitOpen: true },
  cpu: 5,
  myDeck: [...DEFAULT_DECK],
  history: [...SAMPLE_HISTORY],
  player: { name: '플레이어', lv: 1 },
  battleOpt: { hl: 'size', cd: 'lock', forecast: true },
  lastResult: null,

  reg(k, m) { this.V[k] = m; this.order.push(k); },
  init() {
    const nav = $('#sw-v');
    this.order.sort();
    nav.innerHTML = this.order.map(k => `<button data-v="${k}"><b>${k}</b>${this.V[k].title}</button>`).join('');
    nav.addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.setVariant(b.dataset.v); });
    $('#sw-s').addEventListener('change', e => this.go(e.target.value));
    $('#sw-info').addEventListener('click', () => this.toggleMemo());
    window.addEventListener('resize', () => this.fit());
    document.addEventListener('keydown', e => {
      if (e.target.matches('input,textarea,select') && e.key !== 'Escape') return;
      if (this.keyH && this.keyH(e) === true) { e.preventDefault(); return; }
      if (e.key === 'Escape') {
        if ($('#layer .mwrap')) { closeModal(); return; }
        if (this.screen !== 'lobby' && this.V[this.v].screens.lobby) this.go('lobby');
      }
    });
    this.fit();
    const hv = (location.hash || '').replace('#', '').toUpperCase();
    this.setVariant(this.V[hv] ? hv : 'A');
  },
  fit() {
    const W = innerWidth, H = innerHeight - $('#sw').offsetHeight;
    const s = Math.min(W / 1440, H / 810);
    this.scale = s;
    const st = $('#stage');
    st.style.transform = `scale(${s})`;
    st.style.left = (W - 1440 * s) / 2 + 'px';
    st.style.top = (H - 810 * s) / 2 + 'px';
  },
  setVariant(v, screen = 'lobby', opts = {}) {
    this.clear(); closeModal();
    this.v = v; const m = this.V[v];
    history.replaceState(null, '', '#' + v);
    const ch = $('#chrome'); ch.className = 'chrome-' + v; ch.innerHTML = m.chrome ? m.chrome() : '';
    m.chromeBind && m.chromeBind(ch);
    $('#stage').style.background = m.bg || '#000';
    $('#screens').innerHTML = '';
    $$('#sw-v button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $('#sw-s').innerHTML = Object.entries(m.names).map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
    this.screen = null;
    this.go(screen, opts, true);
    if (!$('#memo').hidden) this.renderMemo();
  },
  go(screen, opts = {}, instant = false) {
    this.clear(); closeModal();
    const m = this.V[this.v];
    if (!m.screens[screen]) return;
    const host = $('#screens');
    const olds = [...host.children];
    const el = document.createElement('div');
    el.className = `screen ${m.cls} s-${screen}`;
    el.innerHTML = m.screens[screen](opts);
    host.appendChild(el);
    const from = this.screen; this.screen = screen;
    if (olds.length && !instant) {
      olds.slice(0, -1).forEach(o => o.remove());
      (m.trans || defaultTrans)(olds[olds.length - 1], el, { from, to: screen, opts });
    } else olds.forEach(o => o.remove());
    m.bind && m.bind[screen] && m.bind[screen](el, opts);
    m.onScreen && m.onScreen(screen, $('#chrome'));
    $('#sw-s').value = screen;
  },
  after(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(() => clearTimeout(t)); return t; },
  every(fn, ms) { const t = setInterval(fn, ms); this.timers.push(() => clearInterval(t)); return t; },
  clear() { this.timers.forEach(f => f()); this.timers = []; this.keyH = null; },
  stagePt(cx, cy) { const r = $('#stage').getBoundingClientRect(); return { x: (cx - r.left) / this.scale, y: (cy - r.top) / this.scale }; },
  rectOf(el) { const r = el.getBoundingClientRect(), p = this.stagePt(r.left, r.top); return { x: p.x, y: p.y, w: r.width / this.scale, h: r.height / this.scale }; },
  toggleMemo() { const m = $('#memo'); m.hidden = !m.hidden; $('#sw-info').classList.toggle('on', !m.hidden); if (!m.hidden) this.renderMemo(); },
  renderMemo() { const m = this.V[this.v]; $('#memo').innerHTML = `<button class="x" onclick="App.toggleMemo()">×</button>${m.memo || ''}`; },
  startBattle(o = {}) {
    const from = this.v;
    this.setVariant('E', 'battle', { from, ...o });
  },
  backFromBattle(from) { if (from && from !== 'E' && this.V[from]) this.setVariant(from, 'lobby'); else this.setVariant('E', 'lobby'); },
  rand52() {
    const pool = shuffle(EFFECTS.map(e => e.id)); const d = [];
    for (const id of pool) { if (!canAdd(d, id)) d.push(id); if (d.length >= DECK_MAX) break; }
    return d;
  },
};

function defaultTrans(old, el) {
  el.classList.add('t-fade-in'); old.classList.add('t-fade-out'); old.style.pointerEvents = 'none';
  setTimeout(() => { old.remove(); el.classList.remove('t-fade-in'); }, 420);
}

/* ---------- 모달 / 토스트 / 이펙트 ---------- */
function modal(html, { cls = '', onClose, backdrop = true } = {}) {
  closeModal(true);
  const w = document.createElement('div');
  w.className = 'mwrap ' + cls;
  w.innerHTML = `<div class="mback"></div><div class="mbox">${html}</div>`;
  $('#layer').appendChild(w);
  w._onClose = onClose;
  if (backdrop) w.querySelector('.mback').addEventListener('click', () => closeModal());
  requestAnimationFrame(() => w.classList.add('open'));
  return w;
}
function closeModal(instant) {
  $$('#layer .mwrap').forEach(w => {
    if (w._closing) return; w._closing = true;
    w._onClose && w._onClose();
    w.classList.remove('open'); w.classList.add('closing');
    if (instant) w.remove(); else setTimeout(() => w.remove(), 260);
  });
}
function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type + ' tv-' + App.v;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 1900);
  setTimeout(() => t.remove(), 2300);
}
function burst(x, y, colors = ['#fff'], n = 16, host = $('#layer'), spread = 120) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'ptc';
    const a = Math.random() * Math.PI * 2, d = spread * (.4 + Math.random() * .8);
    p.style.cssText = `left:${x}px;top:${y}px;background:${pick(colors)};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--s:${4 + rnd(7)}px`;
    host.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}
function shake(el, cls = 'shake') { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }
function countUp(el, to, ms = 900, fmt = v => v) {
  const from = +(el.dataset.v || 0), t0 = performance.now();
  el.dataset.v = to;
  const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// 방향키 공간 내비게이션
function spatialNav(root, key) {
  const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const d = dirs[key]; if (!d) return false;
  const items = $$('[data-nav]', root); if (!items.length) return false;
  const cur = document.activeElement && items.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { items[0].focus(); return true; }
  const c = cur.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
  let best = null, bs = 1e9;
  items.forEach(it => {
    if (it === cur) return;
    const r = it.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
    const along = x * d[0] + y * d[1]; if (along <= 4) return;
    const across = Math.abs(x * d[1] + y * d[0]);
    const s = along + across * 2.2; if (s < bs) { bs = s; best = it; }
  });
  if (best) best.focus();
  return true;
}
function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function roomCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return 'RD-' + Array.from({ length: 4 }, () => pick(c)).join(''); }

/* ---------- 공통 CSS ---------- */
injectCSS(`
@keyframes tFadeIn{from{opacity:0}to{opacity:1}}
@keyframes tFadeOut{from{opacity:1}to{opacity:0}}
.t-fade-in{animation:tFadeIn .4s ease both}
.t-fade-out{animation:tFadeOut .4s ease both}
.mwrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.mback{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .25s}
.mbox{position:relative;transform:translateY(24px) scale(.96);opacity:0;transition:transform .32s cubic-bezier(.2,1.3,.4,1),opacity .25s}
.mwrap.open .mback{opacity:1}.mwrap.open .mbox{transform:none;opacity:1}
.mwrap.closing .mbox{transform:translateY(12px) scale(.97);opacity:0;transition-duration:.2s}
.toast{background:#111;color:#fff;padding:12px 22px;border-radius:10px;font-size:16px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.4);animation:toastIn .35s cubic-bezier(.2,1.4,.4,1);transition:opacity .35s,transform .35s}
.toast.err{background:#e5322d}.toast.ok{background:#1d9a5b}
.toast.out{opacity:0;transform:translateY(-10px)}
@keyframes toastIn{from{opacity:0;transform:translateY(-16px) scale(.9)}}
.ptc{position:absolute;width:var(--s);height:var(--s);margin:calc(var(--s)/-2);border-radius:2px;pointer-events:none;animation:ptc .8s cubic-bezier(.1,.8,.3,1) forwards;z-index:99}
@keyframes ptc{to{transform:translate(var(--dx),var(--dy)) rotate(260deg) scale(.2);opacity:0}}
.shake{animation:shake .45s}
@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(5px)}30%,50%,70%{transform:translateX(-9px)}40%,60%{transform:translateX(9px)}}
.ico{display:block}
.pc{position:relative;display:inline-flex;align-items:center;justify-content:center;width:64px;height:90px;background:#fff;color:#111;border-radius:7px;border:1px solid #cfcfcf;font-weight:900;user-select:none}
.pc.red{color:#d8252a}
.pc-c{font-size:34px;line-height:1}
.pc-tl,.pc-br{position:absolute;font-size:14px;line-height:.95;text-align:center;display:flex;flex-direction:column}
.pc-tl i,.pc-br i{font-style:normal;font-size:12px}
.pc-tl{left:6px;top:6px}.pc-br{right:6px;bottom:6px;transform:rotate(180deg)}
`);
