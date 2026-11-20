'use strict';
/* =========================================================
   로비 화면들 (라이브 서비스형 구조 + 레트로 CRT 디자인)
   홈 · 무작위 매칭(모달) · 친구와 경기(세로 탭) · AI 연습(3단계) · 카드 · 덱(3분할) · 기록
   ========================================================= */
const goBtns = el => $$('[data-go]', el).forEach(b => b.addEventListener('click', () => App.after(() => App.go(b.dataset.go), 120)));

/* ---------- 홈 ---------- */
function homeHTML() {
  const st = historyStats(App.history);
  const ace = EFFECTS.find(e => e.name === st.topMvp) || EF['♠Q'];
  const last = App.history[0];
  return `<div class="home">
    <div class="ace-show" id="aceShow"><div class="ace ${isRed(ace.suit) ? 'red' : ''}" id="ace"><div class="shine"></div>
      <div class="ace-h"><b>${codeHTML(ace)}</b><span>${GRADES[ace.g].ko} · ${ace.k === 'A' ? '액티브' : '패시브'}</span></div>
      <div class="ace-art">${icon(ace.cat, 130)}</div>
      <h3>${ace.name}</h3><p>${ace.desc}</p></div></div>
    <div class="myace"><small>MY ACE</small><h2>이번 판을 끝내는 한 장</h2>
      <p>가장 많이 MVP가 된 카드가 홈에 걸립니다. <em>MVP ${st.topMvpN}회</em></p>
      <b class="dl">현재 덱 · ${deckSummary(App.myDeck)} · ${App.myDeck.length}장</b>
      <div class="minis">${App.myDeck.slice(0, 5).map((id, i) => miniCard(EF[id], '', `style="--i:${i}"`)).join('')}</div></div>
    <div class="home-r">
      <div class="duel"><div class="duel-t">DUEL</div><div class="duel-s"><b>1VS1 듀얼</b><span>HP를 먼저 0으로</span></div>
        <div class="duel-b">${btn('무작위 상대', 'RANDOM', C.red, 'data-go="match"', 'big')}${btn('친구와 경기', 'FRIEND', C.blue, 'data-go="friend"', 'big')}</div></div>
      <button class="row-btn" data-go="practice" style="--c:${C.green}"><div><small>SOLO · VS AI</small><b>연습 듀얼</b></div><span class="row-tag">${DIFFS[App.diff].ko}</span><em>▶</em></button>
      <button class="row-btn" id="guideBtn" style="--c:${C.yellow}"><div><small>HOW TO PLAY</small><b>게임 방법</b></div><span class="row-tag">처음이라면</span><em>?</em></button>
      <button class="row-btn" data-go="history" style="--c:${C.gray}"><div><small>최근 기록</small><b>${last ? `${last.win ? '승리' : '패배'} · ${last.rounds}라운드 · MVP ${last.mvp}` : '기록 없음'}</b></div><div class="sq">${App.history.slice(0, 10).map(h => `<i class="${h.win ? 'w' : 'l'}"></i>`).join('')}</div></button>
    </div>
    <div class="home-fan">${[['A', '♠'], ['7', '♥'], ['K', '◆'], ['9', '◆'], ['K', '♣']].map(([r, s], i) => `<div class="fpc fpc-new" style="--i:${i};--r:${(i - 2) * 10}deg;--x:${(i - 2) * 30}px">${pokerHTML({ r, s })}</div>`).join('')}</div>
  </div>`;
}
function bindTilt(el) {
  const show = $("#aceShow", el), ace = $('#ace', el); if (!show) return;
  show.addEventListener('mousemove', e => {
    const r = ace.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    ace.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 18}deg) rotate(-4deg)`;
    $('.shine', ace).style.background = `radial-gradient(circle at ${(x + .5) * 100}% ${(y + .5) * 100}%,rgba(255,255,255,.45),transparent 55%)`;
  });
  show.addEventListener('mouseleave', () => { ace.style.transform = ''; $('.shine', ace).style.background = ''; });
}
Screens.home = {
  tab: 'home', title: '', html: homeHTML,
  bind(el) {
    goBtns(el); bindTilt(el); bindTilt3D(el, '.minis .mc,.fpc', 20);
    $('#guideBtn', el).onclick = () => guideModal();
    if (!store.get('guideSeen', false)) App.after(() => guideModal(), 700);
    $$('.fpc', el).forEach(c => c.onclick = () => { Sfx.play('flip'); const p = FX.center(c); burst(p.x, p.y, ['#fff', C.red, C.yellow], 14, 90); c.animate([{ rotate: '0 1 0 0deg' }, { rotate: '0 1 0 360deg' }], { duration: 500, easing: 'cubic-bezier(.2,1.2,.4,1)' }); });
    $('#ace', el).addEventListener('click', () => { Sfx.play('passive'); const p = FX.center($('#ace', el)); FX.ring(p.x, p.y, C.yellow, 420, 600, 10); burst(p.x, p.y, ['#ffe08a', '#fff'], 30, 200); });
  },
};

/* ---------- 무작위 매칭 (홈 위 모달) ---------- */
const TIPS = ['실드는 1턴 뒤 소멸합니다. 공격 직전에 쓰세요.', '인벤토리가 가득 차면 교체 미리보기로 바뀌는 효과를 확인할 수 있어요.', '심판은 마지막 라운드에 아껴 두면 MVP가 되기 쉽습니다.', '리롤은 매 턴 1회 · 행운·조커 카드로 늘릴 수 있어요.', '점수 차이만큼 낮은 쪽의 HP가 줄어듭니다.'];
Screens.match = {
  tab: 'home', title: '무작위 매칭',
  html: () => `${homeHTML()}<div class="mm"><div class="mm-back"></div><div class="mm-box">
    <small class="lbl">RANDOM DUEL</small><h3 id="mmT">상대를 찾는 중<span class="blink">_</span></h3>
    <div class="mm-cards" id="mmC">${Array.from({ length: 5 }, (_, i) => `<div class="bk" style="--i:${i}"><div class="bkf"></div><div class="bkb">${'RIVAL'[i]}</div></div>`).join('')}</div>
    <div class="mm-time"><b id="mmTime" class="num">00:00</b><span>예상 대기 00:10</span></div>
    <div class="mm-deck"><small>사용 덱</small><b>${deckSummary(App.myDeck)} · ${App.myDeck.length}장</b><span>영웅 ${deckInfo(App.myDeck).E}/6 · 전설 ${deckInfo(App.myDeck).L}/2</span></div>
    <div class="mm-tip"><small>TIP</small><span id="mmTip">${TIPS[0]}</span></div>
    <div class="ai-note">ⓘ 온라인 대전은 준비 중입니다 · 현재는 AI가 상대합니다</div>
    <div class="mm-f" id="mmF">${btn('취소', '', C.gray, 'id="mmX"')}</div></div></div>`,
  bind(el) {
    goBtns(el); bindTilt(el);
    let t = 0, ti = 0;
    App.every(() => { t++; const e = $('#mmTime', el); e.textContent = fmtTime(t); bump(e); Sfx.play('tick', .2); }, 1000);
    App.every(() => { ti = (ti + 1) % TIPS.length; const tp = $('#mmTip', el); tp.textContent = TIPS[ti]; bump(tp); }, 2600);
    const close = () => { $('.mm', el).classList.add('out'); setTimeout(() => App.go('home'), 220); };
    $('#mmX', el).onclick = close; $('.mm-back', el).onclick = close;
    App.after(() => {
      const opp = pick(OPP_NAMES); App.clear();
      $('#mmC', el).classList.add('flip');
      $('#mmT', el).innerHTML = `<b class="hl">${opp}</b> 발견!`;
      Sfx.play('match'); FX.flash('#ffe08a', .35); FX.ring(720, 330, '#ffe08a', 600, 700, 14); FX.shake(.6); BG.pulse(1.5);
      burst(720, 300, [C.red, C.yellow, '#fff', C.blue], 60, 300);
      [0, 1, 2, 3, 4].forEach(i => setTimeout(() => Sfx.play('flip'), i * 80));
      $('#mmF', el).innerHTML = btn('거절', '', C.gray, 'id="mmNo"') + btn('듀얼 입장', 'ENTER', C.red, 'id="mmGo"');
      $('#mmNo', el).onclick = close;
      $('#mmGo', el).onclick = () => App.after(() => App.startBattle({ mode: '무작위', opp: opp }), 150);
    }, 3300 + rnd(1600));
  },
};

/* ---------- 친구와 경기 (세로 탭) ---------- */
const dd = (k, opts, cur) => `<div class="dd" data-k="${k}"><button class="dd-b"><span>${(opts.find(o => o[0] === cur) || opts[0])[1]}</span><i>▾</i></button><div class="dd-l">${opts.map(o => `<button data-v="${o[0]}" class="${o[0] === cur ? 'on' : ''}">${o[1]}</button>`).join('')}</div></div>`;
const sw = (k, on) => `<span class="sw ${on ? 'on' : ''}" data-k="${k}"><i></i></span>`;
Screens.friend = {
  tab: 'friend', title: '대전',
  html: () => `<div class="fr"><aside class="vt" id="vt"><button class="on" data-t="make">${ui('battle', 18)} 방 만들기</button><button data-t="code">${ui('search', 18)} 코드로 입장</button><button data-t="list">${ui('user', 18)} 친구 목록</button><i class="vt-ind"></i>
    <div class="vt-sp"></div><button class="row-btn sm" data-go="match" style="--c:${C.red}"><div><small>QUICK</small><b>무작위 상대</b></div><em>▶</em></button><button class="row-btn sm" data-go="practice" style="--c:${C.green}"><div><small>SOLO</small><b>AI 연습</b></div><em>▶</em></button></aside>
    <section class="fp" id="fp"></section></div>`,
  bind(el) {
    goBtns(el);
    const FR = [['은빛딜러', 'on', '로비'], ['HeartGuard', 'on', '덱 편집 중'], ['Joker_77', 'game', '대전 중 · R5'], ['ClubKing', 'off', '3시간 전'], ['룬마스터', 'off', '어제']];
    const R = App.rules;
    const tabs = {
      make: () => `<h2>방 만들기</h2><p class="mut">규칙을 정하고 초대 코드를 공유하세요. 게임이 길어지지 않게 하려면 턴 제한을 켜세요.</p><div class="ai-note">ⓘ 온라인 대전은 준비 중입니다 · 지금은 친구 대신 AI가 입장해 대결합니다 (방 규칙은 그대로 적용)</div>
        <div class="fr-form">
          <div class="frow"><div><b>방 이름</b><small>친구 목록에 표시됩니다</small></div><input class="inp" value="${App.player.name}의 테이블" maxlength="16"></div>
          <div class="frow"><div><b>턴 제한</b><small>제한 턴에 도달하면 HP가 높은 쪽이 승리</small></div>${sw('lim', R.turnLimit > 0)}</div>
          <div class="frow sub ${R.turnLimit ? '' : 'dis'}"><div><b>제한 턴 수</b><small>턴 제한이 켜져 있을 때만 적용</small></div>${dd('turnLimit', [[10, '10턴'], [15, '15턴'], [20, '20턴']], R.turnLimit || 10)}</div>
          <div class="frow"><div><b>턴당 시간</b><small>패 구성·쇼다운 준비 시간 · 초과 시 자동 제출 (연습 대전 제외)</small></div>${dd('turnTime', [[30, '30초'], [60, '60초'], [90, '90초'], [0, '무제한']], R.turnTime)}</div>
          <div class="frow"><div><b>시작 HP</b><small>양쪽 모두 같은 HP로 시작</small></div>${dd('startHP', [[60, 'HP 60'], [100, 'HP 100'], [150, 'HP 150']], R.startHP)}</div>
        </div><div class="fa">${btn('방 만들기', 'CREATE', C.red, 'id="mk"', 'wide')}</div>`,
      code: () => `<h2>코드로 입장</h2><p class="mut">친구에게 받은 초대 코드의 RD- 뒤 4자리를 입력하세요.</p>
        <div class="fr-code"><span>RD-</span>${[0, 1, 2, 3].map(i => `<input maxlength="1" data-i="${i}">`).join('')}</div><div class="fa">${btn('입장', 'JOIN', C.blue, 'id="join" disabled', 'wide')}</div>`,
      list: () => `<h2>친구 목록 <small>${FR.filter(f => f[1] !== 'off').length}명 접속 중</small></h2>
        <div class="fr-list">${FR.map(([n, s, d], i) => `<div class="fr-item ${s}"><span class="av2">${n[0]}<i></i></span><div><b>${n}</b><small>${d}</small></div>${btn(s === 'on' ? '초대' : s === 'game' ? '대전 중' : '오프라인', '', s === 'on' ? C.yellow : C.gray, `data-i="${i}" ${s === 'on' ? '' : 'disabled'}`, 'sm')}</div>`).join('')}</div>`,
    };
    const render = t => {
      const fp = $('#fp', el); fp.innerHTML = tabs[t]();
      fp.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' });
      $$('.sw', fp).forEach(s => s.onclick = () => { s.classList.toggle('on'); const on = s.classList.contains('on'); R.turnLimit = on ? (R.turnLimit || 10) : 0; $('.frow.sub', fp).classList.toggle('dis', !on); });
      $$('.dd', fp).forEach(d => {
        $('.dd-b', d).onclick = e => { e.stopPropagation(); $$('.dd', fp).forEach(x => x !== d && x.classList.remove('open')); d.classList.toggle('open'); };
        $$('.dd-l button', d).forEach(o => o.onclick = () => { R[d.dataset.k] = +o.dataset.v; $('.dd-b span', d).textContent = o.textContent; $$('.dd-l button', d).forEach(x => x.classList.toggle('on', x === o)); d.classList.remove('open'); });
      });
      fp.onclick = e => { if (!e.target.closest('.dd')) $$('.dd', fp).forEach(x => x.classList.remove('open')); };
      const mk = $('#mk', fp); if (mk) mk.onclick = () => {
        const code = roomCode();
        fp.innerHTML = `<h2>대기실</h2><div class="fr-room"><div class="rc"><small>초대 코드</small><b class="num">${code}</b>${btn(ui('copy', 16) + ' 복사', '', C.yellow, 'id="cp"', 'sm')}</div>
          <div class="seats"><div class="fr-seat me"><span class="av2">${App.player.name[0]}</span><b>${App.player.name}</b><small>방장 · 준비 완료</small></div><div class="fr-vs">VS</div><div class="fr-seat" id="seat"><span class="av2 empty">?</span><b>대기 중<span class="blink">_</span></b><small>친구를 초대하세요</small></div></div>
          <div class="rules-s">${R.turnLimit ? R.turnLimit + '턴 제한' : '턴 제한 없음'} · 턴당 ${R.turnTime ? R.turnTime + '초' : '무제한'} · HP ${R.startHP}</div></div>
          <div class="fa">${btn('방 나가기', '', C.gray, 'id="leave"')}${btn('듀얼 시작', 'START', C.red, 'id="start" disabled', 'wide')}</div>`;
        $('#cp', fp).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(code).catch(() => { }); toast('초대 코드를 복사했습니다', 'ok'); };
        $('#leave', fp).onclick = () => render('make');
        App.after(() => {
          const s = $('#seat', fp); if (!s) return; const fr = FR[0][0];
          s.classList.add('in'); s.innerHTML = `<span class="av2">${fr[0]}</span><b>${fr}</b><small>입장 · 준비 완료</small>`;
          const b = $('#start', fp); b.disabled = false; b.classList.add('ready'); b.onclick = () => App.startBattle({ mode: '친구', opp: fr, rules: { ...App.rules } });
          toast(`${fr} 님이 입장했습니다`, 'ok');
        }, 3000);
      };
      const ins = $$('.fr-code input', fp);
      ins.forEach((inp, i) => {
        inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (inp.value && ins[i + 1]) ins[i + 1].focus(); $('#join', fp).disabled = ins.some(x => !x.value); inp.classList.toggle('fill', !!inp.value); };
        inp.onkeydown = e => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); };
      });
      if (ins[0]) setTimeout(() => ins[0].focus(), 50);
      const jn = $('#join', fp); if (jn) jn.onclick = () => { toast('RD-' + ins.map(x => x.value).join('') + ' 방에 입장합니다', 'ok'); App.after(() => App.startBattle({ mode: '친구', opp: '친구', rules: { ...App.rules } }), 700); };
      $$('.fr-item .btn[data-i]', fp).forEach(b => b.onclick = () => {
        b.querySelector('b').textContent = '초대 보냄'; b.disabled = true; const n = FR[+b.dataset.i][0];
        App.after(() => { toast(`${n} 님이 초대를 수락했습니다`, 'ok'); App.after(() => App.startBattle({ mode: '친구', opp: n, rules: { ...App.rules } }), 800); }, 1800);
      });
    };
    $$('#vt button[data-t]', el).forEach((b, i) => b.onclick = () => { $$('#vt button[data-t]', el).forEach(x => x.classList.toggle('on', x === b)); $('.vt-ind', el).style.transform = `translateY(${i * 100}%)`; render(b.dataset.t); });
    render('make');
  },
};

/* ---------- AI 연습 (쉬움 · 보통 · 어려움) ---------- */
const DKEYS = ['easy', 'normal', 'hard'];
Screens.practice = {
  tab: 'friend', title: 'AI 연습',
  html: () => `<div class="pr"><div class="pr-h">${btn('◀ 뒤로', '', C.gray, 'data-go="friend"', 'sm back')}<h2>상대할 AI 난이도를 고르세요</h2><span class="mut">← → 로 이동 · Enter 로 상세</span></div>
    <div class="pr-car" id="car">${DKEYS.map((k, i) => { const d = DIFFS[k]; return `<div class="pr-ai" data-i="${i}" style="--c:${d.color}"><div class="ai-art"><span>${d.icon}</span></div><div class="ai-lv">${d.ko}</div><h3>${d.who}</h3><div class="stars">${'★'.repeat(d.stars)}${'☆'.repeat(3 - d.stars)}</div></div>`; }).join('')}</div>
    <div class="pr-dots" id="dots">${DKEYS.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div></div>
    <div class="pr-sheet" id="sheet"><div class="pr-grab"></div><div class="sheet-c" id="shc"></div></div>`,
  bind(el) {
    goBtns(el);
    let cur = DKEYS.indexOf(App.diff), open = false;
    let lay = () => {
      $$('.pr-ai', el).forEach((c, i) => { const o = i - cur; c.style.transform = `translateX(${o * 330}px) scale(${o ? .78 : 1}) rotateY(${o * -16}deg)`; c.style.opacity = o ? .55 : 1; c.style.zIndex = 5 - Math.abs(o); c.classList.toggle('cur', !o); });
      $$('#dots i', el).forEach((d, i) => d.classList.toggle('on', i === cur));
      const d = DIFFS[DKEYS[cur]];
      $('#shc', el).innerHTML = `<div class="sh-l"><small style="color:${d.color}">난이도 · ${d.ko}</small><h3>${d.who}</h3><p>${d.desc}</p></div>
        <div class="sh-m"><div><small>덱 성향</small><b>${d.style}</b></div><div><small>난이도</small><b style="color:${d.color}">${'★'.repeat(d.stars)}${'☆'.repeat(3 - d.stars)}</b></div><div><small>규칙</small><b>HP ${DEFAULT_RULES.startHP}</b></div></div>
        ${btn('연습 시작', 'PLAY', C.red, 'id="pgo"', 'big')}`;
      $('#pgo', el).onclick = () => { App.diff = d.key; store.set('diff', d.key); App.after(() => App.startBattle({ mode: '연습', opp: `AI · ${d.ko}` }), 150); };
    };
    const setOpen = v => { if (open !== v) Sfx.play(v ? 'open' : 'whoosh'); open = v; $('#sheet', el).classList.toggle('open', v); };
    bindTilt3D($('#car', el), '.pr-ai.cur', 14);
    const lay0 = lay; lay = () => { lay0(); Sfx.play('whoosh'); const c = $('.pr-ai.cur', el); if (c) { const p = FX.center(c); setTimeout(() => burst(p.x, p.y - 100, [DIFFS[DKEYS[cur]].color, '#fff'], 16, 140), 250); } };
    $$('.pr-ai', el).forEach((c, i) => c.onclick = () => { if (i === cur) setOpen(!open); else { cur = i; lay(); } });
    $$('#dots i', el).forEach((d, i) => d.onclick = () => { cur = i; lay(); });
    $('.pr-grab', el).onclick = () => setOpen(!open);
    App.keyH = e => {
      if (e.key === 'ArrowLeft') { cur = Math.max(0, cur - 1); lay(); return true; }
      if (e.key === 'ArrowRight') { cur = Math.min(2, cur + 1); lay(); return true; }
      if (e.key === 'Enter') { if (open) $('#pgo', el).click(); else setOpen(true); return true; }
      return false;
    };
    lay(); App.after(() => setOpen(true), 450);
  },
};

/* ---------- 카드 살펴보기 ---------- */
Screens.cards = {
  tab: 'cards', title: '카드',
  html: () => `<div class="cv"><aside class="cv-det" id="det"></aside>
    <section class="cg"><div class="cv-tool"><label class="cv-search">${ui('search', 16)}<input id="q" placeholder="카드 이름·효과 검색"></label>
      ${dd('sort', [['suit', '문양순'], ['grade', '등급순'], ['name', '이름순']], 'suit')}
      <div class="chips" id="flt">${[['all', '전체', C.gray], ['A', '액티브', C.red], ['P', '패시브', C.blue], ['E', '영웅+', C.purple], ['deck', '내 덱', C.yellow]].map(([f, t, c], i) => `<button class="chip ${!i ? 'on' : ''}" data-f="${f}" style="--c:${c}">${t}</button>`).join('')}</div><span class="cv-cnt num" id="cnt"></span></div>
    <div class="cv-grid" id="grid"></div></section></div>`,
  bind(el) {
    let q = '', sort = 'suit', f = 'all', sel = '♠Q';
    const detail = id => {
      const e = EF[id], inD = App.myDeck.includes(id);
      $('#det', el).innerHTML = `<div class="det-c">${cardHTML(e)}</div><small class="lbl">${GRADES[e.g].ko} · ${e.k === 'A' ? '액티브' : '패시브'} · ${e.cat}</small><h2>${e.name} <span>${codeHTML(e)}</span></h2><p>${e.desc}</p>
        <div class="cv-kv"><div><small>쿨타임</small><b class="num">${e.k === 'A' ? e.cd + '턴' : '-'}</b></div><div><small>문양</small><b>${e.suit}</b></div><div><small>숫자</small><b class="num">${e.rank}</b></div></div>
        ${btn(inD ? '덱에서 빼기' : '덱에 넣기', `${App.myDeck.length}/26`, inD ? C.gray : C.green, 'id="tg"', 'wide')}`;
      $('.det-c', el).animate([{ transform: 'rotateY(90deg)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
      $('#tg', el).onclick = () => { if (inD) App.myDeck = App.myDeck.filter(x => x !== id); else { const er = canAdd(App.myDeck, id); if (er) { toast(er, 'err'); return; } App.myDeck = [...App.myDeck, id]; } toast(inD ? '덱에서 뺐습니다' : '덱에 넣었습니다', inD ? '' : 'ok'); detail(id); grid(); };
    };
    const grid = () => {
      let L = EFFECTS.filter(e => (!q || (e.name + e.desc + e.cat).includes(q)) && (f === 'all' || (f === 'A' || f === 'P' ? e.k === f : f === 'E' ? GRADE_ORDER[e.g] >= 2 : App.myDeck.includes(e.id))));
      if (sort === 'grade') L = L.slice().sort((a, b) => GRADE_ORDER[b.g] - GRADE_ORDER[a.g]);
      if (sort === 'name') L = L.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      $('#cnt', el).textContent = `${L.length}/52`;
      $('#grid', el).innerHTML = L.length ? L.map((e, i) => miniCard(e, `${e.id === sel ? 'on' : ''} ${App.myDeck.includes(e.id) ? 'in' : ''}`, `style="--i:${i}" data-tip="<b>${e.name}</b><br>${e.desc}"`)).join('') : '<div class="empty-msg">검색 결과가 없습니다</div>';
    };
    $('#grid', el).onclick = e => { const b = e.target.closest('.mc'); if (!b) return; sel = b.dataset.id; $$('.mc', el).forEach(x => x.classList.toggle('on', x === b)); detail(sel); };
    $('#q', el).oninput = e => { q = e.target.value.trim(); grid(); };
    $$('#flt .chip', el).forEach(b => b.onclick = () => { f = b.dataset.f; $$('#flt .chip', el).forEach(x => x.classList.toggle('on', x === b)); grid(); });
    const d = $('.dd', el); $('.dd-b', d).onclick = e => { e.stopPropagation(); d.classList.toggle('open'); };
    $$('.dd-l button', d).forEach(o => o.onclick = () => { sort = o.dataset.v; $('.dd-b span', d).textContent = o.textContent; $$('.dd-l button', d).forEach(x => x.classList.toggle('on', x === o)); d.classList.remove('open'); grid(); });
    el.addEventListener('click', e => { if (!e.target.closest('.dd')) d.classList.remove('open'); });
    bindTips(el); grid(); detail(sel); bindTilt3D($('#grid', el), '.mc', 20); bindTilt3D($('#det', el), '.ec', 16);
  },
};

/* ---------- 나만의 덱 (3분할 편집기) ---------- */
Screens.deck = {
  tab: 'deck', title: '덱',
  html: () => `<div class="de"><aside class="dinfo" id="di"></aside>
    <section class="dmain" id="dmain"><div class="dh"><div><b>메인 덱</b><span class="num" id="mc"></span></div><div class="lims" id="lim"></div></div><div class="mgrid" id="mg"></div>
      <div class="drop">보유 카드를 여기로 끌어 놓아 추가 · 덱 카드를 오른쪽으로 끌거나 더블클릭해 빼기</div>
      <div class="dact">${btn('기본 덱', '', C.gray, 'id="rst"', 'sm')}${btn('무작위 덱', '', C.purple, 'id="rnd"', 'sm')}${btn('모두 비우기', '', C.gray, 'id="clr"', 'sm')}</div></section>
    <section class="own" id="own"><div class="dh"><b>보유 카드</b><div class="chips sm" id="os">${['전체', ...SUITS].map((s, i) => `<button class="chip ${!i ? 'on' : ''}" data-s="${s}" style="--c:${C.yellow}">${s}</button>`).join('')}</div></div><div class="olist" id="ol"></div></section></div>`,
  bind(el) {
    let os = '전체', info = App.myDeck[0] || '♠A';
    const showInfo = id => {
      info = id; const e = EF[id], inf = deckInfo(App.myDeck);
      $('#di', el).innerHTML = `<small class="lbl">카드 정보</small>${cardHTML(e)}<h3>${e.name}</h3><p>${e.desc}</p>
        <div class="dk-tags"><span>${GRADES[e.g].ko}</span><span>${e.k === 'A' ? '액티브' : '패시브'}</span><span>${e.cat}</span></div>
        <div class="dstat"><div><small>액티브</small><b class="num">${inf.A}</b></div><div><small>패시브</small><b class="num">${inf.P}</b></div>${SUITS.map(s => `<div><small>${s}</small><b class="num">${inf.suit[s]}</b></div>`).join('')}</div>`;
    };
    const render = nw => {
      const d = App.myDeck, inf = deckInfo(d);
      $('#mc', el).textContent = `${inf.n} / 26`; bump($('#mc', el));
      $('#lim', el).innerHTML = `<span class="${inf.E > 6 ? 'bad' : ''}">영웅 ${inf.E}/6</span><span class="${inf.L > 2 ? 'bad' : ''}">전설 ${inf.L}/2</span><span class="${inf.n === 26 ? 'ok' : ''}">${inf.n === 26 ? '✓ 덱 완성' : `${26 - inf.n}장 부족`}</span>`;
      const sorted = d.slice().sort((a, b) => SUITS.indexOf(EF[a].suit) - SUITS.indexOf(EF[b].suit) || RANKS.indexOf(EF[a].rank) - RANKS.indexOf(EF[b].rank));
      $('#mg', el).innerHTML = sorted.map(id => miniCard(EF[id], id === nw ? 'new' : '', 'draggable="true" data-from="main"')).join('') + Array.from({ length: Math.max(0, 26 - d.length) }, () => '<div class="mc empty"></div>').join('');
      $('#ol', el).innerHTML = EFFECTS.filter(e => os === '전체' || e.suit === os).map(e => `<div class="oc ${d.includes(e.id) ? 'in' : ''} g-${e.g} ${isRed(e.suit) ? 'red' : ''}" draggable="${!d.includes(e.id)}" data-id="${e.id}" data-from="own"><b>${e.id}</b><span>${e.name}</span><small>${GRADES[e.g].ko}</small><em>${d.includes(e.id) ? '덱' : '+'}</em></div>`).join('');
    };
    const add = id => {
      const er = canAdd(App.myDeck, id); if (er) { toast(er, 'err'); shake($('#lim', el)); return; }
      App.myDeck = [...App.myDeck, id]; render(id); showInfo(id); Sfx.play('coin');
      const c = $(`#mg .mc[data-id="${CSS.escape(id)}"]`); if (c) { const p = FX.center(c); FX.ring(p.x, p.y, '#ffe08a', 140, 400, 6); burst(p.x, p.y, ['#ffe08a', '#fff'], 14, 80); }
    };
    const rem = id => { App.myDeck = App.myDeck.filter(x => x !== id); render(); toast(`${EF[id].name} 제외`); };
    let drag = null;
    el.addEventListener('dragstart', e => { const c = e.target.closest('[draggable=true]'); if (!c) return; drag = { id: c.dataset.id, from: c.dataset.from }; e.dataTransfer.setData('text/plain', drag.id); c.classList.add('drag'); el.classList.add('dragging-' + drag.from); });
    el.addEventListener('dragend', () => { $$('.drag', el).forEach(x => x.classList.remove('drag')); el.classList.remove('dragging-main', 'dragging-own'); $('#dmain', el).classList.remove('over'); $('#own', el).classList.remove('over'); drag = null; });
    [['#dmain', 'own', add], ['#own', 'main', rem]].forEach(([s, from, fn]) => {
      const z = $(s, el);
      z.addEventListener('dragover', e => { if (drag && drag.from === from) { e.preventDefault(); z.classList.add('over'); } });
      z.addEventListener('dragleave', e => { if (!z.contains(e.relatedTarget)) z.classList.remove('over'); });
      z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); if (drag && drag.from === from) fn(drag.id); });
    });
    $('#mg', el).addEventListener('click', e => { const c = e.target.closest('.mc[data-id]'); if (c) showInfo(c.dataset.id); });
    $('#mg', el).addEventListener('dblclick', e => { const c = e.target.closest('.mc[data-id]'); if (c) rem(c.dataset.id); });
    $('#ol', el).addEventListener('click', e => { const c = e.target.closest('.oc'); if (!c) return; showInfo(c.dataset.id); if (e.target.closest('em') && !c.classList.contains('in')) add(c.dataset.id); });
    $('#ol', el).addEventListener('dblclick', e => { const c = e.target.closest('.oc'); if (c && !c.classList.contains('in')) add(c.dataset.id); });
    $$('#os .chip', el).forEach(b => b.onclick = () => { os = b.dataset.s; $$('#os .chip', el).forEach(x => x.classList.toggle('on', x === b)); render(); });
    $('#rst', el).onclick = () => { App.myDeck = [...DEFAULT_DECK]; render(); showInfo(info); };
    $('#rnd', el).onclick = () => { App.myDeck = randomDeck(); render(); showInfo(App.myDeck[0]); };
    $('#clr', el).onclick = () => { App.myDeck = []; render(); };
    render(); showInfo(info); bindTilt3D($('#mg', el), '.mc', 20); bindTilt3D($('#di', el), '.ec', 16);
  },
};

