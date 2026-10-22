// @vitest-environment jsdom
// 설정의 프로젝트 하나 검사 (도메인/인증 §8.8 · 2026-10-19 PRJ-F1-03). 이름 바꾸기 · 애플리케이션 옮기기 — 만들기는 SettingsWizard.test.tsx

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { ProjectPanel } from './SettingsProject.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 프로젝트들 = [
  { id: 1, name: '데모마켓' },
  { id: 2, name: '사내 포털' },
];

function 앱(id: number, prefix: string, name: string, projectId: number): SettingsServiceRow {
  return {
    id,
    prefix,
    name,
    color: '#6B7280',
    projectId,
    projectName: 프로젝트들.find((it) => it.id === projectId)!.name,
    envs: [],
    hasSlackWebhook: false,
    testsRepo: '',
    testsDir: prefix.toLowerCase(),
    isActive: true,
    caseCount: 0,
  };
}

const 서비스들 = [앱(1, 'DEMO', '프론트 페이지', 1), 앱(2, 'DEMOA', '백오피스 어드민', 1), 앱(3, 'HRP', '직원 포털', 2)];

describe('프로젝트 고치기', () => {
  it('이름을 바꿔 저장한다', async () => {
    const 고침 = vi.spyOn(api, 'renameProject').mockResolvedValue({ ok: true });
    const 끝 = vi.fn();
    render(<ProjectPanel row={프로젝트들[0]!} projects={프로젝트들} services={서비스들} onDone={끝} />);

    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: '데모몰' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(끝).toHaveBeenCalled());
    expect(고침).toHaveBeenCalledWith(1, '데모몰');
  });

  it('이 프로젝트의 애플리케이션만 옮길 곳과 함께 늘어선다', () => {
    render(<ProjectPanel row={프로젝트들[0]!} projects={프로젝트들} services={서비스들} onDone={() => {}} />);

    expect(screen.getByText('프론트 페이지')).toBeTruthy();
    expect(screen.getByText('백오피스 어드민')).toBeTruthy();
    expect(screen.queryByText('직원 포털')).toBeNull();
    expect((document.getElementById('pf-move-1') as HTMLSelectElement).value).toBe('1');
  });

  it('옮길 프로젝트를 고르면 그 애플리케이션을 옮기고 설정이 다시 읽는다', async () => {
    const 옮김 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const 끝 = vi.fn();
    render(<ProjectPanel row={프로젝트들[0]!} projects={프로젝트들} services={서비스들} onDone={끝} />);

    fireEvent.change(document.getElementById('pf-move-2')!, { target: { value: '2' } });

    await waitFor(() => expect(끝).toHaveBeenCalled());
    expect(옮김).toHaveBeenCalledWith(2, { projectId: 2 });
  });

  it('애플리케이션이 없는 새 프로젝트는 그렇다고 적는다', () => {
    render(<ProjectPanel row={{ id: 9, name: '빈 제품' }} projects={[...프로젝트들, { id: 9, name: '빈 제품' }]} services={서비스들} onDone={() => {}} />);

    expect(screen.getByText('아직 애플리케이션이 없습니다')).toBeTruthy();
  });

  it('옮기기 구획이 권한이 따라간다는 것을 알린다', () => {
    render(<ProjectPanel row={프로젝트들[0]!} projects={프로젝트들} services={서비스들} onDone={() => {}} />);

    expect(screen.getByText(/옮겨 간 프로젝트의 권한을 따릅니다/)).toBeTruthy();
  });
});
