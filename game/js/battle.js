'use strict';
/* =========================================================
   전장 – 01 드래프트 → 02 전투 패 구성 → 03 쇼다운 준비 → 04 피해 정산
   (특성 기능 제외 버전)
   ========================================================= */
const HANDS = { none: ['—', 0], high: ['하이 카드', 5], pair: ['원 페어', 10], two: ['투 페어', 15], trips: ['트리플', 20], straight: ['스트레이트', 25], flush: ['플러시', 30], full: ['풀 하우스', 35], quads: ['포카드', 45], sf: ['스트레이트 플러시', 55], royal: ['로열 스트레이트 플러시', 70] };
const PV = { A: 14, J: 11, Q: 12, K: 13 };
const pv = r => PV[r] || +r;
function evalHand(cards) {
  if (!cards.length) return { key: 'none', name: '—', base: 0, tb: 0 };
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
  return { key, name: HANDS[key][0], base: HANDS[key][1], tb: vals.reduce((a, v) => a + v, 0) };
}
function best5(hand) {
  let best = null, bi = null;
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const idx = [0, 1, 2, 3, 4, 5, 6].filter(i => i !== a && i !== b), h = evalHand(idx.map(i => hand[i]));
    if (!best || h.base > best.base || (h.base === best.base && h.tb > best.tb)) { best = h; bi = idx; }
  }
  return bi;
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
    <div class="b-sec">족보 점수표</div>
    <div class="htable" id="htable">${Object.entries(HANDS).filter(([k]) => k !== 'none').reverse().map(([k, [n, b]]) => `<div data-k="${k}"><span>${n}</span><b class="num">${b}</b></div>`).join('')}</div>
    <div class="hud me" id="hudMe"></div>
  </div>
  <div class="b-c">
    <div class="opp-row"><div class="pile sm"><span>상대 덱</span></div><div class="opp-hand" id="handOp"></div><div class="opp-tag">상대 전투 패 · 비공개</div></div>
    <div class="evbox" id="ev"></div>
    <div class="tools"><span id="tSel"></span><span id="tHand"></span><span id="tRr" class="tchip"></span><span class="tools-r" id="tHint"></span></div>
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
    const hp = App.rules.startHP;
    const oppName = opts.opp || (opts.mode === '연습' ? `AI · ${DIFFS[App.diff].ko}` : pick(OPP_NAMES));
    S = { alive: Symbol(), round: 0, phase: 0, mode: opts.mode || '연습', rrMode: false, fateMode: false, ended: false,
      me: mkSide(true, App.player.name, App.myDeck.length ? App.myDeck : DEFAULT_DECK, hp), op: mkSide(false, oppName, randomDeck(), hp) };
    const start = ['♠A', '♠K', '♥7'].filter(id => S.me.pool.includes(id));
    (start.length ? start : S.me.pool.slice(0, 3)).forEach(id => { S.me.inv.push(id); S.me.pool = S.me.pool.filter(x => x !== id); });
    S.op.inv = shuffle(S.op.pool).slice(0, 3); S.op.pool = S.op.pool.filter(x => !S.op.inv.includes(x));
    $('.b-menu', el).onclick = battleMenu;
    $('#handMe', el).addEventListener('click', onHandClick);
    $('#fanMe', el).addEventListener('click', e => { const c = e.target.closest('.ec'); if (c) cardDetail(c.dataset.id); });
    $('#fanOp', el).addEventListener('click', e => { const c = e.target.closest('.ec'); if (c && !c.classList.contains('back')) cardDetail(c.dataset.id, true); });
    bindTips(el);
    App.keyH = e => {
      if (e.key === 'Escape') { if ($('#layer .mwrap')) { if (!$('#layer .mwrap.lock')) closeModal(); return true; } battleMenu(); return true; }
      if (S.phase === 2 && /^[1-7]$/.test(e.key)) { onHandClick({ target: $$('#handMe .pc')[+e.key - 1] }); return true; }
      if (e.key === 'Enter') { const b = $('#ev .btn.pri:not([disabled])'); if (b && !$('#layer .mwrap')) { b.click(); return true; } }
      return false;
    };
    addLog(`<b>전투 시작</b> · ${S.me.name} vs ${S.op.name} · HP ${hp}${S.mode === '연습' ? ` · 난이도 ${DIFFS[App.diff].ko}` : ''}`);
    renderAll(); startRound();
  },
};

