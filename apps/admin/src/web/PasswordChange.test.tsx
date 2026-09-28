// @vitest-environment jsdom
// 비밀번호 변경 화면 검사 (SPEC 도메인/인증 §8.6 「비밀번호 변경 화면」).
// 변경 강제일 때는 이 화면만 보인다 — 빠져나갈 길은 로그아웃 하나다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type User } from './api.js';
import { PasswordChange } from './PasswordChange.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 바꾼사람: User = {
  username: 'admin',
  displayName: '관리자',
  role: 'admin',
  dashboard: 'read',
  mustChangePassword: false,
  services: [],
};

function 그리기(강제 = false, onDone: (user: User) => void = () => undefined, onLogout: () => void = () => undefined) {
  render(<PasswordChange 강제={강제} onDone={onDone} onLogout={onLogout} />);
}

function 채운다(값: { 지금?: string; 새것?: string; 확인?: string }) {
  fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 값.지금 ?? 'admin' } });
  fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 값.새것 ?? 'longpass1' } });
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
    target: { value: 값.확인 ?? 값.새것 ?? 'longpass1' },
  });
  fireEvent.submit(screen.getByRole('button', { name: '비밀번호 바꾸기' }));
}

describe('비밀번호 변경 화면', () => {
  it('칸은 셋이고 모두 가려서 받는다', () => {
    그리기();

    expect(screen.getByLabelText('현재 비밀번호').getAttribute('autocomplete')).toBe('current-password');
    expect(screen.getByLabelText('새 비밀번호').getAttribute('autocomplete')).toBe('new-password');
    expect(screen.getByLabelText('새 비밀번호 확인').getAttribute('autocomplete')).toBe('new-password');
    for (const 라벨 of ['현재 비밀번호', '새 비밀번호', '새 비밀번호 확인']) {
      expect(screen.getByLabelText(라벨).getAttribute('type')).toBe('password');
    }
  });

  it('변경 강제면 머리에 까닭을 적고 로그아웃만 둔다', () => {
    const 나감 = vi.fn();
    그리기(true, () => undefined, 나감);

    expect(screen.getByText('처음 받은 비밀번호를 바꿔야 계속할 수 있습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(나감).toHaveBeenCalled();
  });

  it('스스로 바꿀 때는 강제 문구가 없다', () => {
    그리기(false);

    expect(screen.queryByText('처음 받은 비밀번호를 바꿔야 계속할 수 있습니다')).toBeNull();
  });

  it('새 비밀번호 두 칸이 다르면 보내지 않는다', () => {
    const 보냄 = vi.spyOn(api, 'changePassword');
    그리기();
    채운다({ 새것: 'longpass1', 확인: 'longpass2' });

    expect(screen.getByText('두 비밀번호가 다릅니다')).toBeTruthy();
    expect(보냄).not.toHaveBeenCalled();
  });

  it('8자 미만이면 보내지 않는다', () => {
    const 보냄 = vi.spyOn(api, 'changePassword');
    그리기();
    채운다({ 새것: 'short1' });

    expect(screen.getByText('비밀번호는 8자 이상입니다')).toBeTruthy();
    expect(보냄).not.toHaveBeenCalled();
  });

  it('현재 비밀번호가 비면 보내지 않는다', () => {
    const 보냄 = vi.spyOn(api, 'changePassword');
    그리기();
    채운다({ 지금: '' });

    expect(screen.getByText('현재 비밀번호를 채웁니다')).toBeTruthy();
    expect(보냄).not.toHaveBeenCalled();
  });

  it.each([
    ['INVALID_CREDENTIALS', '현재 비밀번호가 맞지 않습니다'],
    ['PASSWORD_SAME', '지금 비밀번호와 다른 값을 넣습니다'],
    ['PASSWORD_SHORT', '비밀번호는 8자 이상입니다'],
  ])('서버가 %s 로 거절하면 사람 말로 옮긴다', async (코드, 문장) => {
    vi.spyOn(api, 'changePassword').mockRejectedValue(new ApiError(400, 코드, ''));
    그리기();
    채운다({});

    expect(await screen.findByText(문장)).toBeTruthy();
  });

  it('바꾸면 나를 다시 읽어 넘긴다 — 변경 강제가 풀린 것을 화면이 알아야 한다', async () => {
    const 보냄 = vi.spyOn(api, 'changePassword').mockResolvedValue(undefined);
    vi.spyOn(api, 'me').mockResolvedValue({ user: 바꾼사람 });
    const 끝 = vi.fn();
    그리기(true, 끝);
    채운다({});

    await waitFor(() => expect(끝).toHaveBeenCalledWith(바꾼사람));
    expect(보냄).toHaveBeenCalledWith({ currentPassword: 'admin', newPassword: 'longpass1' });
  });
});
