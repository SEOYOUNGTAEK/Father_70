// 순수 계산 함수 모음 — 브라우저(window.Logic)와 Node(module.exports) 겸용
(function (root) {
  'use strict';
  const SEVEN_TARGET = 7, JACKPOT_TOL = 0.05, JACKPOT_COINS = 7, RANK_COINS = [3, 2, 1];

  function quizPoints(base, kid) { return kid ? base * 2 : base; }

  // stage 1 = 가장 크게 확대된 상태
  function zoomPoints(stage) { return stage <= 2 ? 3 : stage <= 4 ? 2 : 1; }

  function teamAward(players, coins, team, points) {
    const out = Object.assign({}, coins);
    players.forEach(p => { if (p.team === team) out[p.id] = Math.max(0, (out[p.id] || 0) + points); });
    return out;
  }

  function sevenRanking(results) {
    const rows = Object.keys(results).map(id => ({
      id, seconds: results[id],
      diff: Math.round(Math.abs(results[id] - SEVEN_TARGET) * 1000) / 1000
    }));
    rows.sort((a, b) => a.diff - b.diff);
    let rank = 0;
    rows.forEach((r, i) => {
      if (i === 0 || r.diff !== rows[i - 1].diff) rank = i + 1;
      r.rank = rank;
      r.jackpot = r.diff <= JACKPOT_TOL;
      r.coins = r.jackpot ? JACKPOT_COINS : (RANK_COINS[rank - 1] || 0);
    });
    return rows;
  }

  function marblePool(players, coins, excludeIds) {
    return players.filter(p => excludeIds.indexOf(p.id) < 0)
      .map(p => ({ id: p.id, count: Math.max(1, coins[p.id] || 0) }));
  }

  // 팀이 고른 보기의 점수 — sel = { pick, kid }, answer 가 null 이면 아직 판정 전
  function choicePoints(sel, answer) {
    if (!sel || sel.pick == null || answer == null || sel.pick !== answer) return 0;
    return quizPoints(1, sel.kid);
  }

  // 팀별 점수가 prev → next 로 바뀌었을 때 차이만큼만 코인 반영
  function rescore(players, coins, prev, next) {
    let out = coins;
    ['A', 'B'].forEach(t => {
      const d = (next[t] || 0) - (prev[t] || 0);
      if (d) out = teamAward(players, out, t, d);
    });
    return out;
  }

  function chaptersWithPhotos(chapters, manifest) {
    return chapters.filter(c => (manifest[c.folder] || []).length > 0);
  }

  const api = { quizPoints, zoomPoints, teamAward, sevenRanking, marblePool, choicePoints, rescore, chaptersWithPhotos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(this);
