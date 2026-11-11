// @vitest-environment jsdom
// 「PRD 관리」 목차의 「정리 필요」 묶음 — 서랍에서 다른 묶음으로 옮긴다
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Prd } from './Prd.js';
import { 로그인실패, 아이디, 잠금, 판 } from './prd.fixture.js';
import type { PrdItemDraft, PrdNow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금, 저장 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  저장: vi.fn((_s: string, _base: number, _items: PrdItemDraft[]) => Promise.resolve({ version: 13 })),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, save: 저장, apis: () => Promise.resolve({ apis: [] }) } }));

const 쓰는사람: 판정 = () => true;
const 보는사람: 판정 = () => false;

const 이슈요구 = { ...로그인실패, reqId: 'MKT-REQ-050', feature: '잠금 안내를 「10분 뒤에 다시 시도하세요」로 바꾼다', text: '잠긴 계정이 로그인하면 잠금 안내가 보인다' };

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판({ items: [아이디, 잠금, 이슈요구] }));
  저장.mockClear();
});

afterEach(() => cleanup());

const 정리목차 = async () => within(await screen.findByRole('navigation', { name: '기능 묶음 목차' })).getByRole('button', { name: /정리 필요/ });

describe('PRD 관리 — 목차의 정리 필요 묶음', () => {
  it('규칙에 어긋난 이름은 목차에 「정리 필요」가 붙고 이름표에도 붙는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await 정리목차();
    expect(칸.textContent).toContain('잠금 안내를');
    expect([...document.querySelectorAll('.toc-label')].filter((el) => el.textContent?.includes('정리 필요'))).toHaveLength(1);
  });

  it('눌러서 옮기면 그 묶음의 요구만 feature 가 바뀐 판 전체를 보내고, 알림을 한 줄 띄운다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await 정리목차());
    const 서랍 = screen.getByRole('complementary');
    expect(within(서랍).getByText('이 묶음 이름은 목차 규칙에 맞지 않아요')).toBeTruthy();
    expect(within(서랍).getByText('이름이 문장 꼴입니다')).toBeTruthy();
    expect(within(서랍).getByText('들어 있는 요구사항 1건')).toBeTruthy();
    // 요구 문장에 「로그인」 이 들어 있어 그 묶음을 미리 고른다
    const 고르개 = within(서랍).getByLabelText('옮길 묶음') as HTMLSelectElement;
    expect(고르개.value).toBe('로그인');
    expect([...고르개.options].map((o) => o.value)).toEqual(['회원가입', '로그인']);

    fireEvent.click(within(서랍).getByRole('button', { name: '옮기기' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    const [서비스, 기준, 보낸것] = 저장.mock.calls[0]!;
    expect([서비스, 기준]).toEqual(['MKT', 12]);
    expect(보낸것.map((x) => [x.reqId, x.feature])).toEqual([
      ['MKT-REQ-031', '회원가입'],
      ['MKT-REQ-041', '로그인'],
      ['MKT-REQ-050', '로그인'],
    ]);
    expect(await screen.findByText('요구사항 1건을 「로그인」으로 옮겼습니다')).toBeTruthy();
    await vi.waitFor(() => expect(screen.queryByRole('complementary')).toBeNull());
  });

  it('쓰기 권한이 없으면 까닭만 보이고 고르개 · 옮기기는 없다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await 정리목차());
    const 서랍 = screen.getByRole('complementary');
    expect(within(서랍).getByText('이름이 문장 꼴입니다')).toBeTruthy();
    expect(within(서랍).queryByLabelText('옮길 묶음')).toBeNull();
    expect(within(서랍).queryByRole('button', { name: '옮기기' })).toBeNull();
  });
});