/* ---------- 렌더 ---------- */
function renderAll() { renderHUD(S.me); renderHUD(S.op); renderFan(S.me); renderFan(S.op); renderHand(); renderOppHand(); renderTools(); renderSteps(); }
function renderSteps() {
  $('#bRound').textContent = S.round; $('#bLimit').textContent = App.rules.turnLimit ? ` / ${App.rules.turnLimit}` : '';
  $$('#bSteps li').forEach(li => { const p = +li.dataset.p; li.className = p === S.phase ? 'on' : p < S.phase ? 'done' : ''; });
}
function renderHUD(side) {
  const el = side.isMe ? $('#hudMe') : $('#hudOp'); if (!el) return;
  if (!el.dataset.init) {
    el.dataset.init = 1;
    el.innerHTML = `<div class="hud-tag pix">${side.isMe ? 'YOU' : 'RIVAL'}</div><div class="hud-row"><div class="hud-av">${side.isMe ? '♠' : '◆'}</div><div class="hud-n">${side.isMe ? '나 (' + side.name + ')' : side.name}<small>${side.isMe ? '내 진영' : S.mode === '연습' ? `AI 난이도 · ${DIFFS[App.diff].ko}` : '상대 진영'}</small></div></div>
      <div class="hud-hp"><span class="pix">HP</span><b class="hp-v num">${side.hp}</b><em class="num">/ ${side.maxHp}</em></div>
      <div class="hpbar"><i class="trail"></i><i class="fill"></i><i class="shb"></i></div><div class="hud-st"></div>`;
  }
  const pct = clamp(side.hp / side.maxHp * 100, 0, 100);
  $('.fill', el).style.width = pct + '%'; $('.trail', el).style.width = pct + '%';
  $('.shb', el).style.width = clamp(side.shield / side.maxHp * 100, 0, 100) + '%';
  $('.hp-v', el).textContent = Math.max(0, side.hp); el.classList.toggle('low', pct <= 30);
  const st = [];
  if (side.shield > 0) st.push(`<span class="st sh">실드 ${side.shield}</span>`);
  side.dots.forEach(d => st.push(`<span class="st dot">지속 피해 ${d.dmg} · ${d.turns}턴</span>`));
  if (side.storm > 0) st.push(`<span class="st storm">패시브 봉인 ${side.storm}턴</span>`);
  if (side.immune) st.push(`<span class="st imm">무적</span>`);
  if (side.counter) st.push(`<span class="st cnt">반격 +${side.counter}</span>`);
  $('.hud-st', el).innerHTML = st.join('') || '<span class="st none">상태 이상 없음</span>';
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
  const n = side.inv.length, mid = (n - 1) / 2, sp = side.isMe ? 104 : 34, rot = side.isMe ? 6 : 7;
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
  $('#tHint').textContent = S.phase === 2 ? (S.rrMode ? '바꿀 카드를 누르세요' : '카드를 눌러 5장 선택 · 숫자키 1~7') : S.fateMode ? '운명: 바꿀 카드를 누르세요' : '';
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
  await c.animate([{ transform: 'none' }, { transform: `translate(${dx}px,${dy}px) scale(1.55) rotate(-3deg)` }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' }).finished;
  const b = document.createElement('div'); b.className = 'fx-badge'; b.innerHTML = `<em>효과 발동!</em><b>${order}</b>`; c.appendChild(b);
  burst(t.x + t.w / 2, t.y + t.h / 2, ['#ffe08a', '#fff', C.red], 22);
  await wait(650);
  await c.animate([{ transform: `translate(${dx}px,${dy}px) scale(1.55) rotate(-3deg)`, opacity: 1 }, { transform: 'none', opacity: .2 }], { duration: 360, easing: 'ease-in', fill: 'forwards' }).finished;
  c.remove(); cardEl.style.opacity = '';
}
async function passiveFlash(side, ids) {
  const fan = side.isMe ? $('#fanMe') : $('#fanOp'); if (!fan || !ids.length) return;
  fan.classList.add('pflash'); let k = 0;
  for (const id of ids) {
    const c = fan.querySelector(`.ec[data-id="${CSS.escape(id)}"]`); if (!c) continue;
    k++; c.classList.add('pon');
    const b = document.createElement('div'); b.className = 'fx-badge sm'; b.innerHTML = `<em>효과 발동!</em><b>${k}</b>`; c.appendChild(b);
    await wait(380);
  }
  await wait(500);
  fan.classList.remove('pflash'); $$('.pon', fan).forEach(c => { c.classList.remove('pon'); c.querySelectorAll('.fx-badge').forEach(x => x.remove()); });
}

/* ---------- 라운드 ---------- */
async function startRound() {
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
      App.after(() => popAt(s.isMe ? $('#hudMe') : $('#hudOp'), `-${tot}`, 'dmg dot'), 300);
    }
  }
  renderAll();
  if (checkDeath()) return;
  if (App.rules.turnLimit && S.round > App.rules.turnLimit) { endBattle(S.me.hp >= S.op.hp, '턴 제한 도달'); return; }
  ev(`<div class="ev-k"><b class="pix">01</b> 라운드 시작 <span class="ev-r num">ROUND ${S.round}</span></div>
    <h2>먼저 효과 카드 1장을 선택하세요.</h2>
    <p>덱에서 뽑은 효과 카드 3장 중 1장을 획득해 장착합니다. 장착 ${S.me.inv.length}/${slotsOf(S.me)} · 빈 슬롯 ${Math.max(0, slotsOf(S.me) - S.me.inv.length)}개 · 효과 덱 ${S.me.pool.length}장</p>
    <div class="ev-row">${evBtn('드래프트 열기 → 02', 'draft', true)}</div>`);
  $('#ev [data-a=draft]').onclick = openDraft;
  if (S.round === 1) App.after(() => { if (S.alive === tok && S.phase === 1 && !$('#layer .mwrap')) openDraft(); }, 900);
}

