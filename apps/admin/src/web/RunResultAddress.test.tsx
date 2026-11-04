// @vitest-environment jsdom
// 실행 결과의 거르개 · 쪽 · 펼친 카드가 주소에 남는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」 · ⑱ WEB-F8-03)

import { useState } from 'react';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, type RunListRow, type RunTally } from './api.js';
import { use이동 } from './leaveGuard.js';
import { RunFailCards } from './RunFailCards.js';
import { 장치, 줄, 쪽 as 카드쪽, 케이스 } from './RunFailCards.fixture.js';
import { RunList } from './RunList.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 실행까지 } from './RunResult.fixture.js';
import { 끝난실행, 섞인항목, 첫실행, 카드응답 } from './RunResultAssemble.fixture.js';
import { 보기읽기, 보기조건, 처음보기, 펼침바꾼보기, type 결과보기 } from './runResultView.js';

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

describe('풀 길이 없는 거르개', () => {
  it('직전 실행이 없는 실행에 주소로 「회귀 실패」가 걸려 와도 카드를 거르지 않는다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}?change=new`;
    쪽마다한장();
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await 카드가선다('ZRR-001');
    expect(screen.queryByRole('button', { name: /^회귀 실패/ })).toBeNull();
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

  it('실행을 안 고른 채 거르개를 바꿔 맨 위 줄이 다른 실행이 되면 결과 칸은 처음 보기다 — 앞 실행의 거르개가 남지 않는다', async () => {
    window.location.hash = '#/runs/fn';
    vi.spyOn(api, 'runs').mockImplementation((_s, _p, 조건) =>
      Promise.resolve({ items: [실행줄(조건?.state === 'failed' ? 2111 : 2112)], total: 1, page: 1, pageSize: 20, summary: 빈집계 }),
    );
    쪽마다한장();
    render(<뿌리 />);
    fireEvent.click(await screen.findByRole('button', { name: 'PC' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?device=desktop'));

    fireEvent.change(screen.getByRole('combobox', { name: '상태' }), { target: { value: 'failed' } });

    await waitFor(() => expect(api.failures).toHaveBeenCalledWith(2111, 1, undefined));
    expect(window.location.hash).toBe('#/runs/fn?state=failed');
  });

  it('애플리케이션을 바꿔 고른 실행을 버리면 기록을 쌓지 않고 지금 칸을 고친다', async () => {
    window.location.hash = '#/runs/fn?run=2112&device=desktop';
    vi.spyOn(api, 'runs').mockImplementation((서비스) =>
      Promise.resolve({ items: [실행줄(서비스 === 'ZRR' ? 2112 : 3001)], total: 1, page: 1, pageSize: 20, summary: 빈집계 }),
    );
    쪽마다한장();
    const { rerender } = render(<RunList kind="FN" service="ZRR" envs={[]} 판정하기={() => 실행까지} />);
    await waitFor(() => expect(api.failures).toHaveBeenCalledWith(2112, 1, 'desktop'));
    const 칸수 = window.history.length;

    rerender(<RunList kind="FN" service="ZRX" envs={[]} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn'));
    expect(window.history.length).toBe(칸수);
  });

  it('보이는 맨 위 줄을 눌러 고르면 걸어 둔 거르개가 그대로다', async () => {
    window.location.hash = '#/runs/fn';
    vi.spyOn(api, 'runs').mockResolvedValue({ items: [실행줄(2112)], total: 1, page: 1, pageSize: 20, summary: 빈집계 });
    쪽마다한장();
    render(<뿌리 />);
    fireEvent.click(await screen.findByRole('button', { name: 'PC' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?device=desktop'));

    fireEvent.click(screen.getByText('ZRR 실행 2112').closest('.run-row')!);

    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?run=2112&device=desktop'));
    expect(screen.getByRole('button', { name: 'PC' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('링크로 온 카드', () => {
  const 두줄 = [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'desktop', 'FAIL')];
  const 한장 = (tcId: string, page: number) => 카드쪽([케이스(tcId, tcId, [장치('desktop', page)])], { total: 2, pageSize: 1, page });

  it('카드를 찾는 사이 목록이 내려가면 찾은 쪽으로 보기를 옮기지 않는다', async () => {
    let 둘째쪽: (값: ReturnType<typeof 한장>) => void = () => undefined;
    vi.spyOn(api, 'failures').mockImplementation((_id, 쪽) =>
      쪽 === 1 ? Promise.resolve(한장('ZZI-0001', 1)) : new Promise((끝) => { 둘째쪽 = 끝; }),
    );
    const 바꾸기 = vi.fn();
    const { unmount } = render(<RunFailCards runId={RUN_ID} env="qa" items={두줄} platform="ALL" 열카드="ZZI-0002" 보기={처음보기} 바꾸기={바꾸기} />);
    await waitFor(() => expect(api.failures).toHaveBeenCalledWith(RUN_ID, 2, undefined));

    unmount();
    await act(async () => {
      둘째쪽(한장('ZZI-0002', 2));
      await new Promise((끝) => setTimeout(끝, 0));
    });

    expect(바꾸기).not.toHaveBeenCalled();
  });

  it('접어 둔 카드는 칩으로 가렸다 다시 보여도 접힌 채이고 화면을 다시 옮기지 않는다', async () => {
    vi.spyOn(api, 'failures').mockResolvedValue(카드쪽([케이스('ZZI-0002', '로그인', [장치('desktop', 2)])]));
    const 옮김 = vi.fn();
    Element.prototype.scrollIntoView = 옮김;
    function 감싸개() {
      const [보기, set보기] = useState<결과보기>({ ...처음보기, 열린: ['ZZI-0002'] });
      return <RunFailCards runId={RUN_ID} env="qa" items={두줄} platform="ALL" 열카드="ZZI-0002" 유형들={[{ type: 'timeout', count: 1, tcIds: ['ZZI-0009'] }]} 보기={보기} 바꾸기={(바꿀) => set보기((앞) => ({ ...앞, ...(typeof 바꿀 === 'function' ? 바꿀(앞) : 바꿀) }))} />;
    }
    render(<감싸개 />);
    await waitFor(() => expect(접이()?.open).toBe(true));
    expect(옮김).toHaveBeenCalledTimes(1);
    await act(async () => {
      접이().open = false;
      접이().dispatchEvent(new Event('toggle'));
    });

    const 칩 = screen.getByRole('button', { name: /타임아웃/ });
    fireEvent.click(칩);
    expect(접이()).toBeNull();
    fireEvent.click(칩);

    expect(접이().open).toBe(false);
    expect(옮김).toHaveBeenCalledTimes(1);
  });
});
