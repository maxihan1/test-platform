// 실행 결과 표의 짜임 검사 — 프로시저로 묶기 · 실행 차례 · 실패 먼저 · 거르기 · 쪽 나누기 (도메인/실행 §8.3)

import { describe, expect, it } from 'vitest';

import type { ItemStatus, Platform, RunInsights, RunItemSummary } from './api.js';
import { groupByCase } from './group.js';
import {
  거른흐름,
  막힌항목,
  줄판정of,
  쪽으로나눈다,
  케이스쪽,
  쪽크기,
  흐름으로묶는다,
} from './runFlow.js';

let 번호 = 0;
function 항목(tcId: string, status: ItemStatus, 덮을것: Partial<RunItemSummary> = {}): RunItemSummary {
  번호 += 1;
  return {
    historyId: 번호, tcId, tcName: `이름-${tcId}`, platform: 'android', attempt: 1, params: {}, paramSchema: {}, status,
    durationMs: 100, error: null, startedAt: '2026-11-24T00:00:00Z', finishedAt: '2026-11-24T00:00:01Z', ...덮을것,
  };
}
const 절차 = (procId: string, execSeq: number, execId = 1) => ({ procId, procName: `프로시저 ${procId}`, execId, execSeq });

const 앱: readonly Platform[] = ['android'];
const 전부 = { 판정: 'ALL' as const, columns: 앱 };

describe('막힌항목', () => {
  it('막은 케이스 번호가 있거나 사유 글자가 BLOCKED 인 미실행이다', () => {
    expect(막힌항목({ status: 'NA', error: null, blockedBy: 'A-001' })).toBe(true);
    expect(막힌항목({ status: 'NA', error: { message: 'BLOCKED' }, blockedBy: null })).toBe(true);
  });

  it('미실행이 아니거나 다른 사유의 미실행은 막힌 것이 아니다', () => {
    expect(막힌항목({ status: 'FAIL', error: null, blockedBy: 'A-001' })).toBe(false);
    expect(막힌항목({ status: 'NA', error: { message: '사용자가 중단' }, blockedBy: null })).toBe(false);
    expect(막힌항목({ status: 'NA', error: null })).toBe(false);
  });
});

describe('흐름으로묶는다', () => {
  it('프로시저 번호가 같으면 한 덩어리이고 프로시저 안 케이스는 실행 차례대로 선다', () => {
    const 덩어리 = 흐름으로묶는다([
      항목('B', 'PASS', 절차('P1', 2)),
      항목('A', 'PASS', 절차('P1', 1)),
      항목('C', 'PASS', 절차('P1', 3)),
    ]);

    expect(덩어리).toHaveLength(1);
    expect(덩어리[0]).toMatchObject({ procId: 'P1', procName: '프로시저 P1' });
    expect(덩어리[0]!.줄들.map((g) => g.tcId)).toEqual(['A', 'B', 'C']);
  });

  it('반복 실행이어도 같은 프로시저면 헤더 하나다 — 실행 단위 번호로 묶지 않는다', () => {
    const 덩어리 = 흐름으로묶는다([
      항목('A', 'PASS', { ...절차('P1', 1, 10), attempt: 1 }),
      항목('B', 'PASS', { ...절차('P1', 2, 10), attempt: 1 }),
      항목('A', 'FAIL', { ...절차('P1', 1, 11), attempt: 2 }),
      항목('B', 'NA', { ...절차('P1', 2, 11), attempt: 2 }),
    ]);

    expect(덩어리).toHaveLength(1);
    expect(덩어리[0]!.줄들.map((g) => g.tcId)).toEqual(['A', 'B']);
    expect(덩어리[0]!.줄들[0]!.byPlatform.android).toHaveLength(2);
  });

  it('프로시저에 안 든 케이스는 케이스마다 헤더 없는 덩어리 하나이고 처음 나온 차례를 지킨다', () => {
    const 덩어리 = 흐름으로묶는다([항목('X', 'PASS'), 항목('A', 'PASS', 절차('P1', 1)), 항목('Y', 'FAIL')]);

    expect(덩어리.map((b) => b.procId)).toEqual([null, 'P1', null]);
    expect(덩어리.map((b) => b.줄들.map((g) => g.tcId))).toEqual([['X'], ['A'], ['Y']]);
    expect(덩어리[0]!.procName).toBeNull();
  });

  it('두 프로시저는 갈라 선다', () => {
    const 덩어리 = 흐름으로묶는다([항목('A', 'PASS', 절차('P1', 1)), 항목('B', 'PASS', 절차('P2', 1, 2))]);

    expect(덩어리.map((b) => b.procId)).toEqual(['P1', 'P2']);
  });
});

