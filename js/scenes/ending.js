// 할아버지 특별 시상식 — 전환 화면 → 손주 상장 → 자녀 감사패 → ATM 부상 → 케이크
(function (root) {
  'use strict';
  const h = root.UI.h;

  const today = () => {
    const d = new Date();
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  };

  function certificate(c) {
    return h('div', { class: 'cert ' + (c.tone || 'fun') }, [
      h('div', { class: 'cert-inner' }, [
        h('div', { class: 'cert-head' }, c.head || '상 장'),
        h('div', { class: 'cert-title' }, c.title),
        h('div', { class: 'cert-to' }, c.to + ' 귀하'),
        h('p', { class: 'cert-body' }, c.body),
        h('div', { class: 'cert-date' }, c.date || today()),
        h('div', { class: 'cert-from' }, [c.from, h('span', { class: 'cert-seal' }, c.seal || '손주')])
      ])
    ]);
  }

  // 케이크 화면 — 불 끄고 금메달 케이크 입장, 노래·촛불·단체 사진 (조용한 화면)
  function celebration(stage) {
    const sparkles = Array.from({ length: 22 }, () => h('span', { class: 'petal', style: {
      left: Math.random() * 100 + 'vw',
      animationDuration: 8 + Math.random() * 7 + 's',
      animationDelay: -Math.random() * 12 + 's',
      fontSize: 1.2 + Math.random() * 1.4 + 'rem'
    } }, ['✨', '🌸', '✨', '🥇'][Math.floor(Math.random() * 4)]));
    const candles = h('div', { class: 'candles' }, Array.from({ length: 7 }, (_, k) =>
      h('div', { class: 'candle', style: { animationDelay: (-k * 0.37) + 's' } }, h('span', { class: 'flame' }))));
    stage.appendChild(h('div', { class: 'ending cake-scene' }, sparkles.concat([
      candles,
      h('h1', { class: 'cake-title' }, ['아빠의 인생은 ', h('span', { class: 'gold-word' }, '‘금’'), ' 메달 🥇']),
      h('p', { class: 'cake-love' }, '사랑해요 ❤️'),
      h('p', { class: 'hint' }, '🎂 생일 축하 노래 · 촛불 끄고 · 📸 다 같이 단체 사진!'),
      h('p', { class: 'credit' }, 'Music: Kevin MacLeod (incompetech.com) · Licensed under Creative Commons: By Attribution 4.0')
    ])));
  }

  // 부상 수여 — 금메달 VIP 카드를 ATM 에 넣는 순간 '현금 인출!' 을 누르면 5만원권이 쏟아짐
  function reward(stage) {
    const card = h('div', { class: 'vip-card' }, [
      h('div', { class: 'vip-top' }, [h('span', { class: 'vip-brand' }, 'LIFE GOLD MEDAL'), h('span', { class: 'vip-hanja' }, '七旬')]),
      h('div', { class: 'vip-chip' }),
      h('div', { class: 'vip-no' }, '0070  ·  1984  ·  1004  ·  2026'),
      h('div', { class: 'vip-bottom' }, [h('span', { class: 'vip-name' }, '서강석 님'), h('span', { class: 'vip-grade' }, 'VIP 🥇')])
    ]);
    const box = h('div', { class: 'reward' }, [
      h('div', { class: 'reward-badge' }, '🥇 인생 금메달리스트에게 드리는 부상!'),
      card,
      h('p', { class: 'reward-hint' }, '할아버지, 카드를 ATM에 넣어 주세요 💳')
    ]);
    stage.appendChild(box);
    let btn;
    const cashOut = () => {
      btn.remove();
      box.classList.add('paid');
      root.Music.setMood('game');
      [0, 600, 1300, 2100].forEach(ms => setTimeout(() => root.Music.sfx('coins'), ms));
      box.querySelector('.reward-hint').textContent = '💰 잭팟! 인생 금메달 보너스 지급 완료!';
      const rain = h('div', { class: 'money-rain' });
      for (let k = 0; k < 46; k++) {
        rain.appendChild(h('div', { class: 'bill', style: {
          left: (Math.random() * 100) + 'vw',
          animationDuration: (2.6 + Math.random() * 2.6) + 's',
          animationDelay: (Math.random() * 2.5) + 's',
          '--spin': (Math.random() * 720 - 360) + 'deg',
          '--sway': (Math.random() * 16 - 8) + 'vw'
        } }, [h('span', { class: 'bill-num' }, '50000'), h('span', { class: 'bill-face' }), h('span', { class: 'bill-text' }, '오만원')]));
      }
      stage.appendChild(rain);
      stage.appendChild(h('div', { class: 'jackpot' }, '잭팟! 💸'));
      stage.appendChild(root.UI.actionBtn('다음 ▶'));
    };
    btn = root.UI.actionBtn('💸 현금 인출!', cashOut);
    stage.appendChild(btn);
  }

  // 특별 시상식으로 전환 — 어두운 무대 + 스포트라이트
  function spotlight(stage) {
    document.body.classList.add('stage-dark');
    stage.appendChild(h('div', { class: 'spotlight' }, [
      h('div', { class: 'spot-sub' }, '오늘의 주인공'),
      h('h1', { class: 'spot-title' }, '✨ 특별 시상식 ✨'),
      h('div', { class: 'spot-name' }, '서강석 할아버지'),
      h('p', { class: 'spot-hint' }, '할아버지, 앞으로 나와 주세요 👏')
    ]));
    stage.appendChild(root.UI.actionBtn('시상 시작 ▶'));
  }

  root.Scenes.ending = {
    create(stage, arg, opts) {
      const certs = root.CERTIFICATES || [];
      const ctl = root.UI.stepper(certs.length + 3, opts.fromEnd, i => {
        stage.innerHTML = '';
        document.body.classList.remove('stage-dark');
        root.Music.setMood(i === certs.length + 2 ? 'cake' : 'ceremony');
        if (i === 0) spotlight(stage);
        else if (i <= certs.length) {
          stage.appendChild(certificate(certs[i - 1]));
          stage.appendChild(root.UI.actionBtn('다음 ▶'));
        }
        else if (i === certs.length + 1) reward(stage);
        else celebration(stage);
      });
      ctl.destroy = () => document.body.classList.remove('stage-dark');
      return ctl;
    }
  };
})(this);
