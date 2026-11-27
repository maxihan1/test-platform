// 설정 화면 검사 세 파일(Settings.test · Settings.project.test · Settings.app.test)이 나눠 쓰는 고정 데이터와 그리기 도우미

import { vi } from 'vitest';
import { render } from '@testing-library/react';

import { api, type SettingsServiceRow, type User, type UserRow } from './api.js';
import { Settings } from './Settings.js';

export const 서비스: SettingsServiceRow = {
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

export const 계정: UserRow = {
  username: 'zst1',
  displayName: '김설정',
  role: 'admin',
  dashboard: 'read',
  isActive: true,
  projects: [{ projectId: 1, permissions: { cases: 'read', runs: 'read', authoring: 'read' } }],
};

export function 사람(role: User['role']): User {
  return { username: 'zst1', displayName: '김설정', role, dashboard: 'read', mustChangePassword: false, services: [] };
}

export const 둘째: SettingsServiceRow = { ...서비스, id: 2, prefix: 'ZSU', name: 'ZSU 애플리케이션' };

export function 펼친다(자리?: string, 계정들: UserRow[] = [계정]) {
  vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스, 둘째] });
  vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: 계정들 });
  return render(<Settings user={사람('admin')} onMeChanged={() => undefined} 자리={자리} />);
}
