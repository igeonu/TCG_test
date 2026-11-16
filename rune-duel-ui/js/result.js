'use strict';
/* =========================================================
   결과 화면 : 명예의 전당 (Hall of Fame) / 카드별 활약 기록 (Card Report)
   흐름 : 승리/패배 연출 → 명예의 전당 → 카드별 활약 기록 → [다시 대전] / [로비로]
   ========================================================= */
const R_ = () => App.lastResult || (App.lastResult = sampleResult());
const nm = id => EF[id] ? EF[id].name : id;
function bigGlyph(id, size = 120) {
  const e = EF[id]; if (!e) return '';
  return `<div class="hf-glyph" style="width:${size}px;height:${size}px">${icon(e.cat, size * .62)}</div>`;
}
function highlights(side) {
  const c = side.cards;
  const by = k => c.slice().sort((a, b) => b[k] - a[k])[0];
  const mu = by('uses'), md = by('dmg'), sup = c.slice().sort((a, b) => (b.shield + b.heal) - (a.shield + a.heal))[0];
  return { mu, md, sup };
}

MOD_E.screens.fame = () => {
  const R = R_(), me = R.me, op = R.op;
  const mv = me.cards.find(c => c.id === me.mvp) || me.cards[0] || { id: '♠Q', uses: 0, dmg: 0, rounds: {} };
  const omv = op.cards.find(c => c.id === op.mvp) || op.cards[0] || { id: '♠7', uses: 0, dmg: 0, rounds: {} };
  const lastDmg = (mv.rounds[R.rounds] || {}).dmg || 0;
  const H = highlights(me), O = highlights(op);
  const hl = (h, cls) => `
    <div class="hl-c"><span>최다 사용</span><b>${h.mu ? nm(h.mu.id) : '-'}</b><em>${h.mu ? h.mu.uses + '회' : ''}</em></div>
    <div class="hl-c"><span>최다 누적 피해</span><b>${h.md ? nm(h.md.id) : '-'}</b><em>${h.md ? '상대에게 ' + h.md.dmg : ''}</em></div>
    <div class="hl-c"><span>보조 기여상</span><b>${h.sup ? nm(h.sup.id) : '-'}</b><em class="${cls}">${h.sup ? `실드 ${h.sup.shield} · 회복 ${h.sup.heal}` : ''}</em></div>`;
  return `<div class="rs fame">
  <div class="rs-top"><span class="rs-l"><i class="g"></i>1V1 / POKER DUEL</span><span class="rs-r">경기 종료 · ${R.rounds}라운드 <b class="${R.win ? '' : 'red'}">내 진영 ${R.win ? '승리' : '패배'}</b> 01 / HALL OF FAME</span></div>
  <div class="hf-main">
    <div class="hf-title"><h1>${'HALL OF FAME'.split('').map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</h1><p>명예의 전당 — 이번 판을 빛낸 카드</p></div>
    <div class="hf-meta">${R.sample ? '예시 경기 데이터 · 실제 기록이 아닙니다' : '방금 끝난 경기 기록'}<br>내 진영 HP ${R.myHP} / 상대 진영 HP ${R.opHP}</div>
    <div class="hf-left"><div class="hf-k"><i class="b"></i>내 진영 / YOU</div><div class="hf-mvp">MVP</div><h3>마지막 승부에 남긴<br>가장 결정적인 한 수.</h3><hr>
      <p>${R.rounds}라운드에 추가한 피해 ${lastDmg}.<br>이번 판 ${nm(mv.id)}의 기여 피해 ${mv.dmg} 중<br>${mv.dmg ? Math.round(lastDmg / mv.dmg * 100) : 0}%를 마지막 라운드에 기록했습니다.</p></div>
    <div class="hf-center">
      <div class="hf-tri"></div>
      <svg class="hf-ring" viewBox="0 0 400 400"><circle cx="200" cy="200" r="186" class="r1"/><circle cx="200" cy="200" r="172" class="r2"/></svg>
      <i class="tick t1"></i><i class="tick t2"></i><i class="tick t3"></i><i class="tick t4"></i>
      <div class="hf-card"><div class="hf-ct"><span class="badge">내 진영 MVP</span><span>EFFECT / ${EF[mv.id].k === 'A' ? 'ACTIVE' : 'PASSIVE'}</span></div>
        <h2>${nm(mv.id)}</h2>${bigGlyph(mv.id, 130)}
        <div class="hf-cs">이번 판, 이 카드가 추가한 피해</div>
        <div class="hf-cn"><b id="hfNum">0</b><span>사용 ${mv.uses}회</span></div>
        <div class="hf-cf">${EF[mv.id].suit}${EF[mv.id].rank} · THE DECISIVE PLAY</div></div>
    </div>
    <div class="hf-rival"><div class="hf-k"><i class="r"></i>상대 진영 / RIVAL</div><div class="rv-m">RIVAL MVP</div>
      <div class="rv-n"><h3>${nm(omv.id)}</h3><span class="rv-ic">${icon(EF[omv.id].cat, 54)}</span></div>
      <div class="rv-s"><div><span>내 진영에 가한 피해</span><b>${omv.dmg}</b></div><div><span>사용 횟수</span><b>${omv.uses}회</b></div></div>
      <p>후반 추격에 기여한 상대 진영의 주역.<br>${op.name}의 덱에서 가장 위협적이었던 카드.</p></div>
    <div class="hf-foot"><span>선정 기준은 기획안 · 결정적 라운드의 기여와 카드별 기록을 함께 검토하며, 피해·회복의 고정 가중치는 두지 않습니다.</span><b>각 진영에서 MVP 1장씩 선정</b></div>
  </div>
  <div class="hf-hl"><div class="hl-h"><b>분야별 하이라이트</b><span>피해뿐 아니라, 지켜낸 순간도 기록합니다.</span></div>
    <div class="hl-row"><div class="hl-who"><i class="b"></i>내 진영 / YOU</div>${hl(H, 'blue')}</div>
    <div class="hl-row"><div class="hl-who"><i class="r"></i>상대 진영 / RIVAL</div>${hl(O, 'blue')}</div></div>
  <div class="rs-bot"><button class="rs-link" data-a="report">↗ <b>상세 카드 기록</b><span>양 진영 효과 카드 전체 보기</span></button><div><button class="rs-txt" data-a="lobby">로비로</button><button class="rs-pri" data-a="again">다시 대전</button></div></div>
</div>`;
};
function bindResultNav(el) {
  const R = R_();
  $$('[data-a]', el).forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'report') App.go('report');
    if (a === 'fame') App.go('fame');
    if (a === 'lobby') App.backFromBattle(R.from);
    if (a === 'again') App.go('battle', { from: R.from, mode: R.mode });
  });
}
MOD_E.bind.fame = el => {
  const R = R_(); const me = R.me; const mv = me.cards.find(c => c.id === me.mvp) || me.cards[0];
  App.after(() => countUp($('#hfNum', el), mv ? mv.dmg : 0, 1300), 1100);
  bindResultNav(el);
  App.keyH = e => { if (e.key === 'ArrowRight') { App.go('report'); return true; } if (e.key === 'Enter') { App.go('battle', { from: R.from, mode: R.mode }); return true; } return false; };
};

