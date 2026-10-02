// 게임3 · 7초 맞추기 — 올라가는 초시계를 보면서 직접 7.00초에 멈추기, 오차 순위로 코인
(function (root) {
  'use strict';
  const h = root.UI.h, Logic = root.Logic;
  const fmt = x => x.toFixed(2);

  root.Scenes.seven = {
    create(stage, arg, opts) {
      const S = root.Store, players = S.state.players, count = players.length + 2;
      let startedAt = null, ticker = 0;
      const stopTicker = () => { clearInterval(ticker); ticker = 0; };

      function intro() {
        stage.appendChild(h('div', { class: 'game-intro' }, [
          h('div', { class: 'game-no' }, 'GAME 3'),
          h('h1', {}, '⏱ 7초 맞추기'),
          h('ul', { class: 'rules' }, [
            h('li', {}, '칠순이니까 7초! 한 명씩 나와요'),
            h('li', {}, '올라가는 초시계를 보고 7.00초에 직접 멈추기!'),
            h('li', {}, '시작·멈춤은 본인이 스페이스 또는 화면 클릭'),
            h('li', {}, '1등 🪙3 · 2등 🪙2 · 3등 🪙1'),
            h('li', {}, '정확히 7초(±0.05)면 잭팟 🪙7 !')
          ])
        ]));
      }

      function playerStep(p, order) {
        const res = S.state.seven[p.id];
        let body;
        if (startedAt) {
          const num = h('div', { class: 'big-num running' }, '0.00');
          stopTicker();
          ticker = setInterval(() => { num.textContent = fmt((performance.now() - startedAt) / 1000); }, 20);
          body = h('div', { class: 'seven-run' }, [num, h('p', {}, '7.00 에 멈춰!')]);
        } else if (res != null) {
          const d = res - 7, jackpot = Math.abs(d) <= 0.05;
          body = h('div', { class: 'seven-result' + (jackpot ? ' jackpot' : '') }, [
            h('div', { class: 'big-num' }, fmt(res) + '초'),
            h('p', {}, jackpot ? '🎉 잭팟! 거의 정확히 7초!' : (d > 0 ? '+' : '') + fmt(d) + '초 차이')
          ]);
        } else {
          body = h('div', {}, [h('div', { class: 'big-num dim' }, '0.00'), h('p', {}, '준비되면 스페이스 또는 클릭!')]);
        }
        stage.appendChild(h('div', { class: 'seven seven-player', onclick: toggle }, [
          h('div', { class: 'seven-order' }, order + ' / ' + players.length),
          h('h1', { class: 'seven-name', style: { color: root.UI.teamColor(p.team) } }, (p.kid ? '⭐ ' : '') + p.name),
          body,
          h('p', { class: 'hint' }, startedAt ? 'Space / 클릭: 멈춤' : res != null ? (S.state.sevenPaid ? '→ 다음' : 'R: 다시 하기 · → 다음 사람') : 'Space / 클릭: 시작')
        ]));
      }

      function ranking() {
        const rows = Logic.sevenRanking(S.state.seven);
        stage.appendChild(h('div', { class: 'seven' }, [
          h('h1', {}, '🏆 7초 맞추기 결과'),
          h('table', { class: 'rank-table' }, [
            h('tr', {}, ['순위', '이름', '기록', '오차', '코인'].map(t => h('th', {}, t)))
          ].concat(rows.map(r => {
            const p = S.player(r.id);
            return h('tr', { class: r.coins ? 'top' : '' }, [
              h('td', {}, r.rank + '등'), h('td', {}, (p.kid ? '⭐ ' : '') + p.name), h('td', {}, fmt(r.seconds) + '초'),
              h('td', {}, '±' + fmt(r.diff)), h('td', {}, r.coins ? (r.jackpot ? '🎉 ' : '') + '🪙' + r.coins : '-')
            ]);
          }))),
          S.state.sevenPaid ? h('p', { class: 'award-done' }, '✔ 코인 지급 완료')
            : rows.length ? h('button', { class: 'btn big', onclick: () => {
              rows.forEach(r => { S.state.coins[r.id] = (S.state.coins[r.id] || 0) + r.coins; });
              S.state.sevenPaid = true; S.save();
              root.UI.toast('🪙 7초 게임 코인 지급 완료!');
              root.UI.refreshScoreboard();
              ctl.rerender();
            } }, '🪙 코인 지급') : h('p', {}, '아직 기록이 없어요')
        ]));
      }

      const render = i => {
        stopTicker();
        stage.innerHTML = '';
        if (i === 0) intro();
        else if (i === count - 1) ranking();
        else playerStep(players[i - 1], i);
      };
      const ctl = root.UI.stepper(count, opts.fromEnd, render, () => !startedAt);

      // 시작/멈춤 — 스페이스와 화면 클릭 공통
      function toggle() {
        const i = ctl.index();
        if (i < 1 || i > players.length) return;
        const p = players[i - 1];
        if (startedAt) {
          S.state.seven[p.id] = Math.round((performance.now() - startedAt) / 10) / 100;
          startedAt = null; S.save(); render(i);
        } else if (S.state.seven[p.id] == null) {
          startedAt = performance.now(); render(i);
        }
      }
      ctl.destroy = stopTicker;

      ctl.key = e => {
        const i = ctl.index();
        if (i < 1 || i > players.length) return false;
        const p = players[i - 1], k = e.key.toLowerCase();
        if (e.key === ' ') { toggle(); return true; }
        if ((k === 'r' || k === 'ㄱ') && !startedAt && !S.state.sevenPaid) {
          delete S.state.seven[p.id]; S.save(); render(i); return true;
        }
        return false;
      };
      return ctl;
    }
  };
})(this);
