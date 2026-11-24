// @vitest-environment jsdom
// 다시 실행 창의 테스트 프로시저 — 자동 포함 줄의 디바이스 (도메인/실행 §3.2 「디바이스는 프로시저마다 정한다」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type CaseRow } from './api.js';
import { 사람 } from './runPick.fixture.js';
import { RunWindow } from './RunWindow.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 프로시저케이스 = (tcId: string, procSeq: number): CaseRow => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop', 'mobile'],
  precondition: [],
  filePath: `tests/${tcId}.spec.ts`,
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-09-21T00:00:00.000Z',
  procId: 'ZRS-TP-1',
  procName: '주문',
  procSeq,
  procCount: 3,
});

describe('RunWindow — 프로시저 자동 포함 줄', () => {
  it('자동 포함 줄은 같은 프로시저에서 실은 케이스의 디바이스로만 돈다 — 선언한 디바이스를 다 쓰지 않는다', async () => {
    const 셋 = [프로시저케이스('ZRS-001', 1), 프로시저케이스('ZRS-002', 2), 프로시저케이스('ZRS-003', 3)];
    vi.spyOn(api, 'caseOf').mockImplementation((tcId) => Promise.resolve(셋.find((c) => c.tcId === tcId)!));
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'cases').mockResolvedValue({ items: 셋, total: 3, page: 1, pageSize: 50 });
    render(<RunWindow tcIds={['ZRS-001']} 디바이스={{ 'ZRS-001': ['desktop'] }} onClose={vi.fn()} />);

    expect(await screen.findByRole('dialog', { name: '케이스 3건 실행' })).toBeTruthy();
    expect([...document.querySelectorAll('.prow .dev')].map((칸) => 칸.textContent)).toEqual(['PC', 'PC', 'PC']);
    expect(document.querySelector('.dev-pick')?.textContent).toBe('디바이스PC 3건');
  });
});
