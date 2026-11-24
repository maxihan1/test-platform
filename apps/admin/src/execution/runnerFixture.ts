// 테스트의 가짜 러너가 쓰는 답 — 요청의 케이스마다 같은 결과를 한 건씩 담는다 (도메인/러너 §5.2 「프로시저 실행」)

import type { CaseResult, ExecuteRequest, ExecuteResponse } from '@platform/kit';

export const 러너답 = (요청: Pick<ExecuteRequest, 'historyId' | 'cases'>, 것: Partial<CaseResult> = {}): ExecuteResponse => ({
  historyId: 요청.historyId,
  durationMs: 것.durationMs ?? 1,
  results: 요청.cases.map(({ tcId }) => ({ tcId, status: 'PASS', durationMs: 1, steps: [], ...것 })),
});
