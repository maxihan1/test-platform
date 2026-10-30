// 성능 테스트 › 실행 기록 · 실행 중 · 결과 · 정기 실행 글자의 영어. 키는 한국어 원문이다 (도메인/성능 §8.14)

export const 성능실행말: Record<string, string> = {
  // 머리
  '에이전트 {수}대': '{수} agents',
  '아직 시작 전': 'Not started yet',
  '{시각} 시작': 'Started {시각}',
  '{수}초': '{수}s',
  '{수}명': '{수} VUs',
  '{수}분': '{수} min',

  // 끝난 까닭 (§3.9 끝난 모양 표)
  '성능 목표를 벗어나 자동 중단': 'Auto-stopped after leaving the targets',
  '에러율 20% 초과로 자동 중단': 'Auto-stopped, error rate over 20%',
  '스모크 테스트 실패': 'Smoke test failed',
  '부하 발생 에이전트 연결 끊김': 'Load generator disconnected',
  '사람이 중단': 'Stopped by a person',

  // 실행 중
  '가상 사용자': 'Virtual users',
  '최대 {수}명': 'Up to {수}',
  '목표 {값}': 'Target {값}',
  ', 초과 시 자동 중단': ', auto-stops when exceeded',
  '응답시간과 가상 사용자 추이': 'Response time and virtual users',
  '가상 사용자와 95% 응답시간 추이 그래프': 'Graph of virtual users and p95 response time over time',
  '서버 모니터링 에이전트를 고르지 않았습니다': 'No monitoring agent was selected',
  '트랜잭션별 현황': 'Transactions now',
  '실행 로그': 'Run log',
  '아직 기록이 없습니다': 'Nothing logged yet',
  '아직 받은 숫자가 없습니다': 'No numbers received yet',
  '실행을 중단할까요?': 'Stop this run?',
  '지금까지 모인 숫자는 남고 성능 목표 판정은 내지 않습니다': 'Numbers so far are kept and no verdict is given',
  '이미 끝난 실행입니다': 'This run has already finished',
  메모리: 'Memory',
  '{값} (초과)': '{값} (exceeded)',

  // 결과
  'PDF로 내려받기': 'Download PDF',
  '다시 실행': 'Run again',
  '최대 동시 사용자': 'Max concurrent users',
  '이전 실행 {값}': 'Previous run {값}',
  'AI 분석': 'AI analysis',
  'AI 분석을 만드는 중입니다': 'AI is building the analysis',
  'AI 분석을 만들지 못했습니다': 'AI could not build the analysis',
  '다시 만들기': 'Build again',
  '성능 목표 달성 여부': 'Target results',
  '정한 성능 목표가 없어 판정 없이 숫자만 남았습니다': 'No targets were set, so only numbers were kept',
  측정값: 'Measured',
  '측정값은 자동 중단 직전 10초 기준, TPS는 최대값': 'Measured over the last 10 s before auto-stop; TPS is the peak',
  '측정값은 전체 구간 기준, TPS는 최대값': 'Measured over the whole run; TPS is the peak',
  '시간대별 추이': 'Trend over time',
  '서버 모니터링 CPU 그래프': 'Server monitoring CPU graph',
  '트랜잭션별 결과': 'Transaction results',
  '(가상 사용자 {수}명 시점)': '(at {수} virtual users)',
  '이전 실행': 'Previous run',
  변화: 'Change',
  '{수}% 증가': '{수}% higher',
  '성능 저하': 'Regression',

  // 실행 기록
  '아직 성능 테스트 실행이 없습니다': 'No performance runs yet',
  '성능 실행 목록': 'Performance runs',
  '테스트 유형 · 대상 서버': 'Test type · Target server',
  '걸린 시간': 'Duration',
  '이전 실행 대비': 'Vs previous run',
  정기: 'Scheduled',
  '번호를 누르면 실행 중이면 실행 중 화면, 끝났으면 결과 화면이 열립니다': 'Open a number to see the live screen while running, or the result once finished',

  // 정기 실행
  '매일 {시각} · {서버}': 'Daily {시각} · {서버}',
  끄기: 'Turn off',
  켜기: 'Turn on',
  '{서버} · 부하 테스트 불가': '{서버} · cannot be load tested',
  '매일 이 시각에 이 시나리오를 저장된 설정 그대로 돌립니다': 'Runs this scenario every day at this time with the saved settings',
  '시각과 대상 서버를 골라 주세요': 'Pick a time and a target server',

  // PRD 추적표
  '성능 목표 {수}개': '{수} performance targets',
  // 성능 실행 기록 — 페이지 · 기기 측정 줄의 고리 (종류는 꼬리표가 말한다, WEB-F7-18)
  '측정 결과': 'Measurement result',
};
