// 진행 순서(FLOW)와 키보드 조작
(function (root) {
  'use strict';
  const FLOW = [
    { scene: 'opening', label: '오프닝' },
    { scene: 'memories', arg: 0, label: '추억극장 ①' },
    { scene: 'quizLife', label: '게임1 · 아빠 인생 퀴즈' },
    { scene: 'memories', arg: 1, label: '추억극장 ②' },
    { scene: 'quizZoom', label: '게임2 · 확대 사진 퀴즈' },
    { scene: 'memories', arg: 2, label: '추억극장 ③' },
    { scene: 'seven', label: '게임3 · 7초 맞추기' },
    { scene: 'roulette', label: '마블 룰렛 시상식' },
    { scene: 'ending', label: '엔딩' }
  ];
  let stage, current = null, index = 0;

  const skippable = i => {
    const def = root.Scenes[FLOW[i].scene];
    return def.skip ? def.skip(FLOW[i].arg) : false;
  };

  function go(i, fromEnd) {
    if (i < 0 || i >= FLOW.length) return;
    if (current && current.destroy) current.destroy();
    stage.innerHTML = '';
    index = i;
    root.Store.state.sceneIndex = i;
    root.Store.save();
    stage.className = 'scene-' + FLOW[i].scene;
    current = root.Scenes[FLOW[i].scene].create(stage, FLOW[i].arg, { fromEnd: !!fromEnd });
  }

  function step(dir) {
    if (dir > 0 ? current.next() : current.prev()) return;
    let i = index + dir;
    while (i >= 0 && i < FLOW.length && skippable(i)) i += dir;
    go(i, dir < 0);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  function onKey(e) {
    const setup = root.Scenes.setup;
    if (e.key === 'Escape') { root.UI.toggleScoreboard(false); setup.close(); document.activeElement.blur(); return; }
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || setup.isOpen()) return;
    const k = e.key.toLowerCase();
    if (k === 's' || k === 'ㄴ') { root.UI.toggleScoreboard(); return; }
    if (k === 'g' || k === 'ㅎ') { setup.open(FLOW, go); return; }
    if (k === 'f' || k === 'ㄹ') { toggleFullscreen(); return; }
    if (current.key && current.key(e)) { e.preventDefault(); return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === ' ') e.preventDefault();
  }

  // 화면 위 축하 가랜드 — 살짝 늘어진 줄을 따라 깃발을 단다
  function buildBunting() {
    const colors = ['#c8553d', '#d38f1f', '#5f9a72', '#4a8bc9', '#e58f9e', '#f0b85a'];
    const box = document.createElement('div');
    box.className = 'bunting';
    const n = 22;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), f = document.createElement('span');
      f.style.left = 'calc(' + (t * 100) + '% - 1.3rem)';
      f.style.top = (Math.sin(t * Math.PI) * 1.6 - .2) + 'rem';
      f.style.background = colors[i % colors.length];
      f.style.animationDelay = (-i * .37) + 's';
      box.appendChild(f);
    }
    document.body.insertBefore(box, document.body.firstChild);
  }

  root.App = { go, step, FLOW };
  document.addEventListener('DOMContentLoaded', () => {
    stage = document.getElementById('stage');
    buildBunting();
    root.Store.load();
    document.addEventListener('keydown', onKey);
    go(Math.min(root.Store.state.sceneIndex || 0, FLOW.length - 1));
  });
})(this);
