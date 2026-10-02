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

test('survivalResult: 끝까지 못 들어온 사람이 이번 상품', () => {
  const out = L.survivalResult(['a', 'b', 'c'], ['b', 'c'], ['작은', '중간', '1등'], 0);
  assert.deepEqual(out, [{ index: 0, prize: '작은', id: 'a' }]);
});

test('survivalResult: 마지막 2명 결승은 먼저 들어온 사람이 1등', () => {
  const out = L.survivalResult(['a', 'b'], ['b'], ['작은', '2등', '1등'], 1);
  assert.deepEqual(out, [{ index: 1, prize: '2등', id: 'a' }, { index: 2, prize: '1등', id: 'b' }]);
});

test('survivalResult: 아직 여러 명 남았으면 null', () => {
  assert.equal(L.survivalResult(['a', 'b', 'c'], ['b'], ['x', 'y', 'z'], 0), null);
});

test('raceCount: 상품 n개면 레이스 n-1번 (결승에서 2개 결정)', () => {
  assert.equal(L.raceCount(8), 7);
  assert.equal(L.raceCount(1), 1);
});

test('chaptersWithPhotos: 사진 없는 챕터 제외', () => {
  const ch = [{ title: 'x', folder: 'f1' }, { title: 'y', folder: 'f2' }, { title: 'z', folder: 'f3' }];
  assert.deepEqual(L.chaptersWithPhotos(ch, { f1: ['a.jpg'], f2: [] }).map(c => c.folder), ['f1']);
});
