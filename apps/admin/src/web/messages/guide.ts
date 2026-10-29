// 「PRD 관리 › 서비스 가이드」 화면 글자의 영어 (SPEC §8 「다국어」 · 도메인/작성 §3.6 「★ 서비스 가이드」). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 가이드말: Record<string, string> = {
  // 메뉴 하위 자리
  요구사항: 'Requirements',
  // 가이드 자리 이름은 애플리케이션 종류를 따른다 (kind.ts 「가이드」 · 2026-10-29)
  '웹 가이드': 'Web guide',
  '앱 가이드': 'App guide',
  '게임 가이드': 'Game guide',
  'API 가이드': 'API guide',

  // 머리와 알림
  '테스트를 작성할 때 참고하는 애플리케이션 설명입니다': 'Application description used as a reference when tests are authored',
  '아직 가이드가 없습니다': 'No guide yet',
  '버전 {버전} · 첨부 {건수}건': 'Version {버전} · {건수} attachments',
  '기대값은 요구사항(표준 기획서)에서만 옵니다. 가이드는 애플리케이션을 이해하고 테스트를 돌리는 데만 씁니다':
    'Expected results come only from the requirements (PRD). The guide only helps understand the application and run tests',

  // 구획
  '애플리케이션 소개': 'About the application',
  정책: 'Policies',
  '작업 규칙': 'Working rules',
  '문서에 없는 것만 적습니다': 'Write only what the documents leave out',
  '적은 글이 없습니다': 'Nothing written',
  열기: 'Open',
  '{이름} 제거': 'Remove {이름}',
  제거: 'Remove',
  '파일 첨부': 'Attach file',
  '{구획}에 파일 첨부': 'Attach a file to {구획}',
  '제거 확인': 'Confirm remove',
  '{이름} 제거 확인': 'Confirm removing {이름}',
  '저장하지 않은 변경이 있습니다': 'You have unsaved changes',

  // 버전 기록 — 「버전 기록」 글자는 PRD 표(messages/prd.ts)에 있다
  '옛 버전은 볼 수만 있습니다': 'Earlier versions are view-only',
  '바뀐 것': 'Changes',
  보기: 'View',
  '글 고침 — {구획}': 'Text edited — {구획}',
  '더함 — {이름}': 'Added — {이름}',
  '뺌 — {이름}': 'Removed — {이름}',
  '버전 {버전} 보기': 'View version {버전}',
  '버전 {버전} 읽기 전용': 'Version {버전}, read only',
};
