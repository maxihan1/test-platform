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

  it('미확정 항목도 따로 칸이 없다 — 통과·실패·남은 것 안에 들어 있고 합이 counts.total 이다', () => {
    const 섞임 = 실행([...끝난여섯, ...안끝난넷], { total: 10, pass: 5, fail: 1, na: 0, running: 4, unconfirmed: 3 });
    const { 막대 } = 진행상황(섞임, []);
    expect(막대).toEqual({ 통과: 5, 실패: 1, 미실행: 0, 남은것: 4 });
    expect(네칸합(막대)).toBe(섞임.counts.total);
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

  it('끝난 것은 finishedAt 내림차순 전부다', () => {
    expect(진행상황(도는중, []).끝난것들.map((i) => i.historyId).slice(0, 4)).toEqual([3, 1, 6, 4]);
  });

  it('대기는 지금 도는 것을 뺀, 아직 시작 안 한 것 전부다', () => {
    expect(진행상황(도는중, []).대기것들.map((i) => i.historyId)).toEqual([8, 9, 10]);
  });

  it('러너가 둘을 답하면 그 둘은 대기에 없다', () => {
    const 결과 = 진행상황(도는중, [절차(7, 2, '로그인한다'), 절차(8, 1, '장바구니를 연다')]);
    expect(결과.대기것들.map((i) => i.historyId)).toEqual([9, 10]);
  });

  it('전부 끝났으면 지금 도는 것이 없다', () => {
    const 결과 = 진행상황(중단됨, []);
    expect(결과.지금도는것들).toEqual([]);
    expect(결과.끝난수).toBe(결과.전체수);
  });
});

describe('진행상황 — 프로시저', () => {
  const 단위 = (n: number, finishedAt: string | null) => ({ ...항목(n, finishedAt), execId: 3, execSeq: n - 10, procId: 'MTA-TP-022', procName: '결제 흐름' });
  const 프로시저실행 = 실행([단위(11, 분(1)), 단위(12, 분(2)), 단위(13, null), 단위(14, null), 단위(15, null)], { total: 5, pass: 2, fail: 0, na: 0, running: 3 });

  it('지금 도는 케이스에 프로시저 번호 · 이름과 같은 실행 단위의 건수 · 번째를 붙인다', () => {
    const 결과 = 진행상황(프로시저실행, [절차(13, 1, '로그인한다')]);

    expect(결과.지금도는것들[0]?.프로시저).toEqual({ procId: 'MTA-TP-022', procName: '결제 흐름', 전체: 5, 번째: 3 });
  });

  it('프로시저에 안 든 항목에는 프로시저 칸이 없다', () => {
    expect(진행상황(도는중, [절차(7, 2, '로그인한다')]).지금도는것들[0]?.프로시저).toBeUndefined();
  });

  it('진행 목록이 비어도 첫 안 끝난 항목에 프로시저 칸이 붙는다', () => {
    expect(진행상황(프로시저실행, []).지금도는것들[0]?.프로시저).toMatchObject({ 전체: 5, 번째: 3 });
  });

  // 판정은 프로시저가 끝나야 와서, 지나간 케이스도 그때까지 finishedAt 이 비어 있다
  const 다섯다안끝남 = 실행([...[11, 12, 13, 14, 15].map((n) => 단위(n, null)), { ...단위(16, null), execId: 4, execSeq: 1 }], { total: 6, pass: 0, fail: 0, na: 0, running: 6 });

  it('러너가 알린 케이스보다 앞선 같은 실행 단위의 케이스는 대기가 아니라 지나간 것이다 — 다른 실행 단위는 대기 그대로다', () => {
    const 결과 = 진행상황(다섯다안끝남, [절차(13, 1, '로그인한다')]);

    expect(결과.지나간것들.map((i) => i.historyId)).toEqual([12, 11]);
    expect(결과.대기것들.map((i) => i.historyId)).toEqual([14, 15, 16]);
    expect(결과.끝난수).toBe(0);
  });

  it('러너가 아직 안 알렸으면 지나간 것이 없다', () => {
    const 결과 = 진행상황(다섯다안끝남, []);

    expect(결과.지나간것들).toEqual([]);
    expect(결과.대기것들.map((i) => i.historyId)).toEqual([12, 13, 14, 15, 16]);
  });

  it('프로시저가 아닌 항목끼리는 지나간 것이 없다', () => {
    expect(진행상황(도는중, [절차(8, 2, '로그인한다')]).지나간것들).toEqual([]);
  });
});

