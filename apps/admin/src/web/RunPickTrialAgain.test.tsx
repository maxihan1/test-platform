// @vitest-environment jsdom
// 시험 실행 결과의 「Fail 다시 시험」 — 같은 프로시저에서 따라오는 줄은 그 프로시저에서 실패한 디바이스로만 돈다 (도메인/실행 §8.10)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

import { api, type CaseRow } from './api.js';
import type { 담은줄 } from './pickProc.js';
import { use여러건시험 } from './RunPickTrial.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 프로시저케이스 = (tcId: string, procSeq: number, procId = 'ZRS-TP-1'): 담은줄 =>
  ({
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop', 'mobile'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-09-21T00:00:00.000Z',
    procId,
    procName: '주문',
    procSeq,
    procCount: 3,
  }) satisfies CaseRow;

describe('use여러건시험 — 실패다시', () => {
  it('프로시저에서 PC 만 실패했으면 다시 시험도 PC 한 번만 걸고 모바일로는 안 건다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: { status: 'PASS', durationMs: 5, steps: [] } });
    const 케이스들 = [프로시저케이스('ZRS-001', 1), 프로시저케이스('ZRS-002', 2), 프로시저케이스('ZRS-003', 3)];
    const { result } = renderHook(() => use여러건시험({ 케이스들, 고친값: {}, env: 'qa', mobileOn: 'server', 알림: vi.fn() }));

    await act(async () => {
      result.current.실패다시([{ tcId: 'ZRS-002', platform: 'desktop' }]);
    });
    expect(시작).not.toHaveBeenCalled();
    expect(result.current.확인).toBe('trial');
    expect(result.current.확인할것.map((c) => [c.tcId, c.platforms])).toEqual([['ZRS-001', ['desktop']], ['ZRS-002', ['desktop']], ['ZRS-003', ['desktop']]]);
    await act(async () => {
      result.current.시작();
    });

    await vi.waitFor(() => expect(시작).toHaveBeenCalled());
    expect(시작.mock.calls.map(([tcId, body]) => [tcId, body.platform])).toEqual([['ZRS-002', 'desktop']]);
  });
});
