// 「PRD 관리」 화면 글자의 영어 (SPEC §8 「다국어」 · 도메인/작성 §3.6 「★ 표준 기획서」). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 기획서말: Record<string, string> = {
  // 머리와 알림
  '아직 PRD 가 없습니다': 'No PRD yet',
  '판 {판} · 요구 {건수}건': 'Version {판} · {건수} requirements',
  '판 이력': 'Version history',
  '요구 더하기': 'Add requirement',
  '요구 더하기로 첫 요구를 적습니다': 'Use Add requirement to write the first one',
  '판 {판}으로 저장했습니다': 'Saved as version {판}',

  // 할 일 두 칸
  '확인할 요구도 테스트에 반영할 요구도 없습니다': 'Nothing to check and nothing to apply to tests',
  '확인 필요 {건수}건': '{건수} need checking',
  '가장 오래된 것 {나이}': 'oldest {나이}',
  '화면 기준으로 적었거나 문서끼리 달라 사람이 판단합니다':
    'Written from the screen or from conflicting documents, so a person decides',
  '확인할 요구가 없습니다': 'Nothing to check',
  '{번호} 고르기': 'Select {번호}',
  '모두 고르기': 'Select all',
  '확정하면 바로 새 판이 됩니다. PR 은 없습니다': 'Confirming saves a new version right away. No PR.',
  '고른 {건수}건 확정': 'Confirm {건수} selected',
  '반영 안 됨 {건수}건': '{건수} not in tests',
  '고친 요구가 아직 테스트에 없습니다': 'Edited requirements are not in the tests yet',
  '테스트와 어긋난 요구가 없습니다': 'Every requirement matches the tests',
  바뀜: 'Changed',
  '새 항목': 'New',
  지움: 'Removed',
  '지운 요구': 'Removed requirement',
  오늘: 'today',
  '{일}일째': 'day {일}',

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
  '지우지 않기': 'Keep it',
  '기능 묶음을 적습니다': 'Enter a feature',
  '요구 문장을 적습니다': 'Enter the requirement',
  '근거를 하나 이상 적습니다': 'Add at least one source',
  '근거마다 자료 이름을 적습니다': 'Every source needs a document name',
  '근거마다 원본 문장을 적습니다': 'Every source needs a sentence',
  '글자 수 상한을 넘었습니다 — 기능 묶음 {묶음}자 · 요구 문장 {문장}자 · 근거 {근거}개 · 근거 문장 {근거문장}자':
    'Too long. Limits: feature {묶음} chars · requirement {문장} chars · {근거} sources · source sentence {근거문장} chars',

  // 판 이력
  판: 'Version',
  누가: 'By',
  언제: 'When',
  옮기기: 'Import',
  // 판을 만든 쪽 — 「사람」(People) · 「되돌리기」(Undo) 버튼 글자와 영어가 다르다
  '사람§판': 'Person',
  '되돌리기§판': 'Revert',
  '지금 판': 'Current',
  '이 판으로 되돌리기': 'Revert to this version',
  '판 {판}으로 되돌리기 확인': 'Confirm revert to version {판}',
  '되돌리기도 새 판으로 쌓입니다. 옛 판은 지우지 않습니다': 'A revert is saved as a new version. Old versions stay.',
};
