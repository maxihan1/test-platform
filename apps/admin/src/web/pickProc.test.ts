// 실행 창이 같은 프로시저의 케이스를 채우는 계산과 한 건 판정 검사 (도메인/실행 §3.2 「테스트 프로시저 실행」 「고르기」)

import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, type CaseRow } from './api.js';
import { 한건케이스, 프로시저채우기 } from './pickProc.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const 줄 = (tcId: string, procId: string | null, procSeq: number | null, procCount: number | null = 3): CaseRow => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['android'],
  precondition: [],
  filePath: `tests/${tcId}.spec.ts`,
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-11-24T00:00:00.000Z',
  procId,
  procSeq,
  procName: procId === null ? null : '글쓰기',
  procCount,
});

const 한쪽 = (items: CaseRow[]) => ({ items, total: items.length, page: 1, pageSize: 50 });

describe('프로시저채우기', () => {
  it('고른 케이스가 든 프로시저의 나머지를 실행 차례대로 채우고 고른 줄만 자동 포함이 아니다', async () => {
    const 받음 = vi.spyOn(api, 'cases').mockResolvedValue(
      한쪽([줄('MTA-3', 'MTA-TP-1', 3), 줄('MTA-1', 'MTA-TP-1', 1), 줄('MTA-2', 'MTA-TP-1', 2), 줄('MTA-99', null, null)]),
    );

    const { 줄들, 못받음 } = await 프로시저채우기([줄('MTA-2', 'MTA-TP-1', 2)]);

    expect(줄들.map((c) => [c.tcId, c.자동포함 === true])).toEqual([
      ['MTA-1', true],
      ['MTA-2', false],
      ['MTA-3', true],
    ]);
    expect(못받음).toBe(false);
    expect(받음).toHaveBeenCalledWith({ service: 'MTA', q: 'MTA-TP-1', page: 1 });
  });

  it('프로시저 케이스를 전부 골랐으면 받지 않고 옛 꼴 케이스는 그대로 둔다', async () => {
    const 받음 = vi.spyOn(api, 'cases');
    const 고른 = [줄('MTA-1', 'MTA-TP-1', 1, 2), 줄('MTA-7', null, null), 줄('MTA-2', 'MTA-TP-1', 2, 2)];

    const { 줄들, 못받음 } = await 프로시저채우기(고른);

    expect(줄들.map((c) => c.tcId)).toEqual(['MTA-1', 'MTA-2', 'MTA-7']);
    expect(줄들.some((c) => c.자동포함 === true)).toBe(false);
    expect(못받음).toBe(false);
    expect(받음).not.toHaveBeenCalled();
  });

  it('찾기가 다른 케이스까지 걸어 오면 프로시저 번호로 한 번 더 거르고 다 모일 때까지 쪽을 넘긴다', async () => {
    const 받음 = vi
      .spyOn(api, 'cases')
      .mockResolvedValueOnce({ items: [줄('MTA-X', 'MTA-TP-9', 1), 줄('MTA-1', 'MTA-TP-1', 1)], total: 3, page: 1, pageSize: 2 })
      .mockResolvedValueOnce({ items: [줄('MTA-2', 'MTA-TP-1', 2)], total: 3, page: 2, pageSize: 2 });

    const { 줄들, 못받음 } = await 프로시저채우기([줄('MTA-2', 'MTA-TP-1', 2, 2)]);

    expect(줄들.map((c) => c.tcId)).toEqual(['MTA-1', 'MTA-2']);
    expect(못받음).toBe(false);
    expect(받음).toHaveBeenCalledTimes(2);
  });

  it('받지 못하면 고른 줄로 그대로 열고 못 받았다고 알린다', async () => {
    vi.spyOn(api, 'cases').mockRejectedValue(new Error('network'));

    const { 줄들, 못받음 } = await 프로시저채우기([줄('MTA-2', 'MTA-TP-1', 2)]);

    expect(줄들.map((c) => c.tcId)).toEqual(['MTA-2']);
    expect(줄들[0]?.자동포함).toBeUndefined();
    expect(못받음).toBe(true);
  });

  it('프로시저가 둘이면 프로시저마다 그 첫 줄 자리에 채운다', async () => {
    vi.spyOn(api, 'cases').mockImplementation((조건) =>
      Promise.resolve(한쪽(조건.q === 'MTA-TP-1' ? [줄('MTA-1', 'MTA-TP-1', 1, 2), 줄('MTA-2', 'MTA-TP-1', 2, 2)] : [줄('MTA-8', 'MTA-TP-2', 1, 2), 줄('MTA-9', 'MTA-TP-2', 2, 2)])),
    );

    const { 줄들 } = await 프로시저채우기([줄('MTA-9', 'MTA-TP-2', 2, 2), 줄('MTA-2', 'MTA-TP-1', 2, 2)]);

    expect(줄들.map((c) => c.tcId)).toEqual(['MTA-8', 'MTA-9', 'MTA-1', 'MTA-2']);
  });
});

describe('한건케이스 — 서버의 한 건 규칙', () => {
  it('같은 프로시저의 케이스는 몇 건이든 반복 1 이면 한 건이고 고른 줄이 대표다', () => {
    const 케이스들 = [{ ...줄('MTA-1', 'MTA-TP-1', 1), 자동포함: true }, 줄('MTA-2', 'MTA-TP-1', 2)];
    expect(한건케이스(케이스들, 1)?.tcId).toBe('MTA-2');
    expect(한건케이스(케이스들, 2)).toBeNull();
  });

  it('옛 꼴 케이스는 하나일 때만 한 건이다', () => {
    expect(한건케이스([줄('MTA-7', null, null)], 1)?.tcId).toBe('MTA-7');
    expect(한건케이스([줄('MTA-7', null, null), 줄('MTA-8', null, null)], 1)).toBeNull();
  });

  it('옛 꼴과 프로시저 케이스가 섞였거나 프로시저가 둘이면 한 건이 아니다', () => {
    expect(한건케이스([줄('MTA-7', null, null), 줄('MTA-1', 'MTA-TP-1', 1)], 1)).toBeNull();
    expect(한건케이스([줄('MTA-1', 'MTA-TP-1', 1), 줄('MTA-8', 'MTA-TP-2', 1)], 1)).toBeNull();
  });
});
