// @vitest-environment jsdom
// 웹 애플리케이션의 앱 케이스 여부 훅 검사 — 웹만 읽는다 · 케이스 권한이 없으면 안 읽는다 · 읽기 실패는 없음 (도메인/러너 §5.2 종류 표 결정 6)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

import { api, type CasePage, type ServiceRow, type User } from './api.js';
import { use앱케이스 } from './useAppCases.js';

const 웹: ServiceRow = {
  id: 1,
  prefix: 'ZAC',
  name: '웹',
  color: '#000',
  projectId: 1,
  projectName: '묶음',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'read', runs: 'write', authoring: 'read' },
  kind: 'SCREEN',
};
const 사람 = (서비스: ServiceRow): User => ({ username: 'z', displayName: 'z', role: 'member', dashboard: 'none', services: [서비스] }) as unknown as User;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('use앱케이스', () => {
  it('웹이면 케이스 목록의 hasApp 을 돌려준다', async () => {
    const 읽기 = vi.spyOn(api, 'cases').mockResolvedValue({ items: [], total: 0, hasApp: true } as unknown as CasePage);
    const { result } = renderHook(() => use앱케이스(사람(웹), 웹));
    await waitFor(() => expect(result.current).toBe(true));
    expect(읽기).toHaveBeenCalledWith({ service: 'ZAC' });
  });

  it('Android 앱 · API 이거나 케이스 권한이 없으면 읽지 않고 거짓이다', () => {
    const 읽기 = vi.spyOn(api, 'cases');
    for (const 서비스 of [{ ...웹, kind: 'APP' as const }, { ...웹, kind: 'API' as const }, { ...웹, permissions: { ...웹.permissions, cases: 'none' as const } }]) {
      const { result } = renderHook(() => use앱케이스(사람(서비스), 서비스));
      expect(result.current).toBe(false);
    }
    expect(읽기).not.toHaveBeenCalled();
  });

  it('읽기가 실패하면 메뉴를 세우지 않는다', async () => {
    const 읽기 = vi.spyOn(api, 'cases').mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => use앱케이스(사람(웹), 웹));
    await waitFor(() => expect(읽기).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
