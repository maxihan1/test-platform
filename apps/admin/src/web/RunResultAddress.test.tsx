// @vitest-environment jsdom
// 실행 결과의 거르개 · 쪽 · 펼친 카드가 주소에 남는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」 · ⑱ WEB-F8-03)

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, type RunListRow, type RunTally } from './api.js';
import { use이동 } from './leaveGuard.js';
import { RunList } from './RunList.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 실행까지 } from './RunResult.fixture.js';
import { 끝난실행, 섞인항목, 첫실행, 카드응답 } from './RunResultAssemble.fixture.js';
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

function 쪽마다한장() {
  return vi.spyOn(api, 'failures').mockImplementation((_id, 쪽) =>
    Promise.resolve({ items: [카드응답(`ZRR-00${String(쪽)}`)], total: 3, page: 쪽, pageSize: 1 }),
  );
}

const 접이 = () => document.querySelector('details.fc-fold') as HTMLDetailsElement;
const 카드가선다 = (tcId: string) => waitFor(() => expect(document.querySelector('.fc-tc')?.textContent).toBe(tcId));
async function 편다() {
  await act(async () => {
    접이().open = true;
    접이().dispatchEvent(new Event('toggle'));
  });
}

describe('주소 칸 읽고 쓰기', () => {
  it('쓴 조건을 다시 읽으면 같은 보기다 — 기본값은 적지 않는다', () => {
    const 보기 = { 판정: 'FAIL', device: 'mobile', 변화: '새로깨짐', 쪽: 2, 카드쪽: 3, 유형: 'timeout', 안본것만: true, 열린: ['A-FN-001', 'A-FN-002'] } as const;
    const 조건 = new URLSearchParams(보기조건({ ...보기, 열린: [...보기.열린] }));

    expect(보기읽기(조건)).toEqual(보기);
    expect(보기조건(처음보기)).toEqual({});
  });

  it('손으로 고친 모르는 값은 기본값으로 읽는다', () => {
    const 조건 = new URLSearchParams('status=PASSED&device=tv&change=x&rowpage=0&cardpage=-1&cause=bug&unjudged=yes&open=');

    expect(보기읽기(조건)).toEqual(처음보기);
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
  it('카드 쪽 · 펼친 카드가 주소에 남고 그 주소로 다시 열면 그 쪽의 그 카드가 펼쳐 선다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}`;
    const 실패부름 = 쪽마다한장();
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    await 카드가선다('ZRR-002');
    await 편다();

    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?cardpage=2&open=ZRR-002`);

    cleanup();
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await 카드가선다('ZRR-002');
    expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 2, undefined);
    expect(접이().open).toBe(true);
  });

  it('쪽을 넘기면 펼친 카드는 주소에서 빠진다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}?open=ZRR-001`;
    쪽마다한장();
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await 카드가선다('ZRR-001');
    expect(접이().open).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await 카드가선다('ZRR-002');
    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?cardpage=2`);
    expect(접이().open).toBe(false);
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
    쪽마다한장();
    render(<뿌리 />);
    await waitFor(() => expect(api.failures).toHaveBeenCalledWith(2112, 1, undefined));

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
    쪽마다한장();
    render(<뿌리 />);
    const 칸수 = window.history.length;

    fireEvent.click(await screen.findByRole('button', { name: '판정 안 한 카드 1' }));

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=2112&unjudged=1'));
    expect(window.history.length).toBe(칸수);
  });
});
