// 게임2 · 확대 사진 퀴즈 — 5단계 줌아웃, 일찍 맞힐수록 코인 많이
(function (root) {
  'use strict';
  const h = root.UI.h, SCALES = [8, 6, 4.5, 3.2, 2.3, 1.6, 1.25];

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
              h('li', {}, '1~3단계 🪙3 · 4~5단계 🪙2 · 6~7단계 🪙1 · ⭐ 아이는 2배')
            ])
          ]));
          stage.appendChild(root.UI.actionBtn('첫 문제 ▶'));
          return;
        }
        const q = Q[s.n], reveal = s.type === 'reveal';
        // 문제에 zoom 이 있으면 그 배율에서 시작해 1.25배까지 줄인다 — 앞쪽 단계는 천천히 줄어서 4번쯤 줄여야 누군지 보이게
        const last = SCALES.length - 1;
        // minZoom: 마지막 단계·정답 공개 때도 이만큼은 확대 — 한 사진에 두 문제 주인공이 같이 있을 때 다른 사람을 가림
        const floor = q.minZoom || 1.25;
        const scales = q.zoom ? SCALES.map((_, k) => Math.max(floor, Math.pow(q.zoom, Math.pow((last - k) / last, 0.7)))) : SCALES;
        const scale = reveal ? (q.minZoom || 1) : scales[s.stage - 1];
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
          ]),
          root.UI.actionBtn(reveal ? '다음 ▶' : s.stage < SCALES.length ? '🔍 더 보기' : '정답 공개 ▶')
        ]));
        requestAnimationFrame(() => requestAnimationFrame(() => { img.style.transform = 'scale(' + scale + ')'; }));
        lastScale = scale; lastN = s.n;
      };
      return root.UI.stepper(steps.length, opts.fromEnd, render);
    }
  };
})(this);
