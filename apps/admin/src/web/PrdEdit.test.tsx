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
    { version: 12, source: 'PERSON', savedByName: '한지수', savedAt: '2026-10-09T08:42:00.000Z' },
    { version: 11, source: 'AGENT', savedByName: '작성 에이전트', savedAt: '2026-10-01T00:12:00.000Z' },
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
    fireEvent.click(screen.getByRole('button', { name: '출처 더하기' }));
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
    expect(within(칸).queryByRole('button', { name: '출처 더하기' })).toBeNull();
    expect((within(칸).getByLabelText('상태') as HTMLSelectElement).value).toBe('CONFIRMED');
    fireEvent.change(within(칸).getByLabelText('기능 묶음'), { target: { value: '로그인' } });
    fireEvent.change(within(칸).getByLabelText('요구 문장'), { target: { value: '로그아웃하면 로그인 화면으로 간다' } });
    fireEvent.change(within(칸).getByLabelText('상태'), { target: { value: 'NEEDS_CHECK' } });
    fireEvent.click(within(칸).getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    expect(저장.mock.calls[0]![2][4]).toMatchObject({ status: 'NEEDS_CHECK', basis: [{ from: '직접 작성' }] });
  });

  it('요구사항 추가 칸은 할 일 카드 위에서 열리고 기능 묶음 칸에 커서가 간다 (점검 8.5)', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '요구사항 추가' }));
    const 칸 = screen.getByRole('heading', { name: '새 요구' }).parentElement!;
    const 확인 = screen.getByRole('region', { name: /확인 필요 2건/ });
    expect(칸.compareDocumentPosition(확인) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    지금.mockResolvedValue(판({ version: 0, items: [], unapplied: { changed: [], added: [], removed: [] }, needsCheck: { count: 0, oldestSince: null } }));
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '요구사항 추가' }));
    expect(screen.getByRole('heading', { name: '새 요구' })).toBeTruthy();
    expect(screen.queryByText('테스트 작성 요청으로 기획서를 올리거나, 요구사항 추가로 첫 요구를 직접 적습니다')).toBeNull();
  });
});

describe('PRD 관리 — 버전 기록', () => {
  it('작성 쓰기가 없으면 버전 기록은 보이고 복원은 아예 없다', async () => {
    render(<Prd service="MKT" 할수={() => false} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    expect(await screen.findByText('작성 에이전트 · AI 작성')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /복원/ })).toBeNull();
  });

  it('버전마다 누가 무엇으로 저장했는지 보이고 현재 버전에는 복원이 없다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    expect(within(줄들[0]!).getByText('한지수 · 직접 수정')).toBeTruthy();
    expect(within(줄들[0]!).getByText('현재 버전')).toBeTruthy();
    expect(within(줄들[1]!).getByText('작성 에이전트 · AI 작성')).toBeTruthy();
  });

  it('버전마다 앞 버전과 견준 바뀐 것을 한 줄로 보이고, 누르면 바뀐 요구가 펼쳐진다 (점검 8.8)', async () => {
    한판.mockImplementation((_s, version) =>
      Promise.resolve({ version, items: version === 11 ? [아이디, 아이디칸] : [아이디, { ...아이디칸, text: '아이디 칸에는 12자까지만 들어간다(고침)' }, 잠금] }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    const 요약 = await within(줄들[0]!).findByRole('button', { name: '바뀜 1건 · 새 항목 1건' });
    expect(한판).toHaveBeenCalledWith('MKT', 11);
    expect(한판).toHaveBeenCalledWith('MKT', 12);
    expect(within(줄들[1]!).getByText('처음 버전')).toBeTruthy();
    expect(within(줄들[0]!).queryByRole('list')).toBeNull();
    fireEvent.click(요약);
    const 목록 = within(줄들[0]!).getByRole('list', { name: '버전 12에서 바뀐 요구' });
    const 항목들 = within(목록).getAllByRole('listitem').map((x) => x.textContent);
    expect(항목들).toEqual([
      '바뀜MKT-REQ-032아이디 칸에는 12자까지만 들어간다 → 아이디 칸에는 12자까지만 들어간다(고침)',
      `새 항목MKT-REQ-041${잠금.text}`,
    ]);
  });

  it('상태만 바뀐 요구는 따로 센다', async () => {
    한판.mockImplementation((_s, version) =>
      Promise.resolve({ version, items: [version === 11 ? 아이디칸 : { ...아이디칸, status: 'CONFIRMED' as const }] }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    fireEvent.click(await within(줄들[0]!).findByRole('button', { name: '상태만 바뀜 1건' }));
    expect(within(줄들[0]!).getByText('확정으로 바뀜')).toBeTruthy();
  });

  it('글과 상태를 한 번에 고친 요구는 상태도 같이 적는다', async () => {
    한판.mockImplementation((_s, version) =>
      Promise.resolve({ version, items: [version === 11 ? 아이디칸 : { ...아이디칸, text: '고친 문장', status: 'CONFIRMED' as const }] }),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    fireEvent.click(await within(줄들[0]!).findByRole('button', { name: '바뀜 1건' }));
    expect(within(줄들[0]!).getByRole('listitem').textContent).toContain('고친 문장 · 확정으로 바뀜');
  });

  it('최근 열 개 밖의 버전은 누를 때만 읽는다', async () => {
    판들.mockResolvedValue(
      Array.from({ length: 12 }, (_, i): PrdVersionRow => ({ version: 12 - i, source: 'PERSON', savedByName: '한지수', savedAt: '2026-10-09T08:42:00.000Z' })),
    );
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    const 줄들 = (await screen.findAllByRole('row')).slice(1);
    expect(줄들).toHaveLength(12);
    await within(줄들[0]!).findByRole('button', { name: '바뀜 1건' });
    const 열한째 = within(줄들[10]!).getByRole('button', { name: '바뀐 것 보기' });
    const 읽은 = 한판.mock.calls.length;
    fireEvent.click(열한째);
    await within(줄들[10]!).findByRole('button', { name: '바뀜 1건' });
    expect(within(줄들[11]!).getByText('처음 버전')).toBeTruthy();
    // 버전 2 는 앞 줄이 이미 읽어 다시 부르지 않고, 처음 버전 1 만 새로 읽는다
    expect(한판.mock.calls.length).toBe(읽은 + 1);
    expect(한판).toHaveBeenLastCalledWith('MKT', 1);
  });

  it('복원은 한 번 더 묻고, 확인하면 현재 버전 번호와 고른 버전을 보낸다', async () => {
    render(<Prd service="MKT" 할수={쓰는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: '버전 기록' }));
    fireEvent.click(await screen.findByRole('button', { name: '이 버전으로 복원' }));
    expect(되돌림).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '버전 11 복원 확인' }));
    await vi.waitFor(() => expect(되돌림).toHaveBeenCalledWith('MKT', 12, 11));
    expect(await screen.findByText('저장했습니다 (버전 13)')).toBeTruthy();
  });
});
