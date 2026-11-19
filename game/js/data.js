'use strict';
/* =========================================================
   RUNE DUEL – 데이터 (효과 카드 52장 · 덱 규칙 · 대전 기록 · AI 난이도)
   ※ "특성" 기능은 현재 제외된 상태입니다.
   ========================================================= */
const $ = (s, r = document) => r ? r.querySelector(s) : null;
const $$ = (s, r = document) => r ? [...r.querySelectorAll(s)] : [];
const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const SUITS = ['♠', '♥', '♣', '◆'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITNAME = { '♠': '스페이드', '♥': '하트', '♣': '클로버', '◆': '다이아' };
const isRed = s => s === '♥' || s === '◆';
const GRADES = { C: { ko: '일반', en: 'Common' }, R: { ko: '희귀', en: 'Rare' }, E: { ko: '영웅', en: 'Epic' }, L: { ko: '전설', en: 'Legend' } };
const GRADE_ORDER = { C: 0, R: 1, E: 2, L: 3 };

// 코드|이름|등급|A액티브/P패시브|분류|쿨타임|설명|효과값  (N값은 데모용 임시값)
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
◆A|조커|L|P|와일드|0|보유 시 매 턴 리롤 +1 (특성 제외로 임시 대체한 효과)|reroll:1
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

/* ---------- 덱 규칙 ---------- */
const DECK_MAX = 26, EPIC_MAX = 6, LEG_MAX = 2;
const DEFAULT_DECK = ['♠A', '♠2', '♠3', '♠4', '♠5', '♠6', '♠7', '♠8', '♠9', '♠J', '♠Q', '♠K', '♥2', '♥3', '♥5', '♥6', '♥7', '♥8', '♥Q', '♣2', '♣6', '♣7', '♣8', '◆4', '◆9', '◆K'];
function deckInfo(ids) { const es = ids.map(id => EF[id]); return { n: ids.length, E: es.filter(e => e.g === 'E').length, L: es.filter(e => e.g === 'L').length, A: es.filter(e => e.k === 'A').length, P: es.filter(e => e.k === 'P').length, suit: Object.fromEntries(SUITS.map(s => [s, es.filter(e => e.suit === s).length])) }; }
function canAdd(ids, id) {
  if (ids.includes(id)) return '이미 덱에 있는 카드입니다';
  const i = deckInfo(ids);
  if (i.n >= DECK_MAX) return `덱은 최대 ${DECK_MAX}장입니다`;
  if (EF[id].g === 'E' && i.E >= EPIC_MAX) return `영웅 등급은 최대 ${EPIC_MAX}장입니다`;
  if (EF[id].g === 'L' && i.L >= LEG_MAX) return `전설 등급은 최대 ${LEG_MAX}장입니다`;
  return null;
}
function deckSummary(ids) { if (!ids.length) return '빈 덱'; const s = deckInfo(ids).suit; const top = SUITS.slice().sort((a, b) => s[b] - s[a])[0]; return `${SUITNAME[top]} 중심`; }
function randomDeck() { const d = []; for (const id of shuffle(EFFECTS.map(e => e.id))) { if (!canAdd(d, id)) d.push(id); if (d.length >= DECK_MAX) break; } return d; }

/* ---------- AI 난이도 (3단계) ---------- */
const DIFFS = {
  easy: { key: 'easy', ko: '쉬움', who: '견습 딜러', icon: '♣', color: '#2fa36b', stars: 1, randomPick: .5, useRate: .35, smartDraft: false,
    desc: '패를 무작위로 고르기도 하는 신입 딜러. 규칙을 익히기에 좋습니다.', style: '하트 방어형' },
  normal: { key: 'normal', ko: '보통', who: '숙련 딜러', icon: '♠', color: '#e6a33c', stars: 2, randomPick: 0, useRate: .6, smartDraft: false,
    desc: '항상 최적 족보를 만들고 방패와 강타를 적절히 섞어 씁니다.', style: '스페이드 공격형' },
  hard: { key: 'hard', ko: '어려움', who: '카지노 마스터', icon: '◆', color: '#ff5a3c', stars: 3, randomPick: 0, useRate: .85, smartDraft: true,
    desc: '높은 등급 카드를 우선 드래프트하고 액티브를 공격적으로 사용합니다.', style: '전설 2장 풀덱' },
};

/* ---------- 대전 기록 (예시 데이터) ---------- */
const OPP_NAMES = ['Rival_K', '은빛딜러', 'HeartGuard', 'ClubKing', 'Joker_77', '룬마스터', 'SpadeAce', '다이아몬드'];
const SAMPLE_HISTORY = [
  { win: true, mode: '무작위', rounds: 8, mvp: '심판', dmg: 312, opp: 'Rival_K', date: '11.19', hp: 18 },
  { win: true, mode: '친구', rounds: 6, mvp: '연격', dmg: 268, opp: '은빛딜러', date: '11.18', hp: 41 },
  { win: false, mode: '무작위', rounds: 9, mvp: '방패', dmg: 188, opp: 'HeartGuard', date: '11.18', hp: 0 },
  { win: true, mode: '연습', rounds: 5, mvp: '심판', dmg: 240, opp: 'AI · 보통', date: '11.17', hp: 57 },
  { win: true, mode: '무작위', rounds: 7, mvp: '강타', dmg: 221, opp: 'ClubKing', date: '11.17', hp: 22 },
  { win: true, mode: '무작위', rounds: 6, mvp: '심판', dmg: 254, opp: 'Joker_77', date: '11.16', hp: 35 },
  { win: false, mode: '친구', rounds: 10, mvp: '연격', dmg: 176, opp: '룬마스터', date: '11.15', hp: 0 },
  { win: true, mode: '연습', rounds: 4, mvp: '심판', dmg: 205, opp: 'AI · 쉬움', date: '11.15', hp: 70 },
  { win: false, mode: '무작위', rounds: 8, mvp: '제련', dmg: 160, opp: 'SpadeAce', date: '11.14', hp: 0 },
  { win: true, mode: '무작위', rounds: 7, mvp: '심판', dmg: 233, opp: '다이아몬드', date: '11.13', hp: 12 },
];
function historyStats(h) {
  const wins = h.filter(x => x.win).length;
  let best = 0, cur = 0; [...h].reverse().forEach(x => { cur = x.win ? cur + 1 : 0; best = Math.max(best, cur); });
  const mv = {}; h.forEach(x => mv[x.mvp] = (mv[x.mvp] || 0) + 1);
  const top = Object.entries(mv).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  return { n: h.length, wins, losses: h.length - wins, rate: h.length ? Math.round(wins / h.length * 100) : 0, best, maxDmg: Math.max(0, ...h.map(x => x.dmg)), topMvp: top[0], topMvpN: top[1] };
}

/* ---------- 아이콘 ---------- */
const ICONP = {
  공격: 'M5 19L15 9M13 5l6-1-1 6M7 13l4 4M4 20l2-2', 방어: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z', 유틸: 'M12 5v14M5 12h14',
  방해: 'M6 6l12 12M18 6L6 18', 강화: 'M12 19V5M6 11l6-6 6 6', 특수: 'M12 3l8 9-8 9-8-9z', 함정: 'M6 19L10 5M11 19l4-14M16 19l4-14',
  와일드: 'M12 3l2.6 6 6.4.6-4.9 4.3 1.5 6.3L12 17l-5.6 3.2 1.5-6.3L3 9.6l6.4-.6z',
};
function icon(cat, size = 22) {
  const key = Object.keys(ICONP).find(k => cat.startsWith(k)) || '특수';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONP[key]}"/></svg>`;
}
const UI_ICON = {
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', battle: '<path d="M5 5l14 14M19 5L5 19M4 8V4h4M20 8V4h-4"/>',
  cards: '<rect x="6" y="3" width="11" height="15" rx="2"/><path d="M9 21h9a2 2 0 002-2V7"/>', deck: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M6 5h12M8 2h8"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>', glass: '<path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12M7 21c0-3 10-3 10 0"/>',
};
const ui = (k, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${UI_ICON[k]}</svg>`;

/* ---------- 카드 마크업 ---------- */
function cardHTML(e, extra = '', attrs = '', inner = '') {
  return `<div class="ec ${e.k === 'A' ? 'act' : 'pas'} g-${e.g} ${isRed(e.suit) ? 'red' : ''} ${extra}" data-id="${e.id}" ${attrs}>
    <div class="ec-h"><span class="ec-code">${e.suit}${e.rank}</span><span class="ec-g">${GRADES[e.g].en}</span></div>
    <div class="ec-n">${e.name}</div>
    <div class="ec-t">${e.k === 'A' ? '액티브' : '패시브'} · ${e.cat}</div>
    <div class="ec-ic">${icon(e.cat, 30)}</div>
    <div class="ec-d">${e.desc}</div>
    <div class="ec-f">${e.k === 'A' ? '쿨타임 ' + e.cd + '턴' : '상시 · 공개'}</div>${holo(e)}${inner}
  </div>`;
}
// 영웅·전설 카드의 홀로그램 광택 레이어
const holo = e => (e.g === 'E' || e.g === 'L') ? `<i class="holo"></i>` : '';
const miniCard = (e, extra = '', attrs = '') => `<div class="mc g-${e.g} ${isRed(e.suit) ? 'red' : ''} ${extra}" data-id="${e.id}" ${attrs}><b>${e.suit}${e.rank}</b><span>${e.name}</span><em>${icon(e.cat, 16)}</em>${holo(e)}</div>`;
function pokerHTML(c, extra = '', attrs = '') {
  return `<div class="pc ${isRed(c.s) ? 'red' : ''} ${extra}" ${attrs}><span class="pc-tl">${c.r}<i>${c.s}</i></span><span class="pc-c">${c.s}</span><span class="pc-br">${c.r}<i>${c.s}</i></span></div>`;
}
function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function roomCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return 'RD-' + Array.from({ length: 4 }, () => pick(c)).join(''); }
