// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError, type RunRequestItem, type TrialResult } from './api.js';
import { type 디바이스칸, useTrialQueue, 단계쌓기, 제목맞나 } from './useTrialQueue.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 항목 = (tcId: string): RunRequestItem => ({ tcId, platforms: ['desktop'], params: { a: 1 }, expected: {} });
const 첫칸 = (줄들: Record<string, 디바이스칸[]>, tcId: string) => 줄들[tcId]?.[0]?.줄;
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
      await result.current.시작([항목('X-1'), 항목('X-2')], 'qa');
    });

    expect(시작.mock.calls.map(([id]) => id)).toEqual(['X-1', 'X-2']);
    expect(첫칸(result.current.줄들, 'X-1')).toMatchObject({ 종류: 'done', 결과: { status: 'PASS' } });
    expect(첫칸(result.current.줄들, 'X-2')).toMatchObject({ 종류: 'done', 결과: { status: 'FAIL' } });
    expect(result.current.도는중).toBe(false);
  });

  it('고른 디바이스를 PC → 모바일 차례로 다 돌리고 대상 서버 이름 · 입력값 · 모바일 칸의 실행 기기를 그대로 싣는다', async () => {
    const { 시작 } = 서버({});
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([{ ...항목('X-1'), platforms: ['mobile', 'desktop'] }], 'qa', 'vision');
    });

    expect(시작.mock.calls).toEqual([
      ['X-1', { platform: 'desktop', env: 'qa', params: { a: 1 }, expected: {} }],
      ['X-1', { platform: 'mobile', env: 'qa', params: { a: 1 }, expected: {}, mobileOn: 'vision' }],
    ]);
    expect(result.current.줄들['X-1']).toMatchObject([
      { platform: 'desktop', 줄: { 종류: 'done', 결과: 통과, 실패: null, 제목들: null } },
      { platform: 'mobile', 줄: { 종류: 'done', 결과: 통과, 실패: null, 제목들: null } },
    ]);
  });

  it('모바일 차례에는 오른쪽 칸이 모바일 시험을 그린다 — 차례는 케이스 × 디바이스로 센다', async () => {
    서버({});
    let 풀기!: () => void;
    vi.spyOn(api, 'getTrial')
      .mockResolvedValueOnce({ status: 'DONE', result: 통과 })
      .mockImplementationOnce(() => new Promise((ok) => { 풀기 = () => ok({ status: 'DONE', result: 통과 }); }));
    const { result } = renderHook(() => useTrialQueue(1));

    let 끝: Promise<void>;
    act(() => {
      끝 = result.current.시작([{ ...항목('X-1'), platforms: ['desktop', 'mobile'] }], 'qa');
    });
    await waitFor(() => expect(result.current.지금).toMatchObject({ tcId: 'X-1', platform: 'mobile', 차례: 2, 전체: 2 }));
    expect(result.current.줄들['X-1']?.[1]).toEqual({ platform: 'mobile', 줄: { 종류: 'run' } });

    await act(async () => {
      풀기();
      await 끝!;
    });
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
      끝 = result.current.시작([항목('X-1'), 항목('X-2')], 'qa');
    });
    await waitFor(() => expect(첫칸(result.current.줄들, 'X-1')).toEqual({ 종류: 'run' }));
    expect(첫칸(result.current.줄들, 'X-2')).toEqual({ 종류: 'wait' });
    expect(result.current.도는중).toBe(true);

    await act(async () => {
      풀기();
      await 끝!;
    });
  });

  it('두 번 눌러도 큐가 하나만 돈다', async () => {
    const { 시작 } = 서버({});
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await Promise.all([
        result.current.시작([항목('X-1'), 항목('X-2')], 'qa'),
        result.current.시작([항목('X-1'), 항목('X-2')], 'qa'),
      ]);
    });

    expect(시작).toHaveBeenCalledTimes(2);
  });

  it('이미 돌고 있는 것이 있으면(TRIAL_BUSY) 남은 줄에도 같은 안내를 붙이고 멈춘다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockRejectedValue(new ApiError(409, 'TRIAL_BUSY', '바쁨', []));
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1'), 항목('X-2')], 'qa');
    });

    expect(시작).toHaveBeenCalledTimes(1);
    expect(첫칸(result.current.줄들, 'X-2')).toEqual({ 종류: 'notice', 글: '이미 시험 실행이 돌고 있습니다' });
  });

  it('그 밖의 오류로 멈추면 남은 줄은 앞에서 멈췄다고 적는다 — 대기로 남기지 않는다', async () => {
    vi.spyOn(api, 'startTrial').mockRejectedValue(new Error('네트워크 끊김'));
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1'), 항목('X-2')], 'qa');
    });

    expect(첫칸(result.current.줄들, 'X-1')).toMatchObject({ 종류: 'notice' });
    expect(첫칸(result.current.줄들, 'X-2')).toEqual({ 종류: 'notice', 글: '앞 케이스 오류로 실행하지 않았습니다' });
  });

  it('PC 칸에서 멈추면 같은 케이스의 모바일 칸도 대기로 남기지 않는다', async () => {
    vi.spyOn(api, 'startTrial').mockRejectedValue(new Error('네트워크 끊김'));
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([{ ...항목('X-1'), platforms: ['desktop', 'mobile'] }], 'qa');
    });

    expect(result.current.줄들['X-1']?.[1]).toEqual({ platform: 'mobile', 줄: { 종류: 'notice', 글: '앞 디바이스 오류로 실행하지 않았습니다' } });
  });

  it('모바일 폰이 바쁘면(DEVICE_BUSY) 그 칸만 안내하고 다음 케이스를 이어 돈다', async () => {
    vi.spyOn(api, 'startTrial').mockImplementation((tcId, body) =>
      body.platform === 'mobile' ? Promise.reject(new ApiError(409, 'DEVICE_BUSY', '', [])) : Promise.resolve({ trialId: `t-${tcId}` }),
    );
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: 통과 });
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([{ ...항목('X-1'), platforms: ['desktop', 'mobile'] }, 항목('X-2')], 'qa');
    });

    expect(result.current.줄들['X-1']?.map((칸) => 칸.줄.종류)).toEqual(['done', 'notice']);
    expect(첫칸(result.current.줄들, 'X-2')).toMatchObject({ 종류: 'done' });
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
      await result.current.시작([항목('X-1'), 항목('X-2')], 'qa');
    });

    expect(첫칸(result.current.줄들, 'X-1')).toMatchObject({ 종류: 'notice' });
    expect(첫칸(result.current.줄들, 'X-2')).toMatchObject({ 종류: 'done' });
  });

  it('디바이스가 쓰이는 중인 줄(DEVICE_BUSY)은 그 줄만 안내하고 다음 줄을 이어 돈다', async () => {
    vi.spyOn(api, 'startTrial').mockImplementation((tcId) =>
      tcId === 'X-1' ? Promise.reject(new ApiError(409, 'DEVICE_BUSY', '', [])) : Promise.resolve({ trialId: 't2' }),
    );
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: 통과 });
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1'), 항목('X-2')], 'qa');
    });

    expect(첫칸(result.current.줄들, 'X-1')).toEqual({ 종류: 'notice', 글: '디바이스가 다른 실행에 쓰이고 있습니다' });
    expect(첫칸(result.current.줄들, 'X-2')).toMatchObject({ 종류: 'done' });
  });

  it('이 서버에 디바이스 팜이 없는 앱 줄(FARM_OFF)도 그 줄만 안내하고 다음 브라우저 줄을 이어 돈다', async () => {
    vi.spyOn(api, 'startTrial').mockImplementation((tcId) =>
      tcId === 'X-1' ? Promise.reject(new ApiError(409, 'FARM_OFF', '', [])) : Promise.resolve({ trialId: 't2' }),
    );
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: 통과 });
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1'), 항목('X-2')], 'qa');
    });

    expect(첫칸(result.current.줄들, 'X-1')).toEqual({ 종류: 'notice', 글: '이 서버에는 폰에서 돌릴 Device VISION 이 연결되어 있지 않습니다' });
    expect(첫칸(result.current.줄들, 'X-2')).toMatchObject({ 종류: 'done' });
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
      끝 = result.current.시작([항목('X-1'), 항목('X-2')], 'qa');
    });
    await waitFor(() => expect(시작).toHaveBeenCalledTimes(1));
    unmount();
    풀기();
    await 끝!;

    expect(시작).toHaveBeenCalledTimes(1);
  });
});

