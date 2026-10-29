// @vitest-environment jsdom
// 계정 메뉴 「디바이스 팜 토큰」 창 검사 (SPEC 도메인/인증 §8.6). 원문은 화면에 안 내려오고 끝 4자만 보인다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError } from './api.js';
import { FarmToken } from './FarmToken.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 붙여넣고저장 = (값: string) => {
  fireEvent.change(screen.getByLabelText('새 토큰'), { target: { value: 값 } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
};

describe('디바이스 팜 토큰 창', () => {
  it('안 넣었으면 서버 토큰으로 빌린다고 알리고, 저장하면 끝 4자를 보이며 칸을 비운다', async () => {
    vi.spyOn(api, 'farmToken').mockResolvedValue({ farmToken: null });
    const 저장 = vi.spyOn(api, 'setFarmToken').mockResolvedValue({ farmToken: { last4: '1234' } });
    render(<FarmToken onClose={() => undefined} />);

    expect(await screen.findByText('없음 — 서버 토큰으로 빌립니다')).toBeTruthy();
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);

    붙여넣고저장('pat_mine1234');
    expect(await screen.findByText('넣음 (…1234)')).toBeTruthy();
    expect(저장).toHaveBeenCalledWith('pat_mine1234');
    expect((screen.getByLabelText('새 토큰') as HTMLInputElement).value).toBe('');
  });

  it('남의 토큰이면 서버 코드 대신 사람 말로 까닭을 띄우고 지금 상태는 그대로 둔다', async () => {
    vi.spyOn(api, 'farmToken').mockResolvedValue({ farmToken: { last4: 'abcd' } });
    vi.spyOn(api, 'setFarmToken').mockRejectedValue(new ApiError(400, 'FARM_TOKEN_NOT_YOURS', ''));
    render(<FarmToken onClose={() => undefined} />);
    await screen.findByText('넣음 (…abcd)');

    붙여넣고저장('pat_other5678');
    expect((await screen.findByRole('alert')).textContent).toBe('다른 사람의 토큰입니다 — 내 계정에서 발급한 토큰만 넣을 수 있습니다');
    expect(screen.getByText('넣음 (…abcd)')).toBeTruthy();
  });

  it('토큰 지우기를 누르면 서버 토큰으로 돌아간다', async () => {
    vi.spyOn(api, 'farmToken').mockResolvedValue({ farmToken: { last4: 'abcd' } });
    const 지우기 = vi.spyOn(api, 'deleteFarmToken').mockResolvedValue(undefined);
    render(<FarmToken onClose={() => undefined} />);

    fireEvent.click(await screen.findByRole('button', { name: '토큰 지우기' }));
    await waitFor(() => expect(screen.getByText('없음 — 서버 토큰으로 빌립니다')).toBeTruthy());
    expect(지우기).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: '토큰 지우기' })).toBeNull();
  });
});
