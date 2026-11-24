// @vitest-environment jsdom
// 실행 결과의 거르개 · 쪽 · 펼친 줄이 주소에 남는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」 · ⑱ WEB-F8-03)

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, type RunListRow, type RunTally } from './api.js';
import { use이동 } from './leaveGuard.js';
import { RunList } from './RunList.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 실행까지 } from './RunResult.fixture.js';
import { 견줌, 끝난실행, 섞인항목, 첫실행, 칩, 항목줄 } from './RunResultAssemble.fixture.js';
import { 보기읽기, 보기조건, 처음보기, 펼침바꾼보기 } from './runResultView.js';

beforeEach(() => {
  vi.spyOn(api, 'run').mockImplementation((id) => Promise.resolve({ ...끝난실행(섞인항목), runId: id }));
  vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
  vi.spyOn(api, 'runs').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, summary: { runs: 0, allPass: 0, hasFail: 0, durationOf: 0, avgDurationMs: 0, maxDurationMs: 0 } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const 예순 = Array.from({ length: 60 }, (_, i) => 항목줄(i + 1, `K${String(i + 1).padStart(2, '0')}`, 'desktop', 'PASS'));
const 줄수 = () => document.querySelectorAll('.rf-row').length;
const 줄단추 = (tcId: string) => [...document.querySelectorAll('.rf-row')].find((el) => el.querySelector('.rf-id')?.textContent === tcId)!.querySelector('button.rf-line')!;

describe('주소 칸 읽고 쓰기', () => {
  it('쓴 조건을 다시 읽으면 같은 보기다 — 기본값은 적지 않는다', () => {
    const 보기 = { 판정: 'FAIL', device: 'mobile', 변화: '새로깨짐', 쪽: 2, 열린: ['A-FN-001', 'A-FN-002'] } as const;
    const 조건 = new URLSearchParams(보기조건({ ...보기, 열린: [...보기.열린] }));

    expect(보기읽기(조건)).toEqual(보기);
    expect(보기조건(처음보기)).toEqual({});
  });

  it('손으로 고친 모르는 값은 기본값으로 읽는다', () => {
    const 조건 = new URLSearchParams('status=PASSED&device=tv&change=x&rowpage=0&open=');

    expect(보기읽기(조건)).toEqual(처음보기);
  });

  it('카드 목록 때의 옛 칸(cardpage · cause · unjudged · autofix)은 읽지도 쓰지도 않는다', () => {
    const 보기 = 보기읽기(new URLSearchParams('cardpage=3&cause=timeout&unjudged=1&autofix=1&rowpage=2'));

    expect(보기).toEqual({ ...처음보기, 쪽: 2 });
    expect(보기조건(보기)).toEqual({ rowpage: '2' });
  });

  it('대시보드 고리의 tc 는 펼친 카드로 받는다', () => {
    expect(보기읽기(new URLSearchParams('tc=A-FN-009')).열린).toEqual(['A-FN-009']);
    expect(보기읽기(new URLSearchParams('open=A-FN-009&tc=A-FN-009')).열린).toEqual(['A-FN-009']);
  });

  it('같은 카드를 다시 펴면 보기가 그대로다', () => {
    const 편 = 펼침바꾼보기(처음보기, 'A-FN-001', true);

    expect(펼침바꾼보기(편, 'A-FN-001', true)).toBe(편);
    expect(펼침바꾼보기(편, 'A-FN-001', false).열린).toEqual([]);
  });
});

describe('결과 화면 #/runs/번호', () => {
  it('쪽 · 펼친 줄이 주소에 남고 그 주소로 다시 열면 그 쪽의 그 줄이 펼쳐 선다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}`;
    vi.mocked(api.run).mockImplementation((id) => Promise.resolve({ ...끝난실행(예순), runId: id }));
    const 읽기 = vi.spyOn(api, 'item').mockRejectedValue(new Error('상세 없음'));
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    await waitFor(() => expect(줄수()).toBe(10));
    fireEvent.click(줄단추('K55'));

    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?rowpage=2&open=K55`);

    cleanup();
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(줄수()).toBe(10));
    expect(줄단추('K55').getAttribute('aria-expanded')).toBe('true');
    expect(줄단추('K56').getAttribute('aria-expanded')).toBe('false');
    expect(읽기).toHaveBeenCalledWith(RUN_ID, 55);
  });

  it('쪽을 넘기면 펼친 줄은 주소에서 빠진다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}?open=K01`;
    vi.mocked(api.run).mockImplementation((id) => Promise.resolve({ ...끝난실행(예순), runId: id }));
    vi.spyOn(api, 'item').mockRejectedValue(new Error('상세 없음'));
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await waitFor(() => expect(줄수()).toBe(50));
    expect(줄단추('K01').getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => expect(줄수()).toBe(10));
    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?rowpage=2`);
  });

  it('판정 칩 · 디바이스 칩이 주소에 남는다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}`;
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await screen.findByText('이름-ZRR-002');

    fireEvent.click(칩('Fail'));
    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?status=FAIL`);
    fireEvent.click(screen.getByRole('button', { name: '모바일' }));

    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?status=FAIL&device=mobile`);
  });
});

describe('풀 길이 없는 거르개', () => {
  it('이전 실행이 없는 실행에 주소로 「회귀 실패」가 걸려 와도 줄을 거르지 않는다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}?change=new`;
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByText('이름-ZRR-002');
    expect(document.querySelectorAll('.rf-row')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /^회귀 실패/ })).toBeNull();
  });

  it('이전 실행이 있으면 주소의 「회귀 실패」가 걸려 그 변화의 줄만 남는다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}?change=new`;
    vi.mocked(api.insights).mockResolvedValue(견줌);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(줄수()).toBe(1));
    expect(document.querySelector('.rf-id')?.textContent).toBe('ZRR-001');
  });
});

