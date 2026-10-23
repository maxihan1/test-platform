// @vitest-environment jsdom
// 성능 실행 화면 검사 — 실행 중에서 결과로 바뀌는 것 · 판정 배지 · 성능 저하 글자 · AI 분석 상태 (도메인/성능 §8.14)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError } from './api.js';
import { perfApi, type 실행상세 } from './perfApi.js';
import type { PageRow } from './perfPageApi.js';
import { PerfRun } from './PerfRun.js';
import { 갱신간격, 틈간격 } from './perfRunView.js';

const 된다 = () => () => true;
const 안된다 = () => () => false;

const 끝난상세 = (덮: Partial<실행상세> = {}): 실행상세 => ({
  id: 12,
  code: 'PRF-0012',
  kind: 'LOAD',
  status: 'DONE',
  verdict: 'FAIL',
  stopReason: 'TARGET_EXCEEDED',
  testType: 'STRESS',
  env: 'qa',
  scenarioId: 5,
  servicePrefix: 'MKT',
  scenarioName: '주문하기',
  origin: 'MANUAL',
  createdAt: '2026-10-21T05:04:00Z',
  startedAt: '2026-10-21T05:05:00Z',
  finishedAt: '2026-10-21T05:27:40Z',
  config: {
    testType: 'STRESS',
    load: { basis: 'VUS', stages: [{ durationSec: 300, target: 400 }] },
    targets: [{ metric: 'P95', op: '<=', value: 2000, source: 'PRD', reqId: 'MKT-REQ-001' }],
    agentIds: [11, 12],
    monitorIds: [21],
    durationSec: 1800,
    maxVus: 2000,
  },
  targets: [
    { metric: 'P95', op: '<=', value: 2000, source: 'PRD', reqId: 'MKT-REQ-001', measured: 1600, verdict: 'PASS' },
    { metric: 'P95', scope: '주문', op: '<=', value: 2000, source: 'AI', measured: 2400, verdict: 'FAIL' },
    { metric: 'ERROR_RATE', op: '<=', value: 1, source: 'MANUAL', measured: 1.1, verdict: 'FAIL' },
  ],
  summary: { peakVus: 1350, maxTps: 940, p95Ms: 1600, errorRate: 1.1 },
  degraded: true,
  ai: { title: '주문 트랜잭션에서 병목 발생', items: ['임계점: 가상 사용자 1,350명'] },
  aiJob: null,
  previous: { id: 10, verdict: 'FAIL', peakVus: 1600, maxTps: 900, p95Ms: 1200, errorRate: 0.8, createdAt: '2026-10-18T01:00:00Z' },
  transactions: [
    { tx: '로그인', p95Ms: 700, errorRate: 0.1, prevP95Ms: 700, degraded: false },
    { tx: '주문', p95Ms: 1900, errorRate: 0.3, prevP95Ms: 1400, degraded: true },
    { tx: '새 요청', p95Ms: 500, errorRate: 0, prevP95Ms: null, degraded: false },
  ],
  comparePoint: 1000,
  ...덮,
});

const 도는상세 = (): 실행상세 =>
  끝난상세({
    config: {
      ...끝난상세().config,
      targets: [...끝난상세().config.targets, { metric: 'P95', scope: '주문', op: '<=', value: 2000, source: 'AI' }],
    },
    status: 'RUNNING',
    verdict: null,
    stopReason: null,
    finishedAt: null,
    targets: null,
    ai: null,
    previous: null,
    transactions: [],
    comparePoint: null,
  });

const 초 = (sec: number, 덮 = {}) => ({ sec, tx: '', vus: 1240, requests: 860, errors: 5, p95Ms: 1400, p99Ms: 2000, ...덮 });

