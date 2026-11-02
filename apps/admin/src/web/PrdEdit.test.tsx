// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { PrdItem } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { Prd } from './Prd.js';
import { 판, 아이디, 아이디칸, 잠금 } from './prd.fixture.js';
import type { PrdItemDraft, PrdNow, PrdVersionRow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금, 저장, 판들, 되돌림, 한판 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  저장: vi.fn((_s: string, _base: number, _items: PrdItemDraft[]) => Promise.resolve({ version: 13 })),
  판들: vi.fn((_s: string): Promise<PrdVersionRow[]> => Promise.resolve([])),
  되돌림: vi.fn((_s: string, _base: number, _to: number) => Promise.resolve({ version: 13 })),
  한판: vi.fn((_s: string, _v: number): Promise<{ version: number; items: PrdItem[] }> => Promise.reject(new Error('옛 버전을 정하지 않았다'))),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, save: 저장, versions: 판들, revert: 되돌림, version: 한판, apis: () => Promise.resolve({ apis: [] }) } }));

const 쓰는사람: 판정 = () => true;

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(판());
  저장.mockClear();
  판들.mockReset();
  판들.mockResolvedValue([
    { version: 12, source: 'PERSON', savedByName: '한지수', savedAt: '2026-10-09T08:42:00.000Z', requestId: null, fromDecision: false, changes: null },
    { version: 11, source: 'AGENT', savedByName: '작성 에이전트', savedAt: '2026-10-01T00:12:00.000Z', requestId: 14681, fromDecision: false, changes: null },
  ]);
  되돌림.mockClear();
  // 버전마다 첫 요구의 문장이 달라 앞 버전과 견주면 늘 「바뀜 1건」이다
  한판.mockReset();
  한판.mockImplementation((_s, version) => Promise.resolve({ version, items: [{ ...아이디, text: `문장 ${version}` }] }));
});

afterEach(() => cleanup());

async function 펴서고치기(묶음: RegExp, 번호: RegExp) {
  render(<Prd service="MKT" 할수={쓰는사람} />);
  fireEvent.click(await screen.findByRole('button', { name: 묶음 }));
  fireEvent.click(screen.getByRole('button', { name: 번호 }));
  fireEvent.click(screen.getByRole('button', { name: '고치기' }));
}

