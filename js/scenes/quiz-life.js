// 게임1 · 할아버지 인생 퀴즈 — 팀별로 보기를 클릭해서 고르고, 정답 공개 때 자동 채점
(function (root) {
  'use strict';
  const h = root.UI.h, MARKS = ['①', '②', '③', '④', '⑤'];

  root.Scenes.quizLife = {
    create(stage, arg, opts) {
      const S = root.Store, st = S.state, Logic = root.Logic;
      const Q = root.LIFE_QUIZ || [];
      const steps = [{ type: 'intro' }];
      Q.forEach((q, n) => {
        steps.push({ type: 'ask', n }, { type: 'reveal', n });
        if (q.story || q.storyPhoto) steps.push({ type: 'story', n });
      });

      const picks = n => (st.lifePicks[n] = st.lifePicks[n] || { A: {}, B: {} });
      const answerOf = n => (Q[n].answer != null ? Q[n].answer : st.lifeJudge[n] != null ? st.lifeJudge[n] : null);

      // 공개된 문제를 (다시) 채점 — 이전 점수와의 차이만 코인에 반영
      function score(n) {
        const ans = answerOf(n), p = picks(n);
        const next = { A: Logic.choicePoints(p.A, ans), B: Logic.choicePoints(p.B, ans) };
        const prev = st.lifeScored[n] || { A: 0, B: 0 };
        if (prev.A === next.A && prev.B === next.B) return;
        st.coins = Logic.rescore(st.players, st.coins, prev, next);
        st.lifeScored[n] = next;
        S.save();
        ['A', 'B'].forEach(t => {
          const d = next[t] - (prev[t] || 0);
          if (d > 0) root.UI.toast('🪙 +' + d + '  ' + root.UI.teamName(t) + ' 정답!', t);
        });
        root.UI.refreshScoreboard();
      }

      function teamPanel(n, t, reveal) {
        const p = picks(n)[t], color = root.UI.teamColor(t), ans = answerOf(n);
        const got = reveal && ans != null ? Logic.choicePoints(p, ans) : null;
        return h('div', { class: 'pick-panel', style: { borderColor: color } }, [
          h('div', { class: 'pick-team', style: { color } }, [
            root.UI.teamName(t),
            got != null ? h('span', { class: 'pick-result' + (got ? ' ok' : '') }, got ? '🪙 +' + got : '아쉬워요') : null
          ]),
          h('div', { class: 'pick-btns' }, Q[n].choices.map((_, k) => MARKS[k]).map((m, k) => h('button', {
            class: 'pick-btn' + (p.pick === k ? ' on' : ''),
            style: p.pick === k ? { background: color, borderColor: color } : {},
            onclick: () => { p.pick = k; S.save(); if (reveal) score(n); render(ctl.index()); }
          }, m))),
          h('button', {
            class: 'kid-toggle' + (p.kid ? ' on' : ''),
            onclick: () => { p.kid = !p.kid; S.save(); if (reveal) score(n); render(ctl.index()); }
          }, (p.kid ? '⭐' : '☆') + ' 아이 ×2')
        ]);
      }

      function choices(n, reveal) {
        const q = Q[n], ans = answerOf(n), p = picks(n), judging = reveal && q.answer == null;
        return h('div', { class: 'choices' + (q.choices.length > 4 ? ' many' : '') }, q.choices.map((c, k) => {
          let cls = 'choice';
          if (reveal && ans === k) cls += ' correct';
          else if (reveal && ans != null) cls += ' dim';
          if (judging) cls += ' judgeable';
          const tags = ['A', 'B'].filter(t => p[t].pick === k).map(t =>
            h('span', { class: 'pick-tag', style: { background: root.UI.teamColor(t) } }, root.UI.teamName(t)));
          return h('div', { class: cls, onclick: judging ? () => { st.lifeJudge[n] = k; S.save(); score(n); render(ctl.index()); } : null },
            [h('b', {}, MARKS[k]), ' ' + c, tags.length ? h('div', { class: 'pick-tags' }, tags) : null]);
        }));
      }

      function render(i) {
        stage.innerHTML = '';
        const s = steps[i];
        if (s.type === 'intro') {
          stage.appendChild(h('div', { class: 'game-intro' }, [
            h('div', { class: 'game-no' }, 'GAME 1'),
            h('h1', {}, '📸 할아버지 인생 퀴즈'),
            h('ul', { class: 'rules' }, [
              h('li', {}, '팀끼리 상의해서 정답 번호를 골라요'),
              h('li', {}, '맞히면 팀 전원 🪙+1 · ⭐ 아이가 고르면 🪙+2'),
              h('li', {}, '할아버지·할머니는 정답 공개 전까지 쉿! 🤫')
            ])
          ]));
          stage.appendChild(root.UI.actionBtn('첫 문제 ▶'));
          return;
        }
        const q = Q[s.n];
        if (s.type === 'story') {
          stage.appendChild(h('div', { class: 'story' }, [
            h('div', { class: 'story-badge' }, '🎙 ' + (q.storyBy || '할아버지') + ' 썰 타임'),
            q.storyPhoto ? h('img', { class: 'story-photo', src: q.storyPhoto, alt: '' }) : null,
            q.story ? h('p', { class: 'story-text' }, q.story) : null
          ]));
          stage.appendChild(root.UI.actionBtn('다음 문제 ▶'));
          return;
        }
        const reveal = s.type === 'reveal';
        if (reveal) score(s.n);
        const judgePending = reveal && answerOf(s.n) == null;
        stage.appendChild(h('div', { class: 'quiz' }, [
          h('div', { class: 'q-head' }, 'Q' + (s.n + 1) + ' / ' + Q.length + (reveal ? '  ·  정답 공개' : '')),
          h('h1', { class: 'q-text' }, q.q),
          h('div', { class: 'q-body' }, [
            q.photo ? h('img', { class: 'q-photo', src: q.photo, alt: '' }) : null,
            choices(s.n, reveal)
          ]),
          judgePending ? h('div', { class: 'judge' }, '⚖ ' + (q.judge || '할머니') + ' 판정! 정답 보기를 클릭해 주세요')
            : reveal && q.answer == null ? h('div', { class: 'judge small' }, '⚖ ' + (q.judge || '할머니') + ' 판정 완료 (다른 보기를 누르면 바뀌어요)') : null,
          h('div', { class: 'pick-row' }, [teamPanel(s.n, 'A', reveal), teamPanel(s.n, 'B', reveal)]),
          reveal ? null : h('p', { class: 'hint' }, '두 팀 모두 고르면 정답 공개!'),
          root.UI.actionBtn(reveal ? (steps[i + 1] && steps[i + 1].type === 'story' ? '썰 타임 🎙' : '다음 ▶') : '정답 공개 ▶')
        ]));
      }

      const ctl = root.UI.stepper(steps.length, opts.fromEnd, i => render(i));
      return ctl;
    }
  };
})(this);
