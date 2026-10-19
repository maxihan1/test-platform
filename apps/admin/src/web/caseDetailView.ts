// 케이스 상세 칸이 쓰는 판단 — 처음 보일 디바이스 · 이력 묶기 · 받아 둔 것 (도메인/카탈로그 §8.1 「상세 칸」). 그리는 일은 CaseDetail.tsx

import type { Platform } from '@platform/kit/types';

import type { CaseRow, HistoryRow, RunItemDetail } from './api.js';
import { keyOf, type LastMap } from './catalogView.js';

/**
 * 칸이 받아 온 것. 목록이 들고 있어 칸을 닫아도 남는다 — 이력은 (케이스, 마지막 항목)마다, 절차는 실행 항목마다.
 * 이력 열쇠에 마지막 항목 번호를 넣는다 — 새 실행이 끝나면 열쇠가 바뀌어 다시 받는다. null 은 받기에 실패한 것이다
 */
export interface 상세기억 {
  이력: Map<string, HistoryRow[] | null>;
  절차: Map<number, RunItemDetail | null>;
}

export const 빈기억 = (): 상세기억 => ({ 이력: new Map(), 절차: new Map() });

/** 이력 열쇠 — 케이스와 디바이스들 가운데 가장 늦은 마지막 항목 번호 */
export function 이력열쇠(row: CaseRow, 마지막: LastMap): string {
  const 늦은 = Math.max(0, ...row.platforms.map((p) => 마지막[keyOf(row.tcId, p)]?.historyId ?? 0));
  return `${row.tcId}:${String(늦은)}`;
}

/** 처음 보일 디바이스 — 깨진 것이 있으면 그것. 모바일만 깨졌는데 통과한 PC 절차를 보이던 자리다(점검 7.7) */
export function 처음디바이스(row: CaseRow, 마지막: LastMap): Platform | null {
  const 돈것 = row.platforms.filter((p) => 마지막[keyOf(row.tcId, p)] !== undefined);
  return 돈것.find((p) => 마지막[keyOf(row.tcId, p)]?.status === 'FAIL') ?? 돈것[0] ?? null;
}

/** 이력 한 줄 = 실행 하나. 반복 실행이 회차마다 같은 제목으로 열 줄 넘게 나오던 것을 묶는다(점검 N7) */
export interface 이력묶음 {
  runId: number;
  runTitle: string;
  첫항목: number;
  디바이스들: Platform[];
  회수: number;
  통과: number;
  실패: number;
  끝난때: string | null;
}

export function 실행마다묶기(이력: HistoryRow[]): 이력묶음[] {
  const 묶음 = new Map<number, 이력묶음>();
  for (const 줄 of 이력) {
    const 것 = 묶음.get(줄.runId) ?? {
      runId: 줄.runId,
      runTitle: 줄.runTitle,
      첫항목: 줄.historyId,
      디바이스들: [],
      회수: 0,
      통과: 0,
      실패: 0,
      끝난때: 줄.finishedAt,
    };
    if (!것.디바이스들.includes(줄.platform)) 것.디바이스들.push(줄.platform);
    것.회수 += 1;
    if (줄.status === 'PASS') 것.통과 += 1;
    if (줄.status === 'FAIL') 것.실패 += 1;
    묶음.set(줄.runId, 것);
  }
  return [...묶음.values()];
}
