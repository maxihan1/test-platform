// 「PRD 관리」 화면 글자의 영어 (SPEC §8 「다국어」 · 도메인/작성 §3.6 「★ 표준 기획서」). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 기획서말: Record<string, string> = {
  // 머리와 알림
  '아직 PRD 가 없습니다': 'No PRD yet',
  '버전 {버전} · 요구 {건수}건': 'Version {버전} · {건수} requirements',
  '버전 기록': 'Version history',
  '워드로 내려받기': 'Download as Word',
  '추적표 엑셀로 내려받기': 'Download traceability matrix',
  '요구 더하기': 'Add requirement',
  '요구 더하기로 첫 요구를 적습니다': 'Use Add requirement to write the first one',
  '저장했습니다 (버전 {버전})': 'Saved (version {버전})',

  // 할 일 두 칸
  '확인할 요구도 테스트에 반영할 요구도 없습니다': 'Nothing to check and nothing to apply to tests',
  '확인 필요 {건수}건': '{건수} need checking',
  '가장 오래된 것 {나이}': 'oldest {나이}',
  '화면 기준으로 적었거나 문서끼리 달라 사람이 판단합니다':
    'Written from the screen or from conflicting documents, so a person decides',
  '확인할 요구가 없습니다': 'Nothing to check',
  '{번호} 고르기': 'Select {번호}',
  '모두 고르기': 'Select all',
  '확정하면 바로 새 버전으로 저장됩니다. PR 은 없습니다': 'Confirming saves a new version right away. No PR.',
  '고른 {건수}건 확정': 'Confirm {건수} selected',
  '반영 안 됨 {건수}건': '{건수} not in tests',
  '고친 요구가 아직 테스트에 없습니다': 'Edited requirements are not in the tests yet',
  '테스트와 어긋난 요구가 없습니다': 'Every requirement matches the tests',
  '바뀐 요구 {건수}건 테스트에 반영': 'Apply {건수} changed requirements to tests',
  '작성 요청 {번호}번을 만들었습니다': 'Created authoring request {번호}',
  '이번 반영으로 바뀌거나 지워질 수 있는 케이스를 쓰는 E2E 시나리오 {수}개 — 병합한 뒤 시험 실행으로 확인하고 지운 케이스는 다른 케이스로 바꿉니다':
    '{수} E2E scenarios use cases this apply may change or remove — after merging, check them with a trial run and swap in another case for any removed one',
  바뀜: 'Changed',
  '새 항목': 'New',
  지움: 'Removed',
  '지운 요구': 'Removed requirement',
  오늘: 'today',
  '{일}일째': 'day {일}',

  // 「PRD 에 없는 화면」 카드 (PRD-F6-03)
  'PRD 에 없는 화면 {건수}개': '{건수} screens not in the PRD',
  '찾은 화면 {전체}개 중 · 아직 요구사항도 테스트도 없는 화면입니다':
    'Out of {전체} screens found · screens with no requirement or test yet',
  'PRD 에 없는 화면이 없습니다': 'Every screen found is in the PRD',
  '#{번호} 요청이 이 화면들을 작성하는 중입니다': 'Request #{번호} is writing these screens',
  '테스트 작성에서 기획서 없이 「실제 화면과 대조」로 보내면 이 화면만 작성합니다':
    'Send a request from Test authoring with Compare with the live screen and no spec, and only these screens are written',

  // 전체 요구
  '전체 요구': 'All requirements',
  '요구 문장 · 번호 검색': 'Search requirement text or ID',
  '모두 펴기': 'Expand all',
  '모두 접기': 'Collapse all',
  '아직 요구가 없습니다': 'No requirements yet',
  '찾는 요구가 없습니다': 'No matching requirements',
  '{건수}건': '{건수}',
  '확인 필요 · {나이}': 'Needs check · {나이}',
  // 상태 칸의 「확정」 — 버튼의 「확정」(Confirm)과 영어가 다르다
  '확정§상태': 'Confirmed',
  '{종류} · 반영 안 됨': '{종류} · not in tests',
  '사람이 고침': 'Edited by a person',
  근거: 'Source',
  '설계 미리보기': 'Test design preview',
  '요구 문장에서 잡힌 경계 · 예외가 없습니다': 'No boundaries or exceptions found in this requirement',
  고치기: 'Edit',
  '이 요구만 확정': 'Confirm this one',

  // 보류 카드 — 계정이 없어 테스트를 못 쓴 요구 (도메인/작성 §3.6 「★ 역할별 계정」)
  '보류 {건수}건 — {역할} 계정이 등록되지 않았습니다': '{건수} on hold — no {역할} account registered',
  '보류 {건수}건 — {역할} 계정을 등록했습니다': '{건수} on hold — {역할} account registered',
  '등록하면 이 요구만 다시 작성합니다': 'Once registered, only these requirements are written again',
  '이어 작성하면 이 요구만 다시 작성합니다': 'Resuming writes only these requirements again',
  '설정에서 계정 등록': 'Register accounts in Settings',
  '이어 작성할 작성 요청이 없습니다': 'No authoring request to resume from',
  '계정을 등록한 뒤에 이어 작성할 수 있습니다': 'Register the account first, then resume',

  // 추적표 칸 — 요구마다 연결된 케이스 · 마지막 결과 (도메인/작성 §3.6 「메뉴가 곧 요구사항 추적표다」)
  미작성: 'Not written',
  '보류 — {역할} 계정 미등록': 'On hold — no {역할} account',
  '보류 — {역할} 계정 등록됨 · 이어 작성 전': 'On hold — {역할} account added, not resumed yet',
  '보류 {건수}건': '{건수} on hold',
  '미작성 {건수}건': '{건수} not written',
  '실패 {건수}건': '{건수} failing',
  '기능 {건수}건': '{건수} functional',
  'UI {건수}건': '{건수} UI',
  '실패 {건수} / {전체}': '{건수} of {전체} failed',
  '미실행 {건수} / {전체}': '{건수} of {전체} not run',
  '마지막 결과를 못 읽었습니다 — {까닭}': 'Could not load the latest results — {까닭}',

  // 고치기 · 더하기 칸
  '새 요구': 'New requirement',
  '기능 묶음': 'Feature',
  '요구 문장': 'Requirement',
  '규칙 하나만 적습니다. 숫자 · 조건 낱말(이상 · 미만 · 까지)은 원문 그대로 둡니다':
    'One rule per requirement. Keep numbers and condition words exactly as in the source.',
  '자료 이름': 'Document',
  '원본 번호': 'Source ID',
  '원본 번호 · 화면 주소': 'Source ID or screen URL',
  '원본 문장': 'Source sentence',
  '근거 더하기': 'Add source',
  '이 요구 지우기': 'Delete this requirement',
  // 「지우기 확인」은 입력값 지우기(Confirm clear)에 이미 쓰인다 — 여기는 요구를 지운다
  '지우기 확인§요구': 'Confirm delete',
  '지우지 않기': 'Keep it',
  '기능 묶음을 적습니다': 'Enter a feature',
  '요구 문장을 적습니다': 'Enter the requirement',
  '근거를 하나 이상 적습니다': 'Add at least one source',
  '근거마다 자료 이름을 적습니다': 'Every source needs a document name',
  '근거마다 원본 문장을 적습니다': 'Every source needs a sentence',
  '글자 수 상한을 넘었습니다 — 기능 묶음 {묶음}자 · 요구 문장 {문장}자 · 근거 {근거}개 · 자료 이름 · 원본 번호 {자리}자 · 근거 문장 {근거문장}자':
    'Too long. Limits: feature {묶음} chars · requirement {문장} chars · {근거} sources · document name and source ID {자리} chars · source sentence {근거문장} chars',

  // 버전 기록 — 사람이 보는 말은 「버전」이고 명세 · DB · 에이전트의 내부 용어는 「판」 그대로다 (2026-10-12 사용자)
  버전: 'Version',
  '저장한 사람': 'Saved by',
  '저장 일시': 'Saved at',
  // 버전을 만든 쪽
  'AI 작성': 'AI',
  '직접 수정': 'Edited by hand',
  복원: 'Restore',
  '현재 버전': 'Current',
  '이 버전으로 복원': 'Restore this version',
  '버전 {버전} 복원 확인': 'Confirm restoring version {버전}',
  '복원해도 새 버전으로 저장됩니다. 이전 버전은 남아 있습니다': 'A restore is saved as a new version. Earlier versions stay.',
};