MOD_E.screens.report = () => {
  const R = R_();
  const table = (side, isMe) => {
    const sum = k => side.cards.reduce((a, c) => a + c[k], 0);
    const H = highlights(side);
    const maxD = Math.max(1, ...side.cards.map(c => c.dmg));
    return `<div class="cr-t"><div class="cr-th"><span><i class="${isMe ? 'b' : 'r'}"></i>${isMe ? '내 진영 / YOU' : '상대 진영 / RIVAL'}</span><small>보유 ${side.cards.length}장</small></div>
    <div class="cr-bar">${isMe ? '내 진영 → 상대 진영에 가한 피해' : '상대 진영 → 내 진영에 가한 피해'}<small>실드 · 회복 → 본인</small></div>
    <table><thead><tr><th>효과 카드 / 수상</th><th>사용 횟수</th><th>누적 피해</th><th>실드 부여</th><th>유효 회복</th></tr></thead><tbody>
    ${side.cards.map((c, i) => {
      const tags = []; if (c.id === side.mvp) tags.push('MVP' + (isMe ? ' · 선택됨' : '')); if (H.md && c.id === H.md.id) tags.push('최다 피해'); if (H.mu && c.id === H.mu.id) tags.push('최다 사용'); if (H.sup && c.id === H.sup.id && (c.shield + c.heal)) tags.push('보조 기여');
      return `<tr class="${isMe && c.id === side.mvp ? 'on' : ''}" data-side="${isMe ? 'me' : 'op'}" data-id="${c.id}" style="--i:${i}">
      <td><div class="cr-n"><span class="cr-ic">${icon(EF[c.id].cat, 22)}</span><div><b>${nm(c.id)}</b><small class="${isMe ? 'b' : 'r'}">${tags.join(' · ')}</small></div></div></td>
      <td>${c.uses}</td><td class="${H.md && c.id === H.md.id ? 'hi' : ''}"><div class="cr-dmg"><i style="--w:${c.dmg / maxD * 100}%"></i><b>${c.dmg}</b></div></td><td class="${c.shield ? 'hi2' : ''}">${c.shield}</td><td class="${c.heal ? 'hi2' : ''}">${c.heal}</td></tr>`;
    }).join('')}
    </tbody><tfoot><tr><td>효과 카드만 합계</td><td>${sum('uses')}</td><td>${sum('dmg')}</td><td>${sum('shield')}</td><td>${sum('heal')}</td></tr></tfoot></table></div>`;
  };
  return `<div class="rs report">
  <div class="rs-top"><span class="rs-l"><i class="g"></i>1V1 / POKER DUEL</span><span class="rs-r">경기 종료 · ${R.rounds}라운드 <b class="${R.win ? '' : 'red'}">내 진영 ${R.win ? '승리' : '패배'}</b> 02 / CARD REPORT</span></div>
  <div class="cr-head"><div><small>EVERY CARD. EVERY CONTRIBUTION.</small><h1>카드별 활약 기록</h1></div><div class="cr-meta">${R.sample ? '예시 경기 데이터 · 수치는 가상의 한 경기 기록입니다' : '방금 끝난 경기의 기록입니다'}<br><b>${R.rounds}라운드 / 양 진영 효과 카드 전체</b></div></div>
  <div class="cr-tables">${table(R.me, true)}${table(R.op, false)}</div>
  <div class="cr-detail" id="crDetail"></div>
  <div class="rs-bot"><button class="rs-link" data-a="fame">← <b>명예의 전당</b><span>이번 판의 주인공 다시 보기</span></button><div><button class="rs-txt" data-a="lobby">로비로</button><button class="rs-pri" data-a="again">다시 대전</button></div></div>
</div>`;
};
function crDetail(el, sideKey, id) {
  const R = R_(), side = R[sideKey], c = side.cards.find(x => x.id === id); if (!c) return;
  const rs = Object.entries(c.rounds).sort((a, b) => a[0] - b[0]);
  const last = R.rounds;
  $('#crDetail', el).innerHTML = `<div class="cd-card"><div class="cd-tg"><span class="badge ${sideKey === 'op' ? 'red' : ''}">${sideKey === 'me' ? '내 진영' : '상대 진영'}</span><span>선택 카드 상세</span></div>
    <div class="cd-nm">${icon(EF[id].cat, 40)}<div><h2>${nm(id)}</h2><small>${EF[id].suit}${EF[id].rank} · ${EF[id].desc}</small></div></div>
    <div class="cd-big"><span>상대에게 추가한 피해</span><b>${c.dmg}</b><em>사용 ${c.uses}회</em></div>
    <small class="mut2">실드 ${c.shield} · 유효 회복 ${c.heal}${id === side.mvp ? ` · MVP 근거: 마지막 R${String(last).padStart(2, '0')} 기여 피해 ${(c.rounds[last] || {}).dmg || 0}` : ''}</small></div>
    <div class="cd-rounds"><h4>라운드별 사용 / 피해</h4><table><thead><tr><th>사용한 라운드</th><th>사용 횟수</th><th>상대에게 추가한 피해</th></tr></thead><tbody>
    ${rs.length ? rs.map(([r, v]) => `<tr class="${+r === last ? 'last' : ''}"><td>R${String(r).padStart(2, '0')}${+r === last ? ' · 마지막 라운드' : ''}</td><td>${v.uses}</td><td>${v.dmg}</td></tr>`).join('') : '<tr><td colspan="3" class="mut2">라운드별 기록 없음 (패시브 상시 효과 또는 미사용)</td></tr>'}
    </tbody><tfoot><tr><td>합계</td><td>${rs.reduce((a, [, v]) => a + v.uses, 0)}</td><td>${rs.reduce((a, [, v]) => a + v.dmg, 0)}</td></tr></tfoot></table></div>
    <div class="cd-note"><h4>집계 제안 / 이 카드가 추가한 피해</h4><p>배율 카드에는 기본 피해가 아닌 증가분만 귀속합니다. 같은 피해를 여러 카드에 중복 기록하지 않습니다.</p>
    <div class="cd-ex"><b>R${String(last).padStart(2, '0')} 예시 · 다른 효과 카드의 피해 없음</b><div class="fx">기본 ${Math.round(((c.rounds[last] || {}).dmg || 0))} + <em>${nm(id)} ${(c.rounds[last] || {}).dmg || 0}</em> = ${((c.rounds[last] || {}).dmg || 0) * 2}</div><small>${c.dmg} 전체에는 ${nm(id)}을(를) 다시 더하지 않습니다.</small></div>
    <p class="mut2">포커 피해 합계는 효과 카드 기여분만 포함하며, 포커 기본 공격을 포함한 전체 전투 피해가 아닙니다.</p></div>`;
  $('#crDetail', el).classList.remove('anim'); void el.offsetWidth; $('#crDetail', el).classList.add('anim');
}
MOD_E.bind.report = el => {
  const R = R_();
  $$('tbody tr[data-id]', el).forEach(tr => tr.onclick = () => {
    $$('tbody tr', el).forEach(x => x.classList.remove('on')); tr.classList.add('on');
    crDetail(el, tr.dataset.side, tr.dataset.id);
  });
  crDetail(el, 'me', R.me.mvp || (R.me.cards[0] && R.me.cards[0].id));
  bindResultNav(el);
  App.keyH = e => { if (e.key === 'ArrowLeft') { App.go('fame'); return true; } return false; };
};

