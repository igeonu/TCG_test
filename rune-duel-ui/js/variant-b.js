'use strict';
/* =========================================================
   B안 : 모바일 라이브 서비스형 로비 — 하단 탭 · 모달 · 사이드 탭 · 3분할 편집기
   참고 : 유희왕 MASTER DUEL UI / 이동 : 하단 탭 고정
   ========================================================= */
const B_TABS = [['lobby', '홈', 'home'], ['friend', '대전', 'battle'], ['cards', '카드', 'cards'], ['deck', '덱', 'deck'], ['history', '기록', 'history']];
const bTabIdx = s => { const i = B_TABS.findIndex(t => t[0] === s); return i < 0 ? 0 : i; };
const MOD_B = {
  title: '라이브 서비스형', cls: 'vB', bg: '#0a0f1c',
  names: { lobby: '홈 (로비)', match: '무작위 매칭 (모달)', friend: '친구와 경기', practice: '연습 대전', cards: '카드 살펴보기', deck: '나만의 덱', history: '대전 기록' },
  screens: {}, bind: {},
  memo: `<span class="tag">B안 · 모바일 라이브 서비스형</span><h3>하단 탭 · 모달 · 사이드 탭 · 3분할 편집기</h3>
  <p>왼쪽은 대표 카드(MY ACE)를 크게 보여주는 쇼케이스, 오른쪽은 큰 DUEL 버튼과 연습 듀얼·최근 기록. 화면 아래 홈·대전·카드·덱·기록 탭 고정.</p>
  <h4>하위 화면</h4><ul><li>무작위 매칭: 홈 위에 뜨는 모달 (검색 중 + 사용 덱 + TIP 순환)</li><li>친구와 경기: 왼쪽 세로 탭 + 스위치·드롭다운 설정 폼</li><li>연습 대전: AI 캐릭터 카드 3장 캐러셀 + 하단 시트</li><li>카드 살펴보기: 왼쪽 상세 패널 + 9열 그리드 + 검색·정렬·필터</li><li>나만의 덱: 카드 정보 · 메인 덱 · 보유 카드 3분할 (드래그 앤 드롭)</li><li>대전 기록: 세그먼트 탭 + 2열 카드형 목록</li></ul>
  <h4>상호작용</h4><ul><li>쇼케이스 카드: 마우스 위치에 따라 3D 기울기 + 빛 반사</li><li>하단 탭 인디케이터 슬라이드, 탭 순서에 따라 좌/우 슬라이드 전환</li></ul>
  <h4>장점 / 고려할 점</h4><p>모바일 카드 게임 사용자에게 가장 익숙하고 복잡한 작업을 한 화면에서 처리. 요소가 많아 처음엔 복잡하고 하단 탭이 세로 공간을 차지.</p>`,
  chrome: () => `<nav class="b-tabbar pe">${B_TABS.map(([s, t, ic]) => `<button data-s="${s}">${ui(ic, 22)}<span>${t}</span></button>`).join('')}<i class="b-ind"></i></nav>`,
  chromeBind(ch) { $$('.b-tabbar button', ch).forEach(b => b.onclick = () => { if (App.screen !== b.dataset.s) App.go(b.dataset.s); }); },
  onScreen(s, ch) {
    const i = bTabIdx(s);
    $$('.b-tabbar button', ch).forEach((b, k) => b.classList.toggle('on', k === i));
    const ind = $('.b-ind', ch); if (ind) ind.style.transform = `translateX(${i * 100}%)`;
  },
  trans(old, el, { from, to }) {
    old.style.pointerEvents = 'none';
    if (to === 'match' || from === 'match') { old.remove(); return; }
    const d = bTabIdx(to) >= bTabIdx(from) ? 1 : -1;
    old.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-d * 80}px)`, opacity: 0 }], { duration: 320, easing: 'ease-in', fill: 'forwards' });
    el.animate([{ transform: `translateX(${d * 120}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,1,.3,1)' });
    setTimeout(() => old.remove(), 330);
  },
};
App.reg('B', MOD_B);
const bHead = (sub = '') => `<header class="b-head"><div class="b-logo">RUNE DUEL <small>룬 결투</small>${sub ? `<em>/ ${sub}</em>` : ''}</div><div class="b-prof"><span class="av"></span><div><b>${App.player.name}</b><small>LV. ${App.player.lv}</small></div><button class="b-set">설정</button></div></header>`;
function bBind(el) { $$('[data-go]', el).forEach(b => b.addEventListener('click', () => App.go(b.dataset.go))); const s = $('.b-set', el); if (s) s.onclick = () => toast('설정 화면은 시안 범위 밖입니다'); }

