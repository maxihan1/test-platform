// @vitest-environment jsdom
// 실행 창 한 건 모드의 「저장한 값」 줄 — 권한 · 목록 고르기 · 저장 · 저장값 지우기 (도메인/실행 §8.2, 2026-10-19 ⑫ 여섯 조작을 하나로)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError, type ParamSetRow } from './api.js';
import { 그린다, 읽기만, 저장값케이스, 케이스, 값케이스 } from './runPick.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 실행버튼 = () => screen.getByRole('button', { name: '실행' }) as HTMLButtonElement;
const 서버고르기 = (env = 'qa') => fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: env } });
const 줄 = () => screen.getByRole('status');
const 목록 = () => screen.getByLabelText('저장한 값') as HTMLSelectElement;
const 아이디 = () => (screen.getByLabelText('아이디') as HTMLInputElement).value;
const 저장열기 = () => fireEvent.click(screen.getByRole('button', { name: '이 값을 저장' }));
const 저장누름 = () => fireEvent.click(screen.getByRole('button', { name: '저장' }));

const 회원묶음: ParamSetRow = {
  id: 7,
  tcId: 'ZRS-001',
  name: '회원',
  params: { userId: 'bundle', password: 'pw' },
  expected: {},
  createdAt: '2026-09-29T05:02:00.000Z',
};

describe('한 건 창의 권한 칸', () => {
  it('케이스 쓰기면 「이 값을 저장」이 보인다', async () => {
    await 그린다(값케이스);
    expect(screen.getByRole('button', { name: '이 값을 저장' })).toBeTruthy();
  });

  it('케이스 읽기면 저장 단추도 저장값 지우기도 없고 목록은 그대로 쓴다', async () => {
    await 그린다(저장값케이스, 읽기만);
    expect(screen.queryByRole('button', { name: '이 값을 저장' })).toBeNull();
    expect(screen.queryByRole('button', { name: '저장값 지우기' })).toBeNull();
    expect(목록().value).toBe('saved');
  });

  it('입력값이 하나도 없는 케이스는 저장 관련 칸을 아예 그리지 않는다', async () => {
    await 그린다(케이스);
    expect(screen.queryByLabelText('저장한 값')).toBeNull();
    expect(screen.queryByRole('button', { name: '이 값을 저장' })).toBeNull();
    expect(screen.queryByPlaceholderText('묶음 이름')).toBeNull();
    expect(screen.getByText('선언된 입력값이 없습니다. 그대로 실행됩니다')).toBeTruthy();
  });
});

describe('저장한 값 목록', () => {
  it('저장값이 있으면 처음 선택이 저장값이고 누가 저장했는지가 보인다', async () => {
    await 그린다(저장값케이스);
    expect(목록().value).toBe('saved');
    expect(within(목록()).getByText(/저장값 · 맥시 ·/)).toBeTruthy();
    expect(아이디()).toBe('user1');
  });

  it('저장값도 묶음도 없으면 목록 없이 저장 단추만 있다', async () => {
    await 그린다(값케이스);
    expect(screen.queryByLabelText('저장한 값')).toBeNull();
    expect(아이디()).toBe('guest');
  });

  it('「코드 기본값」을 고르면 칸이 코드 기본값으로 돌아간다', async () => {
    await 그린다(저장값케이스);
    fireEvent.change(목록(), { target: { value: 'code' } });
    expect(아이디()).toBe('guest');
  });

  it('저장값을 다시 고르면 칸이 저장값으로 채워진다', async () => {
    await 그린다(저장값케이스);
    fireEvent.change(목록(), { target: { value: 'code' } });
    fireEvent.change(목록(), { target: { value: 'saved' } });
    expect(아이디()).toBe('user1');
  });

  it('묶음을 고르면 칸이 묶음 값으로 채워진다', async () => {
    await 그린다(값케이스, undefined, { 묶음: [회원묶음] });
    expect(within(목록()).getByText('회원')).toBeTruthy();

    fireEvent.change(목록(), { target: { value: 'set:7' } });

    expect(아이디()).toBe('bundle');
  });

  it('묶음 값으로 채운 채 실행하면 그 값이 간다', async () => {
    const { onRun } = await 그린다(값케이스, undefined, { 묶음: [회원묶음] });
    서버고르기();
    fireEvent.change(목록(), { target: { value: 'set:7' } });
    fireEvent.click(실행버튼());

    expect(onRun.mock.calls[0]?.[0].items[0]?.params).toEqual({ userId: 'bundle', password: 'pw' });
  });
});

