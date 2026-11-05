// @vitest-environment jsdom
// 사이드바 맨 위 위치 카드 · 위치 판 검사 (SPEC 공통/5-화면공통 §8 「껍데기」 위치 카드 · 위치 판 · 2026-11-05)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { 언어함, type 언어 } from './i18n.js';
import { Shell } from './Shell.js';
import { 들여다보기까지 } from './ShellPlace.js';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

const 웹: ServiceRow = {
  id: 1,
  prefix: 'ZPW',
  name: '데모마켓 웹',
  color: '#3A5FCD',
  projectId: 1,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};
const 알림서버: ServiceRow = { ...웹, id: 2, prefix: 'ZPN', name: '알림 서버', kind: 'API' };
const 앱: ServiceRow = { ...웹, id: 3, prefix: 'ZPA', name: '데모마켓 앱', kind: 'APP' };
const 게임: ServiceRow = { ...웹, id: 4, prefix: 'ZPG', name: 'Ashveil', kind: 'GAME', projectId: 2, projectName: 'Ashveil' };
const 게임서버: ServiceRow = { ...게임, id: 5, prefix: 'ZPS', name: 'Ashveil 서버', kind: 'API' };
// 서버가 준 차례가 종류 차례와 다르다 — 판이 다시 늘어놓는지 본다
const 모두 = [알림서버, 앱, 웹, 게임, 게임서버];

function 띄운다(service: ServiceRow | null, 배정: ServiceRow[] = 모두, 옵션: { role?: User['role']; onService?: (접두사: string) => void; 언어?: 언어 } = {}) {
  vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
  vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [] });
  const user: User = { username: 'zpl1', displayName: '김수민', role: 옵션.role ?? 'admin', dashboard: 'read', mustChangePassword: false, services: 배정 };
  const 말 = 옵션.언어 ?? 'ko';
  return render(
    <언어함 value={말}>
      <Shell user={user} service={service} onService={옵션.onService ?? (() => {})} 언어={말} on언어={() => {}} onLogout={() => {}} current="#/cases">
        <div>본문</div>
      </Shell>
    </언어함>,
  );
}

const 카드 = () => screen.getByRole('button', { name: '데모마켓 › 데모마켓 웹 · 바꾸기' });
const 판열기 = () => {
  fireEvent.click(카드());
  return screen.getByRole('dialog', { name: '프로젝트 · 애플리케이션 고르기' });
};
const 앱줄들 = (판: HTMLElement) => [...판.querySelectorAll('.place-app-row')].map((it) => it.getAttribute('aria-label'));

