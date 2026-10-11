// @vitest-environment jsdom
// 껍데기의 메뉴 아이콘과 실행 중 맥박 점 검사 (DESIGN.md 원칙 4 · 5, 2026-10-07). Shell.test.tsx 가 300줄을 넘어 떼어 냈다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type NoticeRecent, type NoticeResponse, type NoticeRunning, type ServiceRow, type User } from './api.js';
import { 언어함 } from './i18n.js';
import { 자리목록 } from './layout.js';
import { Shell } from './Shell.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 결제: ServiceRow = {
  id: 1,
  prefix: 'ZSH',
  name: '결제 서비스',
  color: '#3A5FCD',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 사람: User = {
  username: 'zsh1',
  displayName: '김수민',
  role: 'admin',
  dashboard: 'read',
  mustChangePassword: false,
  services: [결제],
};

const 도는실행: NoticeRunning = {
  kind: 'run',
  serviceId: 1,
  prefix: 'ZSH',
  serviceName: '결제 서비스',
  runId: 77,
  title: '결제 회귀',
  total: 4,
  done: 1,
  counts: { total: 4, pass: 1, fail: 0, na: 0, running: 3 },
  startedAt: new Date().toISOString(),
  remainingMs: null,
};

const 끝난실행: NoticeRecent = {
  kind: 'run',
  serviceId: 1,
  prefix: 'ZSH',
  serviceName: '결제 서비스',
  runId: 77,
  title: '결제 회귀',
  status: 'FINISHED',
  counts: { total: 4, pass: 4, fail: 0, na: 0, running: 0 },
  finishedAt: new Date().toISOString(),
};

function 띄운다(답: NoticeResponse = { running: [], recent: [] }) {
  vi.spyOn(api, 'notifications').mockResolvedValue(답);
  render(
    <언어함 value="ko">
      <Shell user={사람} service={결제} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/cases">
        <div>본문</div>
      </Shell>
    </언어함>,
  );
}

describe('메뉴 아이콘 (DESIGN.md 원칙 5)', () => {
  it('맨 위 자리마다 글자 곁에 아이콘이 서고, 화면 읽기는 글자만 읽는다', () => {
    띄운다();
    for (const 자리 of 자리목록(사람, 결제.prefix, 'ko')) {
      const 링크 = screen.getByRole('link', { name: 자리.바깥 === true ? `${자리.이름} ↗` : 자리.이름 });
      const 그림 = 링크.querySelector('svg');
      expect(그림, `${자리.이름} 에 아이콘이 없다`).not.toBeNull();
      expect(그림!.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('하위 메뉴에는 아이콘을 두지 않는다 — 묶음의 아이콘이 이미 어느 기능인지 말한다', () => {
    띄운다();
    const 하위들 = [...document.querySelectorAll('.side-sub')];
    expect(하위들.length).toBeGreaterThan(0);
    for (const 하위 of 하위들) expect(하위.querySelector('svg')).toBeNull();
  });
});

describe('실행 중 표시 (DESIGN.md 원칙 4)', () => {
  it('도는 실행이 있으면 알림 줄에 맥박 점이 선다. 점은 꾸밈이라 화면 읽기는 글자만 읽는다', async () => {
    띄운다({ running: [도는실행], recent: [] });
    const 글 = await screen.findByText(/RUN 77 이 진행 중입니다/);
    const 점 = 글.closest('.nt-line')?.querySelector('.pulse');
    expect(점).not.toBeNull();
    expect(점!.getAttribute('aria-hidden')).toBe('true');
  });

  it('끝난 소식에는 맥박 점이 없다 — 되풀이 움직임은 실제로 도는 동안만이다', async () => {
    띄운다({ running: [], recent: [끝난실행] });
    const 글 = await screen.findByText(/RUN 77 이 끝났습니다/);
    expect(글.closest('.nt-line')?.querySelector('.pulse')).toBeNull();
  });
});
