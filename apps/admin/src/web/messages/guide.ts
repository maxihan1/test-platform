// 「PRD 관리 › 서비스 가이드」 화면 글자의 영어 (SPEC §8 「다국어」 · 도메인/작성 §3.6 「★ 서비스 가이드」). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 가이드말: Record<string, string> = {
  // 메뉴 하위 자리
  요구사항: 'Requirements',
  '서비스 가이드': 'Service guide',

  // 머리와 알림
  '작성 에이전트가 테스트를 만들기 전에 읽습니다': 'The authoring agent reads this before writing tests',
  '아직 가이드가 없습니다': 'No guide yet',
  '버전 {버전} · 첨부 {건수}건': 'Version {버전} · {건수} attachments',
  '변경 기록': 'Change history',
  '기대값은 요구사항(표준 기획서)에서만 옵니다. 가이드는 서비스를 이해하고 테스트를 돌리는 데만 씁니다':
    'Expected results come only from the requirements (PRD). The guide only helps understand the service and run tests',

  // 구획
  '서비스 소개': 'About the service',
  정책: 'Policies',
  '프로젝트 규칙': 'Project rules',
  '문서에 없는 것만 적습니다': 'Write only what the documents leave out',
  '적은 글이 없습니다': 'Nothing written',
  열기: 'Open',
  '{이름} 빼기': 'Remove {이름}',
  '파일 더하기': 'Add file',
  '{구획}에 파일 더하기': 'Add a file to {구획}',

  // 변경 기록
  '바뀐 것': 'Changes',
  보기: 'View',
  '글 고침 — {구획}': 'Text edited — {구획}',
  '더함 — {이름}': 'Added — {이름}',
  '뺌 — {이름}': 'Removed — {이름}',
  '버전 {버전} 보기': 'View version {버전}',
  '버전 {버전} 읽기 전용': 'Version {버전}, read only',
};