describe('「이 값을 저장」', () => {
  it('누르기 전에는 묶음 이름 칸이 없고 누르면 한 줄 입력이 나온다', async () => {
    await 그린다(값케이스);
    expect(screen.queryByLabelText('묶음 이름')).toBeNull();

    저장열기();

    expect(screen.getByLabelText('묶음 이름')).toBeTruthy();
  });

  it('이름을 비우고 저장하면 저장값으로 저장하고 케이스를 다시 읽게 한다. 비워 둔 저장 비밀값은 안 보낸다', async () => {
    const { on다시읽기 } = await 그린다(저장값케이스);
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    const 묶음저장 = vi.spyOn(api, 'saveParamSet');

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'user2' } });
    저장열기();
    저장누름();

    await waitFor(() => expect(on다시읽기).toHaveBeenCalledWith('ZRS-001'));
    expect(저장).toHaveBeenCalledWith('ZRS-001', { params: { userId: 'user2' }, expected: {} });
    expect(묶음저장).not.toHaveBeenCalled();
    expect(screen.getByText('저장값으로 저장했습니다.')).toBeTruthy();
  });

  it('이름을 적으면 묶음으로 저장하고 저장값은 건드리지 않는다', async () => {
    const { on다시읽기 } = await 그린다(값케이스);
    const 묶음저장 = vi.spyOn(api, 'saveParamSet').mockResolvedValue(회원묶음);
    const 저장 = vi.spyOn(api, 'saveInput');

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'user2' } });
    저장열기();
    fireEvent.change(screen.getByLabelText('묶음 이름'), { target: { value: ' 회원 ' } });
    저장누름();

    await waitFor(() => expect(screen.getByText("'회원'으로 저장했습니다.")).toBeTruthy());
    expect(묶음저장).toHaveBeenCalledWith('ZRS-001', { name: '회원', params: { userId: 'user2' }, expected: {} });
    expect(저장).not.toHaveBeenCalled();
    expect(on다시읽기).not.toHaveBeenCalled();
  });

  it('이름이 비어 있으면 팀 모두가 쓰는 값이 바뀐다고, 이름을 적으면 따로 저장한다고 곁에 적는다', async () => {
    await 그린다(값케이스);
    저장열기();
    expect(screen.getByText(/팀 모두와 정기 실행에 쓰입니다/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('묶음 이름'), { target: { value: '회원' } });

    expect(screen.getByText('이 이름의 묶음으로 따로 저장합니다')).toBeTruthy();
    expect(screen.queryByText(/팀 모두와 정기 실행에 쓰입니다/)).toBeNull();
  });

  it('서버가 400 을 내면 칸 아래에 사유를 붙인다', async () => {
    await 그린다(저장값케이스);
    vi.spyOn(api, 'saveInput').mockRejectedValue(
      new ApiError(400, 'INVALID_PARAMS', '아이디가 틀렸다', [{ path: 'userId', message: '아이디가 틀렸다' }]),
    );

    저장열기();
    저장누름();

    expect(await screen.findByText('아이디가 틀렸다')).toBeTruthy();
    expect(줄().textContent).toBe('입력값이 명세와 맞지 않습니다.');
  });
});

describe('「저장값 지우기」', () => {
  it('그 자리에서 한 번 더 확인받고 지운 뒤 다시 읽게 한다', async () => {
    const { on다시읽기 } = await 그린다(저장값케이스);
    const 지우기 = vi.spyOn(api, 'clearInput').mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: '저장값 지우기' }));
    expect(지우기).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '지우기 확인' }));

    await waitFor(() => expect(on다시읽기).toHaveBeenCalledWith('ZRS-001'));
    expect(지우기).toHaveBeenCalledWith('ZRS-001');
  });

  it('확인에서 취소하면 지우지 않고 버튼이 돌아온다', async () => {
    await 그린다(저장값케이스);
    const 지우기 = vi.spyOn(api, 'clearInput').mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: '저장값 지우기' }));
    fireEvent.click(within(document.querySelector<HTMLElement>('.one-values')!).getByRole('button', { name: '취소' }));

    expect(지우기).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '저장값 지우기' })).toBeTruthy();
  });

  it('저장값이 없으면 지우기 단추가 없다', async () => {
    await 그린다(값케이스);
    expect(screen.getByRole('button', { name: '이 값을 저장' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '저장값 지우기' })).toBeNull();
  });
});

describe('저장값과 실행', () => {
  it('반드시 채울 비밀값 칸에 저장값이 있으면 비워 둔 채 실행해도 막지 않고 그 칸을 빼고 보낸다', async () => {
    const { onRun } = await 그린다({
      ...저장값케이스,
      paramSchema: { ...저장값케이스.paramSchema, required: ['password'] },
    });
    서버고르기();

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'user2' } });
    fireEvent.click(실행버튼());

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0]?.[0].items[0]?.params).toEqual({ userId: 'user2' });
  });
});
