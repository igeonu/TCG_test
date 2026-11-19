'use strict';
/* =========================================================
   FX – 효과음(WebAudio 합성) · 타격감 · 배너 · 파티클 · 배경
   ========================================================= */
const FXOPT = Object.assign({ shake: 'normal' }, store.get('fxOpt', {}));
const saveFxOpt = () => store.set('fxOpt', FXOPT);

/* ---------- 시각 효과 ---------- */
const FX = {
  L() { return $('#layer'); },
  center(el) { const r = App.rectOf(el); return { x: r.x + r.w / 2, y: r.y + r.h / 2, r }; },
  add(cls, css, html = '', life = 1200) { const d = document.createElement('div'); d.className = cls; d.style.cssText = css; d.innerHTML = html; this.L().appendChild(d); setTimeout(() => d.remove(), life); return d; },
  ring(x, y, color = '#fff', size = 240, dur = 600, w = 10) {
    const d = this.add('fx-ring', `left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin:${-size / 2}px;border-width:${w}px;border-color:${color}`, '', dur + 50);
    d.animate([{ transform: 'scale(.1)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' });
  },
  star(x, y, color = '#ffe08a', size = 260) {
    const d = this.add('fx-star', `left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin:${-size / 2}px;background:${color}`, '', 520);
    d.animate([{ transform: 'scale(.2) rotate(0)', opacity: 1 }, { transform: 'scale(1.1) rotate(25deg)', opacity: .9, offset: .3 }, { transform: 'scale(.6) rotate(45deg)', opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
  },
  flash(color = '#fff', op = .7, dur = 260) {
    const d = this.add('fx-flash', `background:${color}`, '', dur + 30);
    d.animate([{ opacity: op }, { opacity: 0 }], { duration: dur, easing: 'ease-out', fill: 'forwards' });
  },
  shake(power = 1) {
    const k = FXOPT.shake === 'off' ? 0 : FXOPT.shake === 'strong' ? 1.7 : 1; if (!k) return;
    const a = 7 * power * k, frames = [];
    for (let i = 0; i < 9; i++) { const f = 1 - i / 9; frames.push({ transform: `translate(${(Math.random() * 2 - 1) * a * f}px,${(Math.random() * 2 - 1) * a * f}px) rotate(${(Math.random() * 2 - 1) * .6 * power * k * f}deg)` }); }
    frames.push({ transform: 'none' });
    $('#screens').animate(frames, { duration: 380 + power * 120, easing: 'linear' });
  },
  punch(s = 1.035) { if (FXOPT.shake === 'off') return; $('#screens').animate([{ scale: 1 }, { scale: s }, { scale: 1 }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' }); },
  async hitstop(ms = 90) { const st = $('#stage'); st.classList.add('freeze'); await wait(ms); st.classList.remove('freeze'); },
  banner(text, sub = '', color = '#e6a33c', cls = '') {
    Sfx.play('banner');
    const d = this.add('fx-banner ' + cls, `--c:${color}`, `<div class="fb-band"></div><div class="fb-t pix">${text.split('').map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>${sub ? `<div class="fb-s">${sub}</div>` : ''}`, 1500);
    return wait(1050);
  },
  beam(from, to, color = '#ffe08a') {
    const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const d = this.add('fx-beam', `left:${from.x}px;top:${from.y}px;width:${len}px;--c:${color};transform:rotate(${ang}deg)`, '', 500);
    d.animate([{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: .45 }, { clipPath: 'inset(0 0 0 100%)', opacity: .2 }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
    return wait(190);
  },
  chunks(bar, fromPct, toPct, color = '#3dff95') {
    if (!bar || fromPct <= toPct) return;
    const r = App.rectOf(bar), x0 = r.x + r.w * toPct / 100, w = r.w * (fromPct - toPct) / 100, n = clamp(Math.round(w / 9), 2, 14);
    for (let i = 0; i < n; i++) {
      const pw = w / n, d = this.add('fx-chunk', `left:${x0 + i * pw}px;top:${r.y}px;width:${pw + 1}px;height:${r.h}px;background:${color}`, '', 1100);
      const vx = (Math.random() * 2 - 1) * 90, vy = -60 - Math.random() * 90;
      d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${vx * .6}px,${vy}px) rotate(${vx}deg)`, opacity: 1, offset: .35 }, { transform: `translate(${vx}px,${vy + 260}px) rotate(${vx * 3}deg)`, opacity: 0 }], { duration: 950 + rnd(200), easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' });
    }
  },
  sparkle(el, color = '#6fffa8', n = 18) {
    if (!el) return; const { r } = this.center(el);
    for (let i = 0; i < n; i++) {
      const d = this.add('fx-spark', `left:${r.x + Math.random() * r.w}px;top:${r.y + r.h * (.4 + Math.random() * .6)}px;color:${color};font-size:${12 + rnd(14)}px`, pick(['✦', '+', '✧', '·']), 1300);
      d.animate([{ transform: 'translateY(0) scale(.4)', opacity: 0 }, { transform: 'translateY(-20px) scale(1.2)', opacity: 1, offset: .2 }, { transform: `translateY(${-70 - rnd(60)}px) scale(.6)`, opacity: 0 }], { duration: 900 + rnd(400), delay: rnd(250), easing: 'ease-out', fill: 'both' });
    }
  },
  bubble(el, color = '#9cc2ff') {
    if (!el) return; const { x, y, r } = this.center(el), s = Math.max(r.w, r.h) * 1.15;
    const d = this.add('fx-bubble', `left:${x}px;top:${y}px;width:${s}px;height:${s}px;margin:${-s / 2}px;--c:${color}`, '', 1000);
    d.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: .3 }, { transform: 'scale(1)', opacity: 1, offset: .7 }, { transform: 'scale(1.2)', opacity: 0 }], { duration: 950, easing: 'ease-out', fill: 'forwards' });
  },
  confetti(n = 160) {
    const cols = ['#ff5a3c', '#2a6bbd', '#e6a33c', '#7d4cc4', '#2fa36b', '#ffe08a', '#fff'];
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 1440, w = 6 + rnd(9), d = this.add('fx-conf', `left:${x}px;top:-30px;width:${w}px;height:${w * (.5 + Math.random())}px;background:${pick(cols)}`, '', 4200);
      const dx = (Math.random() * 2 - 1) * 220, rot = rnd(1080) - 540;
      d.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${dx * .5}px,420px) rotate(${rot / 2}deg)`, offset: .5 }, { transform: `translate(${dx}px,880px) rotate(${rot}deg)` }], { duration: 2400 + rnd(1600), delay: rnd(900), easing: 'cubic-bezier(.25,.4,.6,1)', fill: 'both' });
    }
  },
  crack() {
    const lines = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * Math.PI * 2 + Math.random() * .4; let x = 720, y = 380, p = `M${x} ${y}`; for (let k = 0; k < 6; k++) { x += Math.cos(a + (Math.random() - .5)) * (60 + rnd(60)); y += Math.sin(a + (Math.random() - .5)) * (50 + rnd(50)); p += ` L${x | 0} ${y | 0}`; } return p; }).join(' ');
    const d = this.add('fx-crack', '', `<svg viewBox="0 0 1440 810"><path d="${lines}"/></svg>`, 6000);
    $('#screens').classList.add('desat'); setTimeout(() => $('#screens').classList.remove('desat'), 6000);
    return d;
  },
  textAt(x, y, html, cls = '') { this.add('pop ' + cls, `left:${x}px;top:${y}px`, html, 1500); },
};

/* 숫자 카운트업 + 틱 소리 + 크기 펄스 */
function countScore(el, to, ms = 900) {
  if (!el) return Promise.resolve();
  const t0 = performance.now(); let last = -1;
  return new Promise(res => {
    let fin = false;
    const finish = () => { if (fin) return; fin = true; el.textContent = to; el.style.scale = ''; el.animate([{ scale: 1.6 }, { scale: 1 }], { duration: 300, easing: 'cubic-bezier(.2,1.8,.4,1)' }); res(); };
    const step = t => {
      if (fin) return;
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3), v = Math.round(to * e);
      if (v !== last) { el.textContent = v; if (v % 2 === 0 || k === 1) { Sfx.play('tick', k); el.style.scale = 1 + .25 * (1 - k) + ''; } last = v; }
      if (k < 1) requestAnimationFrame(step); else finish();
    };
    requestAnimationFrame(step);
    setTimeout(finish, ms + 300); // 탭이 백그라운드라 프레임이 멈춰도 진행
  });
}

/* 카드 3D 기울기 (발라트로 풍) — rotate 속성을 써서 기존 transform과 겹치지 않음 */
function bindTilt3D(root, sel, max = 16) {
  root.addEventListener('mousemove', e => {
    const c = e.target.closest(sel); if (!c || !root.contains(c)) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    const mag = Math.min(1, Math.hypot(x, y) * 2) * max;
    c.style.rotate = `${-y} ${x} 0 ${mag}deg`;
    c.style.setProperty('--mx', (x + .5) * 100 + '%'); c.style.setProperty('--my', (y + .5) * 100 + '%');
    c.classList.add('tilting');
  });
  root.addEventListener('mouseout', e => {
    const c = e.target.closest(sel); if (!c || c.contains(e.relatedTarget)) return;
    c.style.rotate = ''; c.classList.remove('tilting');
  });
}

/* 손패 점수 등급별 색 / 영문 이름 */
const HAND_FX = {
  high: ['HIGH CARD', '#9fcbb8', 0], pair: ['ONE PAIR', '#9fcbb8', 0], two: ['TWO PAIR', '#2a6bbd', 1], trips: ['THREE OF A KIND', '#2fa36b', 1],
  straight: ['STRAIGHT', '#e6a33c', 2], flush: ['FLUSH', '#e6a33c', 2], full: ['FULL HOUSE', '#7d4cc4', 2], quads: ['FOUR OF A KIND', '#ff5a3c', 3],
  sf: ['STRAIGHT FLUSH', '#ff5a3c', 3], royal: ['ROYAL FLUSH', 'rainbow', 4],
};

/* ---------- 배경 : 떠다니는 문양 ---------- */
const BG = {
  init() {
    const cv = document.createElement('canvas'); cv.id = 'bgfx'; cv.width = 1440; cv.height = 810;
    $('#stage').insertBefore(cv, $('#screens')); this.cv = cv; this.ctx = cv.getContext('2d');
    this.items = Array.from({ length: 26 }, () => this.spawn(true));
    this.heat = 0;
    const loop = () => { if (!document.hidden) this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },
  spawn(any) { return { x: Math.random() * 1440, y: any ? Math.random() * 810 : 840, s: pick(SUITS), size: 18 + rnd(46), v: .15 + Math.random() * .45, r: Math.random() * 6, vr: (Math.random() - .5) * .01, a: .04 + Math.random() * .08, sway: Math.random() * 6 }; },
  draw() {
    const c = this.ctx, t = performance.now() / 1000; c.clearRect(0, 0, 1440, 810);
    const sp = 1 + this.heat * 3;
    this.items.forEach((p, i) => {
      p.y -= p.v * sp; p.r += p.vr * sp; if (p.y < -60) this.items[i] = this.spawn(false);
      c.save(); c.translate(p.x + Math.sin(t + p.sway) * 14, p.y); c.rotate(p.r);
      c.globalAlpha = p.a * (1 + this.heat); c.fillStyle = isRed(p.s) ? '#ff8a6c' : '#d8f5e8';
      c.font = `900 ${p.size}px "Noto Sans KR",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.s, 0, 0); c.restore();
    });
    this.heat = Math.max(0, this.heat - .01);
  },
  pulse(v = 1) { this.heat = Math.min(1.5, this.heat + v); },
};
