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

  root.Scenes.ending = {
    create(stage, arg, opts) {
      const certs = root.CERTIFICATES || [];
      return root.UI.stepper(certs.length + 1, opts.fromEnd, i => {
        stage.innerHTML = '';
        if (i < certs.length) {
          stage.appendChild(certificate(certs[i]));
          stage.appendChild(root.UI.actionBtn('다음 ▶'));
        }
        else celebration(stage);
      });
    }
  };
})(this);