function 숫자들만들기() {
  vi.spyOn(perfApi, 'series').mockResolvedValue({ series: [초(1), 초(2), 초(2, { tx: '주문', requests: 140, errors: 4, p95Ms: 2100 })] });
  vi.spyOn(perfApi, 'hosts').mockResolvedValue({
    hosts: [
      { agentId: 21, agentName: 'web-1', sec: 2, cpu: 62, mem: 48, diskIoKbps: 0, netInKbps: 0, netOutKbps: 0 },
      { agentId: 11, agentName: '기본 에이전트', sec: 2, cpu: 41, mem: 30, diskIoKbps: 0, netInKbps: 0, netOutKbps: 0 },
    ],
  });
  vi.spyOn(perfApi, 'events').mockResolvedValue({ events: [{ at: '2026-10-21T05:06:00Z', level: 'info', message: '스모크 테스트 통과' }] });
}

beforeEach(() => {
  갱신간격.ms = 30;
  틈간격.ms = 30;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
  갱신간격.ms = 5000;
  틈간격.ms = 10_000;
});

describe('실행 중에서 결과로', () => {
  it('도는 동안 숫자 · 모니터링 · 로그를 보이고, 끝나면 같은 자리에서 결과로 바뀐다', async () => {
    let 지금: 실행상세 = 도는상세();
    vi.spyOn(perfApi, 'runOf').mockImplementation(() => Promise.resolve(지금));
    숫자들만들기();
    const 시리즈 = vi.mocked(perfApi.series);
    render(<PerfRun runId={12} 판정하기={된다} />);

    expect(await screen.findByText('1,240')).toBeTruthy();
    expect(screen.getByText('860')).toBeTruthy();
    expect(screen.getByText('0.6')).toBeTruthy();
    expect(screen.getByText('목표 ≤ 2초')).toBeTruthy();
    expect(screen.getByText('web-1 CPU')).toBeTruthy();
    expect(screen.getByText('62%')).toBeTruthy();
    expect(screen.getByText('기본 에이전트 CPU')).toBeTruthy();
    expect(screen.queryByText('기본 에이전트 메모리')).toBeNull();
    expect(screen.getByText('스모크 테스트 통과')).toBeTruthy();
    const 주문줄 = screen.getByRole('cell', { name: '주문' }).closest('tr')!;
    expect(주문줄.textContent).toContain('2.1초');
    expect(주문줄.textContent).toContain('(초과)');
    expect(screen.queryByText('PDF로 내려받기')).toBeNull();

    // 다음 5초에는 마지막 초(2)에서 겹침 구간(10초)만큼 앞부터 다시 받는다 — 늦게 온 에이전트 몫이 같은 초를 키우기 때문이다
    await waitFor(() => expect(시리즈.mock.calls.length).toBeGreaterThan(1));
    expect(시리즈.mock.calls[0]).toEqual([12, 0]);
    expect(시리즈.mock.calls[1]).toEqual([12, 0]);

    지금 = 끝난상세();
    expect(await screen.findByText('PDF로 내려받기')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '실행 중단' })).toBeNull();
  });

  it('이미 받은 초가 다음 응답에서 커진 값으로 오면 화면 숫자가 커진 값으로 바뀐다 — 늦게 온 에이전트 몫', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(도는상세());
    숫자들만들기();
    vi.spyOn(perfApi, 'series').mockResolvedValueOnce({ series: [초(1, { vus: 100 }), 초(2, { vus: 100 })] }).mockResolvedValue({ series: [초(1, { vus: 100 }), 초(2, { vus: 250 })] });
    vi.spyOn(perfApi, 'hosts')
      .mockResolvedValueOnce({ hosts: [{ agentId: 21, agentName: 'web-1', sec: 2, cpu: 10, mem: 48, diskIoKbps: 0, netInKbps: 0, netOutKbps: 0 }] })
      .mockResolvedValue({ hosts: [{ agentId: 21, agentName: 'web-1', sec: 2, cpu: 77, mem: 48, diskIoKbps: 0, netInKbps: 0, netOutKbps: 0 }] });
    render(<PerfRun runId={12} 판정하기={된다} />);
    expect(await screen.findByText('250')).toBeTruthy();
    expect(screen.queryByText('100')).toBeNull();
    expect(await screen.findByText('77%')).toBeTruthy();
  });

  it('실행 권한은 띠가 아니라 그 실행의 애플리케이션 접두사로 가른다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(도는상세());
    숫자들만들기();
    const 판정 = vi.fn((접두사: string | null) => (무엇: string) => 접두사 === 'MKT' && 무엇 === '실행');
    render(<PerfRun runId={12} 판정하기={판정 as never} />);
    expect(await screen.findByRole('button', { name: '실행 중단' })).toBeTruthy();
    expect(판정).toHaveBeenCalledWith('MKT');
  });

  it('부하 중 페이지 로딩 측정을 켠 실행에는 「페이지 로딩 (부하 중)」 칸이 서고, 목표를 넘은 페이지는 실패 색이다', async () => {
    const 상세 = 도는상세();
    vi.spyOn(perfApi, 'runOf').mockResolvedValue({ ...상세, config: { ...상세.config, pageCheck: true } });
    숫자들만들기();
    const 줄 = (url: string, name: string, lcpMs: number, sec: number): PageRow => ({
      url, name, sec, vus: 400, device: 'desktop', network: 'NONE', lcpMs, fcpMs: 500, cls: 0, ttfbMs: 50, lcpElement: null, resources: [], ai: null, verdict: null,
    });
    const 페이지 = vi.spyOn(perfApi, 'pages').mockResolvedValue({
      pages: [줄('/products', '상품 목록', 1000, 30), 줄('/products', '상품 목록', 3100, 60), 줄('/checkout', '주문서', 1700, 60)],
      compare: { runId: 9, code: 'PRF-0009', kind: 'PAGE', vus: null, pages: [{ url: '/products', lcpMs: 1200 }, { url: '/checkout', lcpMs: 1000 }] },
    });
    render(<PerfRun runId={12} 판정하기={된다} />);

    const 칸 = (await screen.findByRole('heading', { name: '페이지 로딩 (부하 중)' })).closest('section')!;
    expect(페이지).toHaveBeenCalledWith(12);
    expect((await within(칸).findByText('3.1초')).className).toContain('perf-err');
    expect(within(칸).getByText('목표 2.5초 초과, 단독 측정 1.2초')).toBeTruthy();
    expect(within(칸).getByText('1.7초').className).not.toContain('perf-err');
    expect(within(칸).getByText('단독 측정 1초')).toBeTruthy();
    expect(within(칸).queryByText('1초')).toBeNull();
    expect(screen.getByText('스모크 테스트 통과')).toBeTruthy();
  });

  it('측정을 켜지 않은 실행에는 그 칸이 없다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(도는상세());
    숫자들만들기();
    const 페이지 = vi.spyOn(perfApi, 'pages');
    render(<PerfRun runId={12} 판정하기={된다} />);
    await screen.findByText('1,240');
    expect(screen.queryByRole('heading', { name: '페이지 로딩 (부하 중)' })).toBeNull();
    expect(페이지).not.toHaveBeenCalled();
  });

  it('서버 모니터링 에이전트를 고르지 않았으면 그 말을 한다', async () => {
    const 상세 = 도는상세();
    vi.spyOn(perfApi, 'runOf').mockResolvedValue({ ...상세, config: { ...상세.config, monitorIds: [] } });
    숫자들만들기();
    render(<PerfRun runId={12} 판정하기={된다} />);
    expect(await screen.findByText('서버 모니터링 에이전트를 고르지 않았습니다')).toBeTruthy();
  });

  it('실행 중단은 확인을 받고 보낸다. 실행 write 가 없으면 단추가 없다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(도는상세());
    숫자들만들기();
    const 중단 = vi.spyOn(perfApi, 'stop').mockResolvedValue(undefined);
    render(<PerfRun runId={12} 판정하기={된다} />);

    fireEvent.click(await screen.findByRole('button', { name: '실행 중단' }));
    const 창 = screen.getByRole('dialog');
    fireEvent.click(within(창).getByRole('button', { name: '실행 중단' }));
    await waitFor(() => expect(중단).toHaveBeenCalledWith(12));

    cleanup();
    render(<PerfRun runId={12} 판정하기={안된다} />);
    await screen.findByText('1,240');
    expect(screen.queryByRole('button', { name: '실행 중단' })).toBeNull();
  });

  it('이미 끝난 실행을 중단하면 서버 말을 창 안에 보인다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(도는상세());
    숫자들만들기();
    vi.spyOn(perfApi, 'stop').mockRejectedValue(new ApiError(409, 'NOT_RUNNING', '', []));
    render(<PerfRun runId={12} 판정하기={된다} />);
    fireEvent.click(await screen.findByRole('button', { name: '실행 중단' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '실행 중단' }));
    expect(await within(await screen.findByRole('dialog')).findByText('이미 끝난 실행입니다')).toBeTruthy();
  });
});

