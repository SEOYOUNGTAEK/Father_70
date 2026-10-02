// 엔딩 — 축하 메시지 + 상품 결과 + 꽃잎
(function (root) {
  'use strict';
  const h = root.UI.h;

  root.Scenes.ending = {
    create(stage) {
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
      return { next: () => false, prev: () => false };
    }
  };
})(this);
