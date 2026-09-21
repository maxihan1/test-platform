// 실행이 어디까지 갔는지를 RunDetail 하나에서 계산한다 (SPEC §8.3 · §8.9). 화면 조각은 없다

import type { RunItemSummary, RunSummary } from './api.js';

/** `api.run()` 이 주는 모양. 증적 목록은 진행과 무관해 뺐다 — 없는 값을 요구하면 호출부가 채워야 한다 */
export type RunDetail = RunSummary & { items: RunItemSummary[] };

export interface 진행 {
  막대: { 통과: number; 실패: number; 미실행: number; 남은것: number };
  끝난수: number;
  전체수: number;
  /** **근사치다.** 무엇을 근거로 고르고 언제 정확해지는지는 `진행상황()` 주석에 적었다 */
  지금도는것: RunItemSummary | null;
  방금끝난것: RunItemSummary[];
  대기줄: RunItemSummary[];
}

const 방금끝난것최대 = 4;
const 대기줄최대 = 3;

/**
 * 모달이 그릴 것을 한 번에 낸다.
 *
 * **세는 단위는 전부 `run_item` 건수다.** `counts.total` 은 케이스 수가 아니다 (SPEC §7) —
 * 한 케이스가 디바이스 수만큼 행이 된다. 상한·쪽수 같은 다른 단위의 수를 여기에 섞지 않는다.
 *
 * **막대는 `counts` 넷을 그대로 옮긴다.** 서버가 `pass`·`fail`·`na`·`running` 으로 이미 전부를
 * 나눠 놓아 (`execution/queries.ts` 의 `RUN_COLUMNS`) 넷의 합이 `total` 과 정확히 같다.
 * 여기서 빼서 다시 세면 그 순간 서버와 다른 수가 된다 — 중단된 실행에서 `na` 만큼 모자라던 자리다.
 *
 * **「실행중」과 「대기」로 가르지 않는다.** `running` 은 「도는 것」이 아니라 「안 끝난 것 전부」이고
 * (`finished_at IS NULL`), 행은 `createRun` 때 한꺼번에 박히며 `started_at` 을 나중에 고치는 코드가
 * 없다. 둘을 가를 신호가 DB 에 아예 없어서 가른 이름으로 부르면 없는 구분을 있는 척하게 된다.
 */
export function 진행상황(data: RunDetail): 진행 {
  const { counts } = data;
  const 끝난것 = data.items.filter((i): i is RunItemSummary & { finishedAt: string } => i.finishedAt !== null);
  const 안끝난것 = data.items.filter((i) => i.finishedAt === null);

  return {
    막대: { 통과: counts.pass, 실패: counts.fail, 미실행: counts.na, 남은것: counts.running },
    끝난수: 끝난것.length,
    전체수: counts.total,
    // 안 끝난 것의 첫째를 고른다. **맞다는 보장은 없고, 있는 신호 중 가장 가까운 것이다.**
    // 대기줄이 FIFO 라(`dispatcher.ts` 의 `대기줄.shift()`) 앞엣것일수록 먼저 나가지만,
    // ① 동시에 둘씩 돌고(`EXECUTION_CONCURRENCY` 기본 2) ② 상세 조회는 `tc_id, platform` 순이라
    // 요청 순서와 늘 같지 않다. 정확해지는 것은 러너가 절차마다 알려 주는 계약(`progressUrl`)이 오는 날이다.
    // 그래도 빼지 않는다 — 사람이 러너 로그를 여는 이유가 「무엇이 도는지」를 모르기 때문이다
    지금도는것: 안끝난것[0] ?? null,
    방금끝난것: [...끝난것].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, 방금끝난것최대),
    대기줄: 안끝난것.slice(1, 1 + 대기줄최대),
  };
}
