// @vitest-environment jsdom
// maxihan 계정(SSO)이 켜진 설치의 로그인 화면 (SPEC §8.6). useSSO 가 답을 기억하므로 비밀번호 로그인 화면 검사(Login.test.tsx)와 파일을 나눈다

import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { Login } from './Login.js';
import { 계정을기억한다, 기억한계정을읽는다, 로그아웃표시를단다, 로그아웃했나 } from './useSSO.js';

beforeEach(() => {
  vi.spyOn(api, 'methods').mockResolvedValue({ sso: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  localStorage.clear();
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
    expect(screen.queryByRole('button')).toBeNull();
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

    const 안내 = await screen.findByText(/관리자가 수락하면 로그인할 수 있습니다/);
    expect(안내.className).toBe('login-info');
    expect(screen.getByRole('button', { name: 'QA Hub 통합계정으로 로그인' })).toBeTruthy();
    expect(떠난다).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('비밀번호')).toBeNull();
    expect(screen.queryByText('회원가입')).toBeNull();
  });

  it('로그아웃한 탭이면 다시 보내지 않고 로그아웃 안내를 보인다', async () => {
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
    const 떠난다 = 그리기('/?sso=failed&next=%2Fgrafana%2Fd%2Fabc');
    fireEvent.click(await screen.findByRole('button', { name: 'QA Hub 통합계정으로 로그인' }));
    expect(떠난다).toHaveBeenCalledWith('/api/auth/sso/start?next=%2Fgrafana%2Fd%2Fabc');
  });

  it('화면 어디에도 「maxihan 계정」이 없다', async () => {
    그리기('/?sso=pending');

    await screen.findByRole('button', { name: 'QA Hub 통합계정으로 로그인' });
    expect(document.body.textContent).not.toContain('maxihan');
  });
});

describe('로그인 카드 — 브라우저의 로그아웃 표시와 기억한 계정 (2026-10-29)', () => {
  it('로그아웃 표시가 있으면 새 탭처럼 알림 없는 주소로 와도 보내지 않고 카드를 그린다', async () => {
    로그아웃표시를단다();
    const 떠난다 = 그리기('/');

    expect((await screen.findByText('로그아웃했습니다')).className).toBe('login-info');
    expect(떠난다).not.toHaveBeenCalled();
  });

  it('버튼을 누르면 로그아웃 표시를 지우고 Auth_platform 으로 간다', async () => {
    로그아웃표시를단다();
    const 떠난다 = 그리기('/');

    fireEvent.click(await screen.findByRole('button', { name: 'QA Hub 통합계정으로 로그인' }));

    expect(떠난다).toHaveBeenCalledWith('/api/auth/sso/start');
    expect(로그아웃했나()).toBe(false);
  });

  it('기억한 계정이 있으면 「이 계정으로 로그인」이 이름 · 아이디를 보이고 login_hint 를 싣는다', async () => {
    로그아웃표시를단다();
    계정을기억한다({ username: 'maxi', name: '한맥시' });
    const 떠난다 = 그리기('/?sso=out&next=%2Fgrafana%2Fd%2Fabc');

    const 주 = await screen.findByRole('button', { name: /이 계정으로 로그인/ });
    expect(주.textContent).toContain('한맥시 · maxi');
    expect(screen.queryByRole('button', { name: 'QA Hub 통합계정으로 로그인' })).toBeNull();
    fireEvent.click(주);

    expect(떠난다).toHaveBeenCalledWith('/api/auth/sso/start?next=%2Fgrafana%2Fd%2Fabc&login_hint=maxi');
    expect(로그아웃했나()).toBe(false);
    expect(기억한계정을읽는다()).toEqual({ username: 'maxi', name: '한맥시' });
  });

  it('「다른 계정으로 로그인」은 prompt=login 을 싣고 기억한 계정을 지운다', async () => {
    로그아웃표시를단다();
    계정을기억한다({ username: 'maxi', name: '한맥시' });
    const 떠난다 = 그리기('/');

    fireEvent.click(await screen.findByRole('button', { name: '다른 계정으로 로그인' }));

    expect(떠난다).toHaveBeenCalledWith('/api/auth/sso/start?prompt=login');
    expect(기억한계정을읽는다()).toBeNull();
    expect(로그아웃했나()).toBe(false);
  });

  it('이름이 아이디와 같으면 한 번만 보인다', async () => {
    계정을기억한다({ username: 'maxi', name: 'maxi' });
    그리기('/?sso=out');

    const 주 = await screen.findByRole('button', { name: /이 계정으로 로그인/ });
    expect(주.textContent).not.toContain('·');
  });

  it('기억한 계정이 있어도 로그아웃 표시 · 알림이 없으면 바로 보낸다', async () => {
    계정을기억한다({ username: 'maxi', name: '한맥시' });
    const 떠난다 = 그리기('/');

    await waitFor(() => expect(떠난다).toHaveBeenCalledWith('/api/auth/sso/start'));
  });
});
