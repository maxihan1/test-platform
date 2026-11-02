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

describe('Device VISION 토큰 창', () => {
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
    fireEvent.click(screen.getByRole('button', { name: '바꾸기' }));
    expect((await screen.findByRole('alert')).textContent).toBe('다른 사람의 토큰입니다 — 내 계정에서 발급한 토큰만 넣을 수 있습니다');
    expect(screen.getByText('넣음 (…abcd)')).toBeTruthy();
  });

  it('처음 읽기가 실패하면 불러오는 중으로 남지 않고 까닭을 띄운다', async () => {
    vi.spyOn(api, 'farmToken').mockRejectedValue(new Error('끊김'));
    render(<FarmToken onClose={() => undefined} />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('불러오는 중입니다')).toBeNull();
  });

  it('넣은 토큰이 있으면 저장 전에 창 안 줄로 묻고, 「아니오」면 서버를 부르지 않는다', async () => {
    vi.spyOn(api, 'farmToken').mockResolvedValue({ farmToken: { last4: 'abcd' } });
    const 저장 = vi.spyOn(api, 'setFarmToken').mockResolvedValue({ farmToken: { last4: '5678' } });
    render(<FarmToken onClose={() => undefined} />);
    await screen.findByText('넣음 (…abcd)');

    붙여넣고저장('pat_mine5678');
    expect(screen.getByText('지금 토큰(…abcd)을 버리고 새 토큰으로 바꿀까요?')).toBeTruthy();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '아니오' }));
    expect(screen.queryByText(/바꿀까요/)).toBeNull();
    expect(저장).not.toHaveBeenCalled();

    붙여넣고저장('pat_mine5678');
    fireEvent.click(screen.getByRole('button', { name: '바꾸기' }));
    expect(await screen.findByText('넣음 (…5678)')).toBeTruthy();
    expect(저장).toHaveBeenCalledWith('pat_mine5678');
    expect(screen.queryByText(/바꿀까요/)).toBeNull();
  });

  it('묻는 동안 토큰을 다시 고치면 묻는 줄을 거둔다', async () => {
    vi.spyOn(api, 'farmToken').mockResolvedValue({ farmToken: { last4: 'abcd' } });
    render(<FarmToken onClose={() => undefined} />);
    await screen.findByText('넣음 (…abcd)');

    붙여넣고저장('pat_mine5678');
    fireEvent.change(screen.getByLabelText('새 토큰'), { target: { value: 'pat_mine9999' } });
    expect(screen.queryByText(/바꿀까요/)).toBeNull();
  });

  it('토큰 지우기는 창 안 줄로 한 번 묻고, 확인하면 서버 토큰으로 돌아간다', async () => {
    vi.spyOn(api, 'farmToken').mockResolvedValue({ farmToken: { last4: 'abcd' } });
    const 지우기 = vi.spyOn(api, 'deleteFarmToken').mockResolvedValue(undefined);
    render(<FarmToken onClose={() => undefined} />);

    fireEvent.click(await screen.findByRole('button', { name: '토큰 지우기' }));
    expect(지우기).not.toHaveBeenCalled();
    expect(screen.getByText('지금 토큰(…abcd)을 지울까요? 지우면 서버 토큰으로 빌립니다')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '토큰 지우기' })[1]!);
    await waitFor(() => expect(screen.getByText('없음 — 서버 토큰으로 빌립니다')).toBeTruthy());
    expect(지우기).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: '토큰 지우기' })).toBeNull();
  });
});
