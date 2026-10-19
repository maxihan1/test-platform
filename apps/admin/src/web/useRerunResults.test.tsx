// @vitest-environment jsdom
// 다시 돌린 결과를 원래 실행의 케이스에 잇는 훅 (도메인/실행 §8.3 · 점검 2.17)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

import { api, type ItemStatus, type RunItemSummary, type RunListRow } from './api.js';
import { use다시돌린결과 } from './useRerunResults.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 줄(runId: number, rerunOf: number | null, status = 'FINISHED'): RunListRow {
  return {
    runId, title: `RUN ${String(runId)}`, triggeredBy: 'u', triggeredByName: null, env: 'qa', baseUrl: '', serviceName: 'ZRS', status,
    origin: 'RERUN', rerunOf, startedAt: '2026-10-19T00:00:00Z', finishedAt: '2026-10-19T00:01:00Z',
    counts: { total: 1, pass: 1, fail: 0, na: 0, running: 0 },
  };
}

function 항목(tcId: string, status: ItemStatus, historyId: number): RunItemSummary {
  return {
    historyId, tcId, tcName: tcId, platform: 'desktop', attempt: 1, params: {}, paramSchema: {}, status,
    durationMs: 1, error: null, startedAt: '2026-10-19T00:00:00Z', finishedAt: '2026-10-19T00:00:01Z',
  };
}

function 실행(runId: number, items: RunItemSummary[]): Awaited<ReturnType<typeof api.run>> {
  return {
    runId, title: '다시', triggeredBy: 'u', triggeredByName: null, env: 'qa', baseUrl: '', serviceName: 'ZRS', status: 'FINISHED',
    startedAt: '2026-10-19T00:00:00Z', finishedAt: '2026-10-19T00:01:00Z', counts: { total: items.length, pass: 0, fail: 0, na: 0, running: 0 },
    items, evidence: [],
  };
}

describe('use다시돌린결과', () => {
  it('이 실행을 다시 돌린 실행만 읽고 케이스마다 가장 새 결과를 잇는다', async () => {
    vi.spyOn(api, 'runs').mockResolvedValue({
      items: [줄(133, 100), 줄(132, 100), 줄(131, 77), 줄(130, 100, 'RUNNING')], total: 4, page: 1, pageSize: 20,
    });
    vi.spyOn(api, 'run').mockImplementation((id) =>
      Promise.resolve(id === 133 ? 실행(133, [항목('ZRS-001', 'PASS', 1)]) : 실행(132, [항목('ZRS-001', 'FAIL', 2), 항목('ZRS-002', 'FAIL', 3)])),
    );

    const { result } = renderHook(() => use다시돌린결과(100, 'ZRS', true));

    await waitFor(() => expect(result.current.size).toBe(2));
    expect(result.current.get('ZRS-001')).toEqual({ runId: 133, status: 'PASS' });
    expect(result.current.get('ZRS-002')).toEqual({ runId: 132, status: 'FAIL' });
    expect(api.runs).toHaveBeenCalledWith('ZRS', 1, { origin: 'rerun' });
  });

  it('켜지지 않았으면 아무것도 부르지 않는다', () => {
    const 부름 = vi.spyOn(api, 'runs');

    const { result } = renderHook(() => use다시돌린결과(100, 'ZRS', false));

    expect(result.current.size).toBe(0);
    expect(부름).not.toHaveBeenCalled();
  });

  it('읽기가 실패해도 빈 표다 — 결과 화면은 그대로 선다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(api, 'runs').mockRejectedValue(new Error('x'));

    const { result } = renderHook(() => use다시돌린결과(100, 'ZRS', true));

    await waitFor(() => expect(api.runs).toHaveBeenCalled());
    expect(result.current.size).toBe(0);
  });
});
