// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { ServicePanel } from './SettingsService.js';

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
  render(<ServicePanel row={서비스} onDone={() => {}} />);
}

describe('서비스 설정은 구획마다 「어디에 쓰이나」를 단다 (도메인/인증 §8.8 · 2026-10-09 시안 A)', () => {
  it('구획마다 — 기본 정보 · 대상 서버 · 실행 알림 · 테스트 작성 · 서비스 끄기 — 제목과 쓰임 한 줄을 갖는다', () => {
    그린다();

    const 구획들 = [...document.querySelectorAll('.set-card')].map((el) => el.querySelector('h3')?.textContent);
    expect(구획들).toEqual(['기본 정보', '대상 서버', '실행 알림', '테스트 작성', '서비스 끄기']);
    for (const 구획 of document.querySelectorAll('.set-card')) {
      expect(구획.querySelector('.set-card-h p')?.textContent?.length ?? 0).toBeGreaterThan(10);
    }
  });

  it('칸이 제 구획 안에 선다 — Slack 은 실행 알림, 피그마와 훑지 않을 경로는 테스트 작성', () => {
    그린다();

    const 구획 = (제목: string) => [...document.querySelectorAll('.set-card')].find((el) => el.querySelector('h3')?.textContent === 제목);
    expect(구획('실행 알림')?.textContent).toContain('Slack 웹훅');
    expect(구획('테스트 작성')?.textContent).toContain('피그마 토큰');
    expect(구획('테스트 작성')?.textContent).toContain('훑지 않을 경로');
    expect(구획('대상 서버')?.querySelector('[role="group"]')).not.toBeNull();
  });

  it('새 서비스에는 서비스 끄기 구획이 없다 — 끌 것이 아직 없다', () => {
    render(<ServicePanel onDone={() => {}} />);

    expect(screen.getByText('새 서비스')).toBeTruthy();
    expect(screen.queryByText('서비스 끄기')).toBeNull();
  });

  it('비활성으로 내리기는 저장과 따로 서비스 끄기 구획에서 한다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    render(<ServicePanel row={서비스} onDone={onDone} />);

    fireEvent.click(screen.getByRole('button', { name: '비활성으로 내리기' }));

    await waitFor(() => expect(고침).toHaveBeenCalledWith(1, { isActive: false }));
    expect(onDone).toHaveBeenCalledWith('ZSS');
  });

  it('새 서비스를 만들면 그 접두사를 넘긴다 — 틀이 그 서비스로 옮겨 간다', async () => {
    vi.spyOn(api, 'createService').mockResolvedValue({ id: 3 });
    const onDone = vi.fn();
    render(<ServicePanel onDone={onDone} />);

    fireEvent.change(screen.getByLabelText('접두사'), { target: { value: 'NEW' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '새것' } });
    fireEvent.change(screen.getByLabelText('테스트 폴더'), { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: '서비스 추가' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('NEW'));
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
    render(<ServicePanel row={서비스} onDone={() => {}} />);

    fireEvent.click(within(피그마칸()).getByRole('button', { name: '넣기' }));
    fireEvent.change(screen.getByLabelText('피그마 토큰'), { target: { value: 'figd_abc' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).toMatchObject({ figmaToken: 'figd_abc' });
    expect(고침.mock.calls[0]?.[1]).not.toHaveProperty('slackWebhook');
  });

  it('안 건드리면 figmaToken 을 안 보낸다. 빈 글자가 가면 있던 토큰이 지워진다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={{ ...서비스, hasFigmaToken: true }} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).not.toHaveProperty('figmaToken');
  });

  it('저장된 서비스는 값 대신 「설정됨 · 다시 넣기」를 보인다', () => {
    render(<ServicePanel row={{ ...서비스, hasFigmaToken: true }} onDone={() => {}} />);

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
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    const 보낸줄 = 고침.mock.calls[0]?.[1]?.envs?.[0];
    expect(보낸줄).toEqual({ env: 'qa', baseUrl: 'https://qa.example.com', loginId: 'tester' });
  });

  it('비밀번호는 값 대신 설정됨으로 보이고, 다시 넣으면 새 값을 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={계정있음} onDone={() => {}} />);

    const 줄 = screen.getByLabelText('대상 서버 1 테스트 아이디').closest('.set-env-login') as HTMLElement;
    expect(within(줄).getByText('비밀번호 설정됨')).toBeTruthy();
    fireEvent.click(within(줄).getByRole('button', { name: '대상 서버 1 비밀번호 넣기' }));
    fireEvent.change(screen.getByLabelText('대상 서버 1 테스트 비밀번호'), { target: { value: 'pw-새것' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]?.envs?.[0]).toMatchObject({
      loginPassword: 'pw-새것',
    });
  });

  it('지우기를 누르고 저장하면 비밀번호를 null 로 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 비밀번호 지우기' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]?.envs?.[0]).toMatchObject({ loginPassword: null });
  });

  it('새로 더한 줄은 빈 계정 칸을 null 로 보낸다 — 같은 이름의 옛 계정이 되살아나지 않게', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 빼기' }));
    fireEvent.click(screen.getByRole('button', { name: '줄 더하기' }));
    fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 'qa' } });
    fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 'https://qa.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]?.envs?.[0]).toEqual({
      env: 'qa',
      baseUrl: 'https://qa.example.com',
      loginId: null,
      loginPassword: null,
    });
  });

  it('계정 칸은 브라우저 자동완성을 받지 않는다 — 플랫폼 로그인 비밀번호가 채워지지 않게', () => {
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    expect(screen.getByLabelText('대상 서버 1 테스트 아이디').getAttribute('autocomplete')).toBe('off');
    fireEvent.click(screen.getByRole('button', { name: '대상 서버 1 비밀번호 넣기' }));
    expect(screen.getByLabelText('대상 서버 1 테스트 비밀번호').getAttribute('autocomplete')).toBe('new-password');
  });

  it('계정이 있던 줄의 키 이름을 바꾸면 비밀번호가 비워진다고 알린다', () => {
    render(<ServicePanel row={계정있음} onDone={() => {}} />);
    expect(screen.queryByText(/비밀번호가 비워집니다/)).toBeNull();

    fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 'qa2' } });
    expect(screen.getByText(/비밀번호가 비워집니다/)).toBeTruthy();
  });
});

