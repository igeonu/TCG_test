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
♠A|강타|C|A|공격|1|이번 턴 족보 점수의 25%만큼 피해 추가 (최소 +3)|bpct:25
♠2|일격|R|A|공격|2|이번 턴 치명타 확률 +30% (치명타 시 점수 ×1.5 · 중첩 가능)|crit:30
♠3|일격|R|A|공격|2|이번 턴 치명타 확률 +30% (치명타 시 점수 ×1.5 · 중첩 가능)|crit:30
♠4|제련|C|P|강화|0|턴 시작마다 최종 피해 +1 누적|smelt:1
♠5|제련|C|P|강화|0|턴 시작마다 최종 피해 +1 누적|smelt:1
♠6|열상|R|A|공격/방해|4|적중 시 상대에게 지속 피해 3 (2턴)|dot:3
♠7|연격|E|A|공격|1|적중 시 입힌 피해의 절반을 추가로 입힘|chain:0.5
♠8|파괴|R|A|방해|2|상대의 실드 효과를 20% 확률로 무효화|breakS:20
♠9|매의 눈|E|A|방해|3|상대의 실드·감면을 즉시 무시하고 공격|pierce:1
♠10|찬스 스텝|L|A|공격/방해|2|적중 시 피해 결산 한 번 더 (실패 시 불발)|again:1
♠J|강타|C|A|공격|1|이번 턴 족보 점수의 25%만큼 피해 추가 (최소 +3)|bpct:25
♠Q|심판|L|A|공격|3|이번 턴 최종 데미지 ×1.6|mult:1.6
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
◆A|조커|L|P|와일드|0|매 턴 리롤 +1 · 원 페어 이상이면 족보 점수의 20%만큼 피해 추가|reroll:1,joker:20
◆2|간파|C|P|함정|0|상대 방해 발동 시 10% 확률로 무효화|trap:1
◆3|흐트러짐|C|P|함정|0|상대 유틸 사용 시 30% 확률로 지속 피해 3 (1턴)|trap:1
◆4|방패 파괴자|R|P|함정|0|상대가 실드 보유 시 최종 피해 +3|shieldBreaker:3
◆5|전염|R|P|함정|0|내가 지속 피해 중이면 상대에게도 1턴 적용|contagion:1
◆6|마법 방패|E|P|함정|0|상대 방해 발동 시 50% 확률로 상대에게도 적용|trap:1
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

/* ---------- 대전 규칙 : 무작위·AI 대전은 항상 기본값, 친구 대전만 방 규칙 사용 ---------- */
const DEFAULT_RULES = Object.freeze({ turnLimit: 0, turnTime: 60, startHP: 100 });

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
// AI 난이도의 "덱 성향"대로 덱을 만든다 : 성향 점수 + 약간의 무작위로 정렬한 뒤 덱 규칙 안에서 채움
const DECK_STYLE = {
  easy: e => (e.suit === '♥' ? 4 : 0) + (/방어|유틸/.test(e.cat) ? 3 : 0) - (e.g === 'L' ? 3 : 0),
  normal: e => (e.suit === '♠' ? 4 : 0) + (/공격|강화/.test(e.cat) ? 3 : 0),
  hard: e => GRADE_ORDER[e.g] * 3 + (e.k === 'A' ? 1 : 0),
};
const DECK_CAP = { easy: { E: 3, L: 1 }, normal: { E: 4, L: 1 }, hard: { E: EPIC_MAX, L: LEG_MAX } };   // 난이도가 낮을수록 영웅·전설 수 제한
function styledDeck(diff) {
  const f = DECK_STYLE[diff]; if (!f) return randomDeck();
  const d = [], cap = DECK_CAP[diff], n = { E: 0, L: 0 };
  for (const { id } of EFFECTS.map(e => ({ id: e.id, s: f(e) + Math.random() * 2.5 })).sort((a, b) => b.s - a.s)) {
    const g = EF[id].g; if (n[g] !== undefined && n[g] >= cap[g]) continue;
    if (!canAdd(d, id)) { d.push(id); if (n[g] !== undefined) n[g]++; }
    if (d.length >= DECK_MAX) break;
  }
  return d;
}

