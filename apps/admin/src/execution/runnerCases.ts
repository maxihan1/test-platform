// 러너에 새 꼴 요청(파일 하나 + 케이스 목록)을 보낸다 — 프로시저는 케이스마다 결과가 온다 (도메인/러너 §5.2 「프로시저 실행」)
// 케이스 테스트 실행(trialProc.ts)과 정식 실행의 프로시저 실행 단위(execUnit.ts)가 같이 쓴다. 옛 꼴 케이스는 옛 요청 그대로다 — 걷는 것은 TP-F6-32 다

import type { CasesExecuteRequest, CasesExecuteResponse } from '@platform/kit';

import { httpTimeoutMs, 거절사유, 러너에보낸다 } from './runner.js';

/** 러너에 못 갔거나 러너가 안 받았다 — 케이스마다 같은 사유의 미실행으로 채운다. 판정할 근거가 없으면 실패가 아니라 NA 다 */
export function 못간답(요청: Pick<CasesExecuteRequest, 'historyId' | 'cases'>, message: string, stack?: string): CasesExecuteResponse {
  const error = { message, ...(stack !== undefined && { stack }) };
  return { historyId: 요청.historyId, durationMs: 0, results: 요청.cases.map((c) => ({ tcId: c.tcId, status: 'NA', durationMs: 0, steps: [], error })), error };
}

/** 거절 · 끊김이면 던지지 않고 케이스마다 NA 로 접는다 — 옛 꼴 보낸다(runner.ts)와 같은 문장이다 */
export async function 케이스들을보낸다(body: CasesExecuteRequest): Promise<CasesExecuteResponse> {
  const startedAt = Date.now();
  try {
    const res = await 러너에보낸다('/execute', body, httpTimeoutMs(body.timeoutMs));
    if (res.status < 200 || res.status >= 300) return { ...못간답(body, 거절사유(res.status, res.json)), durationMs: Date.now() - startedAt };
    return res.json as CasesExecuteResponse;
  } catch (err) {
    return { ...못간답(body, '러너에 닿지 못했습니다', err instanceof Error ? err.message : String(err)), durationMs: Date.now() - startedAt };
  }
}
