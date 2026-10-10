// 케이스 1행에 디바이스별 결과를 묶는 규칙과 필터 (SPEC §8.3)

import { describe, expect, it } from 'vitest';

import type { RunItemSummary } from './api.js';
import { filterGroups, groupByCase, 갈라낸다, 회차요약 } from './group.js';

function item(
  tcId: string,
  platform: 'desktop' | 'mobile',
  status: 'PASS' | 'FAIL' | 'NA',
  attempt = 1,
  durationMs = 1000,
): RunItemSummary {
  return {
    historyId: Math.floor(Math.random() * 100000),
    tcId,
    tcName: `${tcId}의 케이스명`,
    platform,
    attempt,
    params: {},
    paramSchema: {},
    status,
    durationMs,
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
  it('디바이스가 둘인 케이스도 한 행이다', () => {
    const groups = groupByCase(ITEMS);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.tcId)).toEqual(['DEMO-002', 'DEMO-008', 'DEMO-010']);
  });

  it('디바이스별 결과를 각 칸에 담는다', () => {
    const eight = groupByCase(ITEMS).find((g) => g.tcId === 'DEMO-008');
    expect(eight?.byPlatform.desktop?.[0]?.status).toBe('PASS');
    expect(eight?.byPlatform.mobile?.[0]?.status).toBe('PASS');
  });

  it('그 디바이스의 결과가 없으면 칸이 비어 있다 — 화면은 —로 그린다', () => {
    const ten = groupByCase(ITEMS).find((g) => g.tcId === 'DEMO-010');
    expect(ten?.byPlatform.desktop).toBeUndefined();
    expect(ten?.byPlatform.mobile).toBeDefined();
  });

  it('반복 실행한 회차는 한 칸에 쌓인다. 행 구조는 바뀌지 않는다 (SPEC §8.3)', () => {
    const 세번 = [
      item('DEMO-003', 'desktop', 'PASS', 1),
      item('DEMO-003', 'desktop', 'PASS', 2),
      item('DEMO-003', 'desktop', 'PASS', 3),
    ];
    const groups = groupByCase(세번);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.byPlatform.desktop).toHaveLength(3);
  });

  it('회차는 순서대로 쌓인다', () => {
    const 뒤섞임 = [
      item('DEMO-003', 'desktop', 'PASS', 3),
      item('DEMO-003', 'desktop', 'FAIL', 1),
      item('DEMO-003', 'desktop', 'PASS', 2),
    ];
    const 칸 = groupByCase(뒤섞임)[0]?.byPlatform.desktop ?? [];
    expect(칸.map((i) => i.attempt)).toEqual([1, 2, 3]);
  });
});

