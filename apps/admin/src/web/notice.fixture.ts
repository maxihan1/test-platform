// 알림 검사들이 같이 쓰는 가짜 재료 (noticeView.test.ts · Notice.test.tsx)

import type { NoticeApproval, NoticeRecent, NoticeRunning, RunCounts } from './api.js';

const 서비스 = { serviceId: 1, prefix: 'PAY', serviceName: '결제 애플리케이션' };

export const 방금 = () => new Date().toISOString();
export const 전에 = (분: number) => new Date(Date.now() - 분 * 60_000).toISOString();

export function 도는실행(runId: number, 덮을것: Partial<Extract<NoticeRunning, { kind: 'run' }>> = {}): NoticeRunning {
  return {
    ...서비스,
    kind: 'run',
    runId,
    title: '기능 전체 382건',
    env: 'qa',
    testKind: 'FN',
    total: 40,
    done: 12,
    counts: { total: 40, pass: 10, fail: 2, na: 0, running: 28 },
    startedAt: 전에(5),
    remainingMs: null,
    ...덮을것,
  };
}

export function 도는E2E(runId: number, 덮을것: Partial<Extract<NoticeRunning, { kind: 'scenario' }>> = {}): NoticeRunning {
  return { ...서비스, kind: 'scenario', runId, title: '장바구니 결제', parts: 5, startedAt: 전에(3), ...덮을것 };
}

export function 도는호환성(runId: number): NoticeRunning {
  return { ...서비스, kind: 'compat', runId, title: '주요 단말 12대', states: { done: 3, total: 12 }, checks: { done: 40, total: 61 }, startedAt: 전에(30) };
}

export function 끝난호환성(runId: number, 덮을것: Partial<Extract<NoticeRecent, { testKind: 'COMPAT' }>> = {}): NoticeRecent {
  return {
    ...서비스, kind: 'run', runId, title: '주요 단말 12대', env: 'qa', testKind: 'COMPAT', status: 'FINISHED',
    compat: { pending: 4, unchecked: 2 }, finishedAt: 방금(), ...덮을것,
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

export function 끝난실행(runId: number, counts: Partial<RunCounts> = {}, 덮을것: Partial<Extract<NoticeRecent, { counts: RunCounts }>> = {}): NoticeRecent {
  return {
    ...서비스,
    kind: 'run',
    runId,
    title: '기능 전체 382건',
    env: 'qa',
    testKind: 'FN',
    status: 'FINISHED',
    counts: { total: 10, pass: 10, fail: 0, na: 0, running: 0, ...counts },
    finishedAt: 방금(),
    ...덮을것,
  };
}

/** 승인 전 QA 리포트 줄 — 기본은 빌드 124 */
export function 승인전(reportId: number, 덮을것: Partial<NoticeApproval> = {}): NoticeApproval {
  return { ...서비스, kind: 'qa_report', reportId, buildNo: '124', runId: null, perfRunId: null, version: 1, updatedAt: 전에(10), ...덮을것 };
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
