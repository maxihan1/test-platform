// @vitest-environment jsdom
// SSO 설치의 계정 메뉴 — 비밀번호 변경 대신 「디바이스 팜 토큰」이 있고 누르면 창이 뜬다 (SPEC 도메인/인증 §8.6).
// useSSO 는 답을 모듈에 기억해서 켜진 쪽을 이 파일에 떼어 둔다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { 언어함 } from './i18n.js';
import { Shell } from './Shell.js';

vi.mock('./useSSO.js', async (원본) => ({ ...(await 원본<typeof import('./useSSO.js')>()), useSSO: () => true }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 결제: ServiceRow = {
  id: 1,
  prefix: 'ZSF',
  name: '결제 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 사람: User = { username: 'zsf1', displayName: '김수민', role: 'member', dashboard: 'none', mustChangePassword: false, services: [결제] };

describe('SSO 설치의 계정 메뉴', () => {
  it('비밀번호 변경은 없고 통합계정 토큰을 누르면 창이 뜬다', async () => {
    vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
    vi.spyOn(api, 'farmToken').mockResolvedValue({ farmToken: null });
    render(
      <언어함 value="ko">
        <Shell user={사람} service={결제} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/cases">
          <p>본문</p>
        </Shell>
      </언어함>,
    );

    fireEvent.click(screen.getByRole('button', { name: `내 메뉴 · ${사람.displayName}` }));
    expect(screen.queryByRole('link', { name: '비밀번호 변경' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '통합계정 토큰' }));

    expect(await screen.findByText('없음 — 서버 토큰으로 빌립니다')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
