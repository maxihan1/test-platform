// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { btsApi } from './btsApi.js';
import { 떠나기막기 } from './leaveGuard.js';
import { Settings } from './Settings.js';
import { 물음누름 } from './startConfirm.fixture.js';
import { 계정, 사람, 서비스, 펼친다 } from './Settings.fixture.js';

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
  const 프로젝트탭들 = () => screen.getAllByRole('tab').map((el) => [el.querySelector('.set-tab-name')?.textContent, el.getAttribute('href'), el.getAttribute('aria-selected')]);

  it('프로젝트 설정은 탭 셋이고 탭은 주소 링크다 — project-<번호> 는 기본 정보를 연다', async () => {
    펼친다('project-1');
    expect(await screen.findByRole('heading', { name: /데모마켓/ })).toBeTruthy();

    expect(screen.getByRole('tablist', { name: '프로젝트 설정' })).toBeTruthy();
    expect(프로젝트탭들()).toEqual([
      ['기본 정보', '#/settings/project-1', 'true'],
      ['Issue Bunker 연결', '#/settings/project-1-bts', 'false'],
      ['API 서버', '#/settings/project-1-api', 'false'],
    ]);
    expect(screen.getByLabelText('프로젝트 이름')).toBeTruthy();
    expect(screen.getByText('애플리케이션 옮기기', { selector: 'h3' })).toBeTruthy();
  });

  it('project-<번호>-bts 는 Issue Bunker 연결 탭을 연다 — 탭과 겹치는 「프로젝트 › Issue Bunker 연결」 머리는 없다', async () => {
    const 읽음 = vi.spyOn(btsApi, 'get').mockResolvedValue({
      linked: false, baseUrl: null, btsProject: null, botUsername: null, statusMap: {}, resolutionMap: {}, deployKey: null, ruleToken: null, publicUrl: null,
    });
    펼친다('project-1-bts');

    expect(await screen.findByLabelText('Issue Bunker 주소')).toBeTruthy();
    expect(읽음).toHaveBeenCalledWith(1);
    expect(프로젝트탭들().map((it) => it[2])).toEqual(['false', 'true', 'false']);
    expect(screen.queryByRole('heading', { name: '데모마켓 › Issue Bunker 연결' })).toBeNull();
    // 프로젝트 이름 머리는 탭 위에 그대로다
    expect(screen.getByRole('heading', { level: 2, name: /데모마켓/ })).toBeTruthy();
  });

  it('project-<번호>-api 는 API 서버 탭을 연다', async () => {
    const 읽음 = vi.spyOn(api, 'projectApiServers').mockResolvedValue({ items: [{ host: 'api.example.com', name: null, cases: 3 }] });
    펼친다('project-1-api');

    expect(await screen.findByText('api.example.com')).toBeTruthy();
    expect(읽음).toHaveBeenCalledWith(1);
    expect(프로젝트탭들().map((it) => it[2])).toEqual(['false', 'false', 'true']);
    expect(screen.queryByRole('textbox', { name: '프로젝트 이름' })).toBeNull();
  });

  it('프로젝트 탭의 화살표 키는 옆 탭 주소로 간다', async () => {
    펼친다('project-1');
    await screen.findByRole('heading', { name: /데모마켓/ });

    fireEvent.keyDown(screen.getAllByRole('tab')[0]!, { key: 'ArrowRight' });
    expect(window.location.hash).toBe('#/settings/project-1-bts');
    window.history.replaceState(null, '', '#/');
  });

  it('없는 프로젝트 번호면 그 사실을 적는다', async () => {
    펼친다('project-99');

    expect(await screen.findByText('그 프로젝트를 찾지 못했습니다')).toBeTruthy();
  });

  it('프로젝트 이름을 바꾸면 프로젝트 · 애플리케이션 · 계정을 다시 읽고 껍데기 재료도 다시 읽는다', async () => {
    const 고침 = vi.spyOn(api, 'updateProject').mockResolvedValue({ ok: true });
    const 내재료 = vi.fn();
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [계정] });
    render(<Settings user={사람('admin')} onMeChanged={내재료} 자리="project-1" />);
    fireEvent.change(await screen.findByLabelText('프로젝트 이름'), { target: { value: '데모몰' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledWith(1, { name: '데모몰' }));
    expect(내재료).toHaveBeenCalled();
  });
});
