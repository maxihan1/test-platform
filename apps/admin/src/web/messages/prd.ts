// 「PRD 관리」 화면 글자의 영어 (SPEC §8 「다국어」 · 도메인/작성 §3.6 「★ 표준 기획서」). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 기획서말: Record<string, string> = {
  // 머리와 알림
  '아직 PRD 가 없습니다': 'No PRD yet',
  '버전 {버전} · 요구 {건수}건': 'Version {버전} · {건수} requirements',
  '버전 기록': 'Version history',
  '워드로 내려받기': 'Download as Word',
  '추적표 엑셀로 내려받기': 'Download traceability matrix',
  내려받기: 'Download',
  '테스트 작성 요청': 'Request test authoring',
  '요구사항 추가': 'Add requirement',
  '테스트 작성 요청으로 기획서를 올리거나, 요구사항 추가로 첫 요구를 직접 적습니다':
    'Upload a spec with Request test authoring, or write the first requirement yourself with Add requirement',
  '저장했습니다 (버전 {버전})': 'Saved (version {버전})',

  // 할 일 두 칸
  '확인 필요 {건수}건': '{건수} need checking',
  '이 요구사항을 어디서 읽었는지입니다': 'Where this requirement was read from',
  자료: 'Document',
  위치: 'Location',
  원문: 'Original text',
  '실제 화면에서 본 것': 'Seen on the live screen',
  '사람이 직접 적은 것': 'Written by a person',
  바뀜: 'Changed',
  '새 항목': 'New',
  지움: 'Removed',
  오늘: 'today',
  '{일}일째': 'day {일}',

  // 「PRD 에 없는 화면」 카드 (PRD-F6-03)

  'UI 실패 {건수}건 보기': 'View {건수} failing UI cases',

  // 전체 요구
  '전체 요구': 'All requirements',
  '요구 문장 · 번호 검색': 'Search requirement text or ID',
  '모두 펴기': 'Expand all',
  '모두 접기': 'Collapse all',
  '아직 요구가 없습니다': 'No requirements yet',
  '찾는 요구가 없습니다': 'No matching requirements',
  '{건수}건': '{건수}',
  '모두 확인 필요': 'All need checking',
  '모두 보류': 'All on hold',
  '모두 미작성': 'All not written',
  '모두 실패': 'All failing',
  '확인 필요 · {나이}': 'Needs check · {나이}',
  // 상태 칸의 「확정」 — 버튼의 「확정」(Confirm)과 영어가 다르다
  '확정§상태': 'Confirmed',
  '사람이 고침': 'Edited by a person',
  '테스트 작성 › 결정 필요에서 테스트를 다시 만들 수 있어요 →': 'You can remake the tests in Test authoring › Decisions needed →',
  출처: 'Source',
  '설계 미리보기': 'Test design preview',
  '요구 문장에서 잡힌 경계 · 예외가 없습니다': 'No boundaries or exceptions found in this requirement',
  고치기: 'Edit',

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
  '출처 더하기': 'Add source',
  '출처는 「직접 작성」으로 자동으로 달립니다. 저장한 뒤 요구 줄의 고치기에서 더할 수 있습니다':
    'The source is set to “직접 작성” (direct entry) automatically. After saving, add more from Edit on the requirement',
  '이 요구 지우기': 'Delete this requirement',
  // 「지우기 확인」은 입력값 지우기(Confirm clear)에 이미 쓰인다 — 여기는 요구를 지운다
  '지우기 확인§요구': 'Confirm delete',
  '지우지 않기': 'Keep it',
  '기능 묶음을 적습니다': 'Enter a feature',
  '요구 문장을 적습니다': 'Enter the requirement',
  '출처를 하나 이상 적습니다': 'Add at least one source',
  '출처마다 자료 이름을 적습니다': 'Every source needs a document name',
  '출처마다 원본 문장을 적습니다': 'Every source needs a sentence',
  '글자 수 상한을 넘었습니다 — 기능 묶음 {묶음}자 · 요구 문장 {문장}자 · 출처 {근거}개 · 자료 이름 · 원본 번호 {자리}자 · 출처 문장 {근거문장}자':
    'Too long. Limits: feature {묶음} chars · requirement {문장} chars · {근거} sources · document name and source ID {자리} chars · source sentence {근거문장} chars',

  // 버전 기록 — 사람이 보는 말은 「버전」이고 명세 · DB · 에이전트의 내부 용어는 「판」 그대로다 (2026-10-12 사용자)
  버전: 'Version',
  '저장한 사람': 'Saved by',
  '저장 일시': 'Saved at',
  // 버전을 만든 쪽
  'AI 작성': 'AI',
  '직접 수정': 'Edited by hand',
  'AI 작성 #{번호}': 'AI #{번호}',
  되돌림: 'Reverted',
  '테스트 작성에서 결정': 'Decided in test authoring',
  '테스트 작성에서 결정 · AI': 'Decided in test authoring · AI',
  '테스트 작성에서 결정 · AI #{번호}': 'Decided in test authoring · AI #{번호}',
  복원: 'Restore',
  어디서: 'Where from',
  '현재 버전': 'Current',
  '이 버전으로 복원': 'Restore this version',
  '버전 {버전} 복원 확인': 'Confirm restoring version {버전}',
  '복원해도 새 버전으로 저장됩니다. 이전 버전은 남아 있습니다': 'A restore is saved as a new version. Earlier versions stay.',
  // 바뀐 것은 서버가 적어 준 줄(changes)을 그대로 쓰고, 없으면 앞 버전과 견줘 화면이 계산한다
  '문장 변경': 'Wording changed',
  '문구 선택': 'Wording picked',
  '확인 필요로 바꿈': 'Marked as needs checking',
  '{키들} 에서 옴': 'from {키들}',
  '화면이 맞음({번호})': 'Screen is right ({번호})',
  '{자료} 쪽': 'from {자료}',
  '바뀐 것 보기': 'Show changes',
  '처음 버전': 'First version',
  '바뀐 요구 없음': 'No requirement changed',
  '{종류} {건수}건': '{종류}: {건수}',
  '버전 {버전}에서 바뀐 요구': 'Requirements changed in version {버전}',
  '상태만 바뀜': 'Status only',
  '확정으로 바뀜': 'Now confirmed',
  '확인 필요로 바뀜': 'Now needs checking',
  '출처가 바뀜': 'Source changed',
  '기능 묶음 {앞} → {뒤}': 'Feature {앞} → {뒤}',

  // 서비스 지도 (PrdApis.tsx · 도메인/작성 §3.6 「서비스 지도」)
  '애플리케이션 지도를 못 읽었습니다 — {까닭}': 'Could not read the application map — {까닭}',
  '거치는 API {건수}개': 'APIs used: {건수}',
  '{케이스} {단계}단계': '{케이스} step {단계}',
  펴기: 'Expand',
};
