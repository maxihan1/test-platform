// 한 건 실행 창 테스트 둘이 같이 쓰는 케이스 · 서비스 · 사람과 그리기 도우미

import { vi } from 'vitest';
import { act, render } from '@testing-library/react';

import { api, type CaseRow, type ServiceRow, type User } from './api.js';
import { RunPickModal } from './RunPickModal.js';

export const 케이스: CaseRow = {
  tcId: 'ZRS-001',
  name: '실행 설정 케이스',
  platforms: ['desktop'],
  precondition: ['로그인되어 있다'],
  filePath: 'tests/ZRS-001.spec.ts',
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-09-21T00:00:00.000Z',
};

export const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZRS',
  name: '실행 서비스',
  color: '#3A5FCD',
  envs: [
    { env: 'qa', baseUrl: 'https://qa.example.com' },
    { env: 'stage', baseUrl: 'https://stage.example.com' },
  ],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

export const 사람: User = {
  username: 'zrs1',
  displayName: '김실행',
  role: 'member',
  dashboard: 'read',
  mustChangePassword: false,
  services: [서비스],
};

export const 읽기만: User = { ...사람, services: [{ ...서비스, permissions: { cases: 'read', runs: 'write', authoring: 'write' } }] };

export const 비밀스키마 = {
  type: 'object',
  properties: { password: { type: 'string', description: '비밀번호' } },
  required: ['password'],
};

export const 저장값케이스: CaseRow = {
  ...케이스,
  paramSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string', description: '아이디', default: 'guest' },
      password: { type: 'string', description: '비밀번호' },
    },
  },
  savedInput: { params: { userId: 'user1' }, expected: {}, savedSecrets: { params: ['password'], expected: [] }, savedBy: '맥시', savedAt: '2026-09-29T05:02:00.000Z' },
};

export async function 그린다(row: CaseRow = 케이스, 누구: User = 사람, 덮어쓸: { 초기서버?: string } = {}) {
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  const onRun = vi.fn();
  const on다시읽기 = vi.fn();
  render(<RunPickModal 케이스들={[row]} service={서비스} user={누구} onRun={onRun} on다시읽기={on다시읽기} onClose={vi.fn()} {...덮어쓸} />);
  await act(async () => {});
  return { onRun, on다시읽기 };
}
