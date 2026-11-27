// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { ServicePanel } from './SettingsService.js';
import { 물음누름 } from './startConfirm.fixture.js';
import { 그린다, 서비스 } from './SettingsService.fixture.js';
import { 탭열기 } from './SettingsTabs.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

function 피그마칸(): HTMLElement {
  const 칸 = screen.getByText('피그마 토큰', { selector: 'label' }).closest('.field');
  if (!(칸 instanceof HTMLElement)) throw new Error('피그마 토큰 칸이 없다');
  return 칸;
}

describe('피그마 토큰 칸 (도메인/인증 §8.8)', () => {
  it('토큰을 넣고 저장하면 figmaToken 이 간다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    탭열기('테스트 작성');

    fireEvent.click(within(피그마칸()).getByRole('button', { name: '피그마 토큰 추가' }));
    fireEvent.change(screen.getByLabelText('피그마 토큰'), { target: { value: 'figd_abc' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).toMatchObject({ figmaToken: 'figd_abc' });
    expect(고침.mock.calls[0]?.[1]).not.toHaveProperty('slackWebhook');
  });

  it('안 건드리면 figmaToken 을 안 보낸다. 빈 글자가 가면 있던 토큰이 지워진다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={{ ...서비스, hasFigmaToken: true }} onDone={() => {}} />);
    탭열기('테스트 작성');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).not.toHaveProperty('figmaToken');
  });

  it('저장된 애플리케이션은 값 대신 「설정됨 · 변경」을 보인다', () => {
    render(<ServicePanel row={{ ...서비스, hasFigmaToken: true }} onDone={() => {}} />);
    탭열기('테스트 작성');

    const 칸 = 피그마칸();
    expect(칸.textContent).toContain('설정됨');
    expect(칸.textContent).toContain('변경');
    expect(screen.queryByLabelText('피그마 토큰')).toBeNull();
  });

  it('칸 옆에 발급 안내와 Figma 설정 링크가 있다', () => {
    그린다();
    탭열기('테스트 작성');
    expect(screen.getByText(/Figma의 Settings → Security → Personal access tokens에서/)).toBeTruthy();
    expect(screen.getByText(/File content 읽기 전용/)).toBeTruthy();
    expect(screen.getByText(/만료일/)).toBeTruthy();
    const 링크 = screen.getByRole('link', { name: /Figma 설정 열기/ });
    expect(링크.getAttribute('href')).toBe('https://www.figma.com/settings');
    expect(링크.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

describe('대상 서버 줄의 테스트 계정 (도메인/인증 §8.8)', () => {
  const 계정있음: SettingsServiceRow = {
    ...서비스,
    envs: [{ env: 'qa', baseUrl: 'https://qa.example.com', loginId: 'tester', hasLoginPassword: true }],
  };

  it('안 건드리고 저장하면 아이디는 되돌려 보내고 비밀번호는 안 보낸다 — 서버가 유지한다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    탭열기('실행');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    const 보낸줄 = 고침.mock.calls[0]?.[1]?.envs?.[0];
    expect(보낸줄).toEqual({ env: 'qa', baseUrl: 'https://qa.example.com', loginId: 'tester', prep: null });
  });

  it('비밀번호는 값 대신 설정됨으로 보이고, 변경하면 새 값을 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    탭열기('실행');

    const 줄 = screen.getByLabelText('대상 서버 1 테스트 아이디').closest('.set-env-login') as HTMLElement;
    expect(within(줄).getByText('비밀번호 설정됨')).toBeTruthy();
    fireEvent.click(within(줄).getByRole('button', { name: '대상 서버 1 비밀번호 변경' }));
    fireEvent.change(screen.getByLabelText('대상 서버 1 테스트 비밀번호'), { target: { value: 'pw-새것' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]?.envs?.[0]).toMatchObject({
      loginPassword: 'pw-새것',
    });
  });

  it('삭제를 누르고 저장하면 비밀번호를 null 로 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    탭열기('실행');
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 비밀번호 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]?.envs?.[0]).toMatchObject({ loginPassword: null });
  });

  it('새로 더한 줄은 빈 계정 칸 · 앱 파일 경로를 null · 운영 표시 false · 역할 목록 [] 로 보낸다 — 같은 이름의 옛 계정이 되살아나지 않게', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    탭열기('실행');
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '+ 대상 서버 추가' }));
    fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 'qa' } });
    fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 'https://qa.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]?.envs?.[0]).toEqual({
      env: 'qa',
      baseUrl: 'https://qa.example.com',
      loginId: null,
      loginPassword: null,
      isProd: false,
      accounts: [],
      appPath: null,
      prep: null,
    });
  });

  it('계정 칸은 브라우저 자동완성을 받지 않는다 — 플랫폼 로그인 비밀번호가 채워지지 않게', () => {
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    탭열기('실행');
    expect(screen.getByLabelText('대상 서버 1 테스트 아이디').getAttribute('autocomplete')).toBe('off');
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 비밀번호 변경' }));
    expect(screen.getByLabelText('대상 서버 1 테스트 비밀번호').getAttribute('autocomplete')).toBe('new-password');
  });

  it('계정이 있던 줄의 키 이름을 바꾸면 비밀번호가 초기화된다고 알린다', () => {
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    탭열기('실행');
    expect(screen.queryByText(/비밀번호가 초기화됩니다/)).toBeNull();

    fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 'qa2' } });
    expect(screen.getByText(/비밀번호가 초기화됩니다/)).toBeTruthy();
  });
});

