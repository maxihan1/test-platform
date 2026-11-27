// @vitest-environment jsdom
// 대상 서버 편집기가 읽히게 — 칸 이름 · 칸 아래 안내 · 칸 머리 · 기호 대신 글자 단추 (도메인/인증 §8.8 · 2026-11-27 시안 A)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import type { SettingsServiceRow } from './api.js';
import { ServicePanel } from './SettingsService.js';
import { EnvEditor, 줄로 } from './SettingsEnvs.js';
import { 탭열기 } from './SettingsTabs.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 줄들 = () =>
  줄로([
    {
      env: 'qa',
      baseUrl: 'https://qa.example.com',
      loginId: 'member',
      hasLoginPassword: true,
      accounts: [{ role: '관리자', loginId: 'admin', hasLoginPassword: false }],
      prep: { url: 'https://qa.example.com/prep', header: 'X-Prep-Key', valueLast4: 'abcd', timeoutSec: 120 },
    },
  ]);

const 글자단추 = (이름: string) => screen.getByText(이름, { selector: 'button' });

describe('대상 서버 편집기 — 칸 이름과 안내', () => {
  it('앱 파일 경로 칸 앞에 이름이 보이고, 스토어 앱만 패키지 이름도 적혀 있다 — aria-label 은 그대로다', () => {
    render(<EnvEditor envs={줄들()} onChange={vi.fn()} />);
    const 입력 = screen.getByRole('textbox', { name: '대상 서버 1 앱 파일 경로' });
    expect(within(입력.closest('.set-env-login') as HTMLElement).getByText('앱 파일 경로', { selector: '.field-label' })).toBeTruthy();
    cleanup();

    render(<EnvEditor envs={줄들()} onChange={vi.fn()} 스토어앱 />);
    const 스토어 = screen.getByRole('textbox', { name: '대상 서버 1 앱 파일 경로' });
    expect(within(스토어.closest('.set-env-login') as HTMLElement).getByText('앱 파일 경로 · 패키지 이름', { selector: '.field-label' })).toBeTruthy();
  });

  it('안내 문장은 대상 서버 목록 맨 아래에 몰리지 않고 제 칸이 선 줄 안에 있다', () => {
    render(<EnvEditor envs={줄들()} onChange={vi.fn()} 스토어앱 어드민키 />);
    const 줄안 = (칸: HTMLElement) => 칸.closest('.set-env-login') as HTMLElement;

    expect(within(줄안(screen.getByLabelText('대상 서버 1 실서비스 서버'))).getByText('실서비스 서버로 체크하면 테스트 작성과 화면 탐색 대상에서 제외됩니다')).toBeTruthy();
    const 앱줄 = 줄안(screen.getByLabelText('대상 서버 1 앱 파일 경로'));
    expect(within(앱줄).getByText(/설치할 apk 입니다/)).toBeTruthy();
    expect(within(앱줄).getByText(/스토어에서 설치해 둔 앱의 패키지 이름/)).toBeTruthy();
    expect(within(줄안(screen.getByLabelText('대상 서버 1 준비 주소'))).getByText(/준비 주소는 실행할 때마다 먼저 호출해/)).toBeTruthy();
    expect(within(줄안(screen.getByLabelText('대상 서버 1 어드민 키 값'))).getByText(/서버 어드민 API 에 헤더로 실어 보냅니다/)).toBeTruthy();
    expect(screen.getByText('테스트 계정은 실행과 테스트 작성에서 로그인할 때 사용합니다')).toBeTruthy();
    // 목록 맨 아래 칸의 안내는 서버가 없을 때의 한 줄뿐이다
    expect(document.querySelectorAll('.set-envs > .hint')).toHaveLength(0);
  });

  it('준비 칸 · 어드민 키 칸 위에 머리가 서고 칸 앞에 이름이 있다. 테스트 계정 위에도 머리가 있다', () => {
    render(<EnvEditor envs={줄들()} onChange={vi.fn()} 어드민키 />);

    expect(screen.getByText('역할 · 아이디 · 비밀번호')).toBeTruthy();
    const 준비 = screen.getByLabelText('대상 서버 1 준비 주소').closest('.set-env-login') as HTMLElement;
    expect(within(준비).getByText('준비 주소 · 헤더 이름 · 헤더 값 · 제한 시간')).toBeTruthy();
    expect(within(준비).getByText('테스트 데이터 준비', { selector: '.field-label' })).toBeTruthy();
    const 어드민 = screen.getByLabelText('대상 서버 1 어드민 키 값').closest('.set-env-login') as HTMLElement;
    expect(within(어드민).getByText('헤더 이름 · 헤더 값')).toBeTruthy();
    expect(within(어드민).getByText('어드민 키', { selector: '.field-label' })).toBeTruthy();
  });
});

describe('대상 서버 편집기 — 기호만 있던 단추를 글자로', () => {
  it('서버 · 역할 계정 · 비밀번호 · 준비 삭제는 글자이고 빨간 글 고스트 단추다 — aria-label 은 그대로다', () => {
    render(<EnvEditor envs={줄들()} onChange={vi.fn()} />);

    for (const [글자, 이름] of [
      ['서버 삭제', '대상 서버 1 삭제'],
      ['계정 삭제', '대상 서버 1 역할 1 삭제'],
      ['삭제', '대상 서버 1 비밀번호 삭제'],
      ['삭제', '대상 서버 1 테스트 데이터 준비 삭제'],
    ] as const) {
      const 단추 = screen.getByRole('button', { name: 이름 });
      expect(단추.textContent).toBe(글자);
      expect(단추.className).toContain('ghost');
    }
    expect(document.body.textContent).not.toContain('−');
  });

  it('비밀번호가 없는 계정은 「입력」, 준비가 닫힌 줄은 「+ 테스트 데이터 준비」다', () => {
    render(<EnvEditor envs={줄로([{ env: 'qa', baseUrl: 'https://qa.example.com', accounts: [{ role: '관리자', loginId: 'admin', hasLoginPassword: false }] }])} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '대상 서버 1 비밀번호 추가' }).textContent).toBe('입력');
    expect(screen.getByRole('button', { name: '대상 서버 1 역할 1 비밀번호 추가' }).textContent).toBe('입력');
    expect(글자단추('+ 테스트 데이터 준비').getAttribute('aria-label')).toBe('대상 서버 1 테스트 데이터 준비 추가');
    expect(document.body.textContent).not.toContain('−');
  });
});

describe('Slack 웹훅 · 피그마 토큰 단추', () => {
  const 서비스: SettingsServiceRow = {
    id: 1,
    prefix: 'ZRD',
    name: '읽기 애플리케이션',
    color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
    envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
    hasSlackWebhook: false,
    testsRepo: 'https://github.com/example/tests',
    testsDir: 'zrd',
    isActive: true,
    caseCount: 0,
  };

  it('값이 없으면 「입력」, 있으면 「변경」과 빨간 「삭제」다', () => {
    render(<ServicePanel row={{ ...서비스, hasFigmaToken: true }} onDone={() => {}} />);

    탭열기('알림');
    expect(screen.getByRole('button', { name: 'Slack 웹훅 추가' }).textContent).toBe('입력');
    expect(screen.queryByRole('button', { name: 'Slack 웹훅 삭제' })).toBeNull();
    탭열기('테스트 작성');
    expect(screen.getByRole('button', { name: '피그마 토큰 변경' }).textContent).toBe('변경');
    const 삭제 = screen.getByRole('button', { name: '피그마 토큰 삭제' });
    expect(삭제.textContent).toBe('삭제');
  });
});
