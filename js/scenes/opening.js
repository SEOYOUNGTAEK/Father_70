// 오프닝 — 칠순 축하 + 팀 나누기(이름 칩 드래그 앤 드롭) + 팀 이름 정하기
(function (root) {
  'use strict';
  const h = root.UI.h;

  root.Scenes.opening = {
    create(stage) {
      const S = root.Store;

      function teamCard(t) {
        const color = root.UI.teamColor(t);
        const members = S.state.players.filter(p => p.team === t);
        const card = h('div', { class: 'team-card', style: { borderColor: color },
          ondragover: e => { e.preventDefault(); card.classList.add('drop-on'); },
          ondragleave: () => card.classList.remove('drop-on'),
          ondrop: e => {
            e.preventDefault();
            card.classList.remove('drop-on');
            S.setTeam(e.dataTransfer.getData('text/plain'), t);
            render();
          } }, [
          h('label', { class: 'team-label', style: { color } }, '✏️ 팀 이름'),
          h('input', { class: 'team-input', value: S.state.teamNames[t], placeholder: '팀 이름을 지어요!',
            style: { color, borderColor: color },
            oninput: e => { S.state.teamNames[t] = e.target.value.trim() || t + '팀'; S.save(); },
            onkeydown: e => { if (e.key === 'Enter') e.target.blur(); } }),
          h('div', { class: 'roster' }, members.length ? members.map(p => h('span', {
            class: 'chip' + (p.kid ? ' kid' : ''), draggable: 'true',
            ondragstart: e => { e.dataTransfer.setData('text/plain', p.id); e.target.classList.add('dragging'); },
            onclick: () => { S.setTeam(p.id, t === 'A' ? 'B' : 'A'); render(); }, // 폰: 탭하면 다른 팀으로
            ondragend: e => e.target.classList.remove('dragging')
          }, (p.kid ? '⭐ ' : '') + p.name)) : h('span', { class: 'roster-empty' }, '여기로 이름을 끌어 오세요')),
          h('div', { class: 'team-count' }, members.length + '명')
        ]);
        return card;
      }

      function render() {
        stage.innerHTML = '';
        stage.appendChild(h('div', { class: 'opening' }, [
          h('div', { class: 'hanja-wrap' }, h('div', { class: 'hanja' }, '七旬')),
          h('h1', { class: 'hero' }, S.state.heroTitle),
          h('div', { class: 'teams' }, [teamCard('A'), h('div', { class: 'vs' }, 'VS'), teamCard('B')]),
          h('p', { class: 'hint' }, '이름을 탭하면 다른 팀으로 · 팀장 어린이가 팀 이름을 지어 주세요'),
          root.UI.actionBtn('게임 시작 ▶')
        ]));
      }

      render();
      return { next: () => false, prev: () => false };
    }
  };
})(this);
