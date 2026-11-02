// 성능 테스트 › 페이지 성능 · 부하 중 페이지 로딩 글자의 영어. 키는 한국어 원문이다 (도메인/성능 §8.14)

export const 성능페이지말: Record<string, string> = {
  // 머리 · 측정 조건
  '페이지 성능': 'Page speed',
  '최근 측정 {시각} · 페이지별 3회 측정 중앙값': 'Last measured {시각} · Median of 3 runs per page',
  '아직 측정한 적이 없습니다 · 페이지별 3회 측정 중앙값': 'Not measured yet · Median of 3 runs per page',
  측정: 'Measure',
  '측정 중': 'Measuring',
  '측정 조건': 'Measurement conditions',
  모바일: 'Mobile',
  '제한 없음': 'No limit',
  '측정 대상: 화면 지도 기준 주요 페이지 {수}개': 'Pages to measure: {수} main pages from the screen map',
  '측정 대상: 페이지 {수}개': 'Pages to measure: {수}',
  'AI 가 측정할 페이지를 고르는 중입니다': 'AI is choosing the pages to measure',
  '페이지 선택': 'Choose pages',
  '대상 서버를 골라 주세요': 'Choose a target server',
  '측정이 오류로 끝났습니다': 'The measurement ended with an error',
  '측정이 오류로 끝났습니다 — {까닭}': 'The measurement ended with an error — {까닭}',
  '아직 측정 결과가 없습니다. 측정을 누르면 페이지마다 속도를 잽니다': 'No results yet. Press Measure to time each page',
  // 기본 페이지 이름 — 서버에 저장되는 값이라 번역하지 않는다
  메인: 'Home',

  // 표 위 숫자 칸 줄 (WEB-F7-16) — 「목표 {값} 이하」 · 「측정 요약」은 기기 성능 결과도 같이 쓴다
  '측정 요약': 'Measurement summary',
  'LCP 평균': 'Average LCP',
  '다시 측정': 'Measure again',
  '전체 로드': 'Full load',
  '요청 수': 'Requests',
  'FCP 평균': 'Average FCP',
  '목표 넘은 페이지': 'Pages over target',
  '목표 {값} 이하': 'Target {값} or less',
  '목표 {값} 이상': 'Target {값} or more',
  // 결과 표
  '페이지별 측정 결과': 'Results per page',
  '목표 LCP 2.5초 · FCP 1.8초 · CLS 0.1 이하': 'Targets: LCP 2.5s · FCP 1.8s · CLS 0.1 or less',
  페이지: 'Page',
  'LCP 단독': 'LCP alone',
  'LCP 부하 중': 'LCP under load',
  '부하 중': 'under load',
  '부하 중 값: 성능 실행': 'Under-load values: performance run',
  ', 가상 사용자 {수}명 시점': ', at {수} virtual users',

  // 워터폴
  '{이름} 로딩 워터폴': '{이름} loading waterfall',
  '받은 리소스가 없습니다': 'No resources received',
  '{값} (LCP 요소: {요소})': '{값} (LCP element: {요소})',
  '{목록}이 차례로 걸려 LCP가 {값}인 그림': 'Waterfall of {목록}, with LCP at {값}',

  // 페이지 선택 창
  '측정할 페이지를 1개에서 {수}개까지 고릅니다': 'Choose 1 to {수} pages to measure',
  '경로는 /로 시작해야 합니다': 'The path must start with /',
  '경로는 {수}자까지 적을 수 있습니다': 'The path can be up to {수} characters',
  '이미 있는 경로입니다': 'This path is already in the list',
  '페이지는 {수}개까지 고를 수 있습니다': 'You can choose up to {수} pages',
  '{이름} 빼기': 'Remove {이름}',
  적용: 'Apply',

  // 실행 중 · 마법사
  '페이지 로딩 (부하 중)': 'Page loading (under load)',
  '{이름} LCP': '{이름} LCP',
  '목표 2.5초 초과': 'Over the 2.5s target',
  '단독 측정 {값}': 'Alone: {값}',
  '부하 중 페이지 로딩 측정': 'Measure page loading under load',
  '가장 최근 페이지 성능 측정에서 쓴 페이지를 브라우저 2개가 30초마다 엽니다': 'Two browsers open the pages from the latest page speed measurement every 30 seconds',
};
