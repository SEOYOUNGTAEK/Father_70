// 상황별 배경음 — Kevin MacLeod (incompetech.com) 음원, CC BY 4.0 (출처는 케이크 화면·README)
// 장면이 바뀌면 크로스페이드, 레이스 슬로모션은 곡을 줄이고 심장 소리, 동전·딩동 효과음은 합성
// Music.setMood('memory' | 'game' | 'seven' | 'race' | 'tense' | 'ceremony' | 'cake' | null), Music.sfx('coins' | 'ding')
(function (root) {
  'use strict';
  const KEY = 'chilsun-music-on';
  const V = '?v=1';
  const TRACKS = { memory: 'memory', game: 'game', seven: 'seven', race: 'race', tense: 'race', ceremony: 'ceremony', cake: 'cake' };
  const LEVEL = { tense: .22 };          // 슬로모션 때는 곡을 줄임
  const MASTER = .55;
  let ctx = null, master = null, mood = null, beat = 0;
  const nodes = {};                        // 곡 이름 → { a: Audio, g: GainNode }
  const audios = {};                       // 미리 받아 두는 Audio 요소
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* 기본 켜짐 */ }

  function audioOf(name) {
    if (!audios[name]) {
      const a = new Audio('assets/music/' + name + '.mp3' + V);
      a.loop = true;
      a.preload = 'auto';
      audios[name] = a;
    }
    return audios[name];
  }

  function ensure() {
    if (ctx) return true;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = on ? MASTER : 0;
    master.connect(ctx.destination);
    return true;
  }

  function node(name) {
    if (!nodes[name]) {
      const a = audioOf(name), g = ctx.createGain();
      g.gain.value = 0;
      ctx.createMediaElementSource(a).connect(g);
      g.connect(master);
      nodes[name] = { a, g };
    }
    return nodes[name];
  }

  function thump() {
    if (!ctx || !on) return;
    [0, .22].forEach((d, k) => {
      const t = ctx.currentTime + d, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + .18);
      g.gain.setValueAtTime(k ? .5 : .85, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + .3);
    });
  }

  // 지금 mood 에 맞게 곡 전환
  function apply() {
    if (!ctx) return;
    const target = mood ? TRACKS[mood] : null;
    const now = ctx.currentTime;
    Object.keys(nodes).forEach(name => {
      if (name === target) return;
      const n = nodes[name];
      n.g.gain.cancelScheduledValues(now);
      n.g.gain.setTargetAtTime(0, now, .35);
      setTimeout(() => { if ((mood ? TRACKS[mood] : null) !== name) n.a.pause(); }, 1600);
    });
    if (target) {
      const n = node(target);
      n.a.play().catch(() => { /* 첫 터치 전이면 막힘 — unlock 때 다시 */ });
      n.g.gain.cancelScheduledValues(now);
      n.g.gain.setTargetAtTime(LEVEL[mood] || 1, now, .45);
    }
    clearInterval(beat);
    beat = mood === 'tense' ? setInterval(thump, 900) : 0;
    if (mood === 'tense') thump();
  }

  function setMood(next) {
    if (next === mood) return;
    mood = next;
    if (mood && TRACKS[mood]) audioOf(TRACKS[mood]);   // 첫 터치 전이라도 미리 받기 시작
    apply();
  }

  function tone(freq, t, dur, type, peak) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
  }
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  function sfx(name) {
    if (!ensure() || !on) return;
    const t = ctx.currentTime + .02;
    if (name === 'coins') for (let k = 0; k < 14; k++) tone(NOTE(84 + (k * 5) % 12), t + k * .07, .25, 'square', .07);
    if (name === 'ding') { tone(NOTE(84), t, .5, 'sine', .4); tone(NOTE(91), t + .12, .8, 'sine', .4); }
  }

  function toggle() {
    on = !on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* 무시 */ }
    if (ensure()) {
      ctx.resume();
      master.gain.setTargetAtTime(on ? MASTER : 0, ctx.currentTime, .1);
      if (on) apply();
    }
    return on;
  }

  // 폰은 첫 터치가 있어야 소리를 낼 수 있음 — 첫 터치 때 시작
  function unlock() {
    if (!ensure()) return;
    ctx.resume();
    if (mood) apply();
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));
  ['game', 'memory'].forEach(audioOf);     // 처음 쓰는 곡은 미리 받아 두기

  root.Music = { setMood, sfx, toggle, isOn: () => on, current: () => mood,
    running: () => !!(ctx && mood && nodes[TRACKS[mood]] && !nodes[TRACKS[mood]].a.paused) };
})(this);
