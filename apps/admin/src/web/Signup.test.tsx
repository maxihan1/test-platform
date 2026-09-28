// @vitest-environment jsdom
// 회원가입 화면 검사 (SPEC 도메인/인증 §8.6 「회원가입 화면」).
// 권한 칸이 없어야 한다 — 본인이 권한을 적어 보내면 그 값이 그대로 수락될 수 있다 (§3.5)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, ApiError } from './api.js';
import { Signup } from './Signup.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 채운다(값: { 아이디?: string; 이름?: string; 비밀번호?: string; 확인?: string }) {
  render(<Signup />);
  fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 값.아이디 ?? 'minsu' } });
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: 값.이름 ?? '이민수' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 값.비밀번호 ?? 'longpass1' } });
  fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
    target: { value: 값.확인 ?? 값.비밀번호 ?? 'longpass1' },
  });
  fireEvent.submit(screen.getByRole('button', { name: '가입 신청' }));
}

describe('회원가입 화면', () => {
  it('칸은 넷이고 권한을 고르는 칸은 없다', () => {
    render(<Signup />);

    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByLabelText('비밀번호').getAttribute('type')).toBe('password');
    expect(screen.getByLabelText('비밀번호 확인').getAttribute('type')).toBe('password');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('브라우저가 새 비밀번호로 알아듣게 autocomplete 를 단다', () => {
    render(<Signup />);

    expect(screen.getByLabelText('아이디').getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText('비밀번호').getAttribute('autocomplete')).toBe('new-password');
    expect(screen.getByLabelText('비밀번호 확인').getAttribute('autocomplete')).toBe('new-password');
  });

  it('두 비밀번호가 다르면 보내지 않는다', () => {
    const 보냄 = vi.spyOn(api, 'signup');
    채운다({ 비밀번호: 'longpass1', 확인: 'longpass2' });

    expect(screen.getByText('두 비밀번호가 다릅니다')).toBeTruthy();
    expect(보냄).not.toHaveBeenCalled();
  });

  it('8자 미만이면 보내지 않는다', () => {
    const 보냄 = vi.spyOn(api, 'signup');
    채운다({ 비밀번호: 'short1' });

    expect(screen.getByText('비밀번호는 8자 이상입니다')).toBeTruthy();
    expect(보냄).not.toHaveBeenCalled();
  });

  it('빈 칸이면 보내지 않는다', () => {
    const 보냄 = vi.spyOn(api, 'signup');
    채운다({ 이름: '   ' });

    expect(screen.getByText('이름을 채웁니다')).toBeTruthy();
    expect(보냄).not.toHaveBeenCalled();
  });

  it('아이디 모양이 틀리면 규칙을 알려 주고 보내지 않는다', () => {
    const 보냄 = vi.spyOn(api, 'signup');
    채운다({ 아이디: 'Admin' });

    expect(screen.getByText('영문 소문자·숫자·. _ - 로 2~32자, 첫 글자는 소문자나 숫자입니다')).toBeTruthy();
    expect(보냄).not.toHaveBeenCalled();
  });

  it('보내면 완료 문구와 로그인으로 가는 링크를 보여 준다', async () => {
    const 보냄 = vi.spyOn(api, 'signup').mockResolvedValue({ status: 'PENDING' });
    채운다({});

    expect(await screen.findByText('가입 신청을 보냈습니다. 운영자가 수락하면 로그인할 수 있습니다')).toBeTruthy();
    expect(보냄).toHaveBeenCalledWith({ username: 'minsu', displayName: '이민수', password: 'longpass1' });
    expect(screen.getByRole('link', { name: '로그인 화면으로' }).getAttribute('href')).toBe('#/login');
  });

  it('아이디가 이미 있으면 그렇게 말한다', async () => {
    vi.spyOn(api, 'signup').mockRejectedValue(new ApiError(409, 'USERNAME_TAKEN', ''));
    채운다({});

    expect(await screen.findByText('이미 쓰는 아이디입니다')).toBeTruthy();
  });

  it('로그인 화면으로 돌아가는 링크가 늘 있다', () => {
    render(<Signup />);

    expect(screen.getByRole('link', { name: '로그인 화면으로' }).getAttribute('href')).toBe('#/login');
  });
});
