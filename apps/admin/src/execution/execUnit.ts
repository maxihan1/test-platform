// 실행 단위 하나를 러너에 보내고 결과를 되쓴다 — 옛 꼴 케이스는 케이스 하나, 프로시저는 케이스 여럿이 요청 하나다
// (SPEC 도메인/실행 §3.2 「테스트 프로시저 실행」 · 도메인/러너 §5.2 「프로시저 실행」). dispatcher.ts 가 300줄을 넘어 여기 둔다

import type { ExecuteRequest, ExecuteResponse } from '@platform/kit';

import { finishExec, 실행단위를시작한다 } from './execFinish.js';
import { 항목화면을닫는다, 항목화면을연다 } from './live.js';
import type { 줄결과 } from './runLifecycle.js';
import { callRunner, na, 못간답, 실행칸, 폰에보낸다, type 잡은폰 } from './runner.js';
import { finishItem, type PendingItem } from './store.js';
import { trace적재를맡긴다 } from './traceIngest.js';

/** 같이 도는 케이스 줄 묶음 — 프로세스 하나 · 폰 연결 한 번이다. 옛 꼴 케이스는 줄 하나이고 procId 가 없다 */
export interface 실행단위 {
  execId: number;
  procId?: string;
  /** 도는 차례대로 */
  케이스들: PendingItem[];
}

/** 실행 만들기가 준 케이스 줄을 실행 단위로 묶는다. 한 실행 단위의 줄은 도는 차례대로 온다 (runExec.ts 실행단위를넣는다) */
export function 단위로묶는다(items: readonly PendingItem[]): 실행단위[] {
  const 단위들 = new Map<number, 실행단위>();
  for (const item of items) {
    const 앞 = 단위들.get(item.execId);
    if (앞 === undefined) 단위들.set(item.execId, { execId: item.execId, ...(item.procId !== undefined && { procId: item.procId }), 케이스들: [item] });
    else 앞.케이스들.push(item);
  }
  return [...단위들.values()];
}

const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

async function 저장한다(item: PendingItem, result: 줄결과): Promise<void> {
  try {
    await finishItem(item.historyId, result);
    // 기다리지 않는다 — 풀기는 실행을 늦추지 않게 따로 한 줄로 돈다 (SPEC 실행 §3.2 「trace」)
    void trace적재를맡긴다(item.historyId);
  } catch (err) {
    // 결과를 못 적었다고 나머지 항목까지 버리지 않는다
    const reason = 글(err);
    console.error(`[execution] ${item.tcId}/${item.platform}(history ${item.historyId}) 결과를 저장하지 못했다: ${reason}`);
    // 안 닫으면 finishRun 이 그 실행을 재기동 때까지 RUNNING 에 둔다. 판정은 잃었으니 미실행으로 닫는다
    try {
      await finishItem(item.historyId, na(item, '결과를 저장하지 못했습니다', reason));
    } catch (닫기실패) {
      console.error(`[execution] history ${item.historyId} 를 미실행으로 닫지도 못했다(재기동 복구가 닫는다)`, 닫기실패);
    }
  }
}

const 케이스목록 = (단위: 실행단위): Pick<ExecuteRequest, 'historyId' | 'cases'> => ({
  historyId: 단위.execId,
  cases: 단위.케이스들.map((c) => ({ tcId: c.tcId, params: c.params, expected: c.expected })),
});

async function 프로시저를저장한다(단위: 실행단위, 답: ExecuteResponse): Promise<void> {
  try {
    await finishExec(단위.execId, 답);
  } catch (err) {
    // 케이스 줄 여럿이 한 묶음이라 하나가 깨지면 그 실행 단위의 판정을 다 잃는다 — 옛 꼴과 같이 미실행으로 닫아 실행이 끝나게 한다
    const reason = 글(err);
    console.error(`[execution] 프로시저 ${단위.procId ?? ''}(실행 단위 ${단위.execId}) 결과를 저장하지 못했다: ${reason}`);
    try {
      await finishExec(단위.execId, 못간답(케이스목록(단위), '결과를 저장하지 못했습니다', reason));
    } catch (닫기실패) {
      console.error(`[execution] 실행 단위 ${단위.execId} 를 미실행으로 닫지도 못했다(재기동 복구가 닫는다)`, 닫기실패);
    }
  }
  // 프로시저는 브라우저에서 돌지 않아 trace 가 없다 — 옛 꼴 앱 항목처럼 케이스 줄마다 「없는 까닭」 줄만 남긴다
  for (const item of 단위.케이스들) void trace적재를맡긴다(item.historyId);
}

