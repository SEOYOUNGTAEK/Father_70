// 마블 룰렛 시상식 — 서바이벌 레이스
// 코인 1개 = 이름 구슬 1개. 구슬이 하나라도 골인하면 통과, 끝까지 못 들어온 사람이 그 판 상품을 받고 퇴장.
// 작은 상품부터 진행하고, 마지막 2명은 결승 — 먼저 들어온 사람이 1등.
(function (root) {
  'use strict';
  const h = root.UI.h;
  const W = 1600, H = 7200, GATE_Y = 640, MAX_SPEED = 25, TIMEOUT_FRAMES = 60 * 75;
  const PALETTE = ['#ff6b6b', '#ffd43b', '#51cf66', '#4dabf7', '#cc5de8', '#ff922b', '#20c997', '#f783ac', '#94d82d', '#748ffc'];

  // 핀 구간 → 지그재그 경사로 → 회전 막대 를 반복해서 쌓는다
  function buildTrack(M) {
    const B = M.Bodies, bodies = [], rotors = [];
    const wall = { isStatic: true, restitution: 0.3, friction: 0, label: 'wall' };
    bodies.push(B.rectangle(-40, H / 2, 80, H * 1.2, wall), B.rectangle(W + 40, H / 2, 80, H * 1.2, wall),
      B.rectangle(W / 2, H + 40, W * 1.2, 80, wall));
    let y = 760, k = 0;
    while (y < H - 1000) {
      const kind = k % 3;
      if (kind === 0) {
        for (let r = 0; r < 6; r++)
          for (let x = r % 2 ? 120 : 60; x < W - 30; x += 120)
            bodies.push(B.circle(x, y + r * 95, 11, { isStatic: true, restitution: 0.7, label: 'peg' }));
        y += 6 * 95 + 170;
      } else if (kind === 1) {
        bodies.push(B.rectangle(W * 0.4, y, W * 0.85, 40, { isStatic: true, angle: 0.18, friction: 0.0005, label: 'ramp' }));
        bodies.push(B.rectangle(W * 0.6, y + 340, W * 0.85, 40, { isStatic: true, angle: -0.18, friction: 0.0005, label: 'ramp' }));
        y += 720;
      } else {
        [0.2, 0.5, 0.8].forEach((fx, n) => {
          const bar = B.rectangle(W * fx, y, 300, 22, { isStatic: true, label: 'rotor' });
          bar.spin = (n % 2 ? 1 : -1) * 0.035;
          rotors.push(bar);
          bodies.push(bar);
        });
        y += 440;
      }
      k++;
    }
    return { bodies, rotors, finishY: H - 280 };
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // 게이트 위 격자에 무작위 자리로 구슬 배치
  function spawnMarbles(M, pool) {
    const ids = [];
    pool.forEach(p => { for (let c = 0; c < p.count; c++) ids.push(p.id); });
    const r = ids.length > 90 ? 12 : ids.length > 50 ? 15 : 19;
    const gap = r * 2 + 6, cols = Math.floor((W - 120) / gap);
    const slots = shuffle(ids.map((_, n) => n));
    return ids.map((id, n) => {
      const col = slots[n] % cols, row = Math.floor(slots[n] / cols);
      const m = M.Bodies.circle(60 + r + col * gap + Math.random() * 3, GATE_Y - 20 - r - row * gap, r,
        { restitution: 0.45, friction: 0.002, frictionAir: 0.0008, density: 0.002, label: 'marble' });
      m.pid = id;
      return m;
    });
  }

  function createRace(M, pool) {
    const engine = M.Engine.create({ positionIterations: 10, velocityIterations: 8 });
    const track = buildTrack(M);
    const gate = M.Bodies.rectangle(W / 2, GATE_Y, W, 20, { isStatic: true, label: 'gate' });
    const marbles = spawnMarbles(M, pool);
    M.Composite.add(engine.world, track.bodies.concat([gate], marbles));
    return { engine, track, gate, marbles, poolIds: pool.map(p => p.id), finished: [], started: false, frames: 0 };
  }

  function startRace(M, race) {
    race.started = true;
    M.Composite.remove(race.engine.world, race.gate);
  }

  function markFinished(M, race, pid) {
    race.finished.push(pid);
    const gone = race.marbles.filter(m => m.pid === pid);
    M.Composite.remove(race.engine.world, gone);
    race.marbles = race.marbles.filter(m => m.pid !== pid);
  }

  const raceOver = race => race.finished.length >= race.poolIds.length - 1;

  // 한 프레임 진행. 새로 통과한 사람 id 배열을 돌려준다.
  function tick(M, race) {
    M.Engine.update(race.engine, 1000 / 60);
    race.track.rotors.forEach(b => M.Body.setAngle(b, b.angle + b.spin));
    if (!race.started || raceOver(race)) return [];
    race.frames++;
    race.marbles.forEach(m => {
      const v = m.velocity, sp = Math.hypot(v.x, v.y);
      if (sp > MAX_SPEED) M.Body.setVelocity(m, { x: v.x / sp * MAX_SPEED, y: v.y / sp * MAX_SPEED });
    });
    // 15초가 지나면 멈춰 있는 구슬을 살짝 튕겨 준다
    if (race.frames > 900 && race.frames % 90 === 0) {
      race.marbles.forEach(m => {
        if (m.speed < 0.5) M.Body.applyForce(m, m.position, { x: (Math.random() - 0.5) * m.mass * 0.02, y: -m.mass * 0.015 });
      });
    }
    const newly = [];
    // 아래쪽 구슬부터 확인해서, 한 명이 남으면 바로 멈춘다
    race.marbles.slice().sort((a, b) => b.position.y - a.position.y).forEach(m => {
      if (raceOver(race) || m.position.y <= race.track.finishY || race.finished.indexOf(m.pid) >= 0) return;
      markFinished(M, race, m.pid);
      newly.push(m.pid);
    });
    // 너무 오래 걸리면 앞선 사람부터 통과 처리
    if (race.frames > TIMEOUT_FRAMES && !raceOver(race)) {
      const best = {};
      race.marbles.forEach(m => { best[m.pid] = Math.max(best[m.pid] || 0, m.position.y); });
      Object.keys(best).sort((a, b) => best[b] - best[a]).forEach(pid => {
        if (!raceOver(race)) { markFinished(M, race, pid); newly.push(pid); }
      });
    }
    return newly;
  }

  // 구슬에 쓸 짧은 이름: 세 글자 이름은 뒤 두 글자, 그 외 앞 두 글자
  const shortName = name => {
    const s = name.replace(/\s/g, '');
    return s.length === 3 ? s.slice(1) : s.slice(0, 2);
  };

  root.Scenes.roulette = {
    _sim: { createRace, startRace, tick, raceOver }, // 화면 없이 레이스를 점검할 때 사용
    create(stage, arg, opts) {
      const S = root.Store, M = root.Matter, Logic = root.Logic;
      const prizes = S.state.prizes, races = Logic.raceCount(prizes.length), count = races + 1;
      const colorOf = {}, labelOf = {};
      S.state.players.forEach((p, n) => { colorOf[p.id] = PALETTE[n % PALETTE.length]; labelOf[p.id] = shortName(p.name); });
      const nameOf = id => (S.player(id) || {}).name || '?';
      let race = null;

      function stopRace() {
        if (!race) return;
        cancelAnimationFrame(race.raf);
        M.Composite.clear(race.engine.world, false);
        M.Engine.clear(race.engine);
        race = null;
      }

      // 이 판에서 정해진 결과 카드 (결승이면 1등 + 2등)
      function resultCard(r) {
        const mine = S.state.roulette[r], top = S.state.roulette[r + 1];
        const isFinal = r === races - 1 && top;
        return h('div', { class: 'winner' }, isFinal ? [
          h('div', { class: 'winner-prize' }, '🏆 ' + top.prize),
          h('div', { class: 'who', style: { color: colorOf[top.id] } }, nameOf(top.id)),
          h('div', { class: 'what' }, '최후의 1인! 축하합니다 🎉'),
          h('div', { class: 'runner-up' }, '🎁 ' + mine.prize + ' — ' + nameOf(mine.id))
        ] : [
          h('div', { class: 'winner-prize' }, '🎁 ' + mine.prize),
          h('div', { class: 'who', style: { color: colorOf[mine.id] } }, nameOf(mine.id)),
          h('div', { class: 'what' }, '당첨! 다음 판부터는 응원단 📣')
        ]);
      }

      function intro() {
        const pool = Logic.marblePool(S.state.players, S.state.coins, []);
        stage.appendChild(h('div', { class: 'game-intro' }, [
          h('div', { class: 'game-no' }, 'FINALE'),
          h('h1', {}, '🎰 마블 룰렛 시상식'),
          h('ul', { class: 'rules' }, [
            h('li', {}, '코인 1개 = 내 이름 구슬 1개 · 하나라도 골인하면 통과!'),
            h('li', {}, '매 판 꼴찌가 그 상품을 받고 퇴장 — 오래 살아남을수록 큰 상품'),
            h('li', {}, '마지막 2명은 🏆 1등 결승전!')
          ]),
          prizes.length !== pool.length ? h('p', { class: 'warn' },
            '⚠ 상품 ' + prizes.length + '개 · 참가자 ' + pool.length + '명 — 같은 수로 맞춰 주세요 (G 설정)') : null,
          h('div', { class: 'marble-list' }, pool.map(p => h('div', { class: 'marble-row' }, [
            h('span', { class: 'marble-name' }, nameOf(p.id)),
            h('span', { class: 'dots', style: { color: colorOf[p.id] } }, '●'.repeat(Math.min(p.count, 24))),
            h('b', {}, '×' + p.count)
          ])))
        ]));
      }

      function hud(r) {
        const isFinal = r === races - 1;
        return h('div', { class: 'roulette-hud' }, isFinal
          ? ['🏆 결승전  ·  ', h('span', { class: 'gold' }, prizes[r + 1] || prizes[r])]
          : ['🎁 ' + (r + 1) + '번째 상품  ·  ', h('span', { class: 'gold' }, prizes[r]), '  ·  꼴찌가 받아요!']);
      }

      function chips(me) {
        me.chips.innerHTML = '';
        me.poolIds.forEach(id => {
          const done = me.finished.indexOf(id) >= 0;
          me.chips.appendChild(h('span', { class: 'race-chip' + (done ? ' done' : ''), style: { borderColor: colorOf[id] } },
            (done ? '✔ ' : '') + nameOf(id)));
        });
      }

      function play(canvas, pool, r, wrap, status, chipBox) {
        const me = Object.assign(createRace(M, pool), { camY: 0, raf: 0, r, wrap, status, chips: chipBox });
        race = me;
        chips(me);
        const ctx = canvas.getContext('2d');

        function drawBody(b, color) {
          ctx.fillStyle = color || (b.label === 'peg' ? '#ffcf5a' : b.label === 'rotor' ? '#f783ac' : '#6c4fb3');
          ctx.beginPath();
          if (b.circleRadius) ctx.arc(b.position.x, b.position.y, b.circleRadius, 0, Math.PI * 2);
          else b.vertices.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
          ctx.closePath();
          ctx.fill();
        }

        function draw() {
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
          }
          const lead = me.marbles.reduce((a, m) => (!a || m.position.y > a.position.y ? m : a), null);
          const scale = canvas.width / W, viewH = canvas.height / scale;
          const target = me.started && lead ? Math.min(Math.max(lead.position.y - viewH * 0.55, 0), H - viewH) : 0;
          me.camY += (target - me.camY) * 0.08;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = '#140a24';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(scale, 0, 0, scale, 0, -me.camY * scale);
          const top = me.camY - 60, bottom = me.camY + viewH + 60;

          const fy = me.track.finishY;
          for (let x = 0; x < W; x += 40) for (let row = 0; row < 2; row++) {
            ctx.fillStyle = (x / 40 + row) % 2 ? '#ffffff' : '#222222';
            ctx.fillRect(x, fy + row * 20, 40, 20);
          }
          ctx.fillStyle = '#ffcf5a';
          ctx.font = 'bold 80px "Malgun Gothic", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏁 GOAL', W / 2, fy + 140);

          me.track.bodies.forEach(b => {
            if (b.label !== 'wall' && b.bounds.max.y > top && b.bounds.min.y < bottom) drawBody(b);
          });
          if (!me.started) drawBody(me.gate, '#ffcf5a');

          me.marbles.forEach(m => {
            const r = m.circleRadius, isLead = me.started && m === lead;
            ctx.beginPath();
            ctx.arc(m.position.x, m.position.y, r, 0, Math.PI * 2);
            ctx.fillStyle = colorOf[m.pid];
            ctx.fill();
            ctx.lineWidth = isLead ? 6 : 2;
            ctx.strokeStyle = isLead ? '#ffffff' : 'rgba(0,0,0,.45)';
            ctx.stroke();
            ctx.fillStyle = '#111';
            ctx.font = 'bold ' + Math.round(r * 0.8) + 'px "Malgun Gothic", sans-serif';
            ctx.fillText(labelOf[m.pid], m.position.x, m.position.y + 1);
          });
        }

        function frame() {
          if (race !== me) return;
          const newly = tick(M, me);
          if (newly.length) {
            chips(me);
            if (!raceOver(me)) status.textContent = '✔ ' + newly.map(nameOf).join(', ') + ' 통과!  ·  남은 사람 ' + (me.poolIds.length - me.finished.length) + '명';
          }
          if (newly.length && raceOver(me)) finish(me);
          draw();
          me.raf = requestAnimationFrame(frame);
        }
        me.raf = requestAnimationFrame(frame);
      }

      function finish(me) {
        Logic.survivalResult(me.poolIds, me.finished, prizes, me.r).forEach(x => {
          S.state.roulette[x.index] = { prize: x.prize, id: x.id };
        });
        S.save();
        me.wrap.appendChild(resultCard(me.r));
        me.status.textContent = 'Space / → 다음';
      }

      function roundStep(r) {
        if (S.state.roulette[r]) {
          stage.appendChild(h('div', { class: 'roulette' }, [hud(r), resultCard(r),
            h('p', { class: 'hint' }, 'R: 이 판부터 다시 · → 다음')]));
          return;
        }
        const pool = Logic.marblePool(S.state.players, S.state.coins, S.state.roulette.slice(0, r).map(x => x.id));
        const total = pool.reduce((s, p) => s + p.count, 0);
        const canvas = h('canvas', {});
        const status = h('div', { class: 'roulette-status' }, pool.length + '명 · 구슬 ' + total + '개 대기 중 · Space 로 출발!');
        const chipBox = h('div', { class: 'race-chips' });
        const wrap = h('div', { class: 'roulette' }, [canvas, hud(r), chipBox, status]);
        stage.appendChild(wrap);
        play(canvas, pool, r, wrap, status, chipBox);
      }

      const render = i => {
        stopRace();
        stage.innerHTML = '';
        if (i === 0) intro();
        else roundStep(i - 1);
      };
      const racing = () => race && race.started && !raceOver(race);
      const ctl = root.UI.stepper(count, opts.fromEnd, render, () => !racing());

      const baseNext = ctl.next;
      ctl.next = () => {
        const i = ctl.index();
        if (i >= 1 && !S.state.roulette[i - 1]) return true; // 레이스 전에는 못 넘어감
        return baseNext();
      };
      ctl.key = e => {
        const i = ctl.index(), k = e.key.toLowerCase();
        if (e.key === ' ') {
          if (race && !race.started) {
            startRace(M, race);
            race.status.textContent = '달려라~! 🏃';
          } else if (!racing()) {
            root.App.step(1);
          }
          return true;
        }
        if ((k === 'r' || k === 'ㄱ') && i >= 1 && !racing() && S.state.roulette[i - 1]) {
          S.state.roulette = S.state.roulette.slice(0, i - 1);
          S.save();
          render(i);
          return true;
        }
        return false;
      };
      ctl.destroy = stopRace;
      return ctl;
    }
  };
})(this);
