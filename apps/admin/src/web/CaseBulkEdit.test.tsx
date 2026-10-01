// @vitest-environment jsdom
// 케이스 목록에서 고른 것으로 「삭제 요청」 · 「미확정 N건 확정 요청」 (도메인/카탈로그 §8.1 「여러 건 골라」).
// 둘 다 확인 상자를 거치고, 확정 상자는 케이스마다 미확정 사유와 지금 기대값을 보인다

import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { 고치기상한 } from '../authoring/edit.js';
import { api, type CaseRow } from './api.js';
import { 고른것고치기 } from './CaseBulkEdit.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 케이스(tcId: string, 덮을것: Partial<CaseRow> = {}): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: { type: 'object', properties: {} } as unknown as CaseRow['paramSchema'],
    expectedSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: '주문 상태', default: '결제 완료' },
        token: { type: 'string', description: '토큰', default: 'abc-secret' },
      },
    } as unknown as CaseRow['expectedSchema'],
    isActive: true,
    scannedAt: '2026-10-01T00:00:00.000Z',
    ...덮을것,
  };
}

function 고름(...rows: CaseRow[]): ReadonlyMap<string, CaseRow> {
  return new Map(rows.map((r) => [r.tcId, r]));
}

describe('고른 것으로 고치기 요청', () => {
  it('하나도 안 골랐으면 버튼이 없다', () => {
    render(<고른것고치기 service="XEW" 고른={고름()} 다되면={() => {}} />);
    expect(screen.queryByRole('button', { name: '삭제 요청' })).toBeNull();
    expect(screen.queryByRole('button', { name: /확정 요청/ })).toBeNull();
  });

  it('확정 버튼은 고른 것 가운데 미확정 수를 싣고, 0 이면 안 보인다', () => {
    const { rerender } = render(<고른것고치기 service="XEW" 고른={고름(케이스('XEW-001'))} 다되면={() => {}} />);
    expect(screen.getByRole('button', { name: '삭제 요청' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /확정 요청/ })).toBeNull();

    rerender(
      <고른것고치기
        service="XEW"
        고른={고름(케이스('XEW-001'), 케이스('XEW-002', { unconfirmed: '문구가 기획서에 없다' }))}
        다되면={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: '미확정 1건 확정 요청' })).toBeTruthy();
  });

  it('비활성만 골랐으면 삭제 요청 버튼도 없다. 열어 봐야 보낼 것이 없다', () => {
    render(<고른것고치기 service="XEW" 고른={고름(케이스('XEW-001', { isActive: false }))} 다되면={() => {}} />);
    expect(screen.queryByRole('button', { name: '삭제 요청' })).toBeNull();
  });

  it('삭제는 확인 상자를 거쳐 고른 것 전부를 지우는 요청 하나로 간다', async () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 51 });
    const 다되면 = vi.fn();
    render(<고른것고치기 service="XEW" 고른={고름(케이스('XEW-001'), 케이스('XEW-002'))} 다되면={다되면} />);

    fireEvent.click(screen.getByRole('button', { name: '삭제 요청' }));
    const 상자 = within(screen.getByRole('dialog'));
    expect(상자.getByText(/E2E 시나리오/)).toBeTruthy();
    expect(보냄).not.toHaveBeenCalled();

    fireEvent.click(상자.getByRole('button', { name: '삭제 요청 보내기' }));
    await waitFor(() =>
      expect(보냄).toHaveBeenCalledWith('XEW', [
        { tcId: 'XEW-001', delete: true },
        { tcId: 'XEW-002', delete: true },
      ]),
    );
    expect((await screen.findByRole('link', { name: '작성 요청 51번' })).getAttribute('href')).toBe('#/authoring/51');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '닫기' }));
    expect(다되면).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(다되면).toHaveBeenCalledTimes(1);
  });

  it('확정 상자는 미확정 케이스만 담고 케이스마다 사유와 지금 기대값을 보인다. 비밀값은 가린다', async () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 52 });
    render(
      <고른것고치기
        service="XEW"
        고른={고름(케이스('XEW-001'), 케이스('XEW-002', { unconfirmed: '문구가 기획서에 없다' }))}
        다되면={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '미확정 1건 확정 요청' }));
    const 상자 = within(screen.getByRole('dialog'));
    expect(상자.getByText(/문구가 기획서에 없다/)).toBeTruthy();
    expect(상자.getByText(/주문 상태 결제 완료/)).toBeTruthy();
    expect(상자.queryByText(/abc-secret/)).toBeNull();
    expect(상자.queryByText(/XEW-001/)).toBeNull();

    fireEvent.click(상자.getByRole('button', { name: '확정 요청 보내기' }));
    await waitFor(() => expect(보냄).toHaveBeenCalledWith('XEW', [{ tcId: 'XEW-002', confirm: true }]));
  });

  it('고른 것은 성공 상자를 닫을 때 비운다 — 상자가 떠 있는 동안 목록이 흔들리지 않는다', async () => {
    vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 54 });
    function 판() {
      const [고른, set고른] = useState(고름(케이스('XEW-001')));
      return <고른것고치기 service="XEW" 고른={고른} 다되면={() => set고른(new Map())} />;
    }
    render(<판 />);

    fireEvent.click(screen.getByRole('button', { name: '삭제 요청' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제 요청 보내기' }));
    expect(await screen.findByRole('link', { name: '작성 요청 54번' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: '삭제 요청' })).toBeNull();
  });

  it('보내는 동안은 상자를 닫지 않는다. 닫으면 결과를 볼 자리가 사라진다', async () => {
    let 끝내기: (값: { id: number }) => void = () => undefined;
    vi.spyOn(api, 'createAuthoringEdit').mockReturnValue(new Promise((resolve) => { 끝내기 = resolve; }));
    render(<고른것고치기 service="XEW" 고른={고름(케이스('XEW-001'))} 다되면={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '삭제 요청' }));
    const 상자 = within(screen.getByRole('dialog'));
    fireEvent.click(상자.getByRole('button', { name: '삭제 요청 보내기' }));
    fireEvent.click(상자.getByRole('button', { name: '취소' }));
    expect(screen.getByRole('dialog')).toBeTruthy();

    끝내기({ id: 55 });
    expect(await screen.findByRole('link', { name: '작성 요청 55번' })).toBeTruthy();
  });

  it('서버 상한을 넘으면 상자가 막고 까닭을 적는다', () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 1 });
    const 많이 = Array.from({ length: 고치기상한 + 1 }, (_, i) => 케이스(`XEW-${String(i + 1).padStart(3, '0')}`));
    render(<고른것고치기 service="XEW" 고른={고름(...많이)} 다되면={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '삭제 요청' }));
    const 상자 = within(screen.getByRole('dialog'));
    expect(상자.getByText(new RegExp(`${String(고치기상한)}건까지`))).toBeTruthy();
    expect((상자.getByRole('button', { name: '삭제 요청 보내기' }) as HTMLButtonElement).disabled).toBe(true);
    expect(보냄).not.toHaveBeenCalled();
  });

  it('비활성 케이스는 담지 않고 뺐다고 적는다', async () => {
    const 보냄 = vi.spyOn(api, 'createAuthoringEdit').mockResolvedValue({ id: 53 });
    render(<고른것고치기 service="XEW" 고른={고름(케이스('XEW-001'), 케이스('XEW-002', { isActive: false }))} 다되면={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '삭제 요청' }));
    const 상자 = within(screen.getByRole('dialog'));
    expect(상자.getByText(/비활성 1건은 뺐습니다/)).toBeTruthy();
    fireEvent.click(상자.getByRole('button', { name: '삭제 요청 보내기' }));
    await waitFor(() => expect(보냄).toHaveBeenCalledWith('XEW', [{ tcId: 'XEW-001', delete: true }]));
  });
});
