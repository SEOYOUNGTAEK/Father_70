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
      { title: '2026 · 한라산 윗세오름 등반', folder: '2026-01_한라산' },
      { title: '2026 · 찜질방 데이트', folder: '2026-01_찜질방' }
    ]
  ]
};