/* ---------- 대전 기록 ---------- */
Screens.history = {
  tab: 'history', title: '기록',
  html: () => `<div class="hi"><div class="seg2" id="seg">${['전체', '무작위', '친구', '연습'].map((s, i) => `<button class="${!i ? 'on' : ''}" data-m="${s}">${s}</button>`).join('')}<i class="hi-pill"></i></div>
    <div class="hsum" id="hs"></div><div class="hlist" id="hl"></div></div>`,
  bind(el) {
    const render = m => {
      const L = App.history.filter(h => m === '전체' || h.mode === m), s = historyStats(L);
      $('#hs', el).innerHTML = [['경기', s.n, C.gray], ['승률', s.rate + '%', C.blue], ['최고 연승', s.best, C.red], ['최다 MVP', s.topMvp, C.purple]].map(([l, v, c]) => `<div style="--c:${c}"><small>${l}</small><b class="num">${v}</b></div>`).join('');
      $('#hl', el).innerHTML = L.length ? L.map((h, i) => `<div class="hc ${h.win ? 'w' : 'l'}" style="--i:${i}"><b class="pix">${h.win ? 'WIN' : 'LOSE'}</b><div class="hv"><small>${h.mode} · ${h.date}</small><b>vs ${h.opp}</b></div><div class="hx"><span>${h.rounds}R</span><span>MVP <b>${h.mvp}</b></span><span>피해 ${h.dmg}</span></div></div>`).join('') : '<div class="empty-msg">해당 모드의 기록이 없습니다</div>';
    };
    $$('#seg button', el).forEach((b, i) => b.onclick = () => { $$('#seg button', el).forEach(x => x.classList.toggle('on', x === b)); $('.hi-pill', el).style.transform = `translateX(${i * 100}%)`; render(b.dataset.m); });
    $('#hl', el).addEventListener('click', e => { const c = e.target.closest('.hc'); if (c) c.classList.toggle('open'); });
    render('전체');
  },
};

