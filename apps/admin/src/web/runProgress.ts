// 실행이 어디까지 갔는지를 RunDetail 하나에서 계산한다 (SPEC §8.3 · §8.9). 화면 조각은 없다

import type { RunItemSummary, RunSummary } from './api.js';

/** `api.run()` 이 주는 모양. 증적 목록은 진행과 무관해 뺐다 — 없는 값을 요구하면 호출부가 채워야 한다 */
export type RunDetail = RunSummary & { items: RunItemSummary[] };

export interface 진행 {
  막대: { 통과: number; 실패: number; 실행중: number; 대기: number };
  끝난수: number;
  전체수: number;
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
 * 막대는 서버가 준 `counts` 를 그대로 쓴다. 화면이 항목을 다시 세면 목록 화면과 다른 수가 나온다.
 * 대기는 `total - pass - fail - na - running` 이 아니다 — 그 넷이 이미 `total` 을 나눠 가져
 * 빼면 늘 음수다. 끝난 것(`finishedAt !== null`)만 빼서 센다.
 */
export function 진행상황(data: RunDetail): 진행 {
  const { counts } = data;
  const 끝난것 = data.items.filter((i): i is RunItemSummary & { finishedAt: string } => i.finishedAt !== null);
  // 러너는 한 번에 하나씩 돈다. 안 끝난 것의 첫째가 지금 도는 것이고 그 뒤가 줄이다
  const 안끝난것 = data.items.filter((i) => i.finishedAt === null);

  return {
    막대: {
      통과: counts.pass,
      실패: counts.fail,
      실행중: counts.running,
      // counts 와 items 는 서로 다른 질의라 도는 도중에 한쪽만 새것일 수 있다. 음수 폭은 막대를 깨뜨린다
      대기: Math.max(0, counts.total - 끝난것.length - counts.running),
    },
    끝난수: 끝난것.length,
    전체수: counts.total,
    지금도는것: 안끝난것[0] ?? null,
    방금끝난것: [...끝난것]
      .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
      .slice(0, 방금끝난것최대),
    대기줄: 안끝난것.slice(1, 1 + 대기줄최대),
  };
}
