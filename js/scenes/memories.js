// 추억극장 — 챕터 제목 카드 + 켄 번즈 사진 슬라이드
(function (root) {
  'use strict';
  const h = root.UI.h;
  const chapters = arg => root.Logic.chaptersWithPhotos(root.PARTY_CONFIG.memories[arg] || [], root.PHOTOS || {});

  root.Scenes.memories = {
    skip: arg => chapters(arg).length === 0,
    create(stage, arg, opts) {
      const slides = [];
      chapters(arg).forEach(c => {
        slides.push({ type: 'title', chapter: c });
        root.PHOTOS[c.folder].forEach(src => slides.push({ type: 'photo', src, chapter: c }));
      });
      let n = 0;
      const render = i => {
        stage.innerHTML = '';
        const s = slides[i];
        if (s.type === 'title') {
          n = 0;
          stage.appendChild(h('div', { class: 'memory-title' }, [
            h('div', { class: 'memory-badge' }, '🎬 추억극장'),
            h('h1', {}, s.chapter.title),
            h('p', {}, root.PHOTOS[s.chapter.folder].length + '장의 추억')
          ]));
          return;
        }
        stage.appendChild(h('div', { class: 'memory-photo' }, [
          h('img', { class: 'blur-bg', src: s.src, alt: '' }),
          h('div', { class: 'frame kb-' + 'abcd'[(n++) % 4] }, [
            h('div', { class: 'tape' }),
            h('img', { src: s.src, alt: '' }),
            h('div', { class: 'memory-caption' }, s.chapter.title)
          ])
        ]));
        const next = slides[i + 1];
        if (next && next.src) new Image().src = next.src;
      };
      return root.UI.stepper(slides.length, opts.fromEnd, render);
    }
  };
})(this);
