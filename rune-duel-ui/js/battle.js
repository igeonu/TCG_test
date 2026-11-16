'use strict';
/* =========================================================
   E안 : 전장 메인 (종합 보고서) – 실제로 플레이 가능한 전투 루프
   01 드래프트 → 02 전투 패 구성 → 03 쇼다운 준비 → 04 피해 정산
   ========================================================= */
const HANDS = { none: ['—', 0], high: ['하이 카드', 5], pair: ['원 페어', 10], two: ['투 페어', 15], trips: ['트리플', 20], straight: ['스트레이트', 25], flush: ['플러시', 30], full: ['풀 하우스', 35], quads: ['포카드', 45], sf: ['스트레이트 플러시', 55], royal: ['로열 스트레이트 플러시', 70] };
const PV = { A: 14, J: 11, Q: 12, K: 13 };
const pv = r => PV[r] || +r;
function evalHand(cards) {
  if (!cards.length) return { key: 'none', name: '—', base: 0, tb: 0 };
  const vals = cards.map(c => pv(c.r)).sort((a, b) => b - a);
  const cnt = {}; vals.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
  const groups = Object.values(cnt).sort((a, b) => b - a);
  const five = cards.length === 5;
  const flush = five && cards.every(c => c.s === cards[0].s);
  let straight = false, high = 0;
  if (five && groups[0] === 1) {
    if (vals[0] - vals[4] === 4) { straight = true; high = vals[0]; }
    else if (vals.join() === '14,5,4,3,2') { straight = true; high = 5; }
  }
  let key = 'high';
  if (straight && flush) key = high === 14 ? 'royal' : 'sf';
  else if (groups[0] === 4) key = 'quads';
  else if (groups[0] === 3 && groups[1] === 2) key = 'full';
  else if (flush) key = 'flush';
  else if (straight) key = 'straight';
  else if (groups[0] === 3) key = 'trips';
  else if (groups[0] === 2 && groups[1] === 2) key = 'two';
  else if (groups[0] === 2) key = 'pair';
  return { key, name: HANDS[key][0], base: HANDS[key][1], tb: vals.reduce((a, v) => a + v, 0) };
}
function best5(hand) {
  let best = null, bi = null;
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const idx = [0, 1, 2, 3, 4, 5, 6].filter(i => i !== a && i !== b);
    const h = evalHand(idx.map(i => hand[i]));
    if (!best || h.base > best.base || (h.base === best.base && h.tb > best.tb)) { best = h; bi = idx; }
  }
  return bi;
}

/* ---------- 전투 상태 ---------- */
let S = null;
function mkSide(isMe, name, deck, hp) {
  return { isMe, name, hp, maxHp: hp, shield: 0, pool: [...deck], inv: [], cd: {}, hand: [], sel: [], rr: [], rerolls: 0, dots: [], mods: [], smeltMap: {}, undyingUsed: false, storm: 0, counter: 0, immune: false, confuse: false, utilUses: 0, revealed: new Set(), stats: {}, lastUsed: null, usedOrder: 0 };
}
const sideOf = isMe => isMe ? S.me : S.op;
const other = s => s === S.me ? S.op : S.me;
const passives = s => s.storm > 0 ? [] : s.inv.map(id => EF[id]).filter(e => e.k === 'P');
const slotsOf = s => 5 + (s.inv.some(id => EF[id].fx.slots) ? 2 : 0);
const traitVal = (s, id) => traitCounts(s.inv).find(x => x.t.id === id).val;
function stat(side, id, key, v) {
  const s = side.stats[id] || (side.stats[id] = { uses: 0, dmg: 0, shield: 0, heal: 0, rounds: {} });
  s[key] += v;
  if (key === 'uses' || key === 'dmg') { const r = s.rounds[S.round] || (s.rounds[S.round] = { uses: 0, dmg: 0 }); r[key] += v; }
}
function drawCards(side, n, exclude) {
  const w = { '♠': 1, '♥': 1, '♣': 1, '◆': 1 };
  passives(side).forEach(e => { w['♠'] += (e.fx.wS || 0) * .35; w['♥'] += (e.fx.wH || 0) * .35; w['♣'] += (e.fx.wC || 0) * .35; w['◆'] += (e.fx.wD || 0) * .35; });
  const ex = new Set(exclude.map(c => c.r + c.s));
  const pool = []; SUITS.forEach(s => RANKS.forEach(r => { if (!ex.has(r + s)) pool.push({ r, s, w: w[s] }); }));
  const out = [];
  for (let k = 0; k < n; k++) {
    const tot = pool.reduce((a, c) => a + c.w, 0); let x = Math.random() * tot, i = 0;
    for (; i < pool.length - 1; i++) { x -= pool[i].w; if (x <= 0) break; }
    const c = pool.splice(i, 1)[0]; out.push({ r: c.r, s: c.s });
  }
  return out;
}
function calc(side, oth) {
  const cards = side.sel.map(i => side.hand[i]);
  const h = evalHand(cards);
  const parts = []; let bonus = 0, mult = 1, crit = 0;
  side.mods.forEach(m => {
    if (m.fx.bonus) { bonus += m.fx.bonus; parts.push({ src: m.src, label: m.label, t: 'b', v: m.fx.bonus }); }
    if (m.fx.mult) { mult *= m.fx.mult; parts.push({ src: m.src, label: m.label, t: 'm', v: m.fx.mult }); }
    if (m.fx.crit) crit += m.fx.crit;
  });
  if (side.counter) { bonus += side.counter; parts.push({ src: null, label: '반격', t: 'b', v: side.counter }); }
  passives(side).forEach(e => {
    let v = 0;
    if (e.fx.smelt) v = side.smeltMap[e.id] || 0;
    if (e.fx.revenge) v = Math.floor((side.maxHp - side.hp) / side.maxHp * 10) * e.fx.revenge;
    if (e.fx.link) v = side.mods.filter(m => m.src && EF[m.src] && EF[m.src].cat.startsWith('공격')).length >= 2 ? e.fx.link : 0;
    if (e.fx.shieldBreaker) v = oth.shield > 0 ? e.fx.shieldBreaker : 0;
    if (e.fx.awaken) v = oth.utilUses * e.fx.awaken;
    if (v > 0) { bonus += v; parts.push({ src: e.id, label: e.name, t: 'b', v, pas: true }); }
  });
  const tS = traitVal(side, 'S'); if (tS) { mult *= tS; parts.push({ src: null, label: '♠ 특성', t: 'm', v: tS }); }
  crit += traitVal(side, '7');
  const score = Math.round((h.base + bonus) * mult);
  return { h, base: h.base, bonus, mult, crit, parts, score };
}
const fmtMult = m => (Math.round(m * 100) / 100);
function formula(c) {
  if (!c.h.base) return '0';
  const inner = c.bonus ? `(${c.base} + ${c.bonus})` : `${c.base}`;
  return c.mult !== 1 ? `${inner} × ${fmtMult(c.mult)} = ${c.score}` : (c.bonus ? `${c.base} + ${c.bonus} = ${c.score}` : `${c.score}`);
}

/* ---------- 모듈 ---------- */
const MOD_E = {
  title: '전장 · 결과', cls: 'vE', bg: '#07090d',
  names: { lobby: '게임 소개 · 전투 흐름', battle: '전장 메인 (전투)', fame: '명예의 전당', report: '카드별 활약 기록' },
  screens: {}, bind: {},
  memo: `<span class="tag">E안 · 종합 보고서</span><h3>전장 메인 + 결과 화면</h3>
  <p>종합 보고서의 4단계 전투 루프를 실제로 플레이할 수 있게 구현했습니다. 시작 장착은 문서 예시와 같은 강타 ♠A · 힘 ♠K · 방패 ♥7 입니다.</p>
  <h4>구현한 상호작용</h4><ul>
  <li>드래프트 모달: 3장 중 1장, 장착 후 예상 상태(인벤토리·특성 변화) 미리보기</li>
  <li>손 패 가득 참(5/5): 교체 미리보기 → [교체 확정] / [새 카드 포기]</li>
  <li>전투 패 7장 중 5장 선택, 리롤 모드, 현재 족보 실시간 표시</li>
  <li>효과 카드 강조: 크기 변화 / 테두리 색 / 둘 다 (☰ 설정에서 전환)</li>
  <li>쿨타임 표시: 자물쇠 / 모래시계 / 색상 변환 (☰ 설정에서 전환)</li>
  <li>액티브 사용 연출(효과 발동! + 순서 배지), 패시브 자동 발동 연출</li>
  <li>이벤트 상자: 라운드 시작 · 제출 확인(수식) · 전투 예측 · 결과</li>
  <li>피해 정산: 양측 패 공개, 수식 카운트업, 데미지 팝업, HP 바 감소 잔상, 화면 흔들림</li>
  <li>특성 칸(육각형): 마우스 오버 툴팁, 클릭 시 특성 패널</li>
  <li>승리/패배 연출 → 명예의 전당 → 카드별 활약 기록 → 다시 대전/로비로</li></ul>
  <h4>임시 수치</h4><p>족보 점수·N값은 문서에 확정되지 않아 데모용 임시값입니다.</p>`,
};
App.reg('E', MOD_E);

/* ---------- 소개 화면 ---------- */
MOD_E.screens.lobby = () => `
<div class="ei">
  <div class="ei-head">
    <div><div class="ei-k">TGC · 포커 족보 덱 빌딩 & 특성 시너지 배틀 (1V1 HP 전투)</div>
    <h1>RUNE DUEL <span>룬 결투</span></h1>
    <p>"전투 패를 만들고, 효과 카드로 승리 조건을 쌓는다." 포커의 공격 패 족보를 판정하고, 드래프트한 효과 카드로 피해·방어·특성 시너지를 구성합니다.</p></div>
    <div class="ei-btns"><button class="eb pri" data-act="start">전투 시작 · VS CPU</button><button class="eb" data-act="fame">결과 화면 미리보기</button></div>
  </div>
  <div class="ei-loop">
    ${[['01', '라운드 시작', '덱의 효과 카드 3장 중 1장을 획득해 장착합니다.', 'draft'], ['02', '전투 패 구성', '포커 카드 7장 중 5장을 골라 족보를 만듭니다. 리롤 1회.', 'hand'], ['03', '쇼다운 준비', '액티브(수동)·패시브(자동) 효과로 점수를 강화하거나 몸을 지킵니다.', 'calc'], ['04', '피해 정산', '양측 점수를 비교해 차이만큼 낮은 쪽 HP가 감소합니다.', 'hp']].map(([n, t, d, k], i) => `
    <div class="ei-step" style="--i:${i}"><div class="ei-n">${n}</div><div class="ei-ill ill-${k}">${ill(k)}</div><h3>${t}</h3><p>${d}</p></div>`).join('<div class="ei-arr">→</div>')}
  </div>
  <div class="ei-bottom">
    <div class="ei-box"><h4>전투 족보 점수 <small>임시값</small></h4><div class="ei-hands">${Object.entries(HANDS).filter(([k]) => k !== 'none').reverse().map(([k, [n, b]]) => `<div><span>${n}</span><b>${b}</b></div>`).join('')}</div></div>
    <div class="ei-box"><h4>특성 (효과 카드 문양·숫자 족보)</h4><div class="ei-traits">${TRAITS.map(t => `<div><i class="hexi">${t.icon}</i><b>${t.name}</b><span>${t.req} ${t.tiers.join('/')}</span><em>${t.fx[0]} …</em></div>`).join('')}</div></div>
    <div class="ei-box"><h4>효과 카드 52장</h4><div class="ei-cnt"><div><b>26</b>액티브</div><div><b>26</b>패시브</div><div><b>26</b>덱 구성</div></div><p class="ei-note">일반·희귀 제한 없음 · 영웅 최대 6장 · 전설 최대 2장. 승패: HP가 0 이하가 되면 패배.</p></div>
  </div>
</div>`;
function ill(k) {
  if (k === 'draft') return `<div class="mc a">♠4</div><div class="mc b">♥Q</div><div class="mc c">♣7</div>`;
  if (k === 'hand') return ['10', 'J', 'Q', 'K', 'A', '2', '5'].map((r, i) => `<div class="mp ${i < 5 ? 'on' : ''}" style="--j:${i}">${r}</div>`).join('');
  if (k === 'calc') return `<div class="mf">(12 + 3) × 2 = <b>30</b></div>`;
  return `<div class="mhp"><i></i></div><div class="mdmg">-20</div>`;
}
MOD_E.bind.lobby = el => {
  el.querySelector('[data-act=start]').onclick = () => App.go('battle', { from: 'E', mode: '연습' });
  el.querySelector('[data-act=fame]').onclick = () => { App.lastResult = sampleResult(); App.go('fame'); };
};

/* ---------- 전장 화면 ---------- */
MOD_E.screens.battle = () => `
<div class="bt hl-${App.battleOpt.hl} cd-${App.battleOpt.cd}" id="bt">
  <div class="b-left">
    <div class="b-top"><button class="b-menu" title="설정 및 메뉴">☰</button><div class="b-round">ROUND <b id="bRound">1</b><small id="bLimit"></small></div></div>
    <ol class="b-steps" id="bSteps">${['드래프트', '전투 패 구성', '쇼다운 준비', '피해 정산'].map((t, i) => `<li data-p="${i + 1}"><b>0${i + 1}</b>${t}</li>`).join('')}</ol>
    <div class="b-sec">특성 칸 · 나 <button class="b-more" data-tp="me">더보기</button></div>
    <div class="hexes" id="hexMe"></div>
    <div class="hud me" id="hudMe"></div>
  </div>
  <div class="b-center">
    <div class="opp-row"><div class="pile sm"><span>상대 덱</span></div><div class="opp-hand" id="handOp"></div><div class="opp-tag">상대 전투 패 · 비공개</div></div>
    <div class="evbox" id="ev"></div>
    <div class="tools"><span id="tSel"></span><span id="tHand"></span><span id="tRr" class="chip"></span><span class="tools-r" id="tHint"></span></div>
    <div class="my-hand" id="handMe"></div>
    <div class="fan-zone"><div class="fan-lbl">효과 카드 (장착) <b id="invN"></b></div><div class="fan" id="fanMe"></div><div class="pile" id="pileMe"><span>효과 덱</span><b id="poolN"></b></div></div>
  </div>
  <div class="b-right">
    <div class="hud op" id="hudOp"></div>
    <div class="b-sec">특성 칸 · 상대 <button class="b-more" data-tp="op">더보기</button></div>
    <div class="hexes sm" id="hexOp"></div>
    <div class="b-sec">상대 효과 카드 <small>액티브 비공개 · 패시브 공개</small></div>
    <div class="fan op" id="fanOp"></div>
    <div class="b-sec">전투 로그</div>
    <div class="log" id="log"></div>
  </div>
</div>`;