describe('단계쌓기', () => {
  it('같은 단계면 경과만 고치고 새 단계면 처음 본 시각에서 경과를 뺀 시작과 함께 뒤에 붙이고 단계가 없으면 그대로 둔다', () => {
    const 하나 = 단계쌓기([], { seq: 1, title: '로그인한다', elapsedMs: 100 }, 1_000);
    const 같은 = 단계쌓기(하나, { seq: 1, title: '로그인한다', elapsedMs: 900 }, 1_800);
    const 둘 = 단계쌓기(같은, { seq: 3, title: '담는다', elapsedMs: 10 }, 3_000);

    expect(같은).toEqual([{ seq: 1, title: '로그인한다', elapsedMs: 900, 시작: 900 }]);
    expect(둘.map((s) => [s.seq, s.시작])).toEqual([[1, 900], [3, 2_990]]);
    expect(단계쌓기(둘, undefined)).toBe(둘);
  });
});

describe('제목맞나', () => {
  it('도는 단계가 저장된 같은 자리 제목과 다르면 저장값을 버리고, 같거나 단계가 없으면 그대로 둔다', () => {
    const 제목들 = ['로그인한다', '담는다'];

    expect(제목맞나(제목들, { seq: 2, title: '담는다', elapsedMs: 0 })).toBe(제목들);
    expect(제목맞나(제목들, undefined)).toBe(제목들);
    expect(제목맞나(제목들, { seq: 2, title: '결제한다', elapsedMs: 0 })).toBeNull();
    expect(제목맞나(제목들, { seq: 3, title: '결제한다', elapsedMs: 0 })).toBeNull();
  });
});

