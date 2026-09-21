import { describe, expect, it } from 'vitest';

import type { ItemStatus, RunItemSummary, RunSummary } from './api.js';
import { type RunDetail, 진행상황 } from './runProgress.js';

const 분 = (n: number) => `2026-09-21T00:0${n}:00.000Z`;

function 항목(historyId: number, finishedAt: string | null, status: ItemStatus = 'PASS'): RunItemSummary {
  return {
    historyId,
    tcId: `ZZR-${String(historyId).padStart(4, '0')}`,
    tcName: `케이스 ${historyId}`,
    platform: 'desktop',
    attempt: 1,
    params: {},
    paramSchema: {},
    status,
    durationMs: finishedAt === null ? null : 100,
    error: null,
    startedAt: 분(0),
    finishedAt,
  };
}

function 실행(items: RunItemSummary[], counts: RunSummary['counts']): RunDetail {
  return {
    runId: 1,
    title: 'ZZR 진행 확인',
    triggeredBy: 'zzr',
    triggeredByName: '테스터',
    env: 'dev',
    baseUrl: 'https://example.test',
    serviceName: 'ZZR',
    status: counts.running > 0 ? 'RUNNING' : 'FINISHED',
    startedAt: 분(0),
    finishedAt: null,
    counts,
    items,
  };
}

const 끝난여섯 = [
  항목(1, 분(5)),
  항목(2, 분(1)),
  항목(3, 분(6)),
  항목(4, 분(3)),
  항목(5, 분(2)),
  항목(6, 분(4), 'FAIL'),
];
const 안끝난넷 = [항목(7, null), 항목(8, null), 항목(9, null), 항목(10, null)];

const 도는중 = 실행([...끝난여섯, ...안끝난넷], { total: 10, pass: 5, fail: 1, na: 0, running: 4 });

describe('진행상황', () => {
  it('항목 10건 중 6건이 끝났을 때 막대 네 칸의 합이 counts.total 과 같다', () => {
    const { 막대 } = 진행상황(도는중);
    expect(막대.통과 + 막대.실패 + 막대.실행중 + 막대.대기).toBe(도는중.counts.total);
  });

  it('finishedAt 이 null 인 첫 항목이 지금 도는 것이다', () => {
    expect(진행상황(도는중).지금도는것?.historyId).toBe(7);
  });

  it('방금 끝난 것은 finishedAt 내림차순 넷이다', () => {
    expect(진행상황(도는중).방금끝난것.map((i) => i.historyId)).toEqual([3, 1, 6, 4]);
  });

  it('대기줄은 지금 도는 것을 뺀, 아직 시작 안 한 앞 셋이다', () => {
    expect(진행상황(도는중).대기줄.map((i) => i.historyId)).toEqual([8, 9, 10]);
  });

  it('전부 끝났으면 지금 도는 것이 null 이다', () => {
    const 끝남 = 실행([...끝난여섯, ...안끝난넷.map((i) => ({ ...i, finishedAt: 분(7) }))], {
      total: 10,
      pass: 9,
      fail: 1,
      na: 0,
      running: 0,
    });
    const 진행 = 진행상황(끝남);
    expect(진행.지금도는것).toBeNull();
    expect(진행.끝난수).toBe(진행.전체수);
  });
});
