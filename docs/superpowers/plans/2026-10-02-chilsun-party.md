# 칠순잔치 게임쇼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 빔프로젝터로 띄우는 가족 게임쇼 웹앱 — 퀴즈 2종 + 7초 맞추기로 코인을 모으고, 추억극장 사진 슬라이드 후 마블 룰렛으로 상품 8개를 추첨한다.

**Architecture:** 빌드 없는 정적 사이트. `index.html`이 일반 `<script>`로 데이터(전역 변수)·순수 로직·상태·씬 파일을 차례로 로드하고, `js/app.js`의 라우터가 `FLOW` 순서대로 씬을 바꾼다. 씬은 `create(stage, arg, opts) → {next, prev, key?, destroy?}` 인터페이스. 순수 로직(`js/lib/logic.js`)만 Node로 단위 테스트한다.

**Tech Stack:** HTML/CSS/바닐라 JS, matter.js 0.20.0(벤더링), Python 3 + Pillow(사진 축소), Node 24 `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-02-chilsun-party-design.md`

## Global Constraints

- `file://`로 열어도 동작: ES 모듈·fetch 금지, 데이터는 `.js` 전역 변수(`window.PARTY_CONFIG`, `window.LIFE_QUIZ`, `window.ZOOM_QUIZ`, `window.PHOTOS`).
- 외부 네트워크 의존 0: matter.js는 `vendor/matter.min.js`로 포함, 웹폰트 없음(시스템 폰트).
- 원본 `photos/`는 커밋 금지(.gitignore). 축소본은 EXIF 제거, 슬라이드 긴 변 1920px, 확대퀴즈 2560px, JPEG q82.
- `<meta name="robots" content="noindex, nofollow">` + `robots.txt`(Disallow: /).
- 상태는 `localStorage` 키 `chilsun-party-v1`.
- 화면은 16:9 빔프로젝터 기준, 루트 폰트 `min(1.05vw, 1.87vh)`, 모든 크기 rem.
- 키: →/PageDown 다음, ←/PageUp 이전, S(ㄴ) 코인판, G(ㅎ) 설정, F(ㄹ) 전체화면, Esc 닫기, Space(7초·룰렛), R(ㄱ) 다시.
- 코인 규칙: 팀 정답 → 팀원 전원 +N, 아이 정답 → +2N. 확대퀴즈 N = 단계 1–2:3, 3–4:2, 5/공개:1. 7초: 1·2·3등 3·2·1, |오차|≤0.05 잭팟 7. 룰렛 구슬 = max(1, 코인).

## File Structure

```
index.html                 스크립트 로드 순서 정의
robots.txt
css/style.css              전체 스타일
data/config.js             참가자·팀·상품·추억극장 챕터 기본값
data/quiz.js               아빠 인생 퀴즈 문제
data/zoom.js               확대 사진 퀴즈 문제
assets/photos/manifest.js  (생성물) 폴더별 슬라이드 사진 목록
assets/photos/<폴더>/*.jpg (생성물)
vendor/matter.min.js
js/lib/logic.js            순수 계산(코인·순위·구슬) — Node/브라우저 겸용
js/state.js                Store: localStorage 상태
js/ui.js                   h(), toast, awardBar, 코인판, stepper
js/app.js                  FLOW·라우터·키 처리
js/scenes/*.js             opening, memories, quiz-life, quiz-zoom, seven, roulette, ending, setup
tools/build_photos.py      사진 축소·manifest 생성
tests/logic.test.js        node:test
tests/test_build_photos.py unittest
README.md                  실행·조작·데이터 수정법
```

---

### Task 1: 순수 로직 + 테스트

**Files:**
- Create: `js/lib/logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Produces: `Logic.quizPoints(base:number, kid:boolean):number`, `Logic.zoomPoints(stage:1..5):number`, `Logic.teamAward(players:{id,team}[], coins:{[id]:number}, team:'A'|'B', points:number):coins`(새 객체, 0 미만 금지), `Logic.sevenRanking(results:{[id]:seconds}):{id,seconds,diff,rank,jackpot,coins}[]`, `Logic.marblePool(players, coins, excludeIds:string[]):{id,count}[]`, `Logic.chaptersWithPhotos(chapters:{title,folder}[], manifest):chapters`. 브라우저에선 `window.Logic`, Node에선 `module.exports`.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/logic.test.js`