describe('결과', () => {
  beforeEach(숫자들만들기);

  it('판정 배지 · 중단 사유 · 최대 동시 사용자 · 목표 표 · 성능 저하 글자를 보인다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세());
    const { container } = render(<PerfRun runId={12} 판정하기={된다} />);
    await screen.findByText('주문 트랜잭션에서 병목 발생');

    const 머리 = container.querySelector('.head')!;
    expect(머리.querySelector('.verdict')!.className).toContain('v-fail');
    expect(머리.querySelector('.verdict')!.textContent).toBe('실패');
    expect(머리.textContent).toContain('성능 목표를 벗어나 자동 중단');
    expect(머리.textContent).toContain('22:40');
    expect(container.querySelector('.perf-hero-num')!.textContent).toContain('1,350');
    expect(screen.getByText('이전 실행 1,600명')).toBeTruthy();

    const 표 = screen.getByRole('heading', { name: '성능 목표 달성 여부' }).closest('section')!;
    expect(표.textContent).toContain('전체');
    expect(표.textContent).toContain('기획서');
    expect(표.textContent).toContain('MKT-REQ-001');
    expect(표.textContent).toContain('AI 추천');
    expect(표.textContent).toContain('직접 입력');
    expect(표.textContent).toContain('측정값은 자동 중단 직전 10초 기준, TPS는 최대값');
    expect(within(표).getAllByText('실패')).toHaveLength(2);

    expect(screen.getByRole('heading', { name: '트랜잭션별 결과 (가상 사용자 1,000명 시점)' })).toBeTruthy();
    const 결과표 = screen.getByRole('heading', { name: /^트랜잭션별 결과/ }).closest('section')!;
    const 주문 = within(결과표).getByRole('cell', { name: '주문' }).closest('tr')!;
    const 증가 = within(주문).getByText('성능 저하');
    expect(증가.className).toContain('perf-chg');
    expect(주문.textContent).toContain('36% 증가');
    expect(within(주문).queryByText('성능 저하')!.className).not.toContain('verdict');
    expect(within(within(결과표).getByRole('cell', { name: '로그인' }).closest('tr')!).getByText('변화 없음')).toBeTruthy();
    expect(within(결과표).getByRole('cell', { name: '새 요청' }).closest('tr')!.textContent).toContain('-');
  });

  it('스트레스가 아니면 큰 숫자가 없고, 판정 없는 중단 · 오류는 판정 배지 꼴이 아니다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(
      끝난상세({ status: 'STOPPED', verdict: null, stopReason: 'USER', testType: 'LOAD', config: { ...끝난상세().config, testType: 'LOAD' }, targets: null, transactions: [], comparePoint: null }),
    );
    const { container } = render(<PerfRun runId={12} 판정하기={된다} />);
    await screen.findByText('주문 트랜잭션에서 병목 발생');
    expect(container.querySelector('.perf-hero')).toBeNull();
    const 배지 = container.querySelector('.head .verdict')!;
    expect(배지.textContent).toBe('중단');
    expect(배지.className).toContain('v-na');
    expect(container.querySelector('.head')!.textContent).toContain('사람이 중단');
    expect(screen.getByText('정한 성능 목표가 없어 판정 없이 숫자만 남았습니다')).toBeTruthy();
  });

  it('오류로 끝났으면 「오류」 로 보인다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세({ status: 'ERROR', verdict: null, stopReason: null, targets: null, ai: null }));
    const { container } = render(<PerfRun runId={12} 판정하기={된다} />);
    await waitFor(() => expect(container.querySelector('.head .verdict')?.textContent).toBe('오류'));
  });

  it('AI 일이 도는 동안은 가벼운 일 상태만 묻고, 끝난 것을 알아야 실행을 다시 읽는다', async () => {
    let 지금 = 끝난상세({ ai: null, aiJob: { id: 3, status: 'RUNNING' } });
    const 읽기 = vi.spyOn(perfApi, 'runOf').mockImplementation(() => Promise.resolve(지금));
    let 상태: 'RUNNING' | 'DONE' = 'RUNNING';
    const 묻기 = vi.spyOn(perfApi, 'job').mockImplementation(() => Promise.resolve({ status: 상태 }));
    render(<PerfRun runId={12} 판정하기={된다} />);
    expect(await screen.findByText('AI 분석을 만드는 중입니다')).toBeTruthy();
    await waitFor(() => expect(묻기.mock.calls.length).toBeGreaterThan(2));
    expect(묻기).toHaveBeenCalledWith(3);
    expect(읽기).toHaveBeenCalledTimes(1);
    지금 = 끝난상세();
    상태 = 'DONE';
    expect(await screen.findByText('주문 트랜잭션에서 병목 발생')).toBeTruthy();
    expect(읽기.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(읽기.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('끝난 직후 AI 일이 서기 전 틈에는 만드는 중으로 보고 다시 읽는다. 2분이 지나도 일이 없으면 만들지 못한 것이다', async () => {
    let 지금 = 끝난상세({ ai: null, aiJob: null, finishedAt: new Date(Date.now() - 10_000).toISOString() });
    const 읽기 = vi.spyOn(perfApi, 'runOf').mockImplementation(() => Promise.resolve(지금));
    render(<PerfRun runId={12} 판정하기={된다} />);
    expect(await screen.findByText('AI 분석을 만드는 중입니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '다시 만들기' })).toBeNull();
    await waitFor(() => expect(읽기.mock.calls.length).toBeGreaterThan(1));
    지금 = 끝난상세();
    expect(await screen.findByText('주문 트랜잭션에서 병목 발생')).toBeTruthy();

    cleanup();
    지금 = 끝난상세({ ai: null, aiJob: null, finishedAt: new Date(Date.now() - 200_000).toISOString() });
    render(<PerfRun runId={12} 판정하기={된다} />);
    expect(await screen.findByText('AI 분석을 만들지 못했습니다')).toBeTruthy();
  });

  it('오류로 끝났거나 숫자가 없는 실행은 틈을 기다리지 않는다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세({ status: 'ERROR', verdict: null, ai: null, aiJob: null, finishedAt: new Date().toISOString() }));
    render(<PerfRun runId={12} 판정하기={된다} />);
    expect(await screen.findByText('AI 분석을 만들지 못했습니다')).toBeTruthy();
    cleanup();
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세({ ai: null, aiJob: null, summary: { peakVus: null, maxTps: null, p95Ms: null, errorRate: null }, finishedAt: new Date().toISOString() }));
    render(<PerfRun runId={12} 판정하기={된다} />);
    expect(await screen.findByText('AI 분석을 만들지 못했습니다')).toBeTruthy();
  });

  it('AI 분석이 실패했거나 없으면 다시 만들기가 있다. 실행 write 가 없으면 단추가 없다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세({ ai: null, aiJob: { id: 3, status: 'FAILED' } }));
    const 분석 = vi.spyOn(perfApi, 'analysis').mockResolvedValue({ jobId: 4 });
    render(<PerfRun runId={12} 판정하기={된다} />);
    expect(await screen.findByText('AI 분석을 만들지 못했습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 만들기' }));
    await waitFor(() => expect(분석).toHaveBeenCalledWith(12));

    cleanup();
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세({ ai: null, aiJob: null }));
    render(<PerfRun runId={12} 판정하기={안된다} />);
    expect(await screen.findByText('AI 분석을 만들지 못했습니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '다시 만들기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '다시 실행' })).toBeNull();
  });

  it('다시 실행은 같은 설정으로 새 실행을 만들고 그 번호 화면으로 간다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세());
    const 실행 = vi.spyOn(perfApi, 'run').mockResolvedValue({ runId: 13 });
    render(<PerfRun runId={12} 판정하기={된다} />);
    fireEvent.click(await screen.findByRole('button', { name: '다시 실행' }));
    await waitFor(() => expect(window.location.hash).toBe('#/perf/runs/13'));
    expect(실행).toHaveBeenCalledWith({
      scenarioId: 5,
      env: 'qa',
      testType: 'STRESS',
      basis: 'VUS',
      stages: [{ durationSec: 300, target: 400 }],
      targets: [{ metric: 'P95', op: '<=', value: 2000, source: 'PRD', reqId: 'MKT-REQ-001' }],
      agentIds: [11, 12],
      monitorIds: [21],
    });
  });

  it('다시 실행은 부하 중 페이지 로딩 측정을 켠 실행이면 새 실행에도 켠다', async () => {
    const 상세 = 끝난상세();
    vi.spyOn(perfApi, 'runOf').mockResolvedValue({ ...상세, config: { ...상세.config, pageCheck: true } });
    const 실행 = vi.spyOn(perfApi, 'run').mockResolvedValue({ runId: 13 });
    render(<PerfRun runId={12} 판정하기={된다} />);
    fireEvent.click(await screen.findByRole('button', { name: '다시 실행' }));
    await waitFor(() => expect(window.location.hash).toBe('#/perf/runs/13'));
    expect(실행).toHaveBeenCalledWith(expect.objectContaining({ scenarioId: 5, pageCheck: true }));
  });

  it('PDF 로 내려받기는 실행 번호로 받는다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세());
    const 받기 = vi.spyOn(perfApi, 'pdf').mockResolvedValue({ 파일: new Blob(['x']), 머리: null });
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:perf'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<PerfRun runId={12} 판정하기={된다} />);
    fireEvent.click(await screen.findByRole('button', { name: 'PDF로 내려받기' }));
    await waitFor(() => expect(받기).toHaveBeenCalledWith(12));
  });
});

describe('페이지 측정 실행', () => {
  it('실행 한 건 주소로 와도 페이지 성능 화면의 그 실행으로 보낸다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세({ id: 30, kind: 'PAGE' }));
    render(<PerfRun runId={30} 판정하기={된다} />);
    await waitFor(() => expect(window.location.hash).toBe('#/perf/pages?run=30'));
    expect(screen.queryByRole('button', { name: 'PDF로 내려받기' })).toBeNull();
  });

  it('기기 측정 실행도 기기 성능 화면의 그 실행으로 보낸다', async () => {
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(끝난상세({ id: 40, kind: 'DEVICE' }));
    render(<PerfRun runId={40} 판정하기={된다} />);
    await waitFor(() => expect(window.location.hash).toBe('#/perf/devices?run=40'));
  });
});
