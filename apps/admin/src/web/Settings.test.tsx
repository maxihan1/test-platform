// @vitest-environment jsdom
// 설정 화면의 틀 검사 (SPEC §8.8, 2026-09-22 신설).
//
// **이 화면에는 그물이 없었다.** 안쪽 조각들(서비스·계정·비밀번호)은 각자 검사가 있는데
// 틀에는 없어서, 등급이 낮은 사람에게 무엇을 보여주는지를 아무도 안 보고 있었다.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsServiceRow, type User, type UserRow } from './api.js';
import { btsApi } from './btsApi.js';
import { 고른서비스를적는다 } from './layout.js';
import { 떠나기막기 } from './leaveGuard.js';
import { Settings } from './Settings.js';

beforeEach(() => {
  vi.spyOn(api, 'settingsProjects').mockResolvedValue({ items: [{ id: 1, name: '데모마켓' }] });
});

afterEach(() => {
  떠나기막기(null);
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZST',
  name: 'ZST 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  testsRepo: 'https://zst.example.com',
  testsDir: 'zst',
  isActive: true,
  envs: [],
  hasSlackWebhook: false,
  caseCount: 0,
};

const 계정: UserRow = {
  username: 'zst1',
  displayName: '김설정',
  role: 'admin',
  dashboard: 'read',
  isActive: true,
  projects: [{ projectId: 1, permissions: { cases: 'read', runs: 'read', authoring: 'read' } }],
};

function 사람(role: User['role']): User {
  return { username: 'zst1', displayName: '김설정', role, dashboard: 'read', mustChangePassword: false, services: [] };
}

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

    expect(container.querySelector('.head')?.textContent).toContain('운영 계정');
  });

  it('운영 계정이 아니면 이유를 말하고 머리를 그리지 않는다', () => {
    const { container } = 그리기('member');

    // 서버 gate.ts 가 이미 막지만 주소를 직접 친 사람에게 403 대신 이유를 보여준다 (SPEC §8.8)
    expect(screen.getByText(/운영 계정만 볼 수 있습니다/)).toBeTruthy();
    expect(container.querySelector('.head')).toBeNull();
  });
});

