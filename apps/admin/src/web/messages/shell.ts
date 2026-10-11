// 껍데기·공통 화면 글자의 영어 (SPEC §8). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 껍데기말: Record<string, string> = {
  // 제품과 자리 목록
  '테스트 플랫폼': 'Test Platform',
  대시보드: 'Dashboard',
  // 영어는 못 박는다 (화면공통 §8 「자리 목록」)
  'PRD 관리': 'PRD',
  '테스트 작성': 'Authoring',
  // 영어는 못 박는다 (화면공통 §8 「자리 목록」)
  'E2E 시나리오': 'E2E scenarios',
  '실행 기록': 'Run history',
  // 사이드바 하위 메뉴 · 목록 부제 (PR #132) — errors.ts 의 MIXED_KIND 문장과 같은 말을 쓴다
  'UI 테스트': 'UI tests',
  '기능 테스트': 'Functional tests',
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

  // 기능 칸이 넷 다 none 인 사람 (화면공통 §8)
  '권한을 받지 않았습니다. 운영자에게 요청하세요': 'You have no permissions yet. Ask an admin.',
  // 배정이 없는 사람
  '아직 배정받은 서비스가 없습니다': 'No service assigned yet',
  '설정에서 자기 자신을 서비스에 배정하세요': 'Assign yourself to a service in Settings',
  '운영 계정에게 서비스 배정을 요청하세요': 'Ask an admin to assign you a service',

  // 본문 위 알림 줄과 알림 서랍 (noticeView.ts · Notice.tsx · NoticeDrawer.tsx). 실행 문구는 runs.ts 의 `RUN {번호} 이 …` 를 같이 쓴다
  '{수} 통과': '{수} passed',
  '{수} 실패': '{수} failed',
  '{수} 미실행': '{수} not run',
  '알림 닫기': 'Dismiss',
  알림: 'Notifications',
  '안 읽은 알림 {수}건': '{수} unread',
  열기: 'Open',
  '작성 결과': 'Authoring result',
  '작성 요청 #{번호} 이 진행 중입니다': 'Authoring request #{번호} is running',
  '작성 요청 #{번호} 이 순서를 기다리고 있습니다': 'Authoring request #{번호} is waiting its turn',
  '작성 요청 #{번호} 이 끝났습니다': 'Authoring request #{번호} finished',
  '작성 요청 #{번호} 이 실패했습니다': 'Authoring request #{번호} failed',
  '작성 요청 #{번호} 이 멈췄습니다': 'Authoring request #{번호} was stopped',
  '{번호} / {전체} 단계 {이름}': 'Step {번호} / {전체} {이름}',
  '스크립트 파일 {수}개': '{수} script files',
  'PRD 확인 필요 {수}건': '{수} PRD items to check',
  'PRD 관리에서 확인': 'Check in PRD',
  '외 {수}건 — 알림 열기': '{수} more — open notifications',
  '모두 읽음으로': 'Mark all read',
  '안 읽음 {수}': 'Unread {수}',
  '볼 수 있는 서비스 전체 · 최근 7일': 'All services you can see · last 7 days',
  '최근 7일 동안 끝난 실행과 작성이 없습니다': 'No runs or authoring finished in the last 7 days',
  '해당하는 알림이 없습니다': 'No matching notifications',
  방금: 'Just now',
  '{분}분 전': '{분}m ago',
  '{시간}시간 전': '{시간}h ago',
  어제: 'Yesterday',

  // 화면 어디서나 쓰는 것 — 판정 배지 · 디바이스 이름 · 빈 화면
  통과: 'Pass',
  실패: 'Fail',
  미실행: 'Not run',
  모바일: 'Mobile',
  'Android 앱': 'Android app',
  '불러오는 중입니다.': 'Loading…',
  '없는 주소입니다.': 'Page not found.',
  '케이스 목록으로': 'Go to case list',
};
