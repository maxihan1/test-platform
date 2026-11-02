// 테스트 스크립트 목록·상세 화면 글자의 영어 (SPEC §8.1). 키는 한국어 원문이다

export const 케이스말: Record<string, string> = {
  // 화면 머리와 집계 띠
  // 자리 이름과 화면 제목이 같은 말이다 (2026-10-19)
  '테스트 스크립트': 'Test scripts',
  '불러오는 중입니다': 'Loading…',
  '모두 {건수}건': '{건수} in total',
  '스캔하는 중': 'Scanning…',
  '다시 스캔': 'Rescan',
  '조건에 맞는 {건수}건 실행': 'Run {건수} matching',
  '{번호} / {전체}쪽': 'Page {번호} of {전체}',
  '상세 닫기': 'Close details',
  'RUN {번호} · {때}': 'RUN {번호} · {때}',
  '이 값으로 실행': 'Run with these values',
  '모두에게 저장': 'Save for everyone',
  '최근 실행 {건수}번': 'Last {건수} runs',
  '진행 보기': 'View progress',
  '한 건 실행': 'Single-case run',
  'RUN {번호}에 다시 실행으로 붙음': 'Attached to RUN {번호} as a rerun',
  '이력을 불러오지 못했습니다': 'Could not load the history',
  '{회수}번 · 실패 {실패} · 통과 {통과}': '{회수} attempts · {실패} failed · {통과} passed',
  '이 결과 엑셀로 ({건수}건)': 'Export these to Excel ({건수})',
  '만드는 중…': 'Building…',
  '케이스 목록을 모으는 중입니다. 다 모을 때까지 실행 버튼을 누를 수 없습니다':
    'Collecting the case list. Run stays disabled until it finishes.',

  // 스캔 결과 줄
  '아직 스캔 기록이 없습니다.': 'No scan yet.',
  '마지막 스캔 {때}': 'Last scan {때}',
  '{아이디} 중복 — {파일1}, {파일2}': '{아이디} appears in both {파일1} and {파일2}.',

  // 검색 칸과 조건 칩
  '케이스 이름이나 ID로 찾기': 'Search by case name or ID',
  '찾기': 'Search',
  '조건 초기화': 'Reset filters',
  '디바이스': 'Device',
  '표시': 'Show',
  '활성만': 'Active only',
  '마지막 결과': 'Last result',
  // 필터 판 — 조건마다 한 줄 설명 (2026-10-30 WEB-F7-07)
  '고른 조건에 맞는 케이스만 목록에 남습니다': 'Only cases that match the chosen filters stay in the list',
  '비활성 케이스는 「활성만」에서 숨기고 실행에서도 뺍니다': 'Inactive cases are hidden under "Active only" and left out of runs',
  '케이스를 만든 관점입니다 — 정상 동작 · 경계값 · 잘못된 입력': 'The angle the case was written from — normal behavior, boundary values, invalid input',
  '케이스를 설계할 때 쓴 방법입니다': 'The method used to design the case',
  '그 디바이스에서 도는 케이스만 남깁니다': 'Keeps only cases that run on that device',
  '새 빌드가 오면 먼저 도는 핵심 경로 케이스입니다': 'Core-path cases that run first when a new build arrives',
  '케이스를 실행했을 때 부른 서버입니다': 'Servers the case called when it ran',
  '{건수}건 보기': 'Show {건수}',
  // 표머리 (2026-09-22)
  케이스명: 'Case',
  '전체': 'All',
  '통과': 'Passed',
  '실패': 'Failed',
  '미실행': 'Not run',
  '미확정 {건수}건': '{건수} unconfirmed',
  // 설계 기법 — 값은 kit 식별자 그대로 질의에 가고 글자만 여기서 바뀐다 (도메인/카탈로그 §8.1)
  '설계 기법': 'Design technique',
  'API 서버': 'API server',
  '스모크': 'Smoke',
  '스모크만': 'Smoke only',
  '직접': 'manual',
  '{아이디} 스모크': '{아이디} smoke',
  '직접 고친 값입니다. 다시 누르면 AI 가 정한 값으로 돌아갑니다': 'Set by hand. Press again to go back to the value the AI set',
  'API 서버 {이름}': 'API server {이름}',
  '경계값 분석': 'Boundary value analysis',
  '동등 분할': 'Equivalence partitioning',
  '결정 테이블': 'Decision table',
  '상태 전이': 'State transition',
  '오류 추정': 'Error guessing',
  '기법 없음': 'No technique',

  // 맥락 — 기능 묶음 · 요구 · 종류 · 화면 (도메인/카탈로그 §8.1 「맥락」, 2026-10-11 시안 A).
  // 종류 낱말은 지도 ① 의 축 값 그대로 질의에 가고 글자만 여기서 바뀐다
  '정상': 'Normal',
  '경계': 'Boundary',
  '예외': 'Exception',
  '기능 묶음 없음': 'No feature',
  '화면': 'Screen',
  '화면 조각': 'Component',
  // 게임의 화면 파일은 창이다 (kind.ts 묶음말 · WEB-F7-16)
  '창': 'Window',
  '창 조각': 'Window part',
  '실패 {건수}': '{건수} failed',
  'PRD 에 연결되지 않은 케이스': 'Not linked to the PRD',
  '앞 쪽에서 이어짐': 'Continued from the previous page',
  '이것만 보기': 'Show only this',
  '{이름}만 보기': 'Show only {이름}',
  '연결된 요구 없음': 'No linked requirement',
  'PRD 관리에서 보기': 'Open in PRD',
  'PRD 에 없는 번호예요': 'Not in the PRD',
  '요구': 'Requirements',
  '요구 {번호}': 'Requirement {번호}',
  '{조건} 조건 풀기': 'Remove filter {조건}',

  // 케이스 한 줄
  '{아이디} {이름} 고르기': 'Select {아이디} {이름}',
  '실행 기록 없음': 'No runs yet',
  '상세': 'Details',
  '실행': 'Run',

  // 쪽 넘기기
  '이전': 'Previous',
  '다음': 'Next',
  '{번호}쪽': 'Page {번호}',

  // 빈 목록 세 갈래
  '아직 케이스를 불러오지 않았습니다': 'No cases loaded yet',
  '케이스 파일을 훑어 실행할 수 있는 케이스 목록을 만듭니다. 목록은 그때마다 코드에서 새로 만듭니다':
    'Scanning the case files builds the list of runnable cases. The code is the source of truth, so the list is rebuilt every time.',
  '케이스 불러오기': 'Load cases',
  '조건에 맞는 케이스가 없습니다': 'No cases match the filters',
  '「{친글자}」에 맞는 케이스가 없습니다': 'No cases match “{친글자}”',
  '거른 조건을 지우면 전체가 다시 보입니다': 'Clear the filters to see everything again',
  '아직 테스트가 없습니다': 'No tests yet',
  '「테스트 작성」에서 처음 작성을 시작합니다': 'Start writing the first tests in “Authoring”',
  '불러왔지만 케이스가 하나도 없습니다': 'Loaded, but there are no cases',
  '테스트 폴더가 비었거나 규칙에 걸려 읽지 못한 파일이 있습니다. 사유는 위 스캔 결과에 있습니다':
    'The tests folder is empty, or some files broke the rules and could not be read. The reason is in the scan result above.',

  // 케이스 상세 펼침
  '사전조건': 'Preconditions',
  '입력값': 'Inputs',
  '이 쪽 전체 선택': 'Select all on this page',
  // 여러 건 고르기 — 표 위 띠와 고르기 바 (2026-10-30 WEB-F7-08)
  '이 쪽 {수}건을 모두 골랐습니다': 'All {수} on this page are selected',
  '조건에 맞는 {전체}건 모두 고르기': 'Select all {전체} matching',
  '조건에 맞는 {전체}건을 모두 골랐습니다': 'All {전체} matching are selected',
  '고르기 풀기': 'Clear selection',
  '실행은 앞 {한계}건까지만 담습니다': 'A run takes only the first {한계}',
  '모두 고르면 삭제 요청은 보낼 수 없습니다(한 번에 {상한}건까지)': 'With all selected you cannot request deletion (up to {상한} at a time)',
  '고른 케이스': 'Selected cases',
  '조건에 맞는 {수}건 모두 고름': 'All {수} matching selected',
  '{수}건 고름': '{수} selected',
  '시험 절차': 'Test steps',
  '아직 돌린 적이 없습니다. 한 번 돌리면 절차가 여기에 남습니다':
    'Never run. Run it once and the steps will show up here.',
  '절차를 불러오지 못했습니다': 'Could not load the steps',
  '절차를 불러오는 중입니다': 'Loading the steps…',
  '실행 기록': 'Run history',
  '아직 기록이 없습니다§이력': 'No history yet',

  // 입력 칸 (Form)
  '이 케이스에는 입력값이 없습니다.': 'This case declares no inputs.',
  '입력됨': 'Saved',
  '비워도 됨': 'Optional',
  '고르지 않음': 'Not selected',
  '예': 'Yes',
  '아니오': 'No',
  '기본값': 'Default',
  '에서 바꿈': 'changed',
  '저장값': 'Saved',
  '코드 기본값': 'code default',

  // 실행 결과 회차 요약 (group.ts)
  '{통과}/{전체} 통과': '{통과}/{전체} passed',

  // Android 앱 애플리케이션의 빈 목록 (도메인/카탈로그 §8.1 「디바이스」)
  '아직 Android 앱 케이스가 없습니다': 'No Android app cases yet',
  '테스트 작성에서 앱 기획서를 넣으면 AI 가 Device VISION 폰으로 앱 화면을 읽고 케이스를 만듭니다':
    'Add an app PRD in Authoring and AI reads the app screens on a Device VISION phone to write cases',
  '테스트 작성으로': 'Go to Authoring',
};
