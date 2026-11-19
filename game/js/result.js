'use strict';
/* =========================================================
   결과 : 승리/패배 연출 → 명예의 전당 → 카드별 활약 기록 → [다시 대전] / [로비로]
   ========================================================= */
const RES = () => App.lastResult || (App.lastResult = sampleResult());
// '포커 족보 공격' : 효과 카드 몫을 뺀 기본 족보 피해를 한 줄로 표시하기 위한 가상 카드
const POKER_CARD = { id: 'POKER', name: '포커 족보 공격', suit: '🃏', rank: '', cat: '공격', k: 'A', g: 'C', desc: '선택한 5장의 족보 점수로 입힌 기본 피해 (효과 카드 몫 제외)' };
const EFX = id => id === 'POKER' ? POKER_CARD : EF[id];
const nm = id => EFX(id) ? EFX(id).name : id;
function highlights(side) {
  const c = side.cards.filter(x => x.id !== 'POKER'), by = k => c.slice().sort((a, b) => b[k] - a[k])[0];
  return { mu: by('uses'), md: by('dmg'), sup: c.slice().sort((a, b) => (b.shield + b.heal) - (a.shield + a.heal))[0] };
}
const resTop = (R, page) => `<div class="rs-top"><span class="pix">RUNE DUEL · 1V1</span><span class="rs-r">경기 종료 · <b class="num">${R.rounds}</b>라운드 <b class="tagb ${R.win ? 'win' : 'lose'}">${R.win ? '승리' : '패배'}</b> <span class="pix">${page}</span></span></div>`;
const resBot = (left) => `<div class="rs-bot">${left}<div class="row">${btn('로비로', '', C.gray, 'data-a="lobby"')}${btn('다시 대전', 'REMATCH', C.red, 'data-a="again"', 'pri')}</div></div>`;
function bindRes(el) {
  const R = RES();
  $$('[data-a]', el).forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    App.after(() => {
      if (a === 'report') App.go('report');
      if (a === 'fame') App.go('fame');
      if (a === 'lobby') App.go('home');
      if (a === 'again') App.go('battle', { mode: R.mode, opp: R.sample ? undefined : R.oppName, rules: R.rules });
    }, 120);
  });
}

