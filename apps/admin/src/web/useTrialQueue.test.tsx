// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError, type RunRequestItem, type TrialResult } from './api.js';
import { useTrialQueue } from './useTrialQueue.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 항목 = (tcId: string): RunRequestItem => ({ tcId, platforms: ['desktop', 'mobile'], params: { a: 1 }, expected: {} });
const 통과: TrialResult = { status: 'PASS', durationMs: 5, steps: [] };

function 서버(결과들: Record<string, TrialResult>) {
  const 시작 = vi.spyOn(api, 'startTrial').mockImplementation((tcId) => Promise.resolve({ trialId: `t-${tcId}` }));
  const 읽기 = vi.spyOn(api, 'getTrial').mockImplementation((tcId) =>
    Promise.resolve({ status: 'DONE' as const, result: 결과들[tcId] ?? 통과 }),
  );
  return { 시작, 읽기 };
}

describe('테스트 실행 큐 (여러 건을 차례로)', () => {
  it('케이스를 차례로 하나씩 돌리고 줄마다 결과를 채운다', async () => {
    const { 시작 } = 서버({ 'X-2': { status: 'FAIL', durationMs: 9, steps: [] } });
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1'), 항목('X-2')], 'http://localhost:3002');
    });

    expect(시작.mock.calls.map(([id]) => id)).toEqual(['X-1', 'X-2']);
    expect(result.current.줄들['X-1']).toMatchObject({ 종류: 'done', 결과: { status: 'PASS' } });
    expect(result.current.줄들['X-2']).toMatchObject({ 종류: 'done', 결과: { status: 'FAIL' } });
    expect(result.current.도는중).toBe(false);
  });

  it('디바이스는 첫째 하나만 보내고 열 주소와 입력값을 그대로 싣는다', async () => {
    const { 시작 } = 서버({});
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1')], 'http://localhost:3002');
    });

    expect(시작).toHaveBeenCalledWith('X-1', { platform: 'desktop', baseUrl: 'http://localhost:3002', params: { a: 1 }, expected: {} });
  });

  it('돌기 전 줄은 대기이고 도는 줄은 실행 중이다', async () => {
    서버({});
    let 풀기!: () => void;
    vi.spyOn(api, 'getTrial').mockImplementationOnce(
      () => new Promise((ok) => { 풀기 = () => ok({ status: 'DONE', result: 통과 }); }),
    );
    const { result } = renderHook(() => useTrialQueue(1));

    let 끝: Promise<void>;
    act(() => {
      끝 = result.current.시작([항목('X-1'), 항목('X-2')], 'http://localhost:3002');
    });
    await waitFor(() => expect(result.current.줄들['X-1']).toEqual({ 종류: 'run' }));
    expect(result.current.줄들['X-2']).toEqual({ 종류: 'wait' });
    expect(result.current.도는중).toBe(true);

    await act(async () => {
      풀기();
      await 끝!;
    });
  });

  it('꺼진 서버(TRIAL_OFF)면 남은 줄까지 안내하고 멈춘다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockRejectedValue(new ApiError(409, 'TRIAL_OFF', '꺼짐', []));
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1'), 항목('X-2')], 'http://localhost:3002');
    });

    expect(시작).toHaveBeenCalledTimes(1);
    expect(result.current.줄들['X-1']).toMatchObject({ 종류: 'notice' });
    expect(result.current.줄들['X-2']).toMatchObject({ 종류: 'notice' });
  });

  it('입력값이 명세와 안 맞는 줄은 그 줄만 안내하고 다음 줄을 이어 돈다', async () => {
    vi.spyOn(api, 'startTrial').mockImplementation((tcId) =>
      tcId === 'X-1'
        ? Promise.reject(new ApiError(400, 'INVALID_PARAMS', '틀림', [{ path: 'a', message: '틀림' }]))
        : Promise.resolve({ trialId: 't2' }),
    );
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: 통과 });
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1'), 항목('X-2')], 'http://localhost:3002');
    });

    expect(result.current.줄들['X-1']).toMatchObject({ 종류: 'notice' });
    expect(result.current.줄들['X-2']).toMatchObject({ 종류: 'done' });
  });

  it('화면을 떠나면 남은 줄을 시작하지 않는다', async () => {
    const { 시작 } = 서버({});
    let 풀기!: () => void;
    vi.spyOn(api, 'getTrial').mockImplementationOnce(
      () => new Promise((ok) => { 풀기 = () => ok({ status: 'DONE', result: 통과 }); }),
    );
    const { result, unmount } = renderHook(() => useTrialQueue(1));

    let 끝: Promise<void>;
    act(() => {
      끝 = result.current.시작([항목('X-1'), 항목('X-2')], 'http://localhost:3002');
    });
    await waitFor(() => expect(시작).toHaveBeenCalledTimes(1));
    unmount();
    풀기();
    await 끝!;

    expect(시작).toHaveBeenCalledTimes(1);
  });
});
