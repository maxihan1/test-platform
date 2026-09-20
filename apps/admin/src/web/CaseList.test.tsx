// @vitest-environment jsdom
// 케이스 목록의 「여러 건 고르기」 검사 (SPEC §8.1).
//
// 가장 비싼 축은 ③ 「전체」다. 서버가 한 쪽씩만 주므로 화면이 손에 든 쪽만 담으면
// 51건째부터 조용히 빠지는데 버튼은 「전체」라고 말한다. 그래서 여기서는
// `api.cases` 가 **쪽마다 불렸는지**를 본다 — 한 쪽만 받고 끝나면 실패해야 한다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CaseRow, type Paged } from './api.js';
import { CaseList } from './CaseList.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 케이스(tcId: string): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-09-21T00:00:00.000Z',
  };
}

// 한 쪽 크기를 2로 두면 2건짜리 쪽은 「더 있다」, 1건짜리 쪽은 「끝」이다 (paging.ts)
const 쪽1: Paged<CaseRow> = { items: [케이스('ZPK-001'), 케이스('ZPK-002')], total: 3, page: 1, pageSize: 2 };
const 쪽2: Paged<CaseRow> = { items: [케이스('ZPK-003')], total: 3, page: 2, pageSize: 2 };

/** 마운트에서 부르는 셋을 전부 막는다. cases 만 시험 대상이고 나머지 둘은 조용히 비운다 */
function 모킹(cases: (page: number) => Promise<Paged<CaseRow>>) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  return vi.spyOn(api, 'cases').mockImplementation((q) => cases(q.page ?? 1));
}

const 쪽주기 = (page: number) => Promise.resolve(page === 1 ? 쪽1 : 쪽2);

async function 그리기(cases: (page: number) => Promise<Paged<CaseRow>> = 쪽주기) {
  const 스파이 = 모킹(cases);
  const 것 = render(<CaseList service="ZPK" />);
  await screen.findByText('ZPK-001');
  return { ...것, 스파이 };
}

const 고르기칸 = () => screen.getAllByRole('checkbox');
const 실행버튼 = () => screen.getByRole('button', { name: /실행하기$/ });

describe('CaseList 여러 건 고르기', () => {
  it('줄마다 고르는 칸이 있다', async () => {
    await 그리기();
    expect(고르기칸()).toHaveLength(2);
  });

  it('아무것도 안 고르면 버튼 글자가 전체 실행하기다', async () => {
    await 그리기();
    expect(실행버튼().textContent).toBe('전체 실행하기');
  });

  it('고른 수만큼 버튼 글자가 바뀐다', async () => {
    await 그리기();
    fireEvent.click(고르기칸()[0]!);
    expect(실행버튼().textContent).toBe('고른 1건 실행하기');
    fireEvent.click(고르기칸()[1]!);
    expect(실행버튼().textContent).toBe('고른 2건 실행하기');
  });

  it('전체 실행하기를 누르면 마지막 쪽까지 쪽마다 받아 모은다', async () => {
    const { 스파이 } = await 그리기();
    스파이.mockClear();

    fireEvent.click(실행버튼());

    await waitFor(() => {
      const 받은쪽 = 스파이.mock.calls.map(([q]) => q.page);
      expect(받은쪽).toEqual([1, 2]);
    });
  });

  it('받는 동안 버튼이 막히고 그 사실이 화면 줄로 뜬다', async () => {
    let 풀기: ((쪽: Paged<CaseRow>) => void) | null = null;
    // 두 번째 쪽을 손에 쥐고 있어야 「받는 중」 이 화면에 떠 있는 순간을 붙잡을 수 있다
    await 그리기((page) =>
      page === 1
        ? Promise.resolve(쪽1)
        : new Promise<Paged<CaseRow>>((resolve) => {
            풀기 = resolve;
          }),
    );

    fireEvent.click(실행버튼());

    await waitFor(() => {
      expect(실행버튼().hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('status').textContent).toContain('케이스 목록을 모으는 중');
    });
    // 말풍선이 아니라 화면 줄이어야 한다 (DESIGN.md 접근성 기준)
    expect(실행버튼().hasAttribute('title')).toBe(false);

    await waitFor(() => expect(풀기).not.toBeNull());
    풀기!(쪽2);

    await waitFor(() => expect(실행버튼().hasAttribute('disabled')).toBe(false));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