/* ---------- 게임 방법 (첫 실행 시 자동 표시) ---------- */
const GUIDE = [
  { t: '목표와 흐름', h: () => `<p class="gd-lead">1 대 1로 겨뤄 <b>상대의 HP를 먼저 0</b>으로 만들면 승리합니다. 한 라운드는 4단계로 진행되고, 승부가 날 때까지 반복합니다.</p>
    <div class="gd-steps">${[['01', '드래프트', '효과 덱에서 3장을 뽑아 1장을 장착'], ['02', '전투 패 구성', '포커 카드 7장 중 5장으로 족보 만들기'], ['03', '쇼다운 준비', '액티브 효과 카드를 써서 점수를 올리거나 방어'], ['04', '피해 정산', '점수 차이만큼 낮은 쪽의 HP가 감소']].map(([n, a, b]) => `<div><b class="pix">${n}</b><strong>${a}</strong><span>${b}</span></div>`).join('')}</div>` },
  { t: '족보와 점수', h: () => `<p class="gd-lead">공격 점수는 고른 5장의 <b>포커 족보</b>로 정해집니다. 리롤로 마음에 들지 않는 카드를 바꿀 수 있습니다 (기본 1회).</p>
    <div class="gd-hands">${Object.entries(HANDS).filter(([k]) => k !== 'none').reverse().map(([, [n, b]]) => `<div><span>${n}</span><b class="num">${b}</b></div>`).join('')}</div>
    <p class="mut">점수가 같으면 더 높은 숫자(예: A 원 페어 &gt; 9 원 페어)나 키커로 승부하고, 이긴 쪽이 고정 피해 ${KICKER_DMG}을 줍니다. 패가 완전히 같을 때만 무승부입니다.</p>` },
  { t: '피해 계산', h: () => `<div class="gd-fml"><span>(족보 점수 + 보너스) × 배율</span><b>=</b><span>최종 점수</span></div>
    <p class="gd-lead">양쪽 최종 점수의 <b>차이만큼</b> 낮은 쪽의 HP가 줄어듭니다. 예) 내 점수 (25 + 3) × 1.6 = 45, 상대 30 → 상대 HP <b>-15</b><br>
    단, <b>한 번에 줄 수 있는 피해는 상대 최대 HP의 50%까지</b>입니다. 예) 내 점수 100, 상대 10 → 차이는 90이지만 피해는 <b>-50</b></p>
    <ul class="gd-list"><li><b>실드</b> — 피해를 먼저 막아 주고, 다음 라운드 시작 때 사라집니다</li><li><b>감면</b> — 받는 피해를 % 만큼 줄입니다</li><li><b>치명타</b> — 확률적으로 내 점수 ×1.5 (확률은 최대 40%)</li><li><b>지속 피해</b> — 라운드 시작마다 HP 감소</li><li><b>피해 상한</b> — 쇼다운 한 번의 피해는 상대 최대 HP의 50%까지</li><li><b>동시 KO · 턴 제한</b> — 남은 HP → 총 피해량 → 마지막 쇼다운 승자 순으로 승패 결정</li></ul>` },
  { t: '효과 카드', h: () => `<ul class="gd-list"><li><b>액티브</b> — 02·03 단계에 직접 눌러 사용. 쓰면 쿨타임이 생기고 상대에게 공개됩니다</li><li><b>패시브</b> — 장착만 하면 자동 적용. 항상 공개 상태입니다</li><li><b>함정</b> — 상대가 특정 카드를 쓸 때 확률로 반응합니다 (간파·흐트러짐·마법 방패 등)</li></ul>
    <div class="gd-grades"><span class="c">일반</span><span class="r">희귀</span><span class="e">◆ 영웅</span><span class="l">★ 전설</span></div>
    <p class="mut">덱은 52장 중 26장으로 구성하며 영웅은 최대 6장, 전설은 최대 2장입니다. 전투 중 장착 칸은 5칸(짐꾼 보유 시 +2)이고, 가득 차면 기존 카드와 교체합니다.</p>` },
  { t: '조작과 팁', h: () => `<div class="gd-keys">${[['1 ~ 7', '전투 패 선택'], ['Enter', '다음 단계 진행'], ['Space · 클릭', '피해 정산 연출 건너뛰기'], ['Esc', '메뉴 / 창 닫기']].map(([k, d]) => `<div><kbd>${k}</kbd><span>${d}</span></div>`).join('')}</div>
    <ul class="gd-list"><li>설정에서 <b>연출 속도</b>, <b>효과음·배경음악 볼륨</b>, 화면 흔들림을 바꿀 수 있습니다</li><li>심판(최종 데미지 ×1.6)처럼 강한 카드는 크게 이길 라운드에 아껴 두세요</li><li>HP가 30% 이하로 떨어지면 경보가 울립니다 — 실드·회복 카드를 활용하세요</li><li>무작위·친구 대전은 아직 온라인이 아니라 AI가 상대합니다</li></ul>` },
];
function guideModal(start = 0) {
  let p = start;
  const w = modal(`<div class="guide"><div class="gd-h"><span class="pix">HOW TO PLAY</span><h3 id="gdT"></h3><span class="num" id="gdN"></span></div><div class="gd-b" id="gdB"></div>
    <div class="gd-f"><div class="gd-dots" id="gdD">${GUIDE.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div><div class="row">${btn('이전', '', C.gray, 'id="gdPrev"')}${btn('다음', '', C.red, 'id="gdNext"', 'pri')}</div></div></div>`, { cls: 'm-guide' });
  const show = () => {
    $('#gdT', w).textContent = GUIDE[p].t; $('#gdN', w).textContent = `${p + 1} / ${GUIDE.length}`;
    const b = $('#gdB', w); b.innerHTML = GUIDE[p].h(); b.animate([{ opacity: 0, transform: 'translateX(20px)' }, { opacity: 1, transform: 'none' }], { duration: 220 });
    $$('#gdD i', w).forEach((d, i) => d.classList.toggle('on', i === p));
    $('#gdPrev', w).disabled = p === 0; $('#gdNext b', w).textContent = p === GUIDE.length - 1 ? '시작하기' : '다음';
  };
  $('#gdPrev', w).onclick = () => { if (p > 0) { p--; show(); } };
  $('#gdNext', w).onclick = () => { if (p < GUIDE.length - 1) { p++; show(); } else closeModal(); };
  $$('#gdD i', w).forEach(d => d.onclick = () => { p = +d.dataset.i; show(); });
  show(); store.set('guideSeen', true);
  return w;
}
