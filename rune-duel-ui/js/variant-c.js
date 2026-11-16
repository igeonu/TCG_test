'use strict';
/* =========================================================
   C안 : 스큐어모피즘 기반 디제틱형 — 사물 메타포 (메달 · 초대장 · 책 · 두루마리)
   참고 : 하스스톤 UI / 이동 : 두꺼운 테두리 안의 [◀ 돌아가기]
   ========================================================= */
const MOD_C = {
  title: '디제틱형', cls: 'vC', bg: '#21160d',
  names: { lobby: '로비 (보드)', match: '무작위 매칭 (메달)', friend: '친구와 경기 (초대장)', practice: '연습 대전 (초상 메달)', cards: '카드 살펴보기 (책)', deck: '나만의 덱 (상자)', history: '대전 기록 (두루마리)' },
  screens: {}, bind: {},
  memo: `<span class="tag">C안 · 스큐어모피즘 디제틱형</span><h3>사물 메타포 — 메달 · 초대장 · 책 · 두루마리</h3>
  <p>가운데 보드에 1VS1 경기와 연습 대전을 쌓고, 네 모서리에 프로필 · 카드 살펴보기(책) · 대전 기록(두루마리) · 나만의 덱(상자).</p>
  <h4>하위 화면</h4><ul><li>무작위 매칭: 두 영웅 명판 사이 큰 메달이 회전하며 상대 탐색</li><li>친구와 경기: 종이 대전 초대장(방 코드 + 규칙 체크) + 둥근 친구 목록 + 밀랍 봉인 연출</li><li>연습 대전: AI 초상 메달 3개 + 덱 상자 고르기(뚜껑 열림)</li><li>카드 살펴보기: 문양 책갈피(♠♥♣♦)가 달린 펼친 책, 한 쪽에 4장, 페이지 넘김</li><li>나만의 덱: 카드 책 + 오른쪽 덱 리스트 (같은 카드 2장은 ×2)</li><li>대전 기록: 메달 통계 + 펼쳐지는 두루마리 속 리본 목록</li></ul>
  <h4>장점 / 고려할 점</h4><p>화면마다 사물로 용도가 보여 기억하기 쉽고 따뜻함. 장식 그래픽 작업량이 가장 많고 한 화면에 보이는 카드 수가 적음.</p>`,
  chrome: () => `<div class="c-frame"></div>`,
  trans(old, el, { to }) {
    old.style.pointerEvents = 'none';
    old.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: 260, fill: 'forwards' });
    el.animate([{ opacity: 0, transform: 'perspective(1200px) rotateX(10deg) scale(.92) translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 120, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'backwards' });
    setTimeout(() => old.remove(), 300);
  },
};
App.reg('C', MOD_C);
const cBack = (t) => `<button class="c-back" data-go="lobby">◀ 돌아가기</button><div class="c-title">${t}</div>`;
function cBind(el) { $$('[data-go]', el).forEach(b => b.addEventListener('click', () => App.go(b.dataset.go))); }

/* ---------- 로비 ---------- */
MOD_C.screens.lobby = () => `
  <div class="c-prof"><span class="c-av"></span><div><b>${App.player.name}</b><small>LV. ${App.player.lv} · ${deckSummary(App.myDeck)} 덱</small></div></div>
  <div class="c-logo"><h1>RUNE DUEL</h1><span>룬 결투</span></div>
  <div class="c-board"><small>1VS1 대전</small>
    <div class="c-two"><button class="c-big gold" data-go="match"><b>무작위 상대</b><span>빠른 매칭</span></button><button class="c-big gold" data-go="friend"><b>친구와 경기</b><span>방 만들기 · 코드</span></button></div>
    <button class="c-big wood" data-go="practice"><b>연습 대전</b><span>AI 상대</span></button>
    <hr><p>덱은 오른쪽 아래 상자에서 바꿀 수 있어요</p></div>
  <button class="c-corner tr" data-go="history"><span class="c-ci">${ui('scroll', 36)}</span><b>대전 기록</b></button>
  <button class="c-set">설정</button>
  <button class="c-corner bl" data-go="cards"><span class="c-ci">${ui('book', 36)}</span><b>카드 살펴보기</b></button>
  <button class="c-corner br" data-go="deck"><span class="c-ci">${ui('box', 36)}</span><b>나만의 덱</b></button>
  <div class="c-embers">${Array.from({ length: 14 }, (_, i) => `<i style="--x:${rnd(100)}%;--d:${4 + rnd(6)}s;--dl:${-rnd(8)}s"></i>`).join('')}</div>`;
MOD_C.bind.lobby = el => { cBind(el); $('.c-set', el).onclick = () => toast('설정 화면은 시안 범위 밖입니다'); };

/* ---------- 무작위 매칭 ---------- */
MOD_C.screens.match = () => `${cBack('무작위 상대 찾기')}
  <div class="c-mt"><div class="c-plate me"><span class="c-por">${App.player.name[0]}</span><b>${App.player.name}</b><small>LV. ${App.player.lv} · HP ${App.rules.startHP}</small></div>
  <div class="c-medal" id="cMed"><div class="c-mf front"><span id="cMs">♠</span></div><div class="c-mf back"><span>VS</span></div></div>
  <div class="c-plate op" id="cOp"><span class="c-por q">?</span><b>상대를 찾는 중<span class="c-dots"><i>.</i><i>.</i><i>.</i></span></b><small id="cT">00:00</small></div></div>
  <div class="c-mfoot"><button class="c-big wood sm" id="cCancel"><b>찾기 취소</b></button></div>`;
MOD_C.bind.match = el => {
  cBind(el);
  let t = 0; App.every(() => { t++; const e = $('#cT', el); if (e) e.textContent = '대기 ' + fmtTime(t); }, 1000);
  App.every(() => { $('#cMs', el).textContent = pick(SUITS); }, 700);
  $('#cCancel', el).onclick = () => App.go('lobby');
  App.after(() => {
    const opp = pick(OPP_NAMES); App.clear();
    $('#cMed', el).classList.add('stop');
    const op = $('#cOp', el); op.classList.add('found'); op.innerHTML = `<span class="c-por">${opp[0]}</span><b>${opp}</b><small>LV. ${10 + rnd(30)} · 여관의 단골</small>`;
    const r = App.rectOf($('#cMed', el)); burst(r.x + r.w / 2, r.y + r.h / 2, ['#f2a93b', '#ffe3a3', '#fff'], 36, $('#layer'), 200);
    const c = $('#cCancel', el); c.className = 'c-big gold sm'; c.innerHTML = '<b>결투 시작!</b>'; c.onclick = () => App.startBattle({ mode: '무작위', opp: { name: opp } });
  }, 3600 + rnd(1500));
};

/* ---------- 친구와 경기 (초대장) ---------- */
MOD_C.screens.friend = () => {
  const code = roomCode(), R = App.rules;
  const FR = [['은빛딜러', 1], ['HeartGuard', 1], ['Joker_77', 0], ['ClubKing', 1], ['룬마스터', 0], ['SpadeAce', 1]];
  return `${cBack('친구와 경기')}
  <div class="c-fw"><div class="c-inv" id="cInv"><div class="c-inh"><small>대 전 초 대 장</small><h2>룬 결투에 그대를 초대합니다</h2></div>
    <div class="c-code"><span>방 코드</span><b>${code}</b><button class="c-cp" data-code="${code}">${ui('copy', 16)}</button></div>
    <div class="c-rules">
      ${[['turnLimit', '턴 제한 (15턴)', R.turnLimit > 0], ['traitOpen', '특성 공개', R.traitOpen], ['hp150', '시작 HP 150 (기본 100)', R.startHP === 150], ['timer', '턴당 시간 60초', R.turnTime === 60]].map(([k, t, on]) => `<label class="c-ck ${on ? 'on' : ''}" data-k="${k}"><span class="c-box"><svg viewBox="0 0 24 24"><path d="M4 13l5 5L20 6"/></svg></span>${t}</label>`).join('')}
    </div>
    <div class="c-to"><span>받는 이</span><b id="cTo">친구를 고르세요 →</b></div>
    <div class="c-sign">— ${App.player.name} 드림</div>
    <div class="c-seal" id="cSeal">룬</div></div>
  <div class="c-frl"><h3>친구 목록</h3><div class="c-rounds">${FR.map(([n, on], i) => `<button class="c-fr ${on ? 'on' : 'off'}" data-n="${n}" ${on ? '' : 'disabled'} style="--i:${i}"><span>${n[0]}</span><b>${n}</b><small>${on ? '접속 중' : '자리 비움'}</small></button>`).join('')}</div>
    <button class="c-big gold" id="cSend" disabled><b>초대장 보내기</b><span>밀랍으로 봉인</span></button></div></div>`;
};
MOD_C.bind.friend = el => {
  cBind(el);
  let to = null; const R = App.rules;
  $$('.c-ck', el).forEach(c => c.onclick = e => {
    e.preventDefault(); c.classList.toggle('on'); const on = c.classList.contains('on'), k = c.dataset.k;
    if (k === 'turnLimit') R.turnLimit = on ? 15 : 0; if (k === 'traitOpen') R.traitOpen = on; if (k === 'hp150') R.startHP = on ? 150 : 100; if (k === 'timer') R.turnTime = on ? 60 : 0;
  });
  $('.c-cp', el).onclick = () => toast('방 코드를 복사했어요', 'ok');
  $$('.c-fr', el).forEach(b => b.onclick = () => { to = b.dataset.n; $$('.c-fr', el).forEach(x => x.classList.toggle('sel', x === b)); $('#cTo', el).textContent = to; $('#cTo', el).animate([{ transform: 'scale(1.3)', color: '#c0392b' }, { transform: 'none' }], { duration: 350 }); $('#cSend', el).disabled = false; });
  $('#cSend', el).onclick = () => {
    const s = $('#cSeal', el); s.classList.add('stamp'); $('#cSend', el).disabled = true;
    setTimeout(() => { $('#cInv', el).classList.add('fly'); }, 900);
    setTimeout(() => { toast(`${to} 님에게 초대장을 보냈어요`, 'ok'); }, 1500);
    App.after(() => { toast(`${to} 님이 초대를 받아들였어요!`, 'ok'); App.after(() => App.startBattle({ mode: '친구', opp: { name: to } }), 900); }, 3000);
  };
};

/* ---------- 연습 대전 ---------- */
const C_AI = [['견습생', 2, '입문', '🎓', '규칙을 막 배운 견습생. 실수가 잦아요.'], ['여관 주인', 5, '보통', '🍺', '손님을 상대로 단련한 노련한 주인장.'], ['대마법사', 8, '숙련', '🔮', '전설 카드를 아끼지 않는 고위 마법사.']];
const C_BOX = [['내 덱', () => deckSummary(App.myDeck), '#c0392b'], ['기본 덱', () => '하트 방어', '#2e6b8a'], ['무작위 덱', () => '매 판 새로 구성', '#5b3d8a']];
MOD_C.screens.practice = () => `${cBack('연습 대전')}
  <div class="c-pt"><h3>상대를 고르세요</h3><div class="c-meds">${C_AI.map(([n, l, g, ic, d], i) => `<button class="c-pm ${i === 1 ? 'sel' : ''}" data-i="${i}"><div class="c-pmc"><span>${ic}</span></div><b>${n}</b><small>LV.${l} · ${g}</small><p>${d}</p></button>`).join('')}</div>
  <h3>덱 상자를 고르세요</h3><div class="c-boxes">${C_BOX.map(([n, f, c], i) => `<button class="c-dbox ${i === 0 ? 'sel' : ''}" data-i="${i}" style="--c:${c}"><div class="c-lid"></div><div class="c-body"><b>${n}</b><small>${f()}</small></div></button>`).join('')}</div>
  <button class="c-big gold" id="cPgo"><b>연습 시작</b><span id="cPs">여관 주인 · 내 덱</span></button></div>`;
MOD_C.bind.practice = el => {
  cBind(el); let ai = 1, bx = 0;
  const upd = () => $('#cPs', el).textContent = `${C_AI[ai][0]} · ${C_BOX[bx][0]}`;
  $$('.c-pm', el).forEach(b => b.onclick = () => { ai = +b.dataset.i; $$('.c-pm', el).forEach(x => x.classList.toggle('sel', x === b)); upd(); });
  $$('.c-dbox', el).forEach(b => b.onclick = () => { bx = +b.dataset.i; $$('.c-dbox', el).forEach(x => x.classList.toggle('sel', x === b)); upd(); });
  $('#cPgo', el).onclick = () => { App.cpu = C_AI[ai][1]; if (bx === 1) App.myDeck = [...DEFAULT_DECK]; if (bx === 2) App.myDeck = App.rand52(); App.startBattle({ mode: '연습', opp: { name: C_AI[ai][0] } }); };
};

/* ---------- 카드 살펴보기 (책) ---------- */
MOD_C.screens.cards = () => `${cBack('카드 도감')}
  <div class="c-book" id="cBook"><div class="c-marks" id="cMarks">${SUITS.map((s, i) => `<button class="c-mark ${!i ? 'on' : ''} ${isRed(s) ? 'red' : ''}" data-s="${s}">${s}</button>`).join('')}</div>
  <div class="c-page l" id="cPl"></div><div class="c-page r" id="cPr"></div><div class="c-spine"></div>
  <button class="c-turn prev" id="cPrev">◀</button><button class="c-turn next" id="cNext">▶</button><div class="c-pno" id="cPno"></div></div>`;
function cPageHTML(list, side) { return `<div class="c-pg4">${list.map(e => cardHTML(e)).join('')}${Array.from({ length: 4 - list.length }, () => '<div class="c-slot"></div>').join('')}</div><div class="c-pgn">${side}</div>`; }
MOD_C.bind.cards = el => {
  cBind(el); let suit = '♠', spread = 0;
  const L = () => EFFECTS.filter(e => e.suit === suit);
  const max = () => Math.ceil(L().length / 8) - 1;
  const draw = () => { const l = L(), a = l.slice(spread * 8, spread * 8 + 4), b = l.slice(spread * 8 + 4, spread * 8 + 8); $('#cPl', el).innerHTML = cPageHTML(a, spread * 2 + 1); $('#cPr', el).innerHTML = cPageHTML(b, spread * 2 + 2); $('#cPno', el).textContent = `${SUITNAME[suit]} · ${spread + 1} / ${max() + 1}`; $('#cPrev', el).disabled = spread === 0; $('#cNext', el).disabled = spread >= max(); };
  const flip = (dir, fn) => {
    const page = document.createElement('div'); page.className = 'c-flip ' + (dir > 0 ? 'fwd' : 'bwd');
    page.innerHTML = (dir > 0 ? $('#cPr', el) : $('#cPl', el)).innerHTML; $('#cBook', el).appendChild(page);
    setTimeout(() => { fn(); }, 300); setTimeout(() => page.remove(), 620);
  };
  $('#cNext', el).onclick = () => { if (spread < max()) flip(1, () => { spread++; draw(); }); };
  $('#cPrev', el).onclick = () => { if (spread > 0) flip(-1, () => { spread--; draw(); }); };
  $$('.c-mark', el).forEach(m => m.onclick = () => { if (m.dataset.s === suit) return; const d = SUITS.indexOf(m.dataset.s) > SUITS.indexOf(suit) ? 1 : -1; $$('.c-mark', el).forEach(x => x.classList.toggle('on', x === m)); flip(d, () => { suit = m.dataset.s; spread = 0; draw(); }); });
  $('#cBook', el).addEventListener('click', e => {
    const c = e.target.closest('.c-page .ec'); if (!c) return; const ex = EF[c.dataset.id];
    modal(`<div class="c-zoom">${cardHTML(ex)}<div><small>${GRADES[ex.g].ko} · ${ex.k === 'A' ? '액티브' : '패시브'} · ${ex.cat}</small><h2>${ex.name}</h2><p>${ex.desc}</p><p class="c-zm">${ex.k === 'A' ? `쿨타임 ${ex.cd}턴` : '상시 효과 · 상대에게 공개'}<br>${App.myDeck.includes(ex.id) ? '✔ 내 덱에 들어 있어요' : '내 덱에 없어요'}</p><button class="c-big gold sm" onclick="closeModal()"><b>책으로 돌아가기</b></button></div></div>`, { cls: 'm-c' });
  });
  App.keyH = e => { if (e.key === 'ArrowRight') { $('#cNext', el).click(); return true; } if (e.key === 'ArrowLeft') { $('#cPrev', el).click(); return true; } return false; };
  draw();
};

/* ---------- 나만의 덱 ---------- */
MOD_C.screens.deck = () => `${cBack('나만의 덱')}
  <div class="c-dw"><div class="c-mini-book"><div class="c-marks h" id="cDm">${SUITS.map((s, i) => `<button class="c-mark ${!i ? 'on' : ''} ${isRed(s) ? 'red' : ''}" data-s="${s}">${s}</button>`).join('')}</div><div class="c-col" id="cCol"></div></div>
  <div class="c-list"><div class="c-lh"><h3>덱 목록</h3><b id="cCnt"></b></div><div class="c-lim" id="cLim"></div><div class="c-rows" id="cRows"></div><button class="c-big wood sm" id="cRst"><b>기본 덱으로</b></button></div></div>`;
MOD_C.bind.deck = el => {
  cBind(el); let suit = '♠';
  const render = (nw) => {
    const d = App.myDeck, inf = deckInfo(d);
    $('#cCol', el).innerHTML = EFFECTS.filter(e => e.suit === suit).map(e => `<button class="c-cc ${d.includes(e.id) ? 'in' : ''} g-${e.g} ${isRed(e.suit) ? 'red' : ''}" data-id="${e.id}"><b>${e.suit}${e.rank}</b><span>${e.name}</span><small>${GRADES[e.g].ko}</small>${d.includes(e.id) ? '<i>✔</i>' : ''}</button>`).join('');
    $('#cCnt', el).textContent = `${inf.n} / 26`;
    $('#cLim', el).innerHTML = `<span class="${inf.E > 6 ? 'bad' : ''}">영웅 ${inf.E}/6</span><span class="${inf.L > 2 ? 'bad' : ''}">전설 ${inf.L}/2</span>`;
    const groups = {}; d.forEach(id => { const n = EF[id].name; (groups[n] = groups[n] || []).push(id); });
    $('#cRows', el).innerHTML = Object.entries(groups).sort((a, b) => GRADE_ORDER[EF[b[1][0]].g] - GRADE_ORDER[EF[a[1][0]].g] || a[0].localeCompare(b[0], 'ko')).map(([n, ids]) => `<button class="c-row g-${EF[ids[0]].g} ${ids.includes(nw) ? 'new' : ''}" data-id="${ids[ids.length - 1]}"><span class="c-gem"></span><b>${n}</b><small>${ids.map(i => i).join(' ')}</small>${ids.length > 1 ? `<em>×${ids.length}</em>` : ''}</button>`).join('');
  };
  $('#cCol', el).onclick = e => { const b = e.target.closest('.c-cc'); if (!b) return; const id = b.dataset.id; if (App.myDeck.includes(id)) { App.myDeck = App.myDeck.filter(x => x !== id); render(); return; } const er = canAdd(App.myDeck, id); if (er) { toast(er, 'err'); shake(b); return; } App.myDeck.push(id); const r = App.rectOf(b); burst(r.x + r.w / 2, r.y + r.h / 2, ['#f2a93b', '#fff'], 10, $('#layer'), 60); render(id); };
  $('#cRows', el).onclick = e => { const b = e.target.closest('.c-row'); if (!b) return; b.classList.add('out'); setTimeout(() => { App.myDeck = App.myDeck.filter(x => x !== b.dataset.id); render(); }, 220); };
  $$('#cDm .c-mark', el).forEach(m => m.onclick = () => { suit = m.dataset.s; $$('#cDm .c-mark', el).forEach(x => x.classList.toggle('on', x === m)); render(); });
  $('#cRst', el).onclick = () => { App.myDeck = [...DEFAULT_DECK]; render(); toast('기본 덱으로 되돌렸어요'); };
  render();
};

/* ---------- 대전 기록 (두루마리) ---------- */
MOD_C.screens.history = () => {
  const s = historyStats(App.history);
  return `${cBack('대전 기록')}
  <div class="c-hw"><div class="c-medals">${[['승률', s.rate + '%', 'gold'], ['승리', s.wins, 'blue'], ['패배', s.losses, 'red']].map(([l, v, c], i) => `<div class="c-sm ${c}" style="--i:${i}"><div class="c-smc"><b>${v}</b></div><span>${l}</span></div>`).join('')}
    <div class="c-best"><small>최고 연승</small><b>${s.best}연승</b><small>최다 MVP</small><b>${s.topMvp} (${s.topMvpN})</b></div></div>
  <div class="c-scroll"><div class="c-roll top"></div><div class="c-paper" id="cPaper"><div class="c-ribbons">${App.history.map((h, i) => `<div class="c-rib ${h.win ? 'w' : 'l'}" style="--i:${i}"><span class="c-rt">${h.win ? '승리' : '패배'}</span><b>vs ${h.opp}</b><span>${h.mode} · ${h.rounds}라운드</span><span>MVP ${h.mvp}</span><em>${h.date}</em></div>`).join('')}</div></div><div class="c-roll bot"></div></div></div>`;
};
MOD_C.bind.history = el => { cBind(el); };

injectCSS(`
.vC{inset:16px!important;border-radius:26px;background:radial-gradient(ellipse at 50% 40%,#3a2614,#26190e 70%);color:#f3e3c3;font-family:'Noto Sans KR'}
.vC button{font-family:inherit;color:inherit;cursor:pointer}
.chrome-C .c-frame{position:absolute;inset:16px;border:7px solid #8a5a32;border-radius:26px;box-shadow:inset 0 0 0 2px #5a3920,inset 0 0 60px rgba(0,0,0,.6),0 0 0 2px #3d2715}
.c-big{position:relative;border-radius:16px;padding:14px 22px;display:flex;flex-direction:column;align-items:center;transition:transform .12s,box-shadow .12s,filter .2s;border:3px solid}
.c-big b{font:400 30px 'Noto Sans KR';font-weight:500}.c-big span{font-size:13px;font-weight:700}
.c-big.gold{background:linear-gradient(180deg,#f8b947,#e99a2c);border-color:#ffd38a;color:#3b2414!important;box-shadow:0 6px 0 #9b5f17,0 10px 20px rgba(0,0,0,.4)}
.c-big.wood{background:#4a3019;border-color:#7a5232;color:#f3e3c3;box-shadow:0 6px 0 #2a1a0c,0 10px 20px rgba(0,0,0,.4)}
.c-big:hover:not([disabled]){filter:brightness(1.1);transform:translateY(-2px)}
.c-big:active:not([disabled]){transform:translateY(5px);box-shadow:0 1px 0 #9b5f17}
.c-big.wood:active:not([disabled]){box-shadow:0 1px 0 #2a1a0c}
.c-big[disabled]{filter:grayscale(.7) brightness(.7);cursor:not-allowed}
.c-big.sm{padding:10px 26px}.c-big.sm b{font-size:20px}
.c-prof{position:absolute;left:28px;top:28px;display:flex;align-items:center;gap:12px;background:#4a3019;border:3px solid #7a5232;border-radius:40px;padding:8px 22px 8px 10px}
.c-av{width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd38a,#e99a2c)}.c-prof b{display:block;font-size:15px}.c-prof small{font-size:11px;color:#c9b08a}
.c-logo{position:absolute;left:0;right:0;top:110px;text-align:center;line-height:1.1}.c-logo h1{margin:0;font:400 64px 'Noto Sans KR';letter-spacing:.06em;color:#f2a93b;text-shadow:0 3px 0 #6b3f12,0 0 30px #f2a93b44}.c-logo span{font-size:26px}
.c-board{position:absolute;left:50%;top:262px;width:560px;margin-left:-280px;background:#3a2716;border:6px solid #7a5232;border-radius:28px;padding:26px 30px;display:flex;flex-direction:column;gap:14px;box-shadow:inset 0 0 30px rgba(0,0,0,.5),0 20px 40px rgba(0,0,0,.4);animation:cBoard .7s cubic-bezier(.2,1.3,.4,1)}
@keyframes cBoard{from{transform:translateY(40px) scale(.9);opacity:0}}
.c-board>small{text-align:center;font-weight:700;color:#c9b08a}
.c-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.c-board hr{border:0;border-top:2px solid #6b4526;margin:4px 10px}.c-board p{text-align:center;font-size:12px;color:#c9b08a;margin:0}
.c-corner{position:absolute;display:flex;flex-direction:column;align-items:center;gap:8px;background:none;border:0}
.c-corner b{font-size:20px;font-weight:500}
.c-ci{width:118px;height:118px;border-radius:50%;background:#4a3019;border:5px solid #7a5232;display:flex;align-items:center;justify-content:center;color:#f2a93b;transition:transform .25s cubic-bezier(.2,1.8,.4,1),box-shadow .25s;box-shadow:0 6px 0 #2a1a0c}
.c-corner:hover .c-ci{transform:translateY(-6px) rotate(-6deg);box-shadow:0 12px 0 #2a1a0c,0 0 30px #f2a93b66;border-color:#f2a93b}
.c-corner:active .c-ci{transform:translateY(2px);box-shadow:0 2px 0 #2a1a0c}
.c-corner.tr{right:24px;top:20px}.c-corner.bl{left:28px;bottom:24px}.c-corner.br{right:24px;bottom:24px}
.c-set{position:absolute;right:44px;top:208px;background:#3a2716;border:3px solid #7a5232;border-radius:30px;padding:8px 20px;font-weight:700;font-size:13px}.c-set:hover{border-color:#f2a93b}
.c-embers{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:26px}
.c-embers i{position:absolute;left:var(--x);bottom:-10px;width:4px;height:4px;border-radius:50%;background:#f2a93b;box-shadow:0 0 8px #f2a93b;animation:cEmb var(--d) linear infinite;animation-delay:var(--dl);opacity:.7}
@keyframes cEmb{to{transform:translate(30px,-820px);opacity:0}}
.c-back{position:absolute;left:28px;top:26px;background:#4a3019;border:3px solid #7a5232;border-radius:14px;padding:10px 20px;font-size:16px;font-weight:700;box-shadow:0 4px 0 #2a1a0c;transition:.12s;z-index:5}
.c-back:hover{border-color:#f2a93b;color:#f2a93b}.c-back:active{transform:translateY(3px);box-shadow:0 1px 0 #2a1a0c}
.c-title{position:absolute;left:0;right:0;top:30px;text-align:center;font:400 30px 'Noto Sans KR';color:#f2a93b;text-shadow:0 2px 0 #6b3f12;pointer-events:none}
/* match */
.c-mt{position:absolute;left:60px;right:60px;top:150px;height:400px;display:grid;grid-template-columns:1fr 300px 1fr;align-items:center}
.c-plate{background:linear-gradient(180deg,#5a3a1e,#3a2716);border:5px solid #8a5a32;border-radius:20px;padding:30px;display:flex;flex-direction:column;align-items:center;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:.4s}
.c-plate.op{border-style:dashed;border-color:#6b4526}.c-plate.found{border-style:solid;border-color:#f2a93b;animation:cBoard .5s}
.c-por{width:120px;height:120px;border-radius:50%;border:5px solid #f2a93b;background:radial-gradient(circle at 40% 35%,#8a5a32,#3a2716);display:flex;align-items:center;justify-content:center;font:400 54px 'Noto Sans KR';color:#ffe3a3}
.c-por.q{border-color:#6b4526;color:#6b4526;animation:cQ 1.4s infinite}@keyframes cQ{50%{opacity:.4}}
.c-plate b{font-size:24px;font-weight:500}.c-plate small{color:#c9b08a}
.c-dots i{font-style:normal;animation:dots 1.2s infinite}.c-dots i:nth-child(2){animation-delay:.2s}.c-dots i:nth-child(3){animation-delay:.4s}
.c-medal{position:relative;width:220px;height:220px;margin:auto;transform-style:preserve-3d;animation:cSpin 1.6s linear infinite}
@keyframes cSpin{to{transform:rotateY(360deg)}}
.c-medal.stop{animation:cStop 1s cubic-bezier(.2,1.2,.4,1) forwards}@keyframes cStop{from{transform:rotateY(0)}to{transform:rotateY(540deg) scale(1.1)}}
.c-mf{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;background:radial-gradient(circle at 35% 30%,#ffe3a3,#f2a93b 45%,#a8661a);border:8px solid #ffd38a;box-shadow:inset 0 0 0 6px #c27d22,0 0 50px #f2a93b55;display:flex;align-items:center;justify-content:center}
.c-mf span{font:400 96px 'Noto Sans KR';color:#5a3410;text-shadow:0 2px 0 #ffe3a3}
.c-mf.back{transform:rotateY(180deg)}.c-mf.back span{font-size:80px;font-weight:700}
.c-mfoot{position:absolute;left:0;right:0;bottom:60px;display:flex;justify-content:center}
/* friend */
.c-fw{position:absolute;left:60px;right:60px;top:100px;bottom:40px;display:grid;grid-template-columns:1fr 420px;gap:40px;align-items:center}
.c-inv{position:relative;background:#f3e3c3;color:#3b2414;padding:36px 44px;transform:rotate(-1.5deg);box-shadow:0 20px 40px rgba(0,0,0,.5);border-radius:4px;background-image:radial-gradient(circle at 20% 30%,#e8d2a6 0 2px,transparent 3px),radial-gradient(circle at 70% 80%,#e8d2a6 0 2px,transparent 3px);background-size:60px 60px;clip-path:polygon(0 2%,3% 0,20% 1%,40% 0,60% 1%,80% 0,97% 1%,100% 3%,99% 30%,100% 60%,99% 97%,96% 100%,70% 99%,40% 100%,10% 99%,1% 100%,0 70%,1% 40%);transition:transform .8s cubic-bezier(.6,-.3,.4,1),opacity .8s}
.c-inv.fly{transform:translate(500px,-200px) rotate(25deg) scale(.4);opacity:0}
.c-inh{text-align:center;border-bottom:2px solid #c9a46a;padding-bottom:10px}.c-inh small{letter-spacing:.5em;font-weight:700;color:#8a5a32}.c-inh h2{font:700 28px 'Gowun Batang';margin:6px 0 0}
.c-code{display:flex;align-items:center;justify-content:center;gap:12px;margin:18px 0}.c-code span{font-size:13px;color:#8a5a32}.c-code b{font:700 40px 'Gowun Batang';letter-spacing:.08em}
.c-cp{background:none;border:2px solid #8a5a32;border-radius:8px;padding:6px;color:#8a5a32!important}.c-cp:hover{background:#8a5a3222}
.c-rules{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}
.c-ck{display:flex;align-items:center;gap:10px;font:700 16px 'Gowun Batang';cursor:pointer}
.c-box{width:26px;height:26px;border:2.5px solid #3b2414;border-radius:4px;display:flex;align-items:center;justify-content:center;transform:rotate(-3deg)}
.c-box svg{width:22px;height:22px;fill:none;stroke:#c0392b;stroke-width:3.5;stroke-linecap:round;stroke-dasharray:30;stroke-dashoffset:30;transition:stroke-dashoffset .3s}
.c-ck.on .c-box svg{stroke-dashoffset:0}
.c-to{margin-top:22px;display:flex;gap:12px;align-items:baseline;border-bottom:1.5px dashed #8a5a32;padding-bottom:6px}.c-to span{font-size:13px;color:#8a5a32}.c-to b{font:700 22px 'Gowun Batang';display:inline-block}
.c-sign{text-align:right;font:700 18px 'Gowun Batang';margin-top:16px;color:#5a3410}
.c-seal{position:absolute;right:40px;bottom:60px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#e0473a,#9b1f16);color:#ffd9c9;font:700 34px 'Gowun Batang';display:flex;align-items:center;justify-content:center;box-shadow:0 4px 0 #6b1009,inset 0 0 0 6px #b52a1e;opacity:0;transform:scale(3) rotate(-30deg)}
.c-seal.stamp{animation:cSeal .5s cubic-bezier(.5,0,.6,1.6) forwards}@keyframes cSeal{to{opacity:1;transform:scale(1) rotate(-12deg)}}
.c-frl{display:flex;flex-direction:column;gap:18px}.c-frl h3{font:400 24px 'Noto Sans KR';margin:0;text-align:center}
.c-rounds{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.c-fr{background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:4px;animation:cBoard .5s calc(var(--i)*.06s) both}
.c-fr span{width:84px;height:84px;border-radius:50%;border:4px solid #7a5232;background:radial-gradient(circle at 40% 35%,#8a5a32,#3a2716);display:flex;align-items:center;justify-content:center;font-size:30px;transition:.2s}
.c-fr.on span{box-shadow:0 0 0 3px #3a2716,0 0 0 6px #6fd38f}.c-fr b{font-size:13px}.c-fr small{font-size:11px;color:#c9b08a}
.c-fr:hover:not([disabled]) span{transform:translateY(-4px) scale(1.05);border-color:#f2a93b}.c-fr.sel span{border-color:#f2a93b;background:radial-gradient(circle at 40% 35%,#ffd38a,#e99a2c);color:#3b2414}
.c-fr[disabled]{opacity:.45;cursor:not-allowed}
/* practice */
.c-pt{position:absolute;left:60px;right:60px;top:100px;bottom:30px;display:flex;flex-direction:column;align-items:center;gap:12px}
.c-pt h3{margin:4px 0 0;font:400 20px 'Noto Sans KR';color:#c9b08a}
.c-meds{display:flex;gap:40px}
.c-pm{width:250px;background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:4px;transition:transform .3s}
.c-pmc{width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe3a3,#c27d22 60%,#6b3f12);padding:10px;box-shadow:0 8px 0 #3a2716,0 10px 30px rgba(0,0,0,.5);transition:.3s}
.c-pmc span{display:flex;width:100%;height:100%;border-radius:50%;background:#3a2716;align-items:center;justify-content:center;font-size:64px;border:3px solid #ffd38a}
.c-pm b{font-size:22px;font-weight:500;margin-top:8px}.c-pm small{color:#c9b08a}.c-pm p{font-size:12px;color:#c9b08a;margin:2px 0 0;text-align:center}
.c-pm:hover .c-pmc{transform:rotate(-8deg) translateY(-4px)}
.c-pm.sel .c-pmc{box-shadow:0 8px 0 #3a2716,0 0 0 6px #f2a93b,0 0 50px #f2a93b88}.c-pm.sel{transform:scale(1.06)}
.c-boxes{display:flex;gap:26px}
.c-dbox{width:180px;height:120px;background:none;border:0;position:relative;perspective:400px}
.c-lid{position:absolute;left:-6px;right:-6px;top:0;height:30px;background:var(--c);filter:brightness(1.2);border-radius:8px;border:3px solid #ffd38a55;transform-origin:50% 0;transition:transform .45s cubic-bezier(.2,1.4,.4,1);z-index:2}
.c-body{position:absolute;left:0;right:0;top:24px;bottom:0;background:var(--c);border-radius:0 0 10px 10px;border:3px solid #00000044;display:flex;flex-direction:column;align-items:center;justify-content:center}
.c-body b{font-size:17px;font-weight:700}.c-body small{font-size:11px;opacity:.85}
.c-dbox:hover .c-lid{transform:rotateX(35deg)}.c-dbox.sel .c-lid{transform:rotateX(70deg) translateY(-6px)}.c-dbox.sel .c-body{box-shadow:0 0 0 4px #f2a93b,0 0 30px #f2a93b77}
.c-pt>.c-big{margin-top:auto;min-width:300px}
/* book */
.c-book{position:absolute;left:110px;right:110px;top:96px;bottom:44px;perspective:2000px}
.c-page{position:absolute;top:0;bottom:0;width:50%;background:#f3e3c3;color:#3b2414;padding:26px 30px 30px}
.c-page.l{left:0;border-radius:14px 4px 4px 14px;box-shadow:inset -30px 0 40px -20px rgba(90,52,16,.5),0 16px 30px rgba(0,0,0,.5)}
.c-page.r{right:0;border-radius:4px 14px 14px 4px;box-shadow:inset 30px 0 40px -20px rgba(90,52,16,.5),0 16px 30px rgba(0,0,0,.5)}
.c-spine{position:absolute;left:50%;top:0;bottom:0;width:4px;margin-left:-2px;background:#8a5a32}
.c-pg4{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:16px;height:calc(100% - 20px)}
.c-pgn{text-align:center;font:700 13px 'Gowun Batang';color:#8a5a32}
.c-slot{border:2px dashed #d7bf92;border-radius:10px}
.vC .ec{background:#fffaf0;color:#3b2414;border:2.5px solid #8a5a32;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;box-shadow:0 4px 0 #c9a46a;transition:.2s;cursor:pointer;overflow:hidden}
.vC .ec:hover{transform:translateY(-4px) rotate(-1deg);box-shadow:0 10px 0 #c9a46a}
.vC .ec .ec-code{font:700 20px 'Gowun Batang'}.vC .ec.red .ec-code{color:#b8322a}.vC .ec .ec-g{font-size:10px;color:#8a5a32}
.vC .ec .ec-n{font:700 20px 'Gowun Batang'}.vC .ec .ec-t{font-size:10px;color:#8a5a32}.vC .ec .ec-ic{color:#c27d22}.vC .ec .ec-d{font-size:11px;line-height:1.35}.vC .ec .ec-f{font-size:10px;font-weight:700;color:#8a5a32}
.vC .ec.g-E{border-color:#7b4ba3}.vC .ec.g-L{border-color:#e99a2c;background:linear-gradient(180deg,#fff3d1,#fffaf0)}
.c-marks{position:absolute;top:-30px;right:60px;display:flex;gap:6px;z-index:3}
.c-mark{width:54px;height:58px;border:0;border-radius:6px 6px 0 0;background:#7a5232;color:#f3e3c3;font-size:24px;transition:transform .2s;clip-path:polygon(0 0,100% 0,100% 100%,50% 84%,0 100%)}
.c-mark.red{color:#ff9a8a}.c-mark:hover{transform:translateY(-6px)}.c-mark.on{background:#c0392b;transform:translateY(-10px);color:#fff}
.c-turn{position:absolute;top:50%;width:54px;height:54px;margin-top:-27px;border-radius:50%;background:#4a3019;border:4px solid #7a5232;font-size:18px;z-index:4;transition:.15s}
.c-turn.prev{left:-78px}.c-turn.next{right:-78px}.c-turn:hover:not([disabled]){border-color:#f2a93b;transform:scale(1.1)}.c-turn[disabled]{opacity:.3}
.c-pno{position:absolute;left:0;right:0;bottom:-34px;text-align:center;font-size:13px;color:#c9b08a}
.c-flip{position:absolute;top:0;bottom:0;width:50%;background:#f3e3c3;color:#3b2414;padding:26px 30px 30px;z-index:5;backface-visibility:hidden;box-shadow:0 0 40px rgba(0,0,0,.3)}
.c-flip.fwd{right:0;transform-origin:0 50%;animation:cFwd .6s ease-in forwards;border-radius:4px 14px 14px 4px}
.c-flip.bwd{left:0;transform-origin:100% 50%;animation:cBwd .6s ease-in forwards;border-radius:14px 4px 4px 14px}
@keyframes cFwd{to{transform:rotateY(-180deg)}}@keyframes cBwd{to{transform:rotateY(180deg)}}
.m-c .mbox{background:#f3e3c3;color:#3b2414;border:6px solid #8a5a32;border-radius:18px}
.c-zoom{display:grid;grid-template-columns:auto 360px;gap:30px;padding:30px;align-items:center}
.c-zoom .ec{width:240px;height:330px;background:#fffaf0;color:#3b2414;border:3px solid #8a5a32;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:4px;box-shadow:0 6px 0 #c9a46a;animation:cBoard .4s}
.c-zoom .ec .ec-code,.c-zoom .ec .ec-n{font:700 28px 'Gowun Batang'}.c-zoom .ec .ec-ic{color:#c27d22;margin:auto}.c-zoom .ec .ec-ic svg{width:70px;height:70px}.c-zoom .ec-g,.c-zoom .ec-t,.c-zoom .ec-f{font-size:12px;color:#8a5a32}
.c-zoom small{color:#8a5a32;font-weight:700}.c-zoom h2{font:700 36px 'Gowun Batang';margin:4px 0}.c-zoom p{font-size:16px}.c-zm{font-size:13px!important;color:#8a5a32}
/* deck */
.c-dw{position:absolute;left:60px;right:60px;top:100px;bottom:36px;display:grid;grid-template-columns:1fr 380px;gap:30px}
.c-mini-book{position:relative;background:#f3e3c3;border-radius:14px;padding:30px 26px 20px;box-shadow:inset 0 0 40px rgba(90,52,16,.35),0 16px 30px rgba(0,0,0,.5);margin-top:24px}
.c-marks.h{top:-34px;left:24px;right:auto}
.c-col{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.c-cc{position:relative;height:120px;background:#fffaf0;color:#3b2414!important;border:2.5px solid #8a5a32;border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;box-shadow:0 4px 0 #c9a46a;transition:.15s}
.c-cc b{font:700 18px 'Gowun Batang'}.c-cc.red b{color:#b8322a}.c-cc span{font:700 15px 'Gowun Batang'}.c-cc small{margin-top:auto;font-size:10px;color:#8a5a32}
.c-cc.g-E{border-color:#7b4ba3}.c-cc.g-L{border-color:#e99a2c}
.c-cc:hover{transform:translateY(-4px)}.c-cc:active{transform:translateY(2px);box-shadow:0 1px 0 #c9a46a}
.c-cc.in{background:#e9d4a8;opacity:.75}.c-cc i{position:absolute;right:8px;top:6px;font-style:normal;color:#2e7d32;font-size:18px}
.c-list{background:#3a2716;border:5px solid #7a5232;border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:10px;min-height:0}
.c-lh{display:flex;justify-content:space-between;align-items:center}.c-lh h3{margin:0;font-weight:500;font-size:22px}.c-lh b{color:#f2a93b;font-size:20px}
.c-lim{display:flex;gap:8px}.c-lim span{font-size:12px;background:#4a3019;border-radius:20px;padding:3px 10px}.c-lim span.bad{background:#c0392b}
.c-rows{flex:1;overflow:auto;display:flex;flex-direction:column;gap:5px}
.c-row{display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,#5a3a1e,#4a3019);border:2px solid #6b4526;border-radius:10px;padding:7px 12px;text-align:left;transition:.15s}
.c-row:hover{border-color:#c0392b}.c-row:hover::after{content:'빼기';font-size:11px;color:#ff9a8a;margin-left:6px}
.c-gem{width:14px;height:14px;transform:rotate(45deg);background:#9aa0a6;flex-shrink:0}.c-row.g-R .c-gem{background:#3c8dde}.c-row.g-E .c-gem{background:#9b59d0}.c-row.g-L .c-gem{background:#f2a93b;box-shadow:0 0 8px #f2a93b}
.c-row b{font-size:15px;font-weight:500}.c-row small{font-size:11px;color:#c9b08a;flex:1}.c-row em{font-style:normal;font-weight:900;color:#f2a93b;font-size:16px}
.c-row.new{animation:cBoard .4s}.c-row.out{animation:aOut .22s forwards}
/* history */
.c-hw{position:absolute;left:60px;right:60px;top:100px;bottom:30px;display:grid;grid-template-columns:330px 1fr;gap:40px}
.c-medals{display:flex;flex-direction:column;gap:16px;align-items:center}
.c-sm{display:flex;align-items:center;gap:18px;width:100%;animation:cBoard .6s calc(var(--i)*.12s) both}
.c-smc{width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 0 #2a1a0c;border:6px solid #ffd38a;background:radial-gradient(circle at 35% 30%,#ffe3a3,#f2a93b 55%,#a8661a)}
.c-sm.blue .c-smc{border-color:#a9d4ff;background:radial-gradient(circle at 35% 30%,#d5ecff,#3c8dde 55%,#1a4d80)}.c-sm.red .c-smc{border-color:#ffb3a8;background:radial-gradient(circle at 35% 30%,#ffd6cf,#c0392b 55%,#6b1009)}
.c-smc b{font:400 34px 'Noto Sans KR';color:#3b2414;text-shadow:0 1px 0 #fff8}.c-sm.blue b,.c-sm.red b{color:#fff;text-shadow:0 2px 0 #0004}
.c-sm span{font-size:24px}
.c-best{width:100%;background:#3a2716;border:4px solid #7a5232;border-radius:16px;padding:14px 18px;display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:baseline}.c-best small{color:#c9b08a}.c-best b{font-size:18px;font-weight:500;color:#f2a93b}
.c-scroll{display:flex;flex-direction:column;align-items:stretch;min-height:0}
.c-roll{height:30px;border-radius:15px;background:linear-gradient(180deg,#c9a46a,#8a5a32 50%,#5a3a1e);box-shadow:0 4px 10px rgba(0,0,0,.5);z-index:2;margin:0 -16px}
.c-paper{flex:1;background:#f3e3c3;margin:-8px 0;padding:24px 26px;overflow:auto;box-shadow:inset 0 10px 20px -10px rgba(90,52,16,.6),inset 0 -10px 20px -10px rgba(90,52,16,.6);animation:cUnroll 1s cubic-bezier(.6,0,.2,1) both;transform-origin:50% 0}
@keyframes cUnroll{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
.c-ribbons{display:flex;flex-direction:column;gap:8px}
.c-rib{position:relative;display:grid;grid-template-columns:90px 1fr 140px 120px 60px;align-items:center;gap:10px;color:#3b2414;padding:10px 18px 10px 0;background:#ead6ad;border-radius:4px;animation:cRib .5s calc(var(--i)*.06s + .8s) both}
@keyframes cRib{from{opacity:0;transform:translateX(-30px)}}
.c-rt{align-self:stretch;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;background:#2e6b8a;clip-path:polygon(0 0,100% 0,88% 50%,100% 100%,0 100%);margin-left:-10px;padding-right:8px}
.c-rib.l .c-rt{background:#a83228}
.c-rib b{font:700 16px 'Gowun Batang'}.c-rib span{font-size:12px}.c-rib em{font-style:normal;font-size:12px;color:#8a5a32}
.c-rib:hover{background:#f7e6c2;transform:translateX(6px);transition:.15s}
.toast.tv-C{background:#f3e3c3;color:#3b2414;border:4px solid #8a5a32;border-radius:16px}.toast.tv-C.err{background:#a83228;color:#fff}.toast.tv-C.ok{background:#f2a93b;color:#3b2414}
`);
