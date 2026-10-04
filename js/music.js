// 상황별 배경음 — 음원 파일 없이 브라우저(Web Audio)가 직접 연주 (저작권 걱정 없음, 오프라인 OK)
// Music.setMood('memory' | 'game' | 'race' | 'tense' | 'ceremony' | 'cake' | null), Music.sfx('coins' | 'ding')
(function (root) {
  'use strict';
  const KEY = 'chilsun-music-on';
  let ctx = null, master = null, mood = null, timer = 0, nextTime = 0, step = 0;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* 기본 켜짐 */ }

  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI 번호 → Hz
  // 코드 진행 (MIDI 근음 + 3화음)
  const CH = {
    C: [60, 64, 67], Am: [57, 60, 64], F: [53, 57, 60], G: [55, 59, 62], Dm: [50, 53, 57], Bb: [58, 62, 65],
    Em: [52, 55, 59], E: [52, 56, 59]
  };
  const MOODS = {
    memory:   { bpm: 76,  prog: ['C', 'Am', 'F', 'G'],  vol: .9 },
    game:     { bpm: 116, prog: ['C', 'F', 'G', 'C'],   vol: .7 },
    race:     { bpm: 138, prog: ['Am', 'F', 'G', 'E'],  vol: .75 },
    tense:    { bpm: 64,  prog: ['Am', 'Am', 'E', 'E'], vol: 1 },
    ceremony: { bpm: 66,  prog: ['F', 'C', 'Dm', 'Bb'], vol: .9 },
    cake:     { bpm: 70,  prog: ['C', 'F', 'G', 'C'],   vol: .7 }
  };

  function ensure() {
    if (ctx) return true;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = on ? .14 : 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5200;
    master.connect(lp); lp.connect(ctx.destination);
    return true;
  }

  // 악기들
  function tone(freq, t, dur, type, peak, attack) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + (attack || .01));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + .05);
  }
  const bell = (n, t, v) => { tone(NOTE(n), t, 1.6, 'sine', .32 * v); tone(NOTE(n + 12), t, .6, 'sine', .08 * v); };
  const pluck = (n, t, v) => tone(NOTE(n), t, .28, 'triangle', .26 * v);
  const bass = (n, t, v) => tone(NOTE(n - 24), t, .42, 'sine', .5 * v);
  const pad = (notes, t, dur, v) => notes.forEach(n => tone(NOTE(n), t, dur, 'triangle', .06 * v, dur * .35));
  const thump = (t, v) => { // 심장 소리
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + .18);
    g.gain.setValueAtTime(.9 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .3);
  };

  // 8분음표 한 칸씩 연주
  function playStep(m, t, i) {
    const bar = Math.floor(i / 8) % m.prog.length, s = i % 8, c = CH[m.prog[bar]], v = m.vol;
    if (mood === 'memory' || mood === 'cake') {
      const arp = [c[0] + 12, c[1] + 12, c[2] + 12, c[1] + 24, c[2] + 12, c[1] + 12, c[0] + 24, c[2] + 12];
      if (mood === 'cake' ? s % 2 === 0 : true) bell(arp[s], t, v * (mood === 'cake' ? .7 : 1));
      if (s === 0) pad(c, t, 60 / m.bpm * 4, v);
    } else if (mood === 'game') {
      if (s % 2 === 0) bass(c[0], t, v);
      if (s % 2 === 1) pluck(c[(s >> 1) % 3] + 12, t, v);
      if (s === 6) pluck(c[2] + 24, t, v * .6);
    } else if (mood === 'race') {
      bass(c[0], t, v * (s % 2 ? .6 : 1));
      if (s % 2 === 1) pluck(c[s % 3] + 24, t, v * .7);
    } else if (mood === 'tense') {
      if (s === 0 || s === 1) thump(t, s === 0 ? 1 : .6);
      if (s === 0) pad([c[0] + 12, c[2] + 12], t, 60 / m.bpm * 4, v);
    } else if (mood === 'ceremony') {
      if (s === 0) pad(c.map(n => n + 12), t, 60 / m.bpm * 4.2, v * 1.3);
      if (s === 0 || s === 3 || s === 6) bell(c[(s / 3) % 3] + 24, t, v * .7);
    }
  }

  function tick() {
    const m = MOODS[mood];
    if (!m || !ctx) return;
    const stepDur = 60 / m.bpm / 2;
    while (nextTime < ctx.currentTime + .25) {
      playStep(m, nextTime, step++);
      nextTime += stepDur;
    }
  }

  function setMood(next) {
    if (next === mood) return;
    mood = next;
    if (!ctx) return; // 첫 터치 전 — 터치하면 시작
    clearInterval(timer);
    timer = 0;
    if (!mood) return;
    step = 0;
    nextTime = ctx.currentTime + .08;
    timer = setInterval(tick, 60);
    tick();
  }

  function sfx(name) {
    if (!ensure() || !on) return;
    const t = ctx.currentTime + .02;
    if (name === 'coins') for (let k = 0; k < 14; k++) tone(NOTE(84 + (k * 5) % 12), t + k * .07, .25, 'square', .05);
    if (name === 'ding') { tone(NOTE(84), t, .5, 'sine', .3); tone(NOTE(91), t + .12, .8, 'sine', .3); }
  }

  function toggle() {
    on = !on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* 무시 */ }
    if (ensure()) {
      ctx.resume();
      master.gain.setTargetAtTime(on ? .14 : 0, ctx.currentTime, .1);
      if (on && mood && !timer) { const m = mood; mood = null; setMood(m); }
    }
    return on;
  }

  // 폰은 첫 터치가 있어야 소리를 낼 수 있음 — 첫 터치 때 시작
  function unlock() {
    if (!ensure()) return;
    ctx.resume();
    if (mood && !timer) { const m = mood; mood = null; setMood(m); }
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));

  root.Music = { setMood, sfx, toggle, isOn: () => on, current: () => mood, running: () => !!(ctx && timer) };
})(this);