describe('실행 기록의 결과 칸', () => {
  const 빈집계: RunTally = { runs: 0, allPass: 0, hasFail: 0, durationOf: 0, avgDurationMs: 0, maxDurationMs: 0 };
  function 실행줄(runId: number): RunListRow {
    return {
      runId,
      title: `ZRR 실행 ${String(runId)}`,
      triggeredBy: 'zrr',
      triggeredByName: '김검사',
      env: 'qa',
      baseUrl: 'https://qa.example.com',
      serviceName: 'ZRR',
      status: 'FINISHED',
      origin: 'MANUAL',
      rerunOf: null,
      startedAt: '2026-09-22T00:00:00.000Z',
      finishedAt: '2026-09-22T00:10:00.000Z',
      counts: { total: 3, pass: 2, fail: 1, na: 0, running: 0 },
      change: null,
    };
  }
  function 뿌리() {
    const { 조건번 } = use이동();
    return <RunList key={조건번} kind="FN" service="ZRR" envs={[]} 판정하기={() => 실행까지} />;
  }

  it('다른 실행을 고르면 거르개는 풀리고 기록이 쌓인다 — 뒤로 가면 앞 실행에 건 거르개가 다시 선다', async () => {
    window.location.hash = '#/runs/fn?run=2112';
    vi.spyOn(api, 'runs').mockResolvedValue({ items: [실행줄(2113), 실행줄(2112)], total: 2, page: 1, pageSize: 20, summary: 빈집계 });
    render(<뿌리 />);
    await waitFor(() => expect(api.run).toHaveBeenCalledWith(2112));

    fireEvent.click(screen.getByRole('button', { name: 'PC' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=2112&device=desktop'));
    const 칸수 = window.history.length;

    fireEvent.click(screen.getByText('ZRR 실행 2113').closest('.run-row')!);
    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=2113'));
    expect(window.history.length).toBe(칸수 + 1);

    await act(async () => {
      window.history.back();
      await new Promise((끝) => setTimeout(끝, 30));
    });

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=2112&device=desktop'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'PC' }).getAttribute('aria-pressed')).toBe('true'));
  });

  it('결과 칸의 칩은 기록을 쌓지 않는다', async () => {
    window.location.hash = '#/runs/fn?run=2112';
    vi.spyOn(api, 'runs').mockResolvedValue({ items: [실행줄(2112)], total: 1, page: 1, pageSize: 20, summary: 빈집계 });
    render(<뿌리 />);
    await screen.findByText('이름-ZRR-002');
    const 칸수 = window.history.length;

    fireEvent.click(칩('Fail'));

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=2112&status=FAIL'));
    expect(window.history.length).toBe(칸수);
  });

  it('실행을 안 고른 채 거르개를 바꿔 맨 위 줄이 다른 실행이 되면 결과 칸은 처음 보기다 — 앞 실행의 거르개가 남지 않는다', async () => {
    window.location.hash = '#/runs/fn';
    vi.spyOn(api, 'runs').mockImplementation((_s, _p, 조건) =>
      Promise.resolve({ items: [실행줄(조건?.state === 'failed' ? 2111 : 2112)], total: 1, page: 1, pageSize: 20, summary: 빈집계 }),
    );
    render(<뿌리 />);
    fireEvent.click(await screen.findByRole('button', { name: 'PC' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?device=desktop'));

    fireEvent.change(screen.getByRole('combobox', { name: '상태' }), { target: { value: 'failed' } });

    await waitFor(() => expect(api.run).toHaveBeenCalledWith(2111));
    expect(window.location.hash).toBe('#/runs/fn?state=failed');
    await waitFor(() => expect(screen.getByRole('button', { name: 'PC' }).getAttribute('aria-pressed')).toBe('false'));
  });

  it('애플리케이션을 바꿔 고른 실행을 버리면 기록을 쌓지 않고 지금 칸을 고친다', async () => {
    window.location.hash = '#/runs/fn?run=2112&device=desktop';
    vi.spyOn(api, 'runs').mockImplementation((서비스) =>
      Promise.resolve({ items: [실행줄(서비스 === 'ZRR' ? 2112 : 3001)], total: 1, page: 1, pageSize: 20, summary: 빈집계 }),
    );
    const { rerender } = render(<RunList kind="FN" service="ZRR" envs={[]} 판정하기={() => 실행까지} />);
    await waitFor(() => expect(api.run).toHaveBeenCalledWith(2112));
    await waitFor(() => expect(screen.getByRole('button', { name: 'PC' }).getAttribute('aria-pressed')).toBe('true'));
    const 칸수 = window.history.length;

    rerender(<RunList kind="FN" service="ZRX" envs={[]} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn'));
    expect(window.history.length).toBe(칸수);
  });

  it('보이는 맨 위 줄을 눌러 고르면 걸어 둔 거르개가 그대로다', async () => {
    window.location.hash = '#/runs/fn';
    vi.spyOn(api, 'runs').mockResolvedValue({ items: [실행줄(2112)], total: 1, page: 1, pageSize: 20, summary: 빈집계 });
    render(<뿌리 />);
    fireEvent.click(await screen.findByRole('button', { name: 'PC' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?device=desktop'));

    fireEvent.click(screen.getByText('ZRR 실행 2112').closest('.run-row')!);

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=2112&device=desktop'));
    expect(screen.getByRole('button', { name: 'PC' }).getAttribute('aria-pressed')).toBe('true');
  });
});
