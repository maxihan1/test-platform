// @vitest-environment jsdom
// 케이스 목록 줄의 디바이스마다 ▶ — 누르면 그 한 건을 그 디바이스로 실행 창이 열린다 (도메인/실행 §8.10 · 화면공통 §8 · 시안 ①)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CaseRow, type Paged, type ServiceRow, type User } from './api.js';
import { CaseList } from './CaseList.js';
import type { 판정 } from './role.js';
import { 시작누름 } from './runPick.fixture.js';
import { 지켜보는실행, 지켜본다 } from './runWatchStore.js';

afterEach(() => {
  cleanup();
  지켜본다(null);
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
  color: '#123456', projectId: 1, projectName: '데모마켓',
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

describe('케이스 줄의 디바이스마다 ▶ 실행', () => {
  it('줄의 디바이스 칸마다 「{tcId} {디바이스} 실행」 버튼이 있고 링크가 아니다', async () => {
    await 그리기();

    for (const 이름 of ['ZPK-001 PC 실행', 'ZPK-001 모바일 실행', 'ZPK-002 PC 실행', 'ZPK-002 모바일 실행']) {
      expect(screen.getByRole('button', { name: 이름 })).toBeTruthy();
    }
    expect(screen.queryByRole('link', { name: /실행/ })).toBeNull();
  });

  it('「모바일 ▶」를 누르면 그 한 건이 모바일 하나로 열린다 — 디바이스 체크칸은 모바일 하나로 잠기고 실행 기기 칸이 있다', async () => {
    await 그리기();

    fireEvent.click(screen.getByRole('button', { name: 'ZPK-002 모바일 실행' }));

    const 창 = within(await screen.findByRole('dialog', { name: '케이스 1건 실행' }));
    expect(창.getByText('ZPK-002 케이스')).toBeTruthy();
    expect(창.queryByText('ZPK-001 케이스')).toBeNull();
    expect(창.getByText('로그인되어 있다')).toBeTruthy();
    expect((창.getByRole('checkbox', { name: '모바일 1건' }) as HTMLInputElement).disabled).toBe(true);
    expect(창.queryByRole('checkbox', { name: 'PC 1건' })).toBeNull();
    expect(창.getByRole('radio', { name: '가상 디바이스' })).toBeTruthy();
  });

  it('「PC ▶」로 연 창에서 실행하면 그 한 건을 PC 로만 걸고 실행 기기 값을 싣지 않는다', async () => {
    const 걸기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 31 });
    await 그리기();
    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 PC 실행' }));
    const 창 = within(await screen.findByRole('dialog', { name: '케이스 1건 실행' }));
    expect(창.queryByRole('radio', { name: '가상 디바이스' })).toBeNull();

    fireEvent.change(창.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(창.getByRole('button', { name: '실행' }));
    시작누름();

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=31'));
    // 실행 기록으로 옮기고 진행 창도 바로 연다 — 앞 판은 「N/12 완료」를 눌러야 열렸다 (점검표 B7)
    expect(지켜보는실행()).toEqual({ runId: 31, 열림: true });
    expect(걸기.mock.calls[0]?.[0]).toMatchObject({ env: 'qa', items: [{ tcId: 'ZPK-001', platforms: ['desktop'] }] });
    expect(걸기.mock.calls[0]?.[0]).not.toHaveProperty('mobileOn');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('실행 읽기면 줄의 ▶ 가 없다', async () => {
    await 그리기((무엇) => 무엇 !== '실행' && 무엇 !== '테스트실행');

    expect(screen.queryByRole('button', { name: /^ZPK-00\d .* 실행$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^전체 (시험 )?실행 \(/ })).toBeNull();
  });

  it('실행 테스트만이면 줄 · 머리 단추가 시험 실행이고 창에는 「시험 실행」만 있다', async () => {
    await 그리기((무엇) => 무엇 !== '실행');

    expect(screen.queryByRole('button', { name: 'ZPK-001 PC 실행' })).toBeNull();
    expect(screen.getByRole('button', { name: '전체 시험 실행 (2)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ZPK-001 PC 시험 실행' }));

    const 창 = within(await screen.findByRole('dialog', { name: '케이스 1건 시험 실행' }));
    expect(창.getByRole('button', { name: '시험 실행' })).toBeTruthy();
    expect(창.queryByRole('button', { name: '실행' })).toBeNull();
  });
});