/* ---------- 드래프트 / 교체 ---------- */
function openDraft() {
  if (S.phase !== 1) return;
  const offer = shuffle(S.me.pool).slice(0, 3);
  if (!offer.length) { toast('효과 덱이 비었습니다 · 드래프트 생략'); oppDraft(); deal(); return; }
  let idx = 0;
  const w = modal(`<div class="draft">
    <div class="dm-h"><div><h2>이번 라운드에 더할 효과를 고르세요.</h2><p>3장 중 1장만 획득 · 확정 전까지는 미리보기</p></div><span class="tagb pix">PICK 1/1</span></div>
    <div class="dm-body"><div class="dm-cards">${offer.map((id, i) => `<div class="dm-c" data-i="${i}"><div class="dm-tag"></div>${cardHTML(EF[id])}</div>`).join('')}</div><div class="dm-prev" id="dmPrev"></div></div>
    <div class="dm-f"><span class="mut">다른 카드를 누르면 선택이 바뀝니다 · 인벤토리가 꽉 차면 교체 화면으로 넘어갑니다</span>${btn('', '', C.red, 'id="dmOk"', 'pri')}</div></div>`, { cls: 'm-game lock', backdrop: false });
  const upd = () => {
    $$('.dm-c', w).forEach((c, i) => { c.classList.toggle('on', i === idx); c.querySelector('.dm-tag').textContent = i === idx ? '✓ 선택됨' : '선택 가능'; });
    const e = EF[offer[idx]], full = S.me.inv.length >= slotsOf(S.me), after = [...S.me.inv, e.id];
    $('#dmPrev', w).innerHTML = `<h3>장착 후 예상 상태</h3>
      <div class="pv-r"><span>효과 인벤토리</span><b class="num">${S.me.inv.length}/${slotsOf(S.me)} → ${full ? '<em class="r">가득 참 · 교체 필요</em>' : `${after.length}/${slotsOf({ inv: after })}`}</b></div>
      <div class="pv-r"><span>액티브 / 패시브</span><b class="num">${deckInfo(after).A} / ${deckInfo(after).P}</b></div>
      <div class="pv-e"><b>${e.suit}${e.rank} ${e.name}</b><p>${e.desc}</p><small>${e.k === 'A' ? `액티브 · 쿨타임 ${e.cd}턴 · 획득 즉시 사용 가능` : '패시브 · 장착 즉시 상시 적용 (상대에게 공개)'}</small></div>`;
    $('#dmOk b', w).textContent = `선택 확정 · ${e.suit}${e.rank} 획득`;
  };
  $$('.dm-c', w).forEach(c => c.onclick = () => { idx = +c.dataset.i; upd(); });
  $('#dmOk', w).onclick = () => {
    if (w._done) return; w._done = true;
    const id = offer[idx]; oppDraft();
    if (S.me.inv.length >= slotsOf(S.me)) { closeModal(true); openReplace(id); return; }
    equip(id, $$('.dm-c .ec', w)[idx]);
  };
  upd();
}
async function equip(id, srcEl) {
  const r = srcEl ? App.rectOf(srcEl) : null; closeModal();
  S.me.pool = S.me.pool.filter(x => x !== id); S.me.inv.push(id); renderFan(S.me);
  const card = $(`#fanMe .ec[data-id="${CSS.escape(id)}"]`);
  if (card && r) { const t = App.rectOf(card); card.animate([{ transform: `translate(${r.x - t.x}px,${r.y - t.y}px) scale(1.1)`, opacity: .4 }, { transform: getComputedStyle(card).transform, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,1.1,.4,1)' }); card.classList.add('new'); }
  addLog(`<b>획득</b> · ${EF[id].suit}${EF[id].rank} ${EF[id].name}`);
  await wait(600); deal();
}
function openReplace(newId) {
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
    const old = S.me.inv[pi]; $$('.rp-c .ec', w)[pi].classList.add('discard'); await wait(380);
    S.me.inv[pi] = newId; delete S.me.cd[old]; S.me.pool = S.me.pool.filter(x => x !== newId);
    closeModal(); addLog(`<b>교체</b> · ${EF[old].name} → ${ne.name}`); renderFan(S.me);
    const c = $(`#fanMe .ec[data-id="${CSS.escape(newId)}"]`); c && c.classList.add('new');
    await wait(400); deal();
  };
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
  addLog(`상대가 효과 카드를 획득 · 장착 ${s.inv.length}`);
}

/* ---------- 전투 패 ---------- */
function deal() {
  S.phase = 2; S.rrMode = false;
  const me = S.me, op = S.op;
  me.hand = drawCards(me, 7, []); me.sel = []; me.rr = [];
  const luck = passives(me).some(e => e.fx.luck) && Math.random() < .5;
  me.rerolls = 1 + (luck ? 1 : 0) + passives(me).reduce((a, e) => a + (e.fx.reroll || 0), 0);
  if (luck) addLog('<b>행운</b> 발동 · 추가 리롤 +1');
  op.hand = drawCards(op, 7, []);
  op.sel = Math.random() < AI().randomPick ? shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 5) : best5(op.hand);
  renderAll(); renderHand(true); evCompose();
}
function evCompose() {
  const s = S.me, h = evalHand(s.sel.map(i => s.hand[i]));
  ev(`<div class="ev-k"><b class="pix">02</b> 전투 패 구성 <span class="ev-r num">선택 ${s.sel.length} / 5</span></div>
    <h2>${s.sel.length ? h.name : '공격할 5장을 고르세요'} ${s.sel.length ? `<small>기본 ${h.base}점</small>` : ''}</h2>
    <p>${S.rrMode ? `리롤 모드 · 바꿀 카드를 표시하세요 (${s.rr.length}장 표시)` : '포커 카드 7장 중 5장을 골라 족보를 만드세요. 액티브 효과 카드도 지금 사용할 수 있습니다.'}</p>
    <div class="ev-row">${S.rrMode ? evBtn('취소', 'rrx') + `<button class="btn sm" style="--c:${C.yellow}" data-a="rrgo" ${s.rr.length ? '' : 'disabled'}><b>리롤 실행 (${s.rr.length}장)</b></button>`
      : evBtn(`리롤 모드 (${s.rerolls})`, 'rr', false, !s.rerolls) + evBtn('최적 5장 자동 선택', 'auto')}
      ${evBtn(s.sel.length === 5 ? '패 확정 → 03' : '5장 선택 필요', 'ok', true, !(s.sel.length === 5 && !S.rrMode))}</div>`);
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
  if (S.rrMode) s.rr = s.rr.includes(i) ? s.rr.filter(x => x !== i) : [...s.rr, i];
  else if (s.sel.includes(i)) s.sel = s.sel.filter(x => x !== i);
  else if (s.sel.length < 5) s.sel.push(i);
  else { shake(c); return; }
  renderHand(); renderTools(); evCompose();
}
async function doReroll() {
  const s = S.me, idx = [...s.rr];
  idx.forEach(i => $$('#handMe .pc')[i].classList.add('flipout'));
  await wait(260);
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
  const u = $('#cdUse', w); if (u && can) u.onclick = () => { closeModal(); useActive(S.me, id); };
}
async function useActive(side, id) {
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
  if (side.isMe) await flyCard($(`#fanMe .ec[data-id="${CSS.escape(id)}"]`), side.usedOrder);
  else { const c = $(`#fanOp .ec[data-id="${CSS.escape(id)}"]`); if (c) { c.classList.add('reveal'); popAt(c, `${e.name}!`, 'opfx'); } await wait(500); }
  const hud = side.isMe ? $('#hudMe') : $('#hudOp');
  if (fx.heal) { const v = Math.min(fx.heal, side.maxHp - side.hp); side.hp += v; stat(side, id, 'heal', v); popAt(hud, `+${v} HP`, 'heal'); }
  if (fx.shield) { side.shield += fx.shield; stat(side, id, 'shield', fx.shield); popAt(hud, `실드 +${fx.shield}`, 'shield'); }
  if (fx.sturdy) { const v = Math.min(20, Math.floor((side.maxHp - side.hp) / 2)); side.shield += v; stat(side, id, 'shield', v); popAt(hud, `실드 +${v}`, 'shield'); }
  if (fx.cleanse) { side.dots = []; popAt(hud, '정화!', 'heal'); }
  if (fx.immune) side.immune = true;
  if (fx.confuse) side.confuse = true;
  if (fx.storm) { oth.storm = fx.storm; popAt(oth.isMe ? $('#hudMe') : $('#hudOp'), '패시브 봉인!', 'opfx'); renderFan(oth); }
  if (fx.refit) { const c = Object.keys(side.cd).filter(x => x !== id && side.cd[x] > 0).sort((a, b) => side.cd[b] - side.cd[a])[0]; if (c) { side.cd[c]--; side.isMe && toast(`재정비 · ${EF[c].name} 쿨타임 -1`, 'ok'); } }
  if (fx.fate && side.isMe) { S.fateMode = true; renderHand(); renderTools(); toast('운명 · 바꿀 포커 카드를 고르세요'); }
  const rc = passives(side).filter(p => p.fx.recycle).length;
  if (rc && Math.random() < .05 * rc) { side.cd[id] = 0; popAt(hud, '순환 발동! 재사용 가능', 'gold'); }
  addLog(`${side.isMe ? '나' : '상대'} · <b>${label}</b> 사용`);
  renderAll();
  if (side.isMe) S.phase === 3 ? evPrep() : S.phase === 2 && evCompose();
}
function fatePick(i) {
  const s = S.me, have = new Set(s.hand.map(c => c.r + c.s));
  const w = modal(`<div class="fate"><h3>운명 · ${s.hand[i].s}${s.hand[i].r}를 무엇으로 바꿀까요?</h3><div class="fate-g">${SUITS.map(su => RANKS.map(r => `<button class="fg ${isRed(su) ? 'red' : ''}" data-c="${r}|${su}" ${have.has(r + su) ? 'disabled' : ''}>${su}${r}</button>`).join('')).join('')}</div></div>`, { cls: 'm-game' });
  $$('.fg', w).forEach(b => b.onclick = () => {
    const [r, su] = b.dataset.c.split('|'); s.hand[i] = { r, s: su }; S.fateMode = false; closeModal();
    renderHand(); $$('#handMe .pc')[i].classList.add('flipin', 'fated'); renderTools();
    addLog(`<b>운명</b> · ${su}${r}로 교체`); S.phase === 3 ? evPrep() : evCompose();
  });
}

/* ---------- 피해 정산 ---------- */
async function resolve() {
  const tok = S.alive, me = S.me, op = S.op;
  S.phase = 4; renderAll();
  ev(`<div class="ev-k"><b class="pix">04</b> 쇼다운 대기</div><h2>상대의 제출을 기다리는 중<span class="blink">_</span></h2>`);
  await wait(700);
  for (const id of shuffle(op.inv.filter(id => EF[id].k === 'A' && !(op.cd[id] > 0)))) {
    if (S.alive !== tok) return;
    if (EF[id].fx.mirror && !op.lastUsed) continue;
    if (Math.random() < AI().useRate) await useActive(op, id);
  }
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
  for (const f of [...$$('#ev .sd-side.op .sd-c'), ...$$('#ev .sd-side.me .sd-c')]) { if (S.alive !== tok) return; f.classList.add('open'); await wait(110); }
  await wait(250);
  await Promise.all([passiveFlash(me, A.parts.filter(p => p.pas).map(p => p.src)), passiveFlash(op, B.parts.filter(p => p.pas).map(p => p.src))]);
  $$('#ev .sd-f').forEach(f => f.classList.add('show'));
  let sA = A.score, sB = B.score;
  if (A.crit && rnd(100) < A.crit) { sA = Math.round(sA * 1.5); popAt($('#sdMe'), 'CRITICAL ×1.5', 'crit'); addLog('<b>치명타!</b> 내 점수 ×1.5'); }
  if (B.crit && rnd(100) < B.crit) { sB = Math.round(sB * 1.5); popAt($('#sdOp'), 'CRITICAL ×1.5', 'crit'); addLog('상대 <b>치명타!</b>'); }
  countUp($('#sdMe'), sA, 800); countUp($('#sdOp'), sB, 800);
  await wait(950); if (S.alive !== tok) return;
  const win = sA > sB ? me : sB > sA ? op : null, lose = win ? other(win) : null, diff = Math.abs(sA - sB);
  if (App.battleOpt.forecast) await forecast(sA, sB, A, B, win, diff);
  if (S.alive !== tok) return;
  const box = $('#ev'); box.classList.add('clash'); await wait(380);
  if (!win) { popAt($('#ev'), '무승부 — 피해 없음', 'tie'); addLog('무승부 · 피해 없음'); }
  else {
    const wm = win.mods, pierce = wm.some(m => m.fx.pierce), brk = wm.reduce((a, m) => a + (m.fx.breakS || 0), 0);
    const dealt = applyDamage(lose, diff, { pierce, brk, big: true });
    attribute(win, win === me ? A : B, dealt);
    addLog(`${win.isMe ? '내' : '상대'} 승리 · ${Math.max(sA, sB)} - ${Math.min(sA, sB)} = <b class="r">${diff}</b> → ${lose.isMe ? '나' : '상대'} HP -${dealt}`);
    await wait(650);
    if (dealt > 0) {
      const ch = wm.find(m => m.fx.chain); if (ch) { const d2 = applyDamage(lose, Math.floor(dealt * ch.fx.chain), { pierce: true, label: '연격' }); stat(win, ch.src, 'dmg', d2); addLog(`<b>연격</b> 추가 피해 ${d2}`); await wait(550); }
      const ag = wm.find(m => m.fx.again); if (ag) { const d3 = applyDamage(lose, diff, { pierce, label: '찬스 스텝' }); stat(win, ag.src, 'dmg', d3); addLog(`<b>찬스 스텝</b> 재결산 ${d3}`); await wait(550); }
      const dt = wm.find(m => m.fx.dot); if (dt) { lose.dots.push({ dmg: dt.fx.dot, turns: 2, src: dt.src }); addLog(`<b>열상</b> · 지속 피해 ${dt.fx.dot} (2턴)`); }
    } else if (wm.some(m => m.fx.again)) addLog('찬스 스텝 불발');
    const cnt = lose.mods.find(m => m.fx.counter); if (cnt && lose._lastTaken === 0) { lose.counter = cnt.fx.counter; addLog(`<b>반격</b> 준비 · 다음 턴 +${cnt.fx.counter}`); }
  }
  for (const s of [me, op]) {
    if (s.counter && !s.mods.some(m => m.fx.counter)) s.counter = 0;
    const av = passives(s).find(e => e.fx.avatar); if (av) { other(s).dots.push({ dmg: av.fx.avatar, turns: 2, src: av.id }); stat(s, av.id, 'uses', 1); }
    if (passives(s).some(e => e.fx.contagion) && s.dots.length) other(s).dots.push({ dmg: 2, turns: 1, src: '◆5' });
  }
  box.classList.remove('clash'); renderAll();
  if (checkDeath()) return;
  if (App.rules.turnLimit && S.round >= App.rules.turnLimit) { await wait(700); endBattle(me.hp >= op.hp, '턴 제한 도달'); return; }
  await wait(500);
  ev(`<div class="ev-k"><b class="pix">04</b> 피해 정산 결과 <span class="ev-r num">ROUND ${S.round}</span></div>
    <div class="ev-2"><div><h2>${!win ? '무승부' : win.isMe ? '공격 성공!' : '피해를 받았습니다'}</h2><p>내 점수 <b>${sA}</b> · 상대 점수 <b>${sB}</b> · 차이 <b class="r">${diff}</b></p></div>
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
    else { const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab; if (ab) setTimeout(() => popAt(hud, `실드 -${ab}`, 'shield'), 150); }
  }
  t.hp -= dmg; t._lastTaken = dmg;
  const st = $('#bt');
  if (dmg > 0) {
    popAt(hud, `-${dmg}`, 'dmg' + (o.big ? ' big' : ''));
    if (o.label) popAt($('#ev'), `${o.label} +${dmg}`, 'gold');
    if (st) { const fc = t.isMe ? 'flash' : 'flashop'; shake(st, o.big ? 'hitbig' : 'shake'); st.classList.remove('flash', 'flashop'); void st.offsetWidth; st.classList.add(fc); setTimeout(() => st.classList.remove(fc), 520); }
    hud.classList.add('hit'); setTimeout(() => hud.classList.remove('hit'), 500);
  }
  renderHUD(t); return dmg;
}
function attribute(win, Cc, dealt) {
  const raw = (Cc.base + Cc.bonus) * Cc.mult; if (!dealt || !raw) return;
  Cc.parts.forEach(p => {
    if (!p.src) return;
    const contrib = p.t === 'b' ? p.v * Cc.mult : (Cc.base + Cc.bonus) * Cc.mult * (1 - 1 / p.v), v = Math.round(dealt * contrib / raw);
    if (v > 0) { stat(win, p.src, 'dmg', v); if (p.pas) stat(win, p.src, 'uses', 1); }
  });
}
function forecast(sA, sB, A, B, win, diff) {
  return new Promise(res => {
    const col = (s, sc, Cc) => `<div class="fc-col ${s.isMe ? 'me' : 'op'}"><div class="fc-n">${s.isMe ? '나' : s.name}</div>
      <div class="fc-r"><span>족보</span><b>${Cc.h.name}</b></div><div class="fc-r"><span>최종 점수</span><b class="big num">${sc}</b></div>
      <div class="fc-r"><span>치명타</span><b class="num">${Cc.crit}%</b></div><div class="fc-r"><span>실드</span><b class="num">${s.shield}</b></div>
      <div class="fc-r"><span>감면</span><b class="num">${Math.min(80, s.mods.reduce((a, m) => a + (m.fx.reduce || 0), 0))}%${s.immune ? ' · 무적' : ''}</b></div>
      <div class="fc-r hl"><span>예상 받는 피해</span><b class="num">${win && win !== s ? diff : 0}</b></div></div>`;
    const w = modal(`<div class="fc"><div class="fc-h pix">BATTLE FORECAST <small>전투 예측 · 공격 전 예상 결과</small></div>
      <div class="fc-b">${col(S.me, sA, A)}<div class="fc-mid"><b class="num">${diff}</b><span>점수 차</span><em>${!win ? '무승부' : win.isMe ? '→ 상대에게' : '← 나에게'}</em></div>${col(S.op, sB, B)}</div>
      <div class="fc-f"><span class="mut">실드·감면·추가 효과는 정산 때 적용됩니다</span>${btn('정산 개시', 'GO', C.red, 'id="fcGo"', 'pri')}</div></div>`, { cls: 'm-game lock', backdrop: false, onClose: res });
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
  f.innerHTML = btn('항복하기', '', C.gray, 'id="bmSur"') + btn('로비로 나가기', '', C.gray, 'id="bmOut"') + btn('계속하기', '', C.blue, 'id="stX"');
  $('#stX', w).onclick = () => closeModal();
  $('#bmSur', w).onclick = () => { closeModal(true); S.me.hp = 0; renderHUD(S.me); endBattle(false, '항복'); };
  $('#bmOut', w).onclick = () => { closeModal(true); S.alive = null; App.go('home'); };
}
function endBattle(win, why) {
  if (!S || S.ended) return; S.ended = true; S.phase = 5; closeModal(true);
  App.lastResult = buildResult(win);
  App.addHistory({ win, mode: S.mode, rounds: S.round, mvp: App.lastResult.me.mvpName, dmg: App.lastResult.me.total, opp: S.op.name, date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\s/g, '').replace(/\.$/, ''), hp: Math.max(0, S.me.hp) });
  const ov = document.createElement('div'); ov.className = 'endov ' + (win ? 'win' : 'lose');
  ov.innerHTML = `<div class="rays"></div><div class="end-t pix">${(win ? 'VICTORY' : 'DEFEAT').split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
    <div class="end-s">${win ? '승리' : '패배'} · ${why} · ${S.round}라운드</div><div class="end-hp num">나 HP ${Math.max(0, S.me.hp)} · 상대 HP ${Math.max(0, S.op.hp)}</div>
    ${btn('명예의 전당 →', 'HALL OF FAME', win ? C.blue : C.red, '', 'big')}`;
  $('#layer').appendChild(ov);
  if (win) setTimeout(() => burst(720, 330, ['#ffe08a', '#fff', C.blue, C.red], 60, 380), 500);
  ov.querySelector('.btn').onclick = () => { ov.remove(); App.go('fame'); };
}
function buildResult(win) {
  const pack = s => {
    const cards = Object.entries(s.stats).map(([id, st]) => ({ id, ...st })).filter(c => c.uses || c.dmg || c.shield || c.heal);
    s.inv.forEach(id => { if (!cards.find(c => c.id === id)) cards.push({ id, uses: 0, dmg: 0, shield: 0, heal: 0, rounds: {} }); });
    cards.sort((a, b) => b.dmg - a.dmg || b.uses - a.uses);
    const last = S.round;
    let mvp = cards.slice().sort((a, b) => ((b.rounds[last] || {}).dmg || 0) - ((a.rounds[last] || {}).dmg || 0))[0];
    if (!mvp || !((mvp.rounds[last] || {}).dmg)) mvp = cards[0];
    return { name: s.name, cards: cards.slice(0, 6), mvp: mvp && mvp.id, mvpName: mvp ? EF[mvp.id].name : '-', total: cards.reduce((a, c) => a + c.dmg, 0) };
  };
  return { win, rounds: S.round, myHP: Math.max(0, S.me.hp), opHP: Math.max(0, S.op.hp), me: pack(S.me), op: pack(S.op), mode: S.mode, oppName: S.op.name, sample: false };
}
function sampleResult() {
  const c = (id, uses, dmg, shield, heal, rounds = {}) => ({ id, uses, dmg, shield, heal, rounds });
  return { win: true, rounds: 8, myHP: 18, opHP: 0, mode: '무작위', oppName: 'Rival_K', sample: true,
    me: { name: '플레이어', mvp: '♠Q', mvpName: '심판', total: 312, cards: [c('♠Q', 3, 96, 0, 0, { 2: { uses: 1, dmg: 18 }, 5: { uses: 1, dmg: 30 }, 8: { uses: 1, dmg: 48 } }), c('♠7', 4, 144, 0, 0), c('♠A', 6, 72, 0, 0), c('♥7', 3, 0, 90, 0), c('♥Q', 2, 0, 0, 48)] },
    op: { name: 'Rival_K', mvp: '♠7', mvpName: '연격', total: 280, cards: [c('♠7', 3, 96, 0, 0, { 7: { uses: 1, dmg: 44 } }), c('♠A', 5, 120, 0, 0), c('♠6', 4, 64, 0, 0), c('♥6', 3, 0, 60, 36), c('♥Q', 1, 0, 0, 18)] } };
}
