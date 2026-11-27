// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type SettingsServiceRow, type User } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { Settings } from './Settings.js';
import { 물음누름 } from './startConfirm.fixture.js';
import { 탭열기 } from './SettingsTabs.fixture.js';

afterEach(() => {
  떠나기막기(null);
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZSD',
  name: 'ZSD 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  testsRepo: 'https://zsd.example.com',
  testsDir: 'zsd',
  isActive: true,
  envs: [{ env: 'qa', baseUrl: 'https://qa.zsd.example.com' }],
  hasSlackWebhook: false,
  caseCount: 0,
};

const 운영자: User = { username: 'zsd1', displayName: '김비활', role: 'admin', dashboard: 'read', mustChangePassword: false, services: [] };

describe('비활성화는 다른 탭에 적어 둔 저장 안 한 값을 지우지 않는다 (도메인/인증 §8.8 「서비스 비활성화는 저장 버튼과 따로 둔다」)', () => {
  it('실행 탭에서 고친 대상 서버 주소 · 더한 서버 줄이 비활성화 뒤에도 남는다', async () => {
    vi.spyOn(api, 'settingsProjects').mockResolvedValue({ items: [{ id: 1, name: '데모마켓' }] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [] });
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const 목록 = vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    render(<Settings user={운영자} onMeChanged={() => undefined} 자리="ZSD" />);
    await screen.findByRole('heading', { name: /ZSD 애플리케이션/ });

    탭열기('실행');
    fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 'https://qa2.zsd.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '+ 대상 서버 추가' }));
    fireEvent.change(screen.getByLabelText('대상 서버 2 키'), { target: { value: 'stg' } });
    탭열기('기본 정보');
    목록.mockResolvedValue({ items: [{ ...서비스, isActive: false }] });
    fireEvent.click(screen.getByRole('button', { name: '비활성화' }));
    물음누름('비활성화');

    expect(await screen.findByRole('button', { name: '다시 활성화' })).toBeTruthy();
    expect(고침).toHaveBeenCalledWith(1, { isActive: false });
    탭열기('실행');
    expect((screen.getByLabelText('대상 서버 1 주소') as HTMLInputElement).value).toBe('https://qa2.zsd.example.com');
    expect((screen.getByLabelText('대상 서버 2 키') as HTMLInputElement).value).toBe('stg');
  });
});
