// 설정 화면 (G 키) — 이름·팀·상품 수정, 초기화, 바로가기
(function (root) {
  'use strict';
  const h = root.UI.h;
  let box = null;

  function close() { if (box) { box.parentNode.remove(); box = null; } }

  function open(flow, go) {
    close();
    const S = root.Store, st = S.state;
    const draft = st.players.map(p => Object.assign({}, p));
    const rows = draft.map(p => h('tr', {}, [
      h('td', {}, h('input', { value: p.name, oninput: e => { p.name = e.target.value; } })),
      h('td', {}, h('select', { onchange: e => { p.team = e.target.value; } },
        ['A', 'B'].map(t => h('option', { value: t, selected: p.team === t }, t)))),
      h('td', {}, h('input', { type: 'checkbox', checked: p.kid, onchange: e => { p.kid = e.target.checked; } })),
      h('td', { class: 'num' }, st.coins[p.id] || 0)
    ]));
    const title = h('input', { class: 'wide', value: st.heroTitle });
    const teamInputs = {};
    ['A', 'B'].forEach(t => { teamInputs[t] = h('input', { value: st.teamNames[t], style: { borderColor: root.UI.teamColor(t) } }); });
    const prizes = h('textarea', { rows: 9, value: st.prizes.join('\n') });

    box = h('div', { class: 'setup' }, [
      h('div', { class: 'setup-head' }, [h('h2', {}, '⚙ 설정'), h('button', { class: 'close-btn', onclick: close }, '✕ 닫기')]),
      h('label', {}, ['오프닝 문구  ', title]),
      h('div', { class: 'setup-teams' }, ['A', 'B'].map(t => h('label', {}, [
        h('b', { style: { color: root.UI.teamColor(t) } }, t + '팀 이름  '), teamInputs[t]]))),
      h('table', {}, [h('tr', {}, ['이름', '팀', '아이(⭐)', '코인'].map(t => h('th', {}, t)))].concat(rows)),
      h('label', {}, ['선물 순서 — 한 줄에 하나, 위에서부터 추첨 (첫 줄이 1등)', prizes]),
      h('div', { class: 'setup-btns' }, [
        h('button', { class: 'btn', onclick: () => {
          st.players = draft;
          st.heroTitle = title.value.trim() || st.heroTitle;
          ['A', 'B'].forEach(t => { st.teamNames[t] = teamInputs[t].value.trim() || t + '팀'; });
          st.prizes = prizes.value.split('\n').map(s => s.trim()).filter(Boolean);
          S.save(); close(); go(st.sceneIndex);
        } }, '저장'),
        h('button', { class: 'btn ghost', onclick: () => {
          if (confirm('코인·게임 기록을 모두 지울까요? (이름·상품은 그대로)')) { S.resetProgress(); close(); go(0); }
        } }, '게임 기록 초기화'),
        h('button', { class: 'btn danger', onclick: () => {
          if (confirm('설정까지 전부 처음 상태로 되돌릴까요?')) { S.reset(); close(); go(0); }
        } }, '전체 초기화')
      ]),
      h('h3', {}, '바로 가기'),
      h('div', { class: 'jump' }, flow.map((f, i) => h('button', { class: 'btn ghost small',
        onclick: () => { close(); go(i); } }, (i + 1) + '. ' + f.label)))
    ]);
    // 바깥 어두운 곳을 터치해도 닫힘
    const backdrop = h('div', { class: 'setup-backdrop', onclick: e => { if (e.target === backdrop) close(); } }, box);
    document.getElementById('overlay-root').appendChild(backdrop);
  }

  root.Scenes.setup = { open, close, isOpen: () => !!box };
})(this);