describe('설정 안 메뉴 (도메인/인증 §8.8 · 2026-10-09 시안 A)', () => {
  const 둘째: SettingsServiceRow = { ...서비스, id: 2, prefix: 'ZSU', name: 'ZSU 애플리케이션' };
  const 대기: UserRow = { ...계정, username: 'zst-new', displayName: '가입자', isApproved: false, projects: [] };

  function 펼친다(자리?: string, 계정들: UserRow[] = [계정]) {
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스, 둘째] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: 계정들 });
    return render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리={자리} />);
  }

  it('메뉴는 프로젝트마다 그 아래에 「BTS 연결」과 그 프로젝트의 애플리케이션이 들여 써 서고, 프로젝트 추가 · 애플리케이션 추가 · 계정이 뒤따른다', async () => {
    vi.spyOn(api, 'settingsProjects').mockResolvedValue({
      items: [
        { id: 1, name: '데모마켓' },
        { id: 2, name: '사내 포털' },
      ],
    });
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스, { ...둘째, projectId: 2, projectName: '사내 포털' }, { ...둘째, id: 3, prefix: 'ZSV', name: 'ZSV 애플리케이션' }] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} />);
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });

    const 링크들 = [...메뉴.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.closest('[role="group"]')?.getAttribute('aria-label') ?? null]);
    expect(링크들).toEqual([
      ['#/settings/project-1', null],
      ['#/settings/project-1-bts', '데모마켓'],
      ['#/settings/ZST', '데모마켓'],
      ['#/settings/ZSV', '데모마켓'],
      ['#/settings/project-2', null],
      ['#/settings/project-2-bts', '사내 포털'],
      ['#/settings/ZSU', '사내 포털'],
      ['#/settings/project-new', null],
      ['#/settings/new', null],
      ['#/settings/users', null],
      ['#/settings/perf-agents', null],
    ]);
    expect([...메뉴.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['프로젝트', '사람', '성능 테스트']);
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

  it('project-<번호>-bts 는 그 프로젝트의 BTS 연결 화면을 연다', async () => {
    const 읽음 = vi.spyOn(btsApi, 'get').mockResolvedValue({
      linked: false, baseUrl: null, btsProject: null, botKeyTail: null, statusMap: {}, resolutionMap: {}, deployKey: null, ruleToken: null, publicUrl: null,
    });
    펼친다('project-1-bts');

    expect(await screen.findByRole('heading', { name: '데모마켓 › BTS 연결' })).toBeTruthy();
    expect(읽음).toHaveBeenCalledWith(1);
  });

  it('없는 프로젝트 번호면 그 사실을 적는다', async () => {
    펼친다('project-99');

    expect(await screen.findByText('그런 프로젝트가 없습니다')).toBeTruthy();
  });

  it('프로젝트 이름을 바꾸면 프로젝트 · 애플리케이션 · 계정을 다시 읽고 껍데기 재료도 다시 읽는다', async () => {
    const 고침 = vi.spyOn(api, 'renameProject').mockResolvedValue({ ok: true });
    const 내재료 = vi.fn();
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={내재료} 자리="project-1" />);
    fireEvent.change(await screen.findByLabelText('프로젝트 이름'), { target: { value: '데모몰' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(고침).toHaveBeenCalledWith(1, '데모몰'));
    expect(내재료).toHaveBeenCalled();
  });

  it('자리가 없으면 첫 애플리케이션을 연다', async () => {
    펼친다();

    expect(await screen.findByRole('heading', { name: /ZST 애플리케이션/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /ZST 애플리케이션/ }).getAttribute('aria-current')).toBe('page');
  });

  it('주소의 접두사로 그 애플리케이션을 연다', async () => {
    펼친다('ZSU');

    expect(await screen.findByRole('heading', { name: /ZSU 애플리케이션/ })).toBeTruthy();
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('ZSU 애플리케이션');
  });

  it('users 면 계정, new 면 애플리케이션 마법사를 연다', async () => {
    const { unmount } = 펼친다('users');
    expect(await screen.findByText('김설정')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    펼친다('new');
    expect(await screen.findByRole('dialog', { name: '새 애플리케이션' })).toBeTruthy();
  });

  it('기다리는 가입 신청이 있을 때만 메뉴에 가입 신청과 그 수가 선다', async () => {
    const { unmount } = 펼친다(undefined, [계정, 대기]);
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });

    const 신청 = [...메뉴.querySelectorAll('a')].find((a) => a.getAttribute('href') === '#/settings/pending');
    expect(신청?.textContent).toContain('가입 신청');
    expect(신청?.textContent).toContain('1');
    unmount();

    펼친다();
    const 다시 = await screen.findByRole('navigation', { name: '설정 메뉴' });
    expect(다시.querySelector('a[href="#/settings/pending"]')).toBeNull();
  });

  it('pending 이면 가입 신청 묶음을 연다', async () => {
    펼친다('pending', [계정, 대기]);

    expect(await screen.findByText('가입자')).toBeTruthy();
    expect(screen.getByRole('button', { name: '수락' })).toBeTruthy();
  });

  it('없는 접두사면 그 사실을 적는다', async () => {
    펼친다('NOPE');

    expect(await screen.findByText('그런 애플리케이션이 없습니다')).toBeTruthy();
  });

  it('주소에 자리가 없으면 맨 위에서 고른 애플리케이션으로 열고 메뉴 표시도 맞는다 — 목록 앞이 아니라도', async () => {
    고른서비스를적는다('ZSU');
    펼친다();

    expect(await screen.findByRole('heading', { name: /ZSU 애플리케이션/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /ZSU 애플리케이션/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /ZST 애플리케이션/ }).getAttribute('aria-current')).toBeNull();
  });

  it('맨 위에서 고른 애플리케이션이 설정 목록에 없으면 첫 애플리케이션으로 연다', async () => {
    고른서비스를적는다('GONE');
    펼친다();

    expect(await screen.findByRole('heading', { name: /ZST 애플리케이션/ })).toBeTruthy();
  });

  it('「저장했습니다」는 저장 단추 줄 안에 선다', async () => {
    vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZST" />);
    await screen.findByRole('heading', { name: /ZST 애플리케이션/ });
    목록.mockResolvedValue({ items: [서비스] });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    const 알림 = await screen.findByText('저장했습니다');
    expect(알림.closest('.set-foot')).not.toBeNull();
  });

  it('손으로 친 소문자 접두사도 그 애플리케이션을 연다 — 접두사는 늘 대문자다', async () => {
    펼친다('zsu');

    expect(await screen.findByRole('heading', { name: /ZSU 애플리케이션/ })).toBeTruthy();
  });

  it('비활성 애플리케이션도 메뉴에 접두사를 남기고 곁에 비활성을 단다', async () => {
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스, { ...둘째, isActive: false }] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} />);

    const 링크 = await screen.findByRole('link', { name: /ZSU 애플리케이션/ });
    expect(링크.textContent).toContain('ZSU · 비활성');
  });

  it('저장하면 새로 읽은 값으로 칸을 다시 그리고 「저장했습니다」를 띄운다 — 적은 비밀값이 칸에 남아 또 가지 않게', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZST" />);
    await screen.findByRole('heading', { name: /ZST 애플리케이션/ });

    fireEvent.click(screen.getByRole('button', { name: 'Slack 웹훅 추가' }));
    fireEvent.change(screen.getByLabelText('Slack 웹훅'), { target: { value: 'https://hooks.slack.com/x' } });
    목록.mockResolvedValue({ items: [{ ...서비스, hasSlackWebhook: true }] });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('저장했습니다')).toBeTruthy();
    expect(고침).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Slack 웹훅')).toBeNull();
  });

  it('비활성화해도 저장 안 한 이름 · Slack 웹훅이 칸에 남고 「저장했습니다」를 띄우지 않는다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZST" />);
    await screen.findByRole('heading', { name: /ZST 애플리케이션/ });

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '고치던 이름' } });
    fireEvent.click(screen.getByRole('button', { name: 'Slack 웹훅 추가' }));
    fireEvent.change(screen.getByLabelText('Slack 웹훅'), { target: { value: 'https://hooks.slack.com/x' } });
    목록.mockResolvedValue({ items: [{ ...서비스, isActive: false }] });
    fireEvent.click(screen.getByRole('button', { name: '비활성화' }));
    fireEvent.click(screen.getByRole('button', { name: '비활성화한다' }));

    expect(await screen.findByRole('button', { name: '다시 활성화' })).toBeTruthy();
    expect(고침).toHaveBeenCalledWith(1, { isActive: false });
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('고치던 이름');
    expect((screen.getByLabelText('Slack 웹훅') as HTMLInputElement).value).toBe('https://hooks.slack.com/x');
    expect(screen.queryByText('저장했습니다')).toBeNull();
  });

});
