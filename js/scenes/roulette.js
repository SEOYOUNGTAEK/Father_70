// 상품 시상식(마블 룰렛) — 레이스 한 번으로 1등만 뽑고(보너스 선물 하나 더), 바로 모두에게 선물 전달식
// 코인 1개 = 이름 구슬 1개. 당첨자는 빠지고 다음 상품으로. 마지막 1명은 자동 당첨.
(function (root) {
  'use strict';
  const h = root.UI.h;
  const W = 1600, H = 6400, GATE_Y = 640, GRAVITY = 1.7, MAX_SPEED = 32, TIMEOUT_FRAMES = 60 * 45;
  const SLOW_SCALE = 0.36, ZOOM_IN = 1.6; // 역전 구간 슬로모션 배속과 카메라 확대 배율
  const PALETTE = ['#ef6f5e', '#f4b942', '#7cc48a', '#5aa3e0', '#b48ad8', '#f2924a', '#4fbfaa', '#f08fb0', '#a7c957', '#8da0e8'];

  // 핀 구간 → 지그재그 경사로 → 회전 막대 를 쌓고, 마지막에 깔때기 → 역전 구간(풍차·범퍼) → 결승선
  function buildTrack(M) {
    const B = M.Bodies, bodies = [], rotors = [];
    const wall = { isStatic: true, restitution: 0.3, friction: 0, label: 'wall' };
    bodies.push(B.rectangle(-40, H / 2, 80, H * 1.2, wall), B.rectangle(W + 40, H / 2, 80, H * 1.2, wall),
      B.rectangle(W / 2, H + 40, W * 1.2, 80, wall));
    let y = 760, k = 0;
    const SIZES = [625, 760, 400];
    while (y + SIZES[k % 3] < H - 2050) {
      const kind = k % 3;
      if (kind === 0) {
        for (let r = 0; r < 5; r++)
          for (let x = r % 2 ? 120 : 60; x < W - 30; x += 120)
            bodies.push(B.circle(x, y + r * 95, 11, { isStatic: true, restitution: 0.7, label: 'peg' }));
        y += 5 * 95 + 150;
      } else if (kind === 1) {
        bodies.push(B.rectangle(W * 0.4, y, W * 0.85, 40, { isStatic: true, angle: 0.22, friction: 0.0005, label: 'ramp' }));
        bodies.push(B.rectangle(W * 0.6, y + 360, W * 0.85, 40, { isStatic: true, angle: -0.22, friction: 0.0005, label: 'ramp' }));
        y += 760;
      } else {
        [0.2, 0.5, 0.8].forEach((fx, n) => {
          const bar = B.rectangle(W * fx, y, 300, 22, { isStatic: true, label: 'rotor' });
          bar.spin = (n % 2 ? 1 : -1) * 0.045;
          rotors.push(bar);
          bodies.push(bar);
        });
        y += 400;
      }
      k++;
    }
    // 결승 깔때기: 가운데 좁은 구멍으로 한 줄로 몰리게
    const fy = H - 1800;
    bodies.push(B.rectangle(W * 0.225, fy, W * 0.5, 34, { isStatic: true, angle: 0.35, friction: 0.0005, label: 'ramp' }));
    bodies.push(B.rectangle(W * 0.775, fy, W * 0.5, 34, { isStatic: true, angle: -0.35, friction: 0.0005, label: 'ramp' }));

    // 역전 구간 — 풍차가 선두를 쳐 올리고, 범퍼가 튕겨내서 순위가 뒤집힐 수 있게
    const mill = (x, y, len, spin) => {
      const m = M.Body.create({ parts: [B.rectangle(x, y, len, 22), B.rectangle(x, y, 22, len)], label: 'mill' });
      M.Body.setStatic(m, true);
      m.spin = spin;
      rotors.push(m);
      bodies.push(m);
    };
    const bumper = (x, y) => bodies.push(B.circle(x, y, 30, { isStatic: true, restitution: 1.15, label: 'bumper' }));
    mill(W * 0.36, H - 1480, 340, 0.05);
    mill(W * 0.64, H - 1480, 340, -0.05);
    [0.14, 0.32, 0.5, 0.68, 0.86].forEach(fx => bumper(W * fx, H - 1210));
    [0.23, 0.41, 0.59, 0.77].forEach(fx => bumper(W * fx, H - 1060));
    mill(W * 0.5, H - 760, 460, 0.035);
    mill(W * 0.13, H - 720, 220, -0.06);
    mill(W * 0.87, H - 720, 220, 0.06);
    return { bodies, rotors, finishY: H - 380, slowY: fy + 150 };
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
    engine.gravity.y = GRAVITY;
    const track = buildTrack(M);
    const gate = M.Bodies.rectangle(W / 2, GATE_Y, W, 20, { isStatic: true, label: 'gate' });
    const marbles = spawnMarbles(M, pool);
    M.Composite.add(engine.world, track.bodies.concat([gate], marbles));
    return { engine, track, gate, marbles, winner: null, started: false, slow: false, frames: 0 };
  }

  function startRace(M, race) {
    race.started = true;
    M.Composite.remove(race.engine.world, race.gate);
  }

  const leaderOf = marbles => marbles.reduce((a, m) => (!a || m.position.y > a.position.y ? m : a), null);

  // 한 프레임 진행. 이번 프레임에 당첨자가 정해지면 그 id 를 돌려준다.
  function tick(M, race) {
    M.Engine.update(race.engine, 1000 / 60);
    const ts = race.engine.timing.timeScale; // 슬로모션 중엔 회전 막대도 같이 느리게
    race.track.rotors.forEach(b => M.Body.setAngle(b, b.angle + b.spin * ts));
    if (!race.started || race.winner) return null;
    race.frames++;
    race.marbles.forEach(m => {
      const v = m.velocity, sp = Math.hypot(v.x, v.y);
      if (sp > MAX_SPEED) M.Body.setVelocity(m, { x: v.x / sp * MAX_SPEED, y: v.y / sp * MAX_SPEED });
    });
    // 6초가 지나면 멈춰 있는 구슬을 살짝 튕겨 준다
    if (race.frames > 360 && race.frames % 60 === 0) {
      race.marbles.forEach(m => {
        if (m.speed < 0.5) M.Body.applyForce(m, m.position, { x: (Math.random() - 0.5) * m.mass * 0.02, y: -m.mass * 0.015 });
      });
    }
    const lead = leaderOf(race.marbles);
    // 선두가 깔때기에 들어서면 슬로모션
    if (!race.slow && lead.position.y > race.track.slowY) {
      race.slow = true;
      race.engine.timing.timeScale = SLOW_SCALE;
      race.slowLeader = lead.pid; // 역전 여부 확인용
    }
    // 골인했거나, 너무 오래 걸리면 제일 앞선 구슬이 당첨
    if (lead.position.y > race.track.finishY || race.frames > TIMEOUT_FRAMES) race.winner = lead.pid;
    return race.winner;
  }

  // 구슬에 쓸 짧은 이름: 세 글자 이름은 뒤 두 글자, 그 외 앞 두 글자
  const shortName = name => {
    const s = name.replace(/\s/g, '');
    return s.length === 3 ? s.slice(1) : s.slice(0, 2);
  };

  root.Scenes.roulette = {
    _sim: { createRace, startRace, tick }, // 화면 없이 레이스를 점검할 때 사용
    create(stage, arg, opts) {
      const S = root.Store, M = root.Matter, Logic = root.Logic;
      const prizes = S.state.prizes, count = 3; // 소개 → 1등 레이스 → 선물 전달식
      const colorOf = {}, labelOf = {};
      S.state.players.forEach((p, n) => { colorOf[p.id] = PALETTE[n % PALETTE.length]; labelOf[p.id] = p.short || shortName(p.name); });
      const nameOf = id => (S.player(id) || {}).name || '?';
      // 상품 이름이 이모지로 시작하지 않으면 🏆/🎁 를 붙인다
      const withIcon = (prize, r) => (/^\p{Extended_Pictographic}/u.test(prize) ? '' : r === 0 ? '🏆 ' : '🎁 ') + prize;
      let race = null;

      function stopRace() {
        if (!race) return;
        cancelAnimationFrame(race.raf);
        M.Composite.clear(race.engine.world, false);
        M.Engine.clear(race.engine);
        race = null;
      }

      function resultCard(r) {
        const res = S.state.roulette[r];
        return h('div', { class: 'winner' }, [
          h('div', { class: 'winner-prize' }, withIcon(res.prize, r)),
          h('div', { class: 'who', style: { color: colorOf[res.id] } }, nameOf(res.id)),
          h('div', { class: 'what' }, res.auto ? '마지막 선물은 자동으로! 🎉' : r === 0 ? '1등! 보너스 선물까지 하나 더! 🎉🎉' : '당첨! 축하해요 🎉')
        ]);
      }

      function intro() {
        const pool = Logic.marblePool(S.state.players, S.state.coins, []);
        stage.appendChild(h('div', { class: 'game-intro' }, [
          h('div', { class: 'game-no' }, 'FINALE'),
          h('h1', {}, '🎁 상품 시상식'),
          h('ul', { class: 'rules' }, [
            h('li', {}, '코인 1개 = 내 이름 구슬 1개'),
            h('li', {}, '제일 먼저 골인한 구슬의 주인이 당첨!'),
            h('li', {}, '레이스는 딱 한 번! 🏆 1등은 보너스 선물 하나 더!'),
            h('li', {}, '그리고 모두에게 선물을 드려요 🎁')
          ]),
          h('div', { class: 'marble-list' }, pool.map(p => h('div', { class: 'marble-row' }, [
            h('span', { class: 'marble-name' }, nameOf(p.id)),
            h('span', { class: 'dots', style: { color: colorOf[p.id] } }, '●'.repeat(Math.min(p.count, 24))),
            h('b', {}, '×' + p.count)
          ])))
        ]));
        stage.appendChild(root.UI.actionBtn('1등 레이스 ▶'));
      }

      const hud = () => h('div', { class: 'roulette-hud' },
        [h('span', { class: 'gold' }, '🏆 1등은 누구? — 보너스 선물 하나 더!')]);

      function play(canvas, pool, r, wrap, status) {
        const me = Object.assign(createRace(M, pool), { camX: 0, camY: 0, zoom: 1, raf: 0, r, wrap, status, slowShown: false });
        race = me;
        const ctx = canvas.getContext('2d');

        function drawBody(b, color) {
          const fill = color || { peg: '#d38f1f', rotor: '#c8553d', mill: '#c8553d', bumper: '#e58f9e' }[b.label] || '#b98a5e';
          const shapes = b.parts.length > 1 ? b.parts.slice(1) : [b]; // 풍차처럼 여러 조각인 몸체
          shapes.forEach(part => {
            ctx.fillStyle = fill;
            ctx.beginPath();
            if (part.circleRadius) ctx.arc(part.position.x, part.position.y, part.circleRadius, 0, Math.PI * 2);
            else part.vertices.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
            ctx.closePath();
            ctx.fill();
          });
          if (b.label === 'bumper') {
            ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
            ctx.beginPath(); ctx.arc(b.position.x, b.position.y, b.circleRadius - 8, 0, Math.PI * 2); ctx.stroke();
          }
          if (b.label === 'mill') {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(b.position.x, b.position.y, 12, 0, Math.PI * 2); ctx.fill();
          }
        }

        function draw() {
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
          }
          const lead = leaderOf(me.marbles);
          // 슬로모션이면 선두 쪽으로 확대
          me.zoom += ((me.slow ? ZOOM_IN : 1) - me.zoom) * 0.05;
          const scale = canvas.width / W * me.zoom, viewW = W / me.zoom, viewH = canvas.height / scale;
          const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
          const targetY = me.started && lead ? clamp(lead.position.y - viewH * (me.slow ? 0.5 : 0.55), 0, H - viewH) : 0;
          const targetX = lead ? clamp(lead.position.x - viewW / 2, 0, W - viewW) : 0;
          me.camY += (targetY - me.camY) * 0.12;
          me.camX += (targetX - me.camX) * 0.1;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = '#fbf3e4';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(scale, 0, 0, scale, -me.camX * scale, -me.camY * scale);
          const top = me.camY - 60, bottom = me.camY + viewH + 60;

          const fy = me.track.finishY;
          for (let x = 0; x < W; x += 40) for (let row = 0; row < 2; row++) {
            ctx.fillStyle = (x / 40 + row) % 2 ? '#ffffff' : '#4a3426';
            ctx.fillRect(x, fy + row * 20, 40, 20);
          }
          ctx.fillStyle = '#c8553d';
          ctx.font = 'bold 80px "Gowun Dodum", "Malgun Gothic", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏁 GOAL', W / 2, fy + 120);

          me.track.bodies.forEach(b => {
            if (b.label !== 'wall' && b.bounds.max.y > top && b.bounds.min.y < bottom) drawBody(b);
          });
          if (!me.started) drawBody(me.gate, '#d38f1f');

          me.marbles.forEach(m => {
            const r = m.circleRadius, isLead = me.started && m === lead;
            ctx.beginPath();
            ctx.arc(m.position.x, m.position.y, r, 0, Math.PI * 2);
            ctx.fillStyle = colorOf[m.pid];
            ctx.fill();
            ctx.lineWidth = isLead ? 6 : 2;
            ctx.strokeStyle = isLead ? '#4a3426' : 'rgba(74,52,38,.35)';
            ctx.stroke();
            ctx.fillStyle = '#3a2618';
            ctx.font = 'bold ' + Math.round(r * 0.8) + 'px "Gowun Dodum", "Malgun Gothic", sans-serif';
            ctx.fillText(labelOf[m.pid], m.position.x, m.position.y + 1);
          });
        }

        // 화면 주사율(60/120/144Hz)과 상관없이 실제 시간 기준 60번/초로 물리 진행
        let last = performance.now(), acc = 0;
        function frame(now) {
          if (race !== me) return;
          acc = Math.min(acc + (now - last), 1000 / 60 * 4);
          last = now;
          while (acc >= 1000 / 60) {
            acc -= 1000 / 60;
            const had = me.winner;
            tick(M, me); // 당첨 뒤에도 구슬은 계속 굴러가게
            if (!had && me.winner) finish(me);
          }
          if (me.slow && !me.slowShown && !me.winner) {
            me.slowShown = true;
            wrap.classList.add('slowmo');
            status.textContent = '🌀 역전 구간! 두근두근… 🥁';
          }
          draw();
          me.raf = requestAnimationFrame(frame);
        }
        me.raf = requestAnimationFrame(frame);
      }

      function finish(me) {
        S.state.roulette[me.r] = { prize: prizes[me.r], id: me.winner };
        S.save();
        me.wrap.appendChild(resultCard(me.r));
        me.status.textContent = '화면을 터치하면 선물 전달식 🎁';
      }

      function roundStep(r) {
        if (!S.state.roulette[r]) {
          const pool = Logic.marblePool(S.state.players, S.state.coins, S.state.roulette.slice(0, r).map(x => x.id));
          if (pool.length === 1) {
            S.state.roulette[r] = { prize: prizes[r], id: pool[0].id, auto: true };
            S.save();
          } else {
            const total = pool.reduce((s, p) => s + p.count, 0);
            const canvas = h('canvas', {});
            const status = h('div', { class: 'roulette-status' }, pool.length + '명 · 구슬 ' + total + '개 대기 중 · 화면을 터치하면 출발!');
            // 범례: 누가 무슨 색 구슬인지 (구슬 많은 순)
            const legend = h('div', { class: 'legend' }, pool.slice().sort((a, b) => b.count - a.count).map(p =>
              h('div', { class: 'legend-row' }, [
                h('span', { class: 'legend-dot', style: { background: colorOf[p.id] } }, labelOf[p.id]),
                h('span', { class: 'legend-name' }, nameOf(p.id)),
                h('span', { class: 'legend-count' }, '×' + p.count)
              ])));
            const wrap = h('div', { class: 'roulette' }, [canvas, hud(), legend, status]);
            wrap.addEventListener('click', () => ctl.key({ key: ' ' })); // 폰: 탭으로 출발/다음
            stage.appendChild(wrap);
            play(canvas, pool, r, wrap, status);
            return;
          }
        }
        stage.appendChild(h('div', { class: 'roulette', onclick: () => root.App.step(1) }, [hud(), resultCard(r),
          h('p', { class: 'hint' }, '화면을 터치하면 선물 전달식 🎁')]));
      }

      // 선물 전달식 — 1등 축하 + 모두에게 준비한 선물 전달
      function gifts() {
        const win = S.state.roulette[0];
        const others = S.state.players.filter(p => !win || p.id !== win.id);
        stage.appendChild(h('div', { class: 'gifts' }, [
          h('div', { class: 'game-no' }, 'GIFT'),
          h('h1', {}, '🎁 선물 전달식'),
          win ? h('div', { class: 'gift-winner' }, [
            h('span', { class: 'gift-crown' }, '🏆'),
            h('b', { style: { color: colorOf[win.id] } }, nameOf(win.id)),
            h('span', {}, ' 님은 보너스 선물까지 두 개!')
          ]) : null,
          h('p', { class: 'gift-sub' }, '오늘 함께해 준 모두에게 선물을 드려요 💝'),
          h('div', { class: 'gift-names' }, others.map(p => h('span', { class: 'chip gift-chip' }, '🎁 ' + p.name)))
        ]));
        stage.appendChild(root.UI.actionBtn('✨ 특별 시상식으로'));
      }

      // 연습·확인용: 룰렛을 다 안 돌려도 엔딩으로 바로 가는 버튼
      const skipBtn = () => h('button', { class: 'skip-btn', onclick: e => {
        e.stopPropagation();
        root.App.go(root.App.FLOW.length - 1);
      } }, '특별 시상식으로 건너뛰기 ⏭');

      const render = i => {
        stopRace();
        stage.innerHTML = '';
        if (i === 0) intro();
        else if (i === 1) roundStep(0);
        else gifts();
        stage.appendChild(skipBtn());
      };
      const racing = () => race && race.started && !race.winner;
      const ctl = root.UI.stepper(count, opts.fromEnd, render, () => !racing());

      const baseNext = ctl.next;
      ctl.next = () => {
        const i = ctl.index();
        if (i === 1 && !S.state.roulette[0]) return true; // 1등이 정해지기 전에는 못 넘어감
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
        if ((k === 'r' || k === 'ㄱ') && i === 1 && !racing() && S.state.roulette[0]) {
          S.state.roulette = [];
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
