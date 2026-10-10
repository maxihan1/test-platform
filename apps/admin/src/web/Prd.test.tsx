// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { Prd } from './Prd.js';
import { 판, 로그인실패 } from './prd.fixture.js';
import type { PrdNow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금, 확정 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  확정: vi.fn((_s: string, _base: number, _ids: string[]) => Promise.resolve({ version: 13 })),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, confirm: 확정 } }));

const 쓰는사람: 판정 = () => true;
const 보는사람: 판정 = () => false;

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판());
  확정.mockClear();
});

afterEach(() => cleanup());

const 확인칸 = () => screen.getByRole('region', { name: /확인 필요 2건/ });

describe('PRD 관리 — 할 일 먼저', () => {
  it('판이 없으면 빈 화면과 첫 요구를 적는 길을 보인다', async () => {
    지금.mockResolvedValue(판({ version: 0, items: [], unapplied: { changed: [], added: [], removed: [] }, needsCheck: { count: 0, oldestSince: null } }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText('요구 더하기로 첫 요구를 적습니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '판 이력' })).toBeNull();
  });

  it('머리에 판과 요구 수, 확인 필요는 오래 기다린 것부터 나이와 근거 자리를 단다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText('판 12 · 요구 4건')).toBeTruthy();
    expect(within(확인칸()).getByText(/가장 오래된 것 9일째/)).toBeTruthy();
    const 줄들 = within(확인칸()).getAllByRole('listitem');
    expect(줄들.map((줄) => within(줄).getByText(/^MKT-REQ/).textContent)).toEqual(['MKT-REQ-040', 'MKT-REQ-032']);
    expect(within(줄들[0]!).getByText('9일째')).toBeTruthy();
    expect(within(줄들[0]!).getByText('로그인 · 화면 · /login')).toBeTruthy();
  });

  it('고른 확인 필요만 지금 판 번호와 함께 한 번에 확정하고 판을 다시 읽는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    const 버튼 = screen.getByRole('button', { name: '고른 0건 확정' }) as HTMLButtonElement;
    expect(버튼.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'MKT-REQ-040 고르기' }));
    fireEvent.click(screen.getByRole('button', { name: '고른 1건 확정' }));
    await vi.waitFor(() => expect(확정).toHaveBeenCalledWith('MKT', 12, ['MKT-REQ-040']));
    expect(await screen.findByText('판 13으로 저장했습니다')).toBeTruthy();
    await vi.waitFor(() => expect(지금).toHaveBeenCalledTimes(2));
  });

  it('모두 고르기는 확인 필요 전부를 고른다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    fireEvent.click(screen.getByRole('checkbox', { name: '모두 고르기' }));
    fireEvent.click(screen.getByRole('button', { name: '고른 2건 확정' }));
    await vi.waitFor(() => expect(확정).toHaveBeenCalledWith('MKT', 12, ['MKT-REQ-040', 'MKT-REQ-032']));
  });

  it('다른 사람이 먼저 저장했으면 까닭을 말하고 새 판을 다시 읽는다', async () => {
    확정.mockRejectedValueOnce(new ApiError(409, 'PRD_STALE', ''));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    fireEvent.click(screen.getByRole('checkbox', { name: 'MKT-REQ-032 고르기' }));
    fireEvent.click(screen.getByRole('button', { name: '고른 1건 확정' }));
    expect(await screen.findByText('다른 사람이 먼저 PRD 를 저장했습니다. 새 판을 불러왔으니 다시 저장합니다')).toBeTruthy();
    await vi.waitFor(() => expect(지금).toHaveBeenCalledTimes(2));
  });

  it('반영 안 됨은 종류와 번호를 보이고 지운 요구는 글 없이 적는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('region', { name: /반영 안 됨 2건/ });
    expect(within(칸).getByText('새 항목')).toBeTruthy();
    expect(within(칸).getByText('MKT-REQ-012')).toBeTruthy();
    expect(within(칸).getByText('지운 요구')).toBeTruthy();
    // 받는 쪽(PRD-F4-03)이 붙인다 — 그 전에 누르면 실패하는 버튼을 두지 않는다 (2026-10-10 사용자)
    expect(screen.queryByRole('button', { name: /테스트에 반영/ })).toBeNull();
  });

  it('할 일이 없으면 두 칸 대신 한 줄', async () => {
    지금.mockResolvedValue(
      판({ items: [판().items[0]!], unapplied: { changed: [], added: [], removed: [] }, needsCheck: { count: 0, oldestSince: null } }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText('확인할 요구도 테스트에 반영할 요구도 없습니다')).toBeTruthy();
  });

  it('작성 쓰기가 없으면 고르기 · 확정 · 더하기 · 고치기가 아예 없다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    await screen.findByText('판 12 · 요구 4건');
    expect(screen.queryAllByRole('checkbox')).toEqual([]);
    expect(screen.queryByRole('button', { name: /확정/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '요구 더하기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    expect(screen.getByText('설계 미리보기')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '고치기' })).toBeNull();
  });
});

describe('PRD 관리 — 전체 요구', () => {
  it('기능 묶음으로 접혀 있고 묶음 머리에 건수와 확인 필요 · 반영 안 됨을 단다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 로그인 = await screen.findByRole('button', { name: /로그인/ });
    expect(로그인.textContent).toContain('2건 · 확인 필요 1건 · 반영 안 됨 1건');
    expect(로그인.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: /MKT-REQ-041/ })).toBeNull();
    fireEvent.click(로그인);
    const 줄 = screen.getByRole('button', { name: /MKT-REQ-041/ });
    expect(줄.textContent).toContain('새 항목 · 반영 안 됨');
    expect(줄.textContent).toContain('사람이 고침');
  });

  it('줄을 펴면 근거와 판정 함수가 계산한 설계 미리보기를 보인다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    expect(screen.getByText('「아이디: 영문 소문자·숫자 4~12자」')).toBeTruthy();
    expect(['3자', '4자', '12자', '13자'].every((값) => screen.getByText(값))).toBe(true);
    expect(screen.getByText('동등 분할')).toBeTruthy();
  });

  it('찾는 동안은 맞은 묶음을 다 펴고, 없으면 그렇게 말한다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 칸 = await screen.findByRole('textbox', { name: '요구 문장 · 번호 검색' });
    fireEvent.change(칸, { target: { value: '잠긴다' } });
    expect(screen.getByRole('button', { name: /MKT-REQ-041/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /회원가입/ })).toBeNull();
    fireEvent.change(칸, { target: { value: '없는 말' } });
    expect(screen.getByText('찾는 요구가 없습니다')).toBeTruthy();
  });

  it('펼친 확인 필요 줄에서 그 요구만 확정한다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-032/ }));
    fireEvent.click(screen.getByRole('button', { name: '이 요구만 확정' }));
    await vi.waitFor(() => expect(확정).toHaveBeenCalledWith('MKT', 12, ['MKT-REQ-032']));
  });

  it('로그인 묶음의 두 근거를 다 보인다 — 문서끼리 달라 확인 필요가 된 항목', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /로그인/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-040/ }));
    for (const b of 로그인실패.basis) expect(screen.getByText(`「${b.quote}」`)).toBeTruthy();
  });
});
