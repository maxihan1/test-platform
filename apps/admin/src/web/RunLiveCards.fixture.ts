// 정식 실행 진행 창 화면 카드 검사가 쓰는 실행 · 항목 · 절차 (RunLiveCards.test.tsx)

import type { Platform, RunItemSummary, 항목진행 } from './api.js';
import type { RunDetail } from './runProgress.js';

export function 항목(n: number, platform: Platform): RunItemSummary {
  return {
    historyId: n,
    tcId: `ZZL-${String(n).padStart(3, '0')}`,
    tcName: `케이스 ${n}`,
    platform,
    attempt: 1,
    params: {},
    paramSchema: {},
    status: 'PASS',
    durationMs: null,
    error: null,
    startedAt: '2026-11-05T00:00:00.000Z',
    finishedAt: null,
  };
}

export function 실행(items: RunItemSummary[], 덧: Partial<RunDetail> = {}): RunDetail {
  return {
    runId: 128,
    title: 'ZZL 화면 카드',
    triggeredBy: 'zzl',
    triggeredByName: '테스터',
    env: 'stage',
    baseUrl: 'https://zzl.example.test',
    serviceName: 'ZZL',
    status: 'RUNNING',
    startedAt: '2026-11-05T00:00:00.000Z',
    finishedAt: null,
    counts: { total: items.length, pass: 0, fail: 0, na: 0, running: items.length },
    items,
    ...덧,
  };
}

export function 절차(historyId: number, 덧: Partial<항목진행> = {}): 항목진행 {
  return { historyId, seq: 6, title: '수량을 3으로 바꾼다', elapsedMs: 12000, timeoutMs: 30000, ...덧 };
}

export const 카드들 = () => [...document.querySelectorAll('.lc')];
