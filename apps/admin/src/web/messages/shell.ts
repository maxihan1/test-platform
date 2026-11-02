// 껍데기·공통 화면 글자의 영어 (SPEC §8). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 껍데기말: Record<string, string> = {
  // 애플리케이션 줄 맨 아래 「+」 (화면공통 §8 「껍데기」 · 2026-10-29)
  '애플리케이션 추가': 'Add application',
  // 자리 목록
  대시보드: 'Dashboard',
  // 영어는 못 박는다 (화면공통 §8 「자리 목록」)
  'PRD 관리': 'PRD',
  '테스트 작성': 'Authoring',
  // 영어는 못 박는다 (화면공통 §8 「자리 목록」)
  'E2E 시나리오': 'E2E scenarios',
  '실행 기록': 'Run history',
  // 영어는 이 자리를 만든 PR 이 정한다 (화면공통 §8 「자리 목록」 · PERF-F1-05)
  '성능 테스트': 'Performance',
  시나리오: 'Scenarios',
  // 사이드바 하위 메뉴 · 목록 부제 (PR #132) — errors.ts 의 MIXED_KIND 문장과 같은 말을 쓴다
  'UI 테스트': 'UI tests',
  '기능 테스트': 'Functional tests',
  설정: 'Settings',

  // 사이드바
  '가입 신청 {수}건': '{수} sign-up requests',
  '사이드바 펴기': 'Expand sidebar',
  '사이드바 접기': 'Collapse sidebar',
  // 사이드바 바닥 — 지금 아닌 쪽 이름이다 (화면공통 §8 「껍데기」 바닥)
  '밝게 보기': 'Light mode',
  '어둡게 보기': 'Dark mode',
  '애플리케이션 선택': 'Choose application',
  '프로젝트 선택': 'Choose project',
  '프로젝트를 고르세요': 'Choose a project',
  '고른 프로젝트의 애플리케이션만 보입니다. 사이드바 맨 위에서 언제든 바꿀 수 있습니다.':
    'Only the applications in the chosen project are shown. You can change it any time at the top of the sidebar.',
  '마지막에 연 프로젝트': 'Last opened project',
  '애플리케이션 없음': 'No application',
  // 사이드바 맨 위 프로젝트 고르개 (화면공통 §8 「껍데기」 맨 위 줄)
  '애플리케이션 {수}개': '{수} applications',
  // 사이드바 찾기 칸 · 찾기 창 (ShellFind.tsx · 화면공통 §8 「껍데기」 찾기 칸)
  '찾을 말': 'Search term',
  '메뉴 이름': 'Menu name',
  'TC ID · 케이스 이름 · 메뉴 이름': 'TC ID · case name · menu name',
  '찾은 것': 'Results',
  '찾은 것이 없습니다': 'Nothing found',
  메뉴: 'Menu',
  // 왼쪽 줄 · 내 메뉴 (ShellRail.tsx · ShellMe.tsx)
  'Test Commander 홈': 'Test Commander home',
  언어: 'Language',
  로그아웃: 'Sign out',
  // 언어 이름은 그 언어로 적는 것이 관례다. 영어로 봐도 「한국어」여야 고를 수 있다
  한국어: '한국어',

  // 기능 칸이 넷 다 none 인 사람 (화면공통 §8)
  '권한을 받지 않았습니다. 관리자에게 요청하세요': 'You have no permissions yet. Ask an admin.',
  // 배정이 없는 사람
  '아직 배정받은 애플리케이션이 없습니다': 'No application assigned yet',
  '설정에서 자기 자신을 프로젝트에 배정하세요': 'Assign yourself to a project in Settings',
  '관리자에게 프로젝트 배정을 요청하세요': 'Ask an admin to assign you a project',

  // 휴대폰 껍데기 — 위 줄 · 아래 탭 · 전체 메뉴판 (PhoneShell.tsx · 화면공통 §8 「휴대폰 화면」)
  '내 메뉴': 'My menu',
  '휴대폰 메뉴': 'Phone menu',
  테스트: 'Tests',
  '결정 필요 {수}건': '{수} need a decision',
  '전체 메뉴': 'All menus',
  '애플리케이션 바꾸기 · {프로젝트}': 'Switch application · {프로젝트}',
  '{이름} 메뉴': '{이름} menu',
  // 휴대폰 고르기 바 — 단추가 같은 폭으로 나란해 「조건에 맞는 N건 모두 고름」을 줄였다 (CaseListPick.tsx)
  '모두 {수}건': 'All {수}',

  // 본문 위 알림 줄과 알림 서랍 (noticeView.ts · Notice.tsx · NoticeDrawer.tsx). 실행 문구는 runs.ts 의 `RUN {번호} 실행 …` 을 같이 쓴다
  '{수} 통과': '{수} passed',
  '{수} 실패': '{수} failed',
  '{수} 미실행': '{수} not run',
  '알림 닫기': 'Dismiss',
  알림: 'Notifications',
  '안 읽은 알림 {수}건': '{수} unread',
  열기: 'Open',
  '작성 결과': 'Authoring result',
  '#{번호} 작성 요청이 진행 중입니다': 'Authoring request #{번호} is running',
  '#{번호} 작성 요청이 순서를 기다리고 있습니다': 'Authoring request #{번호} is waiting its turn',
  '#{번호} 작성 요청이 끝났습니다': 'Authoring request #{번호} finished',
  '#{번호} 작성 요청이 실패했습니다': 'Authoring request #{번호} failed',
  '#{번호} 작성 요청이 멈췄습니다': 'Authoring request #{번호} was stopped',
  '{번호} / {전체} 단계 {이름}': 'Step {번호} / {전체} {이름}',
  '케이스 파일 {수}개': '{수} case files',
  'PRD 확인 필요 {수}건': '{수} PRD items to check',
  '결정 필요에서 확인': 'Check in Needs decision',
  '외 {수}건 — 알림 열기': '{수} more — open notifications',
  '모두 읽음으로': 'Mark all read',
  '안 읽음 {수}': 'Unread {수}',
  '볼 수 있는 애플리케이션 전체 · 최근 7일': 'All applications you can see · last 7 days',
  '최근 7일 동안 끝난 실행과 작성이 없습니다': 'No runs or authoring finished in the last 7 days',
  '조건에 맞는 알림이 없습니다': 'No matching notifications',
  방금: 'Just now',
  '{분}분 전': '{분}m ago',
  '{시간}시간 전': '{시간}h ago',
  어제: 'Yesterday',

  // 화면 어디서나 쓰는 것 — 판정 배지 · 디바이스 이름 · 빈 화면
  // 통과 · 실패 · 「불러오는 중입니다.」는 runs 표의 영어를 같이 쓴다 — 두 표가 달리 적으면 뒤 표가 덮는다
  미실행: 'Not run',
  모바일: 'Mobile',
  'Android 앱': 'Android app',
  '없는 주소입니다.': 'Page not found.',
  // 케이스 권한이 없는 사람도 닿는 자리(route.ts `집`)로 보낸다
  처음으로: 'Home',
};
