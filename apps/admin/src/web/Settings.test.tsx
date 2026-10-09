// @vitest-environment jsdom
// 설정 화면의 틀 검사 (SPEC §8.8, 2026-09-22 신설).
//
// **이 화면에는 그물이 없었다.** 안쪽 조각들(서비스·계정·비밀번호)은 각자 검사가 있는데
// 틀에는 없어서, 등급이 낮은 사람에게 무엇을 보여주는지를 아무도 안 보고 있었다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsServiceRow, type User, type UserRow } from './api.js';
import { Settings } from './Settings.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZST',
  name: 'ZST 서비스',
  color: '#3A5FCD',
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
  services: [{ prefix: 'ZST', permissions: { cases: 'read', runs: 'read', authoring: 'read' } }],
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
  const 둘째: SettingsServiceRow = { ...서비스, id: 2, prefix: 'ZSU', name: 'ZSU 서비스' };
  const 대기: UserRow = { ...계정, username: 'zst-new', displayName: '가입자', isApproved: false, services: [] };

  function 펼친다(자리?: string, 계정들: UserRow[] = [계정]) {
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스, 둘째] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: 계정들 });
    return render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리={자리} />);
  }

  it('메뉴에 서비스마다 · 서비스 추가 · 계정이 주소 링크로 선다', async () => {
    펼친다();
    const 메뉴 = await screen.findByRole('navigation', { name: '설정 메뉴' });

    const 링크들 = [...메뉴.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(링크들).toEqual(['#/settings/ZST', '#/settings/ZSU', '#/settings/new', '#/settings/users']);
  });

  it('자리가 없으면 첫 서비스를 연다', async () => {
    펼친다();

    expect(await screen.findByRole('heading', { name: /ZST 서비스/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /ZST 서비스/ }).getAttribute('aria-current')).toBe('page');
  });

  it('주소의 접두사로 그 서비스를 연다', async () => {
    펼친다('ZSU');

    expect(await screen.findByRole('heading', { name: /ZSU 서비스/ })).toBeTruthy();
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('ZSU 서비스');
  });

  it('users 면 계정, new 면 새 서비스를 연다', async () => {
    const { unmount } = 펼친다('users');
    expect(await screen.findByText('김설정')).toBeTruthy();
    expect(screen.queryByLabelText('접두사')).toBeNull();
    unmount();

    펼친다('new');
    expect(await screen.findByText('새 서비스')).toBeTruthy();
    expect((screen.getByLabelText('접두사') as HTMLInputElement).disabled).toBe(false);
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

    expect(await screen.findByText('그런 서비스가 없습니다')).toBeTruthy();
  });

  it('서비스가 하나도 없으면 새 서비스 칸을 연다 — 첫 운영자가 처음 하는 일이다', async () => {
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} />);

    expect(await screen.findByText('새 서비스')).toBeTruthy();
    expect(screen.getByRole('link', { name: '+ 서비스 추가' }).getAttribute('aria-current')).toBe('page');
    expect((screen.getByLabelText('접두사') as HTMLInputElement).disabled).toBe(false);
  });

  it('손으로 친 소문자 접두사도 그 서비스를 연다 — 접두사는 늘 대문자다', async () => {
    펼친다('zsu');

    expect(await screen.findByRole('heading', { name: /ZSU 서비스/ })).toBeTruthy();
  });

  it('비활성 서비스도 메뉴에 접두사를 남기고 곁에 비활성을 단다', async () => {
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스, { ...둘째, isActive: false }] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} />);

    const 링크 = await screen.findByRole('link', { name: /ZSU 서비스/ });
    expect(링크.textContent).toContain('ZSU · 비활성');
  });

  it('저장하면 새로 읽은 값으로 칸을 다시 그리고 「저장했습니다」를 띄운다 — 적은 비밀값이 칸에 남아 또 가지 않게', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZST" />);
    await screen.findByRole('heading', { name: /ZST 서비스/ });

    fireEvent.click(screen.getAllByRole('button', { name: '넣기' })[0]!);
    fireEvent.change(screen.getByLabelText('Slack 웹훅'), { target: { value: 'https://hooks.slack.com/x' } });
    목록.mockResolvedValue({ items: [{ ...서비스, hasSlackWebhook: true }] });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('저장했습니다')).toBeTruthy();
    expect(고침).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Slack 웹훅')).toBeNull();
  });

  it('새 서비스를 만들면 목록을 다시 읽은 뒤에 그 서비스 주소로 옮긴다', async () => {
    window.location.hash = '#/settings/new';
    vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="new" />);
    await screen.findByText('새 서비스');

    fireEvent.change(screen.getByLabelText('접두사'), { target: { value: 'NEW' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '새것' } });
    fireEvent.change(screen.getByLabelText('테스트 폴더'), { target: { value: 'new' } });
    목록.mockResolvedValue({ items: [서비스, { ...서비스, id: 9, prefix: 'NEW', name: '새것' }] });
    fireEvent.click(screen.getByRole('button', { name: '서비스 추가' }));

    await waitFor(() => expect(window.location.hash).toBe('#/settings/NEW'));
    expect(목록.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
