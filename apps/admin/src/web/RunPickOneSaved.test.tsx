// @vitest-environment jsdom
// 실행 창 한 건 모드의 권한 칸 · 저장값 · 묶음 저장 (도메인/실행 §8.2, 2026-09-29 시안 A)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError } from './api.js';
import { 그린다, 읽기만, 저장값케이스, 케이스 } from './runPick.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 실행버튼 = () => screen.getByRole('button', { name: '실행' }) as HTMLButtonElement;
const 서버고르기 = (env = 'qa') => fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: env } });
const 줄 = () => screen.getByRole('status');

// 묶음 저장은 케이스 쓰기다. 읽기면 자리가 아예 없다 (화면공통 §8)
describe('한 건 창의 권한 칸', () => {
  it('케이스 쓰기면 묶음 저장이 보인다', async () => {
    await 그린다();
    expect(screen.getByText('이 값을 묶음으로 저장')).toBeTruthy();
  });

  it('케이스 읽기면 묶음 저장도 묶음 이름 칸도 없다', async () => {
    await 그린다(케이스, 읽기만);
    expect(screen.queryByText('이 값을 묶음으로 저장')).toBeNull();
    expect(screen.queryByPlaceholderText('묶음 이름')).toBeNull();
  });

  it('케이스 읽기면 저장값 버튼이 없다', async () => {
    await 그린다(저장값케이스, 읽기만);
    expect(screen.queryByRole('button', { name: '다음에도 이 값으로 채우기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '코드 기본값으로' })).toBeNull();
  });
});

describe('한 건 창의 저장값 (도메인/실행 §8.2, 2026-09-29 시안 A)', () => {
  it('저장값이 있으면 누가 저장했는지가 보인다', async () => {
    await 그린다(저장값케이스);
    expect(screen.getByText(/저장값 · 맥시 ·/)).toBeTruthy();
  });

  it('「다음에도 이 값으로 채우기」는 채운 값을 보내고 비워 둔 저장 비밀값은 안 보낸 뒤 케이스를 다시 읽게 한다', async () => {
    const { on다시읽기 } = await 그린다(저장값케이스);
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'user2' } });
    fireEvent.click(screen.getByRole('button', { name: '다음에도 이 값으로 채우기' }));

    await waitFor(() => expect(on다시읽기).toHaveBeenCalledWith('ZRS-001'));
    expect(저장).toHaveBeenCalledWith('ZRS-001', { params: { userId: 'user2' }, expected: {} });
  });

  it('서버가 400 을 내면 칸 아래에 사유를 붙인다', async () => {
    await 그린다(저장값케이스);
    vi.spyOn(api, 'saveInput').mockRejectedValue(
      new ApiError(400, 'INVALID_PARAMS', '아이디가 틀렸다', [{ path: 'userId', message: '아이디가 틀렸다' }]),
    );

    fireEvent.click(screen.getByRole('button', { name: '다음에도 이 값으로 채우기' }));

    expect(await screen.findByText('아이디가 틀렸다')).toBeTruthy();
    expect(줄().textContent).toBe('입력값이 명세와 맞지 않습니다.');
  });

  it('「코드 기본값으로」는 그 자리에서 한 번 더 확인받고 지운 뒤 다시 읽게 한다', async () => {
    const { on다시읽기 } = await 그린다(저장값케이스);
    const 지우기 = vi.spyOn(api, 'clearInput').mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: '코드 기본값으로' }));
    expect(지우기).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '지우기 확인' }));

    await waitFor(() => expect(on다시읽기).toHaveBeenCalledWith('ZRS-001'));
    expect(지우기).toHaveBeenCalledWith('ZRS-001');
  });

  it('확인에서 취소하면 지우지 않고 버튼이 돌아온다', async () => {
    await 그린다(저장값케이스);
    const 지우기 = vi.spyOn(api, 'clearInput').mockResolvedValue(undefined);

    fireEvent.click(screen.getByRole('button', { name: '코드 기본값으로' }));
    fireEvent.click(within(document.querySelector<HTMLElement>('.one-values')!).getByRole('button', { name: '취소' }));

    expect(지우기).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '코드 기본값으로' })).toBeTruthy();
  });

  it('저장값이 없으면 「코드 기본값으로」가 없다', async () => {
    await 그린다();
    expect(screen.getByRole('button', { name: '다음에도 이 값으로 채우기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '코드 기본값으로' })).toBeNull();
  });

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

describe('묶음 이름이 비었을 때', () => {
  it('이름 칸으로 커서를 보내고 그 칸 옆에 사유를 적는다. 버튼은 살아 있다', async () => {
    await 그린다();
    const 저장 = vi.spyOn(api, 'saveParamSet');
    const 버튼 = screen.getByRole('button', { name: '이 값을 묶음으로 저장' }) as HTMLButtonElement;

    fireEvent.click(버튼);

    expect(버튼.disabled).toBe(false);
    expect(저장).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('묶음 이름'));
    expect(screen.getByText('묶음 이름을 적으세요')).toBeTruthy();
  });

  it('이름을 적기 시작하면 사유가 사라진다', async () => {
    await 그린다();
    fireEvent.click(screen.getByRole('button', { name: '이 값을 묶음으로 저장' }));
    fireEvent.change(screen.getByLabelText('묶음 이름'), { target: { value: '회원' } });
    expect(screen.queryByText('묶음 이름을 적으세요')).toBeNull();
  });
});
