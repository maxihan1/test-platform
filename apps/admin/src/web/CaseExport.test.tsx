// @vitest-environment jsdom
// 케이스 목록의 「이 결과 엑셀로」 버튼과 받는 통로 검사 (도메인/카탈로그 §8.1)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type CaseRow, type Paged } from './api.js';
import { CaseList } from './CaseList.js';
import { 받을이름 } from './ui.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const 케이스: CaseRow = {
  tcId: 'XCX-001',
  name: '로그인 케이스',
  platforms: ['desktop'],
  precondition: [],
  filePath: 'tests/XCX-001.spec.ts',
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-09-29T00:00:00.000Z',
};

function 그리기(total: number) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  const 쪽: Paged<CaseRow> = { items: total === 0 ? [] : [케이스], total, page: 1, pageSize: 50 };
  vi.spyOn(api, 'cases').mockResolvedValue(쪽);
  render(<CaseList kind="FN" service="XCX" 할수={() => true} 결과보나 />);
}

describe('케이스 목록 — 이 결과 엑셀로', () => {
  it('버튼에 목록 응답의 total 이 붙는다', async () => {
    그리기(6);
    expect(await screen.findByRole('button', { name: '이 결과 엑셀로 (6건)' })).toHaveProperty('disabled', false);
  });

  it('0건이면 누를 수 없다', async () => {
    그리기(0);
    expect(await screen.findByRole('button', { name: '이 결과 엑셀로 (0건)' })).toHaveProperty('disabled', true);
  });

  it('지금 건 조건으로 받고, 받는 동안 막고, 다 받으면 파일을 내려준다', async () => {
    그리기(6);
    let 끝내기: (값: { 파일: Blob; 머리: string | null }) => void = () => undefined;
    const 받기 = vi.spyOn(api, 'caseExport').mockReturnValue(new Promise((r) => (끝내기 = r)));
    const 만들기 = vi.fn(() => 'blob:xcx');
    // jsdom 에는 두 함수가 없어 spyOn 을 못 건다
    Object.assign(URL, { createObjectURL: 만들기, revokeObjectURL: vi.fn() });
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    fireEvent.change(await screen.findByPlaceholderText('케이스 이름이나 ID로 찾기'), { target: { value: '로그인' } });
    fireEvent.click(screen.getByRole('button', { name: '찾기' }));
    fireEvent.click(await screen.findByRole('button', { name: '이 결과 엑셀로 (6건)' }));

    expect(받기).toHaveBeenCalledWith(expect.objectContaining({ service: 'XCX', q: '로그인' }));
    expect(screen.getByRole('button', { name: '만드는 중…' })).toHaveProperty('disabled', true);

    끝내기({ 파일: new Blob(['x']), 머리: "attachment; filename=\"XCX-testcases-2026-09-29.xlsx\"; filename*=UTF-8''XCX-%ED%85%8C%EC%8A%A4%ED%8A%B8%EC%BC%80%EC%9D%B4%EC%8A%A4-2026-09-29.xlsx" });
    await waitFor(() => expect(누름).toHaveBeenCalledOnce());
    expect(만들기).toHaveBeenCalledOnce();
    expect((누름.mock.contexts[0] as HTMLAnchorElement).download).toBe('XCX-테스트케이스-2026-09-29.xlsx');
    expect(screen.getByRole('button', { name: '이 결과 엑셀로 (6건)' })).toHaveProperty('disabled', false);
  });

  it('거절당하면 목록 위에 알림 한 줄을 띄우고 옮기지 않는다', async () => {
    그리기(6);
    vi.spyOn(api, 'caseExport').mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'cases:read', []));
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    fireEvent.click(await screen.findByRole('button', { name: '이 결과 엑셀로 (6건)' }));

    expect((await screen.findByRole('alert')).textContent).toBe('이 서비스에서 케이스 읽기 권한이 없습니다');
    expect(누름).not.toHaveBeenCalled();
  });
});

describe('받을이름', () => {
  it('filename* 를 먼저, 없으면 filename, 둘 다 없으면 기본', () => {
    expect(받을이름("attachment; filename=\"a.xlsx\"; filename*=UTF-8''%ED%95%9C.xlsx", '기본')).toBe('한.xlsx');
    expect(받을이름('attachment; filename="a.xlsx"', '기본')).toBe('a.xlsx');
    expect(받을이름(null, '기본')).toBe('기본');
  });
});

describe('api.caseExport', () => {
  it('목록과 같은 조건으로 export 를 부르고 파일과 머리를 돌려준다', async () => {
    const 가짜 = vi.fn(async () => new Response('x', { headers: { 'content-disposition': 'attachment; filename="a.xlsx"' } }));
    vi.stubGlobal('fetch', 가짜);

    const 받음 = await api.caseExport({ service: 'XCX', q: '로그인', platform: 'mobile', active: false, page: 3 });

    expect(가짜).toHaveBeenCalledWith('/api/catalog/export?service=XCX&q=%EB%A1%9C%EA%B7%B8%EC%9D%B8&platform=mobile&active=false', expect.anything());
    expect(받음.머리).toBe('attachment; filename="a.xlsx"');
    expect(await 받음.파일.text()).toBe('x');
  });

  it('500 이면 ApiError 를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'BOOM' }), { status: 500 })));
    await expect(api.caseExport({ service: 'XCX' })).rejects.toMatchObject({ code: 'BOOM' });
  });
});
