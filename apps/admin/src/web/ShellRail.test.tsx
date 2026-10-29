// @vitest-environment jsdom
// 사이드바 왼쪽 애플리케이션 줄 · 사이드바 머리 · 화면 머리의 애플리케이션 이름 검사 (SPEC 공통/5-화면공통 §8 「껍데기」 · 2026-10-29 시안 B)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { Head } from './Head.js';
import { 언어함 } from './i18n.js';
import { Shell } from './Shell.js';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

const 웹: ServiceRow = {
  id: 1,
  prefix: 'ZRA',
  name: '데모마켓 웹',
  color: '#3A5FCD',
  projectId: 1,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};
const 앱: ServiceRow = { ...웹, id: 2, prefix: 'ZRB', name: '데모마켓 앱', kind: 'APP' };
const 다른프로젝트: ServiceRow = { ...웹, id: 3, prefix: 'ZRC', name: '사내 포털', projectId: 2, projectName: '사내 포털' };

function 띄운다(service: ServiceRow, 옵션: { role?: User['role']; current?: string; onService?: (접두사: string) => void } = {}) {
  vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
  vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [] });
  const user: User = { username: 'zra1', displayName: '김수민', role: 옵션.role ?? 'admin', dashboard: 'read', mustChangePassword: false, services: [웹, 앱, 다른프로젝트] };
  return render(
    <언어함 value="ko">
      <Shell user={user} service={service} onService={옵션.onService ?? (() => {})} 언어="ko" on언어={() => {}} onLogout={() => {}} current={옵션.current ?? '#/cases'}>
        <Head 제목="기능 테스트" 위치="테스트 스크립트" />
      </Shell>
    </언어함>,
  );
}

const 줄 = () => screen.getByRole('navigation', { name: '애플리케이션' });

describe('줄과 메뉴가 같이 맞는 자리', () => {
  it('API 애플리케이션의 테스트 스크립트는 하위가 없어도 그 목록을 열면 지금 자리로 표시된다', () => {
    vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
    const API앱: ServiceRow = { ...웹, id: 4, prefix: 'ZRD', name: '알림 API', kind: 'API' };
    render(
      <언어함 value="ko">
        <Shell user={{ username: 'zra2', displayName: '김수민', role: 'member', dashboard: 'read', mustChangePassword: false, services: [API앱] }} service={API앱} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/cases/fn">
          <div>본문</div>
        </Shell>
      </언어함>,
    );

    expect(screen.getByRole('link', { name: '테스트 스크립트' }).getAttribute('aria-current')).toBe('page');
  });

  it('고른 애플리케이션이 없어도 줄 칸은 서고 운영 계정에게는 「+」만 있다', () => {
    vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [] });
    render(
      <언어함 value="ko">
        <Shell user={{ username: 'zra3', displayName: '김수민', role: 'admin', dashboard: 'read', mustChangePassword: false, services: [] }} service={null} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/settings">
          <div>본문</div>
        </Shell>
      </언어함>,
    );

    expect(within(줄()).queryAllByRole('button')).toHaveLength(0);
    expect(within(줄()).getByRole('link', { name: '애플리케이션 추가' }).getAttribute('href')).toBe('#/settings/new');
  });
});

describe('애플리케이션 줄', () => {
  it('고른 프로젝트의 애플리케이션만 서고 지금 것이 aria-current 다', () => {
    띄운다(웹);

    const 단추들 = within(줄()).getAllByRole('button');
    expect(단추들.map((it) => it.getAttribute('aria-label'))).toEqual(['데모마켓 웹 · 웹', '데모마켓 앱 · Android 앱']);
    expect(단추들.map((it) => it.getAttribute('aria-current'))).toEqual(['page', null]);
    expect(단추들.map((it) => it.textContent)).toEqual(['ZRA', 'ZRB']);
  });

  it('다른 애플리케이션을 누르면 그 접두사로 onService 가 불리고 브라우저에 적어 둔다', () => {
    const 바꿈 = vi.fn();
    띄운다(웹, { onService: 바꿈 });

    fireEvent.click(screen.getByRole('button', { name: '데모마켓 앱 · Android 앱' }));

    expect(바꿈).toHaveBeenCalledWith('ZRB');
    expect(localStorage.getItem('고른서비스')).toBe('ZRB');
  });

  it('종류마다 아이콘이 서고 웹도 있다', () => {
    띄운다(웹);

    for (const 단추 of within(줄()).getAllByRole('button')) expect(단추.querySelector('svg')).not.toBeNull();
  });

  it('「+」 는 설정을 열 수 있는 사람에게만 서고 설정 마법사로 간다', () => {
    띄운다(웹, { role: 'admin' });
    const 더하기 = within(줄()).getByRole('link', { name: '애플리케이션 추가' });
    expect(더하기.getAttribute('href')).toBe('#/settings/new');
    cleanup();

    띄운다(웹, { role: 'member' });
    expect(within(줄()).queryByRole('link', { name: '애플리케이션 추가' })).toBeNull();
  });

  it('헤더에는 애플리케이션 고르개도 접두사 칩도 없다', () => {
    띄운다(웹);

    const 헤더 = within(document.querySelector('header.hd') as HTMLElement);
    expect(헤더.queryByRole('combobox', { name: '애플리케이션 선택' })).toBeNull();
    expect(document.querySelector('.hd-svc-code')).toBeNull();
  });
});

describe('사이드바 머리', () => {
  it('이름과 「종류 · 접두사」 가 자리 목록 위에 선다', () => {
    띄운다(앱);

    const 머리 = document.querySelector('.side-app') as HTMLElement;
    expect(머리.querySelector('b')?.textContent).toBe('데모마켓 앱');
    expect(머리.querySelector('small')?.textContent).toBe('Android 앱 · ZRB');
    expect(머리.compareDocumentPosition(document.querySelector('.side-nav') as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('껍데기가 화면 머리에 넣는 애플리케이션 이름', () => {
  it('화면 머리 위치 줄 맨 앞에 애플리케이션 이름이 선다', () => {
    띄운다(앱);

    expect(screen.getByRole('heading', { level: 1, name: '데모마켓 앱 › 테스트 스크립트 › 기능 테스트' })).toBeTruthy();
  });

  it('대시보드에서는 이름이 없다 — 여러 애플리케이션을 모은 화면이다', () => {
    띄운다(앱, { current: '#/dashboard' });

    expect(screen.getByRole('heading', { level: 1, name: '테스트 스크립트 › 기능 테스트' })).toBeTruthy();
  });

  it('설정 · 비밀번호 변경에서도 이름이 없다 — 고른 애플리케이션과 상관없는 화면이다', () => {
    띄운다(앱, { current: '#/settings' });
    expect(screen.getByRole('heading', { level: 1, name: '테스트 스크립트 › 기능 테스트' })).toBeTruthy();
    cleanup();

    띄운다(앱, { current: '#/password' });
    expect(screen.getByRole('heading', { level: 1, name: '테스트 스크립트 › 기능 테스트' })).toBeTruthy();
  });
});
