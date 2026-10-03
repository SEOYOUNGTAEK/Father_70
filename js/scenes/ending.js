// 엔딩 — 손주 상장(웃음) → 자녀 감사패(감동) → 축하 메시지 + 상품 결과 + 꽃잎
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

  function celebration(stage) {
    const S = root.Store, results = S.state.roulette;
    const petals = Array.from({ length: 28 }, () => h('span', { class: 'petal', style: {
      left: Math.random() * 100 + 'vw',
      animationDuration: 6 + Math.random() * 6 + 's',
      animationDelay: -Math.random() * 10 + 's',
      fontSize: 1.4 + Math.random() * 1.6 + 'rem'
    } }, ['🌸', '🎉', '✨', '🪙'][Math.floor(Math.random() * 4)]));
    stage.appendChild(h('div', { class: 'ending' }, petals.concat([
      h('div', { class: 'hanja-wrap' }, h('div', { class: 'hanja' }, '七旬')),
      h('h1', { class: 'hero' }, '사랑하고 존경합니다'),
      h('p', { class: 'sub' }, S.state.heroTitle),
      results.length ? h('div', { class: 'prize-list' }, results.map(r => h('div', { class: 'prize-row' }, [
        h('span', {}, (/^\p{Extended_Pictographic}/u.test(r.prize) ? '' : '🎁 ') + r.prize),
        h('b', { style: { color: root.UI.teamColor((S.player(r.id) || {}).team || 'A') } }, (S.player(r.id) || {}).name || '?')
      ]))) : null,
      h('p', { class: 'hint' }, '📸 다 같이 단체 사진 찍어요!')
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

  root.Scenes.ending = {
    create(stage, arg, opts) {
      const certs = root.CERTIFICATES || [];
      return root.UI.stepper(certs.length + 2, opts.fromEnd, i => {
        stage.innerHTML = '';
        if (i < certs.length) {
          stage.appendChild(certificate(certs[i]));
          stage.appendChild(root.UI.actionBtn('다음 ▶'));
        }
        else if (i === certs.length) reward(stage);
        else celebration(stage);
      });
    }
  };
})(this);
