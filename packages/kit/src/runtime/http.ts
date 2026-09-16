// API 케이스는 화면이 없으므로 스크린샷 자리에 요청·응답 원문을 남긴다 (SPEC §4)

import { stepScope } from './context.js';

export function recordHttpTrace(request: unknown, response: unknown): void {
  const scope = stepScope.getStore();
  // 절차 밖의 호출은 남길 자리가 없다. 검증이 아니라 기록이므로 조용히 버린다
  if (!scope) return;
  scope.httpTrace = { request, response };
}
