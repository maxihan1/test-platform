// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsProject, type SettingsServiceRow, type User } from './api.js';
import { btsApi, type BTS연결 } from './btsApi.js';
import { Settings } from './Settings.js';
import { ProjectPanel } from './SettingsProject.js';
import { 물음누름 } from './startConfirm.fixture.js';

const 운영자: User = { username: 'zpt1', displayName: '김탭', role: 'admin', dashboard: 'read', mustChangePassword: false, services: [] };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 프로젝트: SettingsProject = { id: 7, name: '탭 프로젝트' };
const 앱: SettingsServiceRow = {
  id: 71, prefix: 'ZPT', name: '탭 앱', color: '#3A5FCD', projectId: 7, projectName: '탭 프로젝트',
  envs: [], hasSlackWebhook: false, testsRepo: '', testsDir: 'zpt', isActive: true, caseCount: 0, codeRepos: [],
};
const 빈연결: BTS연결 = {
  linked: false, baseUrl: null, btsProject: null, botUsername: null, statusMap: {}, resolutionMap: {}, deployKey: null, ruleToken: null, publicUrl: null,
};

const 그린다 = (탭: 'basic' | 'bts' | 'api') => <ProjectPanel row={프로젝트} projects={[프로젝트]} services={[앱]} onDone={() => {}} 탭={탭} />;

describe('프로젝트 설정 탭은 한 번 열면 붙여 둔다 (도메인/인증 §8.8 「프로젝트」 · 2026-11-27)', () => {
  it('Issue Bunker 연결 탭에 적던 값이 API 서버 탭에 갔다 와도 남고, 연결 정보는 한 번만 불러온다', async () => {
    const 연결읽기 = vi.spyOn(btsApi, 'get').mockResolvedValue(빈연결);
    vi.spyOn(api, 'projectApiServers').mockResolvedValue({ items: [] });
    const { rerender } = render(그린다('bts'));
    const 주소칸 = (await screen.findByLabelText('Issue Bunker 주소')) as HTMLInputElement;
    fireEvent.change(주소칸, { target: { value: 'https://bunker.example.com' } });

    rerender(그린다('api'));
    expect(screen.queryByRole('textbox', { name: 'Issue Bunker 주소' })).toBeNull();
    rerender(그린다('bts'));

    expect((screen.getByRole('textbox', { name: 'Issue Bunker 주소' }) as HTMLInputElement).value).toBe('https://bunker.example.com');
    expect(연결읽기).toHaveBeenCalledTimes(1);
  });

  it('기본 정보 탭에서 프로젝트 이름을 저장해도 Issue Bunker 연결 탭에 적던 값이 남는다 — 저장 뒤 설정 틀이 패널을 다시 그리지 않는다', async () => {
    vi.spyOn(btsApi, 'get').mockResolvedValue(빈연결);
    vi.spyOn(api, 'settingsProjects').mockResolvedValue({ items: [프로젝트] });
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [앱] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [] });
    const 저장 = vi.spyOn(api, 'updateProject').mockResolvedValue({ ok: true });
    const 틀 = (자리: string) => <Settings user={운영자} onMeChanged={() => undefined} 자리={자리} />;
    const { rerender } = render(틀('project-7-bts'));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Issue Bunker 주소' }), { target: { value: 'https://bunker.example.com' } });

    rerender(틀('project-7'));
    fireEvent.change(screen.getByRole('textbox', { name: '프로젝트 이름' }), { target: { value: '바꾼 프로젝트' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');
    await waitFor(() => expect(저장).toHaveBeenCalled());
    await waitFor(() => expect(api.settingsProjects).toHaveBeenCalledTimes(2));
    rerender(틀('project-7-bts'));

    expect((screen.getByRole('textbox', { name: 'Issue Bunker 주소' }) as HTMLInputElement).value).toBe('https://bunker.example.com');
  });

  it('열지 않은 탭은 불러오지 않는다 — 기본 정보만 본 사람에게 Issue Bunker · API 서버 요청이 가지 않는다', () => {
    const 연결읽기 = vi.spyOn(btsApi, 'get').mockResolvedValue(빈연결);
    const 서버읽기 = vi.spyOn(api, 'projectApiServers').mockResolvedValue({ items: [] });
    render(그린다('basic'));

    expect(screen.getByLabelText('프로젝트 이름')).toBeTruthy();
    expect(연결읽기).not.toHaveBeenCalled();
    expect(서버읽기).not.toHaveBeenCalled();
  });
});
