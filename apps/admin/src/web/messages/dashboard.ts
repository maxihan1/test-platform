// 앱 대시보드(품질 현황) 화면 글자의 영어 (도메인/리포팅 §8.12). 키는 한국어 원문이다
// 통과 · 실패 · 미실행 · 디바이스 · 실행 · 서비스처럼 다른 표에 이미 있는 글자는 여기 다시 적지 않는다 — 뜻이 같아야 하고, 나중에 적힌 쪽이 이긴다

export const 대시보드말: Record<string, string> = {
  // 머리와 읽기
  '애플리케이션 {수}개 · 최근 {일}일 · {날짜} 기준': '{수} applications · last {일} days · as of {날짜}',
  '최근 {일}일': 'Last {일} days',
  '이 브라우저의 시간대 「{시간대}」를 서버가 알아보지 못해 현황을 불러오지 못했습니다':
    'The server does not recognize this browser’s time zone “{시간대}”, so the overview could not be loaded',

  // 실행 중 줄
  '실행 중 {수}건': '{수} running',
  '{끝난} / {전체}건': '{끝난} / {전체}',
  '외 {수}건': '+{수} more',

  // 회귀 실패
  '회귀 실패': 'Regressions',
  '회귀 실패가 없습니다': 'No regressions',
  '{수}건 더 있습니다': '{수} more',
  '실행 기록에서 보기': 'View in run history',
  '이 실행에서 실패 카드를 찾지 못했습니다': 'Could not find the failure card in this run',
  '견줄 앞 실행이 없습니다': 'No earlier run to compare with',

  // 통과율
  '통과율': 'Pass rate',

  // 서비스별 품질
  '마지막 실행': 'Last run',
  '회귀 실패 {수}': '{수} regressions',
  '해결 {수}': '{수} fixed',
  '변화 없음': 'No change',

  // 그래프 칸 제목 (그래프는 DashboardCharts)

  // 일별 막대

  // 통과율 칸 아래 일별 선

  // 실패 히트맵

  // 요구사항 커버리지
  기능: 'Functional',
  전체: 'All',

  // 실패 유형
  '실패 유형': 'Failure types',
  '최근 {일}일 실패 · 미실행이 없습니다': 'No failed or not-run tests in the last {일} days',
  '기대 결과 불일치': 'Expected result mismatch',
  '요소를 찾지 못함': 'Element not found',
  타임아웃: 'Timeout',
  '환경 오류': 'Environment error',
  '그 밖': 'Other',
  '확인 문장의 기대 결과와 실제 값이 다름': 'A check’s expected and actual values differ',
  '화면에서 버튼 · 입력 칸을 결국 찾지 못함': 'A button or input never appeared on the screen',
  '제한 시간 안에 완료되지 않음': 'Did not finish within the time limit',
  '대상 서버 · 테스트 실행기에 닿지 못하거나 테스트 실행기가 거절함': 'Could not reach the target server or runner, or the runner refused',
  '위 넷에 들지 않는 그 밖의 오류': 'Any other error not in the four above',
  '실행이 중단되어 실행되지 못한 {수}건은 집계하지 않았습니다': '{수} tests that did not run because the run was stopped are not counted',

  // 실행 0
  '아직 실행한 테스트가 없습니다': 'No tests have run yet',
  '하루 한 번 정기 실행을 켜 두면 결과가 날마다 쌓여 추이가 보입니다': 'Turn on a daily scheduled run and results build up into a trend',
  '설정에서 정기 실행 켜기': 'Turn on scheduled runs in Settings',
  '케이스 보기': 'View cases',

  // 실패 이유 읽기 (2026-10-19 ⑫-3 · 도메인/실행 §8.3)

  // 검토할 것 (2026-10-30 WEB-F7-06)

  // AI 품질 (2026-11-01 BTS-F8-01)

  // 종류별 칸
  '엔드포인트': 'Endpoint',

  // 프로젝트 요약 (2026-11-10 개편)
  '0초 ── {초}초': '0 s ── {초} s',
  'AI가 기획서로 작성': 'Written by AI from the specs',
  'E2E 시나리오 최근 결과': 'Latest E2E scenario results',
  'FPS 평균': 'Average FPS',
  'PRD 초안 확인': 'Review the PRD draft',
  'UI 테스트 {수}': '{수} UI tests',
  '{이름} · 페이지마다 최근 측정': '{이름} · latest measurement per page',
  '{일}일': '{일} days',
  '{초}초 동안 가상 사용자 · 초당 요청 · 95% 응답시간': 'Virtual users · requests per second · p95 response time over {초} s',
  '가상 사용자 (최대 {수})': 'Virtual users (max {수})',
  '값 없음': 'No data',
  '결정할 것이 없습니다': 'Nothing to decide',
  '기능 {기능} · UI {UI}': 'Functional {기능} · UI {UI}',
  '기능 테스트 {수}': '{수} functional tests',
  '기획서 {수}개 · 확인 필요 {확인}': '{수} specs · {확인} to check',
  '기획서로 테스트를 작성하고 실행하면 여기에 요구사항 추적 · 실행 결과 · 성능이 쌓입니다': 'Write tests from your specs and run them — requirement tracing, results and performance will build up here',
  '기획서와 실제 화면이 다른 곳': 'Where the spec and the actual screen differ',
  '더보기 ({수})': 'Show more ({수})',
  '디스크': 'Disk',
  '모니터링 에이전트 연결 전': 'Monitoring agent not connected',
  '부하 테스트 기록 없음': 'No load tests yet',
  '서버 · 웹 클라이언트 · 앱과 게임 클라이언트': 'Server · web client · app and game clients',
  '서버 모니터링 · 부하 중 최대값': 'Server monitoring · max during load',
  '성능 · 95% 응답시간': 'Performance · p95 response time',
  '시나리오마다 가장 최근 결과 하나 · 최근 {수}개': 'Latest result per scenario · last {수}',
  '아직 실행한 E2E 시나리오가 없습니다': 'No E2E scenarios have run yet',
  '에러율 {에러} · 최대 TPS {TPS}': 'Error rate {에러} · max TPS {TPS}',
  '요구사항 추적 (RTM)': 'Requirements traceability (RTM)',
  '요구사항마다 붙은 테스트의 마지막 결과': 'Latest result of the tests linked to each requirement',
  '일부 미실행 {수}': '{수} partly not run',
  '작성 결과 반영 확인': 'Review the authoring result',
  '작성 결과 수정 필요': 'Authoring result needs fixing',
  '이전 실행에서는 통과했던 케이스 · 최근 {일}일': 'Cases that passed in the previous run · last {일} days',
  '변경된 API 의 테스트를 다시 만들까요?': 'Rebuild the tests for the changed APIs?',
  '초당 요청 수': 'Requests per second',
  '최근 실행 {수}회': 'Last {수} runs',
  '최근 실행 결과': 'Latest results',
  '최근 측정 기록이 없습니다': 'No recent measurement',
  '최대 TPS': 'Max TPS',
  '추적표 엑셀': 'RTM Excel',
  '커버리지': 'Coverage',
  '커버리지 · 테스트가 있는 요구사항 {수} / {전체}': 'Coverage · requirements with tests {수} / {전체}',
  '케이스마다 마지막 결과 · 흐름은 최근 실행 (초록 통과 · 빨강 실패가 있음 · 회색 그 밖)': 'Latest result per case · trend is recent runs (green passed · red has failures · gray other)',
  '테스트 설계 분포 · 요구사항과 케이스 연결 기준': 'Test design mix · by requirement–case links',
  '테스트 없음 {수}': '{수} without tests',
  '통과 {통과} · 실패 {실패}': '{통과} passed · {실패} failed',
  '통과 {통과} · 실패 {실패} · 시나리오 {수}개': '{통과} passed · {실패} failed · {수} scenarios',
  '통과율 · 실패 {수}': 'Pass rate · {수} failed',
  '페이지 성능 · LCP': 'Page performance · LCP',
  '페이지 성능 · {주소} LCP': 'Page performance · {주소} LCP',
  '페이지 성능 측정 기록 없음': 'No page performance measurements yet',
  '프레임 드랍률': 'Frame drop rate',
  '프로젝트 요약': 'Project summary',
};