describe('줄판정of', () => {
  const 줄 = (...것: RunItemSummary[]) => groupByCase(것)[0]!;

  it('회차 가운데 하나라도 Fail 이면 Fail 이다', () => {
    const g = 줄(항목('A', 'PASS', { attempt: 1 }), 항목('A', 'FAIL', { attempt: 2 }));

    expect(줄판정of(g, 앱)).toEqual({ status: 'FAIL', blocked: false, 도는중: false });
  });

  it('미실행이고 막은 케이스가 있으면 blocked 다', () => {
    expect(줄판정of(줄(항목('A', 'NA', { blockedBy: 'X' })), 앱)).toMatchObject({ status: 'NA', blocked: true });
    expect(줄판정of(줄(항목('A', 'NA')), 앱)).toMatchObject({ status: 'NA', blocked: false });
  });

  it('안 끝난 항목이 있으면 도는중이다', () => {
    expect(줄판정of(줄(항목('A', 'PASS', { finishedAt: null })), 앱).도는중).toBe(true);
  });

  it('고른 디바이스 칸에 항목이 없으면 미실행이다', () => {
    expect(줄판정of(줄(항목('A', 'PASS')), ['desktop'])).toEqual({ status: 'NA', blocked: false, 도는중: false });
  });
});

describe('거른흐름', () => {
  it('실패가 있는 덩어리가 위로 오고 나머지 차례는 그대로다', () => {
    const 묶음 = 흐름으로묶는다([
      항목('A', 'PASS'),
      항목('B', 'PASS', 절차('P1', 1)),
      항목('C', 'FAIL', 절차('P1', 2)),
      항목('D', 'NA'),
      항목('E', 'FAIL'),
    ]);

    expect(거른흐름(묶음, 전부).map((b) => b.열쇠)).toEqual(['proc:P1', 'tc:E', 'tc:A', 'tc:D']);
  });

  it('깨진 것이 없으면 처음 차례 그대로다', () => {
    const 묶음 = 흐름으로묶는다([항목('A', 'PASS'), 항목('B', 'NA')]);

    expect(거른흐름(묶음, 전부).map((b) => b.열쇠)).toEqual(['tc:A', 'tc:B']);
  });

  it('판정을 고르면 그 판정의 항목이 하나라도 있는 줄만 남고 헤더는 프로시저 전체를 말한다', () => {
    const 묶음 = 흐름으로묶는다([항목('A', 'PASS', 절차('P1', 1)), 항목('B', 'FAIL', 절차('P1', 2)), 항목('C', 'PASS')]);

    const 실패 = 거른흐름(묶음, { ...전부, 판정: 'FAIL' });
    expect(실패.map((b) => b.보이는.map((g) => g.tcId))).toEqual([['B']]);
    expect(실패[0]!.줄들.map((g) => g.tcId)).toEqual(['A', 'B']);
    expect(거른흐름(묶음, { ...전부, 판정: 'PASS' }).map((b) => b.보이는.map((g) => g.tcId))).toEqual([['A'], ['C']]);
  });

  it('회차 중 하나만 Fail 이어도 Fail 거르기에 든다 — 칩의 수가 항목 수라서다', () => {
    const 묶음 = 흐름으로묶는다([항목('A', 'PASS', { attempt: 1 }), 항목('A', 'FAIL', { attempt: 2 }), 항목('B', 'PASS')]);

    expect(거른흐름(묶음, { ...전부, 판정: 'PASS' }).map((b) => b.열쇠)).toEqual(['tc:A', 'tc:B']);
    expect(거른흐름(묶음, { ...전부, 판정: 'FAIL' }).map((b) => b.열쇠)).toEqual(['tc:A']);
  });

  it('고른 디바이스 칸에 항목이 없는 줄은 선 칸이 없어 뺀다', () => {
    const 묶음 = 흐름으로묶는다([항목('A', 'PASS', { platform: 'desktop' }), 항목('B', 'PASS', { platform: 'mobile' })]);

    expect(거른흐름(묶음, { 판정: 'ALL', columns: ['mobile'] }).map((b) => b.열쇠)).toEqual(['tc:B']);
  });

  it('변화를 주면 견줌 응답의 그 변화 케이스만 남는다', () => {
    const 묶음 = 흐름으로묶는다([항목('A', 'FAIL'), 항목('B', 'FAIL'), 항목('C', 'FAIL')]);
    const insights: RunInsights = {
      previous: { runId: 1, startedAt: '2026-11-23T00:00:00Z' }, 주소바뀜: false, 빠진건수: 0, 실패덩어리들: [],
      케이스들: [
        { tcId: 'A', tcName: 'A', platform: 'android', 판정: '새로깨짐' },
        { tcId: 'B', tcName: 'B', platform: 'android', 판정: '계속깨짐' },
        { tcId: 'C', tcName: 'C', platform: 'mobile', 판정: '새로깨짐' },
      ],
    };

    const 새로 = 거른흐름(묶음, { ...전부, 변화: { 칸: '새로깨짐', insights } });
    expect(새로.map((b) => b.열쇠)).toEqual(['tc:A']);
    expect(거른흐름(묶음, { ...전부, 변화: { 칸: '계속깨짐', insights } }).map((b) => b.열쇠)).toEqual(['tc:B']);
  });

  it('줄이 하나도 안 남은 덩어리는 뺀다', () => {
    const 묶음 = 흐름으로묶는다([항목('A', 'PASS', 절차('P1', 1)), 항목('B', 'FAIL')]);

    expect(거른흐름(묶음, { ...전부, 판정: 'FAIL' }).map((b) => b.열쇠)).toEqual(['tc:B']);
  });
});

