'use strict';
/* =========================================================
   AUDIO – 효과음 + 배경음악 (파일 없이 WebAudio로 실시간 합성)
   · 마스터 → 컴프레서(펀치·클리핑 방지) → 스피커
   · 효과음 버스 / 음악 버스 / 리버브(공간감) 분리
   ========================================================= */
const AOPT = Object.assign({ sfx: .8, music: .55, mute: false }, store.get('audio', {}));
const saveAOPT = () => store.set('audio', AOPT);
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

const AU = {
  ctx: null,
  init() {
    if (!this.ctx) {
      try {
        const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.comp = c.createDynamicsCompressor();
        Object.assign(this.comp, {}); this.comp.threshold.value = -16; this.comp.knee.value = 8; this.comp.ratio.value = 5; this.comp.attack.value = .002; this.comp.release.value = .22;
        this.master = c.createGain(); this.master.connect(this.comp); this.comp.connect(c.destination);
        this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
        this.musicBus = c.createGain(); this.musicBus.connect(this.master);
        // 리버브 (노이즈로 만든 임펄스 응답)
        const len = c.sampleRate * 1.8, ir = c.createBuffer(2, len, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
        this.rev = c.createConvolver(); this.rev.buffer = ir; this.revGain = c.createGain(); this.revGain.gain.value = .32;
        this.rev.connect(this.revGain); this.revGain.connect(this.master);
        // 디스토션 (타격음 크런치)
        this.shaper = c.createWaveShaper(); const k = 60, n = 1024, curve = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; curve[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x)); }
        this.shaper.curve = curve; this.shaper.connect(this.sfxBus);
        this.apply();
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    Music.boot();
  },
  apply() {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(AOPT.mute ? 0 : 1, t, .05);
    this.sfxBus.gain.setTargetAtTime(AOPT.sfx * 1.1, t, .05);
    this.musicBus.gain.setTargetAtTime(AOPT.music * .5, t, .15);
  },
  ready() { return this.ctx && !AOPT.mute; },
};

/* ---------- 효과음 ---------- */
const Sfx = {
  lastHover: 0,
  init() { AU.init(); },
  env(g, t, vol, a, dur) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); },
  out(o = {}) { const c = AU.ctx, g = c.createGain(); g.connect(o.dist ? AU.shaper : AU.sfxBus); if (o.rev) { const s = c.createGain(); s.gain.value = o.rev; g.connect(s); s.connect(AU.rev); } return g; },
  tone(f, dur, type = 'square', vol = .3, slide = 0, delay = 0, o = {}) {
    const c = AU.ctx, t = c.currentTime + delay, osc = c.createOscillator(), g = this.out(o);
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    if (o.det) osc.detune.value = o.det;
    this.env(g, t, vol, o.a || .006, dur); osc.connect(g); osc.start(t); osc.stop(t + dur + .05);
  },
  noise(dur, vol = .3, freq = 2000, delay = 0, endFreq, o = {}) {
    const c = AU.ctx, t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = this.out(o);
    s.buffer = b; f.type = o.type || 'lowpass'; f.Q.value = o.q || .7; f.frequency.setValueAtTime(freq, t); if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    this.env(g, t, vol, o.a || .004, dur); s.connect(f); f.connect(g); s.start(t); s.stop(t + dur + .05);
  },
  chord(notes, dur, type = 'square', vol = .12, delay = 0, o = {}) { notes.forEach(n => this.tone(midi(n), dur, type, vol, 0, delay, o)); },
  boom(vol = 1, delay = 0) { // 묵직한 저음 충격
    this.tone(95, .9, 'sine', .9 * vol, .28, delay, { a: .002 });
    this.tone(60, .7, 'triangle', .5 * vol, .4, delay, { a: .002, dist: true });
    this.noise(.5, .55 * vol, 1800, delay, 60, { dist: true, rev: .4 });
  },
  play(n, p = 1) {
    if (!AU.ready()) return;
    const T = (...a) => this.tone(...a), N = (...a) => this.noise(...a);
    switch (n) {
      case 'hover': { const now = performance.now(); if (now - this.lastHover < 55) return; this.lastHover = now; T(1600, .035, 'triangle', .08); break; }
      case 'click': T(560, .07, 'square', .22, 1.7); N(.05, .18, 6000); T(1120, .05, 'triangle', .1, 1, .02); break;
      case 'tab': N(.2, .2, 900, 0, 5000, { rev: .2 }); T(330, .12, 'triangle', .14, 2); break;
      case 'power': N(.3, .25, 300, 0, 7000); T(70, .35, 'sawtooth', .16, 7, 0, { rev: .3 }); break;
      case 'open': T(523, .09, 'square', .18, 1.5); T(784, .12, 'square', .16, 1.5, .06, { rev: .3 }); break;
      case 'pop': T(900, .08, 'triangle', .24, 1.5); break;
      case 'error': T(160, .16, 'square', .3, .7); T(150, .2, 'square', .24, .7, .09); break;
      case 'deal': N(.07, .26, 7000, 0, 1500); T(1900 + rnd(500), .03, 'triangle', .1); break;
      case 'flip': N(.09, .3, 4000, 0, 700); T(760 + rnd(300), .06, 'square', .12, 1.6); break;
      case 'select': T(660, .08, 'square', .22, 1.5); T(990, .1, 'triangle', .18, 1, .04, { rev: .2 }); break;
      case 'deselect': T(720, .09, 'square', .18, .6); break;
      case 'mark': T(1250, .06, 'square', .15, .8); break;
      case 'reroll': for (let i = 0; i < 6; i++) T(420 + i * 150, .06, 'square', .14, 1.2, i * .035); N(.3, .2, 3000, 0, 500); break;
      case 'confirm': this.chord([72, 76, 79], .18, 'square', .1, 0, { rev: .3 }); T(1047, .2, 'square', .14, 1, .08); break;
      case 'activate': T(200, .45, 'sawtooth', .26, 5, 0, { rev: .3 }); [72, 76, 79, 84, 88].forEach((m, i) => T(midi(m), .14, 'square', .14, 1, .05 + i * .045, { rev: .25 })); N(.4, .22, 9000, 0, 400); this.boom(.35, .02); break;
      case 'passive': T(1318, .3, 'triangle', .2, 1, 0, { rev: .5 }); T(1975, .35, 'sine', .12, 1, .03, { rev: .5 }); break;
      case 'tick': T(900 + p * 900, .03, 'square', .1); break;
      case 'clash': this.boom(.7); N(.45, .5, 6000, 0, 300, { dist: true, rev: .5 }); T(1700, .2, 'square', .16, .4); T(2600, .3, 'triangle', .1, .6, .02, { rev: .6 }); break;
      case 'hit': this.boom(.6); N(.18, .5, 3500, 0, 200, { dist: true }); T(220, .2, 'square', .2, .4); break;
      case 'bighit': this.boom(1.2); this.boom(.6, .09); N(.8, .6, 7000, 0, 90, { dist: true, rev: .7 }); N(.5, .3, 9000, .03, 3000, { type: 'highpass', rev: .6 }); T(110, .9, 'sawtooth', .35, .3, 0, { dist: true }); T(1400, .25, 'square', .14, .3, .02); break;
      case 'devastating': this.play('bighit'); this.boom(1.3, .22); [40, 41, 39].forEach((m, i) => T(midi(m), 1.2, 'sawtooth', .22, 1, .15 + i * .02, { dist: true, rev: .8 })); N(1.4, .35, 400, .2, 40, { rev: .9 }); break;
      case 'shieldBreak': N(.5, .45, 9000, 0, 2000, { type: 'highpass', rev: .6 }); [2093, 2637, 3136].forEach((f, i) => T(f, .25, 'triangle', .14, .7, i * .03, { rev: .5 })); this.boom(.4); break;
      case 'crit': T(300, .5, 'sawtooth', .3, 6, 0, { rev: .4 }); N(.5, .35, 10000, 0, 800, { rev: .5 }); this.chord([84, 88, 91], .4, 'square', .1, .15, { rev: .6 }); this.boom(.6, .1); break;
      case 'heal': [72, 76, 79, 84, 88].forEach((m, i) => T(midi(m), .25, 'triangle', .2, 1, i * .055, { rev: .6 })); T(midi(96), .5, 'sine', .1, 1, .3, { rev: .8 }); break;
      case 'shield': T(330, .5, 'sine', .35, 2.2, 0, { rev: .4 }); T(660, .4, 'triangle', .16, 1.5, .08, { rev: .5 }); N(.25, .15, 2500); break;
      case 'round': this.chord([67, 71, 74], .14, 'square', .1); this.chord([72, 76, 79], .3, 'square', .12, .13, { rev: .5 }); N(.5, .2, 1500, 0, 8000); this.boom(.4, .13); break;
      case 'banner': N(.4, .3, 600, 0, 9000, { rev: .4 }); T(180, .35, 'sawtooth', .16, 3.5); N(.6, .15, 8000, .25, 3000, { type: 'highpass', rev: .6 }); break;
      case 'match': [76, 79, 84, 88].forEach((m, i) => T(midi(m), .16, 'square', .18, 1, i * .09, { rev: .4 })); this.boom(.4, .3); break;
      case 'danger': for (let i = 0; i < 3; i++) { T(880, .14, 'square', .24, 1, i * .3); T(587, .14, 'square', .24, 1, i * .3 + .15); } break;
      case 'win': Music.duck(3.5); [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79, 84]].forEach((ch, i) => this.chord(ch, i === 3 ? 1.4 : .26, 'square', .12, i * .22, { rev: .6 })); [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => T(midi(m), .12, 'triangle', .14, 1, .66 + i * .06, { rev: .6 })); this.boom(.6, .66); break;
      case 'lose': Music.duck(4); [[64, 67, 71], [62, 65, 69], [60, 63, 67], [55, 58, 62]].forEach((ch, i) => this.chord(ch, i === 3 ? 1.6 : .4, 'sawtooth', .07, i * .38, { rev: .8 })); this.boom(1, 1.14); N(1.5, .25, 300, 1.14, 40, { rev: .9 }); break;
      case 'coin': T(988, .07, 'square', .18); T(1319, .25, 'square', .18, 1, .07, { rev: .4 }); break;
      case 'whoosh': N(.35, .26, 500, 0, 6000, { rev: .2 }); break;
      // ---- 등급 연출 ----
      case 'charge': N(.6 * p, .25, 300, 0, 9000, { rev: .3 }); T(150, .6 * p, 'sawtooth', .16, 8, 0, { rev: .3 }); for (let i = 0; i < 8; i++) T(600 + i * 120, .05, 'square', .07, 1, i * .07 * p); break;
      case 'epicReveal': this.boom(.6); this.chord([69, 72, 76, 79, 83], .9, 'triangle', .1, 0, { rev: .8 }); [81, 84, 88].forEach((m, i) => T(midi(m), .3, 'square', .1, 1, .08 + i * .07, { rev: .6 })); break;
      case 'legendReveal': this.boom(1); N(.8, .35, 9000, 0, 1500, { type: 'highpass', rev: .8 }); [[60, 64, 67, 72], [62, 67, 71, 74]].forEach((ch, k) => ch.forEach(m => { T(midi(m), 1.4, 'sawtooth', .05, 1, k * .12, { rev: .9, det: -8 }); T(midi(m), 1.4, 'sawtooth', .05, 1, k * .12, { rev: .9, det: 8 }); })); [84, 88, 91, 96, 100].forEach((m, i) => T(midi(m), .35, 'triangle', .14, 1, .15 + i * .06, { rev: .8 })); break;
      case 'epicGet': [[67, 71, 74], [69, 72, 76], [71, 74, 78, 83]].forEach((ch, i) => this.chord(ch, i === 2 ? .9 : .18, 'square', .1, i * .16, { rev: .6 })); this.boom(.6, .32); N(.8, .2, 9000, .32, 2000, { type: 'highpass', rev: .7 }); break;
      case 'legendGet': [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79, 84]].forEach((ch, i) => { this.chord(ch, i === 3 ? 1.8 : .2, 'sawtooth', .07, i * .18, { rev: .8 }); this.chord(ch.map(n => n + 12), i === 3 ? 1.8 : .2, 'square', .05, i * .18, { rev: .8 }); }); this.boom(1.1, .54); N(1.6, .3, 10000, .54, 2500, { type: 'highpass', rev: .9 }); [84, 88, 91, 96, 100, 103].forEach((m, i) => T(midi(m), .2, 'triangle', .14, 1, .6 + i * .07, { rev: .8 })); break;
      case 'epicCut': N(.35, .3, 400, 0, 8000); this.chord([64, 67, 71, 74], .5, 'sawtooth', .07, .18, { rev: .7 }); this.boom(.8, .18); T(1760, .4, 'square', .08, .5, .2, { rev: .6 }); break;
      case 'legendCut': N(.5, .3, 200, 0, 9000, { rev: .4 }); T(110, .5, 'sawtooth', .2, 8, 0, { rev: .4 }); this.boom(1.3, .26); [[57, 64, 69, 72, 76]].forEach(ch => ch.forEach(m => { T(midi(m), 1.5, 'sawtooth', .06, 1, .26, { rev: .9, det: -10 }); T(midi(m), 1.5, 'sawtooth', .06, 1, .26, { rev: .9, det: 10 }); })); N(1.4, .3, 10000, .26, 2000, { type: 'highpass', rev: .9 }); [88, 93, 96, 100].forEach((m, i) => T(midi(m), .3, 'triangle', .12, 1, .4 + i * .08, { rev: .8 })); break;
    }
  },
};

