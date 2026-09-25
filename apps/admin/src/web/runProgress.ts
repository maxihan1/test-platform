// 실행이 어디까지 갔는지를 RunDetail 하나에서 계산한다 (SPEC §8.3 · §8.9). 화면 조각은 없다

import type { RunItemSummary, RunSummary, 항목진행 } from './api.js';
import { 끝난미확정 } from './unconfirmed.js';

/** `api.run()` 이 주는 모양. 증적 목록은 진행과 무관해 뺐다 — 없는 값을 요구하면 호출부가 채워야 한다 */
export type RunDetail = RunSummary & { items: RunItemSummary[] };

export interface 진행막대 {
  통과: number;
  실패: number;
  미실행: number;
  /** 끝난 미확정 항목. 통과·실패·미실행은 확정 항목만이라 이 칸이 있어야 합이 total 이다 (도메인/실행 §8.9) */
  미확정: number;
  남은것: number;
}

/** 러너가 답한 것만 절차로 그린다. `절차` 가 `null` 이면 이름까지만 아는 것이다 */
export interface 도는것 {
  항목: RunItemSummary;
  절차: 항목진행 | null;
}

export interface 진행 {
  막대: 진행막대;
  끝난수: number;
  전체수: number;
  지금도는것들: 도는것[];
  방금끝난것: RunItemSummary[];
  /**
   * **지금 어느 화면도 이것을 안 그린다.** SPEC §8.9 의 「도는 동안 그리는 것」 목록에도 없다 —
   * 계산만 되고 쓰는 곳이 없는 채로 `main` 에 이미 들어와 있었다 (2026-09-21 검사가 둘 다 짚었다).
   * 그리기로 하면 §8.9 를 먼저 고친다. 안 쓸 거면 이 칸과 검사를 같이 걷어낸다 —
   * **안 뜨는 값에 붙은 검사는 영원히 초록이면서 아무것도 안 지킨다.**
   */
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
export function 진행상황(data: RunDetail, 진행목록: 항목진행[]): 진행 {
  const { counts } = data;
  const 끝난것 = data.items.filter((i): i is RunItemSummary & { finishedAt: string } => i.finishedAt !== null);
  const 안끝난것 = data.items.filter((i) => i.finishedAt === null);

  // 러너는 자기가 마지막으로 본 것을 들고 있어 **이 실행의 것이 아닌 진행도 온다** —
  // 앞 실행에서 남은 것, 이미 끝나 DB 에 결과가 박힌 것. 안 끝난 항목에서 찾히는 것만 남긴다
  const 안끝난것찾기 = new Map(안끝난것.map((i) => [i.historyId, i]));
  const 러너가답한것 = 진행목록.flatMap((절차) => {
    const 항목 = 안끝난것찾기.get(절차.historyId);
    return 항목 === undefined ? [] : [{ 항목, 절차 }];
  });

  // **러너가 답한 것만 절차로 그린다.** 동시에 둘씩 돌아(`EXECUTION_CONCURRENCY` 기본 2)
  // 여럿이 나올 수 있고, 몇이 도는지는 여기서 세지 않고 러너가 답한 수를 그대로 쓴다.
  // 답이 비는 때가 있다 — 러너가 아직 첫 절차를 안 흘렸거나 진행 조회가 실패한 순간이다.
  // 그때 빈칸을 두지 않고 안 끝난 첫째를 이름만 내보낸다. 사람이 러너 로그를 여는 이유가
  // 「무엇이 도는지」를 모르기 때문이라, 절차를 모르는 것과 아무것도 모르는 것은 다르다
  const 지금도는것들: 도는것[] =
    러너가답한것.length > 0 ? 러너가답한것 : 안끝난것.slice(0, 1).map((항목) => ({ 항목, 절차: null }));
  const 도는중인historyId = new Set(지금도는것들.map((것) => 것.항목.historyId));

  return {
    막대: { 통과: counts.pass, 실패: counts.fail, 미실행: counts.na, 미확정: 끝난미확정(counts), 남은것: counts.running },
    // `끝난것.length` 가 아니라 `counts` 에서 낸다. 집계와 항목 목록은 **별개 질의**라
    // (`execution/queries.ts` 가 트랜잭션 없이 잇달아 친다) 도는 도중 한쪽만 새것일 수 있다 —
    // 그러면 「6 / 8 완료」인데 막대에 칠해진 것은 5칸인 순간이 2초 폴링 창 안에 생긴다.
    // 막대가 이미 이 수를 그리고 있으므로 출처를 거기로 합친다
    끝난수: counts.total - counts.running,
    전체수: counts.total,
    지금도는것들,
    방금끝난것: [...끝난것].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, 방금끝난것최대),
    // **앞자리 하나만 건너뛰지 않는다.** `slice(1, …)` 은 도는 것이 언제나 하나라는 가정인데
    // 러너는 둘 이상을 답한다 — 그러면 두 번째로 도는 항목이 「지금 도는 것」과 「대기줄」
    // 양쪽에 동시에 선다. 도는 것을 먼저 빼고 남은 것에서 앞 셋을 고른다
    대기줄: 안끝난것.filter((i) => !도는중인historyId.has(i.historyId)).slice(0, 대기줄최대),
  };
}
