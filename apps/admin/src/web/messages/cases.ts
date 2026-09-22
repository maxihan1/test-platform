// 테스트케이스 목록·상세 화면 글자의 영어 (SPEC §8.1). 키는 한국어 원문이다

export const 케이스말: Record<string, string> = {
  // 화면 머리와 집계 띠
  // 자리 이름과 화면 제목을 가른다 (SPEC §8, 2026-09-22) — 같은 말을 두 번 하고 있었다
  '테스트 케이스': 'Testcase',
  '테스트케이스 목록': 'Testcase list',
  '불러오는 중입니다': 'Loading…',
  '모두 {건수}건': '{건수} in total',
  '스캔하는 중': 'Scanning…',
  '다시 스캔': 'Rescan',
  '전체 실행': 'Run all',
  '선택한 {건수}건 실행': 'Run {건수} selected',
  '마지막 실행 기준': 'as of last run',
  '한 번도 안 돌렸다': 'never run',
  '케이스 목록을 모으는 중입니다. 다 모을 때까지 실행 버튼을 누를 수 없습니다':
    'Collecting the case list. Run stays disabled until it finishes.',

  // 스캔 결과 줄
  '아직 스캔 기록이 없습니다.': 'No scan yet.',
  '마지막 스캔 {때} · 추가 {추가} · 갱신 {갱신} · 비활성 {비활성}':
    'Last scan {때} · added {추가} · updated {갱신} · deactivated {비활성}',
  '{아이디}이 {파일1}와 {파일2}에 겹쳐 있습니다.': '{아이디} appears in both {파일1} and {파일2}.',

  // 검색 칸과 조건 칩
  '케이스 이름이나 ID로 찾기': 'Search by case name or ID',
  '찾기': 'Search',
  '조건 초기화': 'Reset filters',
  '디바이스': 'Device',
  '표시': 'Show',
  '활성만': 'Active only',
  '마지막 결과': 'Last result',
  // 표머리 (2026-09-22)
  케이스명: 'Case',
  '전체': 'All',
  '통과': 'Passed',
  '실패': 'Failed',
  '미실행': 'Not run',

  // 케이스 한 줄
  '{아이디} {이름} 고르기': 'Select {아이디} {이름}',
  '지원 디바이스 {목록}': 'Runs on {목록}',
  '실행 이력 없음': 'No runs yet',
  '상세': 'Details',
  '실행': 'Run',
  '{개수}개 더': '{개수} more',

  // 쪽 넘기기
  '이전': 'Previous',
  '다음': 'Next',
  '{번호}쪽': 'Page {번호}',

  // 빈 목록 세 갈래
  '이 쪽에는 {결과}인 케이스가 없습니다': 'No {결과} cases on this page',
  '다음 쪽에 있을 수 있습니다. 나머지 조건은 서버가 전체에서 거릅니다':
    'They may be on another page. The other filters are applied across all cases on the server.',
  '아직 케이스를 불러오지 않았습니다': 'No cases loaded yet',
  '테스트 코드를 훑어 실행할 수 있는 케이스 목록을 만듭니다. 코드가 진실의 원천이라 목록은 그때마다 새로 만들어집니다':
    'Scanning the test code builds the list of runnable cases. The code is the source of truth, so the list is rebuilt every time.',
  '케이스 불러오기': 'Load cases',
  '조건에 맞는 케이스가 없습니다': 'No cases match the filters',
  '「{친글자}」에 맞는 케이스가 없습니다': 'No cases match “{친글자}”',
  '거른 조건을 지우면 전체가 다시 보입니다': 'Clear the filters to see everything again',
  '불러왔지만 케이스가 하나도 없습니다': 'Loaded, but there are no cases',
  '테스트 폴더가 비었거나 규칙에 걸려 읽지 못한 파일이 있습니다. 사유는 위 스캔 결과에 있습니다':
    'The tests folder is empty, or some files broke the rules and could not be read. The reason is in the scan result above.',

  // 케이스 상세 펼침
  '사전조건': 'Preconditions',
  '입력값': 'Inputs',
  '기대결과': 'Expected',
  '숫자': 'Number',
  '예/아니오': 'Yes/No',
  '글자': 'Text',
  '시험 절차': 'Test steps',
  '{실행이름} 에서 가져왔다': 'from {실행이름}',
  '아직 돌린 적이 없습니다. 한 번 돌리면 절차가 여기에 남습니다':
    'Never run. Run it once and the steps will show up here.',
  '절차를 불러오지 못했습니다': 'Could not load the steps',
  '절차를 불러오는 중입니다': 'Loading the steps…',
  '실행 이력': 'Run history',
  '최근 {건수}건': 'last {건수}',
  '아직 기록이 없습니다': 'No history yet',

  // 입력 칸 (Form)
  '이 케이스는 입력값을 선언하지 않았습니다.': 'This case declares no inputs.',
  '선택': 'Optional',
  '고르지 않음': 'Not selected',
  '예': 'Yes',
  '아니오': 'No',
  '기본값': 'Default',
  '에서 바꿈': 'changed',

  // 실행 결과 회차 요약 (group.ts)
  '{통과}/{전체} 통과': '{통과}/{전체} passed',
};