MOD_E.bind.battle = (el, opts) => {
  const startHP = App.rules.startHP;
  const oppName = (opts.opp && opts.opp.name) || (opts.mode === '연습' ? `CPU LV.${App.cpu}` : pick(OPP_NAMES));
  S = { alive: Symbol(), round: 0, phase: 0, from: opts.from || 'E', mode: opts.mode || '연습', rrMode: false, fateMode: false, ended: false, logN: 0,
    me: mkSide(true, App.player.name, App.myDeck, startHP), op: mkSide(false, oppName, App.rand52(), startHP) };
  // 문서 예시와 같은 시작 장착 (강타 ♠A · 힘 ♠K · 방패 ♥7)
  ['♠A', '♠K', '♥7'].forEach(id => { S.me.inv.push(id); S.me.pool = S.me.pool.filter(x => x !== id); });
  S.op.inv = shuffle(S.op.pool).slice(0, 3); S.op.pool = S.op.pool.filter(x => !S.op.inv.includes(x));
  el.querySelector('.b-menu').onclick = battleMenu;
  $$('.b-more', el).forEach(b => b.onclick = () => traitPanel(b.dataset.tp === 'me' ? S.me : S.op));
  el.querySelector('#handMe').addEventListener('click', onHandClick);
  el.querySelector('#fanMe').addEventListener('click', e => { const c = e.target.closest('.ec'); if (c) cardDetail(c.dataset.id); });
  el.querySelector('#fanOp').addEventListener('click', e => { const c = e.target.closest('.ec'); if (c && c.dataset.id && !c.classList.contains('back')) cardDetail(c.dataset.id, true); });
  bindTips(el);
  App.keyH = e => {
    if (e.key === 'Escape') { if ($('#layer .mwrap')) { closeModal(); return true; } battleMenu(); return true; }
    if (S.phase === 2 && /^[1-7]$/.test(e.key)) { onHandClick({ target: $$('#handMe .pc')[+e.key - 1] }); return true; }
    if (e.key === 'Enter') { const b = $('#ev .eb.pri:not([disabled])'); if (b && !$('#layer .mwrap')) { b.click(); return true; } }
    return false;
  };
  addLog(`<b>전투 시작</b> · ${S.me.name} vs ${S.op.name} · 시작 HP ${startHP}`);
  renderAll();
  startRound();
};

/* ---------- 렌더 ---------- */
function renderAll() { renderHUD(S.me); renderHUD(S.op); renderHex(S.me); renderHex(S.op); renderFan(S.me); renderFan(S.op); renderHand(); renderOppHand(); renderTools(); renderSteps(); }
function renderSteps() {
  $('#bRound').textContent = S.round;
  $('#bLimit').textContent = App.rules.turnLimit ? ` / ${App.rules.turnLimit}` : '';
  $$('#bSteps li').forEach(li => { const p = +li.dataset.p; li.className = p === S.phase ? 'on' : p < S.phase ? 'done' : ''; });
}
function renderHUD(side) {
  const el = side.isMe ? $('#hudMe') : $('#hudOp'); if (!el) return;
  if (!el.dataset.init) {
    el.dataset.init = 1;
    el.innerHTML = `<div class="hud-tag">${side.isMe ? '나의 HUD' : '상대 HUD'}</div><div class="hud-row"><div class="hud-av">${side.isMe ? '◇' : '◆'}</div><div class="hud-n">${side.isMe ? '나(' + side.name + ')' : side.name}<small>고유 능력 없음 · 외형 자리표시</small></div></div>
    <div class="hud-hp"><span>HP</span><b class="hp-v">${side.hp}</b><em>/ ${side.maxHp}</em></div>
    <div class="hpbar"><i class="trail"></i><i class="fill"></i><i class="shb"></i></div><div class="hud-st"></div>`;
  }
  const pct = clamp(side.hp / side.maxHp * 100, 0, 100);
  el.querySelector('.fill').style.width = pct + '%';
  el.querySelector('.trail').style.width = pct + '%';
  el.querySelector('.shb').style.width = clamp(side.shield / side.maxHp * 100, 0, 100) + '%';
  el.querySelector('.hp-v').textContent = Math.max(0, side.hp);
  el.classList.toggle('low', pct <= 30);
  const st = [];
  if (side.shield > 0) st.push(`<span class="st sh">실드 ${side.shield}</span>`);
  side.dots.forEach(d => st.push(`<span class="st dot">지속 피해 ${d.dmg} · ${d.turns}턴</span>`));
  if (side.storm > 0) st.push(`<span class="st storm">패시브 봉인 ${side.storm}턴</span>`);
  if (side.immune) st.push(`<span class="st imm">무적</span>`);
  if (side.counter) st.push(`<span class="st cnt">반격 +${side.counter}</span>`);
  el.querySelector('.hud-st').innerHTML = st.join('') || '<span class="st none">상태 이상 없음</span>';
}
function renderHex(side) {
  const el = side.isMe ? $('#hexMe') : $('#hexOp'); if (!el) return;
  const tc = traitCounts(side.inv);
  el.innerHTML = tc.map(x => `<div class="hex ${x.tier >= 0 ? 'on t' + x.tier : ''} ${x.n > 0 ? 'has' : ''}" data-tip="<b>${x.t.icon} ${x.t.name}</b><br>${x.t.req} ${x.t.tiers.join(' / ')}<br>${x.t.tiers.map((th, i) => `<span class='${i === x.tier ? 'on' : ''}'>${th}: ${x.t.fx[i]}</span>`).join('<br>')}"><span class="hx-i">${x.t.icon}</span><span class="hx-n">${x.n}/${x.tier >= 0 && x.n >= x.t.tiers[x.t.tiers.length - 1] ? x.n : x.next}</span></div>`).join('');
}
function cardState(side, id) {
  const e = EF[id];
  if (e.k === 'P') return side.storm > 0 ? 'sealed' : 'passive';
  if (side.cd[id] > 0) return 'cool';
  if (side.mods.some(m => m.src === id)) return 'usedNow';
  return (S.phase === 2 || S.phase === 3) ? 'ready' : 'idle';
}
function renderFan(side) {
  const el = side.isMe ? $('#fanMe') : $('#fanOp'); if (!el) return;
  const n = side.inv.length, mid = (n - 1) / 2;
  const sp = side.isMe ? 104 : 34, rot = side.isMe ? 6 : 7;
  el.innerHTML = side.inv.map((id, i) => {
    const e = EF[id], k = i - mid;
    const style = `--x:${k * sp}px;--y:${Math.abs(k) * (side.isMe ? 9 : 4)}px;--r:${k * rot}deg;z-index:${i + 1}`;
    if (!side.isMe && e.k === 'A' && !side.revealed.has(id)) return `<div class="ec back" style="${style}" data-id="${id}"><span>비공개</span><i>◇</i><em>상대 패</em></div>`;
    const st = cardState(side, id);
    const cdv = side.cd[id] || 0;
    const ov = st === 'cool' ? `<div class="cdov"><span class="lk">${ui('lock', 30)}</span><span class="hg">${ui('glass', 34)}</span><b>${cdv}턴</b></div>` : st === 'sealed' ? `<div class="cdov seal"><b>봉인</b></div>` : '';
    const tag = st === 'ready' ? '<div class="ec-tag rd">사용 가능</div>' : st === 'usedNow' ? '<div class="ec-tag un">이번 턴 사용</div>' : st === 'passive' ? '<div class="ec-tag ps">패시브 · 자동</div>' : '';
    return cardHTML(e, 'st-' + st, `style="${style}"`, ov + tag);
  }).join('');
  if (side.isMe) { $('#invN').textContent = `${side.inv.length} / ${slotsOf(side)}`; $('#poolN').textContent = side.pool.length; }
}
function renderHand(anim) {
  const el = $('#handMe'); if (!el) return;
  const s = S.me;
  if (!s.hand.length) { el.innerHTML = `<div class="hand-empty">드래프트를 마치면 전투 패 7장이 배분됩니다</div>`; return; }
  el.innerHTML = s.hand.map((c, i) => {
    const sel = s.sel.includes(i), rr = s.rr.includes(i);
    let cls = sel ? 'sel' : '';
    if (rr) cls += ' rr';
    if (S.phase === 2 && !S.rrMode && !sel && s.sel.length >= 5) cls += ' dis';
    if (S.phase >= 3 && !sel) cls += ' dim';
    if (S.phase === 2 || S.fateMode) cls += ' can';
    if (S.fateMode) cls += ' fate';
    const tag = rr ? '리롤' : sel ? '선택' : '미선택';
    return pokerHTML(c, cls + (anim ? ' deal' : ''), `data-i="${i}" data-tag="${tag}" style="--d:${i * 70}ms"`);
  }).join('');
}
function renderOppHand() {
  const el = $('#handOp'); if (!el) return;
  const n = S.op.hand.length || 0;
  el.innerHTML = Array.from({ length: 7 }, (_, i) => `<div class="pback ${i < n ? '' : 'ghost'} ${S.phase === 4 && S.op.sel.includes(i) ? 'up' : ''}" style="--d:${i * 60}ms"><span>비공개</span><i>◇</i></div>`).join('');
}
function renderTools() {
  const s = S.me, h = evalHand(s.sel.map(i => s.hand[i]));
  $('#tSel').innerHTML = `전투 패 7장 · 선택 <b>${s.sel.length} / 5</b>`;
  $('#tHand').innerHTML = `현재 족보 <b>${h.name}</b>`;
  $('#tRr').textContent = `리롤 ${s.rerolls} · ${S.rrMode ? '선택 중' : '대기'}`;
  $('#tRr').classList.toggle('on', S.rrMode);
  $('#tHint').textContent = S.phase === 2 ? (S.rrMode ? '바꿀 카드를 누르세요' : '카드를 눌러 5장 선택 · 숫자키 1~7') : S.fateMode ? '운명: 바꿀 카드를 누르세요' : '';
}
function ev(html, cls = '') { const el = $('#ev'); if (!el) return; el.className = 'evbox ' + cls; el.innerHTML = `<div class="ev-in">${html}</div>`; }
function addLog(html) { const l = $('#log'); if (!l) return; S.logN++; const d = document.createElement('div'); d.innerHTML = `<i>R${S.round || 0}</i>${html}`; l.prepend(d); }

/* ---------- 툴팁 ---------- */
function bindTips(root) {
  root.addEventListener('mouseover', e => {
    const t = e.target.closest('[data-tip]'); if (!t) return;
    let tip = $('#tip'); if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; $('#layer').appendChild(tip); }
    tip.className = 'tip tip-' + App.v; tip.innerHTML = t.dataset.tip;
    const r = App.rectOf(t);
    tip.style.left = clamp(r.x + r.w / 2, 140, 1300) + 'px'; tip.style.top = r.y + 'px';
    tip.classList.add('show');
  });
  root.addEventListener('mouseout', e => { const t = e.target.closest('[data-tip]'); if (t && !t.contains(e.relatedTarget)) { const tip = $('#tip'); tip && tip.classList.remove('show'); } });
}

