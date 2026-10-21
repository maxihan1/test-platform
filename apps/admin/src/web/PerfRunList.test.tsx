// @vitest-environment jsdom
// 성능 테스트 › 실행 기록 표 검사 (도메인/성능 §8.14 · 시안 A)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { perfApi, type 실행줄 } from './perfApi.js';
import { PerfRunList } from './PerfRunList.js';

const 줄 = (덮: Partial<실행줄>): 실행줄 => ({
  id: 12,
  kind: 'LOAD',
  status: 'DONE',
  verdict: 'PASS',
  title: '주문하기',
  env: 'qa',
  startedAt: '2026-10-21T05:05:00Z',
  durationSec: 1360,
  summary: { peakVus: 1350, maxTps: 940, p95Ms: 1600, errorRate: 1.1 },
  testType: 'STRESS',
  origin: 'MANUAL',
  degraded: false,
  stopReason: null,
  ...덮,
});

const 줄들: 실행줄[] = [
  줄({ id: 14, status: 'RUNNING', verdict: null, durationSec: 372, summary: { peakVus: 400, maxTps: 300, p95Ms: 900, errorRate: 0.2 }, testType: 'LOAD', degraded: null }),
  줄({ id: 13, origin: 'SCHEDULED', testType: 'LOAD', summary: { peakVus: 400, maxTps: 300, p95Ms: 1100, errorRate: 0.1 } }),
  줄({ id: 12, verdict: 'FAIL', degraded: true, stopReason: 'TARGET_EXCEEDED' }),
  줄({ id: 11, title: '회원가입', env: 'dev', status: 'STOPPED', verdict: null, stopReason: 'SMOKE_FAILED', testType: 'SPIKE', durationSec: 65, summary: { peakVus: null, maxTps: null, p95Ms: null, errorRate: null }, degraded: null }),
  줄({ id: 10, status: 'ERROR', verdict: null, degraded: null }),
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function 그리기(runs = 줄들) {
  vi.spyOn(perfApi, 'scenarios').mockResolvedValue({
    scenarios: [
      { id: 5, name: '주문하기', version: 1, updatedAt: null, lastRun: null },
      { id: 6, name: '회원가입', version: 1, updatedAt: null, lastRun: null },
    ],
  });
  const 부르기 = vi.spyOn(perfApi, 'runs').mockResolvedValue({ runs });
  const 것 = render(<PerfRunList serviceId={7} />);
  await screen.findByRole('table', { name: '성능 실행 목록' });
  return { 부르기, ...것 };
}

describe('성능 실행 기록 표', () => {
  it('줄마다 번호 고리 · 정기 꼬리표 · 판정 · 숫자 · 이전 실행 대비를 보인다', async () => {
    const { container } = await 그리기();
    expect(container.querySelector('h1')!.textContent).toContain('성능 테스트');
    expect(container.querySelector('h1')!.textContent).toContain('실행 기록');

    const 열 = (번호: string) => screen.getByRole('link', { name: 번호 }).closest('tr')!;
    expect(screen.getByRole('link', { name: 'PRF-0012' }).getAttribute('href')).toBe('#/perf/runs/12');

    const 도는 = 열('PRF-0014');
    expect(도는.textContent).toContain('실행 중');
    expect(도는.querySelector('.perf-pulse')).not.toBeNull();
    expect(도는.textContent).toContain('06:12');
    expect(도는.textContent).toContain('400명');

    expect(within(열('PRF-0013')).getByText('정기')).toBeTruthy();
    expect(within(열('PRF-0013')).getByText('통과').className).toContain('v-pass');
    expect(열('PRF-0013').textContent).toContain('변화 없음');

    const 실패 = 열('PRF-0012');
    expect(within(실패).getByText('실패').className).toContain('v-fail');
    expect(실패.textContent).toContain('1,350명');
    expect(실패.textContent).toContain('1.6초');
    expect(실패.textContent).toContain('1.1%');
    expect(within(실패).getByText('성능 저하').className).toContain('perf-chg');

    const 중단 = 열('PRF-0011');
    expect(within(중단).getByText('중단')).toBeTruthy();
    expect(중단.textContent).toContain('스모크 테스트 실패');
    expect(중단.textContent).toContain('스파이크 테스트 · dev');
    expect(within(열('PRF-0010')).getByText('오류')).toBeTruthy();
  });

  it('판정 거르개는 판정이 없는 중단 · 오류를 따로 가른다', async () => {
    await 그리기();
    fireEvent.change(screen.getByLabelText('판정'), { target: { value: 'FAIL' } });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('판정'), { target: { value: 'STOP' } });
    expect(screen.getByRole('link', { name: 'PRF-0011' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'PRF-0010' })).toBeNull();
    fireEvent.change(screen.getByLabelText('판정'), { target: { value: 'ERROR' } });
    expect(screen.getByRole('link', { name: 'PRF-0010' })).toBeTruthy();
  });

  it('시나리오를 고르면 그 시나리오 번호로 다시 부른다', async () => {
    const { 부르기 } = await 그리기();
    expect(부르기).toHaveBeenLastCalledWith(7, undefined);
    fireEvent.change(screen.getByLabelText('시나리오'), { target: { value: '6' } });
    await waitFor(() => expect(부르기).toHaveBeenLastCalledWith(7, 6));
  });

  it('페이지 측정 줄은 제목이 「페이지 성능」이고 누르면 페이지 성능 화면의 그 실행으로 간다', async () => {
    await 그리기([줄({ id: 30, kind: 'PAGE', title: '', testType: null, degraded: null, summary: { peakVus: null, maxTps: null, p95Ms: null, errorRate: null } }), 줄({ id: 12 })]);
    const 페이지줄 = screen.getByRole('link', { name: 'PRF-0030' }).closest('tr')!;
    expect(screen.getByRole('link', { name: 'PRF-0030' }).getAttribute('href')).toBe('#/perf/pages?run=30');
    expect(within(페이지줄).getByRole('link', { name: '페이지 성능' }).getAttribute('href')).toBe('#/perf/pages?run=30');
    expect(screen.getByRole('link', { name: 'PRF-0012' }).getAttribute('href')).toBe('#/perf/runs/12');
  });

  it('기기 측정 줄은 제목이 「기기 성능」이고 누르면 기기 성능 화면의 그 실행으로 간다', async () => {
    await 그리기([줄({ id: 40, kind: 'DEVICE', title: '', testType: null, degraded: null, summary: { peakVus: null, maxTps: null, p95Ms: null, errorRate: null } })]);
    const 기기줄 = screen.getByRole('link', { name: 'PRF-0040' }).closest('tr')!;
    expect(screen.getByRole('link', { name: 'PRF-0040' }).getAttribute('href')).toBe('#/perf/devices?run=40');
    expect(within(기기줄).getByRole('link', { name: '기기 성능' }).getAttribute('href')).toBe('#/perf/devices?run=40');
  });

  it('실행이 없으면 안내를 한다', async () => {
    vi.spyOn(perfApi, 'scenarios').mockResolvedValue({ scenarios: [] });
    vi.spyOn(perfApi, 'runs').mockResolvedValue({ runs: [] });
    render(<PerfRunList serviceId={7} />);
    expect(await screen.findByText('아직 성능 테스트 실행이 없습니다')).toBeTruthy();
  });
});
