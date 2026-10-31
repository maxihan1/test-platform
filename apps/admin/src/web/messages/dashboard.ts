// 앱 대시보드(품질 현황) 화면 글자의 영어 (도메인/리포팅 §8.12). 키는 한국어 원문이다
// 통과 · 실패 · 미실행 · 디바이스 · 실행 · 서비스처럼 다른 표에 이미 있는 글자는 여기 다시 적지 않는다 — 뜻이 같아야 하고, 나중에 적힌 쪽이 이긴다

export const 대시보드말: Record<string, string> = {
  // 머리와 읽기
  '애플리케이션 {수}개 · 최근 {일}일 · {날짜} 기준': '{수} applications · last {일} days · as of {날짜}',
  '{이름} · 최근 {일}일 · {날짜} 기준': '{이름} · last {일} days · as of {날짜}',
  '전체 애플리케이션': 'All applications',
  '최근 {일}일': 'Last {일} days',
  '이 브라우저의 시간대 「{시간대}」를 서버가 알아보지 못해 현황을 불러오지 못했습니다':
    'The server does not recognize this browser’s time zone “{시간대}”, so the overview could not be loaded',

  // 실행 중 줄
  '실행 중 {수}건': '{수} running',
  '{끝난} / {전체}건': '{끝난} / {전체}',
  '외 {수}건': '+{수} more',

  // 회귀 실패
  '회귀 실패': 'Regressions',
  '최근 {일}일, 같은 서버의 직전 실행과 견줌': 'Last {일} days, compared with the previous run on the same server',
  '회귀 실패가 없습니다': 'No regressions',
  '{수}건 더 있습니다': '{수} more',
  '실행 기록에서 보기': 'View in run history',
  '이 실행에서 실패 카드를 찾지 못했습니다': 'Could not find the failure card in this run',
  '견줄 앞 실행이 없습니다': 'No earlier run to compare with',

  // 통과율
  '통과율': 'Pass rate',
  '최근 {일}일 판정 {수}건': '{수} verdicts in the last {일} days',
  '▲ {값}%p 직전 {일}일 대비': '▲ {값} pp vs previous {일} days',
  '▼ {값}%p 직전 {일}일 대비': '▼ {값} pp vs previous {일} days',
  '– 직전 {일}일과 같습니다': '– Same as previous {일} days',
  '직전 {일}일': 'Previous {일} days',
  '직전 {일}일 실행 없음': 'No runs in the previous {일} days',
  '최근 {일}일 실행 없음': 'No runs in the last {일} days',

  // 서비스별 품질
  '애플리케이션별 품질': 'Quality by application',
  '직전 {일}일 대비': 'vs previous {일} days',
  '최근 실행, 맨 앞이 최신': 'Recent runs, newest first',
  '직전 실행과 견줌': 'Against previous run',
  '마지막 실행': 'Last run',
  '마지막 실행이 없습니다': 'No run yet',
  '마지막 실행에 실패가 있습니다': 'The last run has failures',
  '마지막 실행에 실패가 없습니다': 'The last run has no failures',
  '회귀 실패 {수}': '{수} regressions',
  '해결 {수}': '{수} fixed',
  '견줄 실행 없음': 'Nothing to compare',
  '변화 없음': 'No change',

  // 그래프 칸 제목 (그래프는 DashboardCharts)
  '일별 테스트 결과': 'Daily test results',
  '실패 히트맵': 'Failure heatmap',
  '요구사항 커버리지': 'Requirement coverage',

  // 일별 막대
  '막대 위 숫자는 실패 건수': 'The number above a bar is the failure count',
  '주말': 'Weekend',
  '최근 {일}일 통과 {통과} · 미실행 {미실행} · 실패 {실패}, 실패가 가장 많은 날 {날짜}':
    'Last {일} days: passed {통과} · not run {미실행} · failed {실패}, most failures on {날짜}',
  '최근 {일}일 통과 {통과} · 미실행 {미실행} · 실패 {실패}': 'Last {일} days: passed {통과} · not run {미실행} · failed {실패}',
  '{날짜} ({요일}) 통과 {통과} · 미실행 {미실행} · 실패 {실패}': '{날짜} ({요일}) passed {통과} · not run {미실행} · failed {실패}',
  '{날짜} ({요일}) 실행 없음': '{날짜} ({요일}) no runs',

  // 통과율 칸 아래 일별 선
  '일별 통과율': 'Daily pass rate',
  '{날짜} 통과율 {값}%': '{날짜} pass rate {값}%',

  // 실패 히트맵
  '최근 {일}일 실패가 많은 케이스': 'Cases with the most failures in the last {일} days',
  '2 이상': '2 or more',
  '{날짜} 실패 없음': '{날짜} no failures',
  '{날짜} 실패 1회': '{날짜} 1 failure',
  '{날짜} 실패 2회 이상': '{날짜} 2 or more failures',
  '최근 {일}일 실패가 많은 케이스 {수}개의 날짜별 실패 횟수. 가장 많은 것은 {TC}':
    'Failures per day for the {수} cases with the most failures in the last {일} days. Most failures: {TC}',
  '최근 {일}일 실패한 케이스가 없습니다': 'No cases failed in the last {일} days',

  // 요구사항 커버리지
  '마지막 작성 기준': 'Based on the last authoring run',
  '테스트 있는 요구 {덮음} / {전체}': 'Requirements with tests: {덮음} / {전체}',
  기능: 'Functional',
  전체: 'All',
  '기능 · UI 를 나누기 전에 작성한 애플리케이션 {수}개는 게이지에 넣지 않았습니다':
    '{수} applications authored before the functional / UI split are left out of the gauges',
  '{날짜} · 요청 #{번호}': '{날짜} · request #{번호}',
  '테스트 없는 요구 {수}건 보기': 'View {수} requirements without tests',
  '작성 기록이 없습니다': 'No authoring run yet',

  // 실패 유형
  '실패 유형': 'Failure types',
  '최근 {일}일 실패 · 미실행의 원인': 'Causes of failed and not-run tests in the last {일} days',
  '최근 {일}일 실패 · 미실행이 없습니다': 'No failed or not-run tests in the last {일} days',
  '기대 결과 불일치': 'Expected result mismatch',
  '요소 미검출': 'Element not found',
  타임아웃: 'Timeout',
  '환경 오류': 'Environment error',
  '그 밖': 'Other',
  '확인 문장의 기대값과 실제 값이 다름': 'A check’s expected and actual values differ',
  '화면에서 버튼 · 입력 칸을 끝내 찾지 못함': 'A button or input never appeared on the screen',
  '제한 시간 안에 끝나지 않음': 'Did not finish within the time limit',
  '대상 서버 · 테스트 실행기에 닿지 못하거나 테스트 실행기가 거절함': 'Could not reach the target server or runner, or the runner refused',
  '위 넷에 들지 않는 그 밖의 오류': 'Any other error not in the four above',
  '실행이 멈춰 돌지 못한 {수}건은 세지 않았습니다': '{수} tests that did not run because the run was stopped are not counted',

  // 실행 0
  '아직 실행한 테스트가 없습니다': 'No tests have run yet',
  '테스트 스크립트를 실행하면 여기에 통과율 · 회귀 실패 · 일별 결과가 쌓입니다': 'Run test scripts and the pass rate, regressions and daily results build up here',
  '하루 한 번 정기 실행을 켜 두면 결과가 날마다 쌓여 추이가 보입니다': 'Turn on a daily scheduled run and results build up into a trend',
  '설정에서 정기 실행 켜기': 'Turn on scheduled runs in Settings',
  '케이스 보기': 'View cases',

  // 실패 이유 읽기 (2026-10-19 ⑫-3 · 도메인/실행 §8.3)
  '테스트와 실패 유형': 'Test and failure type',

  // 검토할 것 (2026-10-30 WEB-F7-06)
  '검토할 것': 'To review',
  '건': 'items',
  '직전 실행에서는 통과': 'Passed in the previous run',
  '테스트 작성에서 고를 것': 'Waiting for your pick in test authoring',
  '서버 · 테스트 실행기에 닿지 못함': 'Could not reach the server or test runner',

  // AI 품질 (2026-11-01 BTS-F8-01)
  'AI 품질': 'AI quality',
  '초안 AI 아직 없음': 'Draft AI: nothing yet',
  '초안 AI {율}% ({고름}/{씀}줄)': 'Draft AI {율}% ({고름}/{씀} rows)',
  '수정 AI 아직 없음': 'Fix AI: nothing yet',
  '수정 AI {율}% ({병합}/{끝남} PR)': 'Fix AI {율}% ({병합}/{끝남} PRs)',

  // 종류별 칸
  '브라우저별 결과': 'Results by browser',
  '기기별 결과': 'Results by device',
  '창별 결과': 'Results by window',
  '엔드포인트별 결과': 'Results by endpoint',
  '모바일 · Chromium': 'Mobile · Chromium',
  '디바이스 정보 없는 결과 {건}건': '{건} results without device info',
  '기기 정보 없는 결과 {건}건': '{건} results without device info',
  '창 정보 없는 결과 {건}건': '{건} results without window info',
  '엔드포인트 정보 없음': 'No endpoint info',
  '최근 {일}일 결과가 없습니다': 'No results in the last {일} days',
  '엔드포인트': 'Endpoint',
  '95% 응답': 'p95 response',
  '모바일에서만 실패한 케이스 {건}건': '{건} cases failed only on mobile',
  '{기기} 에서만 실패한 케이스 {건}건': '{건} cases failed only on {기기}',
  '게임 성능 측정 {회}회 · 평균 FPS {평균} · {선} 아래로 떨어짐 {번}회': '{회} game performance runs · avg FPS {평균} · dropped below {선} {번} times',
};
