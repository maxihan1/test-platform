// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type UserRow } from './api.js';
import { 고른서비스를적는다 } from './layout.js';
import { 떠나기막기 } from './leaveGuard.js';
import { Settings } from './Settings.js';
import { 물음누름 } from './startConfirm.fixture.js';
import { 탭열기 } from './SettingsTabs.fixture.js';
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

describe('설정 안 메뉴 (도메인/인증 §8.8 · 2026-10-09 시안 A)', () => {
  const 대기: UserRow = { ...계정, username: 'zst-new', displayName: '가입자', isApproved: false, projects: [] };

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
    expect(screen.getByRole('button', { name: '승인' })).toBeTruthy();
  });

  it('없는 접두사면 그 사실을 적는다', async () => {
    펼친다('NOPE');

    expect(await screen.findByText('그 애플리케이션을 찾지 못했습니다')).toBeTruthy();
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
    물음누름('저장');

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

    탭열기('알림');
    fireEvent.click(screen.getByRole('button', { name: 'Slack 웹훅 추가' }));
    fireEvent.change(screen.getByLabelText('Slack 웹훅'), { target: { value: 'https://hooks.slack.com/x' } });
    목록.mockResolvedValue({ items: [{ ...서비스, hasSlackWebhook: true }] });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    expect(await screen.findByText('저장했습니다')).toBeTruthy();
    expect(고침).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Slack 웹훅')).toBeNull();
    // 패널이 다시 그려져도 보던 탭에 남는다
    expect(screen.getByRole('tab', { name: /^알림/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('보던 탭은 애플리케이션마다 기억한다 — 다른 애플리케이션을 보고 돌아와도 그 탭이다', async () => {
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스, 둘째] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    const { rerender } = render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZST" />);
    await screen.findByRole('heading', { name: /ZST 애플리케이션/ });
    expect(screen.getByRole('tab', { name: /^기본 정보/ }).getAttribute('aria-selected')).toBe('true');

    탭열기('실행');
    rerender(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZSU" />);
    await screen.findByRole('heading', { name: /ZSU 애플리케이션/ });
    expect(screen.getByRole('tab', { name: /^기본 정보/ }).getAttribute('aria-selected')).toBe('true');
    rerender(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZST" />);
    await screen.findByRole('heading', { name: /ZST 애플리케이션/ });
    expect(screen.getByRole('tab', { name: /^실행/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('비활성화해도 저장 안 한 이름 · Slack 웹훅이 칸에 남고 「저장했습니다」를 띄우지 않는다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="ZST" />);
    await screen.findByRole('heading', { name: /ZST 애플리케이션/ });

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '고치던 이름' } });
    탭열기('알림');
    fireEvent.click(screen.getByRole('button', { name: 'Slack 웹훅 추가' }));
    fireEvent.change(screen.getByLabelText('Slack 웹훅'), { target: { value: 'https://hooks.slack.com/x' } });
    탭열기('기본 정보');
    목록.mockResolvedValue({ items: [{ ...서비스, isActive: false }] });
    fireEvent.click(screen.getByRole('button', { name: '비활성화' }));
    물음누름('비활성화');

    expect(await screen.findByRole('button', { name: '다시 활성화' })).toBeTruthy();
    expect(고침).toHaveBeenCalledWith(1, { isActive: false });
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('고치던 이름');
    탭열기('알림');
    expect((screen.getByLabelText('Slack 웹훅') as HTMLInputElement).value).toBe('https://hooks.slack.com/x');
    expect(screen.queryByText('저장했습니다')).toBeNull();
  });

});
