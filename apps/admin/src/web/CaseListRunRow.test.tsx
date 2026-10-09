// @vitest-environment jsdom
// 케이스 목록 줄의 ▶ 실행 버튼 — 누르면 그 한 건으로 실행 창이 열린다 (도메인/실행 §8.10 · 화면공통 §8)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CaseRow, type Paged, type ServiceRow, type User } from './api.js';
import { CaseList } from './CaseList.js';
import type { 판정 } from './role.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  window.location.hash = '#/cases';
});

function 케이스(tcId: string): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop', 'mobile'],
    precondition: ['로그인되어 있다'],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema: {},
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-09-21T00:00:00.000Z',
  };
}

const 쪽: Paged<CaseRow> = { items: [케이스('ZPK-001'), 케이스('ZPK-002')], total: 2, page: 1, pageSize: 50 };

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPK',
  name: '결제',
  color: '#123456',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 사람: User = { username: 'zpk', displayName: '검사', role: 'member', dashboard: 'read', mustChangePassword: false, services: [서비스] };

async function 그리기(할수: 판정 = () => true) {
  vi.spyOn(api, 'lastScan').mockResolvedValue(null);
  vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  vi.spyOn(api, 'cases').mockResolvedValue(쪽);
  render(<CaseList kind="FN" service="ZPK" 할수={할수} 결과보나 />);
  await screen.findByText('ZPK-001');
}

describe('케이스 줄의 ▶ 실행', () => {
  it('줄마다 이름이 「{tcId} 실행」인 버튼이 있고 링크가 아니다', async () => {
    await 그리기();

    expect(screen.getByRole('button', { name: 'ZPK-001 실행' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ZPK-002 실행' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /실행/ })).toBeNull();
  });

  it('누르면 그 케이스 한 건으로 실행 창이 열린다 — 한 건 모드의 칸이 보인다', async () => {
    await 그리기();

    fireEvent.click(screen.getByRole('button', { name: 'ZPK-002 실행' }));

    const 창 = within(await screen.findByRole('dialog', { name: '실행할 케이스 1건' }));
    expect(창.getByText('ZPK-002 케이스')).toBeTruthy();
    expect(창.queryByText('ZPK-001 케이스')).toBeNull();
    expect((창.getByLabelText('실행 제목') as HTMLInputElement).value).toBe('ZPK-002 실행');
    expect(창.getByText('로그인되어 있다')).toBeTruthy();
    expect(창.getByText('실행자 검사')).toBeTruthy();
  });

  it('창에서 실행하면 그 한 건만 담아 걸고 실행 결과로 간다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 31 });
    await 그리기();
    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 실행' }));
    const 창 = within(await screen.findByRole('dialog', { name: '실행할 케이스 1건' }));

    fireEvent.change(창.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(창.getByRole('button', { name: '실행' }));

    await waitFor(() => expect(window.location.hash).toBe('#/runs/31'));
    expect(걸기.mock.calls[0]?.[0]).toMatchObject({
      env: 'qa',
      title: 'ZPK-001 실행',
      items: [{ tcId: 'ZPK-001', platforms: ['desktop', 'mobile'] }],
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('실행 읽기면 줄마다의 버튼이 없다', async () => {
    await 그리기((무엇) => 무엇 !== '실행');

    expect(screen.queryByRole('button', { name: 'ZPK-001 실행' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ZPK-002 실행' })).toBeNull();
  });
});
