// @vitest-environment jsdom
// 한 건 실행 — 걸면 그 자리에서 진행 창 · 끝나면 붙은 실행 글 · 「결과 보기」는 붙은 실행의 그 케이스 카드나 케이스 상세 (도메인/실행 §3.2 · §8.9)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';

import { api, type RunItemSummary } from './api.js';
import { RUN_ID, 끝난응답, 도는중응답, 실행까지 } from './RunResult.fixture.js';
import { RunWatch } from './RunWatch.js';
import { 지켜보는실행, 지켜본다 } from './runWatchStore.js';
import { useRunStart } from './useRunStart.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
  지켜본다(null);
  window.location.hash = '';
});

const 붙은 = 40;

function 항목(덮음: boolean): RunItemSummary {
  return {
    historyId: 7, tcId: 'ZRS-001', tcName: '로그인', platform: 'desktop', attempt: 1, params: {}, paramSchema: {}, status: 'PASS',
    durationMs: 1, error: null, startedAt: '', finishedAt: '',
    rerun: 덮음 ? { runId: RUN_ID, finishedAt: '2026-10-30T01:00:00.000Z', triggeredBy: '김실행', original: { historyId: 3, status: 'FAIL', finishedAt: null } } : null,
  };
}

const 한건 = { origin: 'SINGLE' as const, items: [{ ...항목(false), rerun: null }] };
const 붙은실행 = (실패: number, 덮음: boolean) => ({ ...끝난응답, runId: 붙은, counts: { total: 12, pass: 12 - 실패, fail: 실패, na: 0, running: 0 }, items: [항목(덮음)] });

async function 그린다() {
  지켜본다({ runId: RUN_ID, 열림: true });
  render(<RunWatch 판정하기={() => 실행까지} />);
  await act(async () => {});
}

describe('한 건 실행 진행 창 (도메인/실행 §8.9 「완료 모달」)', () => {
  it('끝나면 붙은 실행과 실패 수 변화를 적고 「결과 보기」는 그 실행의 그 케이스 카드로 간다', async () => {
    vi.useFakeTimers();
    let 끝 = false;
    vi.spyOn(api, 'run').mockImplementation((runId) =>
      Promise.resolve(
        runId === 붙은
          ? 붙은실행(끝 ? 10 : 11, 끝)
          : { ...(끝 ? 끝난응답 : 도는중응답), ...한건, rerunOf: 붙은 },
      ),
    );
    await 그린다();
    끝 = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByText('RUN 40 결과에 다시 실행으로 붙었습니다 · 실패 11 → 10')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '결과 보기' }));
    expect(window.location.hash).toBe('#/runs/fn?run=40&tc=ZRS-001');
    expect(지켜보는실행()).toBeNull();
  });

  it('끝난 뒤에 처음 열면 앞 수를 모르니 실패 수 변화 없이 붙은 실행만 적는다', async () => {
    vi.spyOn(api, 'run').mockImplementation((runId) =>
      Promise.resolve(runId === 붙은 ? 붙은실행(10, true) : { ...끝난응답, ...한건, rerunOf: 붙은 }),
    );
    await 그린다();
    expect(screen.getByText('RUN 40 결과에 다시 실행으로 붙었습니다')).toBeTruthy();
  });

  it('도는 동안 읽은 붙은 실행에 이미 이 한 건이 덮은 항목이 있으면 앞 수로 쓰지 않는다', async () => {
    vi.useFakeTimers();
    let 끝 = false;
    vi.spyOn(api, 'run').mockImplementation((runId) =>
      Promise.resolve(runId === 붙은 ? 붙은실행(10, true) : { ...(끝 ? 끝난응답 : 도는중응답), ...한건, rerunOf: 붙은 }),
    );
    await 그린다();
    끝 = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByText('RUN 40 결과에 다시 실행으로 붙었습니다')).toBeTruthy();
  });

  it('붙은 곳이 없으면 케이스 상세 「실행 기록」에 남았다고 적고 「결과 보기」는 케이스 상세로 간다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...끝난응답, ...한건, rerunOf: null });
    await 그린다();
    expect(screen.getByText('이 케이스 상세의 「실행 기록」에 남았습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '결과 보기' }));
    expect(window.location.hash).toBe('#/cases/fn?q=ZRS-001&case=ZRS-001');
  });
});

describe('한 건을 걸면 (도메인/실행 §3.2 「저장」)', () => {
  const 요청 = (tcIds: string[], repeat = 1) => ({ env: 'qa', repeat, notifySlack: false, items: tcIds.map((tcId) => ({ tcId, platforms: ['desktop' as const], params: {}, expected: {} })) });

  it('붙은 곳이 있으면 실행 기록으로 옮기지 않고 진행 창을 연다', async () => {
    vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 51, attachedTo: 붙은 });
    const { result } = renderHook(() => useRunStart());
    await act(async () => {
      await result.current.걸기(요청(['ZRS-001']));
    });
    expect(지켜보는실행()).toEqual({ runId: 51, 열림: true });
    expect(window.location.hash).toBe('');
  });

  it('붙은 곳이 없어도 서버가 한 건으로 만들었으면 진행 창을 연다', async () => {
    vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 51, attachedTo: null });
    vi.spyOn(api, 'run').mockResolvedValue({ ...끝난응답, runId: 51, origin: 'SINGLE' });
    const { result } = renderHook(() => useRunStart());
    await act(async () => {
      await result.current.걸기(요청(['ZRS-001']));
    });
    expect(지켜보는실행()).toEqual({ runId: 51, 열림: true });
  });

  it('한 건 모양이어도 서버가 새 RUN(RERUN)으로 만들었으면 실행 기록으로 간다', async () => {
    vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 51, attachedTo: null });
    vi.spyOn(api, 'run').mockResolvedValue({ ...끝난응답, runId: 51, origin: 'RERUN' });
    const { result } = renderHook(() => useRunStart());
    await act(async () => {
      await result.current.걸기({ ...요청(['ZRS-001']), rerunOf: 40 });
    });
    expect(지켜보는실행()).toBeNull();
    expect(window.location.hash).toBe('#/runs/fn?run=51');
  });

  it('여러 건이면 실행을 읽지 않고 실행 기록으로 간다', async () => {
    vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 52, attachedTo: null });
    const 읽기 = vi.spyOn(api, 'run');
    const { result } = renderHook(() => useRunStart());
    await act(async () => {
      await result.current.걸기(요청(['ZRS-001', 'ZRS-002']));
    });
    expect(읽기).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/runs/fn?run=52');
  });
});
