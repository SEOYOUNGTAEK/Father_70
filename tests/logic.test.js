const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/lib/logic.js');

const players = [{ id: 'a1', team: 'A' }, { id: 'a2', team: 'A' }, { id: 'b1', team: 'B' }];

test('quizPoints: 아이 정답은 2배', () => {
  assert.equal(L.quizPoints(1, false), 1);
  assert.equal(L.quizPoints(1, true), 2);
  assert.equal(L.quizPoints(3, true), 6);
});

test('zoomPoints: 단계별 3,3,2,2,1', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(L.zoomPoints), [3, 3, 2, 2, 1]);
});

test('teamAward: 팀원 전원 지급, 원본 불변', () => {
  const coins = { a1: 1, a2: 0, b1: 5 };
  const out = L.teamAward(players, coins, 'A', 2);
  assert.deepEqual(out, { a1: 3, a2: 2, b1: 5 });
  assert.deepEqual(coins, { a1: 1, a2: 0, b1: 5 });
});

test('teamAward: 되돌리기(음수)는 0 아래로 내려가지 않음', () => {
  assert.deepEqual(L.teamAward(players, { a1: 1, a2: 0, b1: 0 }, 'A', -2), { a1: 0, a2: 0, b1: 0 });
});

test('sevenRanking: 오차순 정렬, 3/2/1 지급', () => {
  const rows = L.sevenRanking({ a: 7.3, b: 6.8, c: 7.9, d: 5.0 });
  assert.deepEqual(rows.map(r => r.id), ['b', 'a', 'c', 'd']);
  assert.deepEqual(rows.map(r => r.coins), [3, 2, 1, 0]);
  assert.equal(rows[0].diff, 0.2);
});

test('sevenRanking: ±0.05 이내 잭팟 7코인', () => {
  const rows = L.sevenRanking({ a: 7.04, b: 6.95, c: 7.2 });
  assert.deepEqual(rows.map(r => [r.id, r.jackpot, r.coins]), [['a', true, 7], ['b', true, 7], ['c', false, 1]]);
});

test('sevenRanking: 동점은 같은 순위', () => {
  const rows = L.sevenRanking({ a: 6.9, b: 7.1, c: 7.5 });
  assert.deepEqual(rows.map(r => [r.rank, r.coins]), [[1, 3], [1, 3], [3, 1]]);
});

test('marblePool: 최소 1개, 당첨자 제외', () => {
  const pool = L.marblePool(players, { a1: 4, a2: 0, b1: 2 }, ['b1']);
  assert.deepEqual(pool, [{ id: 'a1', count: 4 }, { id: 'a2', count: 1 }]);
});

test('choicePoints: 맞히면 1, 아이가 고르면 2, 틀리거나 미선택·정답 미정이면 0', () => {
  assert.equal(L.choicePoints({ pick: 2, kid: false }, 2), 1);
  assert.equal(L.choicePoints({ pick: 2, kid: true }, 2), 2);
  assert.equal(L.choicePoints({ pick: 1, kid: true }, 2), 0);
  assert.equal(L.choicePoints(undefined, 2), 0);
  assert.equal(L.choicePoints({ pick: 2, kid: false }, null), 0);
});

test('rescore: 이전 채점과의 차이만 반영 (다시 채점해도 중복 없음)', () => {
  const coins = { a1: 0, a2: 0, b1: 0 };
  const once = L.rescore(players, coins, {}, { A: 1, B: 0 });
  assert.deepEqual(once, { a1: 1, a2: 1, b1: 0 });
  const again = L.rescore(players, once, { A: 1, B: 0 }, { A: 1, B: 0 });
  assert.deepEqual(again, once);
  const changed = L.rescore(players, once, { A: 1, B: 0 }, { A: 0, B: 2 });
  assert.deepEqual(changed, { a1: 0, a2: 0, b1: 2 });
});

const manifest = {
  sis: [{ src: 's1.jpg', date: '2012-06-17' }, { src: 's2.jpg', date: '2024-06-02' }, { src: 's3.jpg', date: '2026-05-25' }],
  hanra: [{ src: 'h1.jpg', date: '2026-01-17' }, { src: 'h2.jpg', date: '2026-01-18' }],
  cm: [{ src: 'c1.jpg', date: '2025-02-10' }]
};

test('photosForChapter: 여러 폴더 사진을 기간으로 모아 날짜순 정렬', () => {
  const got = L.photosForChapter(manifest, { from: '2017', to: '2025' }).map(p => p.src);
  assert.deepEqual(got, ['s2.jpg', 'c1.jpg']);
  const now = L.photosForChapter(manifest, { from: '2026', to: '2026' }).map(p => p.src);
  assert.deepEqual(now, ['h1.jpg', 'h2.jpg', 's3.jpg']);
});

test('photosForChapter: 폴더로 지정한 챕터, 예전 문자열 목록도 지원', () => {
  assert.deepEqual(L.photosForChapter({ f: ['a.jpg'] }, { folder: 'f' }).map(p => p.src), ['a.jpg']);
});

test('chaptersWithPhotos: 사진 없는 챕터 제외', () => {
  const ch = [{ from: '2009', to: '2016' }, { from: '2017', to: '2018' }, { from: '2026', to: '2026' }];
  assert.deepEqual(L.chaptersWithPhotos(ch, manifest).map(c => c.from), ['2009', '2026']);
});
