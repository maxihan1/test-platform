// @vitest-environment jsdom
// 도는 중인 실행의 줄 차례 — 이미 깨진 줄이 위로 (도메인/실행 §8.3 · 점검 2.21)

import { describe, expect, it } from 'vitest';

import type { ItemStatus, RunItemSummary } from './api.js';
import { groupByCase } from './group.js';
import { 실패먼저 } from './RunResultBody.js';

function 항목(n: number, tcId: string, status: ItemStatus): RunItemSummary {
  return {
    historyId: n, tcId, tcName: tcId, platform: 'desktop', attempt: 1, params: {}, paramSchema: {}, status,
    durationMs: 1, error: null, startedAt: '2026-10-19T00:00:00Z', finishedAt: '2026-10-19T00:00:01Z',
  };
}

describe('실패먼저', () => {
  it('깨진 케이스를 위로 올리고 나머지 차례는 그대로 둔다', () => {
    const 묶음들 = groupByCase([항목(1, 'A', 'PASS'), 항목(2, 'B', 'FAIL'), 항목(3, 'C', 'NA'), 항목(4, 'D', 'FAIL')]);

    expect(실패먼저(묶음들).map((g) => g.tcId)).toEqual(['B', 'D', 'A', 'C']);
  });

  it('깨진 것이 없으면 그대로다', () => {
    const 묶음들 = groupByCase([항목(1, 'A', 'PASS'), 항목(2, 'B', 'NA')]);

    expect(실패먼저(묶음들).map((g) => g.tcId)).toEqual(['A', 'B']);
  });
});
