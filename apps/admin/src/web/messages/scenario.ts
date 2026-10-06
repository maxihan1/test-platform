// E2E 시나리오 화면 글자의 영어. 키는 한국어 원문이다

export const 시나리오말: Record<string, string> = {
  '준비 전부 실행': 'All setup runs',
  '준비 {수}개 건너뜀': '{수} setup skipped',
  '저장값 사용': 'Use saved value',
  '입력값 {수}칸 직접 입력': '{수} inputs set here',
  '값 연결 {수}개': '{수} value links',
  '{초}초 기다림': 'Wait {초}s',
  '값 주입': 'Inject value',
  '요청 차단': 'Block request',
  '이전 응답 재사용': 'Reuse earlier response',
  '수정 요청으로 변경': 'Turn into update request',
  '{칸} ← {번호}번 {메서드} {무늬} 응답의 {경로}': '{칸} ← {경로} of step {번호} {메서드} {무늬} response',
  '{메서드} {무늬} ← {번호}번': '{메서드} {무늬} ← step {번호}',
  '모두 통과': 'All passed',
  '{번호}번에서 멈춤': 'Stopped at step {번호}',
};
