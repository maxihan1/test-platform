// 실행 항목을 러너에 분배하고 결과를 되쓴다 (SPEC §3.2)
// 대기줄은 모듈 전역이다. 실행 묶음마다 2개씩 돌면 두 사람이 동시에 누를 때 4개가 돈다 —
// 대상 서버가 2코어라 그 이상은 느려지기만 한다 (SPEC §9)

import { notifyRun } from './notify.js';
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

// 멈춘 실행의 표시. 대기줄에 이미 들어간 일은 빼낼 수 없으므로 자기 차례가 왔을 때 스스로 물러난다.
// 항목은 abortRun 이 DB 에서 이미 닫았다 (SPEC §3.2)
const 멈춘실행 = new Set<number>();

export function markAborted(runId: number): void {
  멈춘실행.add(runId);
}

async function runOne(runId: number, item: PendingItem): Promise<void> {
  if (멈춘실행.has(runId)) return;

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
  // 멈춘 실행은 ABORTED 로 이미 닫혔다. finishRun 은 RUNNING 만 건드리므로 그대로 둬도 되지만,
  // 표시를 남겨 두면 다음 실행의 같은 번호에서 오판할 수 있어 여기서 치운다
  멈춘실행.delete(runId);
  await finishRun(runId);

  // 알림 전송이 실패해도 실행은 실패가 아니다. 실행은 이미 끝났고 결과는 test_run 에 남아 있다 (SPEC §8.9)
  try {
    await notifyRun(runId);
  } catch (err) {
    console.error(`[execution] 실행 ${runId}의 Slack 알림을 보내지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}
