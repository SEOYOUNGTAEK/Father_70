// 오늘의 순서 — 게임으로 코인 모으기 → 코인만큼 구슬 → 상품 시상식, 중간중간 추억극장
(function (root) {
  'use strict';
  const h = root.UI.h;

  const STEPS = [
    ['🎬', '추억극장', 'memory'],
    ['📸', '할아버지\n인생 퀴즈', 'game'],
    ['🎬', '추억극장', 'memory'],
    ['🔍', '확대\n사진 퀴즈', 'game'],
    ['🎬', '추억극장', 'memory'],
    ['⏱', '7초\n맞추기', 'game'],
    ['🏁', '1등 레이스\n· 선물', 'prize'],
    ['🥇', '할아버지\n특별 시상식', 'prize']
  ];

  root.Scenes.guide = {
    create(stage) {
      stage.appendChild(h('div', { class: 'guide' }, [
        h('h1', { class: 'guide-title' }, '오늘의 순서 🎉'),
        h('div', { class: 'guide-flow' }, STEPS.map(([icon, label, kind], i) => [
          i ? h('span', { class: 'guide-arrow' }, '›') : null,
          h('div', { class: 'guide-step ' + kind }, [h('div', { class: 'guide-icon' }, icon), h('div', { class: 'guide-label' }, label)])
        ]).flat().filter(Boolean)),
        h('div', { class: 'guide-cards' }, [
          h('div', { class: 'guide-card' }, [
            h('div', { class: 'guide-num' }, '1'),
            h('b', {}, '게임 3개로 코인 🪙 모으기'),
            h('p', {}, '팀이 맞히면 팀원 모두 코인! ⭐ 아이가 맞히면 2배')
          ]),
          h('div', { class: 'guide-card' }, [
            h('div', { class: 'guide-num' }, '2'),
            h('b', {}, '코인 1개 = 내 이름 구슬 1개'),
            h('p', {}, '마지막에 구슬 레이스를 딱 한 번! 1등을 뽑아요')
          ]),
          h('div', { class: 'guide-card hot' }, [
            h('div', { class: 'guide-num' }, '3'),
            h('b', {}, '코인이 많을수록 1등 확률 UP!'),
            h('p', {}, '🏆 1등은 선물을 하나 더! 그리고 모두 선물을 받아요')
          ])
        ]),
        h('p', { class: 'guide-note' }, '🎬 게임 사이사이에는 우리 가족 추억 사진을 함께 봐요')
      ]));
      stage.appendChild(root.UI.actionBtn('시작! ▶'));
      return { next: () => false, prev: () => false };
    }
  };
})(this);