describe('PRD 관리 — 쓴 것을 버리기 전에 묻기 (점검 8.4)', () => {
  it('고치던 줄에 쓴 것이 있으면 다른 줄 고치기 · 그 묶음 접기도 묻고, 찾기 글자는 그 줄을 걸러 내지 않는다', async () => {
    await 펴서고치기(/회원가입/, /MKT-REQ-031/);
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '쓰다 만 글' } });

    fireEvent.click(screen.getByRole('button', { name: /^회원가입/ }));
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '머무르기' }));

    fireEvent.change(screen.getByRole('textbox', { name: '요구 문장 · 번호 검색' }), { target: { value: '잠긴다' } });
    expect((screen.getByLabelText('요구 문장') as HTMLTextAreaElement).value).toBe('쓰다 만 글');

    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-041/ }));
    fireEvent.click(screen.getByRole('button', { name: '고치기' }));
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 떠나기' }));
    expect(screen.getAllByLabelText('요구 문장')).toHaveLength(1);
  });

  it('찾기로 펴진 묶음에서 고치다 찾기 글자를 지워도 그 묶음은 펴진 채 쓴 글이 남는다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    const 찾기 = await screen.findByRole('textbox', { name: '요구 문장 · 번호 검색' });
    fireEvent.change(찾기, { target: { value: '잠긴다' } });
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-041/ }));
    fireEvent.click(screen.getByRole('button', { name: '고치기' }));
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '쓰다 만 글' } });

    fireEvent.change(찾기, { target: { value: '' } });
    expect((screen.getByLabelText('요구 문장') as HTMLTextAreaElement).value).toBe('쓰다 만 글');
    expect(screen.getByRole('button', { name: /^로그인/ }).getAttribute('aria-expanded')).toBe('true');
  });

  it('안 고친 줄은 다른 줄을 고치기 시작해도 묻지 않는다', async () => {
    await 펴서고치기(/회원가입/, /MKT-REQ-031/);
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-032/ }));
    fireEvent.click(screen.getByRole('button', { name: '고치기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

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
    expect(await screen.findByText('저장했습니다 (버전 13)')).toBeTruthy();
    await vi.waitFor(() => expect(screen.queryByLabelText('요구 문장')).toBeNull());
  });

  it('요구 문장을 고쳐 저장하면 그 줄 아래에 결정 필요로 가는 고리가 한 번 뜬다', async () => {
    await 펴서고치기(/회원가입/, /MKT-REQ-031/);
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '아이디는 영문 소문자·숫자 4~14자이다' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const 고리 = await screen.findByRole('link', { name: '테스트 작성 › 결정 필요에서 테스트를 다시 만들 수 있어요 →' });
    expect(고리.getAttribute('href')).toBe('#/authoring?todo=1');
    expect(고리.closest('.prd-item')?.id).toBe('prd-item-MKT-REQ-031');
    expect(screen.getAllByRole('link', { name: /테스트를 다시 만들 수 있어요/ })).toHaveLength(1);
  });

  it('상태만 바꾸거나 지우는 저장에는 고리가 안 뜬다', async () => {
    await 펴서고치기(/회원가입/, /MKT-REQ-032/);
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('저장했습니다 (버전 13)');
    await vi.waitFor(() => expect(screen.queryByLabelText('요구 문장')).toBeNull());
    expect(screen.queryByRole('link', { name: /테스트를 다시 만들 수 있어요/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '고치기' }));
    fireEvent.click(screen.getByRole('button', { name: '이 요구 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('link', { name: /테스트를 다시 만들 수 있어요/ })).toBeNull();
  });

  it('저장이 실패하면 고리가 안 뜬다', async () => {
    저장.mockRejectedValueOnce(new ApiError(409, 'PRD_STALE', ''));
    await 펴서고치기(/회원가입/, /MKT-REQ-031/);
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '고치다 만 글' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('alert');
    expect(screen.queryByRole('link', { name: /테스트를 다시 만들 수 있어요/ })).toBeNull();
  });

  it('고치던 줄을 접으면 먼저 묻고, 버리고 접은 뒤 다시 펴면 고치기 전 모습이다', async () => {
    await 펴서고치기(/회원가입/, /MKT-REQ-031/);
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '버릴 글' } });
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '머무르기' }));
    expect((screen.getByLabelText('요구 문장') as HTMLTextAreaElement).value).toBe('버릴 글');
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 떠나기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    expect(screen.queryByLabelText('요구 문장')).toBeNull();
    expect(screen.getByRole('button', { name: '고치기' })).toBeTruthy();
    expect(저장).not.toHaveBeenCalled();
  });

  it('빈 칸은 보내지 않고 어느 칸인지 말한다', async () => {
    await 펴서고치기(/회원가입/, /MKT-REQ-031/);
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('요구 문장을 적습니다')).toBeTruthy();
    expect(저장).not.toHaveBeenCalled();
  });

  it('출처를 더하고 빼며, 비운 원본 번호는 키째 빼고 보낸다', async () => {
    await 펴서고치기(/로그인/, /MKT-REQ-041/);
    fireEvent.click(screen.getByRole('button', { name: '출처 추가' }));
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
    fireEvent.click(screen.getByRole('button', { name: '이 요구 삭제' }));
    expect(저장).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    expect(저장.mock.calls[0]![2].map((x) => x.reqId)).toEqual([아이디.reqId, 아이디칸.reqId, 잠금.reqId]);
  });

  it('요구사항 추가는 번호 없이 맨 뒤에 붙이고, 기능 묶음은 지금 판의 것을 고를 수 있다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '요구사항 추가' }));
    const 칸 = screen.getByRole('heading', { name: '새 요구' }).parentElement!;
    expect([...칸.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'))).toEqual(['회원가입', '로그인']);
    fireEvent.change(within(칸).getByLabelText('기능 묶음'), { target: { value: '로그인' } });
    fireEvent.change(within(칸).getByLabelText('요구 문장'), { target: { value: '잠긴 계정으로 로그인하면 「계정이 잠겼습니다」가 보인다' } });
    fireEvent.click(within(칸).getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    const 보낸것 = 저장.mock.calls[0]![2];
    expect(보낸것).toHaveLength(5);
    expect(보낸것[4]).toEqual({
      feature: '로그인',
      text: '잠긴 계정으로 로그인하면 「계정이 잠겼습니다」가 보인다',
      basis: [{ from: '직접 작성', quote: '잠긴 계정으로 로그인하면 「계정이 잠겼습니다」가 보인다' }],
      status: 'CONFIRMED',
    });
    await vi.waitFor(() => expect(screen.queryByRole('heading', { name: '새 요구' })).toBeNull());
  });

  it('새 요구에는 출처 칸이 없고 상태는 확정으로 시작하며, 확인 필요로 바꿔 저장할 수 있다 (점검 8.11)', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '요구사항 추가' }));
    const 칸 = screen.getByRole('heading', { name: '새 요구' }).parentElement!;
    expect(within(칸).queryByLabelText('자료 이름')).toBeNull();
    expect(within(칸).queryByRole('button', { name: '출처 추가' })).toBeNull();
    expect((within(칸).getByLabelText('상태') as HTMLSelectElement).value).toBe('CONFIRMED');
    fireEvent.change(within(칸).getByLabelText('기능 묶음'), { target: { value: '로그인' } });
    fireEvent.change(within(칸).getByLabelText('요구 문장'), { target: { value: '로그아웃하면 로그인 화면으로 간다' } });
    fireEvent.change(within(칸).getByLabelText('상태'), { target: { value: 'NEEDS_CHECK' } });
    fireEvent.click(within(칸).getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    expect(저장.mock.calls[0]![2][4]).toMatchObject({ status: 'NEEDS_CHECK', basis: [{ from: '직접 작성' }] });
  });

  it('요구사항 추가 칸은 전체 요구 위에서 열리고 기능 묶음 칸에 커서가 간다 (점검 8.5)', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '요구사항 추가' }));
    const 칸 = screen.getByRole('heading', { name: '새 요구' }).parentElement!;
    const 전체 = screen.getByRole('region', { name: '전체 요구' });
    expect(칸.compareDocumentPosition(전체) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.activeElement).toBe(within(칸).getByLabelText('기능 묶음'));
  });

  it('저장이 실패하면 고치던 칸 옆에 까닭을 띄우고 쓴 글은 그대로 둔다 (점검 8.3)', async () => {
    저장.mockRejectedValueOnce(new ApiError(409, 'PRD_STALE', ''));
    await 펴서고치기(/회원가입/, /MKT-REQ-032/);
    fireEvent.change(screen.getByLabelText('요구 문장'), { target: { value: '고치던 글' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const 칸 = screen.getByLabelText('요구 문장').closest('form')!;
    expect((await within(칸).findByRole('alert')).textContent).toBe('다른 사람이 먼저 PRD 를 바꿨습니다. 최신 버전을 불러왔으니 확인하고 다시 합니다');
    expect((screen.getByLabelText('요구 문장') as HTMLTextAreaElement).value).toBe('고치던 글');
    // 다시 저장을 시작하면 지난 실패 글은 지워진다
    저장.mockResolvedValueOnce({ version: 14 });
    // 판을 다시 읽는 동안은 저장 단추가 잠겨 있다
    await vi.waitFor(() => expect((within(칸).getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(within(칸).getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(within(칸).queryByRole('alert')).toBeNull());
  });

  it('판이 없을 때 요구사항 추가를 누르면 빈 화면 대신 새 요구 칸이 열린다', async () => {
    지금.mockResolvedValue(판({ version: 0, items: [] }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '요구사항 추가' }));
    expect(screen.getByRole('heading', { name: '새 요구' })).toBeTruthy();
    expect(screen.queryByText('테스트 작성 요청으로 기획서를 올리거나, 요구사항 추가로 첫 요구를 직접 적습니다')).toBeNull();
  });
});
