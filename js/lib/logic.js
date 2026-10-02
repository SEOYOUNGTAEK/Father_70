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

  // 서바이벌 레이스: 한 명 빼고 모두 골인하면 끝. 남은 사람이 prizes[r]을 받고,
  // 결승(2명)이면 먼저 들어온 사람이 다음 상품(1등)까지 받는다. 아직이면 null.
  function survivalResult(poolIds, finished, prizes, r) {
    const left = poolIds.filter(id => finished.indexOf(id) < 0);
    if (left.length !== 1) return null;
    const out = [{ index: r, prize: prizes[r], id: left[0] }];
    if (poolIds.length === 2 && r + 1 < prizes.length) out.push({ index: r + 1, prize: prizes[r + 1], id: finished[0] });
    return out;
  }

  function raceCount(prizeCount) { return Math.max(1, prizeCount - 1); }

  function chaptersWithPhotos(chapters, manifest) {
    return chapters.filter(c => (manifest[c.folder] || []).length > 0);
  }

  const api = { quizPoints, zoomPoints, teamAward, sevenRanking, marblePool, survivalResult, raceCount, chaptersWithPhotos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(this);
