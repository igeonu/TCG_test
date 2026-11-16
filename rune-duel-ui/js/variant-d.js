'use strict';
/* =========================================================
   D안 : 좌측 정보 사이드바 + 중앙 플레이 영역 대시보드형
         + 레트로 CRT 픽셀 스타일 + 주스(Juice) 중심 피드백
   참고 : 발라트로 UI / 이동 : 왼쪽 위 [뒤로] + 큰 버튼
   ========================================================= */
const D_COL = { red: '#ff5a3c', blue: '#2a6bbd', yellow: '#e6a33c', purple: '#7d4cc4', gray: '#3f4c47', green: '#2fa36b' };
const MOD_D = {
  title: '레트로 CRT형', cls: 'vD', bg: '#0f3b2f',
  names: { lobby: '로비', match: '무작위 매칭', friend: '친구와 경기', practice: '연습 대전', cards: '카드 살펴보기', deck: '나만의 덱', history: '대전 기록' },
  screens: {}, bind: {},
  memo: `<span class="tag">D안 · 대시보드형 + 레트로 CRT + 주스</span><h3>왼쪽 정보 사이드바 + 가운데 카드 오브젝트</h3>
  <p>가운데 로고와 카드 부채꼴, 아래 큰 컬러 버튼 줄(대전·연습·카드·덱·기록). [대전]을 누르면 위로 작은 선택지(무작위/친구)가 열립니다. 버튼은 그림자 대신 단색 바닥선으로 눌리는 느낌.</p>
  <h4>하위 화면</h4><ul><li>무작위 매칭: 사이드바(목표·내 HP·덱·경과 시간) + 내 카드 부채 vs 뒷면 카드 셔플</li><li>친구와 경기: 규칙 카드 3장(턴 제한/턴당 시간/시작 HP)을 [바꾸기]로 뒤집기</li><li>연습 대전: 덱 뒷면 ◀ ▶ + 난이도 칩(입문/보통/숙련)</li><li>카드 살펴보기: 액티브/패시브/특성 탭 + 카드 선반 + 카드 위 툴팁</li><li>나만의 덱: 문양별 카드 더미 (누르면 펼침)</li><li>대전 기록: 최고 기록 사이드바 + 결과 색 블록 (승리 파랑 / 패배 주황)</li></ul>
  <h4>주스(Juice)</h4><ul><li>버튼 클릭 시 파티클 + 살짝 흔들림, 호버 시 기울기</li><li>CRT 스캔라인·비네트·깜빡임, 화면 전환 시 브라운관 켜짐 효과</li><li>카드 둥실거림, 숫자 튀어오름</li></ul>
  <h4>장점 / 고려할 점</h4><p>포커 카드 게임 정체성이 가장 잘 드러나고 패드·터치에 맞음. 원색 버튼이 많아 결과 화면과 색 정리가 필요.</p>`,
  chrome: () => `<div class="d-crt"></div><div class="d-vig"></div>`,
  trans(old, el) {
    old.style.pointerEvents = 'none';
    old.animate([{ filter: 'brightness(1)', transform: 'none' }, { filter: 'brightness(3)', transform: 'scaleY(.01)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' });
    el.animate([{ transform: 'scaleY(.005) scaleX(.6)', filter: 'brightness(4)' }, { transform: 'scaleY(.02) scaleX(1)', filter: 'brightness(3)', offset: .35 }, { transform: 'none', filter: 'brightness(1)' }], { duration: 420, delay: 200, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' });
    setTimeout(() => old.remove(), 230);
  },
};
App.reg('D', MOD_D);
function juice(btn, color) {
  const r = App.rectOf(btn);
  burst(r.x + r.w / 2, r.y + r.h / 2, [color || '#fff', '#fff', '#ffe08a'], 14, $('#layer'), 90);
  btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9) rotate(-2deg)' }, { transform: 'scale(1.08) rotate(1deg)' }, { transform: 'scale(1)' }], { duration: 300 });
  const s = $('#screens'); s.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(0,0)' }], { duration: 160 });
}
const dBtn = (label, sub, color, attrs = '') => `<button class="d-btn" style="--c:${color}" ${attrs}><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
function dBind(el) {
  $$('.d-btn,.d-chip,.d-back', el).forEach(b => b.addEventListener('pointerdown', () => juice(b, getComputedStyle(b).getPropertyValue('--c').trim() || '#fff')));
  $$('[data-go]', el).forEach(b => b.addEventListener('click', () => App.after(() => App.go(b.dataset.go), 140)));
}
const dTop = (t) => `<div class="d-top"><button class="d-back" data-go="lobby" style="--c:#3f4c47">◀ 뒤로</button><h2>${t}</h2><span class="d-sc">${historyStats(App.history).wins}승 ${historyStats(App.history).losses}패</span></div>`;
const pcard = (r, s, extra = '', st = '') => `<div class="d-pc ${isRed(s) ? 'red' : ''} ${extra}" style="${st}"><span class="tl">${s}${r}</span><span class="c">${s}</span></div>`;

/* ---------- 로비 ---------- */
MOD_D.screens.lobby = () => `
  <div class="d-hd"><span class="d-av"></span><div><b>${App.player.name}</b><small>LV. ${App.player.lv}</small></div><button class="d-set">설정</button><span class="d-rec">최근 10경기 ${historyStats(App.history.slice(0, 10)).wins}승 ${historyStats(App.history.slice(0, 10)).losses}패</span></div>
  <div class="d-fan">${[['A', '♠'], ['7', '♥'], ['Q', '♠'], ['9', '◆'], ['7', '♣']].map(([r, s], i) => pcard(r, s, 'f', `--i:${i};--r:${(i - 2) * 12}deg;--x:${(i - 2) * 78}px;--y:${Math.abs(i - 2) * 12}px`)).join('')}</div>
  <h1 class="d-logo">${'RUNE DUEL'.split('').map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</h1>
  <p class="d-sub">룬 결투 · 포커 족보 1V1</p>
  <div class="d-pop" id="dPop">${dBtn('무작위 상대와 경기', '', D_COL.red, 'data-go="match"')}${dBtn('친구와 경기', '', D_COL.blue, 'data-go="friend"')}</div>
  <div class="d-row">${dBtn('대전', '1VS1 BATTLE', D_COL.red, 'id="dBattle"')}${dBtn('연습', 'VS AI', D_COL.blue, 'data-go="practice"')}${dBtn('카드', 'LIBRARY', D_COL.yellow, 'data-go="cards"')}${dBtn('덱', 'MY DECK', D_COL.purple, 'data-go="deck"')}${dBtn('기록', 'HISTORY', D_COL.gray, 'data-go="history"')}</div>`;
MOD_D.bind.lobby = el => {
  dBind(el);
  const pop = $('#dPop', el);
  $('#dBattle', el).onclick = () => { pop.classList.toggle('open'); $('#dBattle', el).classList.toggle('act'); };
  $('.d-set', el).onclick = () => toast('설정 화면은 시안 범위 밖입니다');
  $$('.d-fan .d-pc', el).forEach(c => c.onclick = () => { c.classList.remove('spin'); void c.offsetWidth; c.classList.add('spin'); const r = App.rectOf(c); burst(r.x + r.w / 2, r.y + r.h / 2, ['#fff', '#ff5a3c', '#e6a33c'], 12); });
};

/* ---------- 무작위 매칭 ---------- */
const dSide = (rows, extra = '') => `<aside class="d-side">${rows.map(([l, v, c, id]) => `<div class="d-sb" style="--c:${c || '#3f4c47'}"><small>${l}</small><b ${id ? `id="${id}"` : ''}>${v}</b></div>`).join('')}${extra}</aside>`;
MOD_D.screens.match = () => `${dTop('무작위 매칭')}
  ${dSide([['목표', '상대 HP 0', D_COL.red], ['내 HP', App.rules.startHP, D_COL.blue], ['덱', `${deckSummary(App.myDeck)}<br>${App.myDeck.length}장`, D_COL.purple], ['경과 시간', '00:00', D_COL.gray, 'dT']])}
  <div class="d-arena"><div class="d-backs" id="dBacks">${Array.from({ length: 5 }, (_, i) => `<div class="d-bk" style="--i:${i}"><div class="d-bkf"></div><div class="d-bkb">${['R', 'I', 'V', 'A', 'L'][i]}</div></div>`).join('')}</div>
  <div class="d-status" id="dSt">상대를 찾는 중<span class="d-blink">_</span></div>
  <div class="d-myfan">${App.myDeck.slice(0, 5).map((id, i) => `<div class="d-ec ${isRed(EF[id].suit) ? 'red' : ''}" style="--i:${i};--r:${(i - 2) * 9}deg;--x:${(i - 2) * 96}px;--y:${Math.abs(i - 2) * 10}px"><b>${EF[id].suit}${EF[id].rank}</b><span>${EF[id].name}</span></div>`).join('')}</div>
  <div class="d-mact">${dBtn('취소', '', D_COL.gray, 'id="dCancel"')}</div></div>`;
MOD_D.bind.match = el => {
  dBind(el);
  let t = 0; App.every(() => { t++; const e = $('#dT', el); e.textContent = fmtTime(t); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }, 1000);
  $('#dCancel', el).onclick = () => App.after(() => App.go('lobby'), 140);
  App.after(() => {
    const opp = pick(OPP_NAMES); $('#dBacks', el).classList.add('flip');
    $('#dSt', el).innerHTML = `<b>${opp}</b> 발견!`; $('#dSt', el).classList.add('found');
    burst(720, 230, ['#ff5a3c', '#e6a33c', '#fff', '#2a6bbd'], 40, $('#layer'), 260);
    const a = $('.d-mact', el); a.innerHTML = dBtn('취소', '', D_COL.gray, 'id="dNo"') + dBtn('입장!', '', D_COL.red, 'id="dGo"'); dBind(a);
    $('#dNo', el).onclick = () => App.after(() => App.go('lobby'), 140); $('#dGo', el).onclick = () => App.after(() => App.startBattle({ mode: '무작위', opp: { name: opp } }), 180);
  }, 3400 + rnd(1600));
};

/* ---------- 친구와 경기 ---------- */
const D_RULES = [
  { k: 'turnLimit', t: '턴 제한', vals: [0, 10, 15, 20], f: v => v ? v + '턴' : 'OFF', c: D_COL.red, ic: '⏳' },
  { k: 'turnTime', t: '턴당 시간', vals: [30, 60, 90, 0], f: v => v ? v + '초' : '∞', c: D_COL.blue, ic: '⏱' },
  { k: 'startHP', t: '시작 HP', vals: [60, 100, 150], f: v => v, c: D_COL.green, ic: '♥' },
];
MOD_D.screens.friend = () => `${dTop('친구와 경기')}
  ${dSide([['방 코드', roomCode(), D_COL.yellow, 'dCode'], ['방장', App.player.name, D_COL.blue], ['상대', '대기 중', D_COL.gray, 'dOpp']], `<div class="d-sbb">${dBtn('코드 복사', '', D_COL.yellow, 'id="dCp"')}</div>`)}
  <div class="d-rules">${D_RULES.map((r, i) => `<div class="d-rc" style="--c:${r.c};--i:${i}"><div class="d-rcc" data-k="${r.k}"><div class="d-rf"><small>${r.t}</small><i>${r.ic}</i><b>${r.f(App.rules[r.k])}</b></div></div>${dBtn('바꾸기', '', r.c, `data-sw="${r.k}"`)}</div>`).join('')}</div>
  <div class="d-fact">${dBtn('방 만들기', 'CREATE', D_COL.red, 'id="dMake"')}</div>`;
MOD_D.bind.friend = el => {
  dBind(el);
  $$('[data-sw]', el).forEach(b => b.onclick = () => {
    const r = D_RULES.find(x => x.k === b.dataset.sw), i = r.vals.indexOf(App.rules[r.k]); App.rules[r.k] = r.vals[(i + 1) % r.vals.length];
    const c = $(`.d-rcc[data-k="${r.k}"]`, el); c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip');
    setTimeout(() => { $('b', c).textContent = r.f(App.rules[r.k]); }, 180);
  });
  $('#dCp', el).onclick = () => toast('코드 복사 완료!', 'ok');
  $('#dMake', el).onclick = () => {
    const m = $('#dMake', el); m.disabled = true; m.querySelector('b').textContent = '대기 중...';
    App.after(() => { const fr = pick(OPP_NAMES); $('#dOpp', el).textContent = fr; $('#dOpp', el).parentElement.style.setProperty('--c', D_COL.red); $('#dOpp', el).classList.add('bump'); toast(`${fr} 입장!`, 'ok'); m.disabled = false; m.querySelector('b').textContent = '시작!'; m.querySelector('small').textContent = 'START'; m.onclick = () => App.after(() => App.startBattle({ mode: '친구', opp: { name: fr } }), 160); }, 2600);
  };
};

/* ---------- 연습 대전 ---------- */
const D_BACKS = [['클래식 레드', D_COL.red, '♠ 스페이드 공격 덱'], ['딥 블루', D_COL.blue, '♥ 하트 방어 덱'], ['골드 러시', D_COL.yellow, '♣ 클로버 리롤 덱'], ['퍼플 헤이즈', D_COL.purple, '◆ 다이아 함정 덱']];
MOD_D.screens.practice = () => `${dTop('연습 대전')}
  ${dSide([['상대', 'CPU', D_COL.blue], ['난이도', '보통', D_COL.yellow, 'dDf'], ['덱', D_BACKS[0][0], D_COL.red, 'dDk']])}
  <div class="d-pw"><div class="d-dsel"><button class="d-arr" id="dL">◀</button><div class="d-dbk" id="dDb"></div><button class="d-arr" id="dR">▶</button></div>
  <div class="d-dname" id="dDn"></div>
  <div class="d-chips">${[['입문', 2, D_COL.green], ['보통', 5, D_COL.yellow], ['숙련', 8, D_COL.red]].map(([t, l, c], i) => `<button class="d-chip ${i === 1 ? 'on' : ''}" style="--c:${c}" data-l="${l}" data-t="${t}">${t}</button>`).join('')}</div>
  ${dBtn('연습 시작', 'PLAY', D_COL.red, 'id="dPgo"')}</div>`;
MOD_D.bind.practice = el => {
  dBind(el); let di = 0; App.cpu = 5;
  const draw = (dir) => {
    const [n, c, d] = D_BACKS[di]; const b = $('#dDb', el);
    b.style.setProperty('--c', c); b.innerHTML = `<div class="d-pat"></div><b>RD</b>`;
    if (dir) b.animate([{ transform: `translateX(${dir * 120}px) rotate(${dir * 15}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,1.6,.4,1)' });
    $('#dDn', el).innerHTML = `<b>${n}</b><span>${d}</span>`; $('#dDk', el).textContent = n;
  };
  $('#dL', el).onclick = () => { di = (di + 3) % 4; draw(-1); }; $('#dR', el).onclick = () => { di = (di + 1) % 4; draw(1); };
  $$('.d-chip', el).forEach(c => c.onclick = () => { App.cpu = +c.dataset.l; $$('.d-chip', el).forEach(x => x.classList.toggle('on', x === c)); const f = $('#dDf', el); f.textContent = c.dataset.t; f.classList.remove('bump'); void f.offsetWidth; f.classList.add('bump'); });
  $('#dPgo', el).onclick = () => App.after(() => App.startBattle({ mode: '연습', opp: { name: `CPU · ${$('#dDf', el).textContent}` } }), 160);
  App.keyH = e => { if (e.key === 'ArrowLeft') { $('#dL', el).click(); return true; } if (e.key === 'ArrowRight') { $('#dR', el).click(); return true; } return false; };
  draw();
};

/* ---------- 카드 살펴보기 ---------- */
MOD_D.screens.cards = () => `${dTop('카드 살펴보기')}
  <div class="d-ctabs" id="dTabs">${[['A', '액티브', D_COL.red], ['P', '패시브', D_COL.blue], ['T', '특성', D_COL.yellow]].map(([k, t, c], i) => `<button class="d-chip ${!i ? 'on' : ''}" style="--c:${c}" data-k="${k}">${t}</button>`).join('')}<span id="dCn"></span></div>
  <div class="d-shelves" id="dSh"></div>`;
MOD_D.bind.cards = el => {
  dBind(el);
  const tipOf = e => `<b>${e.name}</b> <span class='d-tg'>${GRADES[e.g].ko}</span><br>${e.desc}<br><span class='d-tm'>${e.k === 'A' ? '쿨타임 ' + e.cd + '턴' : '상시'} · ${e.cat}</span>`;
  const render = k => {
    let html = '', n = 0;
    if (k === 'T') {
      html = `<div class="d-shelf"><div class="d-row2">${TRAITS.map((t, i) => `<div class="d-tc" style="--i:${i}" data-tip="<b>${t.name}</b><br>${t.req} ${t.tiers.join(' / ')}<br>${t.tiers.map((th, j) => th + ': ' + t.fx[j]).join('<br>')}"><i>${t.icon}</i><b>${t.name}</b><small>${t.tiers.join('/')}</small></div>`).join('')}</div><div class="d-plank"></div></div>`; n = TRAITS.length;
    } else {
      SUITS.forEach(s => { const L = EFFECTS.filter(e => e.k === k && e.suit === s); n += L.length; if (!L.length) return; html += `<div class="d-shelf"><div class="d-sl">${s}</div><div class="d-row2">${L.map((e, i) => `<div class="d-ec g-${e.g} ${isRed(e.suit) ? 'red' : ''} ${App.myDeck.includes(e.id) ? 'in' : ''}" style="--i:${i}" data-tip="${tipOf(e).replace(/"/g, '&quot;')}"><b>${e.suit}${e.rank}</b><span>${e.name}</span><em>${icon(e.cat, 18)}</em></div>`).join('')}</div><div class="d-plank"></div></div>`; });
    }
    $('#dSh', el).innerHTML = html; $('#dCn', el).textContent = `${n}장`;
  };
  $$('#dTabs .d-chip', el).forEach(c => c.onclick = () => { $$('#dTabs .d-chip', el).forEach(x => x.classList.toggle('on', x === c)); render(c.dataset.k); });
  bindTips(el); render('A');
};

/* ---------- 나만의 덱 ---------- */
MOD_D.screens.deck = () => `${dTop('나만의 덱')}
  ${dSide([['덱', '', D_COL.purple, 'dDn'], ['영웅', '', D_COL.blue, 'dDe'], ['전설', '', D_COL.yellow, 'dDl']], `<div class="d-sbb">${dBtn('카드 추가', '+', D_COL.green, 'id="dAdd"')}${dBtn('기본 덱', '', D_COL.gray, 'id="dRst"')}</div>`)}
  <div class="d-dk"><div class="d-spread" id="dSp"><div class="d-hint">더미를 누르면 카드가 펼쳐집니다 · 카드를 누르면 덱에서 빠집니다</div></div><div class="d-piles" id="dPiles"></div></div>`;
MOD_D.bind.deck = el => {
  dBind(el); let open = null;
  const render = () => {
    const d = App.myDeck, inf = deckInfo(d);
    const set = (id, v, bad) => { const e = $(id, el); e.textContent = v; e.parentElement.classList.toggle('bad', !!bad); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); };
    set('#dDn', `${inf.n} / 26`); set('#dDe', `${inf.E} / 6`, inf.E > 6); set('#dDl', `${inf.L} / 2`, inf.L > 2);
    $('#dPiles', el).innerHTML = SUITS.map(s => { const n = inf.suit[s]; return `<button class="d-pile ${open === s ? 'on' : ''} ${isRed(s) ? 'red' : ''}" data-s="${s}">${Array.from({ length: Math.min(n, 9) }, (_, i) => `<i style="--k:${i}"></i>`).join('')}<div class="d-ptop"><span>${s}</span></div><b>${s} ${n}장</b></button>`; }).join('');
    const sp = $('#dSp', el);
    if (open) { const L = d.filter(id => EF[id].suit === open).sort((a, b) => RANKS.indexOf(EF[a].rank) - RANKS.indexOf(EF[b].rank)); sp.innerHTML = L.length ? L.map((id, i) => `<div class="d-ec deal g-${EF[id].g} ${isRed(open) ? 'red' : ''}" data-id="${id}" style="--i:${i}" data-tip="<b>${EF[id].name}</b><br>${EF[id].desc}<br><span class='d-tm'>눌러서 빼기</span>"><b>${id}</b><span>${EF[id].name}</span><em>${icon(EF[id].cat, 18)}</em></div>`).join('') : `<div class="d-hint">${open} 카드가 덱에 없습니다</div>`; }
  };
  $('#dPiles', el).onclick = e => { const p = e.target.closest('.d-pile'); if (!p) return; open = open === p.dataset.s ? null : p.dataset.s; juice(p, '#fff'); render(); if (!open) $('#dSp', el).innerHTML = '<div class="d-hint">더미를 누르면 카드가 펼쳐집니다 · 카드를 누르면 덱에서 빠집니다</div>'; };
  $('#dSp', el).onclick = e => { const c = e.target.closest('.d-ec[data-id]'); if (!c) return; const r = App.rectOf(c); burst(r.x + r.w / 2, r.y + r.h / 2, ['#ff5a3c', '#fff'], 12); App.myDeck = App.myDeck.filter(x => x !== c.dataset.id); const t = $('#tip'); t && t.classList.remove('show'); render(); };
  $('#dRst', el).onclick = () => { App.myDeck = [...DEFAULT_DECK]; render(); };
  $('#dAdd', el).onclick = () => {
    const w = modal(`<div class="d-addm"><h3>카드 추가</h3><div class="d-addl">${EFFECTS.map(e => `<button class="d-ec g-${e.g} ${isRed(e.suit) ? 'red' : ''} ${App.myDeck.includes(e.id) ? 'in' : ''}" data-id="${e.id}"><b>${e.id}</b><span>${e.name}</span></button>`).join('')}</div><button class="d-btn" style="--c:#3f4c47" onclick="closeModal()"><b>닫기</b></button></div>`, { cls: 'm-d' });
    $$('.d-addl .d-ec', w).forEach(b => b.onclick = () => { const id = b.dataset.id; if (App.myDeck.includes(id)) { App.myDeck = App.myDeck.filter(x => x !== id); b.classList.remove('in'); } else { const er = canAdd(App.myDeck, id); if (er) { toast(er, 'err'); shake(b); return; } App.myDeck.push(id); b.classList.add('in'); const r = App.rectOf(b); burst(r.x + r.w / 2, r.y + r.h / 2, ['#2fa36b', '#fff'], 10); } render(); });
  };
  bindTips(el); render();
};

