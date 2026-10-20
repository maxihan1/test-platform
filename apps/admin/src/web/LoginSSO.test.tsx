// @vitest-environment jsdom
// maxihan 계정(SSO)이 켜진 설치의 로그인 화면 (SPEC §8.6). useSSO 가 답을 기억하므로 비밀번호 로그인 화면 검사(Login.test.tsx)와 파일을 나눈다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api } from './api.js';
import { Login } from './Login.js';

beforeEach(() => {
  vi.spyOn(api, 'methods').mockResolvedValue({ sso: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

function 그리기(주소 = '/') {
  window.history.replaceState(null, '', 주소);
  return render(<Login onLogin={() => undefined} on언어={() => undefined} />);
}

describe('maxihan 계정 로그인 화면', () => {
  it('버튼 하나가 서버의 SSO 시작으로 보낸다. 아이디 · 비밀번호 칸과 회원가입 링크는 없다', async () => {
    그리기();

    const 버튼 = await screen.findByRole('link', { name: 'maxihan 계정으로 로그인' });
    expect(버튼.getAttribute('href')).toBe('/api/auth/sso/start');
    expect(screen.queryByLabelText('비밀번호')).toBeNull();
    expect(screen.queryByText('회원가입')).toBeNull();
  });

  it('승인 대기로 돌아오면 기다림 안내를 오류 모양 없이 보인다', async () => {
    그리기('/?sso=pending');

    const 안내 = await screen.findByText(/운영자가 수락하면 로그인할 수 있습니다/);
    expect(안내.className).toBe('login-info');
  });

  it('쓸 수 없는 아이디 · 실패로 돌아오면 오류 모양으로 알린다', async () => {
    그리기('/?sso=username');
    expect((await screen.findByText(/쓸 수 없는 아이디/)).className).toContain('err');
    cleanup();

    그리기('/?sso=failed');
    expect((await screen.findByText(/버튼을 다시 누르면 됩니다/)).className).toContain('err');
  });

  it('모르는 결과 값은 아무 문장도 보이지 않는다', async () => {
    그리기('/?sso=<script>');

    await screen.findByRole('link', { name: 'maxihan 계정으로 로그인' });
    expect(document.querySelector('.err, .login-info')).toBeNull();
  });
});
