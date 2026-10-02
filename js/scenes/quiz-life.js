// 게임1 · 아빠 인생 퀴즈 — 출제 → 정답 공개(코인) → 썰 타임
(function (root) {
  'use strict';
  const h = root.UI.h, MARKS = ['①', '②', '③', '④'];

  root.Scenes.quizLife = {
    create(stage, arg, opts) {
      const Q = root.LIFE_QUIZ || [];
      const steps = [{ type: 'intro' }];
      Q.forEach((q, n) => {
        steps.push({ type: 'ask', n }, { type: 'reveal', n });
        if (q.story || q.storyPhoto) steps.push({ type: 'story', n });
      });

      const choices = (q, reveal) => h('div', { class: 'choices' }, q.choices.map((c, k) => {
        let cls = 'choice';
        if (reveal && q.answer === k) cls += ' correct';
        else if (reveal && q.answer != null) cls += ' dim';
        return h('div', { class: cls }, [h('b', {}, MARKS[k]), ' ' + c]);
      }));

      const render = i => {
        stage.innerHTML = '';
        const s = steps[i];
        if (s.type === 'intro') {
          stage.appendChild(h('div', { class: 'game-intro' }, [
            h('div', { class: 'game-no' }, 'GAME 1'),
            h('h1', {}, '📸 아빠 인생 퀴즈'),
            h('ul', { class: 'rules' }, [
              h('li', {}, '정답을 알면 손 들고 먼저 외치기!'),
              h('li', {}, '맞히면 팀 전원 🪙+1 · ⭐ 아이가 외치면 🪙+2'),
              h('li', {}, '할아버지·할머니는 외치기 금지 — 손주에게 귓속말 힌트만!')
            ])
          ]));
          return;
        }
        const q = Q[s.n];
        if (s.type === 'story') {
          stage.appendChild(h('div', { class: 'story' }, [
            h('div', { class: 'story-badge' }, '🎙 ' + (q.storyBy || '할아버지') + ' 썰 타임'),
            q.storyPhoto ? h('img', { class: 'story-photo', src: q.storyPhoto, alt: '' }) : null,
            q.story ? h('p', { class: 'story-text' }, q.story) : null
          ]));
          return;
        }
        const reveal = s.type === 'reveal';
        stage.appendChild(h('div', { class: 'quiz' }, [
          h('div', { class: 'q-head' }, 'Q' + (s.n + 1) + ' / ' + Q.length),
          h('h1', { class: 'q-text' }, q.q),
          h('div', { class: 'q-body' }, [
            q.photo ? h('img', { class: 'q-photo', src: q.photo, alt: '' }) : null,
            choices(q, reveal)
          ]),
          reveal && q.answer == null ? h('div', { class: 'judge' }, '⚖ ' + (q.judge || '할머니') + ' 판정!') : null,
          reveal ? root.UI.awardBar('life-' + s.n, () => 1) : h('p', { class: 'hint' }, '→ 정답 공개')
        ]));
      };
      return root.UI.stepper(steps.length, opts.fromEnd, render);
    }
  };
})(this);