/* ---------- AI 난이도 (3단계) ---------- */
const DIFFS = {
  easy: { key: 'easy', ko: '쉬움', who: '견습 딜러', icon: '♣', color: '#2fa36b', stars: 1, randomPick: .5, useRate: .35, smartDraft: false, smart: 0, reroll: false,
    desc: '패를 무작위로 고르기도 하는 신입 딜러. 규칙을 익히기에 좋습니다.', style: '하트 방어형' },
  normal: { key: 'normal', ko: '보통', who: '숙련 딜러', icon: '♠', color: '#e6a33c', stars: 2, randomPick: 0, useRate: .6, smartDraft: false, smart: .8, reroll: true,
    desc: '항상 최적 족보를 만들고 방패와 강타를 적절히 섞어 씁니다.', style: '스페이드 공격형' },
  hard: { key: 'hard', ko: '어려움', who: '카지노 마스터', icon: '◆', color: '#ff5a3c', stars: 3, randomPick: 0, useRate: .85, smartDraft: true, smart: 1, reroll: true,
    desc: '높은 등급 카드를 우선 드래프트하고 액티브를 공격적으로 사용합니다.', style: '전설 2장 풀덱' },
};

/* ---------- 대전 기록 ---------- */
const OPP_NAMES = ['Rival_K', '은빛딜러', 'HeartGuard', 'ClubKing', 'Joker_77', '룬마스터', 'SpadeAce', '다이아몬드'];
// 예전 버전이 첫 실행 때 넣어 두던 예시 기록 식별용 (상대|날짜|피해) — 저장소에서 걸러냄
const LEGACY_SAMPLE = new Set(['Rival_K|11.19|312', '은빛딜러|11.18|268', 'HeartGuard|11.18|188', 'AI · 보통|11.17|240', 'ClubKing|11.17|221', 'Joker_77|11.16|254', '룬마스터|11.15|176', 'AI · 쉬움|11.15|205', 'SpadeAce|11.14|160', '다이아몬드|11.13|233']);
function historyStats(h) {
  const wins = h.filter(x => x.win).length;
  let best = 0, cur = 0; [...h].reverse().forEach(x => { cur = x.win ? cur + 1 : 0; best = Math.max(best, cur); });
  const mv = {}; h.forEach(x => mv[x.mvp] = (mv[x.mvp] || 0) + 1);
  const top = Object.entries(mv).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  return { n: h.length, wins, losses: h.length - wins, rate: h.length ? Math.round(wins / h.length * 100) : 0, best, maxDmg: Math.max(0, ...h.map(x => x.dmg)), topMvp: top[0], topMvpN: top[1] };
}

