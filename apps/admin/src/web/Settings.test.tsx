// @vitest-environment jsdom
// 설정 화면의 틀 검사 (SPEC §8.8, 2026-09-22 신설).
//
// **이 화면에는 그물이 없었다.** 안쪽 조각들(서비스·계정·비밀번호)은 각자 검사가 있는데
// 틀에는 없어서, 등급이 낮은 사람에게 무엇을 보여주는지를 아무도 안 보고 있었다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

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
  isActive: true,
  services: ['ZST'],
};

function 사람(role: User['role']): User {
  return { username: 'zst1', displayName: '김설정', role, services: [] };
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

    expect(container.querySelector('.head')?.textContent).toContain('운영 등급');
  });

  it('운영 등급이 아니면 이유를 말하고 머리를 그리지 않는다', () => {
    const { container } = 그리기('viewer');

    // 서버 gate.ts 가 이미 막지만 주소를 직접 친 사람에게 403 대신 이유를 보여준다 (SPEC §8.8)
    expect(screen.getByText(/운영 등급만 볼 수 있습니다/)).toBeTruthy();
    expect(container.querySelector('.head')).toBeNull();
  });
});