```js
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

test('chaptersWithPhotos: 사진 없는 챕터 제외', () => {
  const ch = [{ title: 'x', folder: 'f1' }, { title: 'y', folder: 'f2' }, { title: 'z', folder: 'f3' }];
  assert.deepEqual(L.chaptersWithPhotos(ch, { f1: ['a.jpg'], f2: [] }).map(c => c.folder), ['f1']);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/logic.test.js` → FAIL (`Cannot find module '../js/lib/logic.js'`)

- [ ] **Step 3: 구현** — `js/lib/logic.js`

```js
// 순수 계산 함수 모음 — 브라우저(window.Logic)와 Node(module.exports) 겸용
(function (root) {
  'use strict';
  const SEVEN_TARGET = 7, JACKPOT_TOL = 0.05, JACKPOT_COINS = 7, RANK_COINS = [3, 2, 1];

  function quizPoints(base, kid) { return kid ? base * 2 : base; }

  // stage 1 = 가장 크게 확대된 상태
  function zoomPoints(stage) { return stage <= 2 ? 3 : stage <= 4 ? 2 : 1; }

  function teamAward(players, coins, team, points) {
    const out = Object.assign({}, coins);
    players.forEach(p => { if (p.team === team) out[p.id] = Math.max(0, (out[p.id] || 0) + points); });
    return out;
  }

  function sevenRanking(results) {
    const rows = Object.keys(results).map(id => ({
      id, seconds: results[id],
      diff: Math.round(Math.abs(results[id] - SEVEN_TARGET) * 1000) / 1000
    }));
    rows.sort((a, b) => a.diff - b.diff);
    let rank = 0;
    rows.forEach((r, i) => {
      if (i === 0 || r.diff !== rows[i - 1].diff) rank = i + 1;
      r.rank = rank;
      r.jackpot = r.diff <= JACKPOT_TOL;
      r.coins = r.jackpot ? JACKPOT_COINS : (RANK_COINS[rank - 1] || 0);
    });
    return rows;
  }

  function marblePool(players, coins, excludeIds) {
    return players.filter(p => excludeIds.indexOf(p.id) < 0)
      .map(p => ({ id: p.id, count: Math.max(1, coins[p.id] || 0) }));
  }

  function chaptersWithPhotos(chapters, manifest) {
    return chapters.filter(c => (manifest[c.folder] || []).length > 0);
  }

  const api = { quizPoints, zoomPoints, teamAward, sevenRanking, marblePool, chaptersWithPhotos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(this);
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/logic.test.js` → 9 pass

- [ ] **Step 5: Commit** — `git add js/lib tests/logic.test.js && git commit -m "코인·순위·구슬 계산 로직 추가"`

---

### Task 2: 사진 파이프라인 + 벤더 라이브러리

**Files:**
- Create: `tools/build_photos.py`, `tests/test_build_photos.py`, `vendor/matter.min.js`, `robots.txt`
- Generates: `assets/photos/manifest.js`, `assets/photos/<폴더>/*.jpg`

**Interfaces:**
- Produces: `window.PHOTOS = { "<폴더>": ["assets/photos/<폴더>/<web_name>.jpg", ...] }`. `web_name("20260118_091534(0).JPG") == "20260118_091534_0.jpg"` — data 파일은 이 이름으로 사진을 참조한다.

- [ ] **Step 1: 실패하는 테스트** — `tests/test_build_photos.py`

