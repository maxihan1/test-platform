// 껍데기·공통 화면 글자의 영어 (SPEC §8). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 껍데기말: Record<string, string> = {
  // 제품과 자리 넷
  '테스트 플랫폼': 'Test Platform',
  '실행 기록': 'Run history',
  그래프: 'Charts',
  설정: 'Settings',

  // 사이드바
  '사이드바 펴기': 'Expand sidebar',
  '사이드바 접기': 'Collapse sidebar',
  '서비스 고르기': 'Choose service',
  // 설정의 구획 제목은 `Services`(복수)다. 사이드바는 지금 보는 하나를 가리키므로 단수다
  '서비스§고르개': 'Service',
  '서비스 없음': 'No service',
  언어: 'Language',
  로그아웃: 'Sign out',
  // 언어 이름은 그 언어로 적는 것이 관례다. 영어로 봐도 「한국어」여야 고를 수 있다
  한국어: '한국어',

  // 배정이 없는 사람
  '아직 배정받은 서비스가 없습니다': 'No service assigned yet',
  '설정에서 자기 자신을 서비스에 배정하세요': 'Assign yourself to a service in Settings',
  '운영 등급에게 서비스 배정을 요청하세요': 'Ask an admin to assign you a service',

  // 자리 아래 알림 줄
  'RUN {번호} 이 진행 중입니다  {끝난}/{전체}': 'RUN {번호} is running  {끝난}/{전체}',
  'RUN {번호} 이 {머리} · {집계}': 'RUN {번호} {머리} · {집계}',
  멈췄습니다: 'was aborted',
  끝났습니다: 'finished',
  '{수} 통과': '{수} passed',
  '{수} 실패': '{수} failed',
  '{수} 미실행': '{수} not run',
  '알림 닫기': 'Dismiss',

  // 화면 어디서나 쓰는 것 — 판정 배지 · 디바이스 이름 · 빈 화면
  통과: 'Pass',
  실패: 'Fail',
  미실행: 'Not run',
  모바일: 'Mobile',
  '불러오는 중입니다.': 'Loading…',
  '없는 주소입니다.': 'Page not found.',
  '케이스 목록으로': 'Go to case list',
};