/* ---------- 홈 ---------- */
function bHome() {
  const st = historyStats(App.history);
  const aceName = st.topMvp; const ace = EFFECTS.find(e => e.name === aceName) || EF['♠Q'];
  const d = App.myDeck.slice(0, 5);
  return `${bHead()}
  <div class="b-home">
    <div class="b-show" id="bShow"><div class="b-ace" id="bAce"><div class="b-shine"></div>
      <div class="b-ah"><b>${ace.suit}${ace.rank}</b><span>${GRADES[ace.g].ko} · ${ace.k === 'A' ? '액티브' : '패시브'}</span></div>
      <div class="b-art"><div class="b-ring">${ace.suit}</div></div>
      <h3>${ace.name}</h3><p>${ace.desc} · ${ace.k === 'A' ? '쿨타임 ' + ace.cd + '턴' : '상시'}</p></div></div>
    <div class="b-myace"><small>MY ACE</small><h2>이번 판을 끝내는 한 장</h2><p>덱에서 가장 많이 MVP가 된 카드를 홈에 걸어 둡니다.<br>덱이 바뀌면 대표 카드도 바뀝니다. <em>(MVP ${st.topMvpN}회)</em></p>
      <b class="b-dl">현재 덱 · ${deckSummary(App.myDeck)}</b><div class="b-minis">${d.map(id => `<div class="b-mini ${EF[id].suit === ace.suit ? 'hl' : ''}"><b>${EF[id].suit}${EF[id].rank}</b><span>${EF[id].name}</span></div>`).join('')}</div></div>
    <div class="b-home-r">
      <div class="b-duel"><div class="b-dt">DUEL</div><div class="b-dsub"><b>1VS1 듀얼</b><span>HP를 먼저 0으로</span></div>
        <div class="b-db"><button class="b-btn gold" data-go="match">무작위 상대</button><button class="b-btn line" data-go="friend">친구와 경기</button></div></div>
      <button class="b-solo" data-go="practice"><div><small>SOLO</small><b>연습 듀얼 · VS AI</b></div><span>→</span></button>
      <button class="b-rec" data-go="history"><div><small>최근 기록</small><b>${App.history[0].win ? '승리' : '패배'} · ${App.history[0].rounds}라운드 · MVP ${App.history[0].mvp}</b></div><div class="b-sq">${App.history.slice(0, 10).map(h => `<i class="${h.win ? 'w' : 'l'}"></i>`).join('')}</div></button>
    </div>
  </div>`;
}
MOD_B.screens.lobby = bHome;
function bindTilt(el) {
  const show = $('#bShow', el), ace = $('#bAce', el); if (!show) return;
  show.addEventListener('mousemove', e => {
    const r = ace.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    ace.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 18}deg) rotate(-4deg)`;
    ace.querySelector('.b-shine').style.background = `radial-gradient(circle at ${(x + .5) * 100}% ${(y + .5) * 100}%,rgba(255,236,180,.35),transparent 55%)`;
  });
  show.addEventListener('mouseleave', () => { ace.style.transform = ''; ace.querySelector('.b-shine').style.background = ''; });
}
MOD_B.bind.lobby = el => { bBind(el); bindTilt(el); };

/* ---------- 무작위 매칭 (모달) ---------- */
const B_TIPS = ['♠ 스페이드 3장을 모으면 최종 피해 ×2 특성이 켜집니다.', '실드는 1턴 뒤 소멸합니다. 공격 직전에 쓰세요.', '인벤토리가 가득 차면 교체 미리보기로 특성 변화를 확인할 수 있어요.', '심판은 마지막 라운드에 아껴 두면 MVP가 되기 쉽습니다.', '리롤은 매 턴 1회 · 클로버 특성으로 늘릴 수 있어요.'];
MOD_B.screens.match = () => `${bHome()}<div class="b-mod"><div class="b-mback"></div><div class="b-mbox" id="bMb">
  <div class="b-mh"><small>RANDOM DUEL</small><h3 id="bMt">상대를 찾는 중</h3></div>
  <div class="b-spin" id="bSpin"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="52" class="arc"/></svg><div class="b-sc">♠</div></div>
  <div class="b-mt"><b id="bT">00:00</b><span>예상 대기 00:10</span></div>
  <div class="b-mdeck"><small>사용 덱</small><b>${deckSummary(App.myDeck)} · ${App.myDeck.length}장</b><span>영웅 ${deckInfo(App.myDeck).E}/6 · 전설 ${deckInfo(App.myDeck).L}/2</span></div>
  <div class="b-tip"><small>TIP</small><span id="bTip">${B_TIPS[0]}</span></div>
  <div class="b-mf"><button class="b-btn line" id="bCancel">취소</button></div></div></div>`;
MOD_B.bind.match = el => {
  bBind(el); bindTilt(el);
  let t = 0, ti = 0;
  App.every(() => { t++; $('#bT', el).textContent = fmtTime(t); }, 1000);
  App.every(() => { ti = (ti + 1) % B_TIPS.length; const tp = $('#bTip', el); tp.classList.remove('in'); void tp.offsetWidth; tp.textContent = B_TIPS[ti]; tp.classList.add('in'); }, 2600);
  const sc = $('.b-sc', el); App.every(() => sc.textContent = pick(SUITS), 500);
  const close = () => { const m = $('.b-mod', el); m.classList.add('out'); setTimeout(() => App.go('lobby'), 260); };
  $('#bCancel', el).onclick = close; $('.b-mback', el).onclick = close;
  App.after(() => {
    const opp = pick(OPP_NAMES);
    App.clear();
    $('#bMt', el).textContent = '상대 발견!'; $('#bSpin', el).classList.add('found');
    $('#bSpin', el).innerHTML = `<div class="b-found"><span class="av2">${opp[0]}</span><b>${opp}</b><small>LV. ${10 + rnd(30)} · 다이아 랭크</small></div>`;
    const f = $('.b-mf', el); f.innerHTML = `<button class="b-btn line" id="bNo">거절</button><button class="b-btn gold" id="bGo">듀얼 입장</button>`;
    $('#bNo', el).onclick = close; $('#bGo', el).onclick = () => App.startBattle({ mode: '무작위', opp: { name: opp } });
    burst(720, 330, ['#e3b341', '#fff'], 30);
  }, 3500 + rnd(1500));
};

/* ---------- 친구와 경기 (세로 탭) ---------- */
MOD_B.screens.friend = () => `${bHead('대전')}
  <div class="b-fr"><aside class="b-vt" id="bVt"><button class="on" data-t="make">${ui('battle', 18)} 방 만들기</button><button data-t="code">${ui('search', 18)} 코드로 입장</button><button data-t="list">${ui('user', 18)} 친구 목록</button><i class="b-vind"></i>
    <div class="b-vsep"></div><button class="b-vprac" data-go="practice">연습 듀얼 · VS AI →</button></aside>
    <section class="b-fp" id="bFp"></section></div>`;
const bSwitch = (k, on, lbl, sub) => `<label class="b-row"><div><b>${lbl}</b><small>${sub}</small></div><span class="b-sw ${on ? 'on' : ''}" data-k="${k}"><i></i></span></label>`;
const bDD = (k, opts, cur) => `<div class="b-dd" data-k="${k}"><button class="b-ddb"><span>${(opts.find(o => o[0] === cur) || opts[0])[1]}</span><i>▾</i></button><div class="b-ddl">${opts.map(o => `<button data-v="${o[0]}" class="${o[0] === cur ? 'on' : ''}">${o[1]}</button>`).join('')}</div></div>`;
const bSelect = (k, lbl, sub, opts, cur) => `<div class="b-row"><div><b>${lbl}</b><small>${sub}</small></div>${bDD(k, opts, cur)}</div>`;
MOD_B.bind.friend = el => {
  bBind(el);
  const FRIENDS = [['은빛딜러', 'on', '로비'], ['HeartGuard', 'on', '덱 편집 중'], ['Joker_77', 'game', '대전 중 · R5'], ['ClubKing', 'off', '3시간 전'], ['룬마스터', 'off', '어제']];
  const R = App.rules; let lim = R.turnLimit > 0;
  const tabs = {
    make: () => `<h2>방 만들기</h2><p class="b-mut">방 규칙을 정하고 초대 코드를 공유하세요. 게임이 너무 길어지는 것을 막으려면 턴 제한을 켜세요.</p>
      <div class="b-form"><div class="b-row"><div><b>방 이름</b><small>친구 목록에 표시됩니다</small></div><input class="b-in" value="${App.player.name}의 결투장" maxlength="16"></div>
      ${bSwitch('lim', lim, '턴 제한', '켜면 제한 턴 도달 시 HP가 높은 쪽 승리')}
      <div class="b-row sub ${lim ? '' : 'dis'}"><div><b>제한 턴 수</b><small>턴 제한이 켜져 있을 때만</small></div>${bDD('turnLimit', [[10, '10턴'], [15, '15턴'], [20, '20턴']], R.turnLimit || 10)}</div>
      ${bSelect('turnTime', '턴당 시간', '시간 초과 시 자동 제출', [[30, '30초'], [60, '60초'], [90, '90초'], [0, '무제한']], R.turnTime)}
      ${bSelect('startHP', '시작 HP', '캐릭터 고유 HP 대신 적용', [[60, 'HP 60'], [100, 'HP 100'], [150, 'HP 150']], R.startHP)}
      ${bSwitch('traitOpen', R.traitOpen, '특성 공개', '상대의 특성 칸을 서로 볼 수 있음')}</div>
      <div class="b-fa"><button class="b-btn gold" id="bMake">방 만들기</button></div>`,
    code: () => `<h2>코드로 입장</h2><p class="b-mut">친구에게 받은 4자리 초대 코드를 입력하세요. (RD- 뒤 4자리)</p>
      <div class="b-code"><span>RD-</span>${[0, 1, 2, 3].map(i => `<input maxlength="1" data-i="${i}">`).join('')}</div>
      <div class="b-fa"><button class="b-btn gold" id="bJoin" disabled>입장</button></div>`,
    list: () => `<h2>친구 목록 <small>${FRIENDS.filter(f => f[1] !== 'off').length}명 접속 중</small></h2>
      <div class="b-fl">${FRIENDS.map(([n, s, d], i) => `<div class="b-fi ${s}"><span class="av2">${n[0]}<i></i></span><div><b>${n}</b><small>${d}</small></div><button class="b-btn ${s === 'on' ? 'gold' : 'line'} sm" data-i="${i}" ${s === 'on' ? '' : 'disabled'}>${s === 'on' ? '초대' : s === 'game' ? '대전 중' : '오프라인'}</button></div>`).join('')}</div>`,
  };
  const render = t => {
    const fp = $('#bFp', el); fp.innerHTML = tabs[t](); fp.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
    $$('.b-sw', fp).forEach(s => s.onclick = e => { e.preventDefault(); s.classList.toggle('on'); const on = s.classList.contains('on'); if (s.dataset.k === 'lim') { lim = on; R.turnLimit = on ? (R.turnLimit || 10) : 0; $('.b-row.sub', fp).classList.toggle('dis', !on); } else R[s.dataset.k] = on; });
    $$('.b-dd', fp).forEach(dd => {
      $('.b-ddb', dd).onclick = e => { e.stopPropagation(); $$('.b-dd', fp).forEach(x => x !== dd && x.classList.remove('open')); dd.classList.toggle('open'); };
      $$('.b-ddl button', dd).forEach(o => o.onclick = () => { R[dd.dataset.k] = +o.dataset.v; $('.b-ddb span', dd).textContent = o.textContent; $$('.b-ddl button', dd).forEach(x => x.classList.toggle('on', x === o)); dd.classList.remove('open'); });
    });
    fp.onclick = e => { if (!e.target.closest('.b-dd')) $$('.b-dd', fp).forEach(x => x.classList.remove('open')); };
    const mk = $('#bMake', fp); if (mk) mk.onclick = () => {
      const code = roomCode();
      fp.innerHTML = `<h2>대기실</h2><div class="b-room"><div class="b-rc"><small>초대 코드</small><b>${code}</b><button class="b-btn line sm" id="bCp">${ui('copy', 16)} 복사</button></div>
        <div class="b-seats"><div class="b-seat me"><span class="av2">${App.player.name[0]}</span><b>${App.player.name}</b><small>방장 · 준비 완료</small></div><div class="b-vs">VS</div><div class="b-seat" id="bSeat"><span class="av2 empty">?</span><b>대기 중</b><small>친구를 초대하세요</small></div></div>
        <div class="b-rules">${R.turnLimit ? R.turnLimit + '턴 제한' : '턴 제한 없음'} · 턴당 ${R.turnTime || '∞'}${R.turnTime ? '초' : ''} · HP ${R.startHP} · 특성 ${R.traitOpen ? '공개' : '비공개'}</div></div>
        <div class="b-fa"><button class="b-btn line" id="bLeave">방 나가기</button><button class="b-btn gold" id="bStart" disabled>듀얼 시작</button></div>`;
      $('#bCp', fp).onclick = () => toast('초대 코드를 복사했습니다', 'ok');
      $('#bLeave', fp).onclick = () => render('make');
      App.after(() => { const s = $('#bSeat', fp); if (!s) return; const fr = FRIENDS[0][0]; s.classList.add('in'); s.innerHTML = `<span class="av2">${fr[0]}</span><b>${fr}</b><small>입장 · 준비 완료</small>`; const b = $('#bStart', fp); b.disabled = false; b.onclick = () => App.startBattle({ mode: '친구', opp: { name: fr } }); toast(`${fr} 님이 입장했습니다`, 'ok'); }, 3000);
    };
    const ins = $$('.b-code input', fp);
    ins.forEach((inp, i) => { inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (inp.value && ins[i + 1]) ins[i + 1].focus(); $('#bJoin', fp).disabled = ins.some(x => !x.value); inp.classList.toggle('fill', !!inp.value); }; inp.onkeydown = e => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); }; });
    if (ins[0]) setTimeout(() => ins[0].focus(), 50);
    const jn = $('#bJoin', fp); if (jn) jn.onclick = () => { toast('RD-' + ins.map(x => x.value).join('') + ' 방에 입장합니다', 'ok'); App.after(() => App.startBattle({ mode: '친구', opp: { name: '친구' } }), 800); };
    $$('.b-fi .b-btn[data-i]', fp).forEach(b => b.onclick = () => { b.textContent = '초대 보냄'; b.disabled = true; b.classList.replace('gold', 'line'); const n = FRIENDS[+b.dataset.i][0]; App.after(() => { toast(`${n} 님이 초대를 수락했습니다`, 'ok'); App.after(() => App.startBattle({ mode: '친구', opp: { name: n } }), 900); }, 1800); });
  };
  $$('#bVt button[data-t]', el).forEach((b, i) => b.onclick = () => { $$('#bVt button[data-t]', el).forEach(x => x.classList.toggle('on', x === b)); $('.b-vind', el).style.transform = `translateY(${i * 100}%)`; render(b.dataset.t); });
  render('make');
};

/* ---------- 연습 대전 ---------- */
const B_AI = [
  { n: '견습 딜러', lv: 2, g: '입문', c: '#6fb3ff', d: '패를 무작위로 고르기도 하는 신입 딜러. 규칙을 익히기에 좋습니다.', deck: '하트 방어형', stars: 1 },
  { n: '숙련 딜러', lv: 5, g: '보통', c: '#e3b341', d: '항상 최적 족보를 만들고 방패와 강타를 적절히 섞어 씁니다.', deck: '스페이드 공격형', stars: 2 },
  { n: '카지노 마스터', lv: 8, g: '숙련', c: '#ff6b81', d: '높은 등급 카드를 우선 드래프트하고 액티브를 공격적으로 사용합니다.', deck: '전설 2장 풀덱', stars: 3 },
];
MOD_B.screens.practice = () => `${bHead('연습 듀얼')}
  <div class="b-pr"><div class="b-prh"><button class="b-back" data-go="lobby">← 홈</button><h2>상대할 AI를 고르세요</h2><span>카드를 누르면 상세 정보가 열립니다</span></div>
  <div class="b-car" id="bCar">${B_AI.map((a, i) => `<div class="b-ai" data-i="${i}" style="--c:${a.c}"><div class="b-aart"><span>${['♣', '♠', '♦'][i]}</span></div><small>CPU LV.${a.lv} · ${a.g}</small><h3>${a.n}</h3><div class="b-st">${'★'.repeat(a.stars)}${'☆'.repeat(3 - a.stars)}</div></div>`).join('')}</div>
  <div class="b-dots" id="bDots">${B_AI.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div></div>
  <div class="b-sheet" id="bSheet"><div class="b-grab"></div><div class="b-shc" id="bShc"></div></div>`;
MOD_B.bind.practice = el => {
  bBind(el);
  let cur = 1, open = false;
  const lay = () => {
    $$('.b-ai', el).forEach((c, i) => { const o = i - cur; c.style.transform = `translateX(${o * 340}px) scale(${o ? .78 : 1}) rotateY(${o * -18}deg)`; c.style.opacity = o ? .55 : 1; c.style.zIndex = 5 - Math.abs(o); c.classList.toggle('cur', !o); });
    $$('#bDots i', el).forEach((d, i) => d.classList.toggle('on', i === cur));
    const a = B_AI[cur];
    $('#bShc', el).innerHTML = `<div class="b-shl"><small>CPU LV.${a.lv} · ${a.g}</small><h3>${a.n}</h3><p>${a.d}</p></div><div class="b-shm"><div><small>덱 성향</small><b>${a.deck}</b></div><div><small>난이도</small><b class="gold">${'★'.repeat(a.stars)}${'☆'.repeat(3 - a.stars)}</b></div><div><small>규칙</small><b>HP ${App.rules.startHP}</b></div></div><button class="b-btn gold big" id="bPgo">듀얼 시작</button>`;
    $('#bPgo', el).onclick = () => { App.cpu = a.lv; App.startBattle({ mode: '연습', opp: { name: a.n } }); };
  };
  const setOpen = v => { open = v; $('#bSheet', el).classList.toggle('open', v); };
  $$('.b-ai', el).forEach((c, i) => c.onclick = () => { if (i === cur) setOpen(!open); else { cur = i; lay(); } });
  $$('#bDots i', el).forEach((d, i) => d.onclick = () => { cur = i; lay(); });
  $('.b-grab', el).onclick = () => setOpen(!open);
  let sy = null; const sh = $('#bSheet', el);
  sh.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; sy = e.clientY; });
  window.addEventListener('pointerup', e => { if (sy == null) return; const dy = e.clientY - sy; if (dy > 30) setOpen(false); else if (dy < -30) setOpen(true); sy = null; }, { once: false });
  App.keyH = e => { if (e.key === 'ArrowLeft') { cur = Math.max(0, cur - 1); lay(); return true; } if (e.key === 'ArrowRight') { cur = Math.min(2, cur + 1); lay(); return true; } if (e.key === 'Enter') { setOpen(true); return true; } return false; };
  lay(); setTimeout(() => setOpen(true), 500);
};

/* ---------- 카드 살펴보기 ---------- */
MOD_B.screens.cards = () => `${bHead('카드')}
  <div class="b-cv"><aside class="b-det" id="bDet"></aside>
  <section class="b-cg"><div class="b-tool"><label class="b-search">${ui('search', 16)}<input id="bQ" placeholder="카드 이름·효과 검색"></label>
    <div class="b-dd" id="bSort"><button class="b-ddb"><span>문양순</span><i>▾</i></button><div class="b-ddl"><button data-v="suit" class="on">문양순</button><button data-v="grade">등급순</button><button data-v="name">이름순</button></div></div>
    <div class="b-chips" id="bF"><button data-f="all" class="on">전체</button><button data-f="A">액티브</button><button data-f="P">패시브</button><button data-f="E">영웅+</button><button data-f="deck">내 덱</button></div><span class="b-cnt" id="bCnt"></span></div>
  <div class="b-grid" id="bGrid"></div></section></div>`;
MOD_B.bind.cards = el => {
  bBind(el);
  let q = '', sort = 'suit', f = 'all', sel = '♠Q';
  const detail = id => {
    const e = EF[id], inD = App.myDeck.includes(id), d = $('#bDet', el);
    d.innerHTML = `<div class="b-dc">${cardHTML(e)}</div><div class="b-di"><small>${GRADES[e.g].ko} · ${e.k === 'A' ? '액티브' : '패시브'} · ${e.cat}</small><h2>${e.name} <span>${e.suit}${e.rank}</span></h2><p>${e.desc}</p>
      <div class="b-dk"><div><small>쿨타임</small><b>${e.k === 'A' ? e.cd + '턴' : '-'}</b></div><div><small>특성 문양</small><b>${e.suit}</b></div><div><small>숫자</small><b>${e.rank}</b></div></div>
      <button class="b-btn ${inD ? 'line' : 'gold'}" id="bTg">${inD ? '덱에서 빼기' : '덱에 넣기'}</button></div>`;
    d.querySelector('.b-dc').animate([{ transform: 'rotateY(90deg)' }, { transform: 'none' }], { duration: 320, easing: 'ease-out' });
    $('#bTg', el).onclick = () => { if (inD) App.myDeck = App.myDeck.filter(x => x !== id); else { const er = canAdd(App.myDeck, id); if (er) { toast(er, 'err'); return; } App.myDeck.push(id); } toast(inD ? '덱에서 뺐습니다' : '덱에 넣었습니다', inD ? '' : 'ok'); detail(id); grid(); };
  };
  const grid = () => {
    let L = EFFECTS.filter(e => (!q || (e.name + e.desc + e.cat).includes(q)) && (f === 'all' || (f === 'A' || f === 'P' ? e.k === f : f === 'E' ? GRADE_ORDER[e.g] >= 2 : App.myDeck.includes(e.id))));
    if (sort === 'grade') L = L.slice().sort((a, b) => GRADE_ORDER[b.g] - GRADE_ORDER[a.g]); if (sort === 'name') L = L.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    $('#bCnt', el).textContent = `${L.length} / 52`;
    $('#bGrid', el).innerHTML = L.length ? L.map((e, i) => `<button class="b-gc ${e.id === sel ? 'on' : ''} ${App.myDeck.includes(e.id) ? 'in' : ''} g-${e.g} ${isRed(e.suit) ? 'red' : ''}" data-id="${e.id}" style="--i:${i}"><b>${e.suit}${e.rank}</b><span>${e.name}</span><em>${icon(e.cat, 18)}</em></button>`).join('') : '<div class="b-empty">검색 결과가 없습니다</div>';
  };
  $('#bGrid', el).onclick = e => { const b = e.target.closest('.b-gc'); if (!b) return; sel = b.dataset.id; $$('.b-gc', el).forEach(x => x.classList.toggle('on', x === b)); detail(sel); };
  $('#bQ', el).oninput = e => { q = e.target.value.trim(); grid(); };
  $$('#bF button', el).forEach(b => b.onclick = () => { f = b.dataset.f; $$('#bF button', el).forEach(x => x.classList.toggle('on', x === b)); grid(); });
  const dd = $('#bSort', el); $('.b-ddb', dd).onclick = e => { e.stopPropagation(); dd.classList.toggle('open'); };
  $$('.b-ddl button', dd).forEach(o => o.onclick = () => { sort = o.dataset.v; $('.b-ddb span', dd).textContent = o.textContent; $$('.b-ddl button', dd).forEach(x => x.classList.toggle('on', x === o)); dd.classList.remove('open'); grid(); });
  el.addEventListener('click', e => { if (!e.target.closest('.b-dd')) dd.classList.remove('open'); });
  grid(); detail(sel);
};

/* ---------- 나만의 덱 (3분할) ---------- */
MOD_B.screens.deck = () => `${bHead('덱')}
  <div class="b-de"><aside class="b-dinfo" id="bDi"></aside>
  <section class="b-main" id="bMain"><div class="b-mh2"><div><b>메인 덱</b><span id="bMc"></span></div><div class="b-lims" id="bLim"></div></div><div class="b-mgrid" id="bMg"></div><div class="b-drop">여기로 끌어 놓아 추가 · 카드를 바깥으로 끌어 빼기</div></section>
  <section class="b-own" id="bOwn"><div class="b-mh2"><b>보유 카드</b><div class="b-chips sm" id="bOs">${['전체', ...SUITS].map((s, i) => `<button class="${!i ? 'on' : ''}" data-s="${s}">${s}</button>`).join('')}</div></div><div class="b-olist" id="bOl"></div></section></div>`;
MOD_B.bind.deck = el => {
  bBind(el);
  let os = '전체', info = App.myDeck[0] || '♠A';
  const showInfo = id => { info = id; const e = EF[id]; $('#bDi', el).innerHTML = `<small>카드 정보</small>${cardHTML(e)}<h3>${e.name}</h3><p>${e.desc}</p><div class="b-tags"><span>${GRADES[e.g].ko}</span><span>${e.k === 'A' ? '액티브' : '패시브'}</span><span>${e.cat}</span></div><div class="b-tc">${traitCounts(App.myDeck).filter(x => x.tier >= 0).slice(0, 4).map(x => `<div><b>${x.t.icon}</b>${x.t.name} <em>${x.n}</em></div>`).join('') || '<span class="b-mut">덱 기준 활성 특성 없음</span>'}</div>`; };
  const render = (nw) => {
    const d = App.myDeck, inf = deckInfo(d);
    $('#bMc', el).textContent = `${inf.n} / 26`;
    $('#bLim', el).innerHTML = `<span class="${inf.E > 6 ? 'bad' : ''}">영웅 ${inf.E}/6</span><span class="${inf.L > 2 ? 'bad' : ''}">전설 ${inf.L}/2</span><span class="${inf.n === 26 ? 'ok' : ''}">${inf.n === 26 ? '✓ 덱 완성' : `${26 - inf.n}장 부족`}</span>`;
    const sorted = d.slice().sort((a, b) => SUITS.indexOf(EF[a].suit) - SUITS.indexOf(EF[b].suit) || RANKS.indexOf(EF[a].rank) - RANKS.indexOf(EF[b].rank));
    $('#bMg', el).innerHTML = sorted.map(id => `<div class="b-mc g-${EF[id].g} ${isRed(EF[id].suit) ? 'red' : ''} ${id === nw ? 'new' : ''}" draggable="true" data-id="${id}"><b>${id}</b><span>${EF[id].name}</span></div>`).join('') + Array.from({ length: Math.max(0, 26 - d.length) }, () => '<div class="b-mc empty"></div>').join('');
    $('#bOl', el).innerHTML = EFFECTS.filter(e => os === '전체' || e.suit === os).map(e => `<div class="b-oc ${d.includes(e.id) ? 'in' : ''} g-${e.g} ${isRed(e.suit) ? 'red' : ''}" draggable="${!d.includes(e.id)}" data-id="${e.id}"><b>${e.id}</b><span>${e.name}</span><small>${GRADES[e.g].ko}</small><em>${d.includes(e.id) ? '덱' : '+'}</em></div>`).join('');
  };
  const add = id => { const er = canAdd(App.myDeck, id); if (er) { toast(er, 'err'); shake($('#bLim', el)); return; } App.myDeck.push(id); render(id); showInfo(id); };
  const rem = id => { App.myDeck = App.myDeck.filter(x => x !== id); render(); toast(`${EF[id].name} 제외`); };
  let drag = null;
  el.addEventListener('dragstart', e => { const c = e.target.closest('[draggable=true]'); if (!c) return; drag = { id: c.dataset.id, from: c.classList.contains('b-mc') ? 'main' : 'own' }; e.dataTransfer.setData('text/plain', drag.id); c.classList.add('drag'); el.classList.add('dragging-' + drag.from); });
  el.addEventListener('dragend', e => { $$('.drag', el).forEach(x => x.classList.remove('drag')); el.classList.remove('dragging-main', 'dragging-own'); $('#bMain', el).classList.remove('over'); $('#bOwn', el).classList.remove('over'); drag = null; });
  [['#bMain', 'own', add], ['#bOwn', 'main', rem]].forEach(([sel, from, fn]) => {
    const z = $(sel, el);
    z.addEventListener('dragover', e => { if (drag && drag.from === from) { e.preventDefault(); z.classList.add('over'); } });
    z.addEventListener('dragleave', e => { if (!z.contains(e.relatedTarget)) z.classList.remove('over'); });
    z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); if (drag && drag.from === from) fn(drag.id); });
  });
  $('#bMg', el).addEventListener('click', e => { const c = e.target.closest('.b-mc[data-id]'); if (c) showInfo(c.dataset.id); });
  $('#bMg', el).addEventListener('dblclick', e => { const c = e.target.closest('.b-mc[data-id]'); if (c) rem(c.dataset.id); });
  $('#bOl', el).addEventListener('click', e => { const c = e.target.closest('.b-oc'); if (!c) return; showInfo(c.dataset.id); if (e.target.closest('em') && !c.classList.contains('in')) add(c.dataset.id); });
  $('#bOl', el).addEventListener('dblclick', e => { const c = e.target.closest('.b-oc'); if (c && !c.classList.contains('in')) add(c.dataset.id); });
  $$('#bOs button', el).forEach(b => b.onclick = () => { os = b.dataset.s; $$('#bOs button', el).forEach(x => x.classList.toggle('on', x === b)); render(); });
  render(); showInfo(info);
};

/* ---------- 대전 기록 ---------- */
MOD_B.screens.history = () => `${bHead('기록')}
  <div class="b-hi"><div class="b-seg" id="bSeg">${['전체', '무작위', '친구', '연습'].map((s, i) => `<button class="${!i ? 'on' : ''}" data-m="${s}">${s}</button>`).join('')}<i class="b-pill"></i></div>
  <div class="b-hsum" id="bHs"></div><div class="b-hlist" id="bHl"></div></div>`;
MOD_B.bind.history = el => {
  bBind(el);
  const render = m => {
    const L = App.history.filter(h => m === '전체' || h.mode === m), s = historyStats(L);
    $('#bHs', el).innerHTML = `<div><small>경기</small><b>${s.n}</b></div><div><small>승률</small><b class="gold">${s.rate}%</b></div><div><small>최고 연승</small><b>${s.best}</b></div><div><small>최다 MVP</small><b>${s.topMvp}</b></div>`;
    $('#bHl', el).innerHTML = L.length ? L.map((h, i) => `<div class="b-hc ${h.win ? 'w' : 'l'}" style="--i:${i}"><div class="b-hst"></div><div class="b-hm"><b>${h.win ? 'WIN' : 'LOSE'}</b><span>${h.mode} · ${h.date}</span></div><div class="b-hv"><small>vs</small><b>${h.opp}</b></div><div class="b-hx"><span>${h.rounds}R</span><span>MVP <b>${h.mvp}</b></span><span>피해 ${h.dmg}</span></div></div>`).join('') : '<div class="b-empty">해당 모드의 기록이 없습니다</div>';
  };
  $$('#bSeg button', el).forEach((b, i) => b.onclick = () => { $$('#bSeg button', el).forEach(x => x.classList.toggle('on', x === b)); $('.b-pill', el).style.transform = `translateX(${i * 100}%)`; render(b.dataset.m); });
  render('전체');
};

injectCSS(`
.vB{background:radial-gradient(ellipse at 30% 40%,#16203a,#0a0f1c 65%);color:#e8ecf5;font-family:'Noto Sans KR';bottom:72px}
.vB button{font-family:inherit;color:inherit;cursor:pointer}
.chrome-B .b-tabbar{position:absolute;left:0;right:0;bottom:0;height:72px;background:#111a2e;border-top:1px solid #26314d;display:grid;grid-template-columns:repeat(5,1fr)}
.b-tabbar button{background:none;border:0;color:#7d89a6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:12px;font-weight:700;transition:color .2s}
.b-tabbar button:hover{color:#cfd6e6}.b-tabbar button.on{color:#e3b341}
.b-tabbar button.on svg{animation:bTab .4s cubic-bezier(.2,1.8,.4,1)}@keyframes bTab{from{transform:translateY(4px) scale(.8)}}
.b-ind{position:absolute;left:0;top:-1px;width:20%;height:3px;background:#e3b341;transition:transform .4s cubic-bezier(.6,0,.2,1);box-shadow:0 0 12px #e3b341}
.b-head{position:absolute;left:0;right:0;top:0;height:64px;border-bottom:1px solid #26314d;display:flex;align-items:center;padding:0 40px}
.b-logo{font:900 24px 'Noto Serif KR';color:#e3b341;letter-spacing:.06em}.b-logo small{font:700 13px 'Noto Sans KR';color:#9aa6c2;margin-left:8px;letter-spacing:0}.b-logo em{font:700 14px 'Noto Sans KR';color:#e8ecf5;font-style:normal;margin-left:10px}
.b-prof{margin-left:auto;display:flex;align-items:center;gap:10px}.b-prof .av{width:32px;height:32px;border-radius:50%;background:#e3b341}.b-prof b{display:block;font-size:13px}.b-prof small{font:12px 'Noto Serif KR';color:#9aa6c2}
.b-set{background:none;border:0;font-weight:700;font-size:13px;margin-left:18px}
.b-btn{border-radius:10px;padding:14px 18px;font-size:16px;font-weight:700;border:1.5px solid #e8ecf5;background:none;transition:.18s}
.b-btn.gold{background:#e3b341;border-color:#e3b341;color:#111!important}.b-btn.line{color:#fff}
.b-btn:hover:not([disabled]){transform:translateY(-2px);box-shadow:0 8px 20px rgba(227,179,65,.25)}.b-btn.line:hover:not([disabled]){background:#ffffff14}
.b-btn:active:not([disabled]){transform:scale(.97)}.b-btn[disabled]{opacity:.35;cursor:not-allowed}
.b-btn.sm{padding:7px 14px;font-size:13px}.b-btn.big{padding:16px 40px;font-size:18px}
.b-mut{color:#8d98b3;font-size:13px}
/* home */
.b-home{position:absolute;left:0;right:0;top:64px;bottom:0}
.b-show{position:absolute;left:30px;top:90px;width:360px;height:480px;perspective:900px}
.b-ace{position:absolute;inset:20px;border:3px solid #e3b341;border-radius:14px;background:#141c33;padding:22px;transform:rotate(-4deg);transition:transform .25s ease-out;transform-style:preserve-3d;box-shadow:0 30px 60px rgba(0,0,0,.5);animation:bFloat 5s ease-in-out infinite}
@keyframes bFloat{50%{translate:0 -8px}}
.b-shine{position:absolute;inset:0;border-radius:11px;pointer-events:none;transition:background .1s}
.b-ah{display:flex;justify-content:space-between;align-items:center}.b-ah b{font:900 40px 'Noto Serif KR';color:#e3b341}.b-ah span{font-size:12px;color:#9aa6c2}
.b-art{margin:14px 0;height:200px;border-radius:8px;background:#1d2747;border:1px solid #2c3863;display:flex;align-items:center;justify-content:center;transform:translateZ(30px)}
.b-ring{width:150px;height:150px;border:2px solid #e3b341;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:90px;color:#e3b341;animation:bRing 6s linear infinite}
@keyframes bRing{50%{box-shadow:0 0 40px #e3b34155;transform:scale(1.04)}}
.b-ace h3{font:900 34px 'Noto Serif KR';margin:6px 0 4px;transform:translateZ(20px)}.b-ace p{color:#9aa6c2;font-size:13px;margin:0}
.b-myace{position:absolute;left:412px;top:190px;width:330px}
.b-myace small{font:700 13px 'Noto Serif KR';color:#e3b341;letter-spacing:.2em}.b-myace h2{font:900 32px/1.3 'Noto Serif KR';margin:8px 0 12px}.b-myace p{color:#9aa6c2;font-size:13px;line-height:1.7}.b-myace em{color:#e3b341;font-style:normal}
.b-dl{display:block;font-size:13px;margin:18px 0 8px}
.b-minis{display:flex;gap:8px}.b-mini{width:52px;height:72px;border-radius:5px;border:1px solid #2c3863;background:#1d2747;padding:5px;display:flex;flex-direction:column;justify-content:space-between;transition:.2s}
.b-mini.hl{border:2px solid #e3b341}.b-mini b{font-size:14px}.b-mini span{font-size:9px;color:#9aa6c2}.b-mini:hover{transform:translateY(-6px)}
.vB .b-home-r{position:absolute;right:40px;top:120px;width:520px;display:flex;flex-direction:column;gap:16px}
.b-duel{border:2px solid #e3b341;border-radius:14px;background:#121a30;padding:28px 30px;position:relative;overflow:hidden}
.b-duel::after{content:'';position:absolute;inset:-50%;background:conic-gradient(from 0deg,transparent 0 80%,#e3b34122 90%,transparent);animation:bSweep 6s linear infinite;pointer-events:none}
@keyframes bSweep{to{transform:rotate(360deg)}}
.b-dt{font:900 84px/1 'Noto Serif KR';color:#e3b341;letter-spacing:.04em}
.b-dsub{display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 16px}.b-dsub b{font:900 22px 'Noto Serif KR'}.b-dsub span{font-size:12px;color:#9aa6c2}
.b-db{display:grid;grid-template-columns:1fr 1fr;gap:12px;position:relative;z-index:1}
.b-solo,.b-rec{display:flex;justify-content:space-between;align-items:center;border:1px solid #26314d;border-radius:12px;background:#121a30;padding:18px 28px;text-align:left;transition:.2s}
.b-solo:hover,.b-rec:hover{border-color:#e3b341;transform:translateX(4px)}
.b-solo small{font:700 12px 'Noto Serif KR';color:#9aa6c2;letter-spacing:.2em}.b-solo b{display:block;font:900 22px 'Noto Serif KR'}.b-solo span{font-size:30px;color:#e3b341}
.b-rec small{font-size:12px;color:#9aa6c2}.b-rec b{display:block;font-size:15px}
.b-sq{display:flex;gap:4px}.b-sq i{width:11px;height:11px;background:#6fb3ff}.b-sq i.l{background:#ff7b7b}
/* match modal */
.b-mod{position:absolute;inset:0;z-index:5}
.b-mback{position:absolute;inset:0;background:rgba(5,8,16,.7);backdrop-filter:blur(3px);animation:tFadeIn .3s}
.b-mbox{position:absolute;left:50%;top:50%;width:460px;margin-left:-230px;transform:translateY(-50%);background:#121a30;border:2px solid #e3b341;border-radius:18px;padding:28px 30px;display:flex;flex-direction:column;align-items:center;gap:14px;animation:bPop .45s cubic-bezier(.2,1.4,.4,1);box-shadow:0 40px 80px rgba(0,0,0,.6)}
@keyframes bPop{from{opacity:0;transform:translateY(-40%) scale(.85)}}
.b-mod.out .b-mbox{animation:bOut .25s forwards}.b-mod.out .b-mback{animation:tFadeOut .25s forwards}@keyframes bOut{to{opacity:0;transform:translateY(-45%) scale(.9)}}
.b-mh{text-align:center}.b-mh small{font:700 12px 'Noto Serif KR';color:#e3b341;letter-spacing:.2em}.b-mh h3{font:900 28px 'Noto Serif KR';margin:4px 0 0}
.b-spin{position:relative;width:150px;height:150px}.b-spin svg{width:100%;height:100%;transform:rotate(-90deg)}
.b-spin circle{fill:none;stroke:#26314d;stroke-width:6}.b-spin .arc{stroke:#e3b341;stroke-dasharray:80 250;stroke-linecap:round;animation:bArc 1.2s linear infinite;transform-origin:60px 60px}
@keyframes bArc{to{transform:rotate(360deg)}}
.b-sc{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:56px;color:#e3b341}
.b-spin.found{width:auto;height:150px;animation:bPop .5s}
.b-found{display:flex;flex-direction:column;align-items:center;gap:6px}.b-found b{font:900 24px 'Noto Serif KR'}.b-found small{color:#9aa6c2}
.av2{position:relative;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#e3b341,#a5751a);color:#111;font:900 26px 'Noto Serif KR';display:flex;align-items:center;justify-content:center;flex-shrink:0}
.av2.empty{background:#26314d;color:#7d89a6}
.b-mt{display:flex;flex-direction:column;align-items:center}.b-mt b{font:900 26px 'Noto Serif KR'}.b-mt span{font-size:12px;color:#9aa6c2}
.b-mdeck{width:100%;background:#1a2440;border-radius:10px;padding:12px 16px;display:grid;grid-template-columns:1fr auto;row-gap:2px}.b-mdeck small{grid-column:1/3;font-size:11px;color:#9aa6c2}.b-mdeck span{font-size:12px;color:#e3b341}
.b-tip{width:100%;border-left:3px solid #e3b341;padding:4px 12px;font-size:13px;min-height:44px}.b-tip small{display:block;color:#e3b341;font-weight:700;font-size:11px}
.b-tip span.in{animation:evIn .4s}
.b-mf{display:flex;gap:10px;width:100%}.b-mf .b-btn{flex:1}
/* friend */
.b-fr{position:absolute;left:0;right:0;top:64px;bottom:0;display:grid;grid-template-columns:260px 1fr}
.b-vt{position:relative;border-right:1px solid #26314d;padding:26px 0;display:flex;flex-direction:column}
.b-vt button[data-t]{position:relative;z-index:1;height:58px;background:none;border:0;text-align:left;padding:0 30px;display:flex;align-items:center;gap:12px;font-size:16px;font-weight:700;color:#8d98b3;transition:color .2s}
.b-vt button[data-t].on{color:#fff}.b-vt button[data-t]:hover{color:#fff}
.b-vind{position:absolute;left:0;right:0;top:26px;height:58px;background:linear-gradient(90deg,#e3b34133,transparent);border-left:4px solid #e3b341;transition:transform .35s cubic-bezier(.6,0,.2,1)}
.b-vsep{flex:1}.b-vprac{background:none;border:1px solid #26314d;margin:0 20px;border-radius:10px;padding:14px;font-weight:700;transition:.2s}.b-vprac:hover{border-color:#e3b341;color:#e3b341}
.b-fp{padding:30px 60px;overflow:auto}
.b-fp h2{font:900 30px 'Noto Serif KR';margin:0 0 6px}.b-fp h2 small{font:500 14px 'Noto Sans KR';color:#6fd38f;margin-left:10px}
.b-form{margin-top:18px;max-width:780px;border:1px solid #26314d;border-radius:14px;background:#121a30}
.b-row{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-bottom:1px solid #1e2844;gap:20px;transition:opacity .2s}
.b-row:last-child{border:0}.b-row b{display:block;font-size:15px}.b-row small{font-size:12px;color:#8d98b3}
.b-row.sub{padding-left:46px;background:#0f1628}.b-row.dis{opacity:.35;pointer-events:none}
.b-in{background:#0a0f1c;border:1px solid #2c3863;border-radius:8px;color:#fff;padding:10px 14px;font-size:14px;width:260px}.b-in:focus{border-color:#e3b341;outline:0}
.b-sw{width:52px;height:30px;border-radius:15px;background:#2c3863;position:relative;cursor:pointer;transition:background .25s;flex-shrink:0}
.b-sw i{position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.4,1.6,.5,1)}
.b-sw.on{background:#e3b341}.b-sw.on i{transform:translateX(22px)}
.b-dd{position:relative}.b-ddb{background:#0a0f1c;border:1px solid #2c3863;border-radius:8px;padding:9px 14px;min-width:150px;display:flex;justify-content:space-between;gap:16px;font-size:14px}
.b-ddb i{font-style:normal;transition:transform .2s}.b-dd.open .b-ddb{border-color:#e3b341}.b-dd.open .b-ddb i{transform:rotate(180deg)}
.b-ddl{position:absolute;right:0;top:calc(100% + 4px);min-width:100%;background:#1a2440;border:1px solid #2c3863;border-radius:8px;padding:4px;z-index:10;display:none;flex-direction:column;box-shadow:0 14px 30px rgba(0,0,0,.5)}
.b-dd.open .b-ddl{display:flex;animation:evIn .2s}.b-ddl button{background:none;border:0;text-align:left;padding:8px 12px;border-radius:6px;font-size:14px}.b-ddl button:hover{background:#26314d}.b-ddl button.on{color:#e3b341}
.b-fa{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;max-width:780px}.b-fa .b-btn{min-width:160px}
.b-code{display:flex;align-items:center;gap:12px;margin:40px 0}.b-code span{font:900 44px 'Noto Serif KR';color:#9aa6c2}
.b-code input{width:84px;height:104px;border-radius:12px;border:2px solid #2c3863;background:#0a0f1c;color:#e3b341;font:900 52px 'Noto Serif KR';text-align:center;transition:.15s}
.b-code input:focus{border-color:#e3b341;outline:0;transform:translateY(-4px)}.b-code input.fill{border-color:#e3b341;animation:bPop .25s}
.b-fl{display:flex;flex-direction:column;gap:8px;margin-top:16px;max-width:780px}
.b-fi{display:flex;align-items:center;gap:16px;background:#121a30;border:1px solid #26314d;border-radius:12px;padding:12px 18px}
.b-fi .av2{width:48px;height:48px;font-size:20px}.b-fi .av2 i{position:absolute;right:0;bottom:0;width:14px;height:14px;border-radius:50%;border:2px solid #121a30;background:#55606f}
.b-fi.on .av2 i{background:#3ddc84}.b-fi.game .av2 i{background:#e3b341}.b-fi.off{opacity:.55}
.b-fi div{flex:1}.b-fi b{display:block}.b-fi small{color:#8d98b3;font-size:12px}
.b-room{max-width:780px;margin-top:16px;display:flex;flex-direction:column;gap:16px}
.b-rc{display:flex;align-items:center;gap:16px;background:#121a30;border:1px solid #26314d;border-radius:12px;padding:14px 20px}.b-rc small{color:#9aa6c2}.b-rc b{font:900 32px 'Noto Serif KR';color:#e3b341;flex:1}
.b-seats{display:grid;grid-template-columns:1fr 60px 1fr;align-items:center}.b-seat{background:#121a30;border:1px dashed #2c3863;border-radius:14px;padding:22px;display:flex;flex-direction:column;align-items:center;gap:6px}
.b-seat.me,.b-seat.in{border:2px solid #e3b341}.b-seat.in{animation:bPop .4s}.b-seat small{color:#8d98b3}.b-vs{font:900 24px 'Noto Serif KR';color:#e3b341;text-align:center}
.b-rules{font-size:13px;color:#9aa6c2}
/* practice */
.b-pr{position:absolute;left:0;right:0;top:64px;bottom:0}
.b-prh{display:flex;align-items:center;gap:18px;padding:22px 40px}.b-prh h2{font:900 26px 'Noto Serif KR';margin:0}.b-prh span{color:#8d98b3;font-size:13px}
.b-back{background:none;border:1px solid #2c3863;border-radius:8px;padding:7px 14px;font-weight:700}.b-back:hover{border-color:#e3b341}
.b-car{position:absolute;left:50%;top:100px;width:300px;height:390px;margin-left:-150px;perspective:1000px}
.b-ai{position:absolute;inset:0;border-radius:18px;border:2px solid var(--c);background:linear-gradient(180deg,#1a2440,#0f1628);padding:20px;display:flex;flex-direction:column;transition:transform .5s cubic-bezier(.2,1,.3,1),opacity .4s,box-shadow .3s;cursor:pointer}
.b-ai.cur{box-shadow:0 0 0 4px #e3b34155,0 30px 60px rgba(0,0,0,.5)}.b-ai.cur:hover{transform:translateY(-6px)!important}
.b-aart{height:220px;border-radius:12px;background:radial-gradient(circle at 50% 40%,var(--c),transparent 70%),#0a0f1c;display:flex;align-items:center;justify-content:center;font-size:110px;color:#fff;text-shadow:0 10px 30px rgba(0,0,0,.5)}
.b-ai small{margin-top:14px;font-size:12px;color:var(--c);font-weight:700}.b-ai h3{font:900 28px 'Noto Serif KR';margin:2px 0}.b-st{color:#e3b341;letter-spacing:.2em}
.b-dots{position:absolute;left:0;right:0;top:510px;display:flex;justify-content:center;gap:8px}.b-dots i{width:10px;height:10px;border-radius:50%;background:#2c3863;cursor:pointer;transition:.3s}.b-dots i.on{width:30px;border-radius:5px;background:#e3b341}
.b-sheet{position:absolute;left:120px;right:120px;bottom:0;height:200px;background:#1a2440;border:1px solid #2c3863;border-bottom:0;border-radius:22px 22px 0 0;transform:translateY(152px);transition:transform .45s cubic-bezier(.2,1,.3,1);box-shadow:0 -20px 40px rgba(0,0,0,.4);z-index:3;touch-action:none}
.b-sheet.open{transform:none}
.b-grab{width:60px;height:5px;border-radius:3px;background:#55617f;margin:10px auto 0;cursor:pointer}.b-grab::after{content:'';display:block;height:30px;margin-top:-12px}
.b-shc{display:grid;grid-template-columns:1.3fr 1.2fr auto;gap:30px;align-items:center;padding:18px 36px}
.b-shl small{color:#e3b341;font-weight:700;font-size:12px}.b-shl h3{font:900 26px 'Noto Serif KR';margin:2px 0}.b-shl p{color:#9aa6c2;font-size:13px;margin:0}
.b-shm{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.b-shm div{background:#121a30;border-radius:10px;padding:10px 12px}.b-shm small{display:block;font-size:11px;color:#8d98b3}.b-shm b{font-size:14px}.b-shm b.gold{color:#e3b341}
/* cards */
.b-cv{position:absolute;left:0;right:0;top:64px;bottom:0;display:grid;grid-template-columns:360px 1fr}
.b-det{border-right:1px solid #26314d;padding:24px 30px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
.b-dc{perspective:600px;display:flex;justify-content:center}
.vB .ec{width:200px;height:270px;border-radius:12px;border:2px solid #e3b341;background:linear-gradient(180deg,#1d2747,#121a30);color:#e8ecf5;padding:14px;display:flex;flex-direction:column;gap:3px;box-shadow:0 20px 40px rgba(0,0,0,.4)}
.vB .ec .ec-code{font:900 26px 'Noto Serif KR';color:#e3b341}.vB .ec.red .ec-code{color:#ff8a8a}.vB .ec .ec-g{font-size:10px;color:#9aa6c2}
.vB .ec .ec-n{font:900 24px 'Noto Serif KR'}.vB .ec .ec-t{font-size:11px;color:#9aa6c2}.vB .ec .ec-ic{color:#e3b341;margin:auto}.vB .ec .ec-ic svg{width:60px;height:60px}.vB .ec .ec-d{font-size:12px;flex:0}.vB .ec .ec-f{font-size:11px;color:#e3b341}
.vB .ec.g-C{border-color:#7d89a6}.vB .ec.g-R{border-color:#6fb3ff}.vB .ec.g-E{border-color:#c48bff}
.b-di small{color:#e3b341;font-size:12px;font-weight:700}.b-di h2{font:900 28px 'Noto Serif KR';margin:2px 0}.b-di h2 span{font-size:16px;color:#9aa6c2}.b-di p{color:#c9d0e0;font-size:14px;margin:4px 0 12px}
.b-dk{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.b-dk div{background:#121a30;border-radius:8px;padding:8px 10px}.b-dk small{display:block;color:#8d98b3;font-weight:400;font-size:11px}.b-dk b{font-size:16px}
.b-di .b-btn{width:100%}
.b-cg{padding:18px 30px;display:flex;flex-direction:column;gap:14px;min-height:0}
.b-tool{display:flex;gap:10px;align-items:center}
.b-search{display:flex;align-items:center;gap:8px;background:#0a0f1c;border:1px solid #2c3863;border-radius:8px;padding:0 12px;color:#8d98b3}.b-search input{background:none;border:0;color:#fff;padding:9px 0;font-size:14px;width:180px;outline:0}.b-search:focus-within{border-color:#e3b341}
.b-chips{display:flex;gap:6px}.b-chips button{background:#121a30;border:1px solid #2c3863;border-radius:99px;padding:6px 13px;font-size:13px;font-weight:700;color:#9aa6c2;transition:.15s}.b-chips button:hover{color:#fff}.b-chips button.on{background:#e3b341;border-color:#e3b341;color:#111}
.b-chips.sm button{padding:3px 10px}
.b-cnt{margin-left:auto;font-size:12px;color:#8d98b3}
.b-grid{display:grid;grid-template-columns:repeat(9,1fr);gap:8px;overflow:auto;align-content:start;padding:4px}
.b-gc{height:120px;border-radius:8px;border:1.5px solid #2c3863;background:#121a30;padding:8px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;transition:.18s;animation:bGc .35s calc(var(--i)*12ms) both}
@keyframes bGc{from{opacity:0;transform:scale(.9)}}
.b-gc b{font:900 17px 'Noto Serif KR';color:#e3b341}.b-gc.red b{color:#ff8a8a}.b-gc span{font-size:12px;font-weight:700;margin-top:2px}.b-gc em{margin-top:auto;color:#55617f}
.b-gc.g-E{border-color:#5d3d86}.b-gc.g-L{border-color:#8a6a1e;background:linear-gradient(160deg,#2b2510,#121a30)}
.b-gc.in::after{content:'덱';position:absolute;margin:84px 0 0 52px;font-size:10px;background:#e3b341;color:#111;padding:1px 5px;border-radius:4px;font-weight:900}
.b-gc{position:relative}.b-gc:hover{transform:translateY(-4px);border-color:#e3b341}.b-gc.on{border:2px solid #e3b341;box-shadow:0 0 20px #e3b34155;background:#1d2747}
.b-empty{grid-column:1/-1;text-align:center;color:#8d98b3;padding:60px}
/* deck */
.b-de{position:absolute;left:0;right:0;top:64px;bottom:0;display:grid;grid-template-columns:280px 1fr 380px}
.b-dinfo{border-right:1px solid #26314d;padding:20px 24px;display:flex;flex-direction:column;gap:8px;overflow:hidden}
.b-dinfo>small{color:#9aa6c2;font-weight:700}.b-dinfo .ec{width:170px;height:226px;margin:0 auto}.b-dinfo .ec .ec-ic svg{width:44px;height:44px}
.b-dinfo h3{font:900 22px 'Noto Serif KR';margin:6px 0 0}.b-dinfo p{color:#c9d0e0;font-size:13px;margin:0}
.b-tags{display:flex;gap:5px}.b-tags span{font-size:11px;background:#1a2440;padding:3px 8px;border-radius:5px}
.b-tc{display:flex;flex-direction:column;gap:4px;margin-top:6px;font-size:12px}.b-tc b{color:#e3b341;margin-right:6px}.b-tc em{font-style:normal;color:#9aa6c2;float:right}
.b-main{position:relative;padding:18px 22px;display:flex;flex-direction:column;gap:10px;transition:background .2s}
.b-mh2{display:flex;justify-content:space-between;align-items:center}.b-mh2 b{font:900 18px 'Noto Serif KR'}.b-mh2 span{margin-left:8px;color:#e3b341;font-weight:700}
.b-lims{display:flex;gap:6px}.b-lims span{font-size:12px;background:#1a2440;padding:4px 9px;border-radius:6px}.b-lims span.bad{background:#c0392b}.b-lims span.ok{background:#1d7a45}
.b-mgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;align-content:start}
.b-mc{height:92px;border-radius:7px;border:1.5px solid #2c3863;background:#1a2440;padding:6px 7px;display:flex;flex-direction:column;justify-content:space-between;cursor:grab;transition:.15s}
.b-mc b{font:900 15px 'Noto Serif KR';color:#e3b341}.b-mc.red b{color:#ff8a8a}.b-mc span{font-size:11px;font-weight:700}
.b-mc.g-E{border-color:#7b56b0}.b-mc.g-L{border-color:#e3b341}.b-mc:hover{transform:translateY(-3px);border-color:#e3b341}
.b-mc.empty{border:1.5px dashed #26314d;background:none;cursor:default}.b-mc.new{animation:bPop .4s}.b-mc.drag,.b-oc.drag{opacity:.3}
.b-drop{margin-top:auto;border:2px dashed #2c3863;border-radius:10px;padding:10px;text-align:center;font-size:12px;color:#7d89a6;transition:.2s}
.vB.dragging-own .b-main .b-drop{border-color:#e3b341;color:#e3b341}.b-main.over{background:#e3b34110}.b-main.over .b-drop{background:#e3b34122}
.b-own{border-left:1px solid #26314d;padding:18px 20px;display:flex;flex-direction:column;gap:10px;min-height:0;transition:background .2s}
.vB.dragging-main .b-own{background:#c0392b18}.b-own.over{background:#c0392b33}
.b-olist{display:flex;flex-direction:column;gap:5px;overflow:auto}
.b-oc{display:grid;grid-template-columns:44px 1fr auto 40px;align-items:center;gap:8px;background:#121a30;border:1px solid #26314d;border-radius:8px;padding:8px 10px;cursor:grab;transition:.15s}
.b-oc b{font:900 14px 'Noto Serif KR';color:#e3b341}.b-oc.red b{color:#ff8a8a}.b-oc span{font-size:13px;font-weight:700}.b-oc small{font-size:10px;color:#8d98b3}
.b-oc em{font-style:normal;text-align:center;background:#e3b341;color:#111;border-radius:6px;font-weight:900;padding:3px 0;cursor:pointer}.b-oc.in{opacity:.45;cursor:default}.b-oc.in em{background:#2c3863;color:#9aa6c2}
.b-oc:hover{border-color:#e3b341}
/* history */
.b-hi{position:absolute;left:0;right:0;top:64px;bottom:0;padding:22px 40px;display:flex;flex-direction:column;gap:16px}
.b-seg{position:relative;display:grid;grid-template-columns:repeat(4,130px);background:#121a30;border:1px solid #26314d;border-radius:12px;padding:4px;width:max-content}
.b-seg button{position:relative;z-index:1;background:none;border:0;padding:10px;font-weight:700;color:#8d98b3;transition:color .25s}.b-seg button.on{color:#111}
.b-pill{position:absolute;left:4px;top:4px;bottom:4px;width:130px;background:#e3b341;border-radius:9px;transition:transform .35s cubic-bezier(.6,0,.2,1)}
.b-hsum{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.b-hsum div{background:#121a30;border:1px solid #26314d;border-radius:12px;padding:12px 18px}.b-hsum small{color:#8d98b3;font-size:12px}.b-hsum b{display:block;font:900 28px 'Noto Serif KR'}.b-hsum b.gold{color:#e3b341}
.b-hlist{display:grid;grid-template-columns:1fr 1fr;gap:10px;overflow:auto;align-content:start}
.b-hc{position:relative;display:grid;grid-template-columns:110px 1fr auto;align-items:center;gap:14px;background:#121a30;border:1px solid #26314d;border-radius:12px;padding:14px 20px 14px 24px;overflow:hidden;transition:.2s;animation:evIn .35s calc(var(--i)*.04s) both}
.b-hc:hover{border-color:#e3b341;transform:translateY(-2px)}
.b-hst{position:absolute;left:0;top:0;bottom:0;width:6px;background:#6fb3ff}.b-hc.l .b-hst{background:#ff7b7b}
.b-hm b{display:block;font:900 20px 'Noto Serif KR';color:#6fb3ff}.b-hc.l .b-hm b{color:#ff7b7b}.b-hm span{font-size:11px;color:#8d98b3}
.b-hv small{color:#8d98b3;font-size:11px}.b-hv b{display:block;font-size:16px}
.b-hx{display:flex;gap:10px;font-size:12px;color:#9aa6c2}.b-hx b{color:#e3b341}
.toast.tv-B{background:#1a2440;border:1px solid #e3b341;border-radius:12px}.toast.tv-B.err{background:#7a1f1f;border-color:#ff7b7b}.toast.tv-B.ok{background:#e3b341;color:#111}
`);
