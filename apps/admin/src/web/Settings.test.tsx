// @vitest-environment jsdom
// 설정 화면의 틀 검사 (SPEC §8.8, 2026-09-22 신설).
//
// **이 화면에는 그물이 없었다.** 안쪽 조각들(서비스·계정·비밀번호)은 각자 검사가 있는데
// 틀에는 없어서, 등급이 낮은 사람에게 무엇을 보여주는지를 아무도 안 보고 있었다.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { api, type User } from './api.js';
import { btsApi } from './btsApi.js';
import { 고른서비스를적는다 } from './layout.js';
import { 떠나기막기 } from './leaveGuard.js';
import { Settings } from './Settings.js';
import { 계정, 둘째, 사람, 서비스, 펼친다 } from './Settings.fixture.js';

beforeEach(() => {
  vi.spyOn(api, 'settingsProjects').mockResolvedValue({ items: [{ id: 1, name: '데모마켓' }] });
});

afterEach(() => {
  떠나기막기(null);
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

function 그리기(role: User['role'] = 'admin') {
  vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
  vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
  return render(<Settings user={사람(role)} onMeChanged={() => undefined} />);
}

describe('설정 화면의 틀', () => {
  it('제목이 h1 이고 본문 면 바깥에 선다', async () => {
    const { container } = 그리기();
    await waitFor(() => expect(container.querySelector('.head')).not.toBeNull());

    expect(container.querySelector('.head h1')?.textContent).toBe('설정');
    expect(container.querySelector('.screen .head')).toBeNull();
  });

  it('머리 부제가 이 자리의 등급을 알린다', async () => {
    const { container } = 그리기();
    await waitFor(() => expect(container.querySelector('.head')).not.toBeNull());

    expect(container.querySelector('.head')?.textContent).toContain('관리자만');
  });

  it('관리자가 아니면 이유를 말하고 머리를 그리지 않는다', () => {
    const { container } = 그리기('member');

    // 서버 gate.ts 가 이미 막지만 주소를 직접 친 사람에게 403 대신 이유를 보여준다 (SPEC §8.8)
    expect(screen.getByText(/관리자만 볼 수 있습니다/)).toBeTruthy();
    expect(container.querySelector('.head')).toBeNull();
  });
});

describe('설정 안 메뉴 (도메인/인증 §8.8 · 2026-10-09 시안 A)', () => {
  const 셋 = () => {
    vi.spyOn(api, 'settingsProjects').mockResolvedValue({
      items: [
        { id: 1, name: '데모마켓' },
        { id: 2, name: '사내 포털' },
      ],
    });
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스, { ...둘째, projectId: 2, projectName: '사내 포털' }, { ...둘째, id: 3, prefix: 'ZSV', name: 'ZSV 애플리케이션' }] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
  };
  const 링크들 = (메뉴: HTMLElement) => [...메뉴.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.closest('[role="group"]')?.getAttribute('aria-label') ?? null]);

  it('메뉴는 프로젝트를 다 보이고 지금 프로젝트의 애플리케이션만 들여 써 펼친다 — 프로젝트 추가 · 애플리케이션 추가 · 계정이 뒤따르고 Issue Bunker 연결 줄은 없다', async () => {
    셋();
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} />);
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });

    expect(링크들(메뉴)).toEqual([
      ['#/settings/project-1', null],
      ['#/settings/ZST', '데모마켓'],
      ['#/settings/ZSV', '데모마켓'],
      ['#/settings/project-2', null],
      ['#/settings/project-new', null],
      ['#/settings/new', null],
      ['#/settings/users', null],
      ['#/settings/perf-agents', null],
    ]);
    expect(메뉴.querySelector('a[href$="-bts"]')).toBeNull();
    expect([...메뉴.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['프로젝트', '사람', '성능 테스트']);
  });

  it('펼친 프로젝트는 ▾, 접힌 프로젝트는 ▸ 이고 오른쪽에 애플리케이션 수가 선다. 접힌 줄은 그 프로젝트 설정으로 가는 링크다', async () => {
    셋();
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} />);
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });

    const 펼침 = 메뉴.querySelector('a[href="#/settings/project-1"]')!;
    const 접힘 = 메뉴.querySelector('a[href="#/settings/project-2"]')!;
    expect(펼침.querySelector('.set-nav-caret')?.textContent).toBe('▾');
    expect(펼침.getAttribute('aria-expanded')).toBe('true');
    expect(접힘.querySelector('.set-nav-caret')?.textContent).toBe('▸');
    expect(접힘.getAttribute('aria-expanded')).toBe('false');
    expect(펼침.querySelector('.set-nav-sub')?.textContent).toBe('애플리케이션 2개');
    expect(접힘.querySelector('.set-nav-sub')?.textContent).toBe('애플리케이션 1개');
  });

  it('지금 프로젝트는 고른 애플리케이션의 프로젝트다', async () => {
    셋();
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZSU" />);
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });

    expect(링크들(메뉴).slice(0, 3)).toEqual([
      ['#/settings/project-1', null],
      ['#/settings/project-2', null],
      ['#/settings/ZSU', '사내 포털'],
    ]);
  });

  it('프로젝트 화면이면 그 프로젝트를 펼치고 그 줄이 지금 자리다 — Issue Bunker 연결 화면도 같다', async () => {
    vi.spyOn(btsApi, 'get').mockResolvedValue({
      linked: false, baseUrl: null, btsProject: null, botUsername: null, statusMap: {}, resolutionMap: {}, deployKey: null, ruleToken: null, publicUrl: null,
    });
    셋();
    const { unmount } = render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="project-2" />);
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });
    expect(링크들(메뉴).slice(0, 3)).toEqual([
      ['#/settings/project-1', null],
      ['#/settings/project-2', null],
      ['#/settings/ZSU', '사내 포털'],
    ]);
    expect(메뉴.querySelector('a[href="#/settings/project-2"]')?.getAttribute('aria-current')).toBe('page');
    unmount();

    셋();
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="project-2-bts" />);
    const 연결메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });
    expect(연결메뉴.querySelector('a[href="#/settings/project-2"]')?.getAttribute('aria-current')).toBe('page');
  });

  it('계정 같은 화면이면 맨 위에서 보던 애플리케이션의 프로젝트를 펼친다', async () => {
    셋();
    고른서비스를적는다('ZSU');
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="users" />);
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });

    expect(링크들(메뉴).slice(0, 3)).toEqual([
      ['#/settings/project-1', null],
      ['#/settings/project-2', null],
      ['#/settings/ZSU', '사내 포털'],
    ]);
  });

  it('프로젝트 줄에 그 안의 애플리케이션 수가 선다', async () => {
    펼친다();
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });

    expect(메뉴.querySelector('a[href="#/settings/project-1"]')?.textContent).toContain('애플리케이션 2개');
  });

  it('project-<번호> 면 그 프로젝트를, project-new 면 프로젝트 마법사를 연다', async () => {
    const { unmount } = 펼친다('project-1');
    expect(await screen.findByRole('heading', { name: /데모마켓/ })).toBeTruthy();
    expect((screen.getByLabelText('프로젝트 이름') as HTMLInputElement).value).toBe('데모마켓');
    unmount();

    펼친다('project-new');
    expect(await screen.findByRole('dialog', { name: '새 프로젝트' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '+ 프로젝트 추가' }).getAttribute('aria-current')).toBe('page');
  });
});