Screens.fame = {
  full: true, title: '명예의 전당',
  html: () => {
    const R = RES(), me = R.me, op = R.op;
    const mv = me.cards.find(c => c.id === me.mvp) || me.cards.find(c => c.id !== 'POKER') || { id: '♠Q', uses: 0, dmg: 0, rounds: {} };
    const omv = op.cards.find(c => c.id === op.mvp) || op.cards.find(c => c.id !== 'POKER') || { id: '♠7', uses: 0, dmg: 0, rounds: {} };
    const lastDmg = (mv.rounds[R.rounds] || {}).dmg || 0, e = EFX(mv.id), oe = EFX(omv.id);
    const pct = me.cardPct != null ? me.cardPct : null;
    const H = highlights(me), O = highlights(op);
    const hl = h => `<div class="hl-c"><small>최다 사용</small><b>${h.mu ? nm(h.mu.id) : '-'}</b><em class="num">${h.mu ? h.mu.uses + '회' : ''}</em></div>
      <div class="hl-c"><small>최다 누적 피해</small><b>${h.md ? nm(h.md.id) : '-'}</b><em class="num">${h.md ? h.md.dmg : ''}</em></div>
      <div class="hl-c"><small>보조 기여상</small><b>${h.sup ? nm(h.sup.id) : '-'}</b><em class="num">${h.sup ? `실드 ${h.sup.shield} · 회복 ${h.sup.heal}` : ''}</em></div>`;
    return `<div class="rs fame">${resTop(R, '01 / HALL OF FAME')}
      <div class="hf">
        <div class="hf-title"><h1 class="pix">${'HALL OF FAME'.split('').map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</h1><p>명예의 전당 — 이번 판을 빛낸 카드 ${R.sample ? '<em>(예시 데이터)</em>' : ''}</p></div>
        <div class="hf-left"><small class="lbl">내 진영 · YOU</small><div class="hf-mvp pix">MVP</div><h3>마지막 승부에 남긴<br>가장 결정적인 한 수.</h3>
          <p>${R.rounds}라운드에 추가한 피해 <b class="num">${lastDmg}</b><br>이번 판 ${nm(mv.id)}의 기여 피해 <b class="num">${mv.dmg}</b>${mv.shield + mv.heal ? ` · 지켜낸 양 <b class="num">${mv.shield + mv.heal}</b>` : ''}${pct != null ? `<br>총 피해 <b class="num">${me.total}</b> 중 효과 카드 기여 <b class="num">${pct}%</b>` : ''}<br>내 HP <b class="num">${R.myHP}</b> · 상대 HP <b class="num">${R.opHP}</b></p></div>
        <div class="hf-center"><div class="hf-rays"></div>
          <div class="hf-card ${isRed(e.suit) ? 'red' : ''}"><div class="hf-ct"><span class="tagb win">내 진영 MVP</span><span class="pix">${e.k === 'A' ? 'ACTIVE' : 'PASSIVE'}</span></div>
            <div class="hf-code">${codeHTML(e)}</div><h2>${e.name}</h2><div class="hf-ic">${icon(e.cat, 64)}</div>
            <small>이번 판, 이 카드가 추가한 피해</small><div class="hf-cn"><b class="num" id="hfNum">0</b><span>사용 ${mv.uses}회</span></div></div></div>
        <div class="hf-rival"><small class="lbl red">상대 진영 · RIVAL MVP</small><div class="rv-n"><h3>${oe.name}</h3><span>${icon(oe.cat, 44)}</span></div>
          <div class="rv-s"><div><small>내 진영에 가한 피해</small><b class="num">${omv.dmg}</b></div><div><small>사용</small><b class="num">${omv.uses}회</b></div></div><p>${op.name}의 덱에서 가장 위협적이었던 카드.</p></div>
      </div>
      <div class="hf-hl"><div class="hl-h"><b>분야별 하이라이트</b><span class="mut">피해뿐 아니라 지켜낸 순간도 기록합니다</span></div>
        <div class="hl-row"><div class="hl-who" style="--c:${C.blue}">내 진영</div>${hl(H)}</div>
        <div class="hl-row"><div class="hl-who" style="--c:${C.red}">상대 진영</div>${hl(O)}</div></div>
      ${resBot(btn('상세 카드 기록 →', '양 진영 효과 카드 전체', C.yellow, 'data-a="report"'))}</div>`;
  },
  bind(el) {
    const R = RES(), mv = R.me.cards.find(c => c.id === R.me.mvp) || R.me.cards[0];
    App.after(() => { Sfx.play('banner'); FX.flash('#ffe08a', .25, 400); }, 500);
    App.after(async () => {
      const n = $('#hfNum', el); if (!n) return;
      await countScore(n, mv ? mv.dmg : 0, 1200);
      const p = FX.center(n); FX.ring(p.x, p.y, '#ffe08a', 300, 600, 10); burst(p.x, p.y, ['#ffe08a', '#fff', C.blue], 30, 180); Sfx.play('coin');
      if (R.win) FX.confetti(90);
    }, 1100);
    bindTilt3D(el, '.hf-card', 18);
    bindRes(el);
    App.keyH = e => { if (e.key === 'ArrowRight') { App.go('report'); return true; } return false; };
  },
};

