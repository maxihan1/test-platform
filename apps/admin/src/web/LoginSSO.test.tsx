// @vitest-environment jsdom
// maxihan 계정(SSO)이 켜진 설치의 로그인 화면 (SPEC §8.6). useSSO 가 답을 기억하므로 비밀번호 로그인 화면 검사(Login.test.tsx)와 파일을 나눈다

import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

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
  const 떠난다 = vi.fn();
  render(<Login onLogin={() => undefined} on언어={() => undefined} 떠난다={떠난다} />);
  return 떠난다;
}

describe('통합계정 로그인 — 알림 없이 오면 화면 없이 바로 보낸다', () => {
  it('서버의 SSO 시작으로 바로 보내고 버튼 · 아이디 · 비밀번호 칸을 그리지 않는다', async () => {
    const 떠난다 = 그리기();

    await waitFor(() => expect(떠난다).toHaveBeenCalledWith('/api/auth/sso/start'));
    expect(떠난다).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByLabelText('비밀번호')).toBeNull();
  });

  it('StrictMode 가 효과를 두 번 돌려도 한 번만 보낸다', async () => {
    window.history.replaceState(null, '', '/');
    const 떠난다 = vi.fn();
    render(
      <StrictMode>
        <Login onLogin={() => undefined} on언어={() => undefined} 떠난다={떠난다} />
      </StrictMode>,
    );

    await waitFor(() => expect(떠난다).toHaveBeenCalled());
    expect(떠난다).toHaveBeenCalledTimes(1);
  });

  it('Grafana 에서 왔으면 돌아올 자리를 실어 보낸다', async () => {
    const 떠난다 = 그리기('/?next=%2Fgrafana%2Fd%2Fabc');

    await waitFor(() => expect(떠난다).toHaveBeenCalledWith('/api/auth/sso/start?next=%2Fgrafana%2Fd%2Fabc'));
  });

  it('모르는 결과 값은 알림이 없는 것과 같다', async () => {
    const 떠난다 = 그리기('/?sso=<script>');
    await waitFor(() => expect(떠난다).toHaveBeenCalledWith('/api/auth/sso/start'));
    cleanup();

    const 또 = 그리기('/?sso=toString');
    await waitFor(() => expect(또).toHaveBeenCalledWith('/api/auth/sso/start'));
    expect(document.querySelector('.err, .login-info')).toBeNull();
  });
});

describe('통합계정 로그인 — 알림이 있을 때만 화면', () => {
  it('승인 대기로 돌아오면 다시 보내지 않고 기다림 안내와 버튼을 보인다', async () => {
    const 떠난다 = 그리기('/?sso=pending');

    const 안내 = await screen.findByText(/운영자가 수락하면 로그인할 수 있습니다/);
    expect(안내.className).toBe('login-info');
    const 버튼 = screen.getByRole('link', { name: 'QA Hub 통합계정으로 로그인' });
    expect(버튼.getAttribute('href')).toBe('/api/auth/sso/start');
    expect(떠난다).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('비밀번호')).toBeNull();
    expect(screen.queryByText('회원가입')).toBeNull();
  });

  it('Auth_platform 을 못 끊은 로그아웃이면 다시 보내지 않고 로그아웃 안내를 보인다', async () => {
    const 떠난다 = 그리기('/?sso=out#/login');

    expect((await screen.findByText('로그아웃했습니다')).className).toBe('login-info');
    expect(떠난다).not.toHaveBeenCalled();
  });

  it('쓸 수 없는 아이디 · 실패로 돌아오면 오류 모양으로 알리고 다시 보내지 않는다', async () => {
    const 떠난다 = 그리기('/?sso=username');
    expect((await screen.findByText(/쓸 수 없는 아이디/)).className).toContain('err');
    cleanup();

    const 또 = 그리기('/?sso=failed');
    expect((await screen.findByText(/버튼을 다시 누르면 됩니다/)).className).toContain('err');
    expect(떠난다).not.toHaveBeenCalled();
    expect(또).not.toHaveBeenCalled();
  });

  it('Grafana 에서 왔다가 실패하면 버튼이 돌아올 자리를 싣는다', async () => {
    그리기('/?sso=failed&next=%2Fgrafana%2Fd%2Fabc');

    const 버튼 = await screen.findByRole('link', { name: 'QA Hub 통합계정으로 로그인' });
    expect(버튼.getAttribute('href')).toBe('/api/auth/sso/start?next=%2Fgrafana%2Fd%2Fabc');
  });

  it('화면 어디에도 「maxihan 계정」이 없다', async () => {
    그리기('/?sso=pending');

    await screen.findByRole('link', { name: 'QA Hub 통합계정으로 로그인' });
    expect(document.body.textContent).not.toContain('maxihan');
  });
});
