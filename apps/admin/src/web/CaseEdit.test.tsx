// @vitest-environment jsdom
// 케이스 상세의 「코드 기본값 바꾸기 요청」 (도메인/카탈로그 §8.1 · 도메인/작성 §3.6 「★ 케이스 고치기」).
// 화면은 값과 동작만 보낸다 — 바꾼 칸만, 확정은 미확정일 때만, 삭제는 두 번 눌러야 간다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError, type CaseRow } from './api.js';
import { CaseDetail } from './CaseDetail.js';
import { 코드기본값고치기 } from './CaseEdit.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 케이스(덮을것: Partial<CaseRow> = {}): CaseRow {
  return {
    tcId: 'XEW-001',
    name: '고치기 케이스',
    platforms: ['desktop'],
    precondition: [],
    filePath: 'tests/XEW-001.spec.ts',
    paramSchema: { type: 'object', properties: {} } as unknown as CaseRow['paramSchema'],
    expectedSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: '주문 상태', default: '결제 완료' },
        count: { type: 'integer', description: '상품 수', default: 1, minimum: 1 },
        items: { type: 'array', description: '상품 목록', default: [] },
        password: { type: 'string', description: '비밀번호', default: 'pw' },
      },
    } as unknown as CaseRow['expectedSchema'],
    isActive: true,
    scannedAt: '2026-10-01T00:00:00.000Z',
    ...덮을것,
  };
}

function 자리() {
  return within(screen.getByRole('group', { name: '코드 기본값 바꾸기 요청' }));
}

describe('코드 기본값 바꾸기 요청', () => {
  it('바꿀 수 있는 칸만 코드 기본값으로 채워 연다. 비밀값 · 배열 칸은 없다', () => {
    render(<코드기본값고치기 row={케이스()} service="XEW" />);

    expect((자리().getByLabelText(/주문 상태/) as HTMLInputElement).value).toBe('결제 완료');
    expect((자리().getByLabelText(/상품 수/) as HTMLInputElement).value).toBe('1');
    expect(자리().queryByLabelText(/상품 목록/)).toBeNull();
    expect(자리().queryByLabelText(/비밀번호/)).toBeNull();
  });

  it('아무것도 안 바꿨으면 보낼 수 없다', () => {
    render(<코드기본값고치기 row={케이스()} service="XEW" />);
    expect((자리().getByRole('button', { name: '요청 보내기' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('바꾼 칸만 보내고, 보낸 뒤 작성 요청 번호로 가는 길을 보인다', async () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 41 });
    render(<코드기본값고치기 row={케이스()} service="XEW" />);

    fireEvent.change(자리().getByLabelText(/상품 수/), { target: { value: '3' } });
    fireEvent.click(자리().getByRole('button', { name: '요청 보내기' }));

    await waitFor(() => expect(보냄).toHaveBeenCalledWith('XEW', [{ tcId: 'XEW-001', expected: { count: 3 } }]));
    const 고리 = await screen.findByRole('link', { name: '작성 요청 41번' });
    expect(고리.getAttribute('href')).toBe('#/authoring/41');
    expect(screen.queryByRole('button', { name: '요청 보내기' })).toBeNull();
  });

  it('칸 규칙에 어긋나면 그 칸 아래에 까닭을 적고 보내지 않는다', () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 1 });
    render(<코드기본값고치기 row={케이스()} service="XEW" />);

    fireEvent.change(자리().getByLabelText(/상품 수/), { target: { value: '0' } });
    fireEvent.click(자리().getByRole('button', { name: '요청 보내기' }));

    expect(보냄).not.toHaveBeenCalled();
    expect(자리().getByText(/1 이상/, { selector: '.err' })).toBeTruthy();
  });

  it('바꾼 칸에 저장값이 있으면 반영되면 지워진다고 적는다', () => {
    const 행 = 케이스({
      savedInput: {
        params: {},
        expected: { state: '배송 중' },
        savedSecrets: { params: [], expected: [] },
        savedBy: 'tester',
        savedAt: '2026-10-01T00:00:00.000Z',
      },
    });
    render(<코드기본값고치기 row={행} service="XEW" />);

    expect(자리().queryByText(/반영되면 이 저장값은 지워집니다/)).toBeNull();
    fireEvent.change(자리().getByLabelText(/주문 상태/), { target: { value: '배송 완료' } });
    expect(자리().getByText(/주문 상태 — 반영되면 이 저장값은 지워집니다/)).toBeTruthy();
  });

  it('확정 고르개는 미확정 케이스에만 있고, 곁에 사유와 지금 기대값을 보인다', async () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 42 });
    const { unmount } = render(<코드기본값고치기 row={케이스()} service="XEW" />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    unmount();

    render(<코드기본값고치기 row={케이스({ unconfirmed: '기획서에 결과 문구가 없다' })} service="XEW" />);
    expect(자리().getByText(/기획서에 결과 문구가 없다/)).toBeTruthy();
    expect(자리().getByText(/주문 상태 결제 완료/)).toBeTruthy();

    fireEvent.click(자리().getByRole('checkbox', { name: /확정/ }));
    fireEvent.click(자리().getByRole('button', { name: '요청 보내기' }));
    await waitFor(() => expect(보냄).toHaveBeenCalledWith('XEW', [{ tcId: 'XEW-001', confirm: true }]));
  });

  it('기대값과 확정을 한 요청에 같이 싣는다', async () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 44 });
    render(<코드기본값고치기 row={케이스({ unconfirmed: '문구가 기획서에 없다' })} service="XEW" />);

    fireEvent.change(자리().getByLabelText(/상품 수/), { target: { value: '3' } });
    fireEvent.click(자리().getByRole('checkbox', { name: /확정/ }));
    fireEvent.click(자리().getByRole('button', { name: '요청 보내기' }));
    await waitFor(() =>
      expect(보냄).toHaveBeenCalledWith('XEW', [{ tcId: 'XEW-001', expected: { count: 3 }, confirm: true }]),
    );
  });

  it('비활성 케이스 상세에는 고치기 자리가 없다. 서버가 늘 거절한다', () => {
    vi.spyOn(api, 'caseHistory').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    render(<CaseDetail row={케이스({ isActive: false })} 폈나 마지막={undefined} 고칠서비스="XEW" onClose={() => {}} on값={() => {}} />);
    expect(screen.queryByRole('group', { name: '코드 기본값 바꾸기 요청' })).toBeNull();
  });

  it('삭제는 두 번 눌러야 가고, 곁에 E2E 시나리오가 못 돈다고 적는다', async () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 43 });
    render(<코드기본값고치기 row={케이스()} service="XEW" />);

    expect(screen.getByText(/E2E 시나리오/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '케이스 삭제 요청' }));
    expect(보냄).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('button', { name: '삭제 확인' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '케이스 삭제 요청' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
    await waitFor(() => expect(보냄).toHaveBeenCalledWith('XEW', [{ tcId: 'XEW-001', delete: true }]));
    expect(await screen.findByRole('link', { name: '작성 요청 43번' })).toBeTruthy();
  });

  it('겹치는 고치기가 열려 있으면 그 요청 번호를 같이 알린다', async () => {
    vi.spyOn(api, 'createAuthoringEdit').mockRejectedValue(new ApiError(409, 'EDIT_OPEN', '12'));
    render(<코드기본값고치기 row={케이스()} service="XEW" />);

    fireEvent.click(screen.getByRole('button', { name: '케이스 삭제 요청' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));

    expect(await screen.findByText(/#12/)).toBeTruthy();
  });
});
