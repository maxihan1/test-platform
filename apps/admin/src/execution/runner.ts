// 러너 POST /execute 호출 (SPEC §5.2). 판정은 러너가 만든다 — 여기서 다시 계산하지 않는다
// 러너가 죽거나 붙지 못해도 던지지 않는다. 한 항목의 고장이 나머지 항목까지 끌고 내려가면 안 된다

import type { ExecuteRequest, ExecuteResponse } from '@platform/kit';

import type { PendingItem } from './store.js';

// 러너는 자기 제한 시간이 지나면 자식을 죽이고 200 + NA로 돌려준다. 이쪽이 먼저 끊으면 그 부분 결과가 사라진다
const RUNNER_GRACE_MS = 30_000;

export function httpTimeoutMs(timeoutMs: number): number {
  return timeoutMs + RUNNER_GRACE_MS;
}

// 컨테이너에서는 compose가 http://runner:4000을 넣어 준다. 호스트에서 손으로 돌릴 때가 이 기본값이다
function runnerUrl(): string {
  return process.env.RUNNER_URL ?? 'http://localhost:4000';
}

function na(item: PendingItem, message: string, stack?: string): ExecuteResponse {
  // 판정할 근거가 없으면 NA다. 실패와 구분돼야 러너 고장과 케이스 실패가 섞이지 않는다 (SPEC §3.2)
  return { historyId: item.historyId, status: 'NA', durationMs: 0, steps: [], error: { message, stack } };
}

// 돌고 있는 자식 프로세스를 그룹째 끊어 달라고 한다. 이미 끝났거나 러너가 모르는 historyId면 false다 —
// 경합이지 고장이 아니므로 던지지 않는다 (SPEC §5.2)
export async function abortRunner(historyId: number): Promise<boolean> {
  try {
    const res = await fetch(`${runnerUrl()}/abort`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ historyId }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    return ((await res.json()) as { aborted?: boolean }).aborted === true;
  } catch {
    // 러너에 닿지 못해도 멈춤 자체는 성립한다. 항목은 이미 DB에서 닫혔다
    return false;
  }
}

export async function callRunner(runId: number, item: PendingItem): Promise<ExecuteResponse> {
  const body: ExecuteRequest = {
    runId,
    historyId: item.historyId,
    tcId: item.tcId,
    platform: item.platform,
    filePath: item.filePath,
    baseUrl: item.baseUrl,
    params: item.params,
    expected: item.expected,
    timeoutMs: item.timeoutMs,
  };

  const startedAt = Date.now();
  try {
    const res = await fetch(`${runnerUrl()}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(httpTimeoutMs(item.timeoutMs)),
    });

    if (!res.ok) {
      // 400·404·500은 전부 { error, detail } 이다. 사람이 읽을 사유로 합쳐 둔다
      const detail = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
      const message = detail === null
        ? `러너가 ${res.status}로 거절했다`
        : `러너가 거절했다: ${detail.error ?? res.status} — ${detail.detail ?? ''}`.trim();
      return { ...na(item, message), durationMs: Date.now() - startedAt };
    }

    return (await res.json()) as ExecuteResponse;
  } catch (err) {
    // 연결 실패·응답 없음. 이 항목만 NA로 접고 디스패처는 다음 항목으로 넘어간다.
    // 사람이 보는 문장은 사유 한 줄이고 원문(주소·포트)은 상세의 접힌 자리로 간다 (SPEC §8.3)
    const reason = err instanceof Error ? err.message : String(err);
    return { ...na(item, '러너에 닿지 못했습니다', reason), durationMs: Date.now() - startedAt };
  }
}
