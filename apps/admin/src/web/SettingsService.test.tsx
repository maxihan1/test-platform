// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { ServiceSection } from './SettingsService.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZSS',
  name: '설정 서비스',
  color: '#3A5FCD',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  testsRepo: 'https://github.com/example/tests',
  testsDir: 'zss',
  isActive: true,
  caseCount: 3,
};

function 그린다() {
  render(<ServiceSection rows={[서비스]} onDone={() => {}} />);
  fireEvent.click(screen.getByText('편집'));
}

describe('서비스 더하기는 + 아이콘 버튼이다 (2026-09-22)', () => {
  it('글자 「더하기」 대신 + 기호가 뜨고, 화면을 안 보는 사람에게는 라벨로 뜻이 전해진다', () => {
    render(<ServiceSection rows={[서비스]} onDone={() => {}} />);

    const 버튼 = screen.getByLabelText('더하기');
    expect(버튼.textContent).toBe('+');
  });

  it('누르면 열리고, 열린 채로 다시 누르면 라벨과 기호가 닫기로 바뀐다', () => {
    render(<ServiceSection rows={[서비스]} onDone={() => {}} />);

    fireEvent.click(screen.getByLabelText('더하기'));

    const 버튼 = screen.getByLabelText('닫기');
    expect(버튼.textContent).toBe('×');
  });
});

describe('설정에서 색 고르개를 걷었다 (SPEC §8.8, 2026-09-22)', () => {
  // 화면 어디에도 안 쓰이는 색을 고르게 두면 「고르면 뭐가 달라지나」에 답할 수 없다
  it('색을 고르는 칸이 없다', () => {
    그린다();
    expect(screen.queryByLabelText('색 코드')).toBeNull();
    expect(document.querySelector('input[type="color"]')).toBeNull();
    expect(document.querySelector('.set-preview')).toBeNull();
  });

  it('명암비 경고 자리도 없다. 잴 면이 사라졌다', () => {
    그린다();
    expect(document.body.textContent).not.toContain('명암비');
  });
});

function 피그마칸(): HTMLElement {
  const 칸 = screen.getByText('피그마 토큰', { selector: 'label' }).closest('.field');
  if (!(칸 instanceof HTMLElement)) throw new Error('피그마 토큰 칸이 없다');
  return 칸;
}

describe('피그마 토큰 칸 (도메인/인증 §8.8)', () => {
  it('토큰을 넣고 저장하면 figmaToken 이 간다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServiceSection rows={[서비스]} onDone={() => {}} />);
    fireEvent.click(screen.getByText('편집'));

    fireEvent.click(within(피그마칸()).getByRole('button', { name: '넣기' }));
    fireEvent.change(screen.getByLabelText('피그마 토큰'), { target: { value: 'figd_abc' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).toMatchObject({ figmaToken: 'figd_abc' });
    expect(고침.mock.calls[0]?.[1]).not.toHaveProperty('slackWebhook');
  });

  it('안 건드리면 figmaToken 을 안 보낸다. 빈 글자가 가면 있던 토큰이 지워진다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServiceSection rows={[{ ...서비스, hasFigmaToken: true }]} onDone={() => {}} />);
    fireEvent.click(screen.getByText('편집'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).not.toHaveProperty('figmaToken');
  });

  it('저장된 서비스는 값 대신 「설정됨 · 다시 넣기」를 보인다', () => {
    render(<ServiceSection rows={[{ ...서비스, hasFigmaToken: true }]} onDone={() => {}} />);
    fireEvent.click(screen.getByText('편집'));

    const 칸 = 피그마칸();
    expect(칸.textContent).toContain('설정됨');
    expect(칸.textContent).toContain('다시 넣기');
    expect(screen.queryByLabelText('피그마 토큰')).toBeNull();
  });

  it('칸 옆에 발급 안내와 Figma 설정 링크가 있다', () => {
    그린다();
    expect(screen.getByText(/Figma → Settings → Security → Personal access tokens/)).toBeTruthy();
    expect(screen.getByText(/File content 읽기만/)).toBeTruthy();
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
    render(<ServiceSection rows={[계정있음]} onDone={() => {}} />);
    fireEvent.click(screen.getByText('편집'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    const 보낸줄 = (고침.mock.calls[0]?.[1] as { envs: Record<string, unknown>[] }).envs[0];
    expect(보낸줄).toEqual({ env: 'qa', baseUrl: 'https://qa.example.com', loginId: 'tester' });
  });

  it('비밀번호는 값 대신 설정됨으로 보이고, 다시 넣으면 새 값을 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServiceSection rows={[계정있음]} onDone={() => {}} />);
    fireEvent.click(screen.getByText('편집'));

    const 줄 = screen.getByLabelText('대상 서버 1 테스트 아이디').closest('.set-env-login') as HTMLElement;
    expect(within(줄).getByText('설정됨')).toBeTruthy();
    fireEvent.click(within(줄).getByRole('button', { name: '다시 넣기' }));
    fireEvent.change(screen.getByLabelText('대상 서버 1 테스트 비밀번호'), { target: { value: 'pw-새것' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect((고침.mock.calls[0]?.[1] as { envs: Record<string, unknown>[] }).envs[0]).toMatchObject({
      loginPassword: 'pw-새것',
    });
  });

  it('계정이 있던 줄의 키 이름을 바꾸면 비밀번호가 비워진다고 알린다', () => {
    render(<ServiceSection rows={[계정있음]} onDone={() => {}} />);
    fireEvent.click(screen.getByText('편집'));
    expect(screen.queryByText(/비밀번호가 비워집니다/)).toBeNull();

    fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 'qa2' } });
    expect(screen.getByText(/비밀번호가 비워집니다/)).toBeTruthy();
  });
});