describe('훑지 않을 경로 칸 (도메인/인증 §8.8 · 2026-10-04)', () => {
  it('칸이 보이고, 두 줄을 적어 저장하면 crawlExclude 배열로 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    그린다();

    fireEvent.change(screen.getByLabelText('훑지 않을 경로'), { target: { value: '/daejeon\n /gyeongnam/ \n' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).toMatchObject({ crawlExclude: ['/daejeon', '/gyeongnam'] });
  });

  it('있던 값이 한 줄에 하나씩 채워져 보인다', () => {
    render(<ServicePanel row={{ ...서비스, crawlExclude: ['/daejeon', '/gyeongnam'] }} onDone={() => {}} />);

    expect((screen.getByLabelText('훑지 않을 경로') as HTMLTextAreaElement).value).toBe('/daejeon\n/gyeongnam');
  });

  it('/ 로 시작하지 않는 줄이 있으면 저장 버튼 아래에 이유를 말하고 보내지 않는다', () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    그린다();

    fireEvent.change(screen.getByLabelText('훑지 않을 경로'), { target: { value: 'daejeon' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(document.querySelector('.set-why')?.textContent).toContain('「daejeon」');
    expect(고침).not.toHaveBeenCalled();
  });

  it('새 서비스를 만들 때도 crawlExclude 를 보낸다', async () => {
    const 만듦 = vi.spyOn(api, 'createService').mockResolvedValue({ id: 2 });
    render(<ServicePanel onDone={() => {}} />);

    fireEvent.change(screen.getByLabelText('접두사'), { target: { value: 'CDY' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '청도' } });
    fireEvent.change(screen.getByLabelText('테스트 폴더'), { target: { value: 'cdy' } });
    fireEvent.change(screen.getByLabelText('훑지 않을 경로'), { target: { value: '/daejeon' } });
    fireEvent.click(screen.getByRole('button', { name: '서비스 추가' }));

    await waitFor(() => expect(만듦).toHaveBeenCalledTimes(1));
    expect(만듦.mock.calls[0]?.[0]).toMatchObject({ crawlExclude: ['/daejeon'] });
  });
});