describe('스캔이 센 단계 제목 · 걸린 시간', () => {
  it('처음 받은 RUNNING 의 제목을 들고 돌다가 끝나면 그 제목과 누른 때부터 끝날 때까지의 시간을 결과 칸에 남긴다', async () => {
    const 시계 = vi.spyOn(Date, 'now');
    시계.mockReturnValue(10_000);
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial')
      .mockResolvedValueOnce({ status: 'RUNNING', stepTitles: ['로그인한다', '담는다'], step: { seq: 1, title: '로그인한다', elapsedMs: 0 } })
      .mockImplementationOnce(() => {
        시계.mockReturnValue(18_000);
        return Promise.resolve({ status: 'DONE', result: 통과 });
      });
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1')], 'qa');
    });

    expect(result.current.지금?.제목들).toEqual(['로그인한다', '담는다']);
    expect(첫칸(result.current.줄들, 'X-1')).toMatchObject({ 종류: 'done', 걸린ms: 8_000, 제목들: ['로그인한다', '담는다'] });
  });

  it('도는 단계가 저장된 제목과 어긋나면 그 시험은 끝까지 제목 없이 돈다', async () => {
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial')
      .mockResolvedValueOnce({ status: 'RUNNING', stepTitles: ['로그인한다', '담는다'], step: { seq: 1, title: '다른 단계', elapsedMs: 0 } })
      .mockResolvedValueOnce({ status: 'RUNNING', stepTitles: ['로그인한다', '담는다'], step: { seq: 2, title: '담는다', elapsedMs: 0 } })
      .mockResolvedValueOnce({ status: 'DONE', result: 통과 });
    const { result } = renderHook(() => useTrialQueue(1));

    await act(async () => {
      await result.current.시작([항목('X-1')], 'qa');
    });

    expect(result.current.지금?.제목들).toBeNull();
    expect(첫칸(result.current.줄들, 'X-1')).toMatchObject({ 종류: 'done', 제목들: null });
  });
});
