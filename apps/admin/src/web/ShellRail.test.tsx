// @vitest-environment jsdom
// 사이드바 왼쪽 애플리케이션 줄 · 사이드바 머리 · 화면 머리의 애플리케이션 이름 검사 (SPEC 공통/5-화면공통 §8 「껍데기」 · 2026-10-29 시안 B)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { Head } from './Head.js';
import { 언어함 } from './i18n.js';
import { Shell } from './Shell.js';
import { 펼치기까지 } from './ShellRail.js';

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
        <Head 제목="기능 테스트" 위치="테스트 실행" />
      </Shell>
    </언어함>,
  );
}

const 줄 = () => screen.getByRole('navigation', { name: '애플리케이션' });

describe('줄과 메뉴가 같이 맞는 자리', () => {
  it('API 애플리케이션의 테스트 실행은 하위가 없어도 그 목록을 열면 지금 자리로 표시된다', () => {
    vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
    const API앱: ServiceRow = { ...웹, id: 4, prefix: 'ZRD', name: '알림 API', kind: 'API' };
    render(
      <언어함 value="ko">
        <Shell user={{ username: 'zra2', displayName: '김수민', role: 'member', dashboard: 'read', mustChangePassword: false, services: [API앱] }} service={API앱} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/cases/fn">
          <div>본문</div>
        </Shell>
      </언어함>,
    );

    expect(screen.getByRole('link', { name: '테스트 실행' }).getAttribute('aria-current')).toBe('page');
  });

  it('서버가 준 차례와 상관없이 웹 · Android 앱 · 게임 · API 차례로 선다 — 휴대폰 고르개의 묶음 차례와 같다', () => {
    vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
    const API앱: ServiceRow = { ...웹, id: 4, prefix: 'ZRD', name: '알림 API', kind: 'API' };
    const 게임: ServiceRow = { ...웹, id: 5, prefix: 'ZRE', name: '퍼즐', kind: 'GAME' };
    render(
      <언어함 value="ko">
        <Shell user={{ username: 'zra4', displayName: '김수민', role: 'member', dashboard: 'read', mustChangePassword: false, services: [API앱, 게임, 앱, 웹] }} service={웹} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/cases">
          <div>본문</div>
        </Shell>
      </언어함>,
    );

    expect(within(줄()).getAllByRole('button').map((단추) => 단추.querySelector('.rail-code')?.textContent)).toEqual(['ZRA', 'ZRB', 'ZRE', 'ZRD']);
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
    expect(단추들.map((it) => it.querySelector('.rail-code')?.textContent)).toEqual(['ZRA', 'ZRB']);
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

  it('애플리케이션 고르개는 따로 없다 — 줄이 고르개다', () => {
    띄운다(웹);

    expect(screen.queryByRole('combobox', { name: '애플리케이션 선택' })).toBeNull();
  });
});

describe('왼쪽 줄 펼치기 (2026-11-05)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const 왼쪽 = () => document.querySelector('.rail') as HTMLElement;
  const 펼쳤나 = () => 왼쪽().classList.contains('open');

  it('마우스가 0.3초 머물면 펼치고 칸마다 이름 · 종류와 프로젝트 꼬리표가 선다', () => {
    vi.useFakeTimers();
    띄운다(웹);

    fireEvent.mouseEnter(왼쪽());
    act(() => vi.advanceTimersByTime(펼치기까지 - 1));
    expect(펼쳤나()).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(펼쳤나()).toBe(true);

    const 칸 = screen.getByRole('button', { name: '데모마켓 앱 · Android 앱' });
    expect(칸.querySelector('.rail-name b')?.textContent).toBe('데모마켓 앱');
    expect(칸.querySelector('.rail-name small')?.textContent).toBe('Android 앱');
    expect(칸.querySelector('.rail-name')?.getAttribute('aria-hidden')).toBe('true');
    expect(within(줄()).getByText('데모마켓의 애플리케이션')).toBeTruthy();
    expect(within(왼쪽()).getByRole('link', { name: '설정' }).querySelector('.rail-name b')?.textContent).toBe('설정');
  });

  it('0.3초 전에 나가면 펼치지 않는다 — 사이드바 메뉴로 가는 길에 스친 것이다', () => {
    vi.useFakeTimers();
    띄운다(웹);

    fireEvent.mouseEnter(왼쪽());
    act(() => vi.advanceTimersByTime(펼치기까지 - 100));
    fireEvent.mouseLeave(왼쪽());
    act(() => vi.advanceTimersByTime(펼치기까지));
    expect(펼쳤나()).toBe(false);
  });

  it('펼친 뒤 마우스가 나가면 접힌다 — 칸을 눌러 포커스가 남아 있어도 접힌다', () => {
    vi.useFakeTimers();
    띄운다(웹);

    fireEvent.mouseEnter(왼쪽());
    act(() => vi.advanceTimersByTime(펼치기까지));
    const 칸 = screen.getByRole('button', { name: '데모마켓 앱 · Android 앱' });
    fireEvent.focusIn(칸);
    fireEvent.mouseLeave(왼쪽());
    expect(펼쳤나()).toBe(false);
  });

  it('Tab 으로 줄 안에 들어오면 바로 펼치고, 줄 밖으로 나가면 접힌다', () => {
    띄운다(웹);

    const 칸 = screen.getByRole('button', { name: '데모마켓 웹 · 웹' });
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.focusIn(칸);
    expect(펼쳤나()).toBe(true);
    fireEvent.focusOut(칸, { relatedTarget: screen.getByRole('button', { name: '검색' }) });
    expect(펼쳤나()).toBe(false);
  });

  it('코드가 옮긴 포커스(내 메뉴를 Esc 로 닫을 때 등)로는 펼치지 않는다', () => {
    띄운다(웹);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.focusIn(screen.getByRole('button', { name: '내 메뉴 · 김수민' }));
    expect(펼쳤나()).toBe(false);
  });

  it('마우스를 올릴 수 없는 기기에서는 머물기로 펼치지 않는다 — 탭 한 번에 덮은 채 남았다', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (질의: string) => ({ matches: 질의 === '(hover: none)', media: 질의, addEventListener: () => {}, removeEventListener: () => {} }));
    띄운다(웹);

    fireEvent.mouseEnter(왼쪽());
    act(() => vi.advanceTimersByTime(펼치기까지));
    expect(펼쳤나()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('마우스를 올린 채 누르기로 생긴 포커스는 바로 펼치지 않는다 — 머무는 시간이 맡는다', () => {
    vi.useFakeTimers();
    띄운다(웹);

    fireEvent.mouseEnter(왼쪽());
    fireEvent.focusIn(screen.getByRole('button', { name: '데모마켓 앱 · Android 앱' }));
    expect(펼쳤나()).toBe(false);
    act(() => vi.advanceTimersByTime(펼치기까지));
    expect(펼쳤나()).toBe(true);
  });
});

describe('껍데기가 화면 머리에 넣는 애플리케이션 이름', () => {
  it('화면 머리 위치 줄 맨 앞에 애플리케이션 이름이 선다', () => {
    띄운다(앱);

    expect(screen.getByRole('heading', { level: 1, name: '데모마켓 앱 › 테스트 실행 › 기능 테스트' })).toBeTruthy();
  });

  it('대시보드에서는 이름이 없다 — 여러 애플리케이션을 모은 화면이다', () => {
    띄운다(앱, { current: '#/dashboard' });

    expect(screen.getByRole('heading', { level: 1, name: '테스트 실행 › 기능 테스트' })).toBeTruthy();
  });

  it('설정 · 비밀번호 변경에서도 이름이 없다 — 고른 애플리케이션과 상관없는 화면이다', () => {
    띄운다(앱, { current: '#/settings' });
    expect(screen.getByRole('heading', { level: 1, name: '테스트 실행 › 기능 테스트' })).toBeTruthy();
    cleanup();

    띄운다(앱, { current: '#/password' });
    expect(screen.getByRole('heading', { level: 1, name: '테스트 실행 › 기능 테스트' })).toBeTruthy();
  });
});
