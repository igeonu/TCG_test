'use strict';
/* =========================================================
   A안 : 타일형(패널형) 그리드 메뉴 — 큰 타일 · 전체 화면 분할 · 큰 숫자
   참고 : 대난투 스매시브라더스 UI / 이동 : 상단 바 [← 로비]
   ========================================================= */
let A_src = null;
const MOD_A = {
  title: '타일형', cls: 'vA', bg: '#000',
  names: { lobby: '로비', match: '무작위 매칭', friend: '친구와 경기', practice: '연습 대전', cards: '카드 살펴보기', deck: '나만의 덱', history: '대전 기록' },
  screens: {}, bind: {},
  memo: `<span class="tag">A안 · 타일형(패널형) 그리드 메뉴형</span><h3>큰 타일 · 전체 화면 분할 · 큰 숫자</h3>
  <p>크기가 다른 타일로 메뉴를 나누고, 가장 자주 쓰는 1VS1 경기 타일이 화면의 절반 가까이를 차지합니다.</p>
  <h4>하위 화면</h4><ul><li>무작위 매칭: 좌우 분할 VS (오른쪽 "?" 슬롯 연출 → 상대 발견 → 카운트다운)</li><li>친구와 경기: 3단계 진행 표시 + 큰 규칙 타일 4개 (클릭으로 값 순환)</li><li>연습 대전: CPU 레벨 1~9 막대</li><li>카드 살펴보기: 가운데 한 장 크게 + 13장 바로가기 줄 (←→ 키)</li><li>나만의 덱: 26칸 타일판 + 장수·영웅·전설 제한 큰 숫자</li><li>대전 기록: 큰 숫자 타일 + 최근 경기 카드</li></ul>
  <h4>상호작용</h4><ul><li>방향키로 타일 이동, Enter 결정, Esc 뒤로</li><li>타일을 누르면 그 타일 위치에서 화면이 확장되는 전환</li></ul>
  <h4>장점 / 고려할 점</h4><p>처음 보는 사람도 바로 알 수 있고 결과 화면과 분위기가 이어짐. 정보가 많은 화면은 페이지 이동이 늘어남.</p>`,
  trans(old, el, { to }) {
    old.style.pointerEvents = 'none';
    if (to !== 'lobby' && A_src) {
      const r = A_src; const from = `inset(${r.y}px ${1440 - r.x - r.w}px ${810 - r.y - r.h}px ${r.x}px)`;
      el.animate([{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: 480, easing: 'cubic-bezier(.75,0,.2,1)' });
      el.querySelectorAll('.a-anim').forEach((x, i) => x.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 260 + i * 60, easing: 'cubic-bezier(.2,1,.3,1)', fill: 'backwards' }));
    } else {
      old.style.zIndex = 2;
      old.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.94)', opacity: 0 }], { duration: 320, easing: 'ease-in', fill: 'forwards' });
      el.querySelectorAll('.a-tile').forEach((x, i) => x.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 120 + i * 50, easing: 'cubic-bezier(.2,1,.3,1)', fill: 'backwards' }));
    }
    setTimeout(() => old.remove(), 490); A_src = null;
  },
};
App.reg('A', MOD_A);
function aGo(btn, screen, opts) { A_src = App.rectOf(btn); App.go(screen, opts); }
const aTop = (en, ko, extra = '') => `<div class="a-top"><button class="a-back" data-nav data-go="lobby">← 로비</button><div class="a-tt"><small>${en}</small><b>${ko}</b></div>${extra}<div class="a-prof"><span class="av"></span><div class="a-pn"><b>${App.player.name}</b><small>LV. ${App.player.lv}</small></div></div></div>`;
const aFoot = (t = '') => `<div class="a-foot"><span><b>Enter</b> 결정 <b>Esc</b> 뒤로 <b>← →</b> 이동</span><span>${t}</span></div>`;
function aBindCommon(el) {
  $$('[data-go]', el).forEach(b => b.addEventListener('click', () => aGo(b, b.dataset.go)));
  App.keyH = e => spatialNav(el, e.key);
}

/* ---------- 로비 ---------- */
MOD_A.screens.lobby = () => {
  const st = historyStats(App.history), d = App.myDeck;
  const showDeck = ['♠A', '♠K', '♠4', '♥7', '♣7'].filter(id => d.includes(id)).concat(d).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
  const tc = traitCounts(showDeck).find(x => x.t.id === 'S');
  return `<div class="a-bar"><div class="a-logo"><i></i>RUNE DUEL <small>룬 결투 · 1V1 POKER DUEL</small></div><div class="a-prof"><span class="av"></span><div class="a-pn"><b>${App.player.name}</b><small>LV. ${App.player.lv}</small></div><button class="a-set" data-nav>⚙ 설정</button></div></div>
  <div class="a-grid">
    <div class="a-tile a-big" data-k="battle">
      <div class="a-k"><i></i>대전 · BATTLE</div>
      <div class="a-1v1">1VS1</div><h2>경기</h2>
      <p>무작위 상대 또는 친구와 HP를 걸고 겨룹니다. 포커 족보로 공격하고, 효과 카드로 승리 조건을 쌓으세요.</p>
      <div class="a-suits">${['♠', '♥', '◆', '♣', '♠'].map((s, i) => `<span style="--i:${i}" class="${i === 2 ? 'w' : ''}">${s}</span>`).join('')}</div>
      <div class="a-pick">경기 방식을 고르세요</div>
      <div class="a-btn2"><button class="a-b w" data-nav data-go="match"><b>무작위 상대와 경기</b><small>빠른 매칭 · 비슷한 실력의 상대</small><em>→</em></button>
      <button class="a-b o" data-nav data-go="friend"><b>친구와 경기</b><small>방 만들기 · 초대 코드로 입장</small><em>→</em></button></div>
    </div>
    <button class="a-tile a-prac" data-nav data-go="practice"><div><small>PRACTICE · VS AI</small><h3>연습 대전</h3><p>AI 상대와 덱과 규칙을 부담 없이 시험해 봅니다.</p></div><div class="a-ai">AI</div><em>→</em></button>
    <div class="a-tile a-cd"><small>CARDS & DECK</small><h3>카드 / 덱 <span>효과 카드 52장 · 4문양 × 13</span></h3>
      <div class="a-cdw"><div><div class="a-cur">현재 덱 · ${deckSummary(d)}</div><div class="a-minis">${showDeck.map(id => `<div class="a-mini ${EF[id].suit === '♠' ? 'bl' : ''}"><b>${EF[id].suit}${EF[id].rank}</b><span>${EF[id].name}</span></div>`).join('')}</div>
      <div class="a-trait">${tc.tier >= 0 ? `♠ ${tc.n}/${tc.n} · 최종 피해 ×${tc.val} 활성` : `♠ ${tc.n}/${tc.next} · 특성 비활성`}</div></div>
      <div class="a-cdb"><button class="a-b o sm" data-nav data-go="cards"><b>카드 살펴보기</b><small>효과 카드 52장 도감</small><em>→</em></button><button class="a-b o sm" data-nav data-go="deck"><b>나만의 덱</b><small>덱 편집 · 52장 중 ${d.length}장 구성</small><em>→</em></button></div></div>
    </div>
    <button class="a-tile a-his" data-nav data-go="history"><div><small>MATCH HISTORY</small><h3>대전 기록</h3></div><div class="a-last"><small>최근 경기</small><b>${App.history[0].win ? '승리' : '패배'} · ${App.history[0].rounds}라운드 · MVP ${App.history[0].mvp}</b></div>
      <div class="a-sq"><small>최근 10경기 · ${historyStats(App.history.slice(0, 10)).wins}승 ${historyStats(App.history.slice(0, 10)).losses}패</small><div>${App.history.slice(0, 10).map((h, i) => `<i class="${h.win ? 'w' : 'l'}" style="--i:${i}"></i>`).join('')}</div></div><em>→</em></button>
  </div>
  ${aFoot('로비 시안 v0.1 · 기록과 덱 정보는 예시 데이터')}`;
};
MOD_A.bind.lobby = el => {
  aBindCommon(el);
  $('.a-set', el).onclick = () => toast('설정 화면은 시안 범위 밖입니다');
  setTimeout(() => { const f = $('[data-go=match]', el); f && f.focus({ preventScroll: true }); }, 50);
};

