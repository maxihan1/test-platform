// 앱 대시보드 실패 히트맵(케이스 × 최근 14일 칸)을 접은 줄에서 만드는 순수 함수 (dashboardShape.ts 가 300줄을 넘어 뗐다)

import type { 접은줄 } from './dashboardShape.js';

export const 히트맵케이스수 = 8;

export interface 히트맵줄 {
  tcId: string;
  tcName: string;
  실패수: number;
  /** 오래된 날부터 오늘까지 창 날 수만큼. 0 · 1 · 2 (2 이상은 2) */
  칸: (0 | 1 | 2)[];
}

// 케이스 이름은 가장 최근에 시작한 실행의 것이다 — 최신을 가르는 기준이 insights 와 같다
export function 히트맵을만든다(줄들: 접은줄[], 날들: string[], 이번창: (day: string) => boolean): 히트맵줄[] {
  const 케이스 = new Map<string, { tcName: string; 최근: string; 날별: number[]; 실패수: number }>();
  for (const 줄 of 줄들) {
    if (줄.verdict !== 'FAIL' || 줄.unconfirmed || !이번창(줄.day)) continue;
    const 항목 = 케이스.get(줄.tcId) ?? {
      tcName: 줄.tcName,
      최근: 줄.startedAt,
      날별: new Array<number>(날들.length).fill(0),
      실패수: 0,
    };
    케이스.set(줄.tcId, 항목);
    if (줄.startedAt >= 항목.최근) {
      항목.최근 = 줄.startedAt;
      항목.tcName = 줄.tcName;
    }
    const 자리 = 날들.indexOf(줄.day);
    항목.날별[자리] = (항목.날별[자리] ?? 0) + 1;
    항목.실패수 += 1;
  }
  return [...케이스.entries()]
    .sort(([a, x], [b, y]) => y.실패수 - x.실패수 || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, 히트맵케이스수)
    .map(([tcId, 항목]) => ({
      tcId,
      tcName: 항목.tcName,
      실패수: 항목.실패수,
      칸: 항목.날별.map((n) => (n >= 2 ? 2 : n === 1 ? 1 : 0)),
    }));
}
