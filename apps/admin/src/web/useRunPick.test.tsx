// @vitest-environment jsdom
// 목록에서 실행 창을 열 때 같은 프로시저의 케이스를 채우는지 본다 (도메인/실행 §8.10 · DESIGN.md 「실행 창」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

import { api, type CaseRow } from './api.js';
import { 사람 } from './runPick.fixture.js';
import { useRunPick } from './useRunPick.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 줄 = (tcId: string, procSeq: number): CaseRow => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['android'],
  precondition: [],
  filePath: `tests/${tcId}.spec.ts`,
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-11-24T00:00:00.000Z',
  procId: 'ZRS-TP-1',
  procName: '주문',
  procSeq,
  procCount: 3,
});

function 훅() {
  vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
  const 알림 = vi.fn();
  return { 알림, ...renderHook(() => useRunPick({ service: 'ZRS', 조건: { service: 'ZRS' }, 알림 })) };
}

describe('useRunPick — 프로시저 채우기', () => {
  it('프로시저의 케이스 하나로 열어도 나머지가 실행 차례대로 자동 포함으로 담긴다', async () => {
    vi.spyOn(api, 'cases').mockResolvedValue({ items: [줄('ZRS-3', 3), 줄('ZRS-1', 1), 줄('ZRS-2', 2)], total: 3, page: 1, pageSize: 50 });
    const { result } = 훅();

    await act(async () => {
      await result.current.하나열기(줄('ZRS-2', 2));
    });

    expect(result.current.담은것?.map((c) => [c.tcId, c.자동포함 === true])).toEqual([
      ['ZRS-1', true],
      ['ZRS-2', false],
      ['ZRS-3', true],
    ]);
    expect(result.current.안내).toBeUndefined();
  });

  it('못 받으면 고른 줄로 열고 안내에 못 받았다고 적는다', async () => {
    vi.spyOn(api, 'cases').mockRejectedValue(new Error('network'));
    const { result } = 훅();

    await act(async () => {
      await result.current.하나열기(줄('ZRS-2', 2));
    });

    expect(result.current.담은것?.map((c) => c.tcId)).toEqual(['ZRS-2']);
    expect(result.current.안내).toBe('같은 프로시저의 케이스를 불러오지 못했습니다');
  });
});
