// @vitest-environment jsdom
// 케이스 목록 — 상세 칸에서 값을 고친 채 화면을 떠나면 묻는다 (공통/5-화면공통 §8 「저장 안 한 내용이 있으면 떠나기 전에 묻는다」)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CasePage, type CaseRow } from './api.js';
import { CaseList } from './CaseList.js';
import { 주소로간다, 주소보기, 주소에선다 } from './keepState.fixture.js';

const 케이스: CaseRow = {
  tcId: 'ZPK-001',
  name: 'ZPK-001 케이스',
  platforms: ['desktop'],
  precondition: [],
  filePath: 'tests/ZPK-001.spec.ts',
  paramSchema: {
    type: 'object',
    properties: { currency: { type: 'string', description: '통화', default: 'KRW' } },
  } as unknown as CaseRow['paramSchema'],
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-09-21T00:00:00.000Z',
};
const 쪽: CasePage = { items: [케이스], total: 1, page: 1, pageSize: 2, lastCounts: { total: 1, pass: 0, fail: 0, na: 1 } };

afterEach(async () => {
  // 막힌 이동이 history.back() 으로 돌아오는 것이 다음 검사까지 번지지 않게 가라앉힌다
  await new Promise((끝) => setTimeout(끝, 30));
  cleanup();
  vi.restoreAllMocks();
});

async function 열기() {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  vi.spyOn(api, 'cases').mockResolvedValue(쪽);
  주소에선다('#/cases');
  render(
    <>
      <주소보기 />
      <CaseList kind="FN" service="ZPK" 할수={() => true} 결과보나 />
    </>,
  );
  await screen.findByText('ZPK-001 케이스');
  fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 케이스' }));
  return screen.findByLabelText(/통화/);
}

describe('케이스 목록 떠나기 묻기', () => {
  it('상세 칸을 열기만 하고 안 고쳤으면 그냥 간다', async () => {
    await 열기();
    await 주소로간다('#/runs');
    expect(screen.queryByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/runs');
  });

  it('값을 고쳤으면 묻고 주소는 그대로다', async () => {
    fireEvent.change(await 열기(), { target: { value: 'USD' } });
    await 주소로간다('#/runs');
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(screen.getByTestId('hash').textContent).not.toBe('#/runs');
  });

  it('모두에게 저장한 뒤에는 묻지 않는다', async () => {
    vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    fireEvent.change(await 열기(), { target: { value: 'USD' } });
    fireEvent.click(screen.getByRole('button', { name: '모두에게 저장' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '모두에게 저장' })).toBeNull());
    await 주소로간다('#/runs');
    expect(screen.queryByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/runs');
  });
});
