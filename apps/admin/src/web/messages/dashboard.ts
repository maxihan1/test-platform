// 앱 대시보드(품질 현황) 화면 글자의 영어 (도메인/리포팅 §8.12). 키는 한국어 원문이다
// 통과 · 실패 · 미실행 · 디바이스 · 실행 · 서비스처럼 다른 표에 이미 있는 글자는 여기 다시 적지 않는다 — 뜻이 같아야 하고, 나중에 적힌 쪽이 이긴다

export const 대시보드말: Record<string, string> = {
  // 머리와 읽기
  '품질 현황': 'Quality overview',
  '서비스 {수}개 · 최근 {일}일 · {날짜} 기준': '{수} services · last {일} days · as of {날짜}',
  '이 브라우저의 시간대 「{시간대}」를 서버가 알아보지 못해 현황을 불러오지 못했습니다':
    'The server does not recognize this browser’s time zone “{시간대}”, so the overview could not be loaded',

  // 실행 중 줄
  '실행 중 {수}건': '{수} running',
  '{끝난} / {전체}건': '{끝난} / {전체}',
  '외 {수}건': '+{수} more',

  // 신규 실패
  '신규 실패': 'New failures',
  '최근 {일}일, 같은 서버의 직전 실행과 견줌': 'Last {일} days, compared with the previous run on the same server',
  '테스트와 실패 사유': 'Test and failure reason',
  '사유 없음': 'No reason recorded',
  '새 실패가 없습니다': 'No new failures',
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
  '미확정 {수}건은 따로 셉니다': '{수} unconfirmed are counted separately',

  // 서비스별 품질
  '서비스별 품질': 'Quality by service',
  '직전 {일}일 대비': 'vs previous {일} days',
  '최근 실행, 오른쪽이 최신': 'Recent runs, newest on the right',
  '직전 실행과 견줌': 'Against previous run',
  '마지막 실행': 'Last run',
  '마지막 실행이 없습니다': 'No run yet',
  '마지막 실행에 실패가 있습니다': 'The last run has failures',
  '마지막 실행에 실패가 없습니다': 'The last run has no failures',
  '신규 실패 {수}': '{수} new failures',
  '해결 {수}': '{수} fixed',
  '견줄 실행 없음': 'Nothing to compare',
  '변화 없음': 'No change',

  // 그래프 칸 제목 (그래프는 DashboardCharts)
  '일별 테스트 결과': 'Daily test results',
  '실패 히트맵': 'Failure heatmap',
  '요구사항 커버리지': 'Requirement coverage',

  // 실행 0
  '아직 실행한 테스트가 없습니다': 'No tests have run yet',
  '테스트 케이스를 실행하면 여기에 통과율 · 신규 실패 · 일별 결과가 쌓입니다': 'Run test cases and the pass rate, new failures and daily results build up here',
  '하루 한 번 정기 실행을 켜 두면 결과가 날마다 쌓여 추이가 보입니다': 'Turn on a daily scheduled run and results build up into a trend',
  '테스트 케이스로 가기': 'Go to test cases',
};
