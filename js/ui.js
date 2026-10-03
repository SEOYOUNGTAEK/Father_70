// 화면 공통 도구 — 요소 생성, 토스트, 코인 지급 버튼, 코인 현황판, 단계 이동
(function (root) {
  'use strict';
  root.Scenes = {};

  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      const v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(s => (s.startsWith('--') ? el.style.setProperty(s, v[s]) : (el.style[s] = v[s])));
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'selected') el[k] = !!v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children == null ? [] : children).forEach(c => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    });
    return el;
  }

  const teamColor = t => root.PARTY_CONFIG.teams[t].color;
  const teamName = t => root.Store.state.teamNames[t];
  const overlay = () => document.getElementById('overlay-root');

  function toast(text, team) {
    const t = h('div', { class: 'toast', style: { background: team ? teamColor(team) : '#3a2a5a' } }, text);
    overlay().appendChild(t);
    setTimeout(() => t.classList.add('out'), 1800);
    setTimeout(() => t.remove(), 2400);
  }

  function award(team, points, key) {
    const S = root.Store;
    S.state.coins = root.Logic.teamAward(S.state.players, S.state.coins, team, points);
    if (key) S.state.awarded[key] = team + ':' + points;
    S.save();
    toast('🪙 +' + points + '  ' + teamName(team) + ' 전원!', team);
    refreshScoreboard();
  }

  function undo(key) {
    const S = root.Store, done = S.state.awarded[key];
    if (!done) return;
    const [team, pts] = done.split(':');
    if (team !== 'none') S.state.coins = root.Logic.teamAward(S.state.players, S.state.coins, team, -Number(pts));
    delete S.state.awarded[key];
    S.save();
    refreshScoreboard();
  }

  // 문제 하나당 한 번만 지급되는 코인 버튼 줄. getPoints()는 지금 기준 배점.
  function awardBar(key, getPoints) {
    const bar = h('div', { class: 'award-bar' });
    function render() {
      bar.innerHTML = '';
      const done = root.Store.state.awarded[key];
      if (done) {
        const [team, pts] = done.split(':');
        bar.appendChild(h('span', { class: 'award-done' },
          team === 'none' ? '이번 문제는 꽝!' : '✔ ' + teamName(team) + ' 🪙+' + pts + ' 지급 완료'));
        bar.appendChild(h('button', { class: 'btn ghost small', onclick: () => { undo(key); render(); } }, '되돌리기'));
        return;
      }
      const p = getPoints();
      ['A', 'B'].forEach(t => {
        bar.appendChild(h('button', { class: 'btn', style: { background: teamColor(t) },
          onclick: () => { award(t, p, key); render(); } }, teamName(t) + ' 정답 +' + p));
        bar.appendChild(h('button', { class: 'btn kid', style: { background: teamColor(t) },
          onclick: () => { award(t, p * 2, key); render(); } }, '⭐ 아이 정답 +' + p * 2));
      });
      bar.appendChild(h('button', { class: 'btn ghost', onclick: () => {
        root.Store.state.awarded[key] = 'none:0'; root.Store.save(); render();
      } }, '꽝'));
    }
    render();
    return bar;
  }

  let board = null;
  function renderScoreboard() {
    const S = root.Store;
    board.innerHTML = '';
    board.appendChild(h('h2', {}, '🪙 코인 현황'));
    const cols = h('div', { class: 'board-cols' });
    ['A', 'B'].forEach(t => {
      const col = h('div', { class: 'board-team', style: { borderColor: teamColor(t) } }, [
        h('h3', { style: { color: teamColor(t) } }, [teamName(t), h('span', { class: 'board-total' }, '🪙 ' + S.teamTotal(t))])
      ]);
      S.state.players.filter(p => p.team === t).forEach(p => {
        col.appendChild(h('div', { class: 'board-row' }, [
          h('span', { class: 'board-name' }, (p.kid ? '⭐ ' : '') + p.name),
          h('button', { class: 'btn ghost small', onclick: () => { S.addCoins(p.id, -1); renderScoreboard(); } }, '−'),
          h('span', { class: 'board-coins' }, S.state.coins[p.id] || 0),
          h('button', { class: 'btn ghost small', onclick: () => { S.addCoins(p.id, 1); renderScoreboard(); } }, '+')
        ]));
      });
      cols.appendChild(col);
    });
    board.appendChild(cols);
    board.appendChild(h('button', { class: 'close-btn', onclick: () => toggleScoreboard(false) }, '✕ 닫기'));
  }
  function toggleScoreboard(force) {
    if (!board) {
      board = h('div', { class: 'scoreboard hidden', onclick: e => { if (e.target === board) toggleScoreboard(false); } });
      overlay().appendChild(board);
    }
    const show = force != null ? force : board.classList.contains('hidden');
    if (show) renderScoreboard();
    board.classList.toggle('hidden', !show);
  }
  function refreshScoreboard() { if (board && !board.classList.contains('hidden')) renderScoreboard(); }

  // 씬 내부 단계 이동 공통 처리. canMove()가 false면 이동을 막는다(레이스·타이머 진행 중 등).
  function stepper(count, fromEnd, render, canMove) {
    let i = fromEnd ? count - 1 : 0;
    const ok = () => !canMove || canMove();
    render(i);
    return {
      index: () => i,
      rerender: () => render(i),
      next() { if (!ok()) return true; if (i < count - 1) { render(++i); return true; } return false; },
      prev() { if (!ok()) return true; if (i > 0) { render(--i); return true; } return false; }
    };
  }

  // 화면 오른쪽 아래의 큰 진행 버튼 (폰 터치용) — 기본 동작은 다음 화면
  function actionBtn(label, onClick) {
    return h('button', { class: 'action-btn', onpointerdown: e => e.stopPropagation(), onclick: e => {
      e.stopPropagation();
      (onClick || (() => root.App.step(1)))();
    } }, label);
  }

  // 클릭한 버튼에 포커스가 남으면 Space 가 버튼을 다시 누르므로 바로 해제
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button');
    if (b) b.blur();
  });

  root.UI = { h, toast, award, undo, awardBar, toggleScoreboard, refreshScoreboard, stepper, teamColor, teamName, actionBtn };
})(this);
