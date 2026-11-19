'use strict';
/* =========================================================
   전장 – 01 드래프트 → 02 전투 패 구성 → 03 쇼다운 준비 → 04 피해 정산
   (특성 기능 제외 버전)
   ========================================================= */
const HANDS = { none: ['—', 0], high: ['하이 카드', 5], pair: ['원 페어', 10], two: ['투 페어', 15], trips: ['트리플', 20], straight: ['스트레이트', 25], flush: ['플러시', 30], full: ['풀 하우스', 35], quads: ['포카드', 45], sf: ['스트레이트 플러시', 55], royal: ['로열 스트레이트 플러시', 70] };
const PV = { A: 14, J: 11, Q: 12, K: 13 };
const pv = r => PV[r] || +r;
function evalHand(cards) {
  if (!cards.length) return { key: 'none', name: '—', base: 0, tb: 0, rank: [0] };
  const vals = cards.map(c => pv(c.r)).sort((a, b) => b - a);
  const cnt = {}; vals.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
  const groups = Object.values(cnt).sort((a, b) => b - a);
  const five = cards.length === 5, flush = five && cards.every(c => c.s === cards[0].s);
  let straight = false, high = 0;
  if (five && groups[0] === 1) { if (vals[0] - vals[4] === 4) { straight = true; high = vals[0]; } else if (vals.join() === '14,5,4,3,2') { straight = true; high = 5; } }
  let key = 'high';
  if (straight && flush) key = high === 14 ? 'royal' : 'sf';
  else if (groups[0] === 4) key = 'quads';
  else if (groups[0] === 3 && groups[1] === 2) key = 'full';
  else if (flush) key = 'flush';
  else if (straight) key = 'straight';
  else if (groups[0] === 3) key = 'trips';
  else if (groups[0] === 2 && groups[1] === 2) key = 'two';
  else if (groups[0] === 2) key = 'pair';
  // 동점 비교용 순위 : [족보 순위, 묶음 많은 숫자 → 큰 숫자 순] (스트레이트는 최고 숫자)
  const order = Object.keys(cnt).map(Number).sort((a, b) => cnt[b] - cnt[a] || b - a);
  const rank = [HAND_ORDER.indexOf(key), ...(straight ? [high] : order)];
  return { key, name: HANDS[key][0], base: HANDS[key][1], tb: vals.reduce((a, v) => a + v, 0), rank };
}
const KICKER_DMG = 3;   // 같은 점수에서 숫자·키커로 이겼을 때의 고정 피해
const HAND_ORDER = ['none', 'high', 'pair', 'two', 'trips', 'straight', 'flush', 'full', 'quads', 'sf', 'royal'];
// 두 패 비교 : 양수면 a가 강함, 0이면 완전 동일
function cmpHand(a, b) { for (let i = 0; i < Math.max(a.rank.length, b.rank.length); i++) { const d = (a.rank[i] || 0) - (b.rank[i] || 0); if (d) return d; } return 0; }
const PV_NAME = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J' }, pvName = v => PV_NAME[v] || String(v);
function best5(hand) {
  let best = null, bi = null;
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const idx = [0, 1, 2, 3, 4, 5, 6].filter(i => i !== a && i !== b), h = evalHand(idx.map(i => hand[i]));
    if (!best || cmpHand(h, best) > 0) { best = h; bi = idx; }
  }
  return bi;
}

/* ---------- 족보 가이드 (포커 초보자용 예시) ---------- */
// ex : 예시 5장 (랭크+문양), hit : 족보를 이루는 앞쪽 카드 수 (나머지는 키커)
const HAND_GUIDE = {
  royal: { ex: ['A◆', 'K◆', 'Q◆', 'J◆', '10◆'], hit: 5, how: '같은 문양의 10·J·Q·K·A', tip: '가장 드문 족보입니다. 같은 문양 높은 카드 4장이 모이면 노려 볼 만합니다.' },
  sf: { ex: ['9♠', '8♠', '7♠', '6♠', '5♠'], hit: 5, how: '같은 문양 + 숫자 5개 연속', tip: '플러시와 스트레이트를 동시에 만족해야 합니다.' },
  quads: { ex: ['7♠', '7♥', '7♣', '7◆', 'Q♠'], hit: 4, how: '같은 숫자 4장', tip: '트리플이 나왔다면 나머지를 리롤해 마지막 1장을 노려 보세요.' },
  full: { ex: ['10♠', '10♥', '10◆', '3♣', '3♠'], hit: 5, how: '트리플 + 원 페어', tip: '투 페어나 트리플에서 1장만 더 맞으면 완성됩니다.' },
  flush: { ex: ['K♥', '10♥', '7♥', '4♥', '2♥'], hit: 5, how: '같은 문양 5장 (숫자 상관없음)', tip: '같은 문양이 4장이면 다른 문양 카드를 리롤하세요. 드로우 가중치 카드가 도와줍니다.' },
  straight: { ex: ['9♣', '8◆', '7♠', '6♥', '5♣'], hit: 5, how: '숫자 5개 연속 (문양 상관없음)', tip: 'A는 가장 높게(10-J-Q-K-A)도, 가장 낮게(A-2-3-4-5)도 쓸 수 있습니다.' },
  trips: { ex: ['8♠', '8♥', '8◆', 'K♣', '4♠'], hit: 3, how: '같은 숫자 3장', tip: '원 페어를 남기고 나머지를 리롤하면 자주 나옵니다.' },
  two: { ex: ['J♠', 'J◆', '6♥', '6♣', 'A♠'], hit: 4, how: '같은 숫자 2장이 두 쌍', tip: '남은 1장(키커)이 높을수록 동점 승부에 유리합니다.' },
  pair: { ex: ['Q♥', 'Q♣', '9♠', '5◆', '3♥'], hit: 2, how: '같은 숫자 2장', tip: '가장 흔한 족보입니다. 높은 숫자의 페어일수록 동점일 때 이깁니다.' },
  high: { ex: ['K♠', '9♥', '7♣', '4◆', '2♠'], hit: 1, how: '아무 족보도 없을 때', tip: '가장 높은 카드 한 장으로 겨룹니다. 리롤로 페어를 노리세요.' },
};
const exCard = t => ({ r: t.slice(0, -1), s: t.slice(-1) });
const tipCards = k => HAND_GUIDE[k].ex.map((t, i) => `<i class="hx-c ${isRed(t.slice(-1)) ? 'red' : ''} ${i < HAND_GUIDE[k].hit ? 'hit' : ''}">${t}</i>`).join('');
function handTip(k) { const g = HAND_GUIDE[k]; return `<b>${HANDS[k][0]} · ${HANDS[k][1]}점</b><br>${g.how}<span class="hx">${tipCards(k)}</span>`; }
function handGuideModal() {
  const cur = S && S.me && S.me.sel.length ? evalHand(S.me.sel.map(i => S.me.hand[i])).key : null;
  modal(`<div class="hg"><div class="gd-h"><span class="pix">HAND GUIDE</span><h3>족보 가이드</h3><span class="hg-sub">7장 중 5장을 골라 아래 족보를 만드세요 · 위로 갈수록 강합니다</span></div>
    <div class="hg-list">${HAND_ORDER.slice(1).reverse().map(k => { const g = HAND_GUIDE[k]; return `<div class="hg-row ${k === cur ? 'cur' : ''}">
      <div class="hg-n"><b>${HANDS[k][0]}</b><span class="num">${HANDS[k][1]}</span></div>
      <div class="hg-cards">${g.ex.map((t, i) => pokerHTML(exCard(t), 'sm ' + (i < g.hit ? 'hit' : 'kick'))).join('')}</div>
      <div class="hg-t"><strong>${g.how}</strong><small>${g.tip}</small></div></div>`; }).join('')}</div>
    <p class="hg-foot">점수가 같으면 <b>높은 숫자</b> → <b>키커</b>(족보에 안 쓰인 카드) 순으로 비교합니다. 리롤은 매 턴 1회이며 행운·조커 카드로 늘어납니다.</p>
    <div class="gd-f"><span></span>${btn('닫기', '', C.blue, 'id="hgX"', 'pri')}</div></div>`, { cls: 'm-guide m-hg' });
  $('#hgX').onclick = () => closeModal();
}
// 전투 패 7장에서 "1장만 더 맞으면" 되는 족보를 찾아 초보자에게 힌트를 준다
function drawHint(hand) {
  const bi = best5(hand); if (!bi) return '';
  const best = evalHand(bi.map(i => hand[i])), lvl = HAND_ORDER.indexOf(best.key);
  const sc = {}; hand.forEach(c => sc[c.s] = (sc[c.s] || 0) + 1);
  const fs = Object.keys(sc).find(k => sc[k] === 4);
  if (fs && lvl < HAND_ORDER.indexOf('flush')) return `${fs} 문양이 4장 — ${fs} 1장만 더 오면 <b>플러시(${HANDS.flush[1]}점)</b>. 다른 문양 카드를 리롤해 보세요.`;
  const vs = new Set(hand.map(c => pv(c.r))); if (vs.has(14)) vs.add(1);
  if (lvl < HAND_ORDER.indexOf('straight')) for (let lo = 10; lo >= 1; lo--) {
    const miss = [0, 1, 2, 3, 4].map(d => lo + d).filter(v => !vs.has(v));
    if (miss.length === 1) return `숫자 ${pvName(miss[0] === 1 ? 14 : miss[0])} 1장만 더 오면 <b>스트레이트(${HANDS.straight[1]}점)</b>. 연속에 안 쓰이는 카드를 리롤해 보세요.`;
  }
  if (best.key === 'trips') return `트리플 완성! 같은 숫자 1장이 더 오면 <b>포카드</b>, 다른 페어가 생기면 <b>풀 하우스</b>입니다.`;
  if (best.key === 'two') return `투 페어 — 두 쌍 중 하나가 1장 더 맞으면 <b>풀 하우스(${HANDS.full[1]}점)</b>입니다.`;
  if (best.key === 'pair') return `원 페어 — 페어는 남기고 나머지를 리롤하면 <b>트리플</b>·<b>투 페어</b>를 노릴 수 있습니다.`;
  if (best.key === 'high') return `족보 없음 — 같은 숫자 2장을 모으면 <b>원 페어(${HANDS.pair[1]}점)</b>. 낮은 카드를 리롤해 보세요.`;
  return '';
}

/* ---------- 상태 ---------- */
let S = null;
function mkSide(isMe, name, deck, hp) {
  return { isMe, name, hp, maxHp: hp, shield: 0, pool: [...deck], inv: [], cd: {}, hand: [], sel: [], rr: [], rerolls: 0, dots: [], mods: [], smeltMap: {}, undyingUsed: false, storm: 0, counter: 0, immune: false, confuse: false, utilUses: 0, revealed: new Set(), stats: {}, lastUsed: null, usedOrder: 0 };
}
const other = s => s === S.me ? S.op : S.me;
const passives = s => s.storm > 0 ? [] : s.inv.map(id => EF[id]).filter(e => e.k === 'P');
const slotsOf = s => 5 + (s.inv.some(id => EF[id].fx.slots) ? 2 : 0);
const AI = () => S.mode === '연습' ? DIFFS[App.diff] : DIFFS.normal;
function stat(side, id, key, v) {
  const s = side.stats[id] || (side.stats[id] = { uses: 0, dmg: 0, shield: 0, heal: 0, rounds: {} });
  s[key] += v;
  if (key === 'uses' || key === 'dmg') { const r = s.rounds[S.round] || (s.rounds[S.round] = { uses: 0, dmg: 0 }); r[key] += v; }
}
function drawCards(side, n, exclude) {
  const w = { '♠': 1, '♥': 1, '♣': 1, '◆': 1 };
  passives(side).forEach(e => { w['♠'] += (e.fx.wS || 0) * .35; w['♥'] += (e.fx.wH || 0) * .35; w['♣'] += (e.fx.wC || 0) * .35; w['◆'] += (e.fx.wD || 0) * .35; });
  const ex = new Set(exclude.map(c => c.r + c.s)), pool = [];
  SUITS.forEach(s => RANKS.forEach(r => { if (!ex.has(r + s)) pool.push({ r, s, w: w[s] }); }));
  const out = [];
  for (let k = 0; k < n; k++) {
    const tot = pool.reduce((a, c) => a + c.w, 0); let x = Math.random() * tot, i = 0;
    for (; i < pool.length - 1; i++) { x -= pool[i].w; if (x <= 0) break; }
    const c = pool.splice(i, 1)[0]; out.push({ r: c.r, s: c.s });
  }
  return out;
}
function calc(side, oth) {
  const h = evalHand(side.sel.map(i => side.hand[i]));
  const parts = []; let bonus = 0, mult = 1, crit = 0;
  side.mods.forEach(m => {
    if (m.fx.bonus) { bonus += m.fx.bonus; parts.push({ src: m.src, label: m.label, t: 'b', v: m.fx.bonus }); }
    if (m.fx.bpct && h.base) { const v = Math.max(3, Math.round(h.base * m.fx.bpct / 100)); bonus += v; parts.push({ src: m.src, label: m.label, t: 'b', v }); }
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
    if (e.fx.joker) v = h.base >= HANDS.pair[1] ? Math.round(h.base * e.fx.joker / 100) : 0;
    if (v > 0) { bonus += v; parts.push({ src: e.id, label: e.name, t: 'b', v, pas: true }); }
  });
  return { h, base: h.base, bonus, mult, crit, parts, score: Math.round((h.base + bonus) * mult) };
}
const fm = m => Math.round(m * 100) / 100;
function formula(c) {
  if (!c.h.base) return '0';
  const inner = c.bonus ? `(${c.base} + ${c.bonus})` : `${c.base}`;
  return c.mult !== 1 ? `${inner} × ${fm(c.mult)} = ${c.score}` : (c.bonus ? `${c.base} + ${c.bonus} = ${c.score}` : `${c.score}`);
}

