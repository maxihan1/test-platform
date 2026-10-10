// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Prd } from './Prd.js';
import { 판, 아이디, 아이디칸, 잠금 } from './prd.fixture.js';
import type { PrdItemDraft, PrdNow, PrdVersionRow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금, 저장, 판들, 되돌림 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  저장: vi.fn((_s: string, _base: number, _items: PrdItemDraft[]) => Promise.resolve({ version: 13 })),
  판들: vi.fn((_s: string): Promise<PrdVersionRow[]> => Promise.resolve([])),
  되돌림: vi.fn((_s: string, _base: number, _to: number) => Promise.resolve({ version: 13 })),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, save: 저장, versions: 판들, revert: 되돌림 } }));

const 쓰는사람: 판정 = () => true;

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판());
  저장.mockClear();
  판들.mockReset();
  판들.mockResolvedValue([
    { version: 12, source: 'PERSON', savedByName: '한지수', savedAt: '2026-10-09T08:42:00.000Z' },
    { version: 11, source: 'AGENT', savedByName: '작성 에이전트', savedAt: '2026-10-01T00:12:00.000Z' },
  ]);
  되돌림.mockClear();
});

afterEach(() => cleanup());

async function 펴서고치기(묶음: RegExp, 번호: RegExp) {
  render(<Prd service="MKT" 할수={쓰는사람} />);
  fireEvent.click(await screen.findByRole('button', { name: 묶음 }));
  fireEvent.click(screen.getByRole('button', { name: 번호 }));
  fireEvent.click(screen.getByRole('button', { name: '고치기' }));
}

describe('PRD 관리 — 고치기', () => {
  it('고친 요구는 번호를 그대로 두고 판 전체를 지금 판 번호와 함께 보낸다', async () => {
    await 펴서고치기(/회원가입/, /MKT-REQ-032/);
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '아이디 칸에는 12자까지 들어간다' } });
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    const [서비스, 기준, 보낸것] = 저장.mock.calls[0]!;
    expect([서비스, 기준]).toEqual(['MKT', 12]);
    expect(보낸것.map((x) => x.reqId)).toEqual(['MKT-REQ-031', 'MKT-REQ-032', 'MKT-REQ-040', 'MKT-REQ-041']);
    expect(보낸것[1]).toMatchObject({ reqId: 'MKT-REQ-032', text: '아이디 칸에는 12자까지 들어간다', status: 'CONFIRMED', basis: 아이디칸.basis });
    expect(await screen.findByText('판 13으로 저장했습니다')).toBeTruthy();
    expect(screen.queryByLabelText('요구 문장')).toBeNull();
  });

  it('빈 칸은 보내지 않고 어느 칸인지 말한다', async () => {
    await 펴서고치기(/회원가입/, /MKT-REQ-031/);
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('요구 문장을 적습니다')).toBeTruthy();
    expect(저장).not.toHaveBeenCalled();
  });

  it('근거를 더하고 빼며, 비운 원본 번호는 키째 빼고 보낸다', async () => {
    await 펴서고치기(/로그인/, /MKT-REQ-041/);
    fireEvent.click(screen.getByRole('button', { name: '근거 더하기' }));
    const 이름칸 = screen.getAllByLabelText('자료 이름');
    expect(이름칸).toHaveLength(2);
    fireEvent.change(이름칸[1]!, { target: { value: '화면' } });
    fireEvent.change(screen.getAllByLabelText('원본 문장')[1]!, { target: { value: '10분 뒤에 다시 시도하세요' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    expect(저장.mock.calls[0]![2][3]!.basis).toEqual([...잠금.basis, { from: '화면', quote: '10분 뒤에 다시 시도하세요' }]);
  });

  it('지우기는 그 자리에서 한 번 더 묻고, 확인하면 그 요구를 뺀 판을 보낸다', async () => {
    await 펴서고치기(/로그인/, /MKT-REQ-040/);
    fireEvent.click(screen.getByRole('button', { name: '이 요구 지우기' }));
    expect(저장).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '지우기 확인' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    expect(저장.mock.calls[0]![2].map((x) => x.reqId)).toEqual([아이디.reqId, 아이디칸.reqId, 잠금.reqId]);
  });

  it('요구 더하기는 번호 없이 맨 뒤에 붙이고, 기능 묶음은 지금 판의 것을 고를 수 있다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '요구 더하기' }));
    const 칸 = screen.getByRole('heading', { name: '새 요구' }).parentElement!;
    expect([...칸.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'))).toEqual(['회원가입', '로그인']);
    fireEvent.change(within(칸).getByLabelText('기능 묶음'), { target: { value: '로그인' } });
    fireEvent.change(within(칸).getByLabelText('요구 문장'), { target: { value: '잠긴 계정으로 로그인하면 「계정이 잠겼습니다」가 보인다' } });
    fireEvent.change(within(칸).getByLabelText('자료 이름'), { target: { value: '화면' } });
    fireEvent.change(within(칸).getByLabelText('원본 문장'), { target: { value: '계정이 잠겼습니다' } });
    fireEvent.click(within(칸).getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    const 보낸것 = 저장.mock.calls[0]![2];
    expect(보낸것).toHaveLength(5);
    expect(보낸것[4]).toEqual({
      feature: '로그인',
      text: '잠긴 계정으로 로그인하면 「계정이 잠겼습니다」가 보인다',
      basis: [{ from: '화면', quote: '계정이 잠겼습니다' }],
      status: 'NEEDS_CHECK',
    });
    await vi.waitFor(() => expect(screen.queryByRole('heading', { name: '새 요구' })).toBeNull());
  });

  it('판이 없을 때 요구 더하기를 누르면 빈 화면 대신 새 요구 칸이 열린다', async () => {
    지금.mockResolvedValue(판({ version: 0, items: [], unapplied: { changed: [], added: [], removed: [] }, needsCheck: { count: 0, oldestSince: null } }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '요구 더하기' }));
    expect(screen.getByRole('heading', { name: '새 요구' })).toBeTruthy();
    expect(screen.queryByText('요구 더하기로 첫 요구를 적습니다')).toBeNull();
  });
});

describe('PRD 관리 — 판 이력', () => {
  it('판마다 누가 무엇으로 만들었는지 보이고 지금 판에는 되돌리기가 없다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '판 이력' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    expect(within(줄들[0]!).getByText('한지수 · 사람')).toBeTruthy();
    expect(within(줄들[0]!).getByText('지금 판')).toBeTruthy();
    expect(within(줄들[1]!).getByText('작성 에이전트 · 옮기기')).toBeTruthy();
  });

  it('되돌리기는 한 번 더 묻고, 확인하면 지금 판 번호와 고른 판을 보낸다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '판 이력' }));
    fireEvent.click(await screen.findByRole('button', { name: '이 판으로 되돌리기' }));
    expect(되돌림).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '판 11으로 되돌리기 확인' }));
    await vi.waitFor(() => expect(되돌림).toHaveBeenCalledWith('MKT', 12, 11));
    expect(await screen.findByText('판 13으로 저장했습니다')).toBeTruthy();
  });
});
