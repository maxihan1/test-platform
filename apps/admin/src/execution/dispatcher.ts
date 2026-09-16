// 실행 항목을 러너에 분배하고 결과를 되쓴다 (SPEC §3.2)
// 대기줄은 모듈 전역이다. 실행 묶음마다 2개씩 돌면 두 사람이 동시에 누를 때 4개가 돈다 —
// 대상 서버가 2코어라 그 이상은 느려지기만 한다 (SPEC §9)

import { callRunner } from './runner.js';
import { finishItem, finishRun, type PendingItem } from './store.js';

const 대기줄: (() => Promise<void>)[] = [];
let 도는중 = 0;

function limit(): number {
  const 설정 = Number(process.env.EXECUTION_CONCURRENCY);
  return Number.isInteger(설정) && 설정 > 0 ? 설정 : 2;
}

async function drain(): Promise<void> {
  for (;;) {
    const 일 = 대기줄.shift();
    if (일 === undefined) {
      도는중 -= 1;
      return;
    }
    await 일();
  }
}

export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((done, fail) => {
    대기줄.push(async () => {
      try {
        done(await task());
      } catch (err) {
        // 한 작업이 깨져도 대기줄은 계속 돈다. 넣은 쪽에만 알린다
        fail(err);
      }
    });
    while (도는중 < limit() && 대기줄.length > 0) {
      도는중 += 1;
      void drain();
    }
  });
}

async function runOne(runId: number, item: PendingItem): Promise<void> {
  const result = await callRunner(runId, item);
  try {
    await finishItem(item.historyId, result);
  } catch (err) {
    // 결과를 못 적었다고 나머지 항목까지 버리지 않는다. 그 행은 finished_at이 빈 채로 남아 미완임이 드러난다
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[execution] ${item.tcId}/${item.platform}(history ${item.historyId}) 결과를 저장하지 못했다: ${reason}`);
  }
}

// 요청을 받은 쪽은 기다리지 않는다. run_id만 돌려주고 실행은 여기서 계속된다 (SPEC §7)
export async function dispatch(runId: number, items: PendingItem[]): Promise<void> {
  await Promise.all(items.map((item) => enqueue(() => runOne(runId, item))));
  await finishRun(runId);
}