/* ---------- 무작위 매칭 ---------- */
MOD_A.screens.match = () => `
  ${aTop('RANDOM MATCH', '무작위 매칭')}
  <div class="a-vs">
    <div class="a-me a-anim"><small>YOU · 1P</small><div class="a-nm">${App.player.name}</div><div class="a-lv">LV. ${App.player.lv} · ${deckSummary(App.myDeck)} 덱</div>
      <div class="a-minis">${App.myDeck.slice(0, 5).map(id => `<div class="a-mini"><b>${EF[id].suit}${EF[id].rank}</b><span>${EF[id].name}</span></div>`).join('')}</div>
      <div class="a-hpbig"><small>START HP</small><b>${App.rules.startHP}</b></div></div>
    <div class="a-op"><small>RIVAL · 2P</small><div class="a-q" id="aQ">?</div><div class="a-opi" id="aOpi">상대를 찾는 중<span class="a-dots"><i>.</i><i>.</i><i>.</i></span></div></div>
    <div class="a-vsb" id="aVs">VS</div>
  </div>
  <div class="a-mbar"><div><small>경과 시간</small><b id="aT">00:00</b></div><div><small>예상 대기</small><b>00:08</b></div><div><small>규칙</small><b>HP ${App.rules.startHP} · ${App.rules.turnLimit ? App.rules.turnLimit + '턴 제한' : '턴 제한 없음'}</b></div>
  <button class="a-b w" data-nav id="aCancel"><b>매칭 취소</b><em>×</em></button></div>`;
MOD_A.bind.match = el => {
  aBindCommon(el);
  let t = 0, found = false; const q = $('#aQ', el);
  App.every(() => { t++; $('#aT', el).textContent = fmtTime(t); }, 1000);
  const glyphs = ['?', '♠', '♥', '♣', '◆', ...OPP_NAMES.map(n => n[0])];
  App.every(() => { if (!found) q.textContent = pick(glyphs); }, 110);
  $('#aCancel', el).onclick = () => { toast('매칭을 취소했습니다'); App.go('lobby'); };
  App.after(() => {
    found = true; const opp = pick(OPP_NAMES);
    q.textContent = opp[0]; q.classList.add('found');
    $('.a-op', el).classList.add('found');
    $('#aOpi', el).innerHTML = `<div class="a-nm">${opp}</div><div class="a-lv">LV. ${8 + rnd(20)} · 비슷한 실력의 상대</div><div class="a-cnt" id="aCnt">3</div>`;
    $('#aVs', el).classList.add('slam'); shake(el.querySelector('.a-vs'));
    const c = $('#aCancel', el); c.innerHTML = '<b>전장 입장</b><em>→</em>'; c.onclick = () => App.startBattle({ mode: '무작위', opp: { name: opp } });
    let n = 3; App.every(() => { n--; const ce = $('#aCnt', el); if (ce) { ce.textContent = n || 'GO'; ce.classList.remove('pop'); void ce.offsetWidth; ce.classList.add('pop'); } if (n <= 0) App.after(() => App.startBattle({ mode: '무작위', opp: { name: opp } }), 500); }, 1000);
  }, 3200 + rnd(1800));
};