/* ---------- 아이콘 ---------- */
// 효과 카드 분류 아이콘 : 디자인 시안(각진 기하학 실루엣)을 668×668 SVG로 옮김. 색은 currentColor(문양 색)
// 유틸·특수는 시안이 아직 없어 같은 스타일로 임시 제작
const SK_ = 'fill="none" stroke="currentColor" stroke-linejoin="miter"';
const ICON_SVG = {
  공격: '<path d="M320 100H568V345L548 325L530 135L340 118Z"/><path d="M380 200L498 170L468 288L255 450L215 410Z"/><path d="M148 350L318 518L272 530L136 395Z"/><path d="M200 450L228 475L130 545L118 533Z"/><rect x="100" y="535" width="33" height="35"/>',
  함정: '<path d="M258 100H345L97 348V261Z"/><path d="M497 100H570L97 573V500Z"/><path d="M570 265V350L350 570H265Z"/>',
  방어: `<path ${SK_} stroke-width="26" d="M112 112H230L333 172L436 112H556V386L515 410V466L333 648L152 466V410L112 386Z"/>`,
  와일드: `<g ${SK_} stroke-width="26"><path stroke-width="32" d="M333 150L516 333L333 516L150 333Z"/><path d="M100 232V100H232M436 100H568V232M568 436V568H436M232 568H100V436"/><path d="M262 95L333 24L404 95M573 262L644 333L573 404M404 573L333 644L262 573M95 404L24 333L95 262"/></g>`,
  방해: `<g ${SK_} stroke-width="22"><path d="M250 182V100L333 18L650 335L560 425H492V397H440V342H390V300H345V238H298V182Z"/><path transform="rotate(180 333 333)" d="M250 182V100L333 18L650 335L560 425H492V397H440V342H390V300H345V238H298V182Z"/></g>`,
  강화: '<path d="M275 100H568V392L522 348L500 262L388 322L350 282L410 168L320 145Z"/><path transform="rotate(180 336 321)" d="M275 100H568V392L522 348L500 262L388 322L350 282L410 168L320 145Z"/><rect x="286" y="282" width="100" height="78"/><rect x="310" y="305" width="52" height="32" fill="none" stroke="#fff" stroke-width="9"/>',
  유틸: '<path d="M290 100H378V290H568V378H378V568H290V378H100V290H290Z"/><path fill="none" stroke="currentColor" stroke-width="20" d="M150 150H230M150 150V230M518 150H438M518 150V230M150 518H230M150 518V438M518 518H438M518 518V438"/>',
  특수: `<path ${SK_} stroke-width="26" d="M333 80L586 333L333 586L80 333Z"/><path d="M333 230L436 333L333 436L230 333Z"/>`,
};
function icon(cat, size = 22) {
  const key = Object.keys(ICON_SVG).find(k => cat.startsWith(k)) || '특수';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 668 668" fill="currentColor">${ICON_SVG[key]}</svg>`;
}
// 쿨타임 모래시계 (디자인 시안)
const hourglassSvg = (size = 32) => `<svg class="ico hgl" width="${size}" height="${size}" viewBox="0 0 668 668" ${SK_} stroke-width="26"><path d="M185 112H482L380 330H287Z"/><path d="M287 340H380L482 552H185Z"/><path d="M262 100L333 22L404 100M262 566L333 644L404 566"/><path stroke-width="22" d="M150 98L112 132L235 333L112 534L150 568M518 98L556 132L433 333L556 534L518 568"/></svg>`;
const UI_ICON = {
  home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>', battle: '<path d="M5 5l14 14M19 5L5 19M4 8V4h4M20 8V4h-4"/>',
  cards: '<rect x="6" y="3" width="11" height="15" rx="2"/><path d="M9 21h9a2 2 0 002-2V7"/>', deck: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M6 5h12M8 2h8"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
};
const ui = (k, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${UI_ICON[k]}</svg>`;

/* ---------- 카드 마크업 ---------- */
function cardHTML(e, extra = '', attrs = '', inner = '') {
  return `<div class="ec ${e.k === 'A' ? 'act' : 'pas'} g-${e.g} ${isRed(e.suit) ? 'red' : ''} ${extra}" data-id="${e.id}" ${attrs}>
    <div class="ec-h"><span class="ec-code">${suitSvg(e.suit)}<b>${e.rank}</b></span><span class="ec-g" title="${GRADES[e.g].ko}">${e.g}</span></div>
    <div class="ec-n"><span>${e.name}</span></div>
    <div class="ec-t">${e.k === 'A' ? '액티브' : '패시브'} &amp; ${e.cat}</div>
    <div class="ec-ic">${icon(e.cat, 30)}</div>
    <div class="ec-d">${e.desc}</div>
    <div class="ec-f"><span>${e.k === 'A' ? `쿨타임: ${e.cd}턴` : '패시브 · 상시'}</span></div>${holo(e)}${inner}
  </div>`;
}
// 영웅·전설 카드의 홀로그램 광택 레이어
const holo = e => (e.g === 'E' || e.g === 'L') ? `<i class="holo"></i>` : '';
const miniCard = (e, extra = '', attrs = '') => `<div class="mc g-${e.g} ${isRed(e.suit) ? 'red' : ''} ${extra}" data-id="${e.id}" ${attrs}><b>${codeHTML(e)}</b><span>${e.name}</span><em>${icon(e.cat, 16)}</em>${holo(e)}</div>`;
/* ---------- 포커 카드 : 각진 기하학 문양 · 숫자별 핍 배치 · 에이스 대형 문양 · 그림 카드 ---------- */
const SK = { '♠': 'S', '♥': 'H', '♣': 'C', '◆': 'D' };
const SUIT_SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <symbol id="su-D" viewBox="0 0 20 20"><polygon points="10,0 17,10 10,20 3,10"/></symbol>
  <symbol id="su-H" viewBox="0 0 20 20"><polygon points="10,19 1,9.5 5.5,5 10,9.5 14.5,5 19,9.5"/></symbol>
  <symbol id="su-S" viewBox="0 0 20 20"><polygon points="10,1 19,10.5 14.5,15 10,10.5 5.5,15 1,10.5"/><polygon points="10,12.5 6.5,19.5 13.5,19.5"/></symbol>
  <symbol id="su-C" viewBox="0 0 20 20"><polygon points="10,0.5 13.6,4.6 10,8.7 6.4,4.6"/><polygon points="4.6,6.4 8.7,10 4.6,13.6 0.5,10"/><polygon points="15.4,6.4 19.5,10 15.4,13.6 11.3,10"/><polygon points="10,5.5 13.5,10 10,14.5 6.5,10"/><polygon points="10,11.5 6.8,19.5 13.2,19.5"/></symbol>
</defs></svg>`;
const suitSvg = (s, cls = '') => `<svg class="${cls}" viewBox="0 0 20 20"><use href="#su-${SK[s]}"/></svg>`;
// 카드 코드 표기 통일 : 숫자 → 문양 순 (화면용 HTML · 글자만 들어가는 곳용 텍스트)
const codeTxt = e => `${e.rank}${e.suit}`;
const codeHTML = e => SK[e.suit] ? `<span class="cc ${isRed(e.suit) ? 'red' : ''}"><b>${e.rank}</b>${suitSvg(e.suit)}</span>` : `<span class="cc">${e.suit}${e.rank}</span>`;
// 핍 위치 [x%, y%] (아래쪽 절반은 뒤집어서 그림)
const PIPS = (() => {
  const L = 33, C = 50, R = 67, T = 19, B = 81, M = 50, r1 = 39.5, r2 = 60.5;
  const lr = ys => ys.flatMap(y => [[L, y], [R, y]]);
  return { 2: [[C, T], [C, B]], 3: [[C, T], [C, M], [C, B]], 4: lr([T, B]), 5: [...lr([T, B]), [C, M]], 6: lr([T, M, B]), 7: [...lr([T, M, B]), [C, 34.5]],
    8: [...lr([T, M, B]), [C, 34.5], [C, 65.5]], 9: [...lr([T, r1, r2, B]), [C, M]], 10: [...lr([T, r1, r2, B]), [C, 29], [C, 71]] };
})();
// 그림 카드(J·Q·K) 일러스트 : assets/cards/{J|Q|K}{S|H|C|D}.webp — 12장 모두 완성본
const FACE_IMG = c => 'JQK'.includes(c.r) ? c.r + SK[c.s] : null;
function aceArt(s) {
  const k = SK[s], u = (sc, cls) => `<use href="#su-${k}" width="20" height="20" class="${cls}" transform="translate(10 10) scale(${sc}) translate(-10 -10)"/>`;
  return `<svg class="pc-ace" viewBox="-1 -1 22 22">${u(1.08, 'f')}${u(.98, 'w')}${u(.86, 'f')}${u(.62, 'w')}${u(.3, 'f')}</svg>`;
}
function pokerHTML(c, extra = '', attrs = '') {
  const red = isRed(c.s), img = FACE_IMG(c);
  // 일러스트 카드도 모서리 인덱스는 코드로 크게 덧그려 다른 카드와 같은 크기로 읽히게 함
  if (img) return `<div class="pc img ${red ? 'red' : ''} ${extra}" ${attrs}><span class="pc-img" style="background-image:url(assets/cards/${img}.webp)"></span><span class="pc-tl"><b>${c.r}</b>${suitSvg(c.s)}</span><span class="pc-br"><b>${c.r}</b>${suitSvg(c.s)}</span></div>`;
  const idx = cls => `<span class="${cls}"><b>${c.r}</b>${suitSvg(c.s)}</span>`;
  const body = c.r === 'A' ? aceArt(c.s) : PIPS[c.r].map(([x, y]) => suitSvg(c.s, 'pip' + (y > 50 ? ' flip' : '')).replace('<svg', `<svg style="left:${x}%;top:${y}%"`)).join('');
  return `<div class="pc ${red ? 'red' : ''} ${extra}" ${attrs}>${idx('pc-tl')}<span class="pc-body">${body}</span>${idx('pc-br')}<span class="pc-mid"><b>${c.r}</b>${suitSvg(c.s)}</span></div>`;
}
function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function roomCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return 'RD-' + Array.from({ length: 4 }, () => pick(c)).join(''); }

// 문양 SVG 정의를 문서에 한 번만 삽입
document.body.insertAdjacentHTML('afterbegin', SUIT_SPRITE);
