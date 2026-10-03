// 게임 진행 상태 — localStorage 에 저장해서 새로고침해도 이어서 진행
(function (root) {
  'use strict';
  const KEY = 'chilsun-party-v1';

  function emptyProgress(players) {
    const coins = {};
    players.forEach(p => { coins[p.id] = 0; });
    // lifePicks[n] = { A: {pick, kid}, B: {...} }, lifeJudge[n] = 판정 문제의 정답, lifeScored[n] = { A: 점수, B: 점수 }
    return { coins, awarded: {}, seven: {}, sevenPaid: false, roulette: [], lifePicks: {}, lifeJudge: {}, lifeScored: {} };
  }

  function defaults(cfg) {
    const players = cfg.players.map(p => Object.assign({}, p));
    return Object.assign({
      players,
      teamNames: { A: cfg.teams.A.name, B: cfg.teams.B.name },
      prizes: cfg.prizes.slice(),
      heroTitle: cfg.heroTitle,
      sceneIndex: 0,
      configVersion: cfg.version
    }, emptyProgress(players));
  }

  // config.js 가 바뀌면(version 증가) 명단·팀 이름·오프닝 문구·상품을 반영하고, 게임 기록(코인 등)은 새로 시작
  function migrate(saved, cfg) {
    if (saved.configVersion === cfg.version) return saved;
    saved.players = cfg.players.map(p => Object.assign({}, p));
    saved.prizes = cfg.prizes.slice();
    saved.teamNames = { A: cfg.teams.A.name, B: cfg.teams.B.name };
    saved.heroTitle = cfg.heroTitle;
    Object.assign(saved, emptyProgress(saved.players));
    saved.sceneIndex = 0; // 오프닝부터 다시
    saved.configVersion = cfg.version;
    return saved;
  }

  const Store = {
    state: null,
    load() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
      const cfg = root.PARTY_CONFIG;
      this.state = saved && saved.players ? migrate(saved, cfg) : defaults(cfg);
      ['lifePicks', 'lifeJudge', 'lifeScored'].forEach(k => { if (!this.state[k]) this.state[k] = {}; });
      this.save();
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { /* 저장 못 해도 진행은 계속 */ }
    },
    reset() { this.state = defaults(root.PARTY_CONFIG); this.save(); },
    resetProgress() { Object.assign(this.state, emptyProgress(this.state.players)); this.save(); },
    player(id) { return this.state.players.find(p => p.id === id); },
    setTeam(id, team) {
      const p = this.player(id);
      if (p && p.team !== team) { p.team = team; this.save(); }
    },
    addCoins(id, n) {
      this.state.coins[id] = Math.max(0, (this.state.coins[id] || 0) + n);
      this.save();
    },
    teamTotal(team) {
      return this.state.players.filter(p => p.team === team)
        .reduce((s, p) => s + (this.state.coins[p.id] || 0), 0);
    }
  };
  root.Store = Store;
})(this);