/* ---------- 친구와 경기 ---------- */
const A_RULES = [
  { k: 'turnLimit', t: '턴 제한', vals: [0, 10, 15, 20], fmt: v => v ? v : 'OFF', u: v => v ? '턴' : '' },
  { k: 'turnTime', t: '턴당 시간', vals: [30, 60, 90, 0], fmt: v => v || '∞', u: v => v ? '초' : '' },
  { k: 'startHP', t: '시작 HP', vals: [60, 100, 150], fmt: v => v, u: () => 'HP' },
  { k: 'traitOpen', t: '특성 공개', vals: [true, false], fmt: v => v ? 'ON' : 'OFF', u: v => v ? '공개' : '비공개' },
];
MOD_A.screens.friend = () => `${aTop('PLAY WITH FRIEND', '친구와 경기')}<div class="a-steps" id="aSteps"></div><div class="a-fbody" id="aFb"></div>${aFoot('방 규칙은 전장에 그대로 적용됩니다')}`;
MOD_A.bind.friend = el => {
  aBindCommon(el);
  let step = 1, method = 'make', code = roomCode();
  const steps = ['방식 고르기', '방 규칙 정하기', '친구 기다리기'];
  const render = () => {
    $('#aSteps', el).innerHTML = steps.map((s, i) => `<div class="a-st ${i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}"><b>${i + 1 < step ? '✓' : '0' + (i + 1)}</b><span>${s}</span></div>`).join('') + `<div class="a-stbar"><i style="width:${(step - 1) / 2 * 100}%"></i></div>`;
    const fb = $('#aFb', el);
    if (step === 1) fb.innerHTML = `<div class="a-two"><button class="a-tile a-mt ${method === 'make' ? 'sel' : ''}" data-nav data-m="make"><small>CREATE ROOM</small><h3>방 만들기</h3><p>규칙을 정하고 초대 코드를 친구에게 보냅니다.</p><div class="a-bigico">+</div></button>
      <button class="a-tile a-mt ${method === 'code' ? 'sel' : ''}" data-nav data-m="code"><small>JOIN BY CODE</small><h3>코드로 입장</h3><p>친구에게 받은 초대 코드를 입력합니다.</p><input class="a-in" id="aCode" maxlength="7" placeholder="RD-XXXX" ${method === 'code' ? '' : 'tabindex="-1"'}></button></div>
      <div class="a-next"><button class="a-b w" data-nav id="aNext"><b>다음 단계</b><em>→</em></button></div>`;
    if (step === 2) fb.innerHTML = `<div class="a-rules">${A_RULES.map(r => `<button class="a-tile a-rule" data-nav data-r="${r.k}"><small>${r.t}</small><div class="a-rv"><b>${r.fmt(App.rules[r.k])}</b><span>${r.u(App.rules[r.k])}</span></div><em>눌러서 변경 ⟳</em></button>`).join('')}</div>
      <div class="a-next"><button class="a-b o" data-nav id="aPrev"><b>← 이전</b></button><button class="a-b w" data-nav id="aNext"><b>방 만들기</b><em>→</em></button></div>`;
    if (step === 3) fb.innerHTML = `<div class="a-wait"><div class="a-code"><small>초대 코드</small><b>${code}</b><button class="a-b o sm" data-nav id="aCopy"><b>${ui('copy', 18)} 복사</b></button></div>
      <div class="a-slots"><div class="a-slot me"><small>1P</small><b>${App.player.name}</b><span>준비 완료</span></div><div class="a-slot op" id="aFr"><small>2P</small><b>친구 기다리는 중<span class="a-dots"><i>.</i><i>.</i><i>.</i></span></b><span>코드를 공유하세요</span></div></div>
      <div class="a-rsum">${A_RULES.map(r => `<span>${r.t} <b>${r.fmt(App.rules[r.k])}${r.u(App.rules[r.k])}</b></span>`).join('')}</div></div>
      <div class="a-next"><button class="a-b o" data-nav id="aPrev"><b>← 규칙 수정</b></button><button class="a-b w" data-nav id="aStart" disabled><b>경기 시작</b><em>→</em></button></div>`;
    bindStep();
  };
  const bindStep = () => {
    $$('[data-m]', el).forEach(b => b.onclick = e => { if (e.target.id === 'aCode') return; method = b.dataset.m; render(); if (method === 'code') $('#aCode', el).focus(); });
    const nx = $('#aNext', el); if (nx) nx.onclick = () => {
      if (step === 1 && method === 'code') { const v = ($('#aCode', el).value || '').toUpperCase(); if (!/^RD-[A-Z0-9]{4}$/.test(v)) { shake($('#aCode', el)); toast('코드 형식: RD-XXXX', 'err'); return; } toast('방에 입장했습니다', 'ok'); App.after(() => App.startBattle({ mode: '친구', opp: { name: '친구(' + v + ')' } }), 700); return; }
      step++; render();
    };
    const pv = $('#aPrev', el); if (pv) pv.onclick = () => { step--; render(); };
    $$('[data-r]', el).forEach(b => b.onclick = () => {
      const r = A_RULES.find(x => x.k === b.dataset.r); const i = r.vals.indexOf(App.rules[r.k]); App.rules[r.k] = r.vals[(i + 1) % r.vals.length];
      const rv = $('.a-rv', b); rv.classList.remove('flip'); void rv.offsetWidth; rv.classList.add('flip');
      setTimeout(() => { rv.innerHTML = `<b>${r.fmt(App.rules[r.k])}</b><span>${r.u(App.rules[r.k])}</span>`; }, 140);
    });
    const cp = $('#aCopy', el); if (cp) cp.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(code).catch(() => { }); toast('초대 코드를 복사했습니다', 'ok'); };
    if (step === 3) App.after(() => {
      const f = $('#aFr', el); if (!f) return; const fr = pick(OPP_NAMES);
      f.classList.add('in'); f.innerHTML = `<small>2P</small><b>${fr}</b><span>입장 완료 · 준비 완료</span>`;
      const s = $('#aStart', el); s.disabled = false; s.classList.add('ready'); s.onclick = () => App.startBattle({ mode: '친구', opp: { name: fr } });
      toast(`${fr} 님이 입장했습니다`, 'ok');
    }, 3200);
  };
  render();
};

/* ---------- 연습 대전 ---------- */
MOD_A.screens.practice = () => `${aTop('PRACTICE · VS AI', '연습 대전')}
  <div class="a-prw"><div class="a-bars a-anim"><div class="a-bl">CPU 레벨을 고르세요</div><div class="a-barrow">${Array.from({ length: 9 }, (_, i) => `<button class="a-lvb ${i + 1 === App.cpu ? 'on' : ''}" data-nav data-l="${i + 1}" style="--h:${22 + i * 9}%"><i></i><b>${i + 1}</b></button>`).join('')}</div>
    <div class="a-grp"><span>입문 1~3</span><span>보통 4~6</span><span>숙련 7~9</span></div></div>
    <div class="a-lvinfo a-anim" id="aLv"></div></div>${aFoot('←→ 로 레벨 이동 · Enter 시작')}`;
MOD_A.bind.practice = el => {
  aBindCommon(el);
  const info = () => {
    const l = App.cpu, g = l <= 3 ? '입문' : l <= 6 ? '보통' : '숙련';
    $('#aLv', el).innerHTML = `<small>CPU LEVEL</small><div class="a-lvn"><b>${l}</b><span>${g}</span></div>
      <ul><li>패 선택: ${l <= 2 ? '가끔 무작위 5장' : '항상 최적 족보'}</li><li>액티브 사용률: ${Math.round((.3 + l * .06) * 100)}%</li><li>드래프트: ${l >= 6 ? '높은 등급 우선' : '무작위 선택'}</li></ul>
      <button class="a-b w" data-nav id="aGo"><b>연습 시작</b><em>→</em></button>`;
    $('#aGo', el).onclick = () => App.startBattle({ mode: '연습' });
  };
  $$('.a-lvb', el).forEach(b => { b.onclick = () => { App.cpu = +b.dataset.l; $$('.a-lvb', el).forEach(x => x.classList.toggle('on', x === b)); info(); }; b.onfocus = b.onclick; });
  info();
  setTimeout(() => $('.a-lvb.on', el).focus({ preventScroll: true }), 60);
};