/* ---------- 팝업 / 비행 연출 ---------- */
function popAt(el, text, cls = '') {
  if (!el) return;
  const r = App.rectOf(el);
  const p = document.createElement('div'); p.className = 'pop ' + cls; p.innerHTML = text;
  p.style.left = r.x + r.w / 2 + 'px'; p.style.top = r.y + r.h / 2 + 'px';
  $('#layer').appendChild(p); setTimeout(() => p.remove(), 1500);
}
async function flyCard(cardEl, order, label = '효과 발동!') {
  if (!cardEl || !$('#ev')) return;
  const r = App.rectOf(cardEl), t = App.rectOf($('#ev'));
  const c = cardEl.cloneNode(true); c.classList.add('flying'); c.querySelectorAll('.cdov,.ec-tag').forEach(x => x.remove());
  c.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;width:${cardEl.offsetWidth}px;height:${cardEl.offsetHeight}px;margin:0;transform:none;z-index:80`;
  $('#layer').appendChild(c);
  const dx = t.x + t.w / 2 - (r.x + r.w / 2), dy = t.y + t.h / 2 - (r.y + r.h / 2);
  cardEl.style.opacity = .25;
  await c.animate([{ transform: 'translate(0,0) scale(1) rotate(0)' }, { transform: `translate(${dx}px,${dy}px) scale(1.55) rotate(-3deg)` }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' }).finished;
  const b = document.createElement('div'); b.className = 'fx-badge'; b.innerHTML = `<em>${label}</em><b>${order}</b>`; c.appendChild(b);
  burst(t.x + t.w / 2, t.y + t.h / 2, ['#ffd84a', '#fff', '#5b7cff'], 22);
  await wait(650);
  await c.animate([{ transform: `translate(${dx}px,${dy}px) scale(1.55) rotate(-3deg)`, opacity: 1 }, { transform: 'translate(0,0) scale(1) rotate(0)', opacity: .2 }], { duration: 360, easing: 'ease-in', fill: 'forwards' }).finished;
  c.remove(); cardEl.style.opacity = '';
}
async function passiveFlash(side, ids) {
  const fan = side.isMe ? $('#fanMe') : $('#fanOp'); if (!fan || !ids.length) return;
  fan.classList.add('pflash');
  let k = 0;
  for (const id of ids) {
    const c = fan.querySelector(`.ec[data-id="${CSS.escape(id)}"]`); if (!c) continue;
    k++; c.classList.add('pon');
    const b = document.createElement('div'); b.className = 'fx-badge sm'; b.innerHTML = `<em>효과 발동!</em><b>${k}</b>`; c.appendChild(b);
    await wait(380);
  }
  await wait(500);
  fan.classList.remove('pflash'); $$('.pon', fan).forEach(c => { c.classList.remove('pon'); c.querySelectorAll('.fx-badge').forEach(x => x.remove()); });
}

/* ---------- 라운드 흐름 ---------- */
async function startRound() {
  const tok = S.alive;
  S.round++; S.phase = 1; S.rrMode = false; S.fateMode = false;
  [S.me, S.op].forEach(s => { s.hand = []; s.sel = []; s.rr = []; s.mods = []; s.immune = false; s.confuse = false; s.utilUses = 0; });
  if (S.round > 1) {
    for (const s of [S.me, S.op]) {
      Object.keys(s.cd).forEach(id => { if (s.cd[id] > 0) s.cd[id]--; });
      if (s.storm > 0) s.storm--;
      if (s.shield > 0) { addLog(`${s.isMe ? '나' : '상대'}의 실드 ${s.shield} 소멸`); s.shield = 0; }
      const ps = passives(s);
      ps.filter(e => e.fx.smelt).forEach(e => s.smeltMap[e.id] = (s.smeltMap[e.id] || 0) + e.fx.smelt);
      if (ps.some(e => e.fx.haste)) { const c = Object.keys(s.cd).filter(id => s.cd[id] > 0); if (c.length) { const id = pick(c); s.cd[id]--; if (s.isMe) addLog(`<b>신속</b> · ${EF[id].name} 쿨타임 -1`); } }
      if (ps.some(e => e.fx.scheme) && s.inv.filter(id => EF[id].cat.includes('방해')).length >= 3) Object.keys(s.cd).forEach(id => { if (EF[id].cat.includes('방해') && s.cd[id] > 0) s.cd[id]--; });
    }
  } else {
    [S.me, S.op].forEach(s => passives(s).filter(e => e.fx.smelt).forEach(e => s.smeltMap[e.id] = e.fx.smelt));
  }
  // 특성 효과 (라운드 시작)
  for (const s of [S.me, S.op]) {
    const h = traitVal(s, 'H'); if (h && s.hp < s.maxHp) { const v = Math.min(h, s.maxHp - s.hp); s.hp += v; addLog(`${s.isMe ? '나' : '상대'} · ♥ 치유의 맹세 HP +${v}`); }
    const d = traitVal(s, 'D'); if (d) { s.shield += d; addLog(`${s.isMe ? '나' : '상대'} · ◆ 다이아의 환호 실드 +${d}`); }
  }
  // 지속 피해 처리
  for (const s of [S.me, S.op]) {
    if (!s.dots.length) continue;
    let tot = 0;
    s.dots.forEach(d => { tot += d.dmg; d.turns--; if (d.src) stat(other(s), d.src, 'dmg', d.dmg); });
    s.dots = s.dots.filter(d => d.turns > 0);
    s.hp -= tot; addLog(`${s.isMe ? '나' : '상대'} · 지속 피해 <b class="r">-${tot}</b>`);
    App.after(() => popAt(s.isMe ? $('#hudMe') : $('#hudOp'), `-${tot}`, 'dmg dot'), 300);
  }
  renderAll();
  if (checkDeath()) return;
  if (App.rules.turnLimit && S.round > App.rules.turnLimit) { endBattle(S.me.hp >= S.op.hp, '턴 제한 도달'); return; }
  const tc = traitCounts(S.me.inv).find(x => x.t.id === 'S');
  ev(`<div class="ev-k">0${1} 라운드 시작 <span class="ev-r">ROUND ${S.round}</span></div>
    <h2>먼저 효과 카드 1장을 선택하세요.</h2>
    <p>장착 특성: ♠ ${tc.n} / ${tc.next} ${tc.tier < 0 ? `→ 드래프트에서 ♠ ${tc.next - tc.n}장 추가 시 활성 가능` : '· 활성 중 (최종 피해 ×' + tc.val + ')'}. 공격 패의 ♠ 수와는 별개입니다.</p>
    <div class="ev-row"><button class="eb pri" data-a="draft">드래프트 열기 → 02</button><span class="ev-m">장착 ${S.me.inv.length}/${slotsOf(S.me)} · 빈 슬롯 ${Math.max(0, slotsOf(S.me) - S.me.inv.length)}개 · 효과 덱 ${S.me.pool.length}장</span></div>`, 'enter');
  $('#ev [data-a=draft]').onclick = openDraft;
  if (S.round === 1) App.after(() => { if (S.alive === tok && S.phase === 1 && !$('#layer .mwrap')) openDraft(); }, 900);
}

/* ---------- 드래프트 ---------- */
function traitDiff(before, after) {
  const a = traitCounts(before), b = traitCounts(after), out = [];
  a.forEach((x, i) => { const y = b[i]; if (x.n !== y.n) out.push({ t: x.t, from: x, to: y }); });
  return out;
}
function diffHTML(d) {
  if (!d.length) return '<div class="dr-none">특성 변화 없음</div>';
  return d.map(({ t, from, to }) => `<div class="dr"><b>${t.icon} ${from.n} / ${from.tier >= 0 ? from.n : from.next} → ${to.n} / ${to.tier >= 0 ? to.n : to.next}</b>
    ${from.tier !== to.tier ? `<span class="dr-tag ${to.tier > from.tier ? 'up' : 'down'}">${from.tier < 0 ? '비활성' : t.fx[from.tier]} → ${to.tier < 0 ? '비활성' : '활성 · ' + t.fx[to.tier]}</span>` : `<span class="dr-tag">${t.name}</span>`}</div>`).join('');
}
function openDraft() {
  if (S.phase !== 1) return;
  const offer = shuffle(S.me.pool).slice(0, 3);
  if (!offer.length) { toast('효과 덱이 비었습니다 · 드래프트 생략'); deal(); return; }
  let idx = 0;
  const w = modal(`<div class="draft">
    <div class="dm-h"><div><h2>이번 라운드에 더할 효과를 고르세요.</h2><p>3장 중 1장만 획득 · 아직 확정되지 않은 선택 미리보기</p></div><span class="dm-b">선택 1 / 1</span></div>
    <div class="dm-body"><div class="dm-cards">${offer.map((id, i) => `<div class="dm-c" data-i="${i}"><div class="dm-tag"></div>${cardHTML(EF[id])}</div>`).join('')}</div>
    <div class="dm-prev" id="dmPrev"></div></div>
    <div class="dm-note">선택 ≠ 장착 완료. 확정 시에만 특성을 다시 계산합니다. 인벤토리가 꽉 차면 교체 화면으로 전환합니다.</div>
    <div class="dm-f"><span>다른 카드를 누르면 현재 선택만 교체되며 2장 선택은 불가합니다.</span><button class="eb pri big" id="dmOk"></button></div></div>`, { cls: 'm-e', backdrop: false });
  const upd = () => {
    $$('.dm-c', w).forEach((c, i) => { c.classList.toggle('on', i === idx); c.querySelector('.dm-tag').textContent = i === idx ? '✓ 선택됨' : '선택 가능'; });
    const id = offer[idx], e = EF[id], after = [...S.me.inv, id];
    const full = S.me.inv.length >= slotsOf(S.me);
    $('#dmPrev', w).innerHTML = `<h3>장착 후 예상 상태</h3>
      <div class="pv-r"><span>효과 인벤토리</span><b>${S.me.inv.length}/${slotsOf(S.me)} → ${full ? `<em class="r">가득 참 · 교체 필요</em>` : `${after.length}/${slotsOf({ inv: after })}`}</b></div>
      <div class="pv-diff">${diffHTML(traitDiff(S.me.inv, after))}</div>
      <p class="pv-n">${e.k === 'A' ? `액티브 · 쿨타임 ${e.cd}턴 · 획득 즉시 사용 가능` : '패시브 · 장착 즉시 상시 적용 (공개)'}</p>`;
    $('#dmOk', w).textContent = `선택 확정 · ${e.suit}${e.rank} 획득`;
  };
  $$('.dm-c', w).forEach(c => c.onclick = () => { idx = +c.dataset.i; upd(); });
  $('#dmOk', w).onclick = () => {
    const id = offer[idx];
    oppDraft();
    if (S.me.inv.length >= slotsOf(S.me)) { closeModal(true); openReplace(id); return; }
    const src = $$('.dm-c .ec', w)[idx];
    equip(id, src);
  };
  upd();
}
async function equip(id, srcEl) {
  const r = srcEl ? App.rectOf(srcEl) : null;
  closeModal();
  S.me.pool = S.me.pool.filter(x => x !== id); S.me.inv.push(id);
  renderFan(S.me); renderHex(S.me);
  const card = $(`#fanMe .ec[data-id="${CSS.escape(id)}"]`);
  if (card && r) {
    const t = App.rectOf(card);
    card.animate([{ transform: `translate(${r.x - t.x}px,${r.y - t.y}px) scale(1.1)`, opacity: .4 }, { transform: getComputedStyle(card).transform, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,1.1,.4,1)' });
    card.classList.add('new');
  }
  const before = traitCounts(S.me.inv.filter(x => x !== id)), after = traitCounts(S.me.inv);
  addLog(`<b>획득</b> · ${EF[id].suit}${EF[id].rank} ${EF[id].name}`);
  after.forEach((x, i) => { if (x.tier > before[i].tier) { popAt($('#hexMe'), `${x.t.icon} ${x.t.name} 활성!`, 'trait'); addLog(`<b>특성 활성</b> · ${x.t.name} (${x.t.fx[x.tier]})`); } });
  await wait(600);
  deal();
}
function openReplace(newId) {
  const ne = EF[newId]; let pickI = -1;
  const w = modal(`<div class="rep">
    <div class="rp-h"><span class="dm-b">드래프트 확정 시 ${S.me.inv.length} / ${slotsOf(S.me)}</span><b>빈 슬롯이 없습니다. ${ne.suit}${ne.rank}를 받으려면 기존 효과 카드 1장을 버리세요.</b><small>기본 슬롯 5 · 짐꾼 보유 시 +2</small></div>
    <div class="rp-t"><h3>기존 장착 · ${S.me.inv.length} / ${slotsOf(S.me)}</h3><span class="rp-chip" id="rpChip">버릴 카드를 선택하세요</span></div>
    <div class="rp-cards">${S.me.inv.map((id, i) => `<div class="rp-c" data-i="${i}">${cardHTML(EF[id])}</div>`).join('')}</div>
    <div class="rp-b"><div class="rp-new">${cardHTML(ne)}</div><div class="rp-prev" id="rpPrev"><h3>교체 미리보기</h3><p class="mut">왼쪽 위에서 버릴 카드를 고르면 효과·특성 변화를 미리 보여줍니다.</p></div></div>
    <div class="dm-f"><span>교체 확정 전까지 획득 대기 · 특성은 교체 후 재계산</span><div><button class="eb" id="rpNo">새 카드 포기</button><button class="eb pri" id="rpOk" disabled>교체 확정</button></div></div></div>`, { cls: 'm-e', backdrop: false });
  $$('.rp-c', w).forEach(c => c.onclick = () => {
    pickI = +c.dataset.i; $$('.rp-c', w).forEach(x => x.classList.toggle('on', x === c));
    const old = EF[S.me.inv[pickI]], after = S.me.inv.map((id, i) => i === pickI ? newId : id);
    $('#rpChip', w).textContent = `${old.suit}${old.rank} ${old.name} · 버릴 카드 선택됨`;
    $('#rpPrev', w).innerHTML = `<h3>교체 미리보기 · ${old.suit}${old.rank} → ${ne.suit}${ne.rank}</h3>
      <div class="pv-r"><span>장착</span><b>${S.me.inv.length}/${slotsOf(S.me)} → ${after.length}/${slotsOf({ inv: after })}</b></div>
      <div class="pv-diff">${diffHTML(traitDiff(S.me.inv, after))}</div>
      <p class="mut">받을 카드: ${ne.name} / ${ne.desc}<br>버릴 카드: ${old.name} / ${old.desc} 효과 상실${S.me.cd[old.id] ? ' (쿨타임 승계 없음)' : ''}</p>`;
    $('#rpOk', w).disabled = false;
  });
  $('#rpNo', w).onclick = () => { closeModal(); addLog(`새 카드 ${ne.name} 포기`); deal(); };
  $('#rpOk', w).onclick = async () => {
    const old = S.me.inv[pickI]; const oc = $$('.rp-c .ec', w)[pickI];
    oc.classList.add('discard'); await wait(380);
    S.me.inv.splice(pickI, 1); delete S.me.cd[old];
    S.me.pool = S.me.pool.filter(x => x !== newId); S.me.inv.splice(pickI, 0, newId);
    closeModal(); addLog(`<b>교체</b> · ${EF[old].name} → ${ne.name}`);
    renderFan(S.me); renderHex(S.me);
    const c = $(`#fanMe .ec[data-id="${CSS.escape(newId)}"]`); c && c.classList.add('new');
    await wait(400); deal();
  };
}
function oppDraft() {
  const s = S.op, offer = shuffle(s.pool).slice(0, 3); if (!offer.length) return;
  const id = offer.sort((a, b) => GRADE_ORDER[EF[b].g] - GRADE_ORDER[EF[a].g])[App.cpu >= 6 ? 0 : rnd(offer.length)];
  if (s.inv.length >= slotsOf(s)) {
    const lo = s.inv.slice().sort((a, b) => GRADE_ORDER[EF[a].g] - GRADE_ORDER[EF[b].g])[0];
    if (GRADE_ORDER[EF[lo].g] >= GRADE_ORDER[EF[id].g]) return;
    s.inv = s.inv.map(x => x === lo ? id : x); delete s.cd[lo];
  } else s.inv.push(id);
  s.pool = s.pool.filter(x => x !== id);
  renderFan(s); renderHex(s);
  addLog(`상대가 효과 카드를 획득 · 장착 ${s.inv.length}`);
}

/* ---------- 전투 패 ---------- */
function deal() {
  S.phase = 2; S.rrMode = false;
  const me = S.me, op = S.op;
  me.hand = drawCards(me, 7, []); me.sel = []; me.rr = [];
  const luck = passives(me).some(e => e.fx.luck) && Math.random() < .5;
  me.rerolls = 1 + traitVal(me, 'C') + traitVal(me, 'T') + (luck ? 1 : 0);
  if (luck) addLog('<b>행운</b> 발동 · 추가 리롤 +1');
  op.hand = drawCards(op, 7, []);
  op.sel = App.cpu <= 2 && Math.random() < .5 ? shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 5) : best5(op.hand);
  renderAll(); renderHand(true);
  evCompose();
}
function evCompose() {
  const s = S.me, h = evalHand(s.sel.map(i => s.hand[i]));
  ev(`<div class="ev-k">02 전투 패 구성 <span class="ev-r">선택 ${s.sel.length} / 5</span></div>
    <h2>${s.sel.length ? h.name : '공격할 5장을 고르세요'} ${s.sel.length ? `<small>기본 ${h.base}점</small>` : ''}</h2>
    <p>${S.rrMode ? `리롤 모드 · 바꿀 카드를 표시하세요 (${s.rr.length}장 표시)` : '포커 카드 7장 중 5장을 선택하여 족보를 만드세요. 액티브 효과 카드도 지금 사용할 수 있습니다.'}</p>
    <div class="ev-row">
      ${S.rrMode ? `<button class="eb" data-a="rrx">취소</button><button class="eb warn" data-a="rrgo" ${s.rr.length ? '' : 'disabled'}>리롤 실행 (${s.rr.length}장)</button>`
      : `<button class="eb" data-a="rr" ${s.rerolls ? '' : 'disabled'}>리롤 모드 (${s.rerolls})</button><button class="eb" data-a="auto">최적 5장 자동 선택</button>`}
      <button class="eb pri" data-a="ok" ${s.sel.length === 5 && !S.rrMode ? '' : 'disabled'}>${s.sel.length === 5 ? '패 확정 → 03' : '5장 선택 필요'}</button>
    </div>`);
  const b = a => $(`#ev [data-a=${a}]`);
  b('rr') && (b('rr').onclick = () => { S.rrMode = true; renderHand(); renderTools(); evCompose(); });
  b('rrx') && (b('rrx').onclick = () => { S.rrMode = false; S.me.rr = []; renderHand(); renderTools(); evCompose(); });
  b('rrgo') && (b('rrgo').onclick = doReroll);
  b('auto') && (b('auto').onclick = () => { S.me.sel = best5(S.me.hand); renderHand(); renderTools(); evCompose(); });
  b('ok').onclick = () => { S.phase = 3; renderAll(); evPrep(); };
}
function onHandClick(e) {
  const c = e.target && e.target.closest && e.target.closest('.pc'); if (!c) return;
  const i = +c.dataset.i, s = S.me;
  if (S.fateMode) { fatePick(i); return; }
  if (S.phase !== 2) { if (S.phase === 3) toast('패를 다시 고르려면 [← 패 다시 고르기]'); return; }
  if (S.rrMode) { s.rr = s.rr.includes(i) ? s.rr.filter(x => x !== i) : [...s.rr, i]; }
  else if (s.sel.includes(i)) s.sel = s.sel.filter(x => x !== i);
  else if (s.sel.length < 5) s.sel.push(i);
  else { shake(c); return; }
  renderHand(); renderTools(); evCompose();
}
async function doReroll() {
  const s = S.me; const idx = [...s.rr];
  const els = idx.map(i => $$('#handMe .pc')[i]);
  els.forEach(el => el.classList.add('flipout'));
  await wait(260);
  const nw = drawCards(s, idx.length, s.hand);
  idx.forEach((i, k) => s.hand[i] = nw[k]);
  s.sel = s.sel.filter(i => !idx.includes(i)); s.rr = []; s.rerolls--; S.rrMode = false;
  renderHand(); idx.forEach(i => $$('#handMe .pc')[i].classList.add('flipin'));
  addLog(`리롤 · ${idx.length}장 교체`);
  renderTools(); evCompose();
}

/* ---------- 쇼다운 준비 ---------- */
function evPrep() {
  const c = calc(S.me, S.op), s = S.me;
  const used = s.mods.map(m => `<span class="uchip">${m.label} 사용 완료 · 재사용 ${S.me.cd[m.src] || 0}턴</span>`).join('');
  ev(`<div class="ev-k">03 쇼다운 준비 <span class="ev-r">선택 5 / 5 · 제출 가능</span><span class="ev-rt">내 패 공개 전 · 상대도 제출 대기</span></div>
    <div class="ev-2"><div><h2>${c.h.name}</h2><p>제출 예정: ${s.sel.map(i => `<b class="${isRed(s.hand[i].s) ? 'r' : ''}">${s.hand[i].s}${s.hand[i].r}</b>`).join(' · ')}</p></div>
    <div class="ev-f"><div class="fml">${formula(c)}</div><p>${[`족보 ${c.base}`, ...c.parts.map(p => p.t === 'b' ? `${p.label} +${p.v}` : `${p.label} ×${fmtMult(p.v)}`)].join(' / ')}${c.crit ? ` · 치명타 ${c.crit}%` : ''}</p></div></div>
    <div class="ev-row bt-line">${used || '<span class="uchip ghost">액티브 효과 카드를 눌러 사용할 수 있습니다</span>'}<span class="ev-m">패시브는 공개 / 액티브는 사용 시 상대에게 공개</span>
    <button class="eb" data-a="back" ${s.mods.length ? 'disabled title="액티브 사용 후에는 패를 바꿀 수 없습니다"' : ''}>← 패 다시 고르기</button><button class="eb pri" data-a="go">제출 확정 → 04</button></div>`);
  $('#ev [data-a=back]').onclick = () => { S.phase = 2; renderAll(); evCompose(); };
  $('#ev [data-a=go]').onclick = resolve;
}
function cardDetail(id, opp) {
  const side = opp ? S.op : S.me, e = EF[id], st = cardState(side, id), cdv = side.cd[id] || 0;
  const can = !opp && e.k === 'A' && st === 'ready';
  const w = modal(`<div class="cdet"><h3>카드 상세 / ${e.name}</h3>
    <div class="cd-b">${cardHTML(e)}<div class="cd-i"><span class="cd-g">${GRADES[e.g].en} · ${e.k === 'A' ? '액티브' : '패시브'} · ${e.cat}</span><p class="cd-d">${e.desc}</p>
    <p class="mut">${e.k === 'A' ? `수동 발동 / 패 제출 전 사용<br>기본 CD ${e.cd}턴 · 사용 즉시 잔여 ${e.cd}<br>상대에게 사용 카드 공개 · 사용 후 취소·재사용 불가` : '패시브 · 매 턴 자동 적용 · 상대에게 공개'}</p></div></div>
    ${e.k === 'A' && !opp ? `<div class="cd-s"><h4>상태</h4><div class="cd-row"><div><b>${st === 'cool' ? `쿨다운 · 잔여 ${cdv}` : st === 'usedNow' ? '사용 후 · 잔여 ' + cdv : '준비 · 잔여 0'}</b><span>${st === 'ready' ? '준비 단계에서 사용 가능' : st === 'cool' ? `다음 턴 시작 ${cdv}→${cdv - 1}` : st === 'usedNow' ? '이번 턴 이미 사용' : '전투 패 구성/쇼다운 준비 단계에서 사용 가능'}</span></div>
    <button class="eb ${can ? 'pri' : ''}" id="cdUse" ${can ? '' : 'disabled'}>${can ? `${e.name} 사용` : st === 'cool' ? `쿨다운 ${cdv} · 잠금` : '지금은 사용 불가'}</button></div></div>` : ''}
    <button class="eb ghost cd-x" onclick="closeModal()">닫기</button></div>`, { cls: 'm-e' });
  const u = $('#cdUse', w); if (u && can) u.onclick = () => { closeModal(); useActive(S.me, id); };
}
async function useActive(side, id, silent) {
  const e = EF[id], oth = other(side);
  side.cd[id] = e.cd; side.usedOrder++;
  const fx = { ...e.fx }; let label = e.name;
  if (fx.mirror) {
    if (!side.lastUsed) { if (side.isMe) toast('복제할 효과가 없습니다', 'err'); side.cd[id] = 0; side.usedOrder--; return; }
    Object.assign(fx, EF[side.lastUsed].fx); delete fx.mirror; label = `마법 거울(${EF[side.lastUsed].name})`;
  }
  side.mods.push({ src: id, label, fx });
  stat(side, id, 'uses', 1);
  if (!fx.mirror) side.lastUsed = e.fx.mirror ? side.lastUsed : id;
  if (e.cat.includes('유틸') || e.cat.includes('방어')) side.utilUses++;
  if (!side.isMe) side.revealed.add(id);
  // 연출
  if (side.isMe) { renderFan(side); await flyCard($(`#fanMe .ec[data-id="${CSS.escape(id)}"]`), side.usedOrder); }
  else { renderFan(side); const c = $(`#fanOp .ec[data-id="${CSS.escape(id)}"]`); if (c) { c.classList.add('reveal'); popAt(c, `${e.name}!`, 'opfx'); } await wait(500); }
  // 즉시 효과
  const hud = side.isMe ? $('#hudMe') : $('#hudOp');
  if (fx.heal) { const v = Math.min(fx.heal, side.maxHp - side.hp); side.hp += v; stat(side, id, 'heal', v); popAt(hud, `+${v} HP`, 'heal'); }
  if (fx.shield) { side.shield += fx.shield; stat(side, id, 'shield', fx.shield); popAt(hud, `실드 +${fx.shield}`, 'shield'); }
  if (fx.sturdy) { const v = Math.min(20, Math.floor((side.maxHp - side.hp) / 2)); side.shield += v; stat(side, id, 'shield', v); popAt(hud, `실드 +${v}`, 'shield'); }
  if (fx.cleanse) { side.dots = []; popAt(hud, '정화!', 'heal'); }
  if (fx.immune) side.immune = true;
  if (fx.confuse) side.confuse = true;
  if (fx.storm) { oth.storm = fx.storm; popAt(oth.isMe ? $('#hudMe') : $('#hudOp'), '패시브 봉인!', 'opfx'); renderFan(oth); renderHex(oth); }
  if (fx.refit) { const c = Object.keys(side.cd).filter(x => x !== id && side.cd[x] > 0).sort((a, b) => side.cd[b] - side.cd[a])[0]; if (c) { side.cd[c]--; side.isMe && toast(`재정비 · ${EF[c].name} 쿨타임 -1`, 'ok'); } }
  if (fx.fate && side.isMe) { S.fateMode = true; renderHand(); renderTools(); toast('운명 · 바꿀 포커 카드를 고르세요'); }
  if (passives(side).some(p => p.fx.recycle) && Math.random() < .05 * passives(side).filter(p => p.fx.recycle).length) { side.cd[id] = 0; popAt(hud, '순환 발동! 재사용 가능', 'trait'); }
  addLog(`${side.isMe ? '나' : '상대'} · <b>${label}</b> 사용`);
  renderAll();
  if (side.isMe && S.phase === 3) evPrep(); else if (side.isMe && S.phase === 2) evCompose();
}
function fatePick(i) {
  const s = S.me, have = new Set(s.hand.map(c => c.r + c.s));
  const w = modal(`<div class="fate"><h3>운명 · ${s.hand[i].s}${s.hand[i].r}를 무엇으로 바꿀까요?</h3><div class="fate-g">${SUITS.map(su => RANKS.map(r => `<button class="fg ${isRed(su) ? 'red' : ''}" data-c="${r}|${su}" ${have.has(r + su) ? 'disabled' : ''}>${su}${r}</button>`).join('')).join('')}</div></div>`, { cls: 'm-e' });
  $$('.fg', w).forEach(b => b.onclick = async () => {
    const [r, su] = b.dataset.c.split('|'); s.hand[i] = { r, s: su }; S.fateMode = false; closeModal();
    renderHand(); const el = $$('#handMe .pc')[i]; el.classList.add('flipin', 'fated'); renderTools();
    addLog(`<b>운명</b> · ${su}${r}로 교체`);
    S.phase === 3 ? evPrep() : evCompose();
  });
}

/* ---------- 피해 정산 ---------- */
async function resolve() {
  const tok = S.alive, me = S.me, op = S.op;
  S.phase = 4; renderAll();
  ev(`<div class="ev-k">쇼다운 대기 <span class="ev-r">상대 제출 대기 중</span></div><h2 class="wait">상대의 제출을 기다리는 중<i>.</i><i>.</i><i>.</i></h2>`);
  await wait(700);
  // 상대 AI 액티브 사용
  const readyOp = op.inv.filter(id => EF[id].k === 'A' && !(op.cd[id] > 0));
  for (const id of shuffle(readyOp)) {
    if (S.alive !== tok) return;
    if (EF[id].fx.mirror && !op.lastUsed) continue;
    if (Math.random() < .3 + App.cpu * .06) await useActive(op, id);
  }
  // 혼란 처리
  for (const [a, b] of [[me, op], [op, me]]) if (a.confuse) {
    const k = pick(b.sel); const nw = drawCards(b, 1, b.hand)[0];
    b.hand[k] = nw; addLog(`<b>혼란</b> · ${b.isMe ? '내' : '상대'} 카드 1장이 ${nw.s}${nw.r}로 바뀜`);
    b.confused = k;
  }
  const A = calc(me, op), B = calc(op, me);
  const cardRow = (s, cls) => s.sel.map((i, k) => `<div class="sd-c" style="--k:${k}">${pokerHTML(s.hand[i], 'sm ' + (s.confused === i ? 'conf' : ''))}<div class="sd-b">◇</div></div>`).join('');
  ev(`<div class="sd">
    <div class="sd-side op"><div class="sd-n">${op.name}</div><div class="sd-cards">${cardRow(op)}</div><div class="sd-f"><span class="sd-h">${B.h.name}</span><span class="fml">${formula(B)}</span></div><b class="sd-s" id="sdOp">0</b></div>
    <div class="sd-vs">VS</div>
    <div class="sd-side me"><div class="sd-n">나</div><div class="sd-cards">${cardRow(me)}</div><div class="sd-f"><span class="sd-h">${A.h.name}</span><span class="fml">${formula(A)}</span></div><b class="sd-s" id="sdMe">0</b></div>
  </div>`, 'showdown');
  me.confused = op.confused = undefined;
  // 카드 공개 (상대 → 나)
  const flips = [...$$('#ev .sd-side.op .sd-c'), ...$$('#ev .sd-side.me .sd-c')];
  for (const f of flips) { if (S.alive !== tok) return; f.classList.add('open'); await wait(110); }
  await wait(250);
  // 패시브 발동 연출
  const pm = A.parts.filter(p => p.pas).map(p => p.src), po = B.parts.filter(p => p.pas).map(p => p.src);
  await Promise.all([passiveFlash(me, pm), passiveFlash(op, po)]);
  $$('#ev .sd-f').forEach(f => f.classList.add('show'));
  // 치명타
  let sA = A.score, sB = B.score;
  if (A.crit && rnd(100) < A.crit) { sA = Math.round(sA * 1.5); popAt($('#sdMe'), 'CRITICAL ×1.5', 'crit'); addLog('<b>치명타!</b> 내 점수 ×1.5'); }
  if (B.crit && rnd(100) < B.crit) { sB = Math.round(sB * 1.5); popAt($('#sdOp'), 'CRITICAL ×1.5', 'crit'); addLog('상대 <b>치명타!</b>'); }
  countUp($('#sdMe'), sA, 800); countUp($('#sdOp'), sB, 800);
  await wait(950);
  if (S.alive !== tok) return;
  // 전투 예측
  const win = sA > sB ? me : sB > sA ? op : null, lose = win ? other(win) : null;
  const diff = Math.abs(sA - sB);
  if (App.battleOpt.forecast) await forecast(sA, sB, A, B, win, diff);
  if (S.alive !== tok) return;
  // 충돌
  const box = $('#ev'); box.classList.add('clash');
  await wait(380);
  if (!win) {
    popAt($('#ev'), '무승부 — 피해 없음', 'tie'); addLog('무승부 · 피해 없음');
  } else {
    const winMods = win.mods;
    const pierce = winMods.some(m => m.fx.pierce), brk = winMods.filter(m => m.fx.breakS).reduce((a, m) => a + m.fx.breakS, 0);
    const dealt = applyDamage(lose, diff, { pierce, brk, big: true });
    attribute(win, win === me ? A : B, win === me ? sA : sB, dealt);
    addLog(`${win.isMe ? '내' : '상대'} 승리 · ${win === me ? sA : sB} - ${win === me ? sB : sA} = <b class="r">${diff}</b> → ${lose.isMe ? '나' : '상대'} HP -${dealt}`);
    await wait(650);
    if (dealt > 0) {
      const chain = winMods.find(m => m.fx.chain); if (chain) { const v = Math.floor(dealt * chain.fx.chain); const d2 = applyDamage(lose, v, { pierce: true, label: '연격' }); stat(win, chain.src, 'dmg', d2); addLog(`<b>연격</b> 추가 피해 ${d2}`); await wait(550); }
      const ag = winMods.find(m => m.fx.again); if (ag) { const d3 = applyDamage(lose, diff, { pierce, label: '찬스 스텝' }); stat(win, ag.src, 'dmg', d3); addLog(`<b>찬스 스텝</b> 재결산 ${d3}`); await wait(550); }
      const dt = winMods.find(m => m.fx.dot); if (dt) { lose.dots.push({ dmg: dt.fx.dot, turns: 2, src: dt.src }); addLog(`<b>열상</b> · 지속 피해 ${dt.fx.dot} (2턴)`); }
    } else {
      const ag = winMods.find(m => m.fx.again); if (ag) addLog('찬스 스텝 불발');
    }
    const cnt = lose.mods.find(m => m.fx.counter); if (cnt && lose._lastTaken === 0) { lose.counter = cnt.fx.counter; addLog(`<b>반격</b> 준비 · 다음 턴 +${cnt.fx.counter}`); }
  }
  for (const s of [me, op]) {
    if (s.counter && !s.mods.some(m => m.fx.counter)) s.counter = 0;
    const av = passives(s).find(e => e.fx.avatar); if (av) { other(s).dots.push({ dmg: av.fx.avatar, turns: 2, src: av.id }); stat(s, av.id, 'uses', 1); }
    if (passives(s).some(e => e.fx.contagion) && s.dots.length) other(s).dots.push({ dmg: 2, turns: 1, src: '◆5' });
  }
  box.classList.remove('clash');
  renderAll();
  if (checkDeath()) return;
  if (App.rules.turnLimit && S.round >= App.rules.turnLimit) { await wait(700); endBattle(me.hp >= op.hp, '턴 제한 도달'); return; }
  await wait(500);
  ev(`<div class="ev-k">04 피해 정산 결과 <span class="ev-r">ROUND ${S.round}</span></div>
    <div class="ev-2"><div><h2>${!win ? '무승부' : win.isMe ? '공격 성공!' : '피해를 받았습니다'}</h2><p>내 점수 <b>${sA}</b> · 상대 점수 <b>${sB}</b> · 차이 <b class="r">${diff}</b></p></div>
    <div class="ev-hp"><div><span>나</span><b>${me.hp}</b></div><div><span>상대</span><b>${op.hp}</b></div></div></div>
    <div class="ev-row"><span class="ev-m">생존 시 다음 라운드로 진행 (01부터 반복) · 쿨타임 -1 · 실드 소멸</span><button class="eb pri" data-a="next">다음 라운드 →</button></div>`);
  $('#ev [data-a=next]').onclick = startRound;
}
function applyDamage(t, dmg, o = {}) {
  const hud = t.isMe ? $('#hudMe') : $('#hudOp');
  t._lastTaken = 0;
  if (t.immune) { t.immune = false; popAt(hud, '무적! 피해 무시', 'heal'); return 0; }
  if (!o.pierce) { const red = Math.min(80, t.mods.reduce((a, m) => a + (m.fx.reduce || 0), 0)); if (red) { dmg = Math.round(dmg * (1 - red / 100)); popAt(hud, `급소 회피 -${red}%`, 'shield'); } }
  if (t.shield > 0) {
    if (o.pierce) popAt(hud, '실드 무시!', 'opfx');
    else if (o.brk && rnd(100) < o.brk) { popAt(hud, '실드 파괴!', 'opfx'); t.shield = 0; }
    else { const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab; if (ab) setTimeout(() => popAt(hud, `실드 -${ab}`, 'shield'), 150); }
  }
  t.hp -= dmg; t._lastTaken = dmg;
  const st = $('#bt');
  if (dmg > 0) {
    popAt(hud, `-${dmg}`, 'dmg' + (o.big ? ' big' : ''));
    if (o.label) popAt($('#ev'), `${o.label} +${dmg}`, 'trait');
    if (st) { const fc = t.isMe ? 'flash' : 'flashop'; shake(st, o.big ? 'hitbig' : 'shake'); st.classList.remove('flash', 'flashop'); void st.offsetWidth; st.classList.add(fc); setTimeout(() => st.classList.remove(fc), 520); }
    hud.classList.add('hit'); setTimeout(() => hud.classList.remove('hit'), 500);
  }
  renderHUD(t);
  return dmg;
}
function attribute(win, C, total, dealt) {
  if (!dealt || !total) return;
  const raw = (C.base + C.bonus) * C.mult;
  C.parts.forEach(p => {
    if (!p.src) return;
    const contrib = p.t === 'b' ? p.v * C.mult : (C.base + C.bonus) * C.mult * (1 - 1 / p.v);
    const v = Math.round(dealt * contrib / raw);
    if (v > 0) { stat(win, p.src, 'dmg', v); if (p.pas) stat(win, p.src, 'uses', 1); }
  });
}
function forecast(sA, sB, A, B, win, diff) {
  return new Promise(res => {
    const col = (s, sc, C, enemy) => `<div class="fc-col ${s.isMe ? 'me' : 'op'}"><div class="fc-n">${s.isMe ? '나' : s.name}</div>
      <div class="fc-r"><span>족보</span><b>${C.h.name}</b></div><div class="fc-r"><span>최종 점수</span><b class="big">${sc}</b></div>
      <div class="fc-r"><span>치명타</span><b>${C.crit}%</b></div><div class="fc-r"><span>실드</span><b>${s.shield}</b></div>
      <div class="fc-r"><span>감면</span><b>${Math.min(80, s.mods.reduce((a, m) => a + (m.fx.reduce || 0), 0))}%${s.immune ? ' · 무적' : ''}</b></div>
      <div class="fc-r hl"><span>예상 받는 피해</span><b>${win && win !== s ? diff : 0}</b></div></div>`;
    const w = modal(`<div class="fc"><div class="fc-h">BATTLE FORECAST <small>전투 예측 · 공격 전 예상 결과</small></div>
      <div class="fc-b">${col(S.me, sA, A)}<div class="fc-mid"><b>${diff}</b><span>점수 차</span><em>${!win ? '무승부' : win.isMe ? '→ 상대에게' : '← 나에게'}</em></div>${col(S.op, sB, B)}</div>
      <div class="fc-f"><span>실드·감면·추가 효과는 정산 시 적용됩니다</span><button class="eb pri big" id="fcGo">정산 개시</button></div></div>`, { cls: 'm-e m-fc', backdrop: false, onClose: res });
    $('#fcGo', w).onclick = () => closeModal();
  });
}
function checkDeath() {
  for (const s of [S.me, S.op]) {
    if (s.hp <= 0 && !s.undyingUsed && passives(s).some(e => e.fx.undying)) {
      s.undyingUsed = true; s.hp = 1; stat(s, '♥J', 'uses', 1);
      popAt(s.isMe ? $('#hudMe') : $('#hudOp'), '불사! HP 1로 생존', 'trait'); addLog(`<b>불사</b> 발동 · ${s.isMe ? '나' : '상대'} HP 1`);
      renderHUD(s);
    }
  }
  if (S.me.hp <= 0 || S.op.hp <= 0) { setTimeout(() => endBattle(S.op.hp <= 0 && S.me.hp > 0, 'HP 0'), 900); return true; }
  return false;
}

/* ---------- 메뉴 / 특성 패널 ---------- */
function battleMenu() {
  const o = App.battleOpt;
  const seg = (k, opts) => `<div class="seg" data-k="${k}">${opts.map(([v, t]) => `<button data-v="${v}" class="${o[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const w = modal(`<div class="bmenu"><h3>설정 및 메뉴</h3>
    <label>효과 카드 강조 방식 <small>(마우스 포인터 접근 시)</small></label>${seg('hl', [['size', '크기 변화'], ['border', '테두리 색'], ['both', '둘 다']])}
    <label>쿨타임 표시</label>${seg('cd', [['lock', '자물쇠'], ['hourglass', '모래시계'], ['tint', '색상 변환']])}
    <label>피해 정산 연출</label>${seg('forecast', [[true, '전투 예측 먼저'], [false, '심리스 (바로 정산)']])}
    <div class="bm-f"><button class="eb" data-a="sur">항복하기</button><button class="eb" data-a="out">로비로 나가기</button><button class="eb pri" data-a="x">계속하기</button></div></div>`, { cls: 'm-e' });
  $$('.seg', w).forEach(sg => sg.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; let v = b.dataset.v; if (v === 'true') v = true; if (v === 'false') v = false;
    o[sg.dataset.k] = v; $$('button', sg).forEach(x => x.classList.toggle('on', x === b));
    const bt = $('#bt'); bt.className = bt.className.replace(/hl-\w+/, 'hl-' + o.hl).replace(/cd-\w+/, 'cd-' + o.cd);
  });
  $('[data-a=x]', w).onclick = () => closeModal();
  $('[data-a=sur]', w).onclick = () => { closeModal(true); S.me.hp = 0; renderHUD(S.me); endBattle(false, '항복'); };
  $('[data-a=out]', w).onclick = () => { closeModal(true); S.alive = null; App.backFromBattle(S.from); };
}
function traitPanel(side) {
  const tc = traitCounts(side.inv);
  modal(`<div class="tpanel"><h3>특성 패널 · ${side.isMe ? '나' : '상대'}</h3><p class="mut">효과 카드의 문양·숫자로 족보를 만들어 특성을 활성화합니다. (TFT 시너지 방식)</p>
    ${tc.map(x => `<div class="tp-r ${x.tier >= 0 ? 'on' : ''}"><div class="hex ${x.tier >= 0 ? 'on' : ''} has"><span class="hx-i">${x.t.icon}</span></div><div><b>${x.t.name}</b> <small>${x.t.req} · 현재 ${x.n}</small>
    <div class="tp-tiers">${x.t.tiers.map((th, i) => `<span class="${i <= x.tier ? 'on' : ''}">${th} · ${x.t.fx[i]}</span>`).join('')}</div></div></div>`).join('')}
    ${side.inv.some(id => EF[id].fx.joker) ? '<p class="tp-j">조커 보유 · 모든 특성 +1 적용 중</p>' : ''}<button class="eb pri" onclick="closeModal()">닫기</button></div>`, { cls: 'm-e' });
}

/* ---------- 종료 ---------- */
async function endBattle(win, why) {
  if (!S || S.ended) return; S.ended = true; S.phase = 5;
  closeModal(true);
  App.lastResult = buildResult(win);
  App.history.unshift({ win, mode: S.mode, rounds: S.round, mvp: App.lastResult.me.mvpName, dmg: App.lastResult.me.total, opp: S.op.name, date: '방금', hp: Math.max(0, S.me.hp) });
  const ov = document.createElement('div');
  ov.className = 'endov ' + (win ? 'win' : 'lose');
  ov.innerHTML = `<div class="rays"></div><div class="end-t">${(win ? 'VICTORY' : 'DEFEAT').split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
    <div class="end-s">${win ? '승리' : '패배'} · ${why} · ${S.round}라운드</div><div class="end-hp">나 HP ${Math.max(0, S.me.hp)} · 상대 HP ${Math.max(0, S.op.hp)}</div>
    <button class="eb pri big">명예의 전당 →</button>`;
  $('#layer').appendChild(ov);
  if (win) setTimeout(() => burst(720, 330, ['#ffd84a', '#fff', '#3d5bff'], 60, $('#layer'), 380), 500);
  ov.querySelector('button').onclick = () => { ov.remove(); App.go('fame'); };
}
function buildResult(win) {
  const pack = (s) => {
    const cards = Object.entries(s.stats).map(([id, st]) => ({ id, ...st })).filter(c => c.uses || c.dmg || c.shield || c.heal);
    s.inv.forEach(id => { if (!cards.find(c => c.id === id)) cards.push({ id, uses: 0, dmg: 0, shield: 0, heal: 0, rounds: {} }); });
    cards.sort((a, b) => b.dmg - a.dmg || b.uses - a.uses);
    const last = S.round;
    let mvp = cards.slice().sort((a, b) => ((b.rounds[last] || {}).dmg || 0) - ((a.rounds[last] || {}).dmg || 0))[0];
    if (!mvp || !((mvp.rounds[last] || {}).dmg)) mvp = cards[0];
    return { name: s.name, cards: cards.slice(0, 6), mvp: mvp && mvp.id, mvpName: mvp ? EF[mvp.id].name : '-', total: cards.reduce((a, c) => a + c.dmg, 0) };
  };
  return { win, rounds: S.round, myHP: Math.max(0, S.me.hp), opHP: Math.max(0, S.op.hp), me: pack(S.me), op: pack(S.op), from: S.from, mode: S.mode, sample: false };
}
function sampleResult() {
  const c = (id, uses, dmg, shield, heal, rounds = {}) => ({ id, uses, dmg, shield, heal, rounds });
  return { win: true, rounds: 8, myHP: 18, opHP: 0, from: App.v === 'E' ? 'E' : App.v, mode: '무작위', sample: true,
    me: { name: '플레이어', mvp: '♠Q', mvpName: '심판', total: 312, cards: [c('♠Q', 3, 96, 0, 0, { 2: { uses: 1, dmg: 18 }, 5: { uses: 1, dmg: 30 }, 8: { uses: 1, dmg: 48 } }), c('♠7', 4, 144, 0, 0), c('♠A', 6, 72, 0, 0), c('♥7', 3, 0, 90, 0), c('♥Q', 2, 0, 0, 48)] },
    op: { name: 'Rival_K', mvp: '♠7', mvpName: '연격', total: 280, cards: [c('♠7', 3, 96, 0, 0, { 7: { uses: 1, dmg: 44 } }), c('♠A', 5, 120, 0, 0), c('♠6', 4, 64, 0, 0), c('♥6', 3, 0, 60, 36), c('♥Q', 1, 0, 0, 18)] } };
}

/* ---------- CSS ---------- */
injectCSS(`
.vE{--bg:#07090d;--pan:#10141c;--pan2:#161b26;--ln:#262c3a;--tx:#e9ecf3;--mut:#8a93a6;--blue:#3d5bff;--gold:#ffd84a;--red:#ff4d5e;--grn:#3ddc84;color:var(--tx);background:radial-gradient(ellipse at 50% 45%,#16233a 0%,#0b1019 55%,#07090d 100%)}
.vE .eb{border:1px solid var(--ln);background:var(--pan2);color:var(--tx);border-radius:8px;padding:9px 16px;font-size:14px;font-weight:700;transition:.15s}
.vE .eb:hover:not([disabled]){border-color:#4b5470;transform:translateY(-1px)}
.vE .eb:active:not([disabled]){transform:translateY(1px)}
.vE .eb.pri,.m-e .eb.pri{background:var(--blue,#3d5bff);border-color:#3d5bff;color:#fff}
.vE .eb.warn,.m-e .eb.warn{background:#d9a41a;border-color:#d9a41a;color:#111}
.vE .eb[disabled],.m-e .eb[disabled]{opacity:.38;cursor:not-allowed}
.vE .eb.big,.m-e .eb.big{padding:13px 26px;font-size:16px}
/* intro */
.ei{position:absolute;inset:0;padding:44px 56px;display:flex;flex-direction:column;gap:26px}
.ei-head{display:flex;justify-content:space-between;align-items:flex-end;gap:30px}
.ei-k{color:var(--gold);font-size:13px;font-weight:700;letter-spacing:.05em}
.ei h1{font:900 64px/1 'Archivo Black','Noto Sans KR';margin:8px 0 10px;letter-spacing:-.01em}
.ei h1 span{font:900 28px 'Noto Sans KR';color:var(--mut);margin-left:10px}
.ei p{color:#b9c0cf;max-width:760px;margin:0;line-height:1.6}
.ei-btns{display:flex;gap:10px;flex-shrink:0}.ei-btns .eb{padding:14px 22px;font-size:15px}
.ei-loop{display:flex;align-items:stretch;gap:10px}
.ei-arr{align-self:center;color:var(--mut);font-size:22px}
.ei-step{flex:1;background:var(--pan);border:1px solid var(--ln);border-radius:14px;padding:16px 18px;animation:eiIn .6s calc(var(--i)*.12s) both cubic-bezier(.2,1.2,.4,1)}
@keyframes eiIn{from{opacity:0;transform:translateY(24px)}}
.ei-step h3{margin:10px 0 4px;font-size:18px}.ei-step p{font-size:13px;color:var(--mut)}
.ei-n{font:900 13px 'Archivo Black';color:var(--blue)}
.ei-ill{height:110px;margin-top:8px;border-radius:10px;background:#0b0f17;position:relative;display:flex;align-items:center;justify-content:center;gap:6px;overflow:hidden}
.mc{width:52px;height:74px;background:#fff;color:#111;border-radius:6px;font-weight:900;display:flex;align-items:flex-start;justify-content:flex-start;padding:5px;font-size:14px;animation:mcPick 3s infinite}
.mc.b{color:#d8252a;animation-delay:.2s}.mc.a{animation-name:mcSel}
@keyframes mcSel{0%,30%{transform:none;outline:0}45%,90%{transform:translateY(-10px) scale(1.08);outline:3px solid var(--gold)}}
@keyframes mcPick{0%,40%{opacity:1}55%,90%{opacity:.35}}
.mp{width:30px;height:44px;background:#fff;color:#111;border-radius:4px;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center}
.mp.on{animation:mpOn 3s infinite;animation-delay:calc(var(--j)*.18s)}
@keyframes mpOn{0%,20%{background:#fff}35%,90%{background:#9dffb8;transform:translateY(-6px)}}
.mf{font:700 22px 'Noto Sans KR';color:#fff}.mf b{color:var(--gold);display:inline-block;animation:mfPop 2s infinite}
@keyframes mfPop{0%,60%{transform:scale(1)}70%{transform:scale(1.5)}80%,100%{transform:scale(1)}}
.mhp{width:70%;height:14px;background:#2a1418;border-radius:7px;overflow:hidden}.mhp i{display:block;height:100%;background:var(--grn);animation:mhp 3s infinite}
@keyframes mhp{0%,30%{width:80%}50%,100%{width:52%}}
.mdmg{position:absolute;font:900 30px 'Archivo Black';color:var(--red);animation:mdmg 3s infinite}
@keyframes mdmg{0%,30%{opacity:0;transform:translateY(10px)}40%{opacity:1;transform:translateY(-14px) scale(1.4)}70%,100%{opacity:0;transform:translateY(-34px)}}
.ei-bottom{display:grid;grid-template-columns:1.1fr 1.4fr 1fr;gap:14px;flex:1;min-height:0}
.ei-box{background:var(--pan);border:1px solid var(--ln);border-radius:14px;padding:16px 18px;overflow:hidden}
.ei-box h4{margin:0 0 10px;font-size:15px}.ei-box h4 small{color:var(--mut);font-weight:500}
.ei-hands{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;font-size:13px}.ei-hands div{display:flex;justify-content:space-between;border-bottom:1px dashed #262c3a;padding:3px 0}.ei-hands b{color:var(--gold)}
.ei-traits{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ei-traits div{display:grid;grid-template-columns:34px 1fr;column-gap:8px;font-size:12px;align-items:center}
.ei-traits .hexi{grid-row:span 3;width:32px;height:36px;background:var(--blue);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:900}
.ei-traits span{color:var(--mut)}.ei-traits em{color:var(--gold);font-style:normal}
.ei-cnt{display:flex;gap:10px}.ei-cnt div{flex:1;background:#0b0f17;border-radius:10px;padding:10px;text-align:center;font-size:12px;color:var(--mut)}.ei-cnt b{display:block;font:900 30px 'Archivo Black';color:#fff}
.ei-note{font-size:12px!important;margin-top:12px!important}
/* battle layout */
.bt{position:absolute;inset:0}
.b-left,.b-right{position:absolute;top:14px;bottom:14px;display:flex;flex-direction:column;gap:8px}
.b-left{left:14px;width:246px}.b-right{right:14px;width:258px}
.b-center{position:absolute;left:274px;right:286px;top:10px;bottom:0}
.b-top{display:flex;gap:10px;align-items:center}
.b-menu{width:46px;height:40px;border-radius:8px;border:1px solid var(--ln);background:var(--pan2);color:#fff;font-size:20px}
.b-menu:hover{background:#232a3a}
.b-round{font:900 13px 'Archivo Black';color:var(--mut);letter-spacing:.08em}.b-round b{color:#fff;font-size:24px;margin-left:4px}
.b-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}
.b-steps li{display:flex;gap:10px;align-items:center;padding:6px 10px;border-radius:7px;font-size:13px;color:var(--mut);border:1px solid transparent;transition:.3s}
.b-steps li b{font:900 12px 'Archivo Black'}
.b-steps li.on{background:var(--blue);color:#fff;box-shadow:0 0 18px #3d5bff66}.b-steps li.done{color:#cfd5e2}.b-steps li.done b{color:var(--grn)}
.b-sec{font-size:12px;color:var(--mut);display:flex;align-items:center;gap:6px;margin-top:4px}.b-sec small{color:#5e6678}
.b-more{margin-left:auto;font-size:11px;background:none;border:1px solid var(--ln);color:var(--mut);border-radius:6px;padding:2px 8px}
.hexes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 4px}
.hex{width:64px;height:72px;margin:auto;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:#1b2130;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:.3s;cursor:help;color:#5b6377}
.hex.has{background:#252d40;color:#c9cfdc}
.hex.on{background:linear-gradient(160deg,#5b78ff,#2639c9);color:#fff;filter:drop-shadow(0 0 8px #3d5bff)}
.hex.on.t1{background:linear-gradient(160deg,#ffe27a,#c79416);color:#1b1300}.hex.on.t2{background:linear-gradient(160deg,#ff9be8,#9d39ff)}
.hex:hover{transform:scale(1.08)}
.hx-i{font-size:22px;font-weight:900;line-height:1}.hx-n{font-size:11px;font-weight:700;margin-top:2px}
.hexes.sm .hex{width:52px;height:58px}.hexes.sm .hx-i{font-size:17px}
.hud{margin-top:auto;background:var(--pan);border:1px solid var(--ln);border-radius:12px;padding:12px 14px;transition:.2s}
.hud.op{margin-top:0}
.hud-tag{font-size:11px;color:var(--mut);margin-bottom:6px}
.hud-row{display:flex;gap:10px;align-items:center}
.hud-av{width:38px;height:38px;border-radius:8px;background:#222a3b;display:flex;align-items:center;justify-content:center;font-size:18px}
.hud.op .hud-av{background:#3a1f26;color:var(--red)}
.hud-n{font-weight:700;font-size:14px;line-height:1.2}.hud-n small{display:block;color:var(--mut);font-weight:400;font-size:11px}
.hud-hp{margin-top:8px;display:flex;align-items:baseline;gap:6px}.hud-hp span{font:900 13px 'Archivo Black';color:var(--mut)}.hud-hp b{font:900 30px 'Archivo Black'}.hud-hp em{color:var(--mut);font-style:normal}
.hud.low .hud-hp b{color:var(--red);animation:lowp 1s infinite}
@keyframes lowp{50%{opacity:.55}}
.hpbar{position:relative;height:12px;border-radius:6px;background:#2a1418;overflow:hidden;margin-top:4px}
.hpbar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px}
.hpbar .trail{background:#fff;transition:width .9s .45s ease}
.hpbar .fill{background:linear-gradient(90deg,#23c46b,#7dffb0);transition:width .35s}
.hud.op .hpbar .fill{background:linear-gradient(90deg,#ff4d5e,#ff9aa4)}
.hud.low .hpbar .fill{background:linear-gradient(90deg,#ff3045,#ff8a3d)}
.hpbar .shb{background:repeating-linear-gradient(45deg,#7fb6ff,#7fb6ff 4px,#5b8cff 4px,#5b8cff 8px);opacity:.85;height:5px;top:auto;transition:width .3s}
.hud-st{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.st{font-size:11px;padding:2px 7px;border-radius:5px;background:#222a3b}.st.sh{background:#1f3570;color:#bcd3ff}.st.dot{background:#5a1c25;color:#ffb3bb}.st.storm{background:#3d2a5c;color:#d9c1ff}.st.imm{background:#6b5410;color:#ffe9a6}.st.cnt{background:#14482f;color:#a6ffcf}.st.none{color:#5e6678;background:none;padding:2px 0}
.hud.hit{border-color:var(--red);box-shadow:0 0 0 2px #ff4d5e88,0 0 30px #ff4d5e55}
.opp-row{height:104px;display:flex;align-items:center;gap:14px;position:relative}
.opp-tag{position:absolute;right:0;top:-2px;font-size:11px;color:#5e6678}
.opp-hand{display:flex;gap:8px;flex:1;justify-content:center}
.pback{width:62px;height:86px;border-radius:7px;background:repeating-linear-gradient(45deg,#1b2541,#1b2541 6px,#202c4e 6px,#202c4e 12px);border:2px solid #34416a;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px;color:#7c8bb5;animation:dealOp .45s var(--d) both cubic-bezier(.2,1,.4,1);transition:transform .3s}
.pback i{font-style:normal;font-size:20px}.pback.ghost{opacity:.15}.pback.up{transform:translateY(8px);opacity:.35}
@keyframes dealOp{from{opacity:0;transform:translateY(-60px) rotate(-20deg)}}
.pile{width:70px;height:96px;border-radius:8px;background:repeating-linear-gradient(-45deg,#1b2541,#1b2541 5px,#222f55 5px,#222f55 10px);border:2px solid #34416a;box-shadow:3px 3px 0 #11172a,6px 6px 0 #0d1222;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;color:#9aa8d0;flex-shrink:0}
.pile b{font:900 22px 'Archivo Black';color:#fff}.pile.sm{width:58px;height:80px}
.evbox{height:252px;border-radius:14px;background:rgba(16,20,28,.86);border:1px solid var(--ln);position:relative;overflow:hidden;box-shadow:inset 0 0 60px rgba(61,91,255,.08)}
.evbox::before{content:'이벤트 상자';position:absolute;left:14px;top:-1px;font-size:10px;color:#4c5468;letter-spacing:.1em}
.ev-in{position:absolute;inset:0;padding:22px 26px;display:flex;flex-direction:column;gap:8px;animation:evIn .4s cubic-bezier(.2,1.1,.4,1)}
@keyframes evIn{from{opacity:0;transform:translateY(12px)}}
.ev-k{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700}
.ev-k::first-letter{color:var(--gold)}
.ev-r{background:#fff;color:#111;padding:3px 9px;border-radius:5px;font-size:12px}
.ev-rt{margin-left:auto;color:var(--mut);font-weight:400}
.evbox h2{margin:2px 0;font-size:30px;font-weight:900}.evbox h2 small{font-size:15px;color:var(--mut);font-weight:500;margin-left:8px}
.evbox p{margin:0;color:#b9c0cf;font-size:14px}.evbox p b.r,.r{color:var(--red)}
.ev-row{display:flex;align-items:center;gap:10px;margin-top:auto;flex-wrap:wrap}.ev-row .eb.pri{margin-left:auto}
.ev-m{font-size:12px;color:var(--mut)}
.ev-2{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
.ev-f .fml{font:900 34px 'Archivo Black','Noto Sans KR';color:#fff}.ev-f p{font-size:12px;margin-top:4px}
.bt-line{border-top:1px solid var(--ln);padding-top:10px}
.uchip{font-size:12px;background:#1f2d63;color:#c7d3ff;padding:5px 10px;border-radius:6px}.uchip.ghost{background:none;color:var(--mut);padding:5px 0}
.ev-hp{display:flex;gap:12px}.ev-hp div{flex:1;background:#0b0f17;border-radius:10px;padding:10px 14px}.ev-hp span{font-size:12px;color:var(--mut)}.ev-hp b{display:block;font:900 30px 'Archivo Black'}
h2.wait i{font-style:normal;animation:dots 1.2s infinite}h2.wait i:nth-child(2){animation-delay:.2s}h2.wait i:nth-child(3){animation-delay:.4s}
@keyframes dots{50%{opacity:.1}}
.evbox.clash{animation:clash .4s}
@keyframes clash{30%{transform:scale(1.03);box-shadow:0 0 0 3px #fff,0 0 60px #fff6}}
.sd{position:absolute;inset:0;display:grid;grid-template-columns:1fr 70px 1fr;align-items:center;padding:18px 22px}
.sd-side{display:flex;flex-direction:column;gap:8px;align-items:center}
.sd-n{font-size:12px;color:var(--mut)}
.sd-cards{display:flex;gap:6px}
.sd-c{position:relative;width:54px;height:76px;perspective:500px}
.sd-c .pc,.sd-b{position:absolute;inset:0;width:100%;height:100%;backface-visibility:hidden;transition:transform .45s}
.pc.sm .pc-c{font-size:22px}.pc.sm .pc-tl,.pc.sm .pc-br{font-size:11px}
.sd-c .pc{transform:rotateY(180deg)}.sd-b{border-radius:7px;background:repeating-linear-gradient(45deg,#1b2541,#1b2541 6px,#202c4e 6px,#202c4e 12px);border:2px solid #34416a;display:flex;align-items:center;justify-content:center;color:#7c8bb5}
.sd-c.open .pc{transform:none}.sd-c.open .sd-b{transform:rotateY(-180deg)}
.pc.conf{outline:3px solid #b05cff;animation:conf .6s 3}
@keyframes conf{50%{transform:rotate(8deg)}}
.sd-f{text-align:center;opacity:0;transform:translateY(8px);transition:.4s}.sd-f.show{opacity:1;transform:none}
.sd-h{display:block;font-weight:900;font-size:16px}.sd-f .fml{font-size:13px;color:var(--mut)}
.sd-s{font:900 46px 'Archivo Black';line-height:1}
.sd-side.me .sd-s{color:#7da0ff}.sd-side.op .sd-s{color:#ff8a96}
.sd-vs{font:900 30px 'Archivo Black';color:var(--gold);text-align:center;text-shadow:0 0 20px #ffd84a88}
.tools{height:30px;display:flex;align-items:center;gap:18px;font-size:13px;color:var(--mut);margin-top:6px}
.tools b{color:#fff}.tools .chip{background:#222a3b;color:#c9cfdc;padding:3px 9px;border-radius:5px;font-size:12px}.tools .chip.on{background:#d9a41a;color:#111}
.tools-r{margin-left:auto;font-size:12px}
.my-hand{height:150px;display:flex;justify-content:center;align-items:center;gap:10px}
.hand-empty{color:#4c5468;font-size:14px;border:1px dashed #262c3a;border-radius:12px;padding:40px 60px}
.vE .my-hand .pc{width:96px;height:134px;border-radius:10px;transition:transform .18s,box-shadow .18s,opacity .25s,background .2s;border:2px solid #d7d7d7}
.vE .my-hand .pc .pc-c{font-size:44px}.vE .my-hand .pc .pc-tl,.vE .my-hand .pc .pc-br{font-size:17px}
.vE .my-hand .pc::after{content:attr(data-tag);position:absolute;left:0;right:0;bottom:-20px;text-align:center;font-size:11px;color:var(--mut);font-weight:500}
.vE .my-hand .pc.can{cursor:pointer}
.vE .my-hand .pc.can:hover{transform:translateY(-10px);border-color:var(--gold);box-shadow:0 0 0 2px var(--gold),0 12px 24px rgba(0,0,0,.5)}
.vE .my-hand .pc.sel{background:#b9ffcf;border-color:#2fd66f;transform:translateY(-16px);box-shadow:0 0 22px #3ddc8488}
.vE .my-hand .pc.sel::after{color:var(--grn)}
.vE .my-hand .pc.rr{background:#fff2b0;border-color:#e6b310;transform:translateY(-6px) rotate(-2deg)}
.vE .my-hand .pc.rr::after{color:var(--gold)}
.vE .my-hand .pc.dis{opacity:.35}.vE .my-hand .pc.dim{opacity:.3;transform:scale(.94)}
.vE .my-hand .pc.fate{animation:fateG 1s infinite}
@keyframes fateG{50%{box-shadow:0 0 0 3px #b05cff,0 0 24px #b05cff}}
.pc.deal{animation:deal .5s var(--d) both cubic-bezier(.2,1.1,.4,1)}
@keyframes deal{from{opacity:0;transform:translate(300px,180px) rotate(30deg) scale(.6)}}
.pc.flipout{animation:flipout .26s forwards}.pc.flipin{animation:flipin .35s}
@keyframes flipout{to{transform:rotateY(90deg) translateY(-10px)}}
@keyframes flipin{from{transform:rotateY(-90deg)}}
.pc.fated{box-shadow:0 0 0 3px #b05cff,0 0 30px #b05cff}
.fan-zone{position:absolute;left:0;right:0;bottom:0;height:226px}
.fan-lbl{position:absolute;left:4px;top:4px;font-size:12px;color:var(--mut)}.fan-lbl b{color:#fff;margin-left:6px}
.fan-zone .pile{position:absolute;right:6px;bottom:30px}
.fan{position:absolute;left:50%;top:30px;width:0;height:0}
.vE .ec{position:absolute;width:126px;height:176px;left:-63px;top:0;background:#fbfbfd;color:#16181d;border-radius:10px;border:2px solid #d6d9e0;padding:9px 10px;display:flex;flex-direction:column;gap:2px;box-shadow:0 8px 18px rgba(0,0,0,.45);transform:translate(var(--x),var(--y)) rotate(var(--r));transform-origin:50% 120%;transition:transform .22s cubic-bezier(.2,1.2,.4,1),box-shadow .2s,border-color .2s,filter .3s,opacity .3s;cursor:pointer;user-select:none}
.ec-h{display:flex;justify-content:space-between;align-items:center}
.ec-code{font-weight:900;font-size:18px}.ec.red .ec-code{color:#d8252a}
.ec-g{font-size:9px;color:#888}
.ec.g-R .ec-g{color:#2f74e0}.ec.g-E .ec-g{color:#9b3fe0}.ec.g-L .ec-g{color:#d08a00;font-weight:700}
.ec-n{font-size:19px;font-weight:900;line-height:1.15}
.ec-t{font-size:10px;color:#777}
.ec-ic{color:#30343c;margin:2px 0}
.ec-d{font-size:10.5px;line-height:1.35;color:#333;flex:1;overflow:hidden}
.ec-f{font-size:10px;font-weight:700;color:#555}
.vE .ec.g-L{border-color:#e6b84a}.vE .ec.g-E{border-color:#c49be8}
.vE .fan .ec:hover{z-index:50!important}
.bt.hl-size .fan .ec:hover,.bt.hl-both .fan .ec:hover{transform:translate(var(--x),-58px) rotate(0) scale(1.28)}
.bt.hl-border .fan .ec:hover,.bt.hl-both .fan .ec:hover{border-color:#f5e33a;box-shadow:0 0 0 3px #f5e33a,0 0 30px #f5e33a99}
.bt.hl-border .fan .ec:hover{transform:translate(var(--x),calc(var(--y) - 10px)) rotate(var(--r))}
.vE .ec.st-ready{border-color:#45e08a;box-shadow:0 0 0 2px #45e08a66,0 8px 18px rgba(0,0,0,.45)}
.ec-tag{position:absolute;left:50%;top:-11px;transform:translateX(-50%);font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap}
.ec-tag.rd{background:#45e08a;color:#062b15;animation:rdP 1.4s infinite}.ec-tag.un{background:#3d5bff;color:#fff}.ec-tag.ps{background:#2a3142;color:#c9cfdc}
@keyframes rdP{50%{box-shadow:0 0 12px #45e08a}}
.cdov{position:absolute;inset:0;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none}
.cdov b{font:900 18px 'Noto Sans KR';color:#fff;background:#111;padding:2px 10px;border-radius:6px}
.cdov .lk,.cdov .hg{display:none;color:#111}
.bt.cd-lock .st-cool .cdov{justify-content:flex-end;align-items:flex-end;padding:8px}.bt.cd-lock .st-cool .cdov .lk{display:block;background:#111;color:#fff;border-radius:8px;padding:6px}
.bt.cd-lock .st-cool .cdov{flex-direction:column}
.bt.cd-hourglass .st-cool{filter:grayscale(1);opacity:.62}.bt.cd-hourglass .st-cool .cdov .hg{display:block;animation:hg 2s infinite}
@keyframes hg{0%,40%{transform:rotate(0)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(180deg)}}
.bt.cd-tint .st-cool{background:#ffd1d6;border-color:#ff8a96}.bt.cd-tint .st-cool .ec-n::after{content:'(쿨타임)';font-size:12px;margin-left:2px;color:#c2283a}.bt.cd-tint .st-cool .cdov b{background:#c2283a}
.cdov.seal{background:rgba(70,40,120,.55)}.cdov.seal b{background:#5d2bb5}
.vE .ec.new{animation:newC 1s}
@keyframes newC{0%,60%{box-shadow:0 0 0 4px var(--gold),0 0 40px var(--gold)}}
.fan.pflash .ec{opacity:.3;filter:grayscale(.7)}.fan.pflash .ec.pon{opacity:1;filter:none;transform:translate(var(--x),-24px) rotate(0) scale(1.08);z-index:60!important}
.fx-badge{position:absolute;left:0;right:0;top:-34px;text-align:center;pointer-events:none}
.fx-badge em{font:900 18px 'Noto Sans KR';color:#e9d64a;text-shadow:0 2px 0 #4a3d00,0 0 12px #ffd84a;font-style:normal;animation:fxE .4s cubic-bezier(.2,1.6,.4,1)}
.fx-badge b{position:absolute;right:-22px;top:4px;font:900 58px/1 'Archivo Black';background:linear-gradient(180deg,#e8f6ff,#6aa6d6 60%,#2b5f8c);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:2px #0b1a2a;animation:fxB .45s .1s both cubic-bezier(.2,1.8,.4,1)}
.fx-badge.sm{top:-26px}.fx-badge.sm em{font-size:13px}.fx-badge.sm b{font-size:36px;right:-12px}
@keyframes fxE{from{transform:scale(.3);opacity:0}}@keyframes fxB{from{transform:scale(2.4) rotate(-20deg);opacity:0}}
.ec.flying{transition:none;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 3px var(--gold,#ffd84a)}
.fan.op{position:relative;left:auto;top:auto;width:100%;height:96px;display:flex;justify-content:center}
.fan.op .ec{width:70px;height:96px;left:calc(50% - 35px);padding:5px 6px;transform:translate(var(--x),var(--y)) rotate(var(--r)) ;transform-origin:50% 140%}
.fan.op .ec .ec-n{font-size:12px}.fan.op .ec .ec-code{font-size:12px}.fan.op .ec .ec-t,.fan.op .ec .ec-d,.fan.op .ec .ec-f,.fan.op .ec .ec-g{display:none}.fan.op .ec .ec-ic svg{width:18px;height:18px}
.fan.op .ec:hover{transform:translate(var(--x),-10px) scale(1.15);z-index:30!important}
.fan.op .ec.back{background:repeating-linear-gradient(45deg,#1b2541,#1b2541 5px,#202c4e 5px,#202c4e 10px);border-color:#34416a;color:#7c8bb5;align-items:center;justify-content:center;font-size:9px;cursor:default}
.fan.op .ec.back i{font-style:normal;font-size:18px}.fan.op .ec.back em{font-style:normal;font-size:8px}
.fan.op .ec.reveal{animation:revealC .6s}
@keyframes revealC{0%{transform:translate(var(--x),var(--y)) rotateY(90deg)}100%{transform:translate(var(--x),var(--y)) rotate(var(--r))}}
.fan.op .cdov b{font-size:11px;padding:1px 5px}.fan.op .cdov .lk svg{width:14px;height:14px}
.fan.op .ec-tag{display:none}
.log{flex:1;min-height:0;overflow:auto;background:var(--pan);border:1px solid var(--ln);border-radius:10px;padding:8px 10px;font-size:12px;color:#b9c0cf;display:flex;flex-direction:column;gap:4px}
.log div{animation:evIn .3s;line-height:1.4}.log i{font-style:normal;color:#5e6678;margin-right:6px;font-size:10px}.log b{color:#fff}
.bt.flash::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 40%,rgba(255,40,60,.45));animation:flash .5s forwards}
.bt.flashop::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 80% 20%,rgba(255,255,255,.35),transparent 60%);animation:flash .5s forwards}
@keyframes flash{from{opacity:1}to{opacity:0}}
.hitbig{animation:hitbig .5s}
@keyframes hitbig{10%{transform:translate(-10px,6px)}25%{transform:translate(12px,-8px)}40%{transform:translate(-8px,-4px)}60%{transform:translate(6px,6px)}80%{transform:translate(-3px,2px)}}
.pop{position:absolute;transform:translate(-50%,-50%);font:900 22px 'Noto Sans KR';color:#fff;text-shadow:0 2px 0 #000,0 0 14px #000;pointer-events:none;white-space:nowrap;animation:pop 1.5s forwards;z-index:90}
.pop.dmg{font:900 44px 'Archivo Black';color:#ff4d5e;-webkit-text-stroke:2px #2a0006}
.pop.dmg.big{font-size:84px;animation:popBig 1.5s forwards}
.pop.dmg.dot{font-size:30px;color:#ff9aa4}
.pop.heal{color:#5dffa1}.pop.shield{color:#9cc2ff}.pop.trait{color:#ffd84a;font-size:24px}.pop.opfx{color:#d9b8ff}
.pop.crit{color:#ffd84a;font:900 30px 'Archivo Black';-webkit-text-stroke:1px #4a3700}.pop.tie{font-size:30px;color:#cfd5e2}
@keyframes pop{0%{opacity:0;transform:translate(-50%,-20%) scale(.5)}15%{opacity:1;transform:translate(-50%,-60%) scale(1.15)}30%{transform:translate(-50%,-70%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-150%)}}
@keyframes popBig{0%{opacity:0;transform:translate(-50%,-50%) scale(3)}12%{opacity:1;transform:translate(-50%,-50%) scale(.9)}20%{transform:translate(-50%,-50%) scale(1.05)}75%{opacity:1;transform:translate(-50%,-70%)}100%{opacity:0;transform:translate(-50%,-120%)}}
.tip{position:absolute;transform:translate(-50%,calc(-100% - 10px));background:#0d111a;border:1px solid #3a4258;color:#d7dbe6;padding:10px 12px;border-radius:9px;font-size:12px;line-height:1.55;pointer-events:none;opacity:0;transition:opacity .15s;z-index:95;min-width:180px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.tip.show{opacity:1}.tip b{color:#fff;font-size:13px}.tip span.on{color:#ffd84a;font-weight:700}
/* modals (E) */
.m-e .mbox{background:#f4f5f7;color:#16181d;border-radius:4px;border:2px solid #16181d;box-shadow:0 30px 80px rgba(0,0,0,.6);font-family:'Noto Sans KR'}
.m-e .eb{border:2px solid #16181d;background:#fff;color:#16181d;border-radius:4px;padding:10px 18px;font-weight:700;font-size:14px;transition:.15s}
.m-e .eb:hover:not([disabled]){transform:translateY(-2px);box-shadow:0 4px 0 #16181d}
.m-e .eb.pri{background:#16181d;color:#fff;border-color:#16181d}
.m-e .eb.ghost{border-color:transparent;background:none}
.m-e .ec{position:relative;width:150px;height:200px;left:auto;transform:none;background:#fff;color:#16181d;border-radius:8px;border:1.5px solid #c9ccd3;padding:12px;display:flex;flex-direction:column;gap:3px;transition:.2s;box-shadow:0 4px 10px rgba(0,0,0,.08)}
.m-e .ec .ec-n{font-size:21px}.m-e .ec .ec-d{font-size:12px}
.mut{color:#6a6f7a;font-size:12.5px;line-height:1.6}
.draft{width:900px;padding:30px 34px}
.dm-h{display:flex;justify-content:space-between;align-items:flex-start}.dm-h h2{margin:0;font-size:26px}.dm-h p{margin:4px 0 0;color:#6a6f7a}
.dm-b{background:#16181d;color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:3px;white-space:nowrap}
.dm-body{display:grid;grid-template-columns:auto 1fr;gap:26px;margin-top:22px}
.dm-cards{display:flex;gap:16px}
.dm-c{display:flex;flex-direction:column;gap:8px;cursor:pointer}
.dm-tag{align-self:flex-start;font-size:12px;font-weight:700;padding:3px 9px;background:#e1e3e8;border-radius:3px}
.dm-c:hover .ec{transform:translateY(-6px);box-shadow:0 12px 24px rgba(0,0,0,.15)}
.dm-c.on .dm-tag{background:#16181d;color:#fff}.dm-c.on .ec{border:3px solid #16181d;transform:translateY(-8px);box-shadow:0 14px 28px rgba(0,0,0,.2)}
.dm-prev{background:#e9eaee;border:1px solid #d3d5db;padding:18px 20px;border-radius:3px}
.dm-prev h3,.rp-prev h3{margin:0 0 12px;font-size:17px}
.pv-r{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #d3d5db;font-size:14px}.pv-r em{font-style:normal}
.pv-diff{margin:12px 0;display:flex;flex-direction:column;gap:8px}
.dr b{display:block;font-size:20px}.dr-tag{display:inline-block;margin-top:4px;font-size:12px;font-weight:700;padding:3px 8px;border-radius:3px;background:#d3d5db}
.dr-tag.up{background:#16181d;color:#fff}.dr-tag.down{background:#e5322d;color:#fff}.dr-none{color:#6a6f7a;font-size:13px}
.pv-n{font-size:12px;color:#6a6f7a;margin:0}
.dm-note{margin-top:22px;background:#e1e3e8;padding:14px 16px;font-size:13px}
.dm-f{display:flex;justify-content:space-between;align-items:center;margin-top:18px;font-size:12.5px;color:#6a6f7a;gap:12px}.dm-f>div{display:flex;gap:10px}
.rep{width:900px;padding:26px 30px}
.rp-h{display:flex;gap:14px;align-items:center;background:#e1e3e8;padding:14px 16px;font-size:15px}.rp-h small{margin-left:auto;color:#6a6f7a;font-size:11px;max-width:150px}
.rp-t{display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px}.rp-t h3{margin:0;font-size:18px}
.rp-chip{font-size:12px;font-weight:700;background:#e1e3e8;padding:3px 9px}
.rp-cards{display:flex;gap:10px}.rp-c{cursor:pointer}.rp-c .ec{width:156px;height:180px}
.rp-c:hover .ec{transform:translateY(-4px)}.rp-c.on .ec{border:3px solid #e5322d;transform:translateY(-6px) rotate(-2deg)}
.rp-b{display:grid;grid-template-columns:auto 1fr;gap:24px;margin-top:18px;border-top:1px solid #d3d5db;padding-top:18px}
.rp-new .ec{border:3px solid #16181d;height:200px}
.ec.discard{animation:disc .38s forwards}@keyframes disc{to{transform:translateY(60px) rotate(18deg);opacity:0}}
.cdet{width:640px;padding:26px 28px;position:relative}.cdet h3{margin:0 0 16px;font-size:20px}
.cd-b{display:grid;grid-template-columns:auto 1fr;gap:20px}
.cd-g{font-size:12px;font-weight:700;background:#e1e3e8;padding:4px 9px}.cd-d{font-size:16px;font-weight:700;margin:12px 0 8px}
.cd-s{border-top:1px solid #d3d5db;margin-top:18px;padding-top:14px}.cd-s h4{margin:0 0 10px}
.cd-row{display:flex;justify-content:space-between;align-items:center;gap:16px}.cd-row b{display:block}.cd-row span{font-size:12px;color:#6a6f7a}
.cd-x{position:absolute;right:14px;top:14px}
.fate{width:720px;padding:24px}.fate h3{margin:0 0 14px}
.fate-g{display:grid;grid-template-columns:repeat(13,1fr);gap:5px}
.fg{border:1.5px solid #c9ccd3;background:#fff;border-radius:5px;padding:9px 0;font-weight:900;font-size:13px}.fg.red{color:#d8252a}.fg:hover:not([disabled]){border-color:#b05cff;background:#f3e8ff}.fg[disabled]{opacity:.25}
.fc{width:760px;background:#0d1018;color:#fff;border:2px solid #3d5bff;margin:-2px;font-family:'Noto Sans KR'}
.m-fc .mbox{background:#0d1018;border:0}
.fc-h{background:#3d5bff;padding:12px 20px;font:900 20px 'Archivo Black';letter-spacing:.06em}.fc-h small{font:500 12px 'Noto Sans KR';margin-left:10px;opacity:.8;letter-spacing:0}
.fc-b{display:grid;grid-template-columns:1fr 150px 1fr;padding:18px 20px;gap:10px;align-items:center}
.fc-col{background:#151a26;border-radius:6px;padding:12px 16px}.fc-col.me{border-left:4px solid #3d5bff}.fc-col.op{border-left:4px solid #ff4d5e}
.fc-n{font-weight:900;font-size:16px;margin-bottom:6px}
.fc-r{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #222838;font-size:13px;color:#a8b0c2}.fc-r b{color:#fff}.fc-r b.big{font:900 28px 'Archivo Black'}
.fc-r.hl{border:0;color:#ffd84a}.fc-r.hl b{color:#ffd84a;font-size:20px}
.fc-mid{text-align:center}.fc-mid b{display:block;font:900 54px 'Archivo Black';color:#ffd84a}.fc-mid span{font-size:12px;color:#a8b0c2}.fc-mid em{display:block;font-style:normal;margin-top:6px;font-weight:700}
.fc-f{display:flex;justify-content:space-between;align-items:center;padding:0 20px 18px;font-size:12px;color:#a8b0c2}
.fc .eb.pri{background:#3d5bff;border:0;color:#fff}
.bmenu{width:520px;padding:26px 28px;display:flex;flex-direction:column;gap:8px}.bmenu h3{margin:0 0 6px;font-size:20px}
.bmenu label{font-size:13px;font-weight:700;margin-top:8px}.bmenu label small{font-weight:400;color:#6a6f7a}
.seg{display:flex;border:2px solid #16181d;border-radius:4px;overflow:hidden}.seg button{flex:1;border:0;background:#fff;padding:9px;font-weight:700;font-size:13px}.seg button+button{border-left:2px solid #16181d}.seg button.on{background:#16181d;color:#fff}
.bm-f{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
.tpanel{width:560px;padding:24px 26px;display:flex;flex-direction:column;gap:10px}.tpanel h3{margin:0}
.tp-r{display:grid;grid-template-columns:60px 1fr;gap:12px;align-items:center;padding:6px 0;border-bottom:1px solid #d3d5db;opacity:.65}.tp-r.on{opacity:1}
.tp-r .hex{width:52px;height:58px;color:#fff;background:#5b6377}.tp-r .hex.on{background:#3d5bff}
.tp-tiers{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}.tp-tiers span{font-size:11.5px;background:#e1e3e8;padding:2px 7px;border-radius:3px}.tp-tiers span.on{background:#16181d;color:#fff}
.tp-j{background:#fff3c4;padding:8px 12px;font-size:13px;font-weight:700}
.endov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(0,0,0,.82);z-index:85;animation:tFadeIn .5s;overflow:hidden}
.endov .rays{position:absolute;width:1800px;height:1800px;left:50%;top:40%;margin:-900px;background:repeating-conic-gradient(from 0deg,rgba(61,91,255,.18) 0 8deg,transparent 8deg 20deg);animation:rays 18s linear infinite}
.endov.lose .rays{background:repeating-conic-gradient(rgba(255,77,94,.12) 0 8deg,transparent 8deg 20deg)}
@keyframes rays{to{transform:rotate(360deg)}}
.end-t{position:relative;font:900 150px/1 'Archivo Black';letter-spacing:.04em}
.end-t span{display:inline-block;animation:endL .6s calc(var(--i)*.07s) both cubic-bezier(.2,1.6,.4,1)}
.endov.win .end-t{color:#fff;text-shadow:0 0 40px #3d5bff,0 8px 0 #3d5bff}.endov.lose .end-t{color:#ff4d5e;text-shadow:0 8px 0 #4a0010}
@keyframes endL{from{opacity:0;transform:translateY(-120px) scale(2) rotate(-10deg)}}
.end-s{position:relative;font-size:20px;font-weight:700;animation:evIn .5s .7s both}.end-hp{position:relative;color:#a8b0c2;animation:evIn .5s .85s both}
.endov .eb{position:relative;animation:evIn .5s 1s both;border:0;background:#3d5bff;color:#fff;border-radius:8px;padding:14px 30px;font-size:17px;font-weight:700}
`);