describe('쪽으로나눈다 · 케이스쪽', () => {
  const 덩어리 = (이름: string, 줄수: number) => ({ 열쇠: 이름, 보이는: Array.from({ length: 줄수 }, () => 0) });

  it('쪽 크기는 50줄이다', () => {
    expect(쪽크기).toBe(50);
  });

  it('프로시저는 쪽 사이에서 갈리지 않아 한 쪽이 50줄보다 길 수 있다', () => {
    const 쪽들 = 쪽으로나눈다([덩어리('a', 40), 덩어리('P', 30), 덩어리('c', 2)]);

    expect(쪽들.map((쪽) => 쪽.map((b) => b.열쇠))).toEqual([['a', 'P'], ['c']]);
  });

  it('크기를 채우면 다음 덩어리부터 새 쪽이다', () => {
    const 쪽들 = 쪽으로나눈다([덩어리('a', 50), 덩어리('b', 1)]);

    expect(쪽들.map((쪽) => 쪽.length)).toEqual([1, 1]);
  });

  it('덩어리가 없으면 쪽도 없다', () => {
    expect(쪽으로나눈다([])).toEqual([]);
  });

  it('케이스쪽은 그 케이스가 선 쪽을 1부터 돌려주고 없으면 null 이다', () => {
    const 묶음 = 흐름으로묶는다([
      ...Array.from({ length: 50 }, (_, i) => 항목(`K${String(i)}`, 'PASS')),
      항목('뒤', 'PASS'),
    ]);
    const 쪽들 = 쪽으로나눈다(거른흐름(묶음, 전부));

    expect(케이스쪽(쪽들, 'K0')).toBe(1);
    expect(케이스쪽(쪽들, '뒤')).toBe(2);
    expect(케이스쪽(쪽들, '없는번호')).toBeNull();
  });
});
