// @vitest-environment jsdom
// 앱 대시보드의 서비스 · 기간 고르기와 칸에서 다른 화면으로 내려가는 링크 검사 (도메인/리포팅 §8.12 · WEB-F4-13)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { api } from './api.js';
import { Dashboard } from './Dashboard.js';
import { 실행목록주소, 조건을주소로, 주소에서조건 } from './DashboardPick.js';

const 시간대 = Intl.DateTimeFormat().resolvedOptions().timeZone;
const 건 = (pass: number, fail: number, notRun: number) => ({ pass, fail, notRun });
const 기본재료 = { 케이스갈수있나: true, 설정갈수있나: false, 작성서비스: [{ id: 1, name: 'ZDA 결제' }, { id: 2, name: 'ZDA 회원' }] };

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

function 응답(고침: Partial<대시보드응답> = {}, 일 = 14): 대시보드응답 {
  return {
    window: { tz: 시간대, today: '2026-10-07', days: 일, from: '2026-09-24', previousFrom: '2026-09-10' },
    services: [
      { id: 1, name: 'ZDA 결제' },
      { id: 2, name: 'ZDA 회원' },
    ],
    passRate: { current: 건(90, 8, 2), previous: 건(0, 0, 0) },
    daily: [{ day: '2026-10-07', ...건(9, 1, 0) }],
    newFailures: [신규(7, 'ZDA-001', 1, 'FN'), 신규(6, 'ZDA-UI-014', 2, 'UI')],
    byService: [
      {
        serviceId: 1,
        serviceName: 'ZDA 결제',
        current: 건(40, 5, 0),
        previous: 건(0, 0, 0),
        lastRun: { runId: 7, finishedAt: '2026-10-07T05:10:00.000Z', ...건(8, 2, 0) },
        flow: ['P', 'F'],
        newFailureCount: 12,
        resolvedCount: 0,
        compared: true,
      },
    ],
    heatmap: [{ tcId: 'ZDA-001', tcName: '카드로 결제한다', failCount: 3, cells: [0, 1] as (0 | 1 | 2)[] }],
    coverage: [],
    running: [],
    unconfirmed: 0,
    failureTypes: { types: [{ type: 'mismatch', fail: 4, notRun: 0 }, { type: 'timeout', fail: 0, notRun: 0 }], stopped: 0 },
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

describe('애플리케이션 · 기간 고르기', () => {
  it('열 때는 전체 애플리케이션 · 14일이고 조건 없이 읽는다', async () => {
    const 읽기 = vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText(/애플리케이션 2개 · 최근 14일/);
    expect(읽기).toHaveBeenCalledWith(시간대, undefined, {});
    expect((screen.getByRole('combobox', { name: '애플리케이션' }) as HTMLSelectElement).value).toBe('');
    expect((screen.getByRole('combobox', { name: '기간' }) as HTMLSelectElement).value).toBe('14');
    expect(window.location.hash).not.toContain('service=');
  });

  it('애플리케이션을 고르면 그 번호로 다시 읽고 주소에 남기며 부제에 애플리케이션 이름이 뜬다', async () => {
    const 읽기 = vi
      .spyOn(api, 'dashboard')
      .mockImplementation(((_tz: string, _only?: string, 조건?: { service?: number; days?: number }) =>
        Promise.resolve(조건?.service === 2 ? 응답({ byService: [] }) : 응답())) as typeof api.dashboard);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText(/애플리케이션 2개/);
    fireEvent.change(screen.getByRole('combobox', { name: '애플리케이션' }), { target: { value: '2' } });
    expect(await screen.findByText(/ZDA 회원 · 최근 14일/)).toBeTruthy();
    expect(읽기).toHaveBeenLastCalledWith(시간대, undefined, { service: 2 });
    expect(window.location.hash).toBe('#/dashboard?service=2');
    expect((screen.getByRole('combobox', { name: '애플리케이션' }) as HTMLSelectElement).value).toBe('2');
  });

  it('기간을 고르면 그 길이로 읽고 글자의 날 수도 따라간다 — 기본값 14 는 주소에서 빠진다', async () => {
    const 읽기 = vi
      .spyOn(api, 'dashboard')
      .mockImplementation(((_tz: string, _only?: string, 조건?: { service?: number; days?: number }) =>
        Promise.resolve(응답({}, 조건?.days ?? 14))) as typeof api.dashboard);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText(/최근 14일 · /);
    fireEvent.change(screen.getByRole('combobox', { name: '기간' }), { target: { value: '7' } });
    expect(await screen.findByText(/애플리케이션 2개 · 최근 7일/)).toBeTruthy();
    expect(읽기).toHaveBeenLastCalledWith(시간대, undefined, { days: 7 });
    expect(window.location.hash).toBe('#/dashboard?days=7');
    expect(screen.getByText('직전 7일 실행 없음')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '기간' }), { target: { value: '14' } });
    await screen.findByText(/최근 14일 · /);
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('주소에 조건이 있으면 처음부터 그 조건으로 읽는다 — 알아볼 수 없는 값은 기본값이다', async () => {
    window.location.hash = '#/dashboard?service=1&days=30';
    const 읽기 = vi.spyOn(api, 'dashboard').mockResolvedValue(응답({}, 30) as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText(/ZDA 결제 · 최근 30일/);
    expect(읽기).toHaveBeenCalledWith(시간대, undefined, { service: 1, days: 30 });

    window.location.hash = '#/dashboard?service=abc&days=9';
    expect(주소에서조건()).toEqual({ 서비스: null, 일: 14 });
    expect(조건을주소로({ 서비스: 3, 일: 7 })).toEqual({ service: '3', days: '7' });
    expect(조건을주소로({ 서비스: null, 일: 14 })).toEqual({});
  });

  it('볼 수 있는 목록에 없는 애플리케이션 번호가 주소에 있으면 전체로 돌려 다시 읽는다', async () => {
    window.location.hash = '#/dashboard?service=99';
    const 읽기 = vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await waitFor(() => expect(읽기).toHaveBeenLastCalledWith(시간대, undefined, {}));
    await screen.findByText(/애플리케이션 2개 · 최근 14일/);
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('도는 실행 줄을 새로 받을 때도 같은 조건을 싣는다', async () => {
    window.location.hash = '#/dashboard?service=1';
    vi.useFakeTimers();
    const 읽기 = vi.spyOn(api, 'dashboard').mockResolvedValue(
      응답({ running: [{ runId: 3, serviceId: 1, serviceName: 'ZDA 결제', title: '점검', doneItems: 1, totalItems: 4, failedItems: 0, startedAt: '2026-10-07T04:00:00.000Z' }] }) as never,
    );
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(읽기).toHaveBeenCalledWith(시간대, 'running', { service: 1 });
  });
});

describe('통과율 비교 글', () => {
  it('직전 창에 실행이 없으면 증감을 내지 않고 안내 한 줄만 둔다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    expect(await screen.findByText('직전 14일 실행 없음')).toBeTruthy();
    expect(screen.queryByText(/%p 직전/)).toBeNull();
  });
});

describe('칸에서 내려가기', () => {
  it('신규 실패의 케이스 이름은 그 실행의 실패 카드까지 가는 주소이고, 서랍의 「실행 기록에서 보기」가 그 애플리케이션을 고른다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    vi.spyOn(api, 'run').mockReturnValue(new Promise(() => {}));
    vi.spyOn(api, 'failures').mockReturnValue(new Promise(() => {}));
    const 서비스열기 = vi.fn();
    render(<Dashboard 서비스열기={서비스열기} {...기본재료} />);
    const 칸 = (await screen.findByText('신규 실패')).closest('section')!;
    const 기능 = within(칸).getByRole('link', { name: 'ZDA-001 이름' });
    expect(기능.getAttribute('href')).toBe('#/runs/fn?run=7&tc=ZDA-001');
    const UI = within(칸).getByRole('link', { name: 'ZDA-UI-014 이름' });
    expect(UI.getAttribute('href')).toBe('#/runs/ui?run=6&tc=ZDA-UI-014');
    fireEvent.click(UI);
    expect(서비스열기).not.toHaveBeenCalled();
    const 서랍 = document.getElementById('fail-drawer')!;
    const 고리 = within(서랍).getByRole('link', { name: '실행 기록에서 보기' });
    expect(고리.getAttribute('href')).toBe('#/runs/ui?run=6&tc=ZDA-UI-014');
    fireEvent.click(고리);
    expect(서비스열기).toHaveBeenCalledWith(2);
    expect(within(칸).getByText('ZDA 회원 · qa')).toBeTruthy();
  });

  it('표가 상한에서 잘렸으면 나머지 건수와 실패한 실행 목록 링크를 단다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByText('신규 실패')).closest('section')!;
    expect(within(칸).getByText(/10건 더 있습니다/)).toBeTruthy();
    expect(within(칸).getByRole('link', { name: '실행 기록에서 보기' }).getAttribute('href')).toBe('#/runs/fn?state=failed&days=14');
  });

  it('줄이 다 보이면 더 있다는 줄을 안 단다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(
      응답({ byService: 응답().byService.map((서비스) => ({ ...서비스, newFailureCount: 2 })) }) as never,
    );
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByText('신규 실패')).closest('section')!;
    expect(within(칸).queryByText(/더 있습니다/)).toBeNull();
  });

  it('실패 유형 이름은 건수가 있는 줄만 실패한 실행 목록 링크이고 7일 창은 7일 목록으로 간다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답({}, 7) as never);
    render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    const 칸 = (await screen.findByText('실패 유형')).closest('section')!;
    expect(within(칸).getByRole('link', { name: '기대 결과 불일치' }).getAttribute('href')).toBe('#/runs/fn?state=failed&days=7');
    expect(within(칸).queryByRole('link', { name: '타임아웃' })).toBeNull();
  });

  it('애플리케이션별 품질의 애플리케이션 이름은 그 애플리케이션의 실행 기록이고 누르면 그 애플리케이션을 고른다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답({}, 30) as never);
    const 서비스열기 = vi.fn();
    render(<Dashboard 서비스열기={서비스열기} {...기본재료} />);
    const 칸 = (await screen.findByText('애플리케이션별 품질')).closest('section')!;
    const 링크 = within(칸).getByRole('link', { name: 'ZDA 결제' });
    expect(링크.getAttribute('href')).toBe('#/runs/fn?days=30');
    fireEvent.click(링크);
    expect(서비스열기).toHaveBeenCalledWith(1);
  });

  it('일별 막대는 실행한 날만 링크이고 실패가 있으면 실패한 실행으로 간다', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    const { container } = render(<Dashboard 서비스열기={() => {}} {...기본재료} />);
    await screen.findByText('일별 테스트 결과');
    const 링크 = container.querySelectorAll('.dash-daily svg a');
    expect(링크).toHaveLength(1);
    expect(링크[0]!.getAttribute('href')).toBe('#/runs/fn?state=failed&days=14');
    expect(링크[0]!.getAttribute('aria-label')).toMatch(/실패 1/);
    expect(container.querySelector('.dash-daily svg')!.getAttribute('role')).toBe('group');
  });

  it('히트맵의 케이스는 애플리케이션을 알 때만 링크이다 — 애플리케이션을 고르면 케이스 상세로 가고 그 애플리케이션을 고른다', async () => {
    const 서비스열기 = vi.fn();
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    const { container, unmount } = render(<Dashboard 서비스열기={서비스열기} {...기본재료} />);
    await screen.findByText('실패 히트맵');
    expect(container.querySelector('.dash-heat a')).toBeNull();
    expect(container.querySelector('.dash-heat-grid')!.getAttribute('role')).toBe('img');
    unmount();

    window.location.hash = '#/dashboard?service=1';
    vi.spyOn(api, 'dashboard').mockResolvedValue(응답() as never);
    const 다시 = render(<Dashboard 서비스열기={서비스열기} {...기본재료} />);
    await screen.findByText('실패 히트맵');
    const 링크 = 다시.container.querySelector('.dash-heat a')!;
    expect(링크.getAttribute('href')).toBe('#/cases/fn?case=ZDA-001');
    fireEvent.click(링크);
    expect(서비스열기).toHaveBeenCalledWith(1);
  });

  it('실행 목록 주소는 창 길이를 그대로 싣는다', () => {
    expect(실행목록주소(7)).toBe('#/runs/fn?days=7');
    expect(실행목록주소(14, { state: 'failed' })).toBe('#/runs/fn?state=failed&days=14');
    expect(실행목록주소(30)).toBe('#/runs/fn?days=30');
  });
});
