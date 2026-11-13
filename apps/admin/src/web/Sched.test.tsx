// @vitest-environment jsdom
// 정기 실행 화면 검사 — 세트 카드 · 달력 · 칸 창 · 끄기 · 빈 상태 (도메인/정기실행 §8.20)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { ServiceRow } from './api.js';
import { Sched } from './Sched.js';
import { schedApi, type 세트, type 회차 } from './schedApi.js';

const 앱: ServiceRow = {
  id: 7,
  prefix: 'MKT',
  name: '데모마켓 웹',
  color: '#667788',
  projectId: 10,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  kind: 'SCREEN',
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 세트하나 = (덮: Partial<세트> = {}): 세트 => ({
  id: 1,
  name: '결제 회귀',
  at: '02:00',
  tz: 'Asia/Seoul',
  days: [1, 2, 3, 4, 5],
  onceOn: null,
  isOn: true,
  isBase: false,
  items: [
    { kind: 'FN', service: 'MKT', tcIds: ['MKT-FN-033'], label: 'MKT-FN-033' },
    { kind: 'E2E', service: 'ADM', tcIds: null, scenarioId: 3, label: '주문 → 어드민 확인' },
  ],
  envs: [],
  skipped: [],
  missing: { cases: 2, tests: 0 },
  avgMinutes: 35,
  last: { occurrenceId: 9, state: 'DONE', plannedAt: '2026-11-11T17:00:00Z', startedAt: '2026-11-11T17:00:00Z', verdict: 'FAIL', suspects: 0, runIds: [4701, 4702] },
  baseable: false,
  ...덮,
});

const 회차하나 = (덮: Partial<회차> = {}): 회차 => ({
  id: 9,
  setId: 1,
  plannedOn: '2026-11-12',
  plannedAt: '2026-11-11T17:00:00Z',
  startedAt: '2026-11-11T17:00:00Z',
  finishedAt: '2026-11-11T17:40:00Z',
  state: 'DONE',
  verdict: 'FAIL',
  suspects: 0,
  runs: [
    { runId: 4701, kind: 'FN', service: 'MKT', title: '정기 · 결제 회귀 · 기능', status: 'FINISHED', passed: 3, failed: 2, other: 0 },
    { runId: 4702, kind: 'COMPAT', service: 'MTA', title: '정기 · 결제 회귀 · 호환성', status: 'FINISHED', passed: 0, failed: 0, other: 0, suspects: 3 },
  ],
  notes: [],
  ...덮,
});

const 차리기 = (세트들: 세트[], 회차들: 회차[] = []) => {
  vi.spyOn(schedApi, 'sets').mockResolvedValue({ items: 세트들 });
  vi.spyOn(schedApi, 'calendar').mockResolvedValue({ occurrences: 회차들 });
};

beforeEach(() => {
  // 2026-11-13(금) 10:30 서울
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T01:30:00Z'));
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('정기 실행 화면', () => {
  it('머리는 프로젝트 · 애플리케이션 수, 세트 카드는 반복 · 다음 · 담은 것 · 마지막 결과 · 빠진 케이스다', async () => {
    차리기([세트하나({ isBase: true })]);
    render(<Sched service={앱} 앱수={4} 쓰나 />);
    const 카드 = (await screen.findByRole('button', { name: /결제 회귀/u, pressed: false })).closest('li')!;
    expect(screen.getByText('데모마켓 프로젝트 · 애플리케이션 4개의 세트를 한 달력에 모았습니다')).toBeTruthy();
    expect(카드.textContent).toContain('안정화 기준');
    expect(카드.textContent).toContain('평일 02:00 · 다음 11/16');
    expect(카드.textContent).toContain('MKT + ADM · 기능 · E2E');
    expect(카드.textContent).toContain('마지막 11/12 실패 있음');
    expect(카드.textContent).toContain('빠진 케이스 2건');
  });

  it('달력은 지난 칸에 결과를, 앞으로의 칸에 예정을 단다', async () => {
    차리기([세트하나()], [회차하나()]);
    render(<Sched service={앱} 앱수={1} 쓰나 />);
    expect(await screen.findByRole('button', { name: /결제 회귀\s*실패 2/u })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /결제 회귀\s*02:00 예정/u }).length).toBeGreaterThan(0);
    expect(schedApi.calendar).toHaveBeenCalledWith(10, '2026-10-26', '2026-12-06');
  });

  it('실행이 여럿인 칸은 창을 열어 실행 줄마다 그 실행으로 가는 링크를 단다', async () => {
    차리기([세트하나()], [회차하나()]);
    render(<Sched service={앱} 앱수={1} 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: /결제 회귀\s*실패 2/u }));
    const 창 = await screen.findByRole('dialog');
    expect(within(창).getByRole('link', { name: '#4701 →' }).getAttribute('href')).toBe('#/runs/4701');
    expect(within(창).getByRole('link', { name: '#4702 →' }).getAttribute('href')).toBe('#/compat/runs/4702');
    expect(within(창).getByText('의심 3')).toBeTruthy();
  });

  it('실행이 하나인 지난 칸은 창 없이 그 실행으로 간다', async () => {
    차리기([세트하나()], [회차하나({ runs: [회차하나().runs[0]!] })]);
    render(<Sched service={앱} 앱수={1} 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: /결제 회귀\s*실패 2/u }));
    expect(window.location.hash).toBe('#/runs/4701');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('카드를 누르면 그 세트만 보이고 「전체 보기」로 돌아온다', async () => {
    차리기([세트하나(), 세트하나({ id: 2, name: '웹 전체 회귀', at: '03:00', days: [0, 1, 2, 3, 4, 5, 6], last: null })]);
    render(<Sched service={앱} 앱수={1} 쓰나 />);
    await screen.findAllByRole('button', { name: /웹 전체 회귀\s*03:00 예정/u });
    fireEvent.click(screen.getByRole('button', { name: /결제 회귀/u, pressed: false }));
    expect(screen.queryAllByRole('button', { name: /웹 전체 회귀\s*03:00 예정/u })).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '전체 보기' }));
    expect(screen.getAllByRole('button', { name: /웹 전체 회귀\s*03:00 예정/u }).length).toBeGreaterThan(0);
  });

  it('일 보기는 창 없이 그날 실행 줄을 펼치고, 브라우저가 고른 보기를 기억한다', async () => {
    차리기([세트하나()], [회차하나()]);
    const { unmount } = render(<Sched service={앱} 앱수={1} 쓰나 />);
    await screen.findByRole('button', { name: /결제 회귀\s*실패 2/u });
    fireEvent.click(screen.getByRole('button', { name: '결과 →' }));
    expect(await screen.findByRole('link', { name: '#4701 →' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '일', pressed: true })).toBeTruthy();
    unmount();
    render(<Sched service={앱} 앱수={1} 쓰나 />);
    expect(await screen.findByRole('button', { name: '일', pressed: true })).toBeTruthy();
  });

  it('앞 세트가 길면 뒤 세트 예정에 대기와 예상 시작을 단다', async () => {
    차리기([세트하나({ id: 1, name: '출시 전 점검', at: '01:00', days: [1], avgMinutes: 170, last: null }), 세트하나({ id: 2, at: '02:00', days: [1], last: null })]);
    render(<Sched service={앱} 앱수={1} 쓰나 />);
    expect((await screen.findAllByRole('button', { name: /결제 회귀\s*대기 · 03:50쯤 시작/u })).length).toBeGreaterThan(0);
  });

  it('끄기는 세트를 끄고 다시 읽는다. 읽기만 하는 사람에게는 단추가 없다', async () => {
    차리기([세트하나()]);
    const 끄기 = vi.spyOn(schedApi, 'setOn').mockResolvedValue({});
    const { unmount } = render(<Sched service={앱} 앱수={1} 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: '끄기' }));
    await waitFor(() => expect(끄기).toHaveBeenCalledWith(1, false));
    await waitFor(() => expect(schedApi.sets).toHaveBeenCalledTimes(2));
    unmount();
    render(<Sched service={앱} 앱수={1} 쓰나={false} />);
    await screen.findByRole('button', { name: /결제 회귀/u, pressed: false });
    expect(screen.queryByRole('button', { name: '끄기' })).toBeNull();
  });

  it('세트가 없으면 달력 자리에 안내만 둔다', async () => {
    차리기([]);
    render(<Sched service={앱} 앱수={1} 쓰나 />);
    expect(await screen.findByText('아직 세트가 없습니다')).toBeTruthy();
    expect(screen.getByText('이미 만든 테스트를 선택해 정해진 시각에 실행합니다')).toBeTruthy();
  });
});