/* ---------- 배경음악 (스텝 시퀀서) ---------- */
const TRACKS = {
  // 로비 : A 단조 라운지 재즈 · 스윙
  lobby: { bpm: 92, swing: .17, bars: [[45, [57, 60, 64, 67]], [50, [57, 60, 62, 65]], [43, [55, 59, 62, 65]], [48, [55, 59, 64, 67]], [45, [57, 60, 64, 67]], [41, [57, 60, 64, 69]], [40, [56, 59, 62, 64]], [40, [56, 59, 62, 68]]],
    kick: [0, 10], snare: [4, 12], hat: 2, hatVol: .05, snareVol: .05, kickVol: .35, bass: 'walk', pad: 'ep', melody: .32, lead: 'vibe' },
  // 전투 : E 단조 · 몰아치는 8비트
  battle: { bpm: 138, swing: 0, bars: [[40, [64, 67, 71]], [36, [60, 64, 67]], [38, [62, 66, 69]], [35, [63, 66, 71]]],
    kick: [0, 4, 8, 12], snare: [4, 12], hat: 1, hatVol: .035, snareVol: .16, kickVol: .6, bass: 'drive', pad: 'stab', arp: true, melody: 0 },
  // 결과(승리) : C 장조 · 밝게
  win: { bpm: 112, swing: .1, bars: [[48, [60, 64, 67, 72]], [45, [60, 64, 69, 72]], [41, [60, 65, 69, 72]], [43, [62, 67, 71, 74]]],
    kick: [0, 8], snare: [4, 12], hat: 2, hatVol: .05, snareVol: .1, kickVol: .4, bass: 'pulse', pad: 'ep', arp: true, melody: .3, lead: 'vibe' },
  // 결과(패배) : C 단조 · 느리게
  lose: { bpm: 72, swing: 0, bars: [[36, [60, 63, 67]], [44, [60, 63, 68]], [41, [60, 65, 68]], [43, [62, 67, 71]]],
    kick: [0], snare: [], hat: 0, kickVol: .3, bass: 'long', pad: 'ep', melody: .2, lead: 'vibe' },
};
const Music = {
  cur: null, want: 'lobby', out: null, timer: null, next: 0, step: 0, intense: 0, duckUntil: 0,
  boot() { if (!AU.ctx || this.timer) return; this.switchTo(this.want, true); this.timer = setInterval(() => this.tick(), 25); },
  play(name) { this.want = name; if (AU.ctx && this.timer) this.switchTo(name); },
  setIntense(v) { this.intense = v ? 1 : 0; },
  duck(sec) { if (!AU.ctx) return; const t = AU.ctx.currentTime, g = AU.musicBus.gain; this.duckUntil = t + sec; g.cancelScheduledValues(t); g.setTargetAtTime(AOPT.music * .5 * .15, t, .05); g.setTargetAtTime(AOPT.music * .5, t + sec, .6); },
  switchTo(name, first) {
    if (this.cur === name && this.out) return;
    const c = AU.ctx, t = c.currentTime;
    if (this.out) { const old = this.out; old.gain.setTargetAtTime(0, t, .35); setTimeout(() => old.disconnect(), 2500); }
    this.out = c.createGain(); this.out.gain.setValueAtTime(0, t); this.out.gain.setTargetAtTime(1, t + .05, first ? .5 : .4); this.out.connect(AU.musicBus);
    const send = c.createGain(); send.gain.value = .35; this.out.connect(send); send.connect(AU.rev);
    this.cur = name; this.step = 0; this.next = t + .08;
  },
  tick() {
    const c = AU.ctx; if (!c || !this.out) return;
    const T = TRACKS[this.cur]; if (!T) return;
    const bpm = T.bpm * (this.cur === 'battle' && this.intense ? 1.12 : 1);
    while (this.next < c.currentTime + .15) {
      this.note(T, this.step, this.next);
      const spb = 60 / bpm / 4, sw = T.swing ? (this.step % 2 ? 1 - T.swing : 1 + T.swing) : 1;
      this.next += spb * sw; this.step = (this.step + 1) % (T.bars.length * 16);
    }
  },
  // 악기들
  o(type, f, t, dur, vol, o = {}) {
    const c = AU.ctx, osc = c.createOscillator(), g = c.createGain(); osc.type = type; osc.frequency.setValueAtTime(f, t); if (o.det) osc.detune.value = o.det;
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(f * o.slide, t + dur);
    let node = osc;
    if (o.lp) { const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.setValueAtTime(o.lp, t); if (o.lpEnd) f2.frequency.exponentialRampToValueAtTime(o.lpEnd, t + dur); f2.Q.value = o.q || 1; osc.connect(f2); node = f2; }
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.a || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    node.connect(g); g.connect(this.out); osc.start(t); osc.stop(t + dur + .05);
  },
  nz(t, dur, vol, freq, type = 'highpass') {
    const c = AU.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.out); s.start(t); s.stop(t + dur + .02);
  },
  note(T, step, t) {
    const bar = Math.floor(step / 16), s = step % 16, [root, ch] = T.bars[bar % T.bars.length], nextRoot = T.bars[(bar + 1) % T.bars.length][0];
    const hot = this.cur === 'battle' && this.intense;
    // 드럼
    if (T.kick.includes(s) || (hot && (s === 14 || s === 6))) this.o('sine', 150, t, .32, T.kickVol, { slide: .3 });
    if (T.snare.includes(s)) { this.nz(t, .16, T.snareVol, 1800); this.o('triangle', 190, t, .08, T.snareVol * .8, { slide: .6 }); }
    if (T.hat && s % T.hat === 0) this.nz(t, s % 4 === 2 && this.cur === 'battle' ? .12 : .035, T.hatVol * (s % 4 === 0 ? 1.4 : 1) * (hot ? 1.5 : 1), 8000);
    // 하트비트 (내 HP가 위험할 때)
    if (hot && (s === 0 || s === 3)) this.o('sine', 55, t, .25, .5, { slide: .7 });
    // 베이스
    const B = n => midi(n);
    if (T.bass === 'walk' && s % 4 === 0) { const seq = [root, root + 7, root + 12, nextRoot + (nextRoot > root ? -1 : 1)]; this.o('triangle', B(seq[s / 4] - 12 + 12), t, .34, .32, { lp: 900 }); }
    if (T.bass === 'drive' && s % 2 === 0) this.o('sawtooth', B(root + (s % 8 === 6 ? 12 : 0)), t, .16, .2, { lp: hot ? 1600 : 900, lpEnd: 200, q: 6 });
    if (T.bass === 'pulse' && s % 4 === 0) this.o('square', B(root), t, .25, .12, { lp: 700 });
    if (T.bass === 'long' && s === 0) this.o('triangle', B(root), t, 2.4, .3, { lp: 500, a: .2 });
    // 코드
    if (T.pad === 'ep' && (s === 0 || (s === 10 && this.cur === 'lobby'))) ch.forEach((n, i) => { this.o('triangle', B(n), t + i * .012, s === 0 ? 1.6 : .4, .07); this.o('sine', B(n + 12), t + i * .012, s === 0 ? 1 : .3, .025); });
    if (T.pad === 'stab' && (s === 0 || s === 3 || s === 6 || s === 10)) ch.forEach(n => this.o('square', B(n), t, .12, .045, { lp: hot ? 4000 : 2400, lpEnd: 500 }));
    // 아르페지오
    if (T.arp) { const ar = [...ch, ch[0] + 12, ch[1] + 12]; const n = ar[s % ar.length] + (hot ? 12 : 0); this.o('square', B(n + 12), t, .09, this.cur === 'battle' ? .035 : .03, { lp: 3500 }); }
    // 멜로디 (확률적으로 코드톤)
    if (T.melody && [2, 6, 7, 11, 14].includes(s) && Math.random() < T.melody) { const n = pick(ch) + 12; this.o('sine', B(n), t, .5, .07, { a: .01 }); this.o('triangle', B(n + 12), t, .25, .02); }
  },
};