injectCSS(`
.vE .rs{position:absolute;inset:0;background:#000;color:#fff;font-family:'Noto Sans KR';display:flex;flex-direction:column}
.rs i.g,.rs i.b,.rs i.r{display:inline-block;width:8px;height:8px;margin-right:8px;vertical-align:1px}
.rs i.g{background:#21e05a}.rs i.b{background:#1d2dff}.rs i.r{background:#ff2b2b}
.rs-top{height:44px;display:flex;justify-content:space-between;align-items:center;padding:0 40px;font-size:12px;font-weight:700;flex-shrink:0}
.rs-r{color:#bbb;display:flex;gap:12px;align-items:center}.rs-r b{background:#1d2dff;color:#fff;padding:3px 9px}.rs-r b.red{background:#ff2b2b}
.hf-main{position:relative;flex:1;padding:0 40px}
.hf-title h1{margin:14px 0 0;font:900 64px/1 'Archivo Black';letter-spacing:-.03em}
.hf-title h1 span{display:inline-block;animation:hfL .5s calc(var(--i)*.04s) both cubic-bezier(.2,1.2,.4,1)}
@keyframes hfL{from{opacity:0;transform:translateY(40px)}}
.hf-title p{margin:6px 0 0;font-weight:700;font-size:15px}
.hf-meta{position:absolute;right:40px;top:30px;text-align:right;font-size:11px;color:#aaa;line-height:2}
.hf-left{position:absolute;left:40px;top:170px;width:300px;animation:evIn .6s .5s both}
.hf-k{font-size:12px;font-weight:700}
.hf-mvp{font:900 92px/1 'Archivo Black';margin:14px 0 18px;letter-spacing:-.04em}
.hf-left h3{font-size:22px;line-height:1.4;margin:0}.hf-left hr{width:36px;border:0;border-top:3px solid #1d2dff;margin:22px 0}.hf-left p{font-size:13px;color:#bbb;line-height:1.7;margin:0}
.hf-center{position:absolute;left:50%;top:150px;width:420px;height:420px;margin-left:-210px;transform:scale(.86);transform-origin:50% 0}
.hf-tri{position:absolute;left:50%;top:10px;width:520px;height:330px;margin-left:-260px;background:#151515;clip-path:polygon(28% 0,72% 0,100% 100%,0 100%)}
.hf-ring{position:absolute;inset:0;transform:rotate(-90deg)}
.hf-ring circle{fill:none;stroke-width:2}.hf-ring .r1{stroke:#444;stroke-dasharray:1170;stroke-dashoffset:1170;animation:ring 1.4s .3s forwards ease-out}.hf-ring .r2{stroke:#1d2dff;stroke-width:3;stroke-dasharray:1081;stroke-dashoffset:1081;animation:ring 1.6s .5s forwards ease-out}
@keyframes ring{to{stroke-dashoffset:0}}
.tick{position:absolute;background:#fff;animation:tFadeIn .4s 1.4s both}.t1{left:50%;top:-14px;width:2px;height:22px}.t2{left:50%;bottom:-14px;width:2px;height:22px}.t3{top:50%;left:-26px;width:30px;height:2px}.t4{top:50%;right:-26px;width:30px;height:2px}
.hf-card{position:absolute;left:50%;top:-6px;width:190px;height:270px;margin-left:-95px;background:#fff;color:#000;border:3px solid #1d2dff;padding:12px 14px;display:flex;flex-direction:column;animation:hfCard .9s .6s both cubic-bezier(.2,1.2,.4,1);box-shadow:0 0 0 6px #000,0 0 60px #1d2dff88}
@keyframes hfCard{0%{opacity:0;transform:translateY(-80px) rotateY(90deg) scale(.7)}60%{opacity:1}100%{transform:none}}
.hf-ct{display:flex;justify-content:space-between;align-items:center;font-size:8.5px;font-weight:700}
.badge{background:#1d2dff;color:#fff;padding:3px 7px;font-size:10px;font-weight:700}.badge.red{background:#ff2b2b}
.hf-card h2{margin:8px 0 2px;font-size:30px;font-weight:900}
.hf-glyph{margin:0 auto;border-radius:50%;border:2px solid #1d2dff;display:flex;align-items:center;justify-content:center;color:#000;transform:scale(.62);margin:-22px auto}
.hf-glyph svg{stroke-width:3}
.hf-cs{font-size:9px;color:#666;margin-top:auto}
.hf-cn{display:flex;justify-content:space-between;align-items:baseline}.hf-cn b{font:900 40px 'Archivo Black';color:#1d2dff}.hf-cn span{font-size:11px;font-weight:700}
.hf-cf{font-size:8px;color:#888;border-top:1px solid #ddd;padding-top:4px}
.hf-rival{position:absolute;right:40px;top:180px;width:268px;border:1px solid #444;padding:18px 20px;animation:evIn .6s .8s both}
.rv-m{color:#ff2b2b;font-size:10px;font-weight:700;margin-top:16px}
.rv-n{display:flex;justify-content:space-between;align-items:center}.rv-n h3{font-size:26px;margin:2px 0}.rv-ic{color:#fff}.rv-ic svg{stroke-width:3.5}
.rv-s{display:flex;justify-content:space-between;border-top:1px solid #444;margin-top:12px;padding-top:12px}.rv-s span{display:block;font-size:10px;color:#aaa}.rv-s b{font:900 26px 'Archivo Black'}.rv-s div:last-child{text-align:right}
.hf-rival p{font-size:11px;color:#aaa;line-height:1.7;margin:12px 0 0}
.hf-foot{position:absolute;left:40px;right:40px;bottom:10px;display:flex;justify-content:space-between;font-size:10px;color:#999}.hf-foot b{color:#fff}
.hf-hl{background:#fff;color:#000;padding:16px 40px 8px;flex-shrink:0;animation:hlIn .6s 1.2s both}
@keyframes hlIn{from{opacity:0;transform:translateY(30px)}}
.hl-h{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px}.hl-h span{color:#888;font-size:11px}
.hl-row{display:grid;grid-template-columns:150px 1fr 1fr 1fr;align-items:center;padding:12px 0;border-top:1px solid #e5e5e5}
.hl-who{font-size:12px;font-weight:700}
.hl-c{border-left:1px solid #e5e5e5;padding-left:16px}.hl-c span{display:block;font-size:10px;color:#777}.hl-c b{font-size:19px;font-weight:900;margin-right:8px}.hl-c em{font-style:normal;font-size:12px}.hl-c em.blue{color:#1d2dff;font-weight:700}
.rs-bot{height:64px;flex-shrink:0;background:#fff;color:#000;border-top:1px solid #e5e5e5;display:flex;justify-content:space-between;align-items:center;padding:0 40px}
.rs-bot>div{display:flex;align-items:center;gap:20px}
.rs-link{background:none;border:0;font-size:14px;color:#1d2dff;display:flex;gap:10px;align-items:center}.rs-link b{color:#000}.rs-link span{font-size:11px;color:#888}
.rs-link:hover b{text-decoration:underline}
.rs-txt{background:none;border:0;font-weight:700;font-size:14px}.rs-txt:hover{color:#1d2dff}
.rs-pri{background:#1d2dff;color:#fff;border:0;width:150px;height:42px;font-weight:700;font-size:15px;transition:.15s}.rs-pri:hover{background:#000;box-shadow:4px 4px 0 #1d2dff}
.vE .rs.report{background:#fff;color:#000}
.report .rs-top{background:#000;color:#fff}
.cr-head{display:flex;justify-content:space-between;align-items:flex-end;padding:14px 40px 10px}.cr-head small{color:#1d2dff;font-weight:900;font-size:11px}.cr-head h1{margin:2px 0 0;font-size:30px;font-weight:900}
.cr-meta{text-align:right;font-size:11px;color:#777;line-height:1.7}.cr-meta b{color:#000}
.cr-tables{display:grid;grid-template-columns:1fr 1fr;gap:22px;padding:0 40px}
.cr-th{display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:6px}.cr-th small{color:#888;font-weight:400}
.cr-bar{background:#000;color:#fff;font-size:11px;font-weight:700;padding:8px 10px;display:flex;justify-content:space-between}.cr-bar small{color:#aaa;font-weight:400}
.cr-t table{width:100%;border-collapse:collapse;font-size:12px}
.cr-t th{font-size:10px;color:#555;font-weight:500;text-align:right;padding:6px 8px;background:#f3f3f3}.cr-t th:first-child{text-align:left}
.cr-t td{padding:5px 8px;text-align:right;border-bottom:1px solid #eee;font-weight:700}.cr-t td:first-child{text-align:left}
.cr-t tbody tr{cursor:pointer;transition:background .15s;animation:evIn .4s calc(var(--i)*.06s + .2s) both}
.cr-t tbody tr:hover{background:#f6f7ff}.cr-t tbody tr.on{background:#eef0ff;box-shadow:inset 3px 0 0 #1d2dff}
.cr-t tfoot td{background:#f3f3f3;border:0;padding:7px 8px}
.cr-n{display:flex;gap:9px;align-items:center}.cr-ic{width:28px;height:28px;border:1.5px solid #000;display:flex;align-items:center;justify-content:center}
.cr-n b{display:block;font-size:12.5px}.cr-n small{font-size:9.5px;font-weight:700}.cr-n small.b{color:#1d2dff}.cr-n small.r{color:#ff2b2b}
.cr-dmg{position:relative;display:flex;justify-content:flex-end;align-items:center;min-width:70px}.cr-dmg i{position:absolute;left:0;height:4px;bottom:-2px;background:#1d2dff33;width:0;animation:bar .8s .6s forwards}
@keyframes bar{to{width:var(--w)}}
td.hi{color:#1d2dff}.cr-t:last-child td.hi{color:#ff2b2b}td.hi2{color:#1d2dff}.cr-t:last-child td.hi2{color:#ff2b2b}
.cr-detail{margin:12px 40px 0;border:2px solid #1d2dff;display:grid;grid-template-columns:240px 1fr 1.1fr;gap:22px;padding:14px 18px;flex:1;min-height:0;overflow:hidden}
.cr-detail.anim>*{animation:evIn .35s both}.cr-detail.anim>*:nth-child(2){animation-delay:.06s}.cr-detail.anim>*:nth-child(3){animation-delay:.12s}
.cd-tg{display:flex;gap:8px;align-items:center;font-size:11px;color:#1d2dff;font-weight:700}
.cd-nm{display:flex;gap:10px;align-items:center;margin:8px 0}.cd-nm h2{margin:0;font-size:22px}.cd-nm small{font-size:10px;color:#777}
.cd-big span{display:block;font-size:10px;color:#777}.cd-big b{font:900 40px 'Archivo Black';color:#1d2dff}.cd-big em{font-style:normal;font-weight:700;font-size:12px;margin-left:10px}
.mut2{color:#888;font-size:10.5px}
.cd-rounds h4,.cd-note h4{margin:0 0 6px;font-size:12px}
.cd-rounds table{width:100%;border-collapse:collapse;font-size:11.5px}.cd-rounds th{font-size:10px;color:#777;text-align:left;font-weight:500;padding:3px 0;border-bottom:1px solid #ddd}
.cd-rounds td{padding:4px 0;border-bottom:1px solid #eee;font-weight:700}.cd-rounds tr.last td{color:#1d2dff}.cd-rounds tfoot td{border:0;border-top:2px solid #000;padding-top:5px}
.cd-note{border-left:1px solid #ddd;padding-left:18px}.cd-note p{font-size:11px;color:#555;margin:0 0 8px;line-height:1.6}
.cd-ex{background:#f3f3f3;padding:10px 12px;margin-bottom:8px}.cd-ex b{font-size:11px}.cd-ex .fx{font-weight:900;font-size:16px;margin:4px 0}.cd-ex em{color:#1d2dff;font-style:normal}.cd-ex small{font-size:10px;color:#888}
`);