describe('위치 카드', () => {
  it('로고 아래 · 찾기 위에 서서 프로젝트 이름과 애플리케이션 이름 · 종류 · 접두사를 적는다', () => {
    띄운다(웹);

    const 단추 = 카드();
    expect(단추.closest('.side-col')).not.toBeNull();
    expect(document.querySelector('.side-top')!.compareDocumentPosition(단추) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(단추.compareDocumentPosition(screen.getByRole('button', { name: '찾기' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(단추.querySelector('.place-proj small')?.textContent).toBe('프로젝트');
    expect(단추.querySelector('.place-proj b')?.textContent).toBe('데모마켓');
    expect(단추.querySelector('.place-app-text b')?.textContent).toBe('데모마켓 웹');
    expect(단추.querySelector('.place-app-text small')?.textContent).toBe('웹 · ZPW');
    expect(단추.getAttribute('aria-expanded')).toBe('false');
  });

  it('옛 고르개는 없다 — 프로젝트도 애플리케이션도 카드의 판에서 고른다', () => {
    띄운다(웹);

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(document.querySelector('.side-proj')).toBeNull();
    expect(document.querySelector('.side-app')).toBeNull();
  });

  it('고른 애플리케이션이 없으면 카드 대신 「애플리케이션 없음」 이다', () => {
    띄운다(null, []);

    expect(screen.getByText('애플리케이션 없음')).toBeTruthy();
    expect(document.querySelector('.place-card')).toBeNull();
  });

  it('영어 화면에서도 같은 자리다 — 꼬리표는 단수, 판 제목은 프로젝트 이름을 넣는다', () => {
    띄운다(웹, 모두, { 언어: 'en' });

    const 단추 = screen.getByRole('button', { name: '데모마켓 › 데모마켓 웹 · Switch' });
    expect(단추.querySelector('.place-proj small')?.textContent).toBe('Project');
    fireEvent.click(단추);
    const 판 = screen.getByRole('dialog', { name: 'Choose project and application' });
    expect(within(판).getByText('Applications in 데모마켓')).toBeTruthy();
    expect(within(판).getByText('Projects')).toBeTruthy();
  });
});

describe('위치 판', () => {
  it('누르면 왼쪽에 배정받은 프로젝트, 오른쪽에 지금 프로젝트의 애플리케이션이 웹 · Android 앱 · 게임 · API 차례로 서고 지금 것에 포커스가 간다', () => {
    띄운다(웹);

    const 판 = 판열기();
    expect(카드().getAttribute('aria-expanded')).toBe('true');
    expect([...판.querySelectorAll('.place-proj-row')].map((it) => it.getAttribute('aria-label'))).toEqual(['데모마켓 · 애플리케이션 3개', 'Ashveil · 애플리케이션 2개']);
    expect(within(판).getByRole('button', { name: '데모마켓 · 애플리케이션 3개' }).getAttribute('aria-current')).toBe('true');
    expect(within(판).getByText('데모마켓의 애플리케이션')).toBeTruthy();
    expect(앱줄들(판)).toEqual(['데모마켓 웹 · 웹', '데모마켓 앱 · Android 앱', '알림 서버 · API']);
    const 지금 = within(판).getByRole('button', { name: '데모마켓 웹 · 웹' });
    expect(지금.getAttribute('aria-current')).toBe('page');
    expect(document.activeElement).toBe(지금);
  });

  it('키보드로 열면 지금 애플리케이션에 포커스가 가고, 마우스로 열면 포커스가 카드에 남는다', () => {
    띄운다(웹);
    fireEvent.click(카드(), { detail: 1 });
    expect(document.activeElement).not.toBe(screen.getByRole('dialog').querySelector('[aria-current="page"]'));
  });

  it('프로젝트에 마우스가 머물면 오른쪽 칸만 바뀌고 옮겨 가지 않는다', () => {
    vi.useFakeTimers();
    const 바꿈 = vi.fn();
    띄운다(웹, 모두, { onService: 바꿈 });

    const 판 = 판열기();
    fireEvent.mouseEnter(within(판).getByRole('button', { name: 'Ashveil · 애플리케이션 2개' }));
    act(() => vi.advanceTimersByTime(들여다보기까지));

    expect(within(판).getByText('Ashveil의 애플리케이션')).toBeTruthy();
    expect(앱줄들(판)).toEqual(['Ashveil · 게임', 'Ashveil 서버 · API']);
    expect(within(판).getByRole('button', { name: 'Ashveil · 애플리케이션 2개' }).getAttribute('aria-pressed')).toBe('true');
    expect(바꿈).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '프로젝트 · 애플리케이션 고르기' })).toBeTruthy();
  });

  it('프로젝트 줄을 스치기만 하면 오른쪽 칸이 안 바뀐다 — 대각선으로 애플리케이션을 향해 가는 길이다', () => {
    vi.useFakeTimers();
    띄운다(웹);

    const 판 = 판열기();
    const 지나감 = within(판).getByRole('button', { name: 'Ashveil · 애플리케이션 2개' });
    fireEvent.mouseEnter(지나감);
    act(() => vi.advanceTimersByTime(들여다보기까지 - 20));
    fireEvent.mouseLeave(지나감);
    act(() => vi.advanceTimersByTime(들여다보기까지));
    expect(within(판).getByText('데모마켓의 애플리케이션')).toBeTruthy();
  });

  it('Tab 으로 판 밖에 나가면 닫힌다 — 열린 판이 포커스가 간 메뉴를 덮지 않게', () => {
    띄운다(웹);

    const 판 = 판열기();
    fireEvent.blur(within(판).getByRole('button', { name: '데모마켓 웹 · 웹' }), { relatedTarget: screen.getByRole('button', { name: '찾기' }) });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('다른 프로젝트의 애플리케이션을 누르면 그리로 바꾸고 브라우저에 적어 둔 뒤 판을 닫고 카드로 포커스를 돌린다', () => {
    const 바꿈 = vi.fn();
    띄운다(웹, 모두, { onService: 바꿈 });

    const 판 = 판열기();
    fireEvent.click(within(판).getByRole('button', { name: 'Ashveil · 애플리케이션 2개' }));
    fireEvent.click(within(판).getByRole('button', { name: 'Ashveil · 게임' }));

    expect(바꿈).toHaveBeenCalledWith('ZPG');
    expect(localStorage.getItem('고른서비스')).toBe('ZPG');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(카드());
  });

  it('Esc 를 누르면 닫히고 카드로 포커스가 돌아온다. 바깥을 눌러도 닫힌다', () => {
    띄운다(웹);

    판열기();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(카드());

    판열기();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('프로젝트가 하나뿐이면 왼쪽 칸 없이 애플리케이션만 선다 — 그래도 카드는 눌린다', () => {
    띄운다(웹, [웹, 앱]);

    const 판 = 판열기();
    expect(판.classList.contains('one')).toBe(true);
    expect(판.querySelector('.place-projs')).toBeNull();
    expect(앱줄들(판)).toEqual(['데모마켓 웹 · 웹', '데모마켓 앱 · Android 앱']);
  });

  it('「+ 애플리케이션 추가」 는 설정을 열 수 있는 운영 계정에게만 서고 설정 마법사로 간다', () => {
    띄운다(웹);
    expect(within(판열기()).getByRole('link', { name: '+ 애플리케이션 추가' }).getAttribute('href')).toBe('#/settings/new');
    cleanup();

    띄운다(웹, 모두, { role: 'member' });
    expect(within(판열기()).queryByRole('link', { name: '+ 애플리케이션 추가' })).toBeNull();
  });

  it('표에 없는 종류도 웹으로 읽어 판에서 빠지지 않는다', () => {
    const 모름 = { ...웹, id: 6, prefix: 'ZPI', name: 'iOS 앱', kind: 'IOS' } as unknown as ServiceRow;
    띄운다(웹, [웹, 앱, 모름]);

    expect(앱줄들(판열기())).toEqual(['데모마켓 웹 · 웹', 'iOS 앱 · 웹', '데모마켓 앱 · Android 앱']);
  });
});

describe('왼쪽 줄과 같은 프로젝트를 본다', () => {
  it('왼쪽 줄에는 고른 프로젝트의 애플리케이션만 선다', () => {
    띄운다(게임);

    const 줄 = screen.getByRole('navigation', { name: '애플리케이션' });
    expect(within(줄).getAllByRole('button').map((it) => it.getAttribute('aria-label'))).toEqual(['Ashveil · 게임', 'Ashveil 서버 · API']);
  });
});
