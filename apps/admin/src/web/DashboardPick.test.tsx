// @vitest-environment jsdom
// 대시보드의 기간 고르기 · 프로젝트 조건과 칸에서 다른 화면으로 내려가는 링크 검사 (도메인/리포팅 §8.12)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api } from './api.js';
import { Dashboard } from './Dashboard.js';
import { 실행목록주소, 조건을주소로, 주소에서조건, 창실패종류 } from './DashboardPick.js';

const 시간대 = Intl.DateTimeFormat().resolvedOptions().timeZone;
const 건 = (pass: number, fail: number, notRun: number) => ({ pass, fail, notRun });
const 기본재료 = { 케이스갈수있나: true, 설정갈수있나: false, 프로젝트: null };

function 신규(runId: number, tcId: string, serviceId: number, kind: 'UI' | 'FN') {
  return {
    runId,
    serviceId,
    serviceName: serviceId === 1 ? 'ZDA 결제' : 'ZDA 회원',
    env: 'qa',
    kind,
    tcId,
    tcName: `${tcId} 이름`,
    platform: 'desktop' as const,
    finishedAt: '2026-10-07T05:10:00.000Z',
    reason: null,
    type: 'mismatch' as const,
  };
}

const 앱 = (serviceId: number, name: string): 대시보드응답['project']['apps'][number] => ({
  serviceId,
  name,
  prefix: `ZD${serviceId}`,
  kind: 'SCREEN',
  prd: null,
  cases: { fn: 3, ui: 0 },
  last: 건(2, 1, 0),
  scenarios: 0,
  extra: { pageLcp: null, fps: null, p95Ms: null },
});

function 응답(고침: Partial<대시보드응답> = {}, 일 = 14): 대시보드응답 {
  return {
    window: { tz: 시간대, today: '2026-10-07', days: 일, from: '2026-09-24', previousFrom: '2026-09-10' },
    services: [
      { id: 1, name: 'ZDA 결제' },
      { id: 2, name: 'ZDA 회원' },
    ],
    passRate: { current: 건(90, 8, 2), previous: 건(0, 0, 0) },
    daily: [{ day: '2026-10-07', ...건(9, 1, 0), ui: 건(0, 0, 0) }],
    newFailures: [신규(7, 'ZDA-001', 1, 'FN'), 신규(6, 'ZDA-UI-014', 2, 'UI')],
    byService: [
      {
        serviceId: 1,
        serviceName: 'ZDA 결제',
        current: 건(40, 5, 0),
        currentUi: 건(0, 0, 0),
        previous: 건(0, 0, 0),
        lastRun: { runId: 7, finishedAt: '2026-10-07T05:10:00.000Z', ...건(8, 2, 0) },
        flow: ['P', 'F'],
        newFailureCount: 12,
        resolvedCount: 0,
        compared: true,
      },
    ],
    heatmap: [],
    coverage: [],
    running: [],
    unconfirmed: 0,
    failureTypes: { types: [{ type: 'mismatch', fail: 4, notRun: 0 }, { type: 'timeout', fail: 0, notRun: 0 }], stopped: 0 },
    decisions: [],
    byKind: null,
    aiQuality: null,
    project: {
      apps: [앱(1, 'ZDA 결제'), 앱(2, 'ZDA 회원')],
      e2e: { pass: 0, fail: 0, notRun: 0, total: 0, recent: [] },
      perf: { load: null, pages: null, app: null, game: null },
      decisionItems: [],
    },
    ...고침,
  };
}

