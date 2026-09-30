// 러너 POST /execute 호출 (SPEC §5.2). 판정은 러너가 만든다 — 여기서 다시 계산하지 않는다
// 러너가 죽거나 붙지 못해도 던지지 않는다. 한 항목의 고장이 나머지 항목까지 끌고 내려가면 안 된다

import http from 'node:http';
import https from 'node:https';

import type {
  ExecuteRequest,
  ExecuteResponse,
  RunningStep,
  ScenarioExecuteRequest,
  ScenarioExecuteResponse,
} from '@platform/kit';

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

// 지금 러너에서 돌고 있는 절차들. 닿지 못하거나 200 이 아니면 빈 목록이다 —
// 한 번 실패가 곧 「러너가 죽었다」는 아니고, 러너 고장을 사람에게 알리는 자리는 따로 있다 (SPEC §8.3).
// **여기서 거르지 않는다.** 러너의 목록은 모든 서비스의 자식을 담고 runId 칸이 없다 (SPEC §5.2)
export async function 진행(): Promise<RunningStep[]> {
  try {
    // 화면이 짧은 주기로 다시 묻는다. 오래 매달려 있어 봐야 다음 물음이 덮는다
    const res = await fetch(`${runnerUrl()}/progress`, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return [];
    return ((await res.json()) as { items?: RunningStep[] }).items ?? [];
  } catch {
    return [];
  }
}

// 400·404·500은 전부 { error, detail } 이다. 사람이 읽을 사유로 합쳐 둔다
function 거절사유(status: number, json: unknown): string {
  const detail = json as { error?: string; detail?: string } | null;
  return detail === null
    ? `러너가 ${status}로 거절했다`
    : `러너가 거절했다: ${detail.error ?? status} — ${detail.detail ?? ''}`.trim();
}

// fetch(undici) 는 응답 머리를 300초까지만 기다린다(headersTimeout). 러너는 판이 끝나야 머리를 보내므로
// 5분 넘는 케이스·시나리오가 그 벽에 끊긴다. 그래서 긴 호출은 node:http 로 보내고 제한은 요청 전체에 한 번만 건다
// 주소를 넘기면 그 러너로 간다 — 테스트 실행이 내 컴퓨터 러너(LOCAL_RUNNER_URL)를 부른다
export function 러너에보낸다(경로: string, 본문: unknown, 제한ms: number, 주소: string = runnerUrl()): Promise<{ status: number; json: unknown }> {
  const url = new URL(`${주소}${경로}`);
  const data = JSON.stringify(본문);
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) },
        // 공용 agent 의 keep-alive 소켓 제한(5초)이 긴 응답에 끼어들지 않게 한 번 쓰고 버린다
        agent: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('error', reject);
        res.on('end', () => {
          clearTimeout(timer);
          const status = res.statusCode ?? 0;
          try {
            resolve({ status, json: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
          } catch (err) {
            // 거절 응답의 본문이 JSON 이 아니면 상태만으로 사유를 만든다. 200 인데 못 읽으면 결과가 없는 것이다
            if (status >= 200 && status < 300) reject(new Error(`러너 응답을 JSON 으로 읽지 못했다: ${String(err)}`));
            else resolve({ status, json: null });
          }
        });
      },
    );
    const timer = setTimeout(() => req.destroy(new Error(`러너가 ${제한ms}ms 안에 답하지 않았다`)), 제한ms);
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    req.end(data);
  });
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
    const res = await 러너에보낸다('/execute', body, httpTimeoutMs(item.timeoutMs));

    if (res.status < 200 || res.status >= 300) {
      return { ...na(item, 거절사유(res.status, res.json)), durationMs: Date.now() - startedAt };
    }

    return res.json as ExecuteResponse;
  } catch (err) {
    // 연결 실패·응답 없음. 이 항목만 NA로 접고 디스패처는 다음 항목으로 넘어간다.
    // 사람이 보는 문장은 사유 한 줄이고 원문(주소·포트)은 상세의 접힌 자리로 간다 (SPEC §8.3)
    const reason = err instanceof Error ? err.message : String(err);
    return { ...na(item, '러너에 닿지 못했습니다', reason), durationMs: Date.now() - startedAt };
  }
}

// 시나리오 한 판을 러너에 맡긴다 (도메인/러너 「시나리오 실행」). 케이스 호출과 같은 문장으로 접는다 (도메인/시나리오 §7).
// 거절·끊김이면 부품을 비워 돌려준다 — 부품마다 NA 를 채우는 것은 짝 없는 행을 닫는 저장 쪽 규칙이 한다
export async function callScenarioRunner(요청: ScenarioExecuteRequest): Promise<ScenarioExecuteResponse> {
  const startedAt = Date.now();
  const 접는다 = (message: string, stack?: string): ScenarioExecuteResponse => ({
    status: 'NA',
    durationMs: Date.now() - startedAt,
    parts: [],
    error: { message, stack },
  });
  try {
    const res = await 러너에보낸다('/execute-scenario', 요청, httpTimeoutMs(요청.timeoutMs));
    if (res.status < 200 || res.status >= 300) return 접는다(거절사유(res.status, res.json));
    return res.json as ScenarioExecuteResponse;
  } catch (err) {
    return 접는다('러너에 닿지 못했습니다', err instanceof Error ? err.message : String(err));
  }
}
