// 「실패 N건 다시 실행」으로 다시 돌린 결과를 원래 실행의 실패 카드로 이어 주는 훅 (도메인/실행 §8.3 · 점검 2.17)
// 새 서버 통로 없이 실행 목록의 시작 방식 거르개(origin=rerun)와 실행 상세를 쓴다

import { useEffect, useState } from 'react';

import { api, type ItemStatus, type RunItemSummary } from './api.js';
import { 도는중 } from './runState.js';

export interface 다시돌린결과 {
  runId: number;
  status: ItemStatus;
}

/** 읽을 다시 실행의 수. 같은 실행을 여러 번 다시 돌린 일은 드물고 새것이 이긴다 */
const 읽을수 = 3;

/** 케이스 하나의 판정 — 하나라도 실패면 실패, 모두 통과여야 통과, 그 밖은 미실행이다 */
function 접는다(항목들: RunItemSummary[]): ItemStatus {
  if (항목들.some((it) => it.status === 'FAIL')) return 'FAIL';
  return 항목들.every((it) => it.status === 'PASS') ? 'PASS' : 'NA';
}

/**
 * 케이스마다 가장 새로 다시 돌린 결과. 아직 못 읽었거나 다시 돌린 적이 없으면 빈 표다.
 * ponytail: 다시 실행 목록의 첫 쪽만 본다 — 원래 실행 뒤로 실행이 아주 많이 쌓였으면 못 찾을 수 있다. 그때는 통로에 rerunOf 조건을 연다
 */
export function use다시돌린결과(runId: number, 서비스: string | null, 켜짐: boolean): ReadonlyMap<string, 다시돌린결과> {
  const [결과, set결과] = useState<ReadonlyMap<string, 다시돌린결과>>(new Map());

  useEffect(() => {
    set결과(new Map());
    if (!켜짐 || 서비스 === null) return;
    let 살아있다 = true;
    void (async () => {
      const 목록 = await api.runs(서비스, 1, { origin: 'rerun' });
      const 다시들 = 목록.items
        .filter((run) => run.rerunOf === runId && !도는중(run.status))
        .sort((a, b) => b.runId - a.runId)
        .slice(0, 읽을수);
      const 모음 = new Map<string, 다시돌린결과>();
      for (const 다시 of 다시들) {
        const 상세 = await api.run(다시.runId);
        const 케이스별 = new Map<string, RunItemSummary[]>();
        for (const it of 상세.items) {
          const 칸 = 케이스별.get(it.tcId) ?? [];
          칸.push(it);
          케이스별.set(it.tcId, 칸);
        }
        for (const [tcId, 항목들] of 케이스별) if (!모음.has(tcId)) 모음.set(tcId, { runId: 다시.runId, status: 접는다(항목들) });
      }
      if (살아있다) set결과(모음);
    })().catch((err: unknown) => {
      // 이어 주는 칩은 덤이다 — 못 읽어도 결과 화면은 선다. 원인은 콘솔에 남긴다
      console.error('[run] loading the rerun results failed; the chips are hidden', err);
    });
    return () => {
      살아있다 = false;
    };
  }, [runId, 서비스, 켜짐]);

  return 결과;
}