```python
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import build_photos as bp


class WebNameTest(unittest.TestCase):
    def test_sanitizes(self):
        self.assertEqual(bp.web_name("20260118_091534(0).JPG"), "20260118_091534_0.jpg")
        self.assertEqual(bp.web_name("SNOW_20260126_070303_723.jpg"), "snow_20260126_070303_723.jpg")


class PicksTest(unittest.TestCase):
    def test_parses_folder_sections(self):
        text = "제목\n폴더: 2026-01_한라산\n\n20260117_165343.jpg   출발\n20260118_155457.jpg  족욕\n\n기타 설명 줄\n"
        self.assertEqual(bp.parse_picks(text), {"2026-01_한라산": ["20260117_165343.jpg", "20260118_155457.jpg"]})


class RefsTest(unittest.TestCase):
    def test_finds_refs(self):
        js = "x = [{ photo: 'assets/photos/2026-01_한라산/a_1.jpg' }, \"assets/photos/f/b.jpg\"]"
        self.assertEqual(bp.find_refs(js), {"2026-01_한라산/a_1.jpg", "f/b.jpg"})


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: 실패 확인** — Run: `python -m unittest tests/test_build_photos.py` → FAIL (`No module named 'build_photos'`)

- [ ] **Step 3: 구현** — `tools/build_photos.py`

```python
"""photos/ 원본을 웹용으로 줄여 assets/photos/ 에 저장하고 manifest.js 를 만든다.

- '_'로 시작하는 폴더는 건너뜀 (_제외)
- photos/베스트컷_목록.txt 의 '폴더: X' 아래 파일만 슬라이드에 사용, 없으면 폴더 전체(촬영시각 순)
- data/*.js 가 참조한 사진은 슬라이드에 없어도 변환 (확대퀴즈용 등은 2560px)
- EXIF(위치정보 포함)는 저장하지 않음
사용: python tools/build_photos.py
"""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "photos"
OUT = ROOT / "assets" / "photos"
EXTS = {".jpg", ".jpeg", ".png"}
SLIDE_PX, REF_PX, QUALITY = 1920, 2560, 82


def web_name(name):
    stem = re.sub(r"[^a-z0-9_-]+", "_", Path(name).stem.lower()).strip("_")
    return stem + ".jpg"


def parse_picks(text):
    picks, folder = {}, None
    for line in text.splitlines():
        m = re.match(r"\s*폴더:\s*(\S+)", line)
        if m:
            folder = m.group(1)
            picks.setdefault(folder, [])
            continue
        m = re.match(r"\s*(\S+\.(?:jpe?g|png))\b", line, re.I)
        if m and folder:
            picks[folder].append(m.group(1))
    return picks


def find_refs(js_text):
    return set(re.findall(r"assets/photos/([^'\"]+?\.jpg)", js_text))


def taken_key(path):
    from PIL import Image
    try:
        ex = Image.open(path).getexif()
        d = ex.get_ifd(0x8769).get(36867) or ex.get(306)
        if d:
            return str(d)
    except Exception:
        pass
    return path.name


def convert(src, dst, px):
    from PIL import Image, ImageOps
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((px, px), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)