/* ---------- 대전 기록 ---------- */
MOD_D.screens.history = () => {
  const s = historyStats(App.history);
  return `${dTop('대전 기록')}
  ${dSide([['승률', s.rate + '%', D_COL.blue], ['최고 연승', s.best + '연승', D_COL.red], ['최다 피해', s.maxDmg, D_COL.yellow], ['최다 MVP', `${s.topMvp} ×${s.topMvpN}`, D_COL.purple]])}
  <div class="d-hl">${App.history.map((h, i) => `<div class="d-hb ${h.win ? 'w' : 'l'}" style="--i:${i}"><b>${h.win ? 'WIN' : 'LOSE'}</b><span class="d-ho">vs ${h.opp}</span><span>${h.mode}</span><span>${h.rounds}R</span><span>MVP ${h.mvp}</span><span class="d-hd2">피해 ${h.dmg} · 남은 HP ${h.hp} · ${h.date}</span></div>`).join('')}</div>`;
};
MOD_D.bind.history = el => { dBind(el); $$('.d-hb', el).forEach(b => b.onclick = () => { b.classList.toggle('open'); juice(b, b.classList.contains('w') ? D_COL.blue : D_COL.red); }); };

injectCSS(`
.vD{background:#0f3b2f;color:#f4f1e8;font-family:'Noto Sans KR';background-image:radial-gradient(ellipse at 50% 40%,#16523f,#0f3b2f 60%,#0a2a21);image-rendering:pixelated}
.vD button{font-family:inherit;color:inherit;cursor:pointer}
.chrome-D .d-crt{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 2px,transparent 2px 4px);mix-blend-mode:multiply;animation:dFlick 6s infinite}
@keyframes dFlick{0%,96%,100%{opacity:1}97%{opacity:.7}98%{opacity:1}99%{opacity:.85}}
.chrome-D .d-vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55));box-shadow:inset 0 0 120px rgba(0,0,0,.6)}
.d-btn{position:relative;border:0;border-radius:8px;background:var(--c);color:#fff;padding:12px 22px;box-shadow:0 6px 0 color-mix(in srgb,var(--c) 55%,#000);transition:transform .08s,box-shadow .08s,filter .15s;display:flex;flex-direction:column;align-items:center;justify-content:center;text-shadow:0 2px 0 rgba(0,0,0,.35)}
.d-btn b{font:900 22px 'Noto Sans KR'}.d-btn small{font:400 11px 'Silkscreen';letter-spacing:.06em;opacity:.95}
.d-btn:hover:not([disabled]){filter:brightness(1.12);transform:translateY(-2px) rotate(-1deg)}
.d-btn:active:not([disabled]){transform:translateY(6px);box-shadow:0 0 0 color-mix(in srgb,var(--c) 55%,#000)}
.d-btn[disabled]{filter:grayscale(.6) brightness(.7)}
.d-hd{position:absolute;left:40px;right:40px;top:22px;display:flex;align-items:center;gap:10px}
.d-av{width:32px;height:32px;border-radius:50%;background:#ff5a3c}.d-hd b{display:block;font-size:13px}.d-hd small{font:400 10px 'Silkscreen'}
.d-set{background:none;border:0;font-weight:900;font-size:13px;margin-left:24px}.d-rec{margin-left:auto;font:400 13px 'Silkscreen';color:#bfe3d2}
.d-fan{position:absolute;left:50%;top:90px;width:0;height:0}
.d-pc{position:absolute;width:118px;height:164px;margin-left:-59px;background:#fff;color:#111;border:2.5px solid #111;border-radius:10px;box-shadow:4px 4px 0 rgba(0,0,0,.4);display:flex;align-items:flex-end;justify-content:flex-end;padding:10px;transition:transform .2s}
.d-pc.red{color:#d8252a}.d-pc .tl{position:absolute;left:10px;top:8px;font:900 26px 'Noto Sans KR'}.d-pc .c{font-size:44px;line-height:1}
.d-pc.f{transform:translate(var(--x),var(--y)) rotate(var(--r));animation:dBob 3s calc(var(--i)*.25s) ease-in-out infinite;cursor:pointer}
@keyframes dBob{50%{translate:0 -10px}}
.d-pc.f:hover{z-index:9;transform:translate(var(--x),calc(var(--y) - 24px)) rotate(0) scale(1.08)}
.d-pc.spin{animation:dSpin .6s cubic-bezier(.2,1.4,.4,1)}@keyframes dSpin{from{rotate:360deg;scale:.6}}
.d-logo{position:absolute;left:0;right:0;top:232px;margin:0;text-align:center;font:400 108px/1 'Silkscreen';letter-spacing:.02em;text-shadow:6px 6px 0 #082019}
.d-logo span{display:inline-block;animation:dWave 2.4s calc(var(--i)*.09s) ease-in-out infinite}
@keyframes dWave{0%,60%,100%{transform:none}30%{transform:translateY(-8px) rotate(-3deg)}}
.d-sub{position:absolute;left:0;right:0;top:356px;margin:0;text-align:center;font-size:26px;color:#bfe3d2}
.d-row{position:absolute;left:160px;right:160px;bottom:48px;display:grid;grid-template-columns:240px 210px 210px 210px 170px;gap:20px;justify-content:center}
.d-row .d-btn{height:100px}.d-row .d-btn b{font-size:36px;font-weight:500}
.d-btn.act{filter:brightness(1.2);transform:translateY(4px);box-shadow:0 2px 0 color-mix(in srgb,var(--c) 55%,#000)}
.d-pop{position:absolute;left:160px;bottom:166px;width:300px;padding:14px;border:3px solid #fff;border-radius:10px;background:#0f3b2f;display:flex;flex-direction:column;gap:10px;transform:translateY(20px) scale(.9);opacity:0;pointer-events:none;transition:.25s cubic-bezier(.2,1.6,.4,1);box-shadow:6px 6px 0 rgba(0,0,0,.4)}
.d-pop.open{transform:none;opacity:1;pointer-events:auto}
.d-pop .d-btn b{font-size:24px;font-weight:500}
.d-top{position:absolute;left:30px;right:40px;top:20px;display:flex;align-items:center;gap:22px;height:56px}
.d-top h2{margin:0;font:900 30px 'Noto Sans KR';text-shadow:3px 3px 0 #082019}.d-sc{margin-left:auto;font:400 14px 'Silkscreen';color:#bfe3d2}
.d-back{border:0;border-radius:8px;background:#3f4c47;padding:12px 20px;font-weight:900;font-size:16px;box-shadow:0 5px 0 #222a27;transition:.08s}.d-back:hover{filter:brightness(1.2)}.d-back:active{transform:translateY(5px);box-shadow:none}
.d-side{position:absolute;left:30px;top:96px;bottom:30px;width:290px;background:#0b2a22;border:3px solid #1e5a47;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;box-shadow:6px 6px 0 rgba(0,0,0,.3)}
.d-sb{background:#123f33;border-radius:8px;padding:10px 14px;border-left:8px solid var(--c);transition:.2s}
.d-sb small{display:block;font-size:12px;color:#bfe3d2}.d-sb b{display:inline-block;font:400 34px/1.1 'VT323','Noto Sans KR'}
.d-sb.bad{background:#5a1d14}
.bump{animation:dBump .3s cubic-bezier(.2,1.8,.4,1)}@keyframes dBump{from{transform:scale(1.4);color:#ffe08a}}
.d-sbb{margin-top:auto;display:flex;flex-direction:column;gap:12px}
/* match */
.d-arena{position:absolute;left:350px;right:40px;top:96px;bottom:30px}
.d-backs{display:flex;justify-content:center;gap:16px;margin-top:16px;perspective:800px}
.d-bk{position:relative;width:110px;height:154px;transform-style:preserve-3d;animation:dShuf 1s calc(var(--i)*.1s) ease-in-out infinite;transition:transform .6s}
@keyframes dShuf{50%{transform:translateY(-14px) rotate(4deg)}}
.d-bkf,.d-bkb{position:absolute;inset:0;border-radius:10px;border:3px solid #fff;backface-visibility:hidden;box-shadow:4px 4px 0 rgba(0,0,0,.4)}
.d-bkf{background:repeating-linear-gradient(45deg,#ff5a3c 0 8px,#c8432c 8px 16px)}
.d-bkb{background:#fff;color:#ff5a3c;transform:rotateY(180deg);display:flex;align-items:center;justify-content:center;font:400 64px 'Silkscreen'}
.d-backs.flip .d-bk{animation:none;transform:rotateY(180deg)}.d-backs.flip .d-bk:nth-child(2){transition-delay:.08s}.d-backs.flip .d-bk:nth-child(3){transition-delay:.16s}.d-backs.flip .d-bk:nth-child(4){transition-delay:.24s}.d-backs.flip .d-bk:nth-child(5){transition-delay:.32s}
.d-status{text-align:center;margin-top:34px;font:400 30px 'Silkscreen','Noto Sans KR'}.d-status.found{color:#ffe08a;animation:dBump .4s}.d-status b{font-family:'Noto Sans KR'}
.d-blink{animation:dots 1s steps(1) infinite}
.d-myfan{position:absolute;left:50%;bottom:120px;width:0}
.d-ec{position:relative;width:104px;height:140px;background:#fff;color:#111;border:2.5px solid #111;border-radius:9px;padding:8px;display:flex;flex-direction:column;gap:2px;box-shadow:4px 4px 0 rgba(0,0,0,.4);transition:transform .15s;user-select:none}
.d-ec.red b{color:#d8252a}.d-ec b{font:900 20px 'Noto Sans KR'}.d-ec span{font-size:13px;font-weight:900}.d-ec em{margin-top:auto;color:#555}
.d-ec.g-R{border-color:#2a6bbd}.d-ec.g-E{border-color:#7d4cc4;box-shadow:4px 4px 0 #7d4cc4}.d-ec.g-L{border-color:#e6a33c;box-shadow:4px 4px 0 #e6a33c;background:linear-gradient(170deg,#fff7df,#fff)}
.d-myfan .d-ec{position:absolute;margin-left:-52px;transform:translate(var(--x),var(--y)) rotate(var(--r));animation:dBob 3s calc(var(--i)*.2s) infinite}
.d-myfan .d-ec:hover{transform:translate(var(--x),calc(var(--y) - 30px)) rotate(0) scale(1.1);z-index:5}
.d-mact{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center;gap:16px}.d-mact .d-btn{width:200px;height:64px}
/* friend */
.d-rules{position:absolute;left:350px;right:40px;top:110px;display:grid;grid-template-columns:repeat(3,1fr);gap:30px}
.d-rc{display:flex;flex-direction:column;gap:18px;align-items:center;animation:dDeal .5s calc(var(--i)*.1s) cubic-bezier(.2,1.4,.4,1) both}
@keyframes dDeal{from{opacity:0;transform:translateY(-80px) rotate(-20deg)}}
.d-rcc{width:240px;height:330px;perspective:800px}
.d-rf{width:100%;height:100%;background:#fff;color:#111;border:4px solid #111;border-radius:14px;box-shadow:6px 6px 0 var(--c);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:20px}
.d-rf small{font-size:20px;font-weight:900}.d-rf i{font-style:normal;font-size:64px}.d-rf b{font:400 76px/1 'VT323';color:var(--c)}
.d-rcc.flip .d-rf{animation:dFl .36s}@keyframes dFl{50%{transform:rotateY(90deg) scale(1.05)}}
.d-rc .d-btn{width:200px}
.d-fact{position:absolute;right:40px;bottom:30px}.d-fact .d-btn{width:280px;height:90px}.d-fact .d-btn b{font-size:30px}
/* practice */
.d-pw{position:absolute;left:350px;right:40px;top:96px;bottom:30px;display:flex;flex-direction:column;align-items:center;gap:20px}
.d-dsel{display:flex;align-items:center;gap:40px;margin-top:10px}
.d-arr{width:70px;height:70px;border:0;border-radius:10px;background:#fff;color:#0f3b2f!important;font-size:28px;box-shadow:0 6px 0 #9fb8ad;transition:.08s}.d-arr:hover{transform:translateY(-2px) scale(1.06)}.d-arr:active{transform:translateY(6px);box-shadow:none}
.d-dbk{position:relative;width:220px;height:310px;border-radius:14px;border:5px solid #fff;background:var(--c);box-shadow:8px 8px 0 rgba(0,0,0,.4);overflow:hidden;display:flex;align-items:center;justify-content:center;animation:dBob 3s infinite}
.d-pat{position:absolute;inset:12px;border:3px solid #ffffff88;border-radius:8px;background:repeating-linear-gradient(45deg,transparent 0 10px,#ffffff22 10px 20px)}
.d-dbk b{position:relative;font:400 64px 'Silkscreen';text-shadow:4px 4px 0 rgba(0,0,0,.3)}
.d-dname{text-align:center}.d-dname b{display:block;font:900 30px 'Noto Sans KR'}.d-dname span{color:#bfe3d2}
.d-chips{display:flex;gap:12px}
.d-chip{border:3px solid var(--c);background:transparent;border-radius:99px;padding:9px 26px;font-weight:900;font-size:18px;transition:.12s}
.d-chip:hover{transform:translateY(-2px) rotate(-2deg)}.d-chip.on{background:var(--c);box-shadow:0 4px 0 color-mix(in srgb,var(--c) 55%,#000)}
.d-pw>.d-btn{width:300px;height:80px;margin-top:auto}.d-pw>.d-btn b{font-size:30px}
/* cards */
.d-ctabs{position:absolute;left:40px;right:40px;top:92px;display:flex;gap:12px;align-items:center}.d-ctabs span{margin-left:auto;font:400 16px 'Silkscreen'}
.d-shelves{position:absolute;left:40px;right:40px;top:150px;bottom:20px;overflow:auto;display:flex;flex-direction:column;gap:14px;padding:10px 6px}
.d-shelf{position:relative}
.d-sl{position:absolute;left:-2px;top:46px;font-size:26px;width:34px;text-align:center}
.d-row2{display:flex;gap:14px;padding-left:44px;align-items:flex-end;min-height:150px}
.d-shelves .d-ec{flex-shrink:0;animation:dDeal .4s calc(var(--i)*.04s) both;cursor:help}
.d-shelves .d-ec:hover{transform:translateY(-14px) rotate(-3deg)}.d-shelves .d-ec.in::after{content:'IN DECK';position:absolute;right:-6px;top:-8px;font:400 9px 'Silkscreen';background:#ff5a3c;color:#fff;padding:2px 5px;border-radius:4px}
.d-plank{height:14px;margin-left:30px;border-radius:4px;background:linear-gradient(180deg,#8a5a32,#5a3a1e);box-shadow:0 6px 0 rgba(0,0,0,.35)}
.d-tc{width:170px;height:140px;background:#fff;color:#111;border:3px solid #111;border-radius:10px;box-shadow:4px 4px 0 #e6a33c;padding:12px;display:flex;flex-direction:column;align-items:flex-start;animation:dDeal .4s calc(var(--i)*.05s) both;transition:.15s;cursor:help}
.d-tc i{font-style:normal;font:900 30px 'Noto Sans KR';color:#e6a33c}.d-tc b{font-size:17px}.d-tc small{margin-top:auto;font:400 13px 'Silkscreen'}
.d-tc:hover{transform:translateY(-10px) rotate(2deg)}
.tip.tip-D{background:#fff;color:#111;border:3px solid #111;border-radius:8px;box-shadow:5px 5px 0 rgba(0,0,0,.4);font-size:13px}.tip.tip-D b{color:#111;font-size:15px}
.d-tg{font-size:10px;background:#7d4cc4;color:#fff;padding:1px 6px;border-radius:4px}.d-tm{font:400 11px 'Silkscreen';color:#2a6bbd}
/* deck */
.d-dk{position:absolute;left:350px;right:40px;top:96px;bottom:30px;display:flex;flex-direction:column}
.d-spread{flex:1;display:flex;flex-wrap:wrap;gap:12px;align-content:flex-start;padding:10px;border:3px dashed #1e5a47;border-radius:12px;overflow:auto}
.d-spread .d-ec{cursor:pointer}.d-spread .d-ec:hover{transform:translateY(-8px) rotate(-3deg);box-shadow:4px 4px 0 #ff5a3c}
.d-ec.deal{animation:dDeal .35s calc(var(--i)*.04s) cubic-bezier(.2,1.4,.4,1) both}
.d-hint{margin:auto;color:#7fb5a0;font-size:15px}
.d-piles{height:250px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding-top:30px}
.d-pile{position:relative;background:none;border:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}
.d-pile i{position:absolute;left:50%;bottom:44px;width:110px;height:150px;margin-left:-55px;background:#fff;border:2.5px solid #111;border-radius:9px;transform:translate(calc(var(--k)*2px),calc(var(--k)*-3px));box-shadow:2px 2px 0 rgba(0,0,0,.3)}
.d-ptop{position:absolute;left:50%;bottom:44px;width:110px;height:150px;margin-left:-55px;transform:translate(18px,-27px);display:flex;align-items:center;justify-content:center;font-size:54px;color:#111;pointer-events:none}
.d-pile.red .d-ptop{color:#d8252a}
.d-pile b{font:900 20px 'Noto Sans KR'}
.d-pile:hover i{transform:translate(calc(var(--k)*4px),calc(var(--k)*-6px))}.d-pile:hover .d-ptop{transform:translate(34px,-50px)}
.d-pile i,.d-ptop{transition:transform .2s cubic-bezier(.2,1.6,.4,1)}
.d-pile.on i{border-color:#ff5a3c}.d-pile.on b{color:#ffe08a}
.m-d .mbox{background:#0f3b2f;border:4px solid #fff;border-radius:14px;box-shadow:8px 8px 0 rgba(0,0,0,.4);color:#fff}
.d-addm{width:980px;padding:22px;display:flex;flex-direction:column;gap:14px}.d-addm h3{margin:0;font:400 24px 'Silkscreen','Noto Sans KR'}
.d-addl{display:grid;grid-template-columns:repeat(13,1fr);gap:6px}.d-addl .d-ec{width:auto;height:80px;padding:5px;cursor:pointer}.d-addl .d-ec b{font-size:13px}.d-addl .d-ec span{font-size:10px}
.d-addl .d-ec.in{background:#ffe08a}.d-addl .d-ec:hover{transform:translateY(-4px)}
.d-addm>.d-btn{align-self:flex-end;width:160px}
/* history */
.d-hl{position:absolute;left:350px;right:40px;top:96px;bottom:30px;overflow:auto;display:flex;flex-direction:column;gap:10px;padding-right:6px}
.d-hb{display:grid;grid-template-columns:120px 1fr 90px 70px 150px;align-items:center;gap:10px;padding:14px 20px;border-radius:10px;background:#2a6bbd;box-shadow:0 5px 0 #1a4377;cursor:pointer;transition:.12s;animation:dDeal .35s calc(var(--i)*.04s) both}
.d-hb.l{background:#e6773c;box-shadow:0 5px 0 #8f4520}
.d-hb b{font:400 30px 'Silkscreen'}.d-hb span{font-weight:900}.d-ho{font-size:18px}
.d-hd2{grid-column:1/-1;display:none;font-weight:400!important;font-size:14px;color:#ffffffdd}
.d-hb:hover{transform:translateX(8px) rotate(-.5deg)}.d-hb:active{transform:translateY(4px);box-shadow:none}.d-hb.open .d-hd2{display:block}
.toast.tv-D{background:#fff;color:#111;border:3px solid #111;border-radius:8px;box-shadow:5px 5px 0 rgba(0,0,0,.4);font-family:'Noto Sans KR'}.toast.tv-D.err{background:#ff5a3c;color:#fff}.toast.tv-D.ok{background:#2fa36b;color:#fff}
`);