/** 러너에 안 보내고 그 실행 단위의 케이스 줄을 같은 사유의 미실행으로 닫는다 — 폰 · PC 를 못 잡았을 때다 */
export async function 단위를닫는다(단위: 실행단위, 까닭: string, stack?: string): Promise<void> {
  if (단위.procId === undefined) await 저장한다(단위.케이스들[0]!, na(단위.케이스들[0]!, 까닭, stack));
  else await 프로시저를저장한다(단위, 못간답(케이스목록(단위), 까닭, stack));
}

/** 실행 단위 하나를 보내고 답을 저장한다. 옛 꼴 케이스는 케이스 1건짜리 목록이고 API 문서 버전을 싣는다(callRunner) */
export async function 단위를돌린다(runId: number, 단위: 실행단위, 멈췄나: () => boolean, 잡은폰?: 잡은폰): Promise<void> {
  if (멈췄나()) return;
  // 시작 시각을 못 적었다고 실행을 버리지 않는다 — 판정과 끝난 때는 답을 저장할 때 따로 적는다
  await 실행단위를시작한다(단위.execId).catch((err: unknown) => {
    console.error(`[execution] 실행 단위 ${단위.execId} 의 시작 시각을 적지 못했다: ${글(err)}`);
  });
  const 첫 = 단위.케이스들[0]!;
  if (단위.procId === undefined) {
    await 저장한다(첫, await callRunner(runId, 첫, 멈췄나, 잡은폰));
    return;
  }
  const 요청: ExecuteRequest = {
    runId,
    ...케이스목록(단위),
    platform: 첫.platform,
    filePath: 첫.filePath,
    baseUrl: 첫.baseUrl,
    procId: 단위.procId,
    // 러너 한도는 그 실행 단위 케이스 줄 한도의 합이다 — run_exec.timeout_ms 와 같은 값 (도메인/러너 §5.2 「케이스별 한도」)
    timeoutMs: 단위.케이스들.reduce((n, c) => n + c.timeoutMs, 0),
    ...실행칸(첫),
  };
  // 장면 · 폰 화면 칸의 열쇠는 실행 단위 번호다 — 러너가 그 번호로 진행을 알린다
  const 열쇠 = 항목화면을연다(단위.execId, true, { runId, timeoutMs: 요청.timeoutMs, 줄들: 단위.케이스들.map((c) => c.historyId) });
  let 답: ExecuteResponse;
  try {
    답 = await 폰에보낸다(
      runId,
      { 번호: 단위.execId, item: 첫, body: { ...요청, ...(열쇠 !== undefined && { live: 열쇠 }) }, 못감: (까닭, stack) => 못간답(요청, 까닭, stack) },
      멈췄나,
      잡은폰,
    );
  } finally {
    항목화면을닫는다(단위.execId);
  }
  await 프로시저를저장한다(단위, 답);
}

// 팜은 끝나기 10분 전부터만 늘리기를 받는다 — 그보다 자주 불러야 그 틈에 한 번은 든다
const 늘리는_ms = 5 * 60_000;

/**
 * 게임 실행은 폰 · PC 를 실행 하나에 한 번 잡고 실행 단위를 보내기 전에 늘린다. 프로시저 하나는 20분까지 돌 수 있어(케이스 10개 × 2분)
 * 보내기 전 한 번으로는 모자란다 — 도는 동안에도 늘리기를 부른다. 옛 꼴 케이스는 2분이라 전과 같다 (도메인/러너 §5.2 「케이스별 한도」)
 */
export async function 도는동안늘린다(단위: 실행단위, 늘린다: () => Promise<void>, 일: () => Promise<void>): Promise<void> {
  const 주기 = 단위.procId === undefined ? undefined : setInterval(() => void 늘린다(), 늘리는_ms);
  try {
    await 일();
  } finally {
    clearInterval(주기);
  }
}