/* ---------- 화면 ---------- */
Screens.battle = {
  full: true, title: '전장',
  html: () => `<div class="bt hl-${App.battleOpt.hl} cd-${App.battleOpt.cd}" id="bt">
  <div class="b-l">
    <div class="b-top"><button class="b-menu" title="메뉴 (Esc)">☰</button><div class="b-round pix">ROUND <b class="num" id="bRound">1</b><small id="bLimit"></small></div></div>
    <ol class="b-steps" id="bSteps">${['드래프트', '전투 패 구성', '쇼다운 준비', '피해 정산'].map((t, i) => `<li data-p="${i + 1}"><b class="pix">0${i + 1}</b>${t}</li>`).join('')}</ol>
    <div class="b-sec hg-sec">족보 점수표 <button class="hg-btn" id="hgBtn" title="족보 가이드 (H)">? 예시 보기</button></div>
    <div class="htable" id="htable">${Object.entries(HANDS).filter(([k]) => k !== 'none').reverse().map(([k, [n, b]]) => `<div data-k="${k}" data-tip="${handTip(k).replace(/"/g, '&quot;')}"><span>${n}</span><b class="num">${b}</b></div>`).join('')}</div>
    <div class="hud me" id="hudMe"></div>
  </div>
  <div class="b-c">
    <div class="opp-row"><div class="pile sm"><span>상대 덱</span></div><div class="opp-hand" id="handOp"></div><div class="opp-tag">상대 전투 패 · 비공개</div></div>
    <div class="evbox" id="ev"></div>
    <div class="tools"><span id="tSel"></span><span id="tHand"></span><span id="tRr" class="tchip"></span><span id="tTimer" class="tchip timer" hidden></span><span class="tools-r" id="tHint"></span></div>
    <div class="my-hand" id="handMe"></div>
    <div class="fan-zone"><div class="fan-lbl">효과 카드 (장착) <b class="num" id="invN"></b></div><div class="fan" id="fanMe"></div><div class="pile" id="pileMe"><span>효과 덱</span><b class="num" id="poolN"></b></div></div>
  </div>
  <div class="b-r">
    <div class="hud op" id="hudOp"></div>
    <div class="b-sec">상대 효과 카드 <small>액티브 비공개 · 패시브 공개</small></div>
    <div class="fan op" id="fanOp"></div>
    <div class="b-sec">전투 로그</div>
    <div class="log" id="log"></div>
  </div></div>`,
  bind(el, opts) {
    const rules = { ...DEFAULT_RULES, ...(opts.mode === '친구' && opts.rules ? opts.rules : {}) }, hp = rules.startHP;
    const oppName = opts.opp || (opts.mode === '연습' ? `AI · ${DIFFS[App.diff].ko}` : pick(OPP_NAMES));
    S = { alive: Symbol(), rules, round: 0, phase: 0, mode: opts.mode || '연습', rrMode: false, fateMode: false, ended: false, busy: false, skip: false, seenCut: new Set(), tLeft: 0, tInt: null,
      me: mkSide(true, App.player.name, App.myDeck.length ? App.myDeck : DEFAULT_DECK, hp), op: mkSide(false, oppName, (opts.mode || '연습') === '연습' ? styledDeck(App.diff) : randomDeck(), hp) };
    const start = ['♠A', '♠K', '♥7'].filter(id => S.me.pool.includes(id));
    (start.length ? start : S.me.pool.slice(0, 3)).forEach(id => { S.me.inv.push(id); S.me.pool = S.me.pool.filter(x => x !== id); });
    S.op.inv = shuffle(S.op.pool).slice(0, 3); S.op.pool = S.op.pool.filter(x => !S.op.inv.includes(x));
    $('.b-menu', el).onclick = battleMenu;
    $('#hgBtn', el).onclick = handGuideModal;
    $('#htable', el).addEventListener('click', handGuideModal);
    $('#handMe', el).addEventListener('click', onHandClick);
    $('#fanMe', el).addEventListener('click', e => { const c = e.target.closest('.ec'); if (c) cardDetail(c.dataset.id); });
    $('#fanOp', el).addEventListener('click', e => { const c = e.target.closest('.ec'); if (c && !c.classList.contains('back')) cardDetail(c.dataset.id, true); });
    bindTips(el);
    bindTilt3D($('#handMe', el), '.pc', 20);
    bindTilt3D($('#fanMe', el), '.ec', 14);
    $('#fanMe', el).addEventListener('mouseover', e => { const c = e.target.closest('.ec'); if (c && !c.contains(e.relatedTarget)) Sfx.play('hover'); });
    $('#handMe', el).addEventListener('mouseover', e => { const c = e.target.closest('.pc.can'); if (c && !c.contains(e.relatedTarget)) Sfx.play('hover'); });
    // 이벤트 상자 버튼 : 연출 중이거나 이미 누른 버튼은 무시 (더블클릭·Enter 연타 방지)
    $('#ev', el).addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (S.busy || S.ended || b.dataset.used || b.disabled) { e.stopImmediatePropagation(); e.preventDefault(); return; }
      if (['ok', 'go', 'next', 'back', 'rrgo'].includes(b.dataset.a)) b.dataset.used = '1';
    }, true);
    // 피해 정산 연출 건너뛰기 : 화면 클릭 또는 Space
    el.addEventListener('click', e => { if (S.phase === 4 && S.busy && !S.skip && !e.target.closest('button,.ec,.pc')) skipFx(); });
    App.keyH = e => {
      if (S.ended) return e.key === 'Escape';
      if (e.key === ' ' && S.phase === 4 && S.busy) { if (!S.skip) skipFx(); return true; }
      if (e.key === 'Escape') { if ($('#layer .mwrap')) { if (!$('#layer .mwrap.lock')) closeModal(); return true; } battleMenu(); return true; }
      if (e.repeat) return false;
      if ((e.key === 'h' || e.key === 'H') && !$('#layer .mwrap')) { handGuideModal(); return true; }
      if (S.phase === 2 && !S.busy && !$('#layer .mwrap') && /^[1-7]$/.test(e.key)) { onHandClick({ target: $$('#handMe .pc')[+e.key - 1] }); return true; }
      if (e.key === 'Enter') { const b = $('#ev .btn.pri:not([disabled])'); if (b && !$('#layer .mwrap')) { b.click(); return true; } }
      return false;
    };
    addLog(`<b>전투 시작</b> · ${S.me.name} vs ${S.op.name} · HP ${hp}${S.mode === '연습' ? ` · 난이도 ${DIFFS[App.diff].ko}` : ''}`);
    renderAll(); startRound();
  },
};

/* ---------- 렌더 ---------- */
/* 애니메이션 완료 대기 – 탭이 백그라운드여도 멈추지 않도록 시간 제한 */
const done = (anim, ms) => Promise.race([anim.finished.catch(() => { }), wait(ms + 150)]);
function skipFx() {
  S.skip = true;
  $$('.fx-banner,.fx-cutin').forEach(x => x.remove());
  const t = $('#tHint'); if (t) t.textContent = '연출 건너뛰는 중…';
}
const live = tok => !!S && S.alive === tok && !S.ended && !!$('#bt');
/* 턴당 시간 : 연습 대전을 제외한 대전에서 02~03 단계에 적용, 시간이 끝나면 자동 제출 */
function startTimer() {
  stopTimer();
  if (!S.rules.turnTime || S.mode === '연습') return;
  S.tLeft = S.rules.turnTime; const tok = S.alive;
  const show = () => { const t = $('#tTimer'); if (!t) return; t.hidden = false; t.textContent = `⏱ ${S.tLeft}초`; t.classList.toggle('warn', S.tLeft <= 10); };
  show();
  S.tInt = setInterval(() => {
    if (!live(tok)) { stopTimer(); return; }
    if ($('#layer .mwrap') || S.busy) return;
    S.tLeft--; show(); if (S.tLeft <= 10 && S.tLeft > 0) Sfx.play('tick', .5);
    if (S.tLeft <= 0) {
      stopTimer(); toast('시간 초과 · 자동으로 제출합니다', 'err');
      S.fateMode = false; S.rrMode = false; S.me.rr = [];
      if (S.me.sel.length !== 5) S.me.sel = best5(S.me.hand);
      S.phase = 3; renderAll(); evPrep(); resolve();
    }
  }, 1000);
}
function stopTimer() { if (S && S.tInt) { clearInterval(S.tInt); S.tInt = null; } const t = $('#tTimer'); if (t) t.hidden = true; }
function renderAll() { if (!S || !$('#bt')) return; renderHUD(S.me); renderHUD(S.op); renderFan(S.me); renderFan(S.op); renderHand(); renderOppHand(); renderTools(); renderSteps(); }
function renderSteps() {
  $('#bRound').textContent = S.round; $('#bLimit').textContent = S.rules.turnLimit ? ` / ${S.rules.turnLimit}` : '';
  $$('#bSteps li').forEach(li => { const p = +li.dataset.p; li.className = p === S.phase ? 'on' : p < S.phase ? 'done' : ''; });
}
// 전황에 따라 배경음악·화면 분위기 전환 : 우세 / 열세 / 접전(양쪽 HP 위기)
const MOOD_INFO = { lead: ['우세', '승기를 잡았습니다!'], behind: ['열세', '밀리고 있습니다 — 반격하세요'], clutch: ['접전', '양쪽 모두 벼랑 끝!'] };
function battleMood() {
  if (!S || S.ended || !S.round) return 'calm';
  const a = S.me.hp / S.me.maxHp, b = S.op.hp / S.op.maxHp;
  if (a <= .35 && b <= .35) return 'clutch';
  if (a - b >= .3) return 'lead';
  if (b - a >= .3) return 'behind';
  return 'calm';
}
function updateMood() {
  const bt = $('#bt'); if (!bt || !S) return;
  const m = battleMood(); if (m === S.mood) return;
  const prev = S.mood; S.mood = m; Music.setMood(m);
  bt.classList.remove('mood-lead', 'mood-behind', 'mood-clutch'); if (m !== 'calm') bt.classList.add('mood-' + m);
  if (m !== 'calm' && prev !== undefined) { addLog(`<b>전황 · ${MOOD_INFO[m][0]}</b> ${MOOD_INFO[m][1]}`); if (m === 'clutch') { Sfx.play('danger'); BG.pulse(1); } }
}
function renderHUD(side) {
  const el = side.isMe ? $('#hudMe') : $('#hudOp'); if (!el) return;
  if (!el.dataset.init) {
    el.dataset.init = 1;
    el.innerHTML = `<div class="hud-tag pix">${side.isMe ? 'YOU' : 'RIVAL'}</div><div class="hud-row"><div class="hud-av">${side.isMe ? '♠' : '◆'}</div><div class="hud-n">${side.isMe ? '나 (' + side.name + ')' : side.name}<small>${side.isMe ? '내 진영' : S.mode === '연습' ? `AI 난이도 · ${DIFFS[App.diff].ko}` : 'AI 상대 · 온라인 준비 중'}</small></div></div>
      <div class="hud-hp"><span class="pix">HP</span><b class="hp-v num">${side.hp}</b><em class="num">/ ${side.maxHp}</em></div>
      <div class="hpbar"><i class="trail"></i><i class="fill"></i><i class="shb"></i></div><div class="hud-st"></div>`;
  }
  const pct = clamp(side.hp / side.maxHp * 100, 0, 100);
  $('.fill', el).style.width = pct + '%'; $('.trail', el).style.width = pct + '%';
  $('.shb', el).style.width = clamp(side.shield / side.maxHp * 100, 0, 100) + '%';
  $('.hp-v', el).textContent = Math.max(0, side.hp); el.classList.toggle('low', pct <= 30);
  if (side.isMe && $('#bt')) {
    const danger = pct <= 30 && side.hp > 0 && !S.ended;
    if (danger && !S.dangerOn) { Sfx.play('danger'); toast('위험! HP가 30% 이하입니다', 'err'); }
    S.dangerOn = danger; $('#bt').classList.toggle('danger', danger); Music.setIntense(danger);
  }
  updateMood();
  const st = [];
  if (side.shield > 0) st.push(`<span class="hud-chip sh">실드 ${side.shield}</span>`);
  side.dots.forEach(d => st.push(`<span class="hud-chip dot">지속 피해 ${d.dmg} · ${d.turns}턴</span>`));
  if (side.storm > 0) st.push(`<span class="hud-chip storm">패시브 봉인 ${side.storm}턴</span>`);
  if (side.immune) st.push(`<span class="hud-chip imm">무적</span>`);
  if (side.counter) st.push(`<span class="hud-chip counter">반격 +${side.counter}</span>`);
  $('.hud-st', el).innerHTML = st.join('') || '<span class="hud-chip none">상태 이상 없음</span>';
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
  const n = side.inv.length, mid = (n - 1) / 2, sp = side.isMe ? (n > 5 ? 86 : 104) : (n > 5 ? 28 : 34), rot = side.isMe ? (n > 5 ? 5 : 6) : 7;
  el.innerHTML = side.inv.map((id, i) => {
    const e = EF[id], k = i - mid, style = `--x:${k * sp}px;--y:${Math.abs(k) * (side.isMe ? 9 : 4)}px;--r:${k * rot}deg;z-index:${i + 1}`;
    if (!side.isMe && e.k === 'A' && !side.revealed.has(id)) return `<div class="ec back" style="${style}" data-id="${id}"><span>비공개</span><i>◆</i></div>`;
    const st = cardState(side, id), cdv = side.cd[id] || 0;
    const ov = st === 'cool' ? `<div class="cdov"><span class="lk">${ui('lock', 28)}</span><span class="hg">${ui('glass', 32)}</span><b>${cdv}턴</b></div>` : st === 'sealed' ? `<div class="cdov seal"><b>봉인</b></div>` : '';
    const tag = st === 'ready' ? '<div class="ec-tag rd">사용 가능</div>' : st === 'usedNow' ? '<div class="ec-tag un">이번 턴 사용</div>' : st === 'passive' ? '<div class="ec-tag ps">패시브 · 자동</div>' : '';
    return cardHTML(e, 'st-' + st, `style="${style}"`, ov + tag);
  }).join('');
  if (side.isMe) { $('#invN').textContent = `${side.inv.length} / ${slotsOf(side)}`; $('#poolN').textContent = side.pool.length; }
}
function renderHand(anim) {
  const el = $('#handMe'); if (!el) return; const s = S.me;
  if (!s.hand.length) { el.innerHTML = `<div class="hand-empty">드래프트를 마치면 전투 패 7장이 배분됩니다</div>`; return; }
  el.innerHTML = s.hand.map((c, i) => {
    const sel = s.sel.includes(i), rr = s.rr.includes(i); let cls = sel ? 'sel' : '';
    if (rr) cls += ' rr';
    if (S.phase === 2 && !S.rrMode && !sel && s.sel.length >= 5) cls += ' dis';
    if (S.phase >= 3 && !sel && !S.fateMode) cls += ' dim';
    if (S.phase === 2 || S.fateMode) cls += ' can';
    if (S.fateMode) cls += ' fate';
    return pokerHTML(c, cls + (anim ? ' deal' : ''), `data-i="${i}" data-tag="${rr ? '리롤' : sel ? '선택' : '미선택'}" style="--d:${i * 70}ms"`);
  }).join('');
}
function renderOppHand() {
  const el = $('#handOp'); if (!el) return; const n = S.op.hand.length || 0;
  el.innerHTML = Array.from({ length: 7 }, (_, i) => `<div class="pback ${i < n ? '' : 'ghost'} ${S.phase === 4 && S.op.sel.includes(i) ? 'up' : ''}" style="--d:${i * 60}ms"><i>◆</i></div>`).join('');
}
function renderTools() {
  const s = S.me, h = evalHand(s.sel.map(i => s.hand[i]));
  $('#tSel').innerHTML = `전투 패 7장 · 선택 <b class="num">${s.sel.length} / 5</b>`;
  $('#tHand').innerHTML = `현재 족보 <b>${h.name}</b>`;
  $('#tRr').textContent = `리롤 ${s.rerolls} · ${S.rrMode ? '선택 중' : '대기'}`; $('#tRr').classList.toggle('on', S.rrMode);
  $('#tHint').textContent = S.phase === 2 ? (S.rrMode ? '바꿀 카드를 누르세요' : '카드를 눌러 5장 선택 · 숫자키 1~7') : S.fateMode ? '운명: 바꿀 카드를 누르세요' : S.phase === 4 ? '화면 클릭 또는 Space — 연출 건너뛰기' : '';
  $$('#htable div').forEach(d => d.classList.toggle('on', d.dataset.k === h.key));
}
function ev(html, cls = '') { const el = $('#ev'); if (!el) return; el.className = 'evbox ' + cls; el.innerHTML = `<div class="ev-in">${html}</div>`; }
function addLog(html) { const l = $('#log'); if (!l) return; const d = document.createElement('div'); d.innerHTML = `<i class="num">R${S.round || 0}</i>${html}`; l.prepend(d); }
const evBtn = (label, a, pri, dis) => `<button class="btn ${pri ? 'pri' : ''} sm" style="--c:${pri ? C.red : C.gray}" data-a="${a}" ${dis ? 'disabled' : ''}><b>${label}</b></button>`;

/* ---------- 연출 ---------- */
function popAt(el, text, cls = '') {
  if (!el) return; const r = App.rectOf(el), p = document.createElement('div');
  p.className = 'pop ' + cls; p.innerHTML = text; p.style.left = r.x + r.w / 2 + 'px'; p.style.top = r.y + r.h / 2 + 'px';
  $('#layer').appendChild(p); setTimeout(() => p.remove(), 1500);
}
async function flyCard(cardEl, order) {
  if (!cardEl || !$('#ev')) return;
  const r = App.rectOf(cardEl), t = App.rectOf($('#ev'));
  const c = cardEl.cloneNode(true); c.classList.add('flying'); c.querySelectorAll('.cdov,.ec-tag').forEach(x => x.remove());
  c.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;width:${cardEl.offsetWidth}px;height:${cardEl.offsetHeight}px;margin:0;transform:none;z-index:80`;
  $('#layer').appendChild(c);
  const dx = t.x + t.w / 2 - (r.x + r.w / 2), dy = t.y + t.h / 2 - (r.y + r.h / 2);
  cardEl.style.opacity = .25;
  await done(c.animate([{ transform: 'none' }, { transform: `translate(${dx}px,${dy}px) scale(1.55) rotate(-3deg)` }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' }), 420);
  const b = document.createElement('div'); b.className = 'fx-badge'; b.innerHTML = `<em>효과 발동!</em><b>${order}</b>`; c.appendChild(b);
  const col = catColor(EF[cardEl.dataset.id]), cx = t.x + t.w / 2, cy = t.y + t.h / 2;
  Sfx.play('activate'); FX.flash(col, .28); FX.ring(cx, cy, col, 420, 650, 12); FX.ring(cx, cy, '#fff', 260, 500, 6); FX.punch(1.02); BG.pulse(.8);
  burst(cx, cy, ['#ffe08a', '#fff', col], 34, 200);
  c.animate([{ filter: 'brightness(2.2)' }, { filter: 'brightness(1)' }], { duration: 400 });
  await pace(650);
  await done(c.animate([{ transform: `translate(${dx}px,${dy}px) scale(1.55) rotate(-3deg)`, opacity: 1 }, { transform: 'none', opacity: .2 }], { duration: 360, easing: 'ease-in', fill: 'forwards' }), 360);
  c.remove(); cardEl.style.opacity = '';
}
function catColor(e) {
  if (!e) return C.yellow;
  return e.cat.startsWith('공격') ? C.red : e.cat.startsWith('방해') ? C.purple : e.cat.includes('방어') || e.cat.startsWith('유틸') ? C.blue : e.cat.startsWith('와일드') ? C.yellow : C.green;
}
async function passiveFlash(side, ids) {
  const fan = side.isMe ? $('#fanMe') : $('#fanOp'); if (!fan || !ids.length) return;
  fan.classList.add('pflash'); let k = 0;
  for (const id of ids) {
    const c = fan.querySelector(`.ec[data-id="${CSS.escape(id)}"]`); if (!c) continue;
    k++; c.classList.add('pon');
    const b = document.createElement('div'); b.className = 'fx-badge sm'; b.innerHTML = `<em>효과 발동!</em><b>${k}</b>`; c.appendChild(b);
    const pe = EF[id], hiR = pe && (pe.g === 'E' || pe.g === 'L'), rc = hiR ? FX.rarColor(pe.g) : C.yellow;
    Sfx.play(hiR ? (pe.g === 'L' ? 'legendReveal' : 'epicReveal') : 'passive'); const p = FX.center(c);
    FX.ring(p.x, p.y, rc, hiR ? 300 : 160, hiR ? 600 : 450, hiR ? 10 : 6); burst(p.x, p.y, [rc, '#fff'], hiR ? 26 : 10, hiR ? 150 : 70);
    if (hiR) { FX.flash(rc, .3, 260); FX.textAt(p.x, p.y - 90, pe.g === 'L' ? '★ LEGENDARY' : '◆ EPIC', 'gold'); }
    await pace(380);
  }
  await pace(500);
  fan.classList.remove('pflash'); $$('.pon', fan).forEach(c => { c.classList.remove('pon'); c.querySelectorAll('.fx-badge').forEach(x => x.remove()); });
}

/* ---------- 라운드 ---------- */
async function startRound() {
  if (!S || S.ended || S.busy || !$('#bt') || (S.round > 0 && S.phase !== 4)) return;
  const tok = S.alive;
  S.round++; S.phase = 1; S.rrMode = false; S.fateMode = false;
  [S.me, S.op].forEach(s => { s.hand = []; s.sel = []; s.rr = []; s.mods = []; s.immune = false; s.confuse = false; s.utilUses = 0; });
  for (const s of [S.me, S.op]) {
    if (S.round > 1) {
      Object.keys(s.cd).forEach(id => { if (s.cd[id] > 0) s.cd[id]--; });
      if (s.storm > 0) s.storm--;
      if (s.shield > 0) { addLog(`${s.isMe ? '나' : '상대'}의 실드 ${s.shield} 소멸`); s.shield = 0; }
    }
    const ps = passives(s);
    ps.filter(e => e.fx.smelt).forEach(e => s.smeltMap[e.id] = (s.smeltMap[e.id] || 0) + e.fx.smelt);
    if (S.round > 1 && ps.some(e => e.fx.haste)) { const c = Object.keys(s.cd).filter(id => s.cd[id] > 0); if (c.length) { const id = pick(c); s.cd[id]--; if (s.isMe) addLog(`<b>신속</b> · ${EF[id].name} 쿨타임 -1`); } }
    if (S.round > 1 && ps.some(e => e.fx.scheme) && s.inv.filter(id => EF[id].cat.includes('방해')).length >= 3) Object.keys(s.cd).forEach(id => { if (EF[id].cat.includes('방해') && s.cd[id] > 0) s.cd[id]--; });
    if (s.dots.length) {
      let tot = 0; s.dots.forEach(d => { tot += d.dmg; d.turns--; if (d.src) stat(other(s), d.src, 'dmg', d.dmg); });
      s.dots = s.dots.filter(d => d.turns > 0); s.hp -= tot;
      addLog(`${s.isMe ? '나' : '상대'} · 지속 피해 <b class="r">-${tot}</b>`);
      App.after(() => { const h = s.isMe ? $('#hudMe') : $('#hudOp'), p = FX.center(h); popAt(h, `-${tot}`, 'dmg dot'); Sfx.play('hit'); FX.ring(p.x, p.y, '#ff9a84', 220, 420, 8); burst(p.x, p.y, ['#ff9a84', '#7a2316'], 14, 90); FX.shake(.5); h.classList.add('hit'); setTimeout(() => h.classList.remove('hit'), 500); }, 300);
    }
  }
  renderAll();
  if (checkDeath()) return;
  if (S.rules.turnLimit && S.round > S.rules.turnLimit) { endBattle(S.me.hp >= S.op.hp, '턴 제한 도달'); return; }
  Sfx.play('round'); BG.pulse(.6);
  FX.banner(`ROUND ${S.round}`, S.round === 1 ? `${S.me.name} VS ${S.op.name}` : (S.rules.turnLimit ? `남은 턴 ${S.rules.turnLimit - S.round + 1}` : '다음 라운드'), S.round === 1 ? C.red : C.yellow, 'round');
  ev(`<div class="ev-k"><b class="pix">01</b> 라운드 시작 <span class="ev-r num">ROUND ${S.round}</span></div>
    <h2>먼저 효과 카드 1장을 선택하세요.</h2>
    <p>덱에서 뽑은 효과 카드 3장 중 1장을 획득해 장착합니다. 장착 ${S.me.inv.length}/${slotsOf(S.me)} · 빈 슬롯 ${Math.max(0, slotsOf(S.me) - S.me.inv.length)}개 · 효과 덱 ${S.me.pool.length}장</p>
    <div class="ev-row">${evBtn('드래프트 열기 → 02', 'draft', true)}</div>`);
  $('#ev [data-a=draft]').onclick = openDraft;
  if (S.round === 1) App.after(() => { if (S.alive === tok && S.phase === 1 && !$('#layer .mwrap')) openDraft(); }, 1400);
}

/* ---------- 드래프트 / 교체 ---------- */
function openDraft() {
  if (S.phase !== 1 || S.drafted === S.round) return;   // 라운드당 드래프트 1회 (자동 열기와 겹치지 않게)
  const offer = shuffle(S.me.pool).slice(0, 3);
  if (!offer.length) { toast('효과 덱이 비었습니다 · 드래프트 생략'); oppDraft(); deal(); return; }
  const tok = S.alive, hi = g => g === 'E' || g === 'L';
  // 기본 선택 : 가장 높은 등급 카드
  let idx = offer.reduce((b, id, i) => GRADE_ORDER[EF[id].g] > GRADE_ORDER[EF[offer[b]].g] ? i : b, 0);
  let revealing = true, skip = false;
  const w = modal(`<div class="draft">
    <div class="dm-h"><div><h2>이번 라운드에 더할 효과를 고르세요.</h2><p>3장 중 1장만 획득 · 확정 전까지는 미리보기</p></div><span class="tagb pix">PICK 1/1</span></div>
    <div class="dm-body"><div class="dm-cards">${offer.map((id, i) => { const e = EF[id]; return `<div class="dm-c hid ${hi(e.g) ? 'rar-' + e.g : ''}" data-i="${i}"><div class="dm-tag">공개 중…</div><div class="dm-flip"><div class="dm-back">?</div>${cardHTML(e)}<div class="rar-tag">${e.g === 'L' ? '★ LEGENDARY' : '◆ EPIC'}</div></div></div>`; }).join('')}</div><div class="dm-prev" id="dmPrev"><h3>카드 공개 중…</h3><p class="mut">창을 클릭하면 바로 공개됩니다</p></div></div>
    <div class="dm-f"><span class="mut">다른 카드를 누르면 선택이 바뀝니다 · 인벤토리가 꽉 차면 교체 화면으로 넘어갑니다</span>${btn('공개 중…', '', C.red, 'id="dmOk" disabled', 'pri')}</div></div>`, { cls: 'm-game lock', backdrop: false });
  w.addEventListener('click', () => { if (revealing) skip = true; });
  const upd = () => {
    $$('.dm-c', w).forEach((c, i) => { c.classList.toggle('on', i === idx); c.querySelector('.dm-tag').textContent = i === idx ? '✓ 선택됨' : '선택 가능'; });
    const e = EF[offer[idx]], full = S.me.inv.length >= slotsOf(S.me), after = [...S.me.inv, e.id];
    $('#dmPrev', w).innerHTML = `<h3>장착 후 예상 상태</h3>
      <div class="pv-r"><span>효과 인벤토리</span><b class="num">${S.me.inv.length}/${slotsOf(S.me)} → ${full ? '<em class="r">가득 참 · 교체 필요</em>' : `${after.length}/${slotsOf({ inv: after })}`}</b></div>
      <div class="pv-r"><span>액티브 / 패시브</span><b class="num">${deckInfo(after).A} / ${deckInfo(after).P}</b></div>
      <div class="pv-e"><b>${e.suit}${e.rank} ${e.name}</b><p>${e.desc}</p><small>${e.k === 'A' ? `액티브 · 쿨타임 ${e.cd}턴 · 획득 즉시 사용 가능` : '패시브 · 장착 즉시 상시 적용 (상대에게 공개)'}</small></div>`;
    $('#dmOk b', w).textContent = `선택 확정 · ${e.suit}${e.rank} 획득`;
  };
  $$('.dm-c', w).forEach(c => c.onclick = () => { if (revealing) return; if (idx !== +c.dataset.i) { Sfx.play('select'); const p = FX.center(c); burst(p.x, p.y, ['#ffe08a', '#fff'], 12, 90); } idx = +c.dataset.i; upd(); });
  $('#dmOk', w).onclick = async () => {
    if (w._done || revealing) return; w._done = true; S.drafted = S.round; Sfx.play('confirm');
    const id = offer[idx], e = EF[id]; oppDraft();
    if (hi(e.g)) {   // 영웅·전설 획득 축하 (교체가 필요하면 교체 확정 뒤에 축하)
      closeModal(true);
      if (S.me.inv.length >= slotsOf(S.me)) { openReplace(id, true); return; }
      await FX.rarityGet(e); if (!live(tok)) return;
      equip(id, null); return;
    }
    if (S.me.inv.length >= slotsOf(S.me)) { closeModal(true); openReplace(id); return; }
    equip(id, $$('.dm-c .ec', w)[idx]);
  };
  // 한 장씩 공개 : 영웅·전설은 공개 전에 등급 색으로 빛나며 떨림
  (async () => {
    await pace(420);
    const cs = $$('.dm-c', w);
    for (let i = 0; i < cs.length; i++) {
      if (!w.isConnected) return;
      const c = cs[i], e = EF[offer[i]], L = e.g === 'L', E = e.g === 'E';
      if ((L || E) && !skip) { c.classList.add('charging'); Sfx.play('charge', L ? 1.4 : 1); await pace(L ? 950 : 600); c.classList.remove('charging'); }
      c.classList.remove('hid'); c.classList.add('rev');
      $('.dm-tag', c).textContent = '선택 가능';
      Sfx.play(L ? 'legendReveal' : E ? 'epicReveal' : 'flip');
      const p = FX.center(c);
      if (L) { FX.flash('#fff6c8', .55, 350); FX.ring(p.x, p.y, '#ffd23f', 440, 650, 12); FX.star(p.x, p.y, '#ffd23f', 320); burst(p.x, p.y, ['#ffd23f', '#fff6c8', '#fff'], 44, 230); FX.shake(.8); }
      else if (E) { FX.flash('#e7d2ff', .35, 280); FX.ring(p.x, p.y, '#b06bff', 330, 550, 10); burst(p.x, p.y, ['#b06bff', '#e7d2ff', '#fff'], 28, 170); }
      setTimeout(() => c.classList.add('done'), 200); setTimeout(() => c.classList.remove('rev'), 700);
      await pace(skip ? 60 : L ? 650 : E ? 480 : 260);
    }
    revealing = false;
    const ok = $('#dmOk', w); if (ok) ok.disabled = false;
    upd();
  })();
}
async function equip(id, srcEl) {
  const r = srcEl ? App.rectOf(srcEl) : null; closeModal();
  S.me.pool = S.me.pool.filter(x => x !== id); S.me.inv.push(id); renderFan(S.me);
  const card = $(`#fanMe .ec[data-id="${CSS.escape(id)}"]`);
  if (card) { Sfx.play('coin'); setTimeout(() => { const p = FX.center(card); FX.ring(p.x, p.y, '#ffe08a', 240, 500, 8); burst(p.x, p.y, ['#ffe08a', '#fff'], 20, 120); }, 450); }
  if (card && r) { const t = App.rectOf(card); card.animate([{ transform: `translate(${r.x - t.x}px,${r.y - t.y}px) scale(1.1)`, opacity: .4 }, { transform: getComputedStyle(card).transform, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,1.1,.4,1)' }); card.classList.add('new'); }
  addLog(`<b>획득</b> · ${EF[id].suit}${EF[id].rank} ${EF[id].name}`);
  await pace(600); deal();
}
function openReplace(newId, celebrate = false) {
  const ne = EF[newId]; let pi = -1;
  const w = modal(`<div class="rep">
    <div class="rp-h"><span class="tagb pix">FULL ${S.me.inv.length}/${slotsOf(S.me)}</span><b>빈 슬롯이 없습니다. ${ne.suit}${ne.rank} ${ne.name}을(를) 받으려면 기존 카드 1장을 버리세요.</b></div>
    <div class="rp-t"><h3>기존 장착</h3><span class="tagb" id="rpChip">버릴 카드를 선택하세요</span></div>
    <div class="rp-cards">${S.me.inv.map((id, i) => `<div class="rp-c" data-i="${i}">${cardHTML(EF[id])}</div>`).join('')}</div>
    <div class="rp-b"><div class="rp-new">${cardHTML(ne)}</div><div class="rp-prev" id="rpPrev"><h3>교체 미리보기</h3><p class="mut">버릴 카드를 고르면 얻는 효과와 잃는 효과를 비교해 보여줍니다.</p></div></div>
    <div class="dm-f"><span class="mut">교체 후 기존 카드의 쿨타임은 새 카드에 이어지지 않습니다</span><div class="row">${btn('새 카드 포기', '', C.gray, 'id="rpNo"')}${btn('교체 확정', '', C.red, 'id="rpOk" disabled', 'pri')}</div></div></div>`, { cls: 'm-game lock', backdrop: false });
  $$('.rp-c', w).forEach(c => c.onclick = () => {
    pi = +c.dataset.i; $$('.rp-c', w).forEach(x => x.classList.toggle('on', x === c));
    const old = EF[S.me.inv[pi]];
    $('#rpChip', w).textContent = `${old.suit}${old.rank} ${old.name} 버리기`;
    $('#rpPrev', w).innerHTML = `<h3>교체 미리보기 · ${old.suit}${old.rank} → ${ne.suit}${ne.rank}</h3>
      <div class="pv-r"><span>장착</span><b class="num">${S.me.inv.length}/${slotsOf(S.me)} → ${S.me.inv.length}/${slotsOf({ inv: S.me.inv.map((id, i) => i === pi ? newId : id) })}</b></div>
      <div class="cmp"><div class="gain"><small>얻는 효과</small><b>${ne.name}</b><p>${ne.desc}</p></div><div class="lose"><small>잃는 효과</small><b>${old.name}</b><p>${old.desc}${S.me.cd[old.id] ? ` (쿨타임 ${S.me.cd[old.id]}턴 남음)` : ''}</p></div></div>`;
    $('#rpOk', w).disabled = false;
  });
  $('#rpNo', w).onclick = () => { closeModal(); addLog(`새 카드 ${ne.name} 포기`); deal(); };
  $('#rpOk', w).onclick = async () => {
    if ($('#rpOk', w).disabled) return;
    $('#rpOk', w).disabled = true; $('#rpNo', w).disabled = true;
    const old = S.me.inv[pi]; $$('.rp-c .ec', w)[pi].classList.add('discard'); await pace(380);
    S.me.inv[pi] = newId; delete S.me.cd[old]; S.me.pool = S.me.pool.filter(x => x !== newId);
    closeModal(); addLog(`<b>교체</b> · ${EF[old].name} → ${ne.name}`);
    if (celebrate) { const tok = S.alive; await FX.rarityGet(ne); if (!live(tok)) return; }
    renderFan(S.me);
    const c = $(`#fanMe .ec[data-id="${CSS.escape(newId)}"]`); c && c.classList.add('new');
    await pace(400); deal();
  };
}
/* ---------- 상대 AI ---------- */
// 리롤 : 족보가 약하면 페어(또는 같은 문양 4장)를 남기고 나머지를 교체
function aiReroll(op) {
  let n = 1 + (passives(op).some(e => e.fx.luck) && Math.random() < .5 ? 1 : 0) + passives(op).reduce((a, e) => a + (e.fx.reroll || 0), 0);
  while (n-- > 0) {
    const h = evalHand(best5(op.hand).map(i => op.hand[i])); if (h.base >= 15) return;
    const cnt = {}; op.hand.forEach(c => cnt[c.r] = (cnt[c.r] || 0) + 1);
    const suitCnt = {}; op.hand.forEach(c => suitCnt[c.s] = (suitCnt[c.s] || 0) + 1);
    const flushSuit = Object.keys(suitCnt).find(s => suitCnt[s] >= 4);
    let keep = op.hand.map((c, i) => i).filter(i => flushSuit ? op.hand[i].s === flushSuit : cnt[op.hand[i].r] >= 2);
    if (!keep.length) keep = op.hand.map((c, i) => i).sort((a, b) => pv(op.hand[b].r) - pv(op.hand[a].r)).slice(0, 2);
    const swap = op.hand.map((c, i) => i).filter(i => !keep.includes(i)).slice(0, 4); if (!swap.length) return;
    const nw = drawCards(op, swap.length, op.hand); swap.forEach((i, k) => op.hand[i] = nw[k]);
  }
}
// 액티브 사용 판단 : 자기 패 세기·HP·상대 상태를 보고 결정 (내 패는 보지 않음)
function aiWants(op, e) {
  const me = S.me, base = evalHand(op.sel.map(i => op.hand[i])).base, fx = e.fx, hpPct = op.hp / op.maxHp;
  const strong = base >= 20, weak = base <= 10;
  if (fx.heal && !fx.shield) return op.maxHp - op.hp >= fx.heal;
  if (fx.shield || fx.sturdy || fx.reduce || fx.immune) return weak || hpPct <= .4;
  if (fx.counter) return weak;
  if (fx.mult) return strong || me.hp <= 25;
  if (fx.bonus || fx.bpct || fx.crit || fx.chain || fx.again || fx.dot || fx.pierce) return !weak || me.hp <= 15;
  if (fx.breakS) return me.shield > 0;
  if (fx.storm) return passives(me).length >= 2;
  if (fx.cleanse) return op.dots.length > 0;
  if (fx.refit) return Object.values(op.cd).some(v => v > 1);
  if (fx.confuse) return !strong;
  if (fx.mirror) return !!op.lastUsed;
  if (fx.fate) return false;   // 운명은 아직 AI가 활용하지 못함
  return Math.random() < .5;
}
function oppDraft() {
  const s = S.op, offer = shuffle(s.pool).slice(0, 3); if (!offer.length) return;
  const id = AI().smartDraft ? offer.sort((a, b) => GRADE_ORDER[EF[b].g] - GRADE_ORDER[EF[a].g])[0] : pick(offer);
  if (s.inv.length >= slotsOf(s)) {
    const lo = s.inv.slice().sort((a, b) => GRADE_ORDER[EF[a].g] - GRADE_ORDER[EF[b].g])[0];
    if (GRADE_ORDER[EF[lo].g] >= GRADE_ORDER[EF[id].g]) return;
    s.inv = s.inv.map(x => x === lo ? id : x); delete s.cd[lo];
  } else s.inv.push(id);
  s.pool = s.pool.filter(x => x !== id); renderFan(s);
  const og = EF[id].g;
  addLog(og === 'L' ? `<b class="r">상대가 ★전설 카드를 획득했습니다!</b> · 장착 ${s.inv.length}` : og === 'E' ? `<b>상대가 ◆영웅 카드를 획득</b> · 장착 ${s.inv.length}` : `상대가 효과 카드를 획득 · 장착 ${s.inv.length}`);
  if (og === 'L') setTimeout(() => toast('⚠ 상대가 전설 카드를 획득했습니다!', 'err'), 400);
}

/* ---------- 전투 패 ---------- */
function deal() {
  if (!S || S.ended || !$('#bt') || S.phase !== 1) return;
  S.phase = 2; S.rrMode = false; S.fateMode = false;
  const me = S.me, op = S.op;
  me.hand = drawCards(me, 7, []); me.sel = []; me.rr = [];
  const luck = passives(me).some(e => e.fx.luck) && Math.random() < .5;
  me.rerolls = 1 + (luck ? 1 : 0) + passives(me).reduce((a, e) => a + (e.fx.reroll || 0), 0);
  if (luck) addLog('<b>행운</b> 발동 · 추가 리롤 +1');
  op.hand = drawCards(op, 7, []);
  if (AI().reroll) aiReroll(op);
  op.sel = Math.random() < AI().randomPick ? shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 5) : best5(op.hand);
  renderAll(); renderHand(true); evCompose(); startTimer();
  for (let i = 0; i < 7; i++) setTimeout(() => Sfx.play('deal'), i * 70);
}
function evCompose() {
  const s = S.me, h = evalHand(s.sel.map(i => s.hand[i])); let hint;
  ev(`<div class="ev-k"><b class="pix">02</b> 전투 패 구성 <span class="ev-r num">선택 ${s.sel.length} / 5</span></div>
    <h2>${s.sel.length ? h.name : '공격할 5장을 고르세요'} ${s.sel.length ? `<small>기본 ${h.base}점</small>` : ''}</h2>
    <p>${S.rrMode ? `리롤 모드 · 바꿀 카드를 표시하세요 (${s.rr.length}장 표시)` : '포커 카드 7장 중 5장을 골라 족보를 만드세요. 액티브 효과 카드도 지금 사용할 수 있습니다.'}</p>
    ${!S.rrMode && s.rerolls > 0 && (hint = drawHint(s.hand)) ? `<p class="ev-hint">💡 ${hint}</p>` : ''}
    <div class="ev-row">${S.rrMode ? evBtn('취소', 'rrx') + `<button class="btn sm" style="--c:${C.yellow}" data-a="rrgo" ${s.rr.length ? '' : 'disabled'}><b>리롤 실행 (${s.rr.length}장)</b></button>`
      : evBtn(`리롤 모드 (${s.rerolls})`, 'rr', false, !s.rerolls) + evBtn('최적 5장 자동 선택', 'auto')}
      ${evBtn(s.sel.length === 5 ? '패 확정 → 03' : '5장 선택 필요', 'ok', true, !(s.sel.length === 5 && !S.rrMode))}</div>`);
  const b = a => $(`#ev [data-a=${a}]`);
  b('rr') && (b('rr').onclick = () => { S.rrMode = true; renderHand(); renderTools(); evCompose(); });
  b('rrx') && (b('rrx').onclick = () => { S.rrMode = false; S.me.rr = []; renderHand(); renderTools(); evCompose(); });
  b('rrgo') && (b('rrgo').onclick = doReroll);
  b('auto') && (b('auto').onclick = () => { S.me.sel = best5(S.me.hand); renderHand(); renderTools(); evCompose(); });
  b('ok').onclick = () => { if (S.phase !== 2 || S.me.sel.length !== 5 || S.rrMode) return; S.phase = 3; renderAll(); evPrep(); };
}
function onHandClick(e) {
  const c = e.target && e.target.closest && e.target.closest('.pc'); if (!c || !S || S.busy || S.ended) return;
  const i = +c.dataset.i, s = S.me;
  if (S.fateMode) { if (S.phase === 2 || S.phase === 3) fatePick(i); return; }
  if (S.phase !== 2) { if (S.phase === 3) toast('패를 다시 고르려면 [← 패 다시 고르기]'); return; }
  const p = FX.center(c);
  if (S.rrMode) { s.rr = s.rr.includes(i) ? s.rr.filter(x => x !== i) : [...s.rr, i]; Sfx.play('mark'); }
  else if (s.sel.includes(i)) { s.sel = s.sel.filter(x => x !== i); Sfx.play('deselect'); }
  else if (s.sel.length < 5) { s.sel.push(i); Sfx.play('select'); burst(p.x, p.y - 30, ['#3dff95', '#fff', '#ffe08a'], 10, 70); }
  else { shake(c); Sfx.play('error'); return; }
  const before = evalHand(s.sel.filter(x => x !== i).map(k => s.hand[k])).key;
  renderHand(); renderTools(); evCompose();
  const now = evalHand(s.sel.map(k => s.hand[k]));
  if (now.key !== before && HAND_FX[now.key] && HAND_FX[now.key][2] >= 1 && s.sel.includes(i)) {
    Sfx.play('coin'); const h = $('#ev h2'); if (h) h.animate([{ scale: 1.5, color: HAND_FX[now.key][1] === 'rainbow' ? '#ffe08a' : HAND_FX[now.key][1] }, { scale: 1 }], { duration: 450, easing: 'cubic-bezier(.2,1.8,.4,1)' });
    $$('#handMe .pc.sel').forEach((el, k) => el.animate([{ translate: '0 0' }, { translate: '0 -14px' }, { translate: '0 0' }], { duration: 320, delay: k * 50 }));
  }
}
async function doReroll() {
  const s = S.me, idx = [...s.rr], tok = S.alive;
  if (S.busy || S.phase !== 2 || !idx.length || s.rerolls <= 0) return;
  S.busy = true;
  Sfx.play('reroll');
  idx.forEach(i => { const el = $$('#handMe .pc')[i]; if (!el) return; el.classList.add('flipout'); const p = FX.center(el); burst(p.x, p.y, ['#e6a33c', '#fff'], 8, 60); });
  await pace(260);
  S.busy = false; if (!live(tok)) return;
  const nw = drawCards(s, idx.length, s.hand); idx.forEach((i, k) => s.hand[i] = nw[k]);
  s.sel = s.sel.filter(i => !idx.includes(i)); s.rr = []; s.rerolls--; S.rrMode = false;
  renderHand(); idx.forEach(i => $$('#handMe .pc')[i].classList.add('flipin'));
  addLog(`리롤 · ${idx.length}장 교체`); renderTools(); evCompose();
}

/* ---------- 쇼다운 준비 ---------- */
function evPrep() {
  const c = calc(S.me, S.op), s = S.me;
  const used = s.mods.map(m => `<span class="uchip">${m.label} 사용 · 재사용 ${s.cd[m.src] || 0}턴</span>`).join('');
  ev(`<div class="ev-k"><b class="pix">03</b> 쇼다운 준비 <span class="ev-r num">5 / 5 제출 가능</span><span class="ev-rt">내 패 공개 전 · 상대도 제출 대기</span></div>
    <div class="ev-2"><div><h2>${c.h.name}</h2><p>제출 예정: ${s.sel.map(i => `<b class="${isRed(s.hand[i].s) ? 'r' : ''}">${s.hand[i].s}${s.hand[i].r}</b>`).join(' · ')}</p></div>
    <div class="ev-f"><div class="fml num">${formula(c)}</div><p>${[`족보 ${c.base}`, ...c.parts.map(p => p.t === 'b' ? `${p.label} +${p.v}` : `${p.label} ×${fm(p.v)}`)].join(' / ')}${c.crit ? ` · 치명타 ${c.crit}%` : ''}</p></div></div>
    <div class="ev-row line">${used || '<span class="uchip ghost">아래 액티브 효과 카드를 눌러 사용할 수 있습니다</span>'}
      ${evBtn('← 패 다시 고르기', 'back', false, s.mods.length)}${evBtn('제출 확정 → 04', 'go', true)}</div>`);
  $('#ev [data-a=back]').onclick = () => { S.phase = 2; renderAll(); evCompose(); };
  $('#ev [data-a=go]').onclick = resolve;
}
function cardDetail(id, opp) {
  const side = opp ? S.op : S.me, e = EF[id], st = cardState(side, id), cdv = side.cd[id] || 0;
  const can = !opp && e.k === 'A' && st === 'ready';
  const w = modal(`<div class="cdet"><h3>카드 상세 · ${e.name}</h3>
    <div class="cd-b">${cardHTML(e)}<div><span class="tagb">${GRADES[e.g].en} · ${e.k === 'A' ? '액티브' : '패시브'} · ${e.cat}</span><p class="cd-d">${e.desc}</p>
      <p class="mut">${e.k === 'A' ? `수동 발동 · 패 제출 전 사용<br>기본 쿨타임 ${e.cd}턴 · 사용하면 상대에게 공개<br>사용 후 취소·재사용 불가` : '패시브 · 매 턴 자동 적용 · 상대에게 공개'}</p></div></div>
    ${e.k === 'A' && !opp ? `<div class="cd-s"><div><b>${st === 'cool' ? `쿨다운 · ${cdv}턴 남음` : st === 'usedNow' ? '이번 턴 사용함' : '준비 완료'}</b><span class="mut">${st === 'ready' ? '지금 사용할 수 있습니다' : st === 'cool' ? `다음 턴 시작 시 ${cdv} → ${cdv - 1}` : st === 'usedNow' ? '' : '전투 패 구성 / 쇼다운 준비 단계에서 사용 가능'}</span></div>
      ${btn(can ? `${e.name} 사용` : st === 'cool' ? `쿨다운 ${cdv} · 잠금` : '지금은 사용 불가', '', can ? C.red : C.gray, `id="cdUse" ${can ? '' : 'disabled'}`, 'pri')}</div>` : ''}
    <button class="xbtn" onclick="closeModal()">×</button></div>`, { cls: 'm-game' });
  const u = $('#cdUse', w); if (u && can) u.onclick = () => { if (u.disabled || S.busy) return; u.disabled = true; closeModal(); useActive(S.me, id); };
}
async function useActive(side, id) {
  if (side.isMe) { if (S.busy || S.ended || (S.phase !== 2 && S.phase !== 3) || cardState(side, id) !== 'ready') return; S.busy = true; }
  const tok = S.alive;
  try { await useActiveInner(side, id, tok); }
  finally { if (side.isMe && S) S.busy = false; }
}
/* 함정 카드 : 상대가 카드를 쓸 때 자동으로 반응 (패시브이므로 폭풍으로 봉인되면 반응하지 않음) */
const who = s => s.isMe ? '나' : '상대';
function trapFx(owner, tid, color = C.purple) {
  const c = $(`${owner.isMe ? '#fanMe' : '#fanOp'} .ec[data-id="${CSS.escape(tid)}"]`), p = FX.center(c);
  if (c) { c.classList.add('pon'); setTimeout(() => c.classList.remove('pon'), 700); }
  FX.ring(p.x, p.y, color, 240, 500, 8); burst(p.x, p.y, [color, '#fff'], 18, 110); Sfx.play('shieldBreak');
}
function trapReact(side, oth, e, id, fx) {
  const has = tid => passives(oth).some(p => p.id === tid);
  const ohud = oth.isMe ? $('#hudMe') : $('#hudOp'), shud = side.isMe ? $('#hudMe') : $('#hudOp');
  const disrupt = e.cat.includes('방해');
  // 간파 (◆2) : 방해 카드를 10% 확률로 무효화
  if (disrupt && has('◆2') && Math.random() < .10) {
    side.mods = side.mods.filter(m => m.src !== id);
    stat(oth, '◆2', 'uses', 1); trapFx(oth, '◆2'); popAt(ohud, '간파! 방해 무효', 'gold');
    addLog(`${who(oth)} · <b>간파</b> 발동 → ${e.name} 무효`); return 'nullify';
  }
  // 마법 방패 (◆6) : 방해 카드를 50% 확률로 사용자에게도 적용 (반사)
  if (disrupt && has('◆6') && Math.random() < .5) {
    stat(oth, '◆6', 'uses', 1); trapFx(oth, '◆6', C.blue); popAt(ohud, `마법 방패! ${e.name} 반사`, 'gold');
    if (fx.storm) { side.storm = Math.max(side.storm, fx.storm); renderFan(side); }
    if (fx.confuse) oth.confuse = true;
    const copy = { ...fx }; delete copy.storm; delete copy.confuse;
    if (Object.keys(copy).length) oth.mods.push({ src: '◆6', label: `마법 방패(${e.name})`, fx: copy });
    addLog(`${who(oth)} · <b>마법 방패</b> 발동 → ${e.name} 효과를 ${who(side)}에게도 적용`);
  }
  // 흐트러짐 (◆3) : 유틸 카드 사용 시 30% 확률로 사용자에게 지속 피해 1턴
  if (e.cat.includes('유틸') && has('◆3') && Math.random() < .30) {
    side.dots.push({ dmg: 3, turns: 1, src: '◆3' }); stat(oth, '◆3', 'uses', 1);
    trapFx(oth, '◆3', C.red); popAt(shud, '흐트러짐! 지속 피해 3', 'opfx');
    addLog(`${who(oth)} · <b>흐트러짐</b> 발동 → ${who(side)}에게 지속 피해 3 (1턴)`);
  }
  return null;
}
async function useActiveInner(side, id, tok) {
  const e = EF[id], oth = other(side);
  side.cd[id] = e.cd; side.usedOrder++;
  const fx = { ...e.fx }; let label = e.name;
  if (fx.mirror) {
    if (!side.lastUsed) { if (side.isMe) toast('복제할 효과가 없습니다', 'err'); side.cd[id] = 0; side.usedOrder--; return; }
    Object.assign(fx, EF[side.lastUsed].fx); delete fx.mirror; label = `마법 거울(${EF[side.lastUsed].name})`;
  } else side.lastUsed = id;
  side.mods.push({ src: id, label, fx }); stat(side, id, 'uses', 1);
  if (e.cat.includes('유틸') || e.cat.includes('방어')) side.utilUses++;
  if (!side.isMe) side.revealed.add(id);
  renderFan(side);
  if (e.g === 'E' || e.g === 'L') {   // 필살기 컷인 (같은 판에서 두 번째부터는 짧게)
    const seen = S.seenCut.has(side.isMe + id); S.seenCut.add(side.isMe + id);
    await FX.cutin(e, side.isMe, seen); if (!live(tok)) return;
  }   // 필살기 컷인
  if (side.isMe) await flyCard($(`#fanMe .ec[data-id="${CSS.escape(id)}"]`), side.usedOrder);
  else {
    const c = $(`#fanOp .ec[data-id="${CSS.escape(id)}"]`);
    if (c) { c.classList.add('reveal'); popAt(c, `${e.name}!`, 'opfx'); const p = FX.center(c); FX.ring(p.x, p.y, catColor(e), 200, 500, 8); burst(p.x, p.y, [catColor(e), '#fff'], 16, 90); }
    Sfx.play('activate'); await pace(500);
  }
  if (!live(tok)) return;
  // 상대의 함정 카드(간파·마법 방패·흐트러짐) 반응
  if (trapReact(side, oth, e, id, fx) === 'nullify') {
    renderAll(); if (side.isMe) { S.busy = false; S.phase === 3 ? evPrep() : S.phase === 2 && evCompose(); }
    return;
  }
  const hud = side.isMe ? $('#hudMe') : $('#hudOp');
  if (fx.heal) { const v = Math.min(fx.heal, side.maxHp - side.hp); side.hp += v; stat(side, id, 'heal', v); popAt(hud, `+${v} HP`, 'heal'); FX.sparkle(hud, '#6fffa8', 22); Sfx.play('heal'); hud.classList.add('glow-heal'); setTimeout(() => hud.classList.remove('glow-heal'), 900); }
  if (fx.shield || fx.sturdy) {
    const v = fx.shield || Math.min(20, Math.floor((side.maxHp - side.hp) / 2));
    side.shield += v; stat(side, id, 'shield', v); popAt(hud, `실드 +${v}`, 'shield'); FX.bubble(hud, '#9cc2ff'); Sfx.play('shield');
  }
  if (fx.cleanse) { side.dots = []; popAt(hud, '정화!', 'heal'); FX.sparkle(hud, '#ffffff', 16); Sfx.play('heal'); }
  if (fx.immune) { FX.bubble(hud, '#ffe08a'); Sfx.play('shield'); }
  if (fx.immune) side.immune = true;
  if (fx.confuse) side.confuse = true;
  if (fx.storm) { oth.storm = fx.storm; popAt(oth.isMe ? $('#hudMe') : $('#hudOp'), '패시브 봉인!', 'opfx'); renderFan(oth); }
  if (fx.refit) { const c = Object.keys(side.cd).filter(x => x !== id && side.cd[x] > 0).sort((a, b) => side.cd[b] - side.cd[a])[0]; if (c) { side.cd[c]--; side.isMe && toast(`재정비 · ${EF[c].name} 쿨타임 -1`, 'ok'); } }
  if (fx.fate && side.isMe) { S.fateMode = true; renderHand(); renderTools(); toast('운명 · 바꿀 포커 카드를 고르세요'); }
  const rc = passives(side).filter(p => p.fx.recycle).length;
  if (rc && Math.random() < .05 * rc) { side.cd[id] = 0; popAt(hud, '순환 발동! 재사용 가능', 'gold'); }
  addLog(`${side.isMe ? '나' : '상대'} · <b>${label}</b> 사용`);
  renderAll();
  if (side.isMe) { S.busy = false; S.phase === 3 ? evPrep() : S.phase === 2 && evCompose(); }
}
function fatePick(i) {
  const s = S.me, have = new Set(s.hand.map(c => c.r + c.s));
  const w = modal(`<div class="fate"><h3>운명 · ${s.hand[i].s}${s.hand[i].r}를 무엇으로 바꿀까요?</h3><div class="fate-g">${SUITS.map(su => RANKS.map(r => `<button class="fg ${isRed(su) ? 'red' : ''}" data-c="${r}|${su}" ${have.has(r + su) ? 'disabled' : ''}>${su}${r}</button>`).join('')).join('')}</div></div>`, { cls: 'm-game' });
  $$('.fg', w).forEach(b => b.onclick = () => {
    if (!S.fateMode || (S.phase !== 2 && S.phase !== 3)) { closeModal(); return; }
    const [r, su] = b.dataset.c.split('|'); s.hand[i] = { r, s: su }; S.fateMode = false; closeModal();
    renderHand(); $$('#handMe .pc')[i].classList.add('flipin', 'fated'); renderTools();
    addLog(`<b>운명</b> · ${su}${r}로 교체`); S.phase === 3 ? evPrep() : evCompose();
  });
}

/* ---------- 피해 정산 ---------- */
async function resolve() {
  if (!S || S.busy || S.ended || S.phase !== 3) return;
  const tok = S.alive, me = S.me, op = S.op;
  S.busy = true; S.skip = false; S.fateMode = false; S.rrMode = false; stopTimer();
  S.phase = 4; renderAll();
  ev(`<div class="ev-k"><b class="pix">04</b> 쇼다운 대기</div><h2>상대의 제출을 기다리는 중<span class="blink">_</span></h2>`);
  await pace(700); if (!live(tok)) return;
  for (const id of shuffle(op.inv.filter(id => EF[id].k === 'A' && !(op.cd[id] > 0)))) {
    if (!live(tok)) return;
    if (EF[id].fx.mirror && !op.lastUsed) continue;
    const ai = AI(), use = Math.random() < ai.smart ? aiWants(op, EF[id]) : Math.random() < ai.useRate;
    if (use) await useActive(op, id);
  }
  if (!live(tok)) return;
  for (const [a, b] of [[me, op], [op, me]]) if (a.confuse) {
    const k = pick(b.sel), nw = drawCards(b, 1, b.hand)[0];
    b.hand[k] = nw; b.confused = k; addLog(`<b>혼란</b> · ${b.isMe ? '내' : '상대'} 카드 1장이 ${nw.s}${nw.r}로 바뀜`);
  }
  const A = calc(me, op), B = calc(op, me);
  const row = s => s.sel.map((i, k) => `<div class="sd-c" style="--k:${k}">${pokerHTML(s.hand[i], 'sm ' + (s.confused === i ? 'conf' : ''))}<div class="sd-b">◆</div></div>`).join('');
  ev(`<div class="sd"><div class="sd-side op"><div class="sd-n">${op.name}</div><div class="sd-cards">${row(op)}</div><div class="sd-f"><span class="sd-h">${B.h.name}</span><span class="fml num">${formula(B)}</span></div><b class="sd-s num" id="sdOp">0</b></div>
    <div class="sd-vs pix">VS</div>
    <div class="sd-side me"><div class="sd-n">나</div><div class="sd-cards">${row(me)}</div><div class="sd-f"><span class="sd-h">${A.h.name}</span><span class="fml num">${formula(A)}</span></div><b class="sd-s num" id="sdMe">0</b></div></div>`, 'showdown');
  me.confused = op.confused = undefined;
  for (const f of [...$$('#ev .sd-side.op .sd-c'), ...$$('#ev .sd-side.me .sd-c')]) {
    if (!live(tok)) return; f.classList.add('open'); Sfx.play('flip');
    const p = FX.center(f); burst(p.x, p.y, ['#fff', '#ffe08a'], 5, 40); await pace(120);
  }
  await pace(200); if (!live(tok)) return;
  const hf = HAND_FX[A.h.key];
  if (hf && hf[2] >= 1) {
    $$('#ev .sd-side.me .sd-c').forEach((c, k) => c.animate([{ translate: '0 0' }, { translate: '0 -16px' }, { translate: '0 0' }], { duration: 380, delay: k * 60, easing: 'cubic-bezier(.2,1.6,.4,1)' }));
    await FX.banner(hf[0] + '!', `${A.h.name} · 기본 ${A.h.base}점`, hf[1] === 'rainbow' ? C.red : hf[1], hf[2] >= 4 ? 'rainbow' : hf[2] >= 3 ? 'hot' : '');
    if (hf[2] >= 3) FX.confetti(hf[2] >= 4 ? 160 : 60);
  }
  if (!live(tok)) return;
  await Promise.all([passiveFlash(me, A.parts.filter(p => p.pas).map(p => p.src)), passiveFlash(op, B.parts.filter(p => p.pas).map(p => p.src))]);
  if (!live(tok)) return;
  $$('#ev .sd-f').forEach(f => f.classList.add('show'));
  let sA = A.score, sB = B.score;
  const critA = A.crit && rnd(100) < A.crit, critB = B.crit && rnd(100) < B.crit;
  await Promise.all([countScore($('#sdMe'), sA, 800 * fxSpeed()), countScore($('#sdOp'), sB, 800 * fxSpeed())]);
  for (const [crit, isMe] of [[critA, true], [critB, false]]) if (crit) {
    if (!live(tok)) return;
    Sfx.play('crit'); await FX.hitstop(120); FX.flash('#ffe08a', .5); FX.shake(.8);
    if (!live(tok)) return;
    if (isMe) { sA = Math.round(sA * 1.5); addLog('<b>치명타!</b> 내 점수 ×1.5'); } else { sB = Math.round(sB * 1.5); addLog('상대 <b>치명타!</b>'); }
    const el = isMe ? $('#sdMe') : $('#sdOp'); el.textContent = isMe ? sA : sB; const p = FX.center(el); FX.star(p.x, p.y, '#ffe08a', 220);
    await FX.banner('CRITICAL!', `${isMe ? '내' : '상대'} 점수 ×1.5 → ${isMe ? sA : sB}`, C.red, 'hot');
  }
  await pace(250); if (!live(tok)) return;
  // 점수가 같으면 족보 숫자·키커로 승부 (완전히 같을 때만 무승부)
  let win = sA > sB ? me : sB > sA ? op : null, kicker = null;
  if (!win) {
    const k = cmpHand(A.h, B.h);
    if (k) {
      win = k > 0 ? me : op;
      const a = win === me ? A.h.rank : B.h.rank, b = win === me ? B.h.rank : A.h.rank;
      let i = 1; while (i < a.length && a[i] === b[i]) i++;
      kicker = `${i === 1 ? '높은 숫자' : '키커'} ${pvName(a[i])} > ${pvName(b[i])}`;
    }
  }
  const lose = win ? other(win) : null, diff = kicker ? KICKER_DMG : Math.abs(sA - sB);
  if (App.battleOpt.forecast && !S.skip) await forecast(sA, sB, A, B, win, diff, kicker);
  if (!live(tok)) return;
  const box = $('#ev');
  // 점수 충돌 연출
  const eMe = $('#sdMe'), eOp = $('#sdOp');
  if (eMe && eOp) {
    const vs = FX.center($('#ev .sd-vs')), pm = FX.center(eMe), po = FX.center(eOp);
    Sfx.play('whoosh');
    await Promise.all([
      done(eMe.animate([{ translate: '0 0' }, { translate: `${(vs.x - pm.x) * .8}px ${(vs.y - pm.y) * .5}px`, scale: 1.3 }], { duration: 260, easing: 'cubic-bezier(.6,0,.9,.4)' }), 260),
      done(eOp.animate([{ translate: '0 0' }, { translate: `${(vs.x - po.x) * .8}px ${(vs.y - po.y) * .5}px`, scale: 1.3 }], { duration: 260, easing: 'cubic-bezier(.6,0,.9,.4)' }), 260),
    ]);
    Sfx.play('clash'); FX.flash('#fff', .55, 200); FX.ring(vs.x, vs.y, '#fff', 380, 500, 14); FX.star(vs.x, vs.y, '#ffe08a', 260); burst(vs.x, vs.y, ['#fff', '#ffe08a', C.red, C.blue], 36, 240); FX.shake(.7);
    if (win) { (win.isMe ? eMe : eOp).classList.add('sd-win'); (win.isMe ? eOp : eMe).classList.add('sd-lose'); }
    else { eMe.classList.add('sd-lose'); eOp.classList.add('sd-lose'); }
  }
  if (!live(tok)) return;
  box.classList.add('clash'); await pace(420); if (!live(tok)) return;
  if (!win) { popAt($('#ev'), '무승부 — 피해 없음', 'tie'); addLog('무승부 · 피해 없음'); FX.banner('DRAW', '점수가 같아 피해 없음', C.gray); }
  else {
    const wm = win.mods, pierce = wm.some(m => m.fx.pierce), brk = wm.reduce((a, m) => a + (m.fx.breakS || 0), 0);
    if (kicker) { await FX.banner('KICKER!', `점수 동점 · ${kicker} → 고정 피해 ${KICKER_DMG}`, C.blue); if (!live(tok)) return; }
    const from = FX.center(win.isMe ? eMe : eOp), to = FX.center(lose.isMe ? $('#hudMe') : $('#hudOp'));
    await FX.beam(from, to, win.isMe ? '#8db8ff' : '#ff9a84');
    if (!live(tok)) return;
    const dealt = applyDamage(lose, diff, { pierce, brk, big: true });
    attribute(win, win === me ? A : B, dealt, kicker);
    addLog(kicker ? `${win.isMe ? '내' : '상대'} 키커 승리 · ${kicker} → ${lose.isMe ? '나' : '상대'} HP -${dealt}`
      : `${win.isMe ? '내' : '상대'} 승리 · ${Math.max(sA, sB)} - ${Math.min(sA, sB)} = <b class="r">${diff}</b> → ${lose.isMe ? '나' : '상대'} HP -${dealt}`);
    await pace(dealt / lose.maxHp >= .2 ? 420 : 200); if (!live(tok)) return;
    if (dealt / lose.maxHp >= .2) await FX.banner(dealt / lose.maxHp >= .35 ? 'DEVASTATING!' : 'BIG HIT!', `${dealt} 피해`, C.red, 'hot');
    await pace(650); if (!live(tok)) return;
    if (dealt > 0) {
      const ch = wm.find(m => m.fx.chain); if (ch) { const d2 = applyDamage(lose, Math.floor(dealt * ch.fx.chain), { pierce: true, label: '연격' }); stat(win, ch.src, 'dmg', d2); addLog(`<b>연격</b> 추가 피해 ${d2}`); await pace(550); if (!live(tok)) return; }
      const ag = wm.find(m => m.fx.again); if (ag) { const d3 = applyDamage(lose, diff, { pierce, label: '찬스 스텝' }); stat(win, ag.src, 'dmg', d3); addLog(`<b>찬스 스텝</b> 재결산 ${d3}`); await pace(550); if (!live(tok)) return; }
      const dt = wm.find(m => m.fx.dot); if (dt) { lose.dots.push({ dmg: dt.fx.dot, turns: 2, src: dt.src }); addLog(`<b>열상</b> · 지속 피해 ${dt.fx.dot} (2턴)`); }
    } else if (wm.some(m => m.fx.again)) addLog('찬스 스텝 불발');
  }
  // 반격 : 이번 라운드에 피해를 받지 않은 쪽(이긴 쪽·무승부 포함)이 반격을 썼다면 다음 턴 보너스
  for (const s of [me, op]) {
    const cnt = s.mods.find(m => m.fx.counter), took = s === lose ? (lose._lastTaken || 0) : 0;
    if (cnt && took === 0) { s.counter = cnt.fx.counter; addLog(`${who(s)} · <b>반격</b> 준비 · 다음 턴 +${cnt.fx.counter}`); }
  }
  for (const s of [me, op]) {
    if (s.counter && !s.mods.some(m => m.fx.counter)) s.counter = 0;
    const av = passives(s).find(e => e.fx.avatar); if (av) { other(s).dots.push({ dmg: av.fx.avatar, turns: 2, src: av.id }); stat(s, av.id, 'uses', 1); }
    if (passives(s).some(e => e.fx.contagion) && s.dots.length) other(s).dots.push({ dmg: 2, turns: 1, src: '◆5' });
  }
  box.classList.remove('clash'); renderAll();
  if (checkDeath()) return;
  if (S.rules.turnLimit && S.round >= S.rules.turnLimit) { await pace(700); if (live(tok)) endBattle(me.hp >= op.hp, '턴 제한 도달'); return; }
  await pace(500); if (!live(tok)) return;
  S.busy = false; S.skip = false;
  ev(`<div class="ev-k"><b class="pix">04</b> 피해 정산 결과 <span class="ev-r num">ROUND ${S.round}</span></div>
    <div class="ev-2"><div><h2>${!win ? '무승부' : win.isMe ? (kicker ? '키커 승리!' : '공격 성공!') : '피해를 받았습니다'}</h2><p>내 점수 <b>${sA}</b> · 상대 점수 <b>${sB}</b> · ${kicker ? `동점 → ${kicker}` : `차이 <b class="r">${diff}</b>`}</p></div>
      <div class="ev-hp"><div><span>나</span><b class="num">${me.hp}</b></div><div><span>상대</span><b class="num">${op.hp}</b></div></div></div>
    <div class="ev-row"><span class="mut">생존 시 다음 라운드 · 쿨타임 -1 · 실드 소멸</span>${evBtn('다음 라운드 →', 'next', true)}</div>`);
  $('#ev [data-a=next]').onclick = startRound;
}
function applyDamage(t, dmg, o = {}) {
  const hud = t.isMe ? $('#hudMe') : $('#hudOp'); t._lastTaken = 0;
  if (t.immune) { t.immune = false; popAt(hud, '무적! 피해 무시', 'heal'); return 0; }
  if (!o.pierce) { const red = Math.min(80, t.mods.reduce((a, m) => a + (m.fx.reduce || 0), 0)); if (red) { dmg = Math.round(dmg * (1 - red / 100)); popAt(hud, `급소 회피 -${red}%`, 'shield'); } }
  if (t.shield > 0) {
    if (o.pierce) popAt(hud, '실드 무시!', 'opfx');
    else if (o.brk && rnd(100) < o.brk) { popAt(hud, '실드 파괴!', 'opfx'); t.shield = 0; }
    else {
      const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab;
      if (ab) { const p = FX.center(hud); setTimeout(() => { popAt(hud, `실드 -${ab}`, 'shield'); FX.ring(p.x, p.y, '#9cc2ff', 300, 450, 10); burst(p.x, p.y, ['#9cc2ff', '#fff'], 18, 140); Sfx.play('shieldBreak'); }, 120); }
    }
  }
  const beforePct = clamp(t.hp / t.maxHp * 100, 0, 100);
  t.hp -= dmg; t._lastTaken = dmg;
  const st = $('#bt');
  if (dmg > 0) {
    const ratio = dmg / t.maxHp, power = clamp(.6 + ratio * 5, .6, 2.6), p = FX.center(hud), heavy = o.big || ratio >= .12;
    FX.hitstop(heavy ? 100 : 45);
    Sfx.play(ratio >= .3 ? 'devastating' : heavy ? 'bighit' : 'hit'); if (heavy) Music.duck(ratio >= .3 ? 1.6 : .7);
    FX.flash(t.isMe ? '#ff2a2a' : '#ffffff', heavy ? .5 : .3, heavy ? 320 : 200);
    FX.ring(p.x, p.y, t.isMe ? C.red : '#ffe08a', 360 + ratio * 600, 520, 14);
    FX.ring(p.x, p.y, '#fff', 200 + ratio * 300, 380, 8);
    FX.star(p.x, p.y, t.isMe ? C.red : '#ffe08a', 240 + ratio * 400);
    burst(p.x, p.y, ['#fff', '#ffe08a', C.red, '#ff9a84'], Math.round(20 + ratio * 120), 160 + ratio * 400);
    FX.shake(power); FX.punch(1 + Math.min(.06, .015 + ratio * .1)); BG.pulse(.5 + ratio * 3);
    FX.chunks($('.hpbar', hud), beforePct, clamp(t.hp / t.maxHp * 100, 0, 100), t.isMe ? '#3dff95' : '#ff7a5c');
    popAt(hud, `-${dmg}`, 'dmg' + (o.big ? ' big' : ''));
    if (o.label) popAt($('#ev'), `${o.label} +${dmg}`, 'gold');
    if (st) { const fc = t.isMe ? 'flash' : 'flashop'; st.classList.remove('flash', 'flashop'); void st.offsetWidth; st.classList.add(fc); setTimeout(() => st.classList.remove(fc), 520); }
    hud.classList.remove('hit'); void hud.offsetWidth; hud.classList.add('hit'); setTimeout(() => hud.classList.remove('hit'), 600);
  }
  renderHUD(t); return dmg;
}
/* 이번 공격의 피해를 기여원에 나눠 기록 : 효과 카드 몫 + 나머지는 '포커 족보 공격'(POKER) */
function attribute(win, Cc, dealt, kicker) {
  if (!dealt) return;
  const raw = (Cc.base + Cc.bonus) * Cc.mult; let given = 0;
  if (raw && !kicker) Cc.parts.forEach(p => {
    if (!p.src) return;
    const contrib = p.t === 'b' ? p.v * Cc.mult : (Cc.base + Cc.bonus) * Cc.mult * (1 - 1 / p.v), v = Math.round(dealt * contrib / raw);
    if (v > 0) { stat(win, p.src, 'dmg', v); given += v; if (p.pas) stat(win, p.src, 'uses', 1); }
  });
  const poker = dealt - given;
  if (poker > 0) { stat(win, 'POKER', 'dmg', poker); stat(win, 'POKER', 'uses', 1); }
}
function forecast(sA, sB, A, B, win, diff, kicker) {
  return new Promise(res => {
    const col = (s, sc, Cc) => `<div class="fc-col ${s.isMe ? 'me' : 'op'}"><div class="fc-n">${s.isMe ? '나' : s.name}</div>
      <div class="fc-r"><span>족보</span><b>${Cc.h.name}</b></div><div class="fc-r"><span>최종 점수</span><b class="big num">${sc}</b></div>
      <div class="fc-r"><span>치명타</span><b class="num">${Cc.crit}%</b></div><div class="fc-r"><span>실드</span><b class="num">${s.shield}</b></div>
      <div class="fc-r"><span>감면</span><b class="num">${Math.min(80, s.mods.reduce((a, m) => a + (m.fx.reduce || 0), 0))}%${s.immune ? ' · 무적' : ''}</b></div>
      <div class="fc-r hl"><span>예상 받는 피해</span><b class="num">${win && win !== s ? diff : 0}</b></div></div>`;
    const w = modal(`<div class="fc"><div class="fc-h pix">BATTLE FORECAST <small>전투 예측 · 공격 전 예상 결과</small></div>
      <div class="fc-b">${col(S.me, sA, A)}<div class="fc-mid"><b class="num">${diff}</b><span>${kicker ? `동점 · ${kicker}` : "점수 차"}</span><em>${!win ? '무승부' : win.isMe ? '→ 상대에게' : '← 나에게'}</em></div>${col(S.op, sB, B)}</div>
      <div class="fc-f"><span class="mut">실드·감면·추가 효과는 정산 때 적용됩니다</span>${btn('정산 개시', 'GO', C.red, 'id="fcGo"', 'pri')}</div></div>`, { cls: 'm-game lock', backdrop: false, onClose: res });
    Sfx.play('whoosh');
    $('#fcGo', w).onclick = () => closeModal();
  });
}
function checkDeath() {
  for (const s of [S.me, S.op]) if (s.hp <= 0 && !s.undyingUsed && passives(s).some(e => e.fx.undying)) {
    s.undyingUsed = true; s.hp = 1; stat(s, '♥J', 'uses', 1);
    popAt(s.isMe ? $('#hudMe') : $('#hudOp'), '불사! HP 1로 생존', 'gold'); addLog(`<b>불사</b> 발동 · ${s.isMe ? '나' : '상대'} HP 1`); renderHUD(s);
  }
  if (S.me.hp <= 0 || S.op.hp <= 0) { setTimeout(() => endBattle(S.op.hp <= 0 && S.me.hp > 0, 'HP 0'), 900); return true; }
  return false;
}

/* ---------- 메뉴 / 종료 ---------- */
function battleMenu() {
  const w = settingsModal();
  const f = $('.setm-f', w);
  f.innerHTML = btn('게임 방법', '', C.yellow, 'id="bmGuide"') + btn('족보 가이드', '', C.yellow, 'id="bmHand"') + btn('항복하기', '', C.gray, 'id="bmSur"') + btn('로비로 나가기', '', C.gray, 'id="bmOut"') + btn('계속하기', '', C.blue, 'id="stX"');
  $('#bmGuide', w).onclick = () => guideModal();
  $('#bmHand', w).onclick = () => handGuideModal();
  $('#stX', w).onclick = () => closeModal();
  $('#bmSur', w).onclick = async () => {
    if (!await confirmModal('정말 항복할까요?', '이번 대전은 패배로 기록됩니다.', '항복하기')) return;
    if (!S || S.ended) return; S.me.hp = 0; renderHUD(S.me); endBattle(false, '항복');
  };
  $('#bmOut', w).onclick = () => { closeModal(true); stopTimer(); S.alive = null; S.ended = true; App.go('home'); };
  if (S.ended) $('#bmSur', w).disabled = true;
}
function endBattle(win, why) {
  if (!S || S.ended || !$('#bt')) return; S.ended = true; S.phase = 5; stopTimer(); closeModal(true);
  App.lastResult = buildResult(win);
  App.addHistory({ win, mode: S.mode, rounds: S.round, mvp: App.lastResult.me.mvpName, dmg: App.lastResult.me.total, opp: S.op.name, date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\s/g, '').replace(/\.$/, ''), hp: Math.max(0, S.me.hp) });
  const ov = document.createElement('div'); ov.className = 'endov ' + (win ? 'win' : 'lose');
  ov.innerHTML = `<div class="rays"></div><div class="end-t pix">${(win ? 'VICTORY' : 'DEFEAT').split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
    <div class="end-s">${win ? '승리' : '패배'} · ${why} · ${S.round}라운드</div><div class="end-hp num">나 HP ${Math.max(0, S.me.hp)} · 상대 HP ${Math.max(0, S.op.hp)}</div>
    ${btn('명예의 전당 →', 'HALL OF FAME', win ? C.blue : C.red, '', 'big')}`;
  $('#layer').appendChild(ov);
  $('#bt') && $('#bt').classList.remove('danger');
  Music.setIntense(false); Music.setMood('calm'); Music.play(win ? 'win' : 'lose');
  if (win) { Sfx.play('win'); FX.flash('#ffe08a', .6, 500); setTimeout(() => { burst(720, 330, ['#ffe08a', '#fff', C.blue, C.red], 80, 420); FX.ring(720, 330, '#ffe08a', 900, 900, 18); }, 450); FX.confetti(220); setTimeout(() => FX.confetti(120), 1500); }
  else { Sfx.play('lose'); FX.flash('#ff2a2a', .5, 600); FX.shake(1.6); setTimeout(() => FX.crack(), 200); }
  ov.querySelector('.btn').onclick = () => { ov.remove(); App.go('fame'); };
}
function buildResult(win) {
  const pack = s => {
    const all = Object.entries(s.stats).map(([id, st]) => ({ id, ...st })).filter(c => c.uses || c.dmg || c.shield || c.heal);
    s.inv.forEach(id => { if (!all.find(c => c.id === id)) all.push({ id, uses: 0, dmg: 0, shield: 0, heal: 0, rounds: {} }); });
    const poker = all.find(c => c.id === 'POKER'), cards = all.filter(c => c.id !== 'POKER');
    const last = S.round;
    // MVP 점수 : 결정적(마지막) 라운드 기여 ×2 + 누적 피해 + 지켜낸 양 ×0.8 + 사용 횟수 ×2
    const mvpScore = c => ((c.rounds[last] || {}).dmg || 0) * 2 + c.dmg + (c.shield + c.heal) * .8 + c.uses * 2;
    cards.sort((a, b) => mvpScore(b) - mvpScore(a) || b.dmg - a.dmg);
    const mvp = cards[0];
    const total = all.reduce((a, c) => a + c.dmg, 0), cardDmg = cards.reduce((a, c) => a + c.dmg, 0);
    const shown = cards.slice(0, 6); if (poker) shown.push(poker);
    return { name: s.name, cards: shown, mvp: mvp && mvp.id, mvpName: mvp ? EF[mvp.id].name : '-', total, cardDmg, cardPct: total ? Math.round(cardDmg / total * 100) : 0 };
  };
  return { win, rounds: S.round, myHP: Math.max(0, S.me.hp), opHP: Math.max(0, S.op.hp), me: pack(S.me), op: pack(S.op), mode: S.mode, rules: { ...S.rules }, oppName: S.op.name, sample: false };
}
function sampleResult() {
  const c = (id, uses, dmg, shield, heal, rounds = {}) => ({ id, uses, dmg, shield, heal, rounds });
  return { win: true, rounds: 8, myHP: 18, opHP: 0, mode: '무작위', oppName: 'Rival_K', sample: true,
    me: { name: '플레이어', mvp: '♠Q', mvpName: '심판', total: 312, cards: [c('♠Q', 3, 96, 0, 0, { 2: { uses: 1, dmg: 18 }, 5: { uses: 1, dmg: 30 }, 8: { uses: 1, dmg: 48 } }), c('♠7', 4, 144, 0, 0), c('♠A', 6, 72, 0, 0), c('♥7', 3, 0, 90, 0), c('♥Q', 2, 0, 0, 48)] },
    op: { name: 'Rival_K', mvp: '♠7', mvpName: '연격', total: 280, cards: [c('♠7', 3, 96, 0, 0, { 7: { uses: 1, dmg: 44 } }), c('♠A', 5, 120, 0, 0), c('♠6', 4, 64, 0, 0), c('♥6', 3, 0, 60, 36), c('♥Q', 1, 0, 0, 18)] } };
}
