// @vitest-environment jsdom
// 항목 상세 위쪽 줄 — 회차 · 이전/다음 실패 · 관련 요구 · 판정 (도메인/리포팅 §8.4 · 점검 3.2 · 3.4)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type FailureCase, type ItemStatus, type Platform, type RunItemDetail, type RunItemSummary } from './api.js';
import { 항목실행줄, 실패길, 회차글 } from './ItemRunContext.js';
import { 증적 } from './RunResult.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const RUN_ID = 3301;

function 요약(historyId: number, tcId: string, platform: Platform, status: ItemStatus, attempt = 1): RunItemSummary {
  return {
    historyId,
    tcId,
    tcName: `${tcId} 케이스`,
    platform,
    attempt,
    params: {},
    paramSchema: {},
    status,
    durationMs: 10,
    error: null,
    startedAt: '2026-09-21T00:00:00.000Z',
    finishedAt: '2026-09-21T00:00:01.000Z',
  };
}

function 상세(항목: RunItemSummary): RunItemDetail {
  return { ...항목, runId: RUN_ID, runTitle: '결제 회귀', precondition: [], expected: {}, expectedSchema: {}, steps: [] };
}

const 실행항목들 = [
  요약(1, 'ZID-001', 'desktop', 'FAIL'),
  요약(2, 'ZID-001', 'mobile', 'PASS'),
  요약(3, 'ZID-002', 'desktop', 'FAIL', 1),
  요약(4, 'ZID-002', 'desktop', 'FAIL', 2),
  요약(5, 'ZID-003', 'desktop', 'FAIL'),
];

function 실행응답(items: RunItemSummary[]): Awaited<ReturnType<typeof api.run>> {
  return {
    runId: RUN_ID,
    title: '결제 회귀',
    triggeredBy: 'u',
    triggeredByName: null,
    env: 'qa',
    baseUrl: '',
    serviceName: 'ZID',
    status: 'FINISHED',
    startedAt: '2026-09-21T00:00:00.000Z',
    finishedAt: '2026-09-21T00:01:00.000Z',
    counts: { total: items.length, pass: 1, fail: 4, na: 0, running: 0 },
    items,
    evidence: [],
  };
}

describe('회차글', () => {
  it('같은 케이스 · 디바이스를 돌린 횟수를 센다', () => {
    expect(회차글(상세(실행항목들[3]!), 실행항목들)).toEqual({ 번째: 2, 전체: 2 });
    expect(회차글(상세(실행항목들[0]!), 실행항목들)).toEqual({ 번째: 1, 전체: 1 });
  });
});

describe('실패길', () => {
  it('케이스 · 디바이스마다 처음 실패한 항목 하나씩, 돌린 차례로 낸다', () => {
    expect(실패길(실행항목들).map((it) => it.historyId)).toEqual([1, 3, 5]);
  });
});

describe('항목실행줄', () => {
  const 카드: FailureCase = {
    tcId: 'ZID-002',
    tcName: 'ZID-002 케이스',
    devices: [],
    reqs: [{ reqId: 'ZID-REQ-001', text: '로그인한다' }],
    judgment: null,
  };

  function 그린다(item: RunItemDetail) {
    vi.spyOn(api, 'run').mockResolvedValue(실행응답(실행항목들));
    vi.spyOn(api, 'failures').mockResolvedValue({ items: [카드], page: 1, pageSize: 20, total: 1 });
    return render(<항목실행줄 item={item} 판정하기={() => () => true} />);
  }

  it('가운데 실패면 이전 · 다음 실패로 가는 고리와 몇 번째인지를 낸다', async () => {
    그린다(상세(실행항목들[2]!));

    expect(await screen.findByText('실패 3건 중 2번째')).toBeTruthy();
    expect(screen.getByRole('link', { name: '← 이전 실패' }).getAttribute('href')).toBe(`#/runs/${String(RUN_ID)}/items/1`);
    expect(screen.getByRole('link', { name: '다음 실패 →' }).getAttribute('href')).toBe(`#/runs/${String(RUN_ID)}/items/5`);
  });

  it('첫 실패에는 이전 고리가 없다', async () => {
    그린다(상세(실행항목들[0]!));

    await screen.findByText('실패 3건 중 1번째');
    expect(screen.queryByRole('link', { name: '← 이전 실패' })).toBeNull();
  });

  it('통과한 회차를 열면 순서 번호 없이 앞뒤 실패로만 간다', async () => {
    그린다(상세({ ...실행항목들[3]!, status: 'PASS' }));

    await screen.findByRole('link', { name: '다음 실패 →' });
    expect(screen.queryByText(/건 중 .*번째/)).toBeNull();
  });

  it('반복 실행이면 몇 번째 회차인지 적는다', async () => {
    그린다(상세(실행항목들[3]!));

    expect(await screen.findByText('2/2회차')).toBeTruthy();
  });

  it('실패 항목이면 카드를 찾아 관련 요구와 판정 단추를 낸다', async () => {
    그린다(상세(실행항목들[2]!));

    expect(await screen.findByText('로그인한다')).toBeTruthy();
    expect(screen.getByRole('button', { name: '버그' })).toBeTruthy();
  });

  it('만드는 리포트가 있으면 다 될 때까지 다시 읽어 「리포트 생성 중」이 풀린다 — 실행 결과 화면과 같다', async () => {
    vi.useFakeTimers();
    const 만드는중 = { ...실행응답(실행항목들), evidence: [증적('PDF', 'PENDING'), 증적('XLSX', 'PENDING'), 증적('HTML', 'PENDING')] };
    vi.spyOn(api, 'run').mockResolvedValueOnce(만드는중).mockResolvedValue(실행응답(실행항목들));
    vi.spyOn(api, 'failures').mockResolvedValue({ items: [카드], page: 1, pageSize: 20, total: 1 });
    render(<항목실행줄 item={상세(실행항목들[2]!)} 판정하기={() => () => true} />);

    expect(await vi.waitFor(() => screen.getByRole('button', { name: '리포트 생성 중' }))).toBeTruthy();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await vi.waitFor(() => screen.getByRole('button', { name: '리포트 생성' }))).toBeTruthy();
  });

  it('실행을 못 읽으면 아무것도 그리지 않는다 — 항목 상세 본문은 따로 선다', async () => {
    vi.spyOn(api, 'run').mockRejectedValue(new Error('x'));
    const { container } = render(<항목실행줄 item={상세(실행항목들[2]!)} 판정하기={() => () => true} />);

    await vi.waitFor(() => expect(api.run).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
