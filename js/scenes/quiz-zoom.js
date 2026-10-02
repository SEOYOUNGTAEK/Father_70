// 게임2 · 확대 사진 퀴즈 — 5단계 줌아웃, 일찍 맞힐수록 코인 많이
(function (root) {
  'use strict';
  const h = root.UI.h, SCALES = [6, 4, 2.6, 1.7, 1.25];

  root.Scenes.quizZoom = {
    create(stage, arg, opts) {
      const Q = root.ZOOM_QUIZ || [];
      const steps = [{ type: 'intro' }];
      Q.forEach((q, n) => {
        for (let z = 1; z <= SCALES.length; z++) steps.push({ type: 'zoom', n, stage: z });
        steps.push({ type: 'reveal', n });
      });
      let lastScale = SCALES[0], lastN = -1;

      const render = i => {
        stage.innerHTML = '';
        const s = steps[i];
        if (s.type === 'intro') {
          stage.appendChild(h('div', { class: 'game-intro' }, [
            h('div', { class: 'game-no' }, 'GAME 2'),
            h('h1', {}, '🔍 확대 사진 퀴즈'),
            h('ul', { class: 'rules' }, [
              h('li', {}, '아주 크게 확대한 사진이 점점 작아져요'),
              h('li', {}, '오른쪽 질문의 정답을 알면 먼저 외치기!'),
              h('li', {}, '빨리 맞힐수록 🪙3 → 🪙2 → 🪙1 · ⭐ 아이는 2배')
            ])
          ]));
          return;
        }
        const q = Q[s.n], reveal = s.type === 'reveal';
        // 문제에 zoom 이 있으면 그 배율에서 시작해 1.25배까지 고르게 줄인다
        const scales = q.zoom ? SCALES.map((_, k) => Math.max(1.25, Math.pow(q.zoom, (SCALES.length - 1 - k) / (SCALES.length - 1)))) : SCALES;
        const scale = reveal ? 1 : scales[s.stage - 1];
        const points = reveal ? 1 : root.Logic.zoomPoints(s.stage);
        const from = s.n === lastN ? lastScale : scale;
        const img = h('img', { class: 'zoom-img', src: q.photo, alt: '', style: {
          transformOrigin: (q.cx * 100) + '% ' + (q.cy * 100) + '%', transform: 'scale(' + from + ')'
        } });
        // 왼쪽 사진, 오른쪽에 처음부터 질문을 크게
        stage.appendChild(h('div', { class: 'zoom' }, [
          h('div', { class: 'zoom-frame' + (reveal ? ' revealed' : '') }, img),
          h('div', { class: 'zoom-side' }, [
            h('div', { class: 'q-head' }, 'Q' + (s.n + 1) + ' / ' + Q.length),
            h('h1', { class: 'zoom-q' }, q.q || '이건 무엇일까요?'),
            reveal ? h('div', { class: 'zoom-answer' }, '정답! ' + q.answer)
              : h('div', { class: 'zoom-stage' }, [
                h('div', { class: 'zoom-dots' }, SCALES.map((_, k) => h('span', { class: k < s.stage ? 'on' : '' }))),
                '지금 맞히면 🪙' + points
              ]),
            root.UI.awardBar('zoom-' + s.n, () => points)
          ])
        ]));
        requestAnimationFrame(() => requestAnimationFrame(() => { img.style.transform = 'scale(' + scale + ')'; }));
        lastScale = scale; lastN = s.n;
      };
      return root.UI.stepper(steps.length, opts.fromEnd, render);
    }
  };
})(this);
