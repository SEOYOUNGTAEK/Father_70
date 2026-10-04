// 추억극장 — 챕터 제목 카드 + 폴라로이드 사진 슬라이드 (모든 폴더 사진을 기간별로 날짜순 섞음)
(function (root) {
  'use strict';
  const h = root.UI.h;
  const isVideo = src => /\.mp4$/i.test(src);
  const chapters = arg => root.Logic.chaptersWithPhotos(root.PARTY_CONFIG.memories[arg] || [], root.PHOTOS || {});

  // "2025년 8월 · 태국 치앙마이" 처럼 사진 아래에 붙는 설명
  function caption(p) {
    const m = /^(\d{4})-(\d{2})/.exec(p.date || '');
    // 옛날 사진(폴더 연도로 맞춘 날짜 '…-01-01 00:00')은 날짜를 표시하지 않음
    const when = m && !/-01-01 00:00$/.test(p.date) ? m[1] + '년 ' + Number(m[2]) + '월' : '';
    const label = (root.PARTY_CONFIG.folderLabels || {})[p.folder] || '';
    return [when, label].filter(Boolean).join(' · ');
  }

  root.Scenes.memories = {
    skip: arg => chapters(arg).length === 0,
    create(stage, arg, opts) {
      const slides = [];
      chapters(arg).forEach(c => {
        const photos = root.Logic.photosForChapter(root.PHOTOS, c);
        slides.push({ type: 'title', chapter: c, count: photos.length });
        photos.forEach(p => slides.push({ type: 'photo', src: p.src, photo: p }));
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
            h('p', {}, s.count + '장의 추억')
          ]));
          stage.appendChild(root.UI.actionBtn('사진 보기 ▶'));
          return;
        }
        // 사진 오른쪽(⅔)을 탭하면 다음, 왼쪽(⅓)은 이전
        stage.appendChild(h('div', { class: 'memory-photo', onclick: e => root.App.step(e.clientX < innerWidth / 3 ? -1 : 1) }, [
          isVideo(s.src) ? h('div', { class: 'blur-bg video-bg' }) : h('img', { class: 'blur-bg', src: s.src, alt: '' }),
          h('div', { class: 'frame kb-' + 'abcd'[(n++) % 4] }, [
            h('div', { class: 'tape' }),
            isVideo(s.src) ? h('video', { src: s.src, autoplay: true, loop: true, muted: true, playsinline: true, controls: true, onclick: e => e.stopPropagation() }) : h('img', { src: s.src, alt: '' }),
            h('div', { class: 'memory-caption' }, caption(s.photo))
          ])
        ]));
        const next = slides[i + 1];
        if (next && next.src && !isVideo(next.src)) new Image().src = next.src;
      };
      return root.UI.stepper(slides.length, opts.fromEnd, render);
    }
  };
})(this);