/* ---------- 카드 살펴보기 ---------- */
MOD_A.screens.cards = () => `${aTop('CARD LIBRARY', '카드 살펴보기', `<div class="a-tabs" id="aSuit">${SUITS.map(s => `<button class="${s === '♠' ? 'on' : ''} ${isRed(s) ? 'red' : ''}" data-s="${s}">${s} ${SUITNAME[s]}</button>`).join('')}</div>`)}
  <div class="a-car" id="aCar"></div>
  <div class="a-cinfo" id="aCi"></div>
  <div class="a-short" id="aShort"></div>${aFoot('← → 카드 넘기기 · ↑ 문양 변경')}`;
MOD_A.bind.cards = el => {
  aBindCommon(el);
  let suit = '♠', idx = 0;
  const list = () => EFFECTS.filter(e => e.suit === suit);
  const render = (build) => {
    const L = list();
    if (build) $('#aCar', el).innerHTML = L.map((e, i) => cardHTML(e, '', `data-i="${i}"`)).join('');
    $$('#aCar .ec', el).forEach((c, i) => {
      const off = i - idx, a = Math.abs(off);
      c.style.transform = `translateX(${off * 220}px) scale(${a ? .7 - Math.min(a, 3) * .04 : 1}) rotateY(${off * -14}deg)`;
      c.style.opacity = a > 3 ? 0 : a ? .5 - a * .08 : 1; c.style.zIndex = 20 - a; c.classList.toggle('cur', !a);
    });
    const e = L[idx], inD = App.myDeck.includes(e.id);
    $('#aCi', el).innerHTML = `<small>${GRADES[e.g].ko} · ${GRADES[e.g].en}</small><h2>${e.name}</h2><p>${e.desc}</p><div class="a-ci2"><span>${e.k === 'A' ? '액티브' : '패시브'}</span><span>${e.cat}</span><span>${e.k === 'A' ? '쿨타임 ' + e.cd + '턴' : '상시'}</span></div>
      <button class="a-b ${inD ? 'o' : 'w'} sm" id="aTog"><b>${inD ? '덱에서 빼기' : '덱에 넣기'}</b><small>현재 ${App.myDeck.length}/26</small></button>`;
    $('#aTog', el).onclick = () => { if (inD) { App.myDeck = App.myDeck.filter(x => x !== e.id); toast('덱에서 뺐습니다'); } else { const err = canAdd(App.myDeck, e.id); if (err) { toast(err, 'err'); return; } App.myDeck.push(e.id); toast('덱에 넣었습니다', 'ok'); } render(); };
    $('#aShort', el).innerHTML = L.map((x, i) => `<button class="${i === idx ? 'on' : ''} ${App.myDeck.includes(x.id) ? 'in' : ''}" data-i="${i}"><b>${x.rank}</b><span>${x.name}</span></button>`).join('');
    $$('#aShort button', el).forEach(b => b.onclick = () => { idx = +b.dataset.i; render(); });
  };
  $('#aCar', el).onclick = e => { const c = e.target.closest('.ec'); if (c) { idx = +c.dataset.i; render(); } };
  $$('#aSuit button', el).forEach(b => b.onclick = () => { suit = b.dataset.s; idx = 0; $$('#aSuit button', el).forEach(x => x.classList.toggle('on', x === b)); render(true); });
  App.keyH = e => {
    if (e.key === 'ArrowRight') { idx = Math.min(12, idx + 1); render(); return true; }
    if (e.key === 'ArrowLeft') { idx = Math.max(0, idx - 1); render(); return true; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { const i = (SUITS.indexOf(suit) + (e.key === 'ArrowUp' ? 3 : 1)) % 4; $$('#aSuit button', el)[i].click(); return true; }
    return false;
  };
  render(true);
};

/* ---------- 나만의 덱 ---------- */
MOD_A.screens.deck = () => `${aTop('MY DECK', '나만의 덱')}
  <div class="a-dk"><div class="a-dl"><div class="a-dh"><b>덱 26칸</b><span>칸을 누르면 빠집니다</span></div><div class="a-slots26" id="aSl"></div>
    <div class="a-dh"><b>카드 추가</b><div class="a-tabs sm" id="aAddS">${SUITS.map((s, i) => `<button class="${!i ? 'on' : ''} ${isRed(s) ? 'red' : ''}" data-s="${s}">${s}</button>`).join('')}</div></div><div class="a-add" id="aAdd"></div></div>
    <div class="a-dr"><div class="a-num" id="aN1"></div><div class="a-num" id="aN2"></div><div class="a-num" id="aN3"></div>
    <div class="a-dact"><button class="a-b o sm" id="aRst"><b>기본 덱으로</b></button><button class="a-b o sm" id="aClr"><b>모두 비우기</b></button></div></div></div>${aFoot('일반·희귀 제한 없음 · 영웅 최대 6장 · 전설 최대 2장')}`;
MOD_A.bind.deck = el => {
  aBindCommon(el);
  let suit = '♠';
  const render = (flash) => {
    const d = App.myDeck, inf = deckInfo(d);
    $('#aSl', el).innerHTML = Array.from({ length: 26 }, (_, i) => { const id = d[i]; return id ? `<button class="a-s ${isRed(EF[id].suit) ? 'red' : ''} g-${EF[id].g} ${flash === id ? 'new' : ''}" data-id="${id}"><b>${id}</b><span>${EF[id].name}</span></button>` : `<div class="a-s empty">${i + 1}</div>`; }).join('');
    const num = (el2, lbl, v, max, warn) => { el2.className = 'a-num ' + (v > max ? 'over' : v === max ? 'full' : ''); el2.innerHTML = `<small>${lbl}</small><div><b>${v}</b><span>/ ${max}</span></div><i style="--w:${Math.min(100, v / max * 100)}%"></i>`; };
    num($('#aN1', el), '덱 장수', inf.n, 26); num($('#aN2', el), '영웅 등급', inf.E, 6); num($('#aN3', el), '전설 등급', inf.L, 2);
    $('#aAdd', el).innerHTML = EFFECTS.filter(e => e.suit === suit).map(e => `<button class="a-ad ${d.includes(e.id) ? 'in' : ''} g-${e.g}" data-id="${e.id}"><b>${e.id}</b><span>${e.name}</span><em>${d.includes(e.id) ? '✓' : '+'}</em></button>`).join('');
  };
  $('#aSl', el).onclick = e => { const b = e.target.closest('.a-s[data-id]'); if (!b) return; b.classList.add('out'); setTimeout(() => { App.myDeck = App.myDeck.filter(x => x !== b.dataset.id); render(); }, 200); };
  $('#aAdd', el).onclick = e => {
    const b = e.target.closest('.a-ad'); if (!b) return; const id = b.dataset.id;
    if (App.myDeck.includes(id)) { App.myDeck = App.myDeck.filter(x => x !== id); render(); return; }
    const err = canAdd(App.myDeck, id); if (err) { toast(err, 'err'); shake(b); const t = EF[id].g === 'E' ? '#aN2' : EF[id].g === 'L' ? '#aN3' : '#aN1'; shake($(t, el)); return; }
    App.myDeck.push(id); render(id);
  };
  $$('#aAddS button', el).forEach(b => b.onclick = () => { suit = b.dataset.s; $$('#aAddS button', el).forEach(x => x.classList.toggle('on', x === b)); render(); });
  $('#aRst', el).onclick = () => { App.myDeck = [...DEFAULT_DECK]; render(); toast('기본 덱으로 되돌렸습니다'); };
  $('#aClr', el).onclick = () => { App.myDeck = []; render(); };
  render();
};

/* ---------- 대전 기록 ---------- */
MOD_A.screens.history = () => {
  const s = historyStats(App.history);
  return `${aTop('MATCH HISTORY', '대전 기록')}
  <div class="a-hn">${[['승률', s.rate, '%'], ['최고 연승', s.best, '연승'], ['한 판 최다 피해', s.maxDmg, ''], ['최다 MVP', s.topMvp, `${s.topMvpN}회`]].map(([l, v, u], i) => `<div class="a-tile a-hnt ${i === 0 ? 'bl' : ''}"><small>${l}</small><b data-v="${typeof v === 'number' ? v : ''}">${v}</b><span>${u}</span></div>`).join('')}</div>
  <div class="a-hh"><b>최근 경기</b><span>${s.n}경기 · ${s.wins}승 ${s.losses}패 · 카드를 누르면 자세히</span></div>
  <div class="a-hl" id="aHl">${App.history.map((h, i) => `<button class="a-hc ${h.win ? 'w' : 'l'}" data-nav data-i="${i}" style="--i:${i}"><div class="a-hr">${h.win ? 'WIN' : 'LOSE'}</div><b>${h.win ? '승리' : '패배'} · ${h.rounds}R</b><span>vs ${h.opp}</span><span>${h.mode} · ${h.date}</span><div class="a-hx"><span>MVP <b>${h.mvp}</b></span><span>피해 <b>${h.dmg}</b></span><span>남은 HP <b>${h.hp}</b></span></div></button>`).join('')}</div>
  ${aFoot('← → 로 경기 이동')}`;
};
MOD_A.bind.history = el => {
  aBindCommon(el);
  $$('.a-hnt b[data-v]', el).forEach(b => { if (b.dataset.v !== '') { const v = +b.dataset.v; b.dataset.v = 0; countUp(b, v, 1000); } });
  $$('.a-hc', el).forEach(c => c.onclick = () => { const on = c.classList.contains('open'); $$('.a-hc', el).forEach(x => x.classList.remove('open')); if (!on) c.classList.add('open'); });
};

injectCSS(`
.vA{background:#000;color:#fff;font-family:'Noto Sans KR'}
.vA button{font-family:inherit;color:inherit}
.vA :focus-visible{outline:3px solid #fff;outline-offset:3px}
.a-bar,.a-top{position:absolute;left:0;right:0;top:0;height:64px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;padding:0 48px;gap:24px}
.a-logo{font:900 18px 'Archivo Black';letter-spacing:.01em;display:flex;align-items:center}.a-logo i{width:9px;height:9px;background:#21e05a;margin-right:12px}.a-logo small{font:700 12px 'Noto Sans KR';color:#aaa;margin-left:12px}
.a-prof{margin-left:auto;display:flex;align-items:center;gap:10px}.a-prof .av{width:32px;height:32px;border-radius:50%;background:#0000ff}.a-pn b{display:block;font-size:13px;line-height:1.2}.a-pn small{font-size:10px;color:#aaa}
.a-set{background:none;border:0;font-weight:700;font-size:13px;margin-left:10px}
.a-grid{position:absolute;left:48px;right:48px;top:100px;bottom:92px;display:grid;grid-template-columns:640px 1fr;grid-template-rows:170px 1fr 110px;gap:24px}
.a-tile{position:relative;text-align:left;border:1px solid #333;background:#121212;color:#fff;padding:26px 28px;transition:transform .18s,background .18s,border-color .18s;cursor:pointer}
button.a-tile:hover,button.a-tile:focus-visible{transform:translateY(-4px);border-color:#fff}
.a-big{grid-row:1/4;background:#0000ff;border:0;cursor:default;padding:36px;overflow:hidden}
.a-k{font-size:12px;font-weight:700;letter-spacing:.1em;display:flex;align-items:center}.a-k i{width:10px;height:10px;background:#fff;margin-right:10px}
.a-1v1{font:900 140px/1 'Archivo Black';letter-spacing:-.04em;margin-top:18px;animation:a1v1 .8s cubic-bezier(.2,1.3,.4,1)}
@keyframes a1v1{from{transform:translateX(-60px);opacity:0}}
.a-big h2{font-size:50px;margin:4px 0 6px;font-weight:900}.a-big p{font-size:15px;line-height:1.6;max-width:540px;margin:0}
.a-suits{position:absolute;right:36px;bottom:134px;display:flex;gap:12px}
.a-suits span{width:60px;height:84px;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:24px;transition:.25s;animation:aSuit 4s calc(var(--i)*.15s) infinite}
.a-suits span.w{background:#fff;color:#0000ff}
@keyframes aSuit{0%,70%,100%{transform:none}80%{transform:translateY(-12px)}}
.a-pick{position:absolute;left:36px;bottom:106px;font-size:12px;font-weight:700}
.a-btn2{position:absolute;left:36px;right:36px;bottom:36px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.a-b{position:relative;text-align:left;border:1.5px solid #fff;background:transparent;padding:12px 56px 12px 20px;cursor:pointer;transition:.16s;min-height:64px}
.a-b b{display:block;font-size:19px;font-weight:900}.a-b small{font-size:12px;opacity:.85}
.a-b em{position:absolute;right:20px;top:50%;transform:translateY(-50%);font-style:normal;font-size:22px;transition:.16s}
.a-b.w{background:#fff;color:#000}.a-b.o{color:#fff}
.a-b:hover em,.a-b:focus-visible em{transform:translate(6px,-50%)}
.a-b.w:hover,.a-b.w:focus-visible{background:#000;color:#fff;border-color:#000;box-shadow:6px 6px 0 #fff}
.a-b.o:hover,.a-b.o:focus-visible{background:#fff;color:#000}
.a-b:active{transform:translate(2px,2px);box-shadow:none}
.a-b[disabled]{opacity:.3;cursor:not-allowed}
.a-b.sm{min-height:54px;padding:8px 48px 8px 16px}.a-b.sm b{font-size:16px}
.vA .a-prac{background:#fff;color:#000;border:0;display:flex;align-items:center;justify-content:space-between}
.a-prac small,.a-cd>small,.a-his small{font-size:12px;font-weight:700;letter-spacing:.12em;opacity:.65}
.a-prac h3,.a-cd h3,.a-his h3{font-size:34px;margin:2px 0;font-weight:900}.a-prac p{margin:0;color:#555;font-size:13px}
.a-ai{font:900 96px 'Archivo Black';color:#0000ff;margin-left:auto;margin-right:50px;transition:.2s}
.a-prac em,.a-his>em{font-style:normal;font-size:26px;position:absolute;right:28px;top:50%;transform:translateY(-50%);transition:.2s}
.a-prac:hover .a-ai{transform:scale(1.08) rotate(-4deg)}.a-prac:hover em,.a-his:hover>em{transform:translate(6px,-50%)}
.a-cd{cursor:default}.a-cd h3 span{font-size:11px;color:#999;font-weight:400;float:right;margin-top:24px}
.a-cdw{display:flex;gap:22px;margin-top:14px}
.a-cur{font-size:12px;font-weight:700;margin-bottom:8px}
.a-minis{display:flex;gap:8px}
.a-mini{width:64px;height:88px;border:1.5px solid #fff;background:#000;padding:6px 8px;display:flex;flex-direction:column;justify-content:space-between;transition:.2s}
.a-mini.bl{border-color:#4d5dff}.a-mini b{font-size:16px}.a-mini span{font-size:10px}
.a-mini:hover{transform:translateY(-6px);background:#0000ff}
.a-trait{display:inline-block;margin-top:10px;background:#0000ff;font-size:11px;font-weight:700;padding:3px 8px}
.a-cdb{margin-left:auto;display:flex;flex-direction:column;gap:10px;width:236px}
.a-his{display:flex;align-items:center;gap:30px}
.a-last{border-left:1px solid #333;padding-left:24px}.a-last small{display:block;letter-spacing:0;font-weight:400}.a-last b{font-size:17px}
.a-sq{margin-left:auto;margin-right:50px;text-align:right}.a-sq small{display:block;letter-spacing:0;font-weight:400;margin-bottom:6px}
.a-sq div{display:flex;gap:4px}.a-sq i{width:12px;height:12px;background:#0000ff;animation:aSq .4s calc(var(--i)*.05s + .3s) both}.a-sq i.l{background:#ff2020}
@keyframes aSq{from{transform:scale(0)}}
.a-foot{position:absolute;left:0;right:0;bottom:0;height:56px;border-top:1px solid #2a2a2a;display:flex;justify-content:space-between;align-items:center;padding:0 48px;font-size:12px;color:#888}.a-foot b{color:#fff;margin:0 4px 0 10px;font-weight:500}.a-foot b:first-child{margin-left:0}
.a-back{background:#fff;color:#000!important;border:0;font-weight:900;font-size:14px;padding:9px 16px;transition:.15s}.a-back:hover,.a-back:focus-visible{background:#0000ff;color:#fff!important}
.a-tt small{display:block;font-size:10px;color:#888;letter-spacing:.14em;font-weight:700}.a-tt b{font-size:20px;font-weight:900}
/* match */
.a-vs{position:absolute;left:0;right:0;top:64px;bottom:120px;display:grid;grid-template-columns:1fr 1fr}
.a-me{background:#0000ff;padding:60px 64px;display:flex;flex-direction:column;gap:10px}
.a-me small,.a-op small{font-size:13px;font-weight:700;letter-spacing:.14em}
.a-nm{font:900 64px/1 'Noto Sans KR'}.a-lv{font-size:15px;opacity:.85}
.a-hpbig{margin-top:auto}.a-hpbig small{display:block}.a-hpbig b{font:900 100px/1 'Archivo Black'}
.a-op{background:#0a0a0a;padding:60px 64px;text-align:right;display:flex;flex-direction:column;align-items:flex-end;transition:background .4s}
.a-op.found{background:#ff2020}
.a-q{font:900 300px/1 'Archivo Black';color:#333;margin-top:20px;transition:color .3s}
.a-q.found{color:#fff;animation:aQ .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes aQ{from{transform:scale(2.4);opacity:0}}
.a-opi{font-size:20px;font-weight:700;margin-top:auto}
.a-dots i{font-style:normal;animation:dots 1.2s infinite}.a-dots i:nth-child(2){animation-delay:.2s}.a-dots i:nth-child(3){animation-delay:.4s}
@keyframes dots{50%{opacity:.1}}
.a-cnt{font:900 80px 'Archivo Black'}.a-cnt.pop{animation:aQ .4s}
.a-vsb{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px;background:#000;border:4px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 54px 'Archivo Black';animation:aVs 1.6s infinite}
@keyframes aVs{50%{transform:scale(1.06)}}
.a-vsb.slam{animation:aSlam .6s cubic-bezier(.2,1.8,.4,1);background:#fff;color:#000}
@keyframes aSlam{from{transform:scale(3) rotate(-30deg);opacity:0}}
.a-mbar{position:absolute;left:0;right:0;bottom:0;height:120px;border-top:1px solid #2a2a2a;display:flex;align-items:center;gap:60px;padding:0 64px}
.a-mbar small{display:block;font-size:11px;color:#888}.a-mbar b{font:900 30px 'Archivo Black','Noto Sans KR'}
.a-mbar .a-b{margin-left:auto;width:260px}.a-mbar .a-b b{font-size:20px}
/* friend */
.a-steps{position:absolute;left:64px;right:64px;top:96px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.a-st{display:flex;gap:14px;align-items:center;color:#555;padding-bottom:16px;transition:.3s}
.a-st b{width:44px;height:44px;border:2px solid currentColor;display:flex;align-items:center;justify-content:center;font:900 16px 'Archivo Black'}
.a-st span{font-size:18px;font-weight:900}.a-st.on{color:#fff}.a-st.on b{background:#0000ff;border-color:#0000ff}.a-st.done{color:#8a8aff}
.a-stbar{grid-column:1/4;height:4px;background:#222;margin-top:-6px}.a-stbar i{display:block;height:100%;background:#0000ff;transition:width .5s cubic-bezier(.7,0,.2,1)}
.a-fbody{position:absolute;left:64px;right:64px;top:200px;bottom:76px}
.a-two{display:grid;grid-template-columns:1fr 1fr;gap:24px;height:380px}
.a-mt{display:flex;flex-direction:column;padding:34px}.a-mt small{font-size:12px;font-weight:700;letter-spacing:.14em;color:#888}.a-mt h3{font-size:46px;margin:6px 0;font-weight:900}.a-mt p{color:#aaa;margin:0}
.a-mt.sel{background:#0000ff;border-color:#0000ff}.a-mt.sel small,.a-mt.sel p{color:#fff}
.a-bigico{margin-top:auto;font:900 120px/1 'Archivo Black'}
.a-in{margin-top:auto;background:#000;border:2px solid #fff;color:#fff;font:900 44px 'Archivo Black';padding:12px 18px;width:100%;letter-spacing:.06em;text-transform:uppercase}
.a-next{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:flex-end;gap:12px}.a-next .a-b{width:260px}
.a-rules{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;height:360px}
.a-rule{display:flex;flex-direction:column;padding:28px}.a-rule small{font-size:15px;font-weight:900}
.a-rv{margin-top:auto;perspective:400px}.a-rv b{font:900 96px/1 'Archivo Black';display:block}.a-rv span{font-size:16px;color:#aaa}
.a-rv.flip{animation:aFlip .3s}@keyframes aFlip{50%{transform:rotateX(90deg);opacity:.2}}
.a-rule em{font-style:normal;font-size:12px;color:#666;margin-top:14px}
.a-rule:hover{background:#0000ff;border-color:#0000ff}.a-rule:hover em{color:#fff}
.a-wait{display:grid;grid-template-columns:420px 1fr;grid-template-rows:auto auto;gap:20px}
.a-code{grid-row:1/3;background:#fff;color:#000;padding:30px;display:flex;flex-direction:column;gap:10px}.a-code small{font-weight:700}.a-code b{font:900 70px/1 'Archivo Black';color:#0000ff}.a-code .a-b{border-color:#000;color:#000;margin-top:auto}
.a-slots{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.a-slot{border:1.5px dashed #555;padding:24px;height:180px;display:flex;flex-direction:column}.a-slot small{color:#888;font-weight:700}.a-slot b{font-size:30px;font-weight:900;margin-top:auto}.a-slot span{color:#aaa;font-size:13px}
.a-slot.me{border:0;background:#0000ff}.a-slot.me span{color:#fff}
.a-slot.in{border:0;background:#ff2020;animation:aQ .5s cubic-bezier(.2,1.6,.4,1)}.a-slot.in span{color:#fff}
.a-rsum{display:flex;gap:10px;flex-wrap:wrap}.a-rsum span{border:1px solid #333;padding:10px 14px;font-size:13px;color:#aaa}.a-rsum b{color:#fff;margin-left:6px}
.a-b.ready{animation:aRdy 1s infinite}@keyframes aRdy{50%{box-shadow:0 0 0 6px #0000ff}}
/* practice */
.a-prw{position:absolute;left:64px;right:64px;top:110px;bottom:80px;display:grid;grid-template-columns:1fr 400px;gap:40px}
.a-bars{display:flex;flex-direction:column}.a-bl{font-size:20px;font-weight:900;margin-bottom:20px}
.a-barrow{flex:1;display:flex;align-items:flex-end;gap:14px}
.a-lvb{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;background:none;border:0;cursor:pointer;padding:0}
.a-lvb i{display:block;height:var(--h);background:#222;transition:.25s;border:1.5px solid #333}
.a-lvb b{font:900 28px 'Archivo Black';margin-top:10px;text-align:center;color:#555;transition:.2s}
.a-lvb:hover i,.a-lvb:focus-visible i{background:#3a3a3a;border-color:#fff}
.a-lvb.on i{background:#0000ff;border-color:#0000ff;box-shadow:0 0 40px #0000ff88}.a-lvb.on b{color:#fff}
.a-grp{display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:12px;gap:14px}.a-grp span{border-top:3px solid #333;padding-top:8px;font-size:13px;font-weight:700;color:#aaa}
.a-lvinfo{background:#fff;color:#000;padding:34px;display:flex;flex-direction:column}
.a-lvinfo small{font-weight:700;letter-spacing:.14em}.a-lvn b{font:900 170px/1 'Archivo Black';color:#0000ff}.a-lvn span{font-size:26px;font-weight:900;margin-left:10px}
.a-lvinfo ul{padding-left:18px;line-height:1.9;font-size:14px}.a-lvinfo .a-b{margin-top:auto;background:#000;color:#fff;border-color:#000}
/* cards */
.a-tabs{display:flex;gap:6px;margin-left:30px}.a-tabs button{border:1.5px solid #444;background:none;padding:8px 14px;font-weight:700;font-size:13px;transition:.15s}
.a-tabs button.red{color:#ff4040}.a-tabs button.on{background:#fff;color:#000;border-color:#fff}.a-tabs button:hover{border-color:#fff}
.a-tabs.sm{margin-left:auto}.a-tabs.sm button{padding:4px 12px}
.a-car{position:absolute;left:0;right:520px;top:96px;height:470px;perspective:1200px;overflow:hidden}
.vA .ec{position:absolute;left:50%;top:10px;width:300px;height:430px;margin-left:-150px;background:#000;color:#fff;border:2px solid #fff;padding:22px;display:flex;flex-direction:column;gap:6px;transition:transform .45s cubic-bezier(.2,1,.3,1),opacity .45s,background .3s;cursor:pointer}
.vA .ec .ec-code{font:900 44px 'Archivo Black'}.vA .ec.red .ec-code{color:#ff4040}
.vA .ec .ec-g{font-size:11px;letter-spacing:.1em}.vA .ec .ec-n{font-size:40px;font-weight:900}.vA .ec .ec-t{font-size:13px;color:#aaa}
.vA .ec .ec-ic{margin:auto}.vA .ec .ec-ic svg{width:110px;height:110px;stroke-width:1.6}
.vA .ec .ec-d{font-size:14px;flex:0}.vA .ec .ec-f{font-size:12px;color:#aaa}
.vA .ec.cur{background:#0000ff;border-color:#0000ff;box-shadow:0 30px 60px rgba(0,0,255,.35)}.vA .ec.cur .ec-t,.vA .ec.cur .ec-f{color:#fff}.vA .ec.cur.red .ec-code{color:#fff}
.a-cinfo{position:absolute;right:64px;top:110px;width:420px;height:440px;border-left:1px solid #333;padding-left:36px;display:flex;flex-direction:column}
.a-cinfo small{font-weight:700;letter-spacing:.1em;color:#888}.a-cinfo h2{font-size:56px;margin:4px 0;font-weight:900}.a-cinfo p{font-size:18px;line-height:1.6}
.a-ci2{display:flex;gap:8px;margin-bottom:auto}.a-ci2 span{border:1px solid #444;padding:6px 12px;font-size:13px}
.a-short{position:absolute;left:64px;right:64px;bottom:76px;display:grid;grid-template-columns:repeat(13,1fr);gap:6px}
.a-short button{border:1.5px solid #333;background:#0d0d0d;padding:8px 4px;transition:.15s;cursor:pointer}.a-short b{display:block;font:900 20px 'Archivo Black'}.a-short span{font-size:10px;color:#888}
.a-short button.in{border-color:#4d5dff}.a-short button:hover{border-color:#fff;transform:translateY(-3px)}.a-short button.on{background:#fff;color:#000}.a-short button.on span{color:#000}
/* deck */
.a-dk{position:absolute;left:64px;right:64px;top:96px;bottom:76px;display:grid;grid-template-columns:1fr 300px;gap:30px}
.a-dl{display:flex;flex-direction:column;gap:12px;min-height:0}
.a-dh{display:flex;align-items:center;gap:14px}.a-dh b{font-size:17px;font-weight:900}.a-dh span{font-size:12px;color:#888}
.a-slots26{display:grid;grid-template-columns:repeat(13,1fr);gap:6px}
.a-s{height:94px;border:1.5px solid #fff;background:#000;padding:6px;display:flex;flex-direction:column;justify-content:space-between;text-align:left;transition:.18s;cursor:pointer}
.a-s b{font:900 17px 'Archivo Black'}.a-s span{font-size:10px}.a-s.red b{color:#ff4040}
.a-s.g-E{border-color:#a970ff}.a-s.g-L{border-color:#ffd000;box-shadow:inset 0 0 0 2px #ffd000}
.a-s:hover{background:#ff2020;border-color:#ff2020}.a-s:hover::after{content:'빼기';position:absolute}
.a-s.empty{border:1.5px dashed #333;color:#444;align-items:center;justify-content:center;font:900 16px 'Archivo Black';cursor:default}
.a-s.new{animation:aNew .5s cubic-bezier(.2,1.6,.4,1)}@keyframes aNew{from{transform:scale(1.5);background:#0000ff}}
.a-s.out{animation:aOut .2s forwards}@keyframes aOut{to{transform:scale(.6);opacity:0}}
.a-add{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;overflow:auto}
.a-ad{display:flex;align-items:center;gap:10px;border:1px solid #333;background:#0d0d0d;padding:10px 12px;text-align:left;transition:.15s;cursor:pointer}
.a-ad b{font:900 14px 'Archivo Black';width:34px}.a-ad span{font-size:13px;flex:1}.a-ad em{font-style:normal;font-weight:900}
.a-ad.g-E span::after{content:' 영웅';color:#a970ff;font-size:10px}.a-ad.g-L span::after{content:' 전설';color:#ffd000;font-size:10px}
.a-ad:hover{border-color:#fff}.a-ad.in{background:#0000ff;border-color:#0000ff}
.a-dr{display:flex;flex-direction:column;gap:14px}
.a-num{position:relative;background:#121212;border:1px solid #333;padding:18px 22px;transition:.3s;overflow:hidden}
.a-num small{font-size:13px;font-weight:700}.a-num div{display:flex;align-items:baseline;gap:8px}.a-num b{font:900 72px/1 'Archivo Black'}.a-num span{color:#888;font-size:18px}
.a-num i{position:absolute;left:0;bottom:0;height:5px;width:var(--w);background:#0000ff;transition:width .4s}
.a-num.full{border-color:#0000ff}.a-num.over{background:#ff2020;border-color:#ff2020}.a-num.over i{background:#fff}
.a-dact{display:flex;gap:8px;margin-top:auto}.a-dact .a-b{flex:1;padding-right:16px}
/* history */
.a-hn{position:absolute;left:64px;right:64px;top:96px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.a-hnt{cursor:default;height:200px;display:flex;flex-direction:column}.a-hnt small{font-size:14px;font-weight:900}.a-hnt b{font:900 92px/1 'Archivo Black','Noto Sans KR';margin-top:auto}.a-hnt span{font-size:15px;color:#aaa}
.a-hnt:nth-child(4) b{font-size:62px}.a-hnt.bl{background:#0000ff;border-color:#0000ff}.a-hnt.bl span{color:#fff}
.a-hh{position:absolute;left:64px;right:64px;top:322px;display:flex;justify-content:space-between;align-items:baseline}.a-hh b{font-size:18px}.a-hh span{font-size:12px;color:#888}
.a-hl{position:absolute;left:64px;right:0;top:356px;bottom:72px;display:flex;gap:14px;overflow-x:auto;padding:6px 64px 10px 0;align-items:flex-start}
.a-hc{flex:0 0 210px;height:280px;text-align:left;border:1.5px solid #333;background:#0d0d0d;padding:18px;display:flex;flex-direction:column;gap:2px;transition:.25s;cursor:pointer;animation:evInA .4s calc(var(--i)*.05s) both}
@keyframes evInA{from{opacity:0;transform:translateX(40px)}}
.a-hr{font:900 40px 'Archivo Black';color:#0000ff;margin-bottom:auto}.a-hc.l .a-hr{color:#ff2020}
.a-hc b{font-size:20px}.a-hc>span{font-size:12px;color:#888}
.a-hx{display:none;flex-direction:column;gap:2px;margin-top:10px;font-size:13px}.a-hx b{font-size:15px}
.a-hc:hover,.a-hc:focus-visible{border-color:#fff;transform:translateY(-4px)}
.a-hc.open{flex-basis:320px;background:#0000ff;border-color:#0000ff}.a-hc.l.open{background:#ff2020;border-color:#ff2020}.a-hc.open .a-hr{color:#fff}.a-hc.open>span{color:#fff}.a-hc.open .a-hx{display:flex}
.toast.tv-A{border-radius:0;background:#fff;color:#000;border:2px solid #000}.toast.tv-A.err{background:#ff2020;color:#fff}.toast.tv-A.ok{background:#0000ff;color:#fff}
`);
