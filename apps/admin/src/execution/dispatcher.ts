// 실행 항목을 러너에 분배하고 결과를 되쓴다 (SPEC §3.2)
// 대기줄은 모듈 전역이다. 실행 묶음마다 2개씩 돌면 두 사람이 동시에 누를 때 4개가 돈다 —
// 대상 서버가 2코어라 그 이상은 느려지기만 한다 (SPEC §9)

import type { ExecuteResponse } from '@platform/kit';

import { 실행문서견주기 } from '../apidoc/runCompare.js';
import { 실패등록 } from '../bts/failReport.js';

import { 스모크뒤 } from './buildRun.js';
import { 잡기를늘린다, 팜주소, 팜폰으로 } from './farm.js';
import { 실행팜토큰 } from './farmToken.js';
import { notifyRun } from './notify.js';
import { 폰차례 } from './phone.js';
import { callRunner, na, type 잡은폰 } from './runner.js';
import { finishItem, finishRun, type PendingItem } from './store.js';
import { trace적재를맡긴다 } from './traceIngest.js';

const 대기줄: (() => Promise<void>)[] = [];
let 도는중 = 0;

export function limit(): number {
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

async function runOne(runId: number, item: PendingItem, 잡은폰?: 잡은폰): Promise<void> {
  if (멈춘실행.has(runId)) return;

  await 저장한다(item, await callRunner(runId, item, () => 멈춘실행.has(runId), 잡은폰));
}

async function 저장한다(item: PendingItem, result: ExecuteResponse): Promise<void> {
  try {
    await finishItem(item.historyId, result);
    // 기다리지 않는다 — 풀기는 실행을 늦추지 않게 따로 한 줄로 돈다 (SPEC 실행 §3.2 「trace」)
    void trace적재를맡긴다(item.historyId);
  } catch (err) {
    // 결과를 못 적었다고 나머지 항목까지 버리지 않는다
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[execution] ${item.tcId}/${item.platform}(history ${item.historyId}) 결과를 저장하지 못했다: ${reason}`);
    // 안 닫으면 finishRun 이 그 실행을 재기동 때까지 RUNNING 에 둔다. 판정은 잃었으니 미실행으로 닫는다
    try {
      await finishItem(item.historyId, na(item, '결과를 저장하지 못했습니다', reason));
    } catch (닫기실패) {
      console.error(`[execution] history ${item.historyId} 를 미실행으로 닫지도 못했다(재기동 복구가 닫는다)`, 닫기실패);
    }
  }
}

// 게임 항목은 실행 하나 동안 폰을 한 번 잡고 한 번 깐다 — 앱은 항목마다 놓으면 지워져 APK 가 큰 게임은 항목마다 다시 깐다 (도메인/게임 §3.10 결정 12).
// 120분은 팜이 받는 가장 긴 잡기고, 항목을 시작할 때마다 늘려 회귀 실행이 몇 시간이어도 끊기지 않게 한다
const 게임잡는_분 = 120;

async function 게임실행(runId: number, 항목들: PendingItem[]): Promise<void> {
  await 폰차례(async () => {
    const 팜 = 팜주소();
    // 팜 주소가 없으면 callRunner 가 항목마다 NA 로 닫는다
    if (팜 === undefined) {
      for (const item of 항목들) await runOne(runId, item);
      return;
    }
    // 실행 하나에 한 번 고른다 — 도중에 사람이 토큰을 바꿔도 잡은 폰은 잡을 때 토큰으로 늘리고 붙고 놓는다
    let 토큰: string | undefined;
    try {
      토큰 = await 실행팜토큰(runId);
    } catch (err) {
      const 까닭 = err instanceof Error ? err.message : String(err);
      for (const item of 항목들) if (!멈춘실행.has(runId)) await 저장한다(item, na(item, '누른 사람의 통합계정 토큰을 읽지 못했습니다', 까닭));
      return;
    }
    await 팜폰으로(
      팜,
      async (udid) => {
        for (const item of 항목들) {
          if (멈춘실행.has(runId)) return;
          await 잡기를늘린다(팜, udid, fetch, 토큰);
          await runOne(runId, item, { udid, 토큰 });
        }
      },
      async (까닭) => {
        for (const item of 항목들) if (!멈춘실행.has(runId)) await 저장한다(item, na(item, 까닭));
      },
      undefined,
      undefined,
      게임잡는_분,
      토큰,
    );
  });
}

// 요청을 받은 쪽은 기다리지 않는다. run_id만 돌려주고 실행은 여기서 계속된다 (SPEC §7)
export async function dispatch(runId: number, items: PendingItem[]): Promise<void> {
  // 항목을 기다리게 하지 않는다 — 항목은 케이스가 만들어진 판을 DB 에서 읽는다. 끝내기 전에만 기다린다 (도메인/API §3.8 「실행 시작 때 견주기」)
  const 견주기 = 실행문서견주기(runId).catch((err: unknown) => {
    console.error(`[execution] 실행 ${runId}의 API 문서를 견주지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  });
  // 같은 케이스 항목(반복 회차 · PC · 모바일)은 하나씩 돈다. 나란히 돌면 같은 데이터를 두고 부딪힌다 —
  // run 20903 에서 재고 1개 상품 · 서버 초기화 케이스가 짝 회차와 같은 시각에 깨졌다 (SPEC 실행 §3.2 · PRD-F9-36).
  // 케이스마다 앞 항목이 끝나야 다음을 대기줄에 넣으므로 회차는 케이스 순서로 한 바퀴씩 돌고, 다른 케이스는 상한까지 나란히 돈다
  const 게임인가 = (i: PendingItem): boolean => i.engine === 'GAME' && i.platform === 'android';
  const 케이스줄 = new Map<string, PendingItem[]>();
  for (const item of items.filter((i) => !게임인가(i))) {
    const 줄 = 케이스줄.get(item.tcId);
    if (줄 === undefined) 케이스줄.set(item.tcId, [item]);
    else 줄.push(item);
  }
  // android 는 전역 상한 밖의 디바이스 줄이다. 같은 디바이스에 연결 둘이 겹치면 뒤 연결이 앞을 가로채고,
  // 전역 상한은 컨테이너 러너의 CPU 를 지키는 값이라 그 러너에서 돌지 않는 앱 항목이 자리를 쓸 이유가 없다 (SPEC 실행 §3.2)
  const 게임들 = items.filter(게임인가);
  await Promise.all([
    ...[...케이스줄.values()].map(async (줄) => {
      for (const item of 줄) {
        await (item.platform === 'android' ? 폰차례(() => runOne(runId, item)) : enqueue(() => runOne(runId, item)));
      }
    }),
    ...(게임들.length > 0 ? [게임실행(runId, 게임들)] : []),
  ]);
  // 멈춘 실행은 ABORTED 로 이미 닫혔다. finishRun 은 RUNNING 만 건드리므로 그대로 둬도 되지만,
  // 표시를 남겨 두면 다음 실행의 같은 번호에서 오판할 수 있어 여기서 치운다
  멈춘실행.delete(runId);
  await 견주기;
  await finishRun(runId);

  // 빌드 스모크의 마지막 실행이 다 통과했으면 회귀를 건다. 실패해도 이 실행은 이미 끝났다 (도메인/실행 §3.11)
  try {
    await 스모크뒤(runId);
  } catch (err) {
    console.error(`[execution] 실행 ${runId} 뒤 회귀를 걸지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 알림 전송이 실패해도 실행은 실패가 아니다. 실행은 이미 끝났고 결과는 test_run 에 남아 있다 (SPEC §8.9)
  try {
    await notifyRun(runId);
  } catch (err) {
    console.error(`[execution] 실행 ${runId}의 Slack 알림을 보내지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }

  // BTS 를 이은 프로젝트면 실패를 보낼 줄에 넣는다. 보내기는 60초 점검이 한다 — 넣다 깨져도 실행은 이미 끝났다 (도메인/BTS 「버그 바퀴」)
  try {
    await 실패등록(runId);
  } catch (err) {
    console.error(`[execution] 실행 ${runId}의 실패를 BTS 보낼 줄에 넣지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}
