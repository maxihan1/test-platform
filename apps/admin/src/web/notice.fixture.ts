// 알림 검사들이 같이 쓰는 가짜 재료 (noticeView.test.ts · Notice.test.tsx)

import type { NoticeRecent, NoticeRunning, RunCounts } from './api.js';

const 서비스 = { serviceId: 1, prefix: 'PAY', serviceName: '결제 서비스' };

export const 방금 = () => new Date().toISOString();
export const 전에 = (분: number) => new Date(Date.now() - 분 * 60_000).toISOString();

export function 도는실행(runId: number, 덮을것: Partial<Extract<NoticeRunning, { kind: 'run' }>> = {}): NoticeRunning {
  return {
    ...서비스,
    kind: 'run',
    runId,
    title: `RUN ${String(runId)}`,
    total: 40,
    done: 12,
    counts: { total: 40, pass: 10, fail: 2, na: 0, running: 28 },
    startedAt: 전에(5),
    remainingMs: null,
    ...덮을것,
  };
}

export function 도는작성(requestId: number, 덮을것: Partial<Extract<NoticeRunning, { kind: 'authoring' }>> = {}): NoticeRunning {
  return {
    ...서비스,
    kind: 'authoring',
    requestId,
    title: `요청 ${String(requestId)}`,
    status: 'RUNNING',
    stage: '케이스를 만드는 중',
    startedAt: 전에(12),
    expected: null,
    fiveSteps: true,
    ...덮을것,
  };
}

export function 끝난실행(runId: number, counts: Partial<RunCounts> = {}, 덮을것: Partial<Extract<NoticeRecent, { kind: 'run' }>> = {}): NoticeRecent {
  return {
    ...서비스,
    kind: 'run',
    runId,
    title: `RUN ${String(runId)}`,
    status: 'FINISHED',
    counts: { total: 10, pass: 10, fail: 0, na: 0, running: 0, ...counts },
    finishedAt: 방금(),
    ...덮을것,
  };
}

export function 끝난작성(requestId: number, 덮을것: Partial<Extract<NoticeRecent, { kind: 'authoring' }>> = {}): NoticeRecent {
  return {
    ...서비스,
    kind: 'authoring',
    requestId,
    title: `요청 ${String(requestId)}`,
    status: 'DONE',
    finishedAt: 방금(),
    caseFiles: 12,
    prUrl: null,
    error: null,
    prdNeedsCheck: 0,
    ...덮을것,
  };
}
