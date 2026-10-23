// @vitest-environment jsdom
// 설정 화면이 새로 만들기 마법사를 여는 길과 다 만든 뒤 (도메인/인증 §8.8 「새로 만들기 마법사」). Settings.test.tsx 가 300줄에 닿지 않게 뗐다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type SettingsServiceRow, type User, type UserRow } from './api.js';
import { useHash, 떠나기막기 } from './leaveGuard.js';
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

function 펼친다(자리?: string) {
  vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
  vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
  return render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리={자리} />);
}

/** 마법사를 웹 애플리케이션 NEW 로 끝까지 넘긴다 — 프로젝트는 미리 골라 둔 것을 쓰고 대상 서버 · 알림은 건너뛴다 */
async function 마법사로만든다() {
  fireEvent.click(await screen.findByRole('button', { name: '다음' }));
  fireEvent.click(within(screen.getByRole('group', { name: '종류' })).getAllByRole('button')[0]!);
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.change(screen.getByLabelText('접두사'), { target: { value: 'NEW' } });
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '새것' } });
  for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.click(screen.getByRole('button', { name: '만들기' }));
  await screen.findByText('새것 애플리케이션을 만들었습니다');
}


describe('설정이 여는 마법사', () => {
  it('프로젝트 마법사로 만들면 프로젝트 · 애플리케이션 · 계정과 맨 위 재료를 다시 읽고 끝 화면에 머문다', async () => {
    const 프로젝트만듦 = vi.spyOn(api, 'createProject').mockResolvedValue({ id: 7 });
    vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    const 내재료 = vi.fn();
    render(<Settings user={사람('admin')} onMeChanged={내재료} 자리="project-new" />);
    fireEvent.change(await screen.findByLabelText('프로젝트 이름'), { target: { value: '새 제품' } });
    await 마법사로만든다();

    expect(프로젝트만듦).toHaveBeenCalledWith('새 제품');
    expect(내재료).toHaveBeenCalled();
    await waitFor(() => expect(목록.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(screen.getByRole('dialog', { name: '새 프로젝트' })).toBeTruthy();
  });

  it('프로젝트가 하나도 없으면 「+ 애플리케이션 추가」도 프로젝트 마법사로 연다 — 넣을 프로젝트가 없다', async () => {
    vi.spyOn(api, 'settingsProjects').mockResolvedValue({ items: [] });
    펼친다('new');

    expect(await screen.findByRole('dialog', { name: '새 프로젝트' })).toBeTruthy();
  });

  it('애플리케이션이 하나도 없으면 마법사를 열고 주소도 마법사로 바꿔 둔다 — 다 만든 뒤 목록을 다시 읽어도 끝 화면이 남게', async () => {
    window.history.replaceState(null, '', '#/settings');
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} />);

    expect(await screen.findByRole('dialog', { name: '새 애플리케이션' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '+ 애플리케이션 추가' }).getAttribute('aria-current')).toBe('page');
    await waitFor(() => expect(window.location.hash).toBe('#/settings/new'));
  });

  it('마법사 끝 화면의 「설정 열기」는 목록을 다시 읽은 뒤에 새 애플리케이션 주소로 옮긴다', async () => {
    window.location.hash = '#/settings/new';
    vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리="new" />);
    목록.mockResolvedValue({ items: [서비스, { ...서비스, id: 9, prefix: 'NEW', name: '새것' }] });
    await 마법사로만든다();

    fireEvent.click(screen.getByRole('button', { name: '설정 열기' }));
    await waitFor(() => expect(window.location.hash).toBe('#/settings/NEW'));
    expect(목록.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('「테스트 작성 시작」은 맨 위 고르개를 새 애플리케이션으로 바꾸고 테스트 작성으로 간다', async () => {
    window.location.hash = '#/settings/new';
    vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    const 고름 = vi.fn();
    const 배정됨: User = {
      ...사람('admin'),
      services: [{ id: 9, prefix: 'NEW', name: '새것', color: '#3A5FCD', projectId: 1, projectName: '데모마켓', envs: [], hasSlackWebhook: false, permissions: { cases: 'write', runs: 'write', authoring: 'write' } }],
    };
    render(<Settings user={배정됨} onMeChanged={() => undefined} 자리="new" on서비스번호={고름} />);
    await 마법사로만든다();

    fireEvent.click(screen.getByRole('button', { name: '테스트 작성 시작' }));
    expect(고름).toHaveBeenCalledWith(9);
    expect(window.location.hash).toBe('#/authoring');
  });
});

function 주소보기() {
  return <p data-testid="hash">{useHash()}</p>;
}

describe('새 애플리케이션을 만든 뒤 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)', () => {
  it('만든 애플리케이션으로 옮겨 가는 길에는 떠나기 상자를 띄우지 않는다', async () => {
    window.history.replaceState(null, '', '#/settings/new');
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    vi.spyOn(api, 'createService').mockResolvedValue({ id: 3 });
    render(
      <>
        <주소보기 />
        <Settings user={사람('admin')} onMeChanged={() => undefined} 자리="new" />
      </>,
    );
    await 마법사로만든다();
    fireEvent.click(screen.getByRole('button', { name: '설정 열기' }));

    await waitFor(() => expect(screen.getByTestId('hash').textContent).toBe('#/settings/NEW'));
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
  });
});
