// 케이스 1행에 환경별 결과를 묶는 규칙과 필터 (SPEC §8.3)

import { describe, expect, it } from 'vitest';

import type { RunItemSummary } from './api.js';
import { filterGroups, groupByCase } from './group.js';

function item(tcId: string, platform: 'desktop' | 'mobile', status: 'PASS' | 'FAIL' | 'NA'): RunItemSummary {
  return {
    historyId: Math.floor(Math.random() * 100000),
    tcId,
    tcName: `${tcId}의 케이스명`,
    platform,
    attempt: 1,
    status,
    durationMs: 1000,
    error: null,
    startedAt: '2026-09-16T03:25:39.701Z',
    finishedAt: '2026-09-16T03:25:48.204Z',
  };
}

const ITEMS = [
  item('DEMO-002', 'desktop', 'FAIL'),
  item('DEMO-008', 'desktop', 'PASS'),
  item('DEMO-008', 'mobile', 'PASS'),
  item('DEMO-010', 'mobile', 'PASS'),
];

describe('groupByCase', () => {
  it('환경이 둘인 케이스도 한 행이다', () => {
    const groups = groupByCase(ITEMS);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.tcId)).toEqual(['DEMO-002', 'DEMO-008', 'DEMO-010']);
  });

  it('환경별 결과를 각 칸에 담는다', () => {
    const eight = groupByCase(ITEMS).find((g) => g.tcId === 'DEMO-008');
    expect(eight?.byPlatform.desktop?.status).toBe('PASS');
    expect(eight?.byPlatform.mobile?.status).toBe('PASS');
  });

  it('그 환경의 결과가 없으면 칸이 비어 있다 — 화면은 —로 그린다', () => {
    const ten = groupByCase(ITEMS).find((g) => g.tcId === 'DEMO-010');
    expect(ten?.byPlatform.desktop).toBeUndefined();
    expect(ten?.byPlatform.mobile).toBeDefined();
  });
});

describe('filterGroups', () => {
  const groups = groupByCase(ITEMS);

  it('전체는 그대로 둔다', () => {
    expect(filterGroups(groups, 'ALL', 'ALL')).toHaveLength(3);
  });

  it('상태로 거르면 그 판정을 가진 케이스만 남는다', () => {
    expect(filterGroups(groups, 'FAIL', 'ALL').map((g) => g.tcId)).toEqual(['DEMO-002']);
  });

  it('환경으로 거르면 그 환경 결과가 있는 케이스만 남는다', () => {
    expect(filterGroups(groups, 'ALL', 'mobile').map((g) => g.tcId)).toEqual(['DEMO-008', 'DEMO-010']);
  });

  it('두 필터는 같이 걸린다 — 모바일에서 실패한 것은 없다', () => {
    expect(filterGroups(groups, 'FAIL', 'mobile')).toEqual([]);
  });
});