describe('회차 요약 (SPEC §8.3)', () => {
  it('1회면 지금과 같은 판정 배지다', () => {
    const 요약 = 회차요약([item('DEMO-001', 'desktop', 'PASS')]);
    expect(요약).toMatchObject({ 회차수: 1, status: 'PASS', 글: null });
  });

  it('N회 전부 통과면 5/5 통과이고 통과 색이다', () => {
    const 다섯 = [1, 2, 3, 4, 5].map((n) => item('DEMO-001', 'desktop', 'PASS', n));
    expect(회차요약(다섯)).toMatchObject({ 회차수: 5, status: 'PASS', 글: '5/5 통과' });
  });

  it('하나라도 실패면 실패 색이다. 다섯 중 셋만 통과한 테스트는 믿을 수 없다', () => {
    const 섞임 = [
      item('DEMO-001', 'desktop', 'PASS', 1),
      item('DEMO-001', 'desktop', 'FAIL', 2),
      item('DEMO-001', 'desktop', 'PASS', 3),
      item('DEMO-001', 'desktop', 'PASS', 4),
      item('DEMO-001', 'desktop', 'PASS', 5),
    ];
    expect(회차요약(섞임)).toMatchObject({ 회차수: 5, status: 'FAIL', 글: '4/5 통과' });
  });

  it('미실행이 섞여도 통과로 세지 않는다', () => {
    const 섞임 = [
      item('DEMO-001', 'desktop', 'PASS', 1),
      item('DEMO-001', 'desktop', 'NA', 2),
    ];
    expect(회차요약(섞임)).toMatchObject({ status: 'NA', 글: '1/2 통과' });
  });

  it('소요시간은 회차 평균이다. 회차마다 다른데 하나만 적으면 어느 회차 것인지 알 수 없다', () => {
    const 둘 = [
      item('DEMO-001', 'desktop', 'PASS', 1, 1000),
      item('DEMO-001', 'desktop', 'PASS', 2, 3000),
    ];
    expect(회차요약(둘).평균소요ms).toBe(2000);
  });

  it('아직 안 끝난 회차는 평균에서 뺀다', () => {
    const 둘 = [
      item('DEMO-001', 'desktop', 'PASS', 1, 1000),
      { ...item('DEMO-001', 'desktop', 'NA', 2), durationMs: null, finishedAt: null },
    ];
    expect(회차요약(둘).평균소요ms).toBe(1000);
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

  it('디바이스로 거르면 그 디바이스 결과가 있는 케이스만 남는다', () => {
    expect(filterGroups(groups, 'ALL', 'mobile').map((g) => g.tcId)).toEqual(['DEMO-008', 'DEMO-010']);
  });

  it('두 필터는 같이 걸린다 — 모바일에서 실패한 것은 없다', () => {
    expect(filterGroups(groups, 'FAIL', 'mobile')).toEqual([]);
  });
});

describe('갈라낸다 — 카드 · 줄 목록 (도메인/실행 §8.3)', () => {
  const 미확정 = (it: RunItemSummary): RunItemSummary => ({ ...it, unconfirmed: '확인 필요 — MKT-REQ-003' });

  const 항목들 = [
    item('A-1', 'desktop', 'FAIL'),
    item('A-1', 'mobile', 'PASS'),
    item('B-1', 'desktop', 'PASS'),
    item('B-1', 'mobile', 'NA'),
    미확정(item('C-1', 'desktop', 'FAIL')),
    item('D-1', 'desktop', 'PASS'),
    미확정(item('D-1', 'mobile', 'FAIL')),
    미확정(item('E-1', 'desktop', 'NA')),
  ];

  it('실패가 하나라도 있는 케이스는 줄 목록에 없다 — 미확정 실패도 카드로 간다', () => {
    const { 줄들 } = 갈라낸다(항목들, 'ALL', 'ALL');
    expect(줄들.map((g) => g.tcId)).toEqual(['B-1', 'E-1']);
  });

  it('미확정 항목도 제 차례의 줄에 든다 — 따로 묶은 칸이 없고 항목의 사유는 그대로 붙어 있다', () => {
    const 섞인 = [item('B-1', 'desktop', 'PASS'), 미확정(item('C-2', 'desktop', 'PASS')), item('D-2', 'desktop', 'PASS')];
    const { 줄들 } = 갈라낸다(섞인, 'ALL', 'ALL');
    expect(줄들.map((g) => g.tcId)).toEqual(['B-1', 'C-2', 'D-2']);
    expect(줄들[1]!.byPlatform.desktop?.[0]?.unconfirmed).toBe('확인 필요 — MKT-REQ-003');
    expect(갈라낸다(섞인, 'ALL', 'ALL')).not.toHaveProperty('미확정');
  });

  it('판정별 보기 「통과」는 통과 항목이 있는 줄만, 「미실행」은 미확정 미실행도 센다', () => {
    expect(갈라낸다(항목들, 'PASS', 'ALL').줄들.map((g) => g.tcId)).toEqual(['B-1']);
    expect(갈라낸다(항목들, 'NA', 'ALL').줄들.map((g) => g.tcId)).toEqual(['B-1', 'E-1']);
  });

  it('판정별 보기 「실패」는 줄 목록을 비운다 — 카드만 남는다', () => {
    expect(갈라낸다(항목들, 'FAIL', 'ALL')).toEqual({ 줄들: [], 카드안항목수: 0 });
  });

  it('디바이스를 고르면 그 디바이스 항목만 놓고 가른다 — 모바일만 보면 A-1 은 통과 줄이다', () => {
    const { 줄들 } = 갈라낸다(항목들, 'ALL', 'mobile');
    expect(줄들.map((g) => g.tcId)).toEqual(['A-1', 'B-1']);
  });

  it('판정별 보기 「통과」 · 「미실행」은 그 판정 항목이 하나라도 있는 줄이다 — 회차마다 판정이 갈려도 둘 다에 나온다', () => {
    const 갈린 = [item('F-1', 'desktop', 'PASS', 1), item('F-1', 'desktop', 'NA', 2), item('G-1', 'desktop', 'PASS')];
    expect(갈라낸다(갈린, 'PASS', 'ALL').줄들.map((g) => g.tcId)).toEqual(['F-1', 'G-1']);
    expect(갈라낸다(갈린, 'NA', 'ALL').줄들.map((g) => g.tcId)).toEqual(['F-1']);
  });

  it('카드 안에만 있는 그 판정의 항목 수를 센다 — 「전체」 · 「실패」는 0 이고 디바이스를 고르면 그 디바이스만 센다', () => {
    expect(갈라낸다(항목들, 'PASS', 'ALL').카드안항목수).toBe(2);
    expect(갈라낸다(항목들, 'NA', 'ALL').카드안항목수).toBe(0);
    expect(갈라낸다(항목들, 'ALL', 'ALL').카드안항목수).toBe(0);
    expect(갈라낸다(항목들, 'FAIL', 'ALL').카드안항목수).toBe(0);
    expect(갈라낸다(항목들, 'PASS', 'desktop').카드안항목수).toBe(0);
  });
});