def main():
    picks_file = SRC / "베스트컷_목록.txt"
    picks = parse_picks(picks_file.read_text(encoding="utf-8")) if picks_file.exists() else {}
    refs = set()
    for js in (ROOT / "data").glob("*.js"):
        refs |= find_refs(js.read_text(encoding="utf-8"))

    if OUT.exists():
        for d in OUT.iterdir():
            if d.is_dir():
                shutil.rmtree(d)
    manifest = {}
    for folder in sorted(d for d in SRC.iterdir() if d.is_dir() and not d.name.startswith("_")):
        files = {web_name(f.name): f for f in folder.iterdir() if f.suffix.lower() in EXTS}
        if not files:
            continue
        if picks.get(folder.name):
            order = [web_name(n) for n in picks[folder.name] if web_name(n) in files]
        else:
            order = sorted(files, key=lambda w: taken_key(files[w]))
        ref_here = {r.split("/", 1)[1] for r in refs if r.split("/", 1)[0] == folder.name}
        for w in sorted(set(order) | ref_here):
            if w not in files:
                print("  ! data에서 참조했지만 없는 사진:", folder.name, w)
                continue
            convert(files[w], OUT / folder.name / w, REF_PX if w in ref_here else SLIDE_PX)
        manifest[folder.name] = [f"assets/photos/{folder.name}/{w}" for w in order]
        print(f"{folder.name}: 슬라이드 {len(order)}장, 참조 {len(ref_here)}장")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "manifest.js").write_text(
        "// tools/build_photos.py 가 생성 — 직접 고치지 마세요\nwindow.PHOTOS = "
        + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 통과 확인** — Run: `python -m unittest tests/test_build_photos.py` → OK (3 tests)

- [ ] **Step 5: 벤더·robots** — Run: `curl -sSfo vendor/matter.min.js https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js` (파일 크기 > 70KB 확인). `robots.txt`:

```
User-agent: *
Disallow: /
```

- [ ] **Step 6: 변환 실행** — Task 3의 data 파일이 생긴 뒤 실행(Task 3 Step 3). 여기선 커밋만.

- [ ] **Step 7: Commit** — `git add tools tests/test_build_photos.py vendor robots.txt && git commit -m "사진 축소 파이프라인·matter.js 추가"`

---

### Task 3: 데이터 파일 (설정·퀴즈·확대퀴즈) + 사진 생성

**Files:**
- Create: `data/config.js`, `data/quiz.js`, `data/zoom.js`
- Generates: `assets/photos/**`

**Interfaces:**
- Produces: `PARTY_CONFIG = { heroTitle, players:[{id,name,team,kid}], teams:{A:{name,color},B:{...}}, prizes:string[], memories: [{title,folder}][] (길이 3) }`, `LIFE_QUIZ = [{ q, choices[4], answer: 0..3|null, judge?, photo?, story?, storyPhoto?, storyBy? }]`, `ZOOM_QUIZ = [{ photo, cx, cy, answer }]`.

- [ ] **Step 1: `data/config.js`**

```js
// 행사 기본 설정 — 현장에서는 G 키(설정 화면)로도 바꿀 수 있어요.
window.PARTY_CONFIG = {
  heroTitle: '아빠의 칠순을 진심으로 축하합니다',
  players: [
    { id: 'gpa',    name: '할아버지',  team: 'A', kid: false },
    { id: 'sister', name: '누나',      team: 'A', kid: false },
    { id: 'son',    name: '아들',      team: 'A', kid: true },
    { id: 'niece1', name: '막내 조카', team: 'A', kid: true },
    { id: 'gma',    name: '할머니',    team: 'B', kid: false },
    { id: 'bil',    name: '매형',      team: 'B', kid: false },
    { id: 'wife',   name: '아내',      team: 'B', kid: false },
    { id: 'niece3', name: '큰 조카',   team: 'B', kid: true }
  ],
  teams: {
    A: { name: 'A팀', color: '#ff7a1a' },
    B: { name: 'B팀', color: '#2f7bff' }
  },
  // 위에서부터 추첨 — 마지막 줄이 1등 상품
  prizes: [
    '아이스크림 쿠폰',
    '컵라면 1등 선택권',
    '설거지 면제권',
    '내일 아침 메뉴 선택권',
    '늦잠 30분 보장권',
    '편의점 5천원권',
    '편의점 1만원권',
    '🏆 1등 상품'
  ],
  // 추억극장 ①②③ — 사진 없는 챕터는 자동으로 건너뜀
  memories: [
    [
      { title: '2019 · 우리 집 집들이', folder: '2019-01_집들이' },
      { title: '2021 · 할아버지 할머니의 중국 여행', folder: '2021_중국여행' }
    ],
    [
      { title: '2025 · 태국 치앙마이', folder: '2025_치앙마이' }
    ],
    [
      { title: '2026 · 한라산 백록담 등반', folder: '2026-01_한라산' },
      { title: '2026 · 찜질방 데이트', folder: '2026-01_찜질방' }
    ]
  ]
};
```

- [ ] **Step 2: `data/quiz.js`, `data/zoom.js`**

```js
// 아빠 인생 퀴즈 — ✏️ 표시는 실제 내용으로 꼭 고쳐 주세요.
// answer: 정답 보기 번호(0~3, 첫 번째가 0). null 이면 정답 표시 없이 "판정!" 화면 → judge 가 현장에서 판정
// photo: 문제와 함께 띄울 사진, story/storyPhoto: 정답 공개 뒤 "썰 타임" 화면 (storyBy: 누가 썰을 푸는지)
window.LIFE_QUIZ = [
  { q: '할아버지와 할머니가 결혼한 해는?', choices: ['1980년', '1982년', '1984년', '1986년'], answer: 1, // ✏️
    story: '결혼식 날, 기억에 남는 장면은?', storyBy: '할아버지' },
  { q: '두 분이 결혼식을 올린 곳은?', choices: ['✏️ 서울 OO예식장', '✏️ OO웨딩홀', '✏️ 고향 마을', '✏️ OO교회'], answer: 0 },
  { q: '두 분이 처음 만난 방법은?', choices: ['맞선(소개)', '같은 직장', '동네 이웃', '친구 소개'], answer: 0, // ✏️
    story: '서로의 첫인상은 어땠나요?', storyBy: '할머니' },
  { q: '신혼여행은 어디로 갔을까요?', choices: ['제주도', '경주', '설악산', '부산 해운대'], answer: 0 }, // ✏️
  { q: '먼저 좋다고 한 사람은?', choices: ['할아버지', '할머니', '동시에!', '기억 안 남 😅'], answer: null, judge: '할머니' },
  { q: '할머니가 꼽은 할아버지의 매력 포인트는?', choices: ['든든함', '유머 감각', '성실함', '잘생김 😎'], answer: null, judge: '할머니' },
  { q: '2021년, 두 분이 함께 여행 간 나라는?', choices: ['일본', '중국', '베트남', '태국'], answer: 1,
    story: '중국 여행에서 제일 기억에 남는 것은?', storyBy: '할아버지' },
  { q: '2026년 1월, 가족이 오른 한라산 정상의 이름은?', choices: ['천왕봉', '대청봉', '백록담', '비로봉'], answer: 2,
    photo: 'assets/photos/2026-01_한라산/20260118_090537.jpg',
    storyPhoto: 'assets/photos/2026-01_한라산/20260118_100621.jpg', story: '정상에서 할아버지 한마디!', storyBy: '할아버지' },
  { q: '한라산 등반 날, 우리는 몇 시쯤 등산을 시작했을까?', choices: ['새벽 5시', '아침 7시', '오전 9시', '오전 11시'], answer: 1,
    photo: 'assets/photos/2026-01_한라산/20260118_070226.jpg' },
  { q: '올해 두 분은 결혼 몇 주년?', choices: ['40주년', '42주년', '44주년', '46주년'], answer: 2 } // ✏️ 결혼한 해와 맞추기
];
```

```js
// 확대 사진 퀴즈 — cx, cy: 확대 중심(0~1, 왼쪽 위가 0,0). 화면 보고 조정하세요.
window.ZOOM_QUIZ = [
  { photo: 'assets/photos/2026-01_한라산/20260118_155457.jpg', cx: 0.75, cy: 0.88, answer: '족욕하는 발! 🦶 누구 발일까요?' },
  { photo: 'assets/photos/2026-01_한라산/20260118_100621.jpg', cx: 0.5, cy: 0.72, answer: '한라산 백록담 정상석' },
  { photo: 'assets/photos/2026-01_한라산/20260119_082857.jpg', cx: 0.62, cy: 0.42, answer: '제주 바닷가 하얀 등대' },
  { photo: 'assets/photos/2026-01_한라산/20260118_131322.jpg', cx: 0.5, cy: 0.3, answer: '카페 마당의 귤나무 🍊' },
  { photo: 'assets/photos/2026-01_찜질방/snow_20260126_070303_723.jpg', cx: 0.5, cy: 0.55, answer: '찜질방의 할아버지와 손주' }
];
```

- [ ] **Step 3: 사진 생성** — Run: `python tools/build_photos.py` → `2026-01_한라산: 슬라이드 27장, 참조 ...`, `2026-01_찜질방: 슬라이드 5장`. 확인: `node -e "global.window={};eval(require('fs').readFileSync('assets/photos/manifest.js','utf8'));console.log(Object.keys(window.PHOTOS))"`.

- [ ] **Step 4: 확대 중심 확인** — 확대퀴즈 사진 5장을 보고 `cx, cy`가 피사체에 맞는지 조정.

- [ ] **Step 5: Commit** — `git add data assets && git commit -m "설정·퀴즈 데이터와 축소 사진 추가"`

---

### Task 4: 앱 뼈대 — 상태·UI·라우터·오프닝·엔딩·설정·코인판

**Files:**
- Create: `index.html`, `css/style.css`, `js/state.js`, `js/ui.js`, `js/app.js`, `js/scenes/opening.js`, `js/scenes/ending.js`, `js/scenes/setup.js`

**Interfaces:**
- Consumes: `Logic.teamAward`, `PARTY_CONFIG`.
- Produces:
  - `Store.state = { players, teamNames:{A,B}, prizes:string[], heroTitle, coins:{[id]:n}, sceneIndex, awarded:{[key]:'A:2'|'none:0'}, seven:{[id]:seconds}, sevenPaid:boolean, roulette:[{prize,id}] }`; `Store.load() / save() / reset() / resetProgress() / player(id) / addCoins(id,n) / teamTotal(team)`.
  - `UI.h(tag, attrs, children)`, `UI.toast(text, team?)`, `UI.awardBar(key, getPoints:()=>number):HTMLElement`, `UI.toggleScoreboard(force?)`, `UI.refreshScoreboard()`, `UI.teamColor(t)`, `UI.teamName(t)`, `UI.stepper(count, fromEnd, render:(i)=>void, canMove?:()=>boolean):{next,prev,index()}`.
  - `window.Scenes = {}`; 씬 정의 `{ skip?(arg):boolean, create(stage, arg, {fromEnd}) → { next():boolean, prev():boolean, key?(e):boolean, destroy?() } }`. next/prev 가 false 면 라우터가 다음/이전 씬으로.
  - `App.go(i)`, `App.FLOW`.

- [ ] **Step 1: `index.html`** (스크립트 순서 그대로)

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>칠순 잔치 게임쇼</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<main id="stage"></main>
<div id="overlay-root"></div>
<script src="vendor/matter.min.js"></script>
<script src="data/config.js"></script>
<script src="data/quiz.js"></script>
<script src="data/zoom.js"></script>
<script src="assets/photos/manifest.js"></script>
<script src="js/lib/logic.js"></script>
<script src="js/state.js"></script>
<script src="js/ui.js"></script>
<script src="js/scenes/opening.js"></script>
<script src="js/scenes/memories.js"></script>
<script src="js/scenes/quiz-life.js"></script>
<script src="js/scenes/quiz-zoom.js"></script>
<script src="js/scenes/seven.js"></script>
<script src="js/scenes/roulette.js"></script>
<script src="js/scenes/ending.js"></script>
<script src="js/scenes/setup.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `js/state.js`, `js/ui.js`, `js/app.js`** — 구현은 저장소의 해당 파일(이 계획의 Interfaces 그대로). 핵심 동작:
  - `state.js`: 저장값이 없거나 `players`가 없으면 `PARTY_CONFIG`로 기본값 생성. `resetProgress()`는 coins 0·awarded/seven/roulette 비우기·sevenPaid false, 이름·상품 유지.
  - `ui.js` `awardBar`: 미지급이면 `[A 정답 +p] [⭐ 아이 정답 ×2] [B 정답 +p] [⭐ 아이 정답 ×2] [꽝]`, 지급 후엔 `✔ 팀 +n 지급 완료 [되돌리기]`. 되돌리기는 `teamAward(..., -n)`.
  - 클릭 후 버튼 포커스 해제(document click → `button.blur()`) — Space 가 버튼을 다시 누르지 않도록.
  - `app.js` FLOW: opening → memories(0) → quizLife → memories(1) → quizZoom → memories(2) → seven → roulette → ending. `skip(arg)`이 true 인 씬은 건너뜀. 새로고침 시 `sceneIndex`부터.

- [ ] **Step 3: opening / ending / setup 씬 + style.css** — 오프닝: 七旬 + heroTitle + 팀 카드 2개(팀 이름 input, 명단 칩). 엔딩: 七旬 + "사랑하고 존경합니다" + 룰렛 결과 목록 + 꽃잎 애니메이션. 설정(G): 오프닝 문구, 참가자 이름/팀/아이 표, 상품 textarea, [저장] [게임 기록 초기화] [전체 초기화], 씬 바로가기 버튼.

- [ ] **Step 4: 브라우저 확인** — `index.html` 열기 → 오프닝 표시, 팀 이름 입력 후 새로고침해도 유지, S로 코인판(+/−), G로 설정, 콘솔 에러 0.

- [ ] **Step 5: Commit** — `git commit -m "앱 뼈대: 상태·라우터·오프닝·엔딩·설정·코인판"`

---

### Task 5: 추억극장

**Files:** Create `js/scenes/memories.js`

**Interfaces:** Consumes `Logic.chaptersWithPhotos`, `PARTY_CONFIG.memories[arg]`, `PHOTOS`, `UI.stepper`.

- [ ] **Step 1:** 슬라이드 = 챕터마다 [제목 카드, 사진들…]. 사진은 흐린 배경 + `object-fit: contain` 켄 번즈(4방향 번갈아 8초). 다음 사진 미리 로드. `skip(arg)` = 사진 있는 챕터 0개.
- [ ] **Step 2: 확인** — 추억극장 ①②는 건너뛰고(사진 없음) ③이 한라산 제목 → 사진 27장 → 찜질방 순으로 나오는지, ←로 거꾸로 들어오면 마지막 사진부터인지.
- [ ] **Step 3: Commit** — `git commit -m "추억극장 슬라이드"`

---

### Task 6: 아빠 인생 퀴즈 + 확대 사진 퀴즈

**Files:** Create `js/scenes/quiz-life.js`, `js/scenes/quiz-zoom.js`

**Interfaces:** Consumes `LIFE_QUIZ`, `ZOOM_QUIZ`, `UI.awardBar(key, getPoints)`, `Logic.zoomPoints`, `UI.stepper`. awardBar 키: `life-<n>`, `zoom-<n>`.

- [ ] **Step 1: 인생 퀴즈** — 단계: 소개 → 문제마다 [출제, 정답공개(+awardBar 배점 1), 썰 타임(story/storyPhoto 있을 때)]. answer 가 null 이면 정답 강조 없이 "⚖ {judge} 판정!".
- [ ] **Step 2: 확대 퀴즈** — 단계: 소개 → 문제마다 [확대 1~5단계, 공개]. 배율 `[6, 4, 2.6, 1.7, 1.25]` → 공개 1. 이미지 프레임은 높이 72vh·이미지 비율 그대로, `transform-origin: cx% cy%`, 1초 전환. awardBar 배점 = 단계별 `zoomPoints`(공개 단계 1), 한 문제 한 번만 지급.
- [ ] **Step 3: 확인** — 각 단계 이동, 코인 지급/되돌리기 후 S 코인판 수치 일치(팀 정답 +1 → 팀원 4명 각 +1).
- [ ] **Step 4: Commit** — `git commit -m "아빠 인생 퀴즈·확대 사진 퀴즈"`

---

### Task 7: 7초 맞추기

**Files:** Create `js/scenes/seven.js`

**Interfaces:** Consumes `Logic.sevenRanking`, `Store.state.seven`, `Store.state.sevenPaid`.

- [ ] **Step 1:** 단계: 소개 → 참가자 8명 → 순위표. 참가자 화면: 대기("스페이스로 시작") → Space 시작(숫자 숨김, ⏱ 맥박) → Space 멈춤 → `xx.xx초` + 차이(잭팟 문구). 진행 중엔 →/← 막기. R = 다시(지급 전만). 순위표: 순위·이름·기록·오차·코인, [🪙 코인 지급] 1회.
- [ ] **Step 2: 확인** — 기록 몇 개 입력 후 순위·코인이 규칙대로인지, 새로고침해도 기록 유지, 지급 후 버튼 사라짐.
- [ ] **Step 3: Commit** — `git commit -m "7초 맞추기"`

---

### Task 8: 마블 룰렛 시상식

**Files:** Create `js/scenes/roulette.js`

**Interfaces:** Consumes `Matter`, `Logic.marblePool`, `Store.state.prizes`, `Store.state.roulette`.

- [ ] **Step 1:** 단계: 소개(사람별 구슬 수) → 상품 수만큼 라운드. 라운드: 이전 당첨자 제외 pool → 월드(폭 1600, 높이 7200: 핀 구간 → 지그재그 경사로 → 회전 막대 반복, 바닥 결승선) 생성, 구슬은 게이트 위 대기 → Space 출발(게이트 제거) → 카메라가 선두 따라감 → 결승선 첫 통과 구슬 당첨 → 오버레이 + 저장. 남은 사람 1명이면 레이스 없이 자동 당첨. 결과 있는 라운드는 결과 카드만, R로 그 라운드부터 다시. 레이스 중·미추첨 라운드에선 → 막기. 15초 넘으면 느린 구슬에 살짝 힘, 속도 상한 25.
- [ ] **Step 2: 확인** — 코인 임의 입력 후 8라운드 끝까지, 당첨자 중복 없음, 엔딩에 결과 8개.
- [ ] **Step 3: Commit** — `git commit -m "마블 룰렛 시상식"`

---

### Task 9: 리허설·문서·배포

**Files:** Create `README.md`

- [ ] **Step 1:** 전체 흐름 리허설(전체 초기화 → 엔딩), 1920×1080 스크린샷 확인, 콘솔 에러 0.
- [ ] **Step 2:** README — 실행(index.html 더블클릭 / Pages 주소), 키 조작표, 사진 추가 방법(`photos/` → `python tools/build_photos.py`), 퀴즈 수정법.
- [ ] **Step 3:** `node --test tests/logic.test.js` & `python -m unittest tests/test_build_photos.py` 통과.
- [ ] **Step 4:** push 후 Pages 활성화 — `gh api -X POST repos/SEOYOUNGTAEK/Father_70/pages -f "source[branch]=main" -f "source[path]=/"`.