beforeEach(() => {
  window.location.hash = '';
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (질의: string) => ({ matches: 질의.includes('reduce'), media: 질의, addEventListener() {}, removeEventListener() {} }),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('기간 고르기 · 프로젝트', () => {
  it('열 때는 14일이고 조건 없이 읽으며 애플리케이션 고르개가 없다 — 대시보드는 프로젝트 요약이다', async () => {
    const 읽기 = vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText(/애플리케이션 2개 · 최근 14일/);
    expect(읽기).toHaveBeenCalledWith(시간대, undefined, {});
    expect(screen.queryByRole('combobox', { name: '애플리케이션' })).toBeNull();
    expect(screen.getByRole('button', { name: '14일' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('고른 프로젝트 번호를 싣고, 프로젝트를 바꾸면 다시 읽는다', async () => {
    const 읽기 = vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    const { rerender } = render(<Dashboard 서비스열기={() => {}} {...기본재료} 프로젝트={10} />);
    await screen.findByText(/최근 14일 · /);
    expect(읽기).toHaveBeenLastCalledWith(시간대, undefined, { project: 10 });
    rerender(<Dashboard 서비스열기={() => {}} {...기본재료} 프로젝트={20} />);
    await act(async () => {});
    expect(읽기).toHaveBeenLastCalledWith(시간대, undefined, { project: 20 });
  });

  it('기간을 고르면 그 길이로 읽고 주소에 남긴다 — 기본값 14 는 주소에서 빠진다', async () => {
    const 읽기 = vi
      .spyOn(api, 'dashboard')
      .mockImplementation(((_tz: string, _only?: string, 조건?: { days?: number }) => Promise.resolve(응답({}, 조건?.days ?? 14))) as typeof api.dashboard);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText(/최근 14일 · /);
    fireEvent.click(screen.getByRole('button', { name: '7일' }));
    expect(await screen.findByText(/애플리케이션 2개 · 최근 7일/)).toBeTruthy();
    expect(읽기).toHaveBeenLastCalledWith(시간대, undefined, { days: 7 });
    expect(window.location.hash).toBe('#/dashboard?days=7');
    fireEvent.click(screen.getByRole('button', { name: '14일' }));
    await screen.findByText(/최근 14일 · /);
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('주소의 기간으로 처음부터 읽는다 — 알아볼 수 없는 값은 기본값이고 옛 주소의 service 는 무시한다', async () => {
    window.location.hash = '#/dashboard?service=1&days=30';
    const 읽기 = vi.spyOn(api, 'dashboard').mockResolvedValue(응답({}, 30) as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText(/애플리케이션 2개 · 최근 30일/);
    expect(읽기).toHaveBeenCalledWith(시간대, undefined, { days: 30 });

    window.location.hash = '#/dashboard?days=9';
    expect(주소에서조건()).toEqual({ 일: 14 });
    expect(조건을주소로({ 일: 7 })).toEqual({ days: '7' });
    expect(조건을주소로({ 일: 14 })).toEqual({});
  });

  it('도는 실행 줄을 새로 받을 때도 같은 조건을 싣는다', async () => {
    window.location.hash = '#/dashboard?days=7';
    vi.useFakeTimers();
    const 읽기 = vi.spyOn(api, 'dashboard').mockResolvedValue(
      응답({ running: [{ runId: 3, serviceId: 1, serviceName: 'ZDA 결제', title: '점검', doneItems: 1, totalItems: 4, failedItems: 0, startedAt: '2026-10-07T04:00:00.000Z' }] }, 7) as never,
    );
    render(<Dashboard 서비스열기={() => {}} {...기본재료} 프로젝트={10} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(읽기).toHaveBeenCalledWith(시간대, 'running', { days: 7, project: 10 });
  });
});

describe('칸에서 내려가기', () => {
  it('회귀 실패의 줄은 그 실행의 실패 카드까지 가는 주소이고, 서랍의 「실행 기록에서 보기」가 그 애플리케이션을 고른다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    vi.spyOn(api, 'run').mockReturnValue(new Promise(() => {}));
    vi.spyOn(api, 'failures').mockReturnValue(new Promise(() => {}));
    const 서비스열기 = vi.fn();
    render(<Dashboard 서비스열기={서비스열기} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '회귀 실패' })).closest('section')!;
    const 기능 = within(칸).getByRole('link', { name: /ZDA-001 이름/ });
    expect(기능.getAttribute('href')).toBe('#/runs/fn?run=7&tc=ZDA-001');
    const UI = within(칸).getByRole('link', { name: /ZDA-UI-014 이름/ });
    expect(UI.getAttribute('href')).toBe('#/runs/ui?run=6&tc=ZDA-UI-014');
    fireEvent.click(UI);
    expect(서비스열기).not.toHaveBeenCalled();
    const 서랍 = document.getElementById('fail-drawer')!;
    const 고리 = within(서랍).getByRole('link', { name: '실행 기록에서 보기' });
    expect(고리.getAttribute('href')).toBe('#/runs/ui?run=6&tc=ZDA-UI-014');
    fireEvent.click(고리);
    expect(서비스열기).toHaveBeenCalledWith(2);
  });

  it('목록이 상한에서 잘렸으면 나머지 건수와 실패한 실행 목록 링크를 단다 · 다 보이면 안 단다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    const { unmount } = render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '회귀 실패' })).closest('section')!;
    expect(within(칸).getByText(/10건 더 있습니다/)).toBeTruthy();
    // 잘린 목록이면 머리 수 뒤에 「+」 — 줄 수만 적으면 전체보다 적게 읽힌다
    expect(칸.querySelector('.num')!.textContent).toBe('2+');
    expect(within(칸).getByRole('link', { name: '실행 기록에서 보기' }).getAttribute('href')).toBe('#/runs/fn?state=failed&days=14');
    unmount();
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답({ byService: 응답().byService.map((서비스) => ({ ...서비스, newFailureCount: 2 })) }) as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 다시 = (await screen.findByRole('heading', { name: '회귀 실패' })).closest('section')!;
    expect(within(다시).queryByText(/더 있습니다/)).toBeNull();
  });

  it('실패 유형 이름은 건수가 있는 줄만 실패한 실행 목록 링크이고 7일 창은 7일 목록으로 간다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답({}, 7) as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByRole('heading', { name: '실패 유형' })).closest('section')!;
    expect(within(칸).getByRole('link', { name: '기대 결과 불일치' }).getAttribute('href')).toBe('#/runs/fn?state=failed&days=7');
    expect(within(칸).queryByRole('link', { name: '타임아웃' })).toBeNull();
  });

  it('UI 테스트만 실패한 창이면 실패한 실행 고리가 UI 테스트 실행 기록으로 간다 — 늘 기능 목록이라 빈 목록이 열렸다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(
      응답({ passRate: { current: 건(9, 1, 0), previous: 건(0, 0, 0) }, daily: [{ day: '2026-10-07', ...건(9, 1, 0), ui: 건(0, 1, 0) }] }) as never,
    );
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 신규칸 = (await screen.findByRole('heading', { name: '회귀 실패' })).closest('section')!;
    expect(within(신규칸).getByRole('link', { name: '실행 기록에서 보기' }).getAttribute('href')).toBe('#/runs/ui?state=failed&days=14');
    const 유형 = screen.getByRole('heading', { name: '실패 유형' }).closest('section')!;
    expect(within(유형).getByRole('link', { name: '기대 결과 불일치' }).getAttribute('href')).toBe('#/runs/ui?state=failed&days=14');
  });

  it('실패 유형 고리는 미실행까지 세어 고른다 — UI 미실행만 있는 창에서 빈 기능 목록으로 가지 않게', () => {
    const 창 = { passRate: { current: 건(5, 0, 2), previous: 건(0, 0, 0) }, daily: [{ day: '2026-10-07', ...건(5, 0, 2), ui: 건(0, 0, 2) }] };
    expect(창실패종류(창, true)).toBe('UI');
    expect(창실패종류(창, false)).toBe('FN');
  });

  it('실행 목록 주소는 창 길이를 그대로 싣는다', () => {
    expect(실행목록주소(7)).toBe('#/runs/fn?days=7');
    expect(실행목록주소(14, { state: 'failed' })).toBe('#/runs/fn?state=failed&days=14');
    expect(실행목록주소(14, { state: 'failed' }, 'UI')).toBe('#/runs/ui?state=failed&days=14');
  });
});
