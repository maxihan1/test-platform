// 실행 기록 목록 검사 둘(RunList · RunListTable)이 나눠 쓰는 가짜 응답

import type { Paged, RunListRow, RunTally } from './api.js';

export function 실행(runId: number, fail: number, 덮어쓸: Partial<RunListRow> = {}): RunListRow {
  return {
    runId,
    title: `ZRL 실행 ${runId}`,
    triggeredBy: 'zrl',
    triggeredByName: '김검사',
    env: 'qa',
    baseUrl: 'https://qa.example.com',
    serviceName: 'ZRL 애플리케이션',
    status: 'FINISHED',
    origin: 'MANUAL',
    rerunOf: null,
    startedAt: '2026-09-22T00:00:00.000Z',
    finishedAt: '2026-09-22T00:10:00.000Z',
    counts: { total: 3, pass: 3 - fail, fail, na: 0, running: 0 },
    change: null,
    ...덮어쓸,
  };
}

const 빈집계: RunTally = { runs: 0, allPass: 0, hasFail: 0, durationOf: 0, avgDurationMs: 0, maxDurationMs: 0 };
export type 답 = Paged<RunListRow> & { summary: RunTally };

// 한 쪽 크기를 2 로 두면 2건짜리 쪽은 「더 있다」다 (paging.ts)
export const 한쪽: 답 = { items: [실행(2113, 1), 실행(2112, 0)], total: 42, page: 1, pageSize: 2, summary: { ...빈집계, runs: 42 } };
export const 빈쪽: 답 = { items: [], total: 0, page: 1, pageSize: 2, summary: 빈집계 };

/** 표의 줄(고리) — 칸 이름 줄은 빠진다 */
export const 줄들 = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.rt-line')];
