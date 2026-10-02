// 행사 기본 설정 — 현장에서는 G 키(설정 화면)로도 바꿀 수 있어요.
// version 을 올리면 이미 저장된 브라우저에도 아래 참가자 명단이 새로 적용돼요(코인은 유지).
window.PARTY_CONFIG = {
  version: 5,
  heroTitle: '아빠의 칠순을 진심으로 축하합니다',
  // short: 마블 룰렛 구슬에 쓰는 두 글자 (없으면 세 글자 이름의 뒤 두 글자)
  players: [
    { id: 'gpa',    name: '할아버지', short: '할배', team: 'A', kid: false },
    { id: 'sister', name: '서영아',   team: 'A', kid: false },
    { id: 'niece1', name: '차예나',   team: 'A', kid: true },
    { id: 'niece3', name: '차예서',   team: 'A', kid: true },
    { id: 'son',    name: '서준우',   team: 'B', kid: true },
    { id: 'gma',    name: '할머니',   short: '할매', team: 'B', kid: false },
    { id: 'bil',    name: '차근창',   team: 'B', kid: false },
    { id: 'wife',   name: '현세민',   team: 'B', kid: false }
  ],
  teams: {
    A: { name: '할아버지 팀', color: '#e2703a' },
    B: { name: '할머니 팀', color: '#3f80c4' }
  },
  // 위에서부터 추첨 — 첫 줄이 1등 상품 (먼저 골인한 사람이 당첨, 당첨자는 빠짐)
  prizes: [
    '🏆 대상 (깜짝 선물)',
    '편의점 1만원권',
    '편의점 5천원권',
    '늦잠 30분 보장권',
    '내일 아침 메뉴 선택권',
    '설거지 면제권',
    '컵라면 1등 선택권',
    '아이스크림 쿠폰'
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
      { title: '2026 · 한라산 윗세오름 등반', folder: '2026-01_한라산' },
      { title: '2026 · 찜질방 데이트', folder: '2026-01_찜질방' }
    ]
  ]
};
