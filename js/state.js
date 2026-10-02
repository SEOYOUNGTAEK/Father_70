// 게임 진행 상태 — localStorage 에 저장해서 새로고침해도 이어서 진행
(function (root) {
  'use strict';
  const KEY = 'chilsun-party-v1';

  function emptyProgress(players) {
    const coins = {};
    players.forEach(p => { coins[p.id] = 0; });
    return { coins, awarded: {}, seven: {}, sevenPaid: false, roulette: [] };
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

  // config.js 의 명단이 바뀌면(version 증가) 저장된 상태에도 반영 — 코인 등 진행 기록은 유지
  function migrate(saved, cfg) {
    if (saved.configVersion === cfg.version) return saved;
    saved.players = cfg.players.map(p => Object.assign({}, p));
    saved.players.forEach(p => { if (saved.coins[p.id] == null) saved.coins[p.id] = 0; });
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
