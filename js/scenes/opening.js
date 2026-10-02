// 오프닝 — 칠순 축하 + 팀 이름 정하기
(function (root) {
  'use strict';
  const h = root.UI.h;

  root.Scenes.opening = {
    create(stage) {
      const S = root.Store;
      function teamCard(t) {
        const color = root.UI.teamColor(t);
        return h('div', { class: 'team-card', style: { borderColor: color } }, [
          h('input', { class: 'team-input', value: S.state.teamNames[t], placeholder: '팀 이름은?',
            style: { color }, oninput: e => { S.state.teamNames[t] = e.target.value.trim() || t + '팀'; S.save(); } }),
          h('div', { class: 'roster' }, S.state.players.filter(p => p.team === t)
            .map(p => h('span', { class: 'chip' + (p.kid ? ' kid' : '') }, (p.kid ? '⭐ ' : '') + p.name)))
        ]);
      }
      stage.appendChild(h('div', { class: 'opening' }, [
        h('div', { class: 'hanja' }, '七旬'),
        h('h1', { class: 'hero' }, S.state.heroTitle),
        h('div', { class: 'teams' }, [teamCard('A'), h('div', { class: 'vs' }, 'VS'), teamCard('B')]),
        h('p', { class: 'hint' }, '팀장 어린이가 팀 이름을 지어 주세요 ·  → 키로 시작')
      ]));
      return { next: () => false, prev: () => false };
    }
  };
})(this);
