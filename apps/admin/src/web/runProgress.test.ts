import { describe, expect, it } from 'vitest';

import type { ItemStatus, RunItemSummary, RunSummary, 항목진행 } from './api.js';
import { type RunDetail, type 진행, 진행상황 } from './runProgress.js';

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
    error: status === 'NA' ? { message: 'ABORTED' } : null,
    startedAt: 분(0),
    finishedAt,
  };
}

function 절차(historyId: number, seq: number, title: string): 항목진행 {
  return { historyId, seq, title, elapsedMs: 1200, timeoutMs: 300000 };
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

const 중단됨 = 실행(
  [...끝난여섯, ...안끝난넷.map((i) => ({ ...i, status: 'NA' as ItemStatus, finishedAt: 분(7) }))],
  { total: 10, pass: 5, fail: 1, na: 4, running: 0 },
);

const 네칸합 = (막대: 진행['막대']) => 막대.통과 + 막대.실패 + 막대.미실행 + 막대.남은것;

describe('진행상황', () => {
  it('항목 10건 중 6건이 끝났을 때 막대 네 칸의 합이 counts.total 과 같다', () => {
    expect(네칸합(진행상황(도는중, []).막대)).toBe(도는중.counts.total);
  });

  it('중단돼 미실행이 생긴 실행에서도 막대 네 칸의 합이 counts.total 과 같다', () => {
    expect(네칸합(진행상황(중단됨, []).막대)).toBe(중단됨.counts.total);
  });

  it('막대 네 칸은 counts 를 그대로 옮긴다', () => {
    expect(진행상황(중단됨, []).막대).toEqual({ 통과: 5, 실패: 1, 미실행: 4, 남은것: 0 });
  });

  it('러너가 둘을 돌고 있다고 답하면 둘 다 절차와 함께 나온다', () => {
    const 결과 = 진행상황(도는중, [절차(7, 2, '로그인한다'), 절차(8, 1, '장바구니를 연다')]);
    expect(결과.지금도는것들.map((d) => [d.항목.historyId, d.절차?.seq, d.절차?.title])).toEqual([
      [7, 2, '로그인한다'],
      [8, 1, '장바구니를 연다'],
    ]);
  });

  it('진행 목록이 비면 안 끝난 첫 항목만 절차 없이 나온다', () => {
    expect(진행상황(도는중, []).지금도는것들).toEqual([{ 항목: 안끝난넷[0], 절차: null }]);
  });

  it('항목 목록에 없는 historyId 의 진행은 버린다', () => {
    const 결과 = 진행상황(도는중, [절차(99, 1, '앞 실행에서 남은 절차'), 절차(9, 3, '결제한다')]);
    expect(결과.지금도는것들.map((d) => d.항목.historyId)).toEqual([9]);
  });

  it('이미 끝난 항목에 실린 진행은 버린다', () => {
    const 결과 = 진행상황(도는중, [절차(1, 4, '끝난 케이스의 마지막 절차'), 절차(10, 1, '검색한다')]);
    expect(결과.지금도는것들.map((d) => d.항목.historyId)).toEqual([10]);
  });

  it('방금 끝난 것은 finishedAt 내림차순 넷이다', () => {
    expect(진행상황(도는중, []).방금끝난것.map((i) => i.historyId)).toEqual([3, 1, 6, 4]);
  });

  it('대기줄은 지금 도는 것을 뺀, 아직 시작 안 한 앞 셋이다', () => {
    expect(진행상황(도는중, []).대기줄.map((i) => i.historyId)).toEqual([8, 9, 10]);
  });

  it('러너가 둘을 답하면 그 둘은 대기줄에 없다', () => {
    const 결과 = 진행상황(도는중, [절차(7, 2, '로그인한다'), 절차(8, 1, '장바구니를 연다')]);
    expect(결과.대기줄.map((i) => i.historyId)).toEqual([9, 10]);
  });

  it('전부 끝났으면 지금 도는 것이 없다', () => {
    const 결과 = 진행상황(중단됨, []);
    expect(결과.지금도는것들).toEqual([]);
    expect(결과.끝난수).toBe(결과.전체수);
  });
});
