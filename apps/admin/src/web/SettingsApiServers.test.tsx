// @vitest-environment jsdom
// 설정 프로젝트의 API 서버 구획 — 호스트 목록 · 이름 붙이기 · 바뀐 줄만 저장 (도메인/인증 §8.8 「프로젝트」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type SettingsApiServer } from './api.js';
import { ApiServers } from './SettingsApiServers.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 줄들: SettingsApiServer[] = [
  { host: 'auth.demomarket.kr', name: '인증', cases: 12 },
  { host: 'pay.demomarket.kr', name: null, cases: 8 },
  { host: 'cdn.demomarket.kr', name: null, cases: 31 },
];

function 그리기(받을것: SettingsApiServer[] = 줄들) {
  const 읽기 = vi.spyOn(api, 'projectApiServers').mockResolvedValue({ items: 받을것 });
  render(<ApiServers 프로젝트={5} />);
  return 읽기;
}

describe('API 서버 구획', () => {
  it('호스트마다 케이스 수와 이름 칸이 선다 — 이름이 없으면 「이름 없음」이 흐리게 보인다', async () => {
    const 읽기 = 그리기();
    expect(await screen.findByText('auth.demomarket.kr')).toBeTruthy();
    expect(읽기).toHaveBeenCalledWith(5);
    expect(screen.getByText('케이스 12개')).toBeTruthy();
    expect((screen.getByLabelText('auth.demomarket.kr 이름') as HTMLInputElement).value).toBe('인증');
    const 빈칸 = screen.getByLabelText('pay.demomarket.kr 이름') as HTMLInputElement;
    expect(빈칸.value).toBe('');
    expect(빈칸.placeholder).toBe('이름 없음');
  });

  it('안 고쳤으면 저장 단추가 막혀 있다', async () => {
    그리기();
    await screen.findByText('auth.demomarket.kr');
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('고친 줄만 앞뒤 공백을 떼고 보낸다 — 비운 줄은 빈 이름(지우기)으로 보내고, 저장하면 다시 읽는다', async () => {
    const 읽기 = 그리기();
    const 저장 = vi.spyOn(api, 'saveProjectApiServers').mockResolvedValue({ ok: true });
    await screen.findByText('auth.demomarket.kr');

    fireEvent.change(screen.getByLabelText('pay.demomarket.kr 이름'), { target: { value: ' 결제 ' } });
    fireEvent.change(screen.getByLabelText('auth.demomarket.kr 이름'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
    expect(저장).toHaveBeenCalledWith(5, [
      { host: 'auth.demomarket.kr', name: '' },
      { host: 'pay.demomarket.kr', name: '결제' },
    ]);
    await waitFor(() => expect(읽기).toHaveBeenCalledTimes(2));
  });

  it('공백만 넣고 원래도 이름이 없으면 바뀐 것이 아니다', async () => {
    그리기();
    await screen.findByText('auth.demomarket.kr');
    fireEvent.change(screen.getByLabelText('cdn.demomarket.kr 이름'), { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('호스트가 하나도 없으면 안내를 말한다 — 주소를 직접 더하는 칸은 없다', async () => {
    그리기([]);
    expect(await screen.findByText('케이스를 실행하면 부른 서버가 여기 뜹니다')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('서버가 거절하면 사람 말로 보이고 고친 값은 그대로 둔다', async () => {
    그리기();
    vi.spyOn(api, 'saveProjectApiServers').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', '요청이 실패했다'));
    await screen.findByText('auth.demomarket.kr');
    fireEvent.change(screen.getByLabelText('pay.demomarket.kr 이름'), { target: { value: '결제' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText(/형식이 맞지 않는 것이 있습니다/)).toBeTruthy();
    expect((screen.getByLabelText('pay.demomarket.kr 이름') as HTMLInputElement).value).toBe('결제');
  });
});
