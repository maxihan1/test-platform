// @vitest-environment jsdom
// 케이스 목록의 스모크 칩 · 「스모크만」 거르기 (도메인/카탈로그 §8.1 「스모크」 · GAME-F1-13b)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CasePage, type CaseRow } from './api.js';
import { CaseList } from './CaseList.js';
import type { 판정 } from './role.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '#/cases');
});

function 케이스(tcId: string, 칸: Partial<CaseRow>): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-10-24T00:00:00.000Z',
    feature: null,
    reqs: [],
    screens: [],
    ...칸,
  };
}

const 쪽: CasePage = {
  items: [
    케이스('ZSK-001', { smoke: false, smokeSet: null }),
    케이스('ZSK-002', { smoke: true, smokeSet: true }),
    케이스('ZSK-003', { smoke: true, smokeSet: null }),
  ],
  total: 3,
  page: 1,
  pageSize: 50,
  groups: [],
  hasFeatures: false,
  lastCounts: { total: 3, pass: 0, fail: 0, na: 3 },
};

const 전부된다: 판정 = () => true;
const 쓰기없다: 판정 = (일) => 일 !== '스모크고치기';

async function 그리기(할수: 판정) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  const 스파이 = vi.spyOn(api, 'cases').mockResolvedValue(쪽);
  render(<CaseList kind="FN" service="ZSK" 할수={할수} 결과보나 />);
  await screen.findByText('ZSK-001');
  return 스파이;
}

describe('스모크 칩', () => {
  it('고친 값이 없는 꺼진 줄의 칩을 누르면 켠다', async () => {
    const 고침 = vi.spyOn(api, 'setSmoke').mockResolvedValue(undefined);
    await 그리기(전부된다);
    fireEvent.click(screen.getByRole('button', { name: 'ZSK-001 스모크' }));
    await waitFor(() => expect(고침).toHaveBeenCalledWith('ZSK-001', true));
  });

  it('직접 고친 줄을 누르면 코드 값으로 되돌리고, 칩에 「직접」이 보인다', async () => {
    const 고침 = vi.spyOn(api, 'setSmoke').mockResolvedValue(undefined);
    await 그리기(전부된다);
    const 칩 = screen.getByRole('button', { name: 'ZSK-002 스모크' });
    expect(칩.textContent).toContain('· 직접');
    expect(screen.getByRole('button', { name: 'ZSK-003 스모크' }).textContent).not.toContain('직접');
    fireEvent.click(칩);
    await waitFor(() => expect(고침).toHaveBeenCalledWith('ZSK-002', null));
  });

  it('저장이 실패하면 칩 옆에 오류가 뜬다', async () => {
    vi.spyOn(api, 'setSmoke').mockRejectedValue(new Error('저장하지 못했습니다'));
    await 그리기(전부된다);
    fireEvent.click(screen.getByRole('button', { name: 'ZSK-001 스모크' }));
    expect((await screen.findByRole('alert')).textContent).toContain('저장하지 못했습니다');
  });

  it('쓰기 권한이 없으면 켜진 줄은 글자 꼬리표만, 꺼진 줄은 칩이 없다', async () => {
    await 그리기(쓰기없다);
    expect(screen.queryByRole('button', { name: /스모크$/ })).toBeNull();
    expect(screen.getAllByText(/● 스모크/)).toHaveLength(2);
    expect(screen.queryByText(/○ 스모크/)).toBeNull();
  });
});

describe('「스모크만」 거르기', () => {
  it('누르면 smoke: true 로 다시 읽고 주소에 smoke=1 이 남는다', async () => {
    const 스파이 = await 그리기(전부된다);
    fireEvent.click(screen.getByRole('button', { name: '스모크만' }));
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith(expect.objectContaining({ smoke: true })));
    expect(window.location.hash).toContain('smoke=1');
    expect(screen.getByRole('button', { name: '스모크만' }).getAttribute('aria-pressed')).toBe('true');
  });
});