Screens.report = {
  full: true, title: '카드별 활약 기록',
  html: () => {
    const R = RES();
    const table = (side, isMe) => {
      const sum = k => side.cards.reduce((a, c) => a + c[k], 0), H = highlights(side), maxD = Math.max(1, ...side.cards.map(c => c.dmg));
      return `<div class="cr-t ${isMe ? 'me' : 'op'}"><div class="cr-bar"><b>${isMe ? '내 진영 → 상대에게 가한 피해' : '상대 진영 → 나에게 가한 피해'}</b><small>실드 · 회복은 본인에게</small></div>
      <table><thead><tr><th>효과 카드 / 수상</th><th>사용</th><th>누적 피해</th><th>실드</th><th>회복</th></tr></thead><tbody>
      ${side.cards.map((c, i) => {
        const tags = []; if (c.id === side.mvp) tags.push('MVP'); if (H.md && c.id === H.md.id && c.dmg) tags.push('최다 피해'); if (H.mu && c.id === H.mu.id && c.uses) tags.push('최다 사용'); if (H.sup && c.id === H.sup.id && (c.shield + c.heal)) tags.push('보조 기여');
        return `<tr class="${isMe && c.id === side.mvp ? 'on' : ''}" data-side="${isMe ? 'me' : 'op'}" data-id="${c.id}" style="--i:${i}">
        <td><div class="cr-n"><span class="cr-ic">${icon(EFX(c.id).cat, 18)}</span><div><b>${codeHTML(EFX(c.id))} ${nm(c.id)}</b><small>${c.id === 'POKER' ? '기본 공격' : tags.join(' · ')}</small></div></div></td>
        <td class="num">${c.uses}</td><td><div class="cr-dmg"><i style="--w:${c.dmg / maxD * 100}%"></i><b class="num">${c.dmg}</b></div></td><td class="num">${c.shield}</td><td class="num">${c.heal}</td></tr>`;
      }).join('')}</tbody><tfoot><tr><td>합계</td><td class="num">${sum('uses')}</td><td class="num">${sum('dmg')}</td><td class="num">${sum('shield')}</td><td class="num">${sum('heal')}</td></tr></tfoot></table></div>`;
    };
    return `<div class="rs report">${resTop(R, '02 / CARD REPORT')}
      <div class="cr-head"><div><small class="lbl">EVERY CARD. EVERY CONTRIBUTION.</small><h1>카드별 활약 기록</h1></div><div class="mut">${R.sample ? '예시 경기 데이터입니다' : `vs ${R.oppName} · 방금 끝난 경기`} · 행을 누르면 라운드별 상세</div></div>
      <div class="cr-tables">${table(R.me, true)}${table(R.op, false)}</div>
      <div class="cr-detail" id="crd"></div>
      ${resBot(btn('← 명예의 전당', '', C.yellow, 'data-a="fame"'))}</div>`;
  },
  bind(el) {
    const R = RES();
    const detail = (sk, id) => {
      const side = R[sk], c = side.cards.find(x => x.id === id); if (!c) return;
      const rs = Object.entries(c.rounds).sort((a, b) => a[0] - b[0]), last = R.rounds, e = EFX(id);
      $('#crd', el).innerHTML = `<div class="cd-card"><span class="tagb ${sk === 'me' ? 'win' : 'lose'}">${sk === 'me' ? '내 진영' : '상대 진영'}</span>
        <div class="cd-nm">${icon(e.cat, 36)}<div><h2>${e.name} <small>${codeHTML(e)}</small></h2><small class="mut">${e.desc}</small></div></div>
        <div class="cd-big"><small>추가한 피해</small><b class="num">${c.dmg}</b><em>사용 ${c.uses}회 · 실드 ${c.shield} · 회복 ${c.heal}</em></div></div>
        <div class="cd-rounds"><h4>라운드별 사용 / 피해</h4><table><thead><tr><th>라운드</th><th>사용</th><th>추가 피해</th></tr></thead><tbody>
        ${rs.length ? rs.map(([r, v]) => `<tr class="${+r === last ? 'last' : ''}"><td class="num">R${String(r).padStart(2, '0')}${+r === last ? ' · 마지막' : ''}</td><td class="num">${v.uses}</td><td class="num">${v.dmg}</td></tr>`).join('') : '<tr><td colspan="3" class="mut">라운드별 기록 없음 (미사용 또는 상시 효과)</td></tr>'}
        </tbody></table></div>
        <div class="cd-note"><h4>집계 기준</h4><p>배율 카드(심판 등)에는 증가분만, 고정 보너스 카드에는 보너스 × 배율만 귀속합니다. 같은 피해를 여러 카드에 중복 기록하지 않으며, 포커 족보 기본 점수는 효과 카드 기여에 포함하지 않습니다.</p>
        <p>MVP는 마지막(결정적) 라운드 기여가 가장 큰 카드, 없으면 누적 피해가 가장 큰 카드입니다.</p></div>`;
      $('#crd', el).classList.remove('anim'); void el.offsetWidth; $('#crd', el).classList.add('anim');
    };
    $$('tbody tr[data-id]', el).forEach(tr => tr.onclick = () => { Sfx.play('select'); $$('tbody tr', el).forEach(x => x.classList.remove('on')); tr.classList.add('on'); detail(tr.dataset.side, tr.dataset.id); });
    detail('me', R.me.mvp || (R.me.cards[0] && R.me.cards[0].id));
    bindRes(el);
    App.keyH = e => { if (e.key === 'ArrowLeft') { App.go('fame'); return true; } return false; };
  },
};
