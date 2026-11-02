// 동시 실행이 설정값(기본 2)을 넘지 않는지 본다 (SPEC §3.2 불변식).
// 실행 묶음마다가 아니라 서버 전체에서 2다 — CPU가 2코어라 그 이상은 느려지기만 한다 (SPEC §9)

import type { ExecuteResponse } from '@platform/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatch, enqueue, markAborted } from './dispatcher.js';
import { 실행팜토큰 } from './farmToken.js';
import { callRunner, type 잡은폰 } from './runner.js';
import { finishItem, finishRun, type PendingItem } from './store.js';

vi.mock('./runner.js', async (원본) => ({ ...(await 원본<typeof import('./runner.js')>()), callRunner: vi.fn() }));
vi.mock('./store.js', () => ({ finishItem: vi.fn(async () => undefined), finishRun: vi.fn(async () => undefined) }));
vi.mock('./notify.js', () => ({ notifyRun: vi.fn(async () => undefined) }));
vi.mock('./traceIngest.js', () => ({ trace적재를맡긴다: vi.fn(async () => undefined) }));
vi.mock('../apidoc/runCompare.js', () => ({ 실행문서견주기: vi.fn(async () => undefined) }));
vi.mock('./farmToken.js', () => ({ 실행팜토큰: vi.fn(async () => undefined) }));

function 관찰기(): { 시작: () => void; 끝: () => void; 최대: () => number } {
  let 지금 = 0;
  let 최대 = 0;
  return {
    시작: () => { 지금 += 1; 최대 = Math.max(최대, 지금); },
    끝: () => { 지금 -= 1; },
    최대: () => 최대,
  };
}

function 잠깐(): Promise<void> {
  return new Promise((done) => setTimeout(done, 5));
}

afterEach(() => {
  delete process.env.EXECUTION_CONCURRENCY;
});

describe('enqueue', () => {
  it('동시에 도는 작업이 2를 넘지 않는다', async () => {
    const 본다 = 관찰기();
    const 일 = Array.from({ length: 8 }, () =>
      enqueue(async () => {
        본다.시작();
        await 잠깐();
        본다.끝();
      }),
    );

    await Promise.all(일);
    expect(본다.최대()).toBe(2);
  });

  it('서로 다른 실행이 한꺼번에 들어와도 합쳐서 2를 넘지 않는다', async () => {
    const 본다 = 관찰기();
    const 한묶음 = (): Promise<void>[] =>
      Array.from({ length: 4 }, () =>
        enqueue(async () => {
          본다.시작();
          await 잠깐();
          본다.끝();
        }),
      );

    await Promise.all([...한묶음(), ...한묶음()]);
    expect(본다.최대()).toBe(2);
  });

  it('작업 결과를 넣은 쪽에 돌려준다', async () => {
    const 결과 = await Promise.all([enqueue(async () => '가'), enqueue(async () => '나')]);
    expect(결과).toEqual(['가', '나']);
  });

  it('하나가 던져도 나머지는 계속 처리된다', async () => {
    const 끝난것: string[] = [];
    const 일 = [
      enqueue(async () => { throw new Error('첫 번째가 깨졌다'); }),
      enqueue(async () => { 끝난것.push('둘'); }),
      enqueue(async () => { 끝난것.push('셋'); }),
    ];

    await expect(일[0]).rejects.toThrow('첫 번째가 깨졌다');
    await Promise.all(일.slice(1));
    expect(끝난것).toEqual(['둘', '셋']);
  });

  it('설정값으로 동시 수를 올릴 수 있다', async () => {
    process.env.EXECUTION_CONCURRENCY = '4';
    const 본다 = 관찰기();

    await Promise.all(
      Array.from({ length: 8 }, () =>
        enqueue(async () => {
          본다.시작();
          await 잠깐();
          본다.끝();
        }),
      ),
    );
    expect(본다.최대()).toBe(4);
  });
});

function 항목(historyId: number, platform: PendingItem['platform']): PendingItem {
  return { historyId, tcId: `XDP-${historyId}`, platform, filePath: 'x.spec.ts', baseUrl: 'http://x', params: {}, expected: {}, timeoutMs: 1000 };
}

function 결과(historyId: number): ExecuteResponse {
  return { historyId, status: 'PASS', durationMs: 1, steps: [] };
}

describe('결과 저장이 깨질 때 (FIX-F2-02 · H3)', () => {
  afterEach(() => {
    vi.mocked(callRunner).mockReset();
  });

  it('그 항목을 미실행으로 닫아 실행이 RUNNING 에 남지 않게 한다', async () => {
    const 로그 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(callRunner).mockImplementation(async (_runId, item) => 결과(item.historyId));
    vi.mocked(finishItem).mockClear().mockRejectedValueOnce(new Error('unsupported Unicode escape sequence'));

    await dispatch(9201, [항목(1, 'desktop')]);
    로그.mockRestore();

    expect(vi.mocked(finishItem).mock.calls.map(([id, 답]) => [id, 답.status, 답.error])).toEqual([
      [1, 'PASS', undefined],
      [1, 'NA', { message: '결과를 저장하지 못했습니다', stack: 'unsupported Unicode escape sequence' }],
    ]);
    expect(finishRun).toHaveBeenCalledWith(9201);
  });
});

function 보류(): { 풀기: () => void; 약속: Promise<void> } {
  let 풀기 = (): void => undefined;
  const 약속 = new Promise<void>((done) => { 풀기 = done; });
  return { 풀기, 약속 };
}

describe('dispatch 의 같은 케이스 줄 (PRD-F9-36)', () => {
  afterEach(() => {
    vi.mocked(callRunner).mockReset();
  });

  it('같은 케이스 회차는 앞 회차가 끝난 뒤 시작하고, 그동안 다른 케이스가 빈 자리를 쓴다', async () => {
    const 첫회차 = 보류();
    const 시작: number[] = [];
    vi.mocked(callRunner).mockImplementation(async (_runId, item) => {
      시작.push(item.historyId);
      if (item.historyId === 1) await 첫회차.약속;
      return 결과(item.historyId);
    });

    const 같은케이스 = (historyId: number, tcId: string): PendingItem => ({ ...항목(historyId, 'desktop'), tcId });
    const 끝 = dispatch(9004, [같은케이스(1, 'XDP-A'), 같은케이스(2, 'XDP-A'), 같은케이스(3, 'XDP-B'), 같은케이스(4, 'XDP-B')]);
    await 잠깐();
    expect(시작).toEqual([1, 3, 4]);

    첫회차.풀기();
    await 끝;
    expect(시작).toEqual([1, 3, 4, 2]);
  });

  it('같은 케이스의 PC · 모바일도 하나씩 돈다', async () => {
    const 첫째 = 보류();
    const 시작: number[] = [];
    vi.mocked(callRunner).mockImplementation(async (_runId, item) => {
      시작.push(item.historyId);
      if (item.historyId === 1) await 첫째.약속;
      return 결과(item.historyId);
    });

    const 끝 = dispatch(9005, [{ ...항목(1, 'desktop'), tcId: 'XDP-C' }, { ...항목(2, 'mobile'), tcId: 'XDP-C' }]);
    await 잠깐();
    expect(시작).toEqual([1]);

    첫째.풀기();
    await 끝;
    expect(시작).toEqual([1, 2]);
  });
});

describe('dispatch 의 디바이스 줄', () => {
  afterEach(() => {
    vi.mocked(callRunner).mockReset();
  });

  it('android 항목 둘은 차례로 돈다 — 둘째는 첫째가 끝난 뒤 시작한다', async () => {
    const 첫째 = 보류();
    const 시작: number[] = [];
    vi.mocked(callRunner).mockImplementation(async (_runId, item) => {
      시작.push(item.historyId);
      if (item.historyId === 1) await 첫째.약속;
      return 결과(item.historyId);
    });

    const 끝 = dispatch(9001, [항목(1, 'android'), 항목(2, 'android')]);
    await 잠깐();
    expect(시작).toEqual([1]);

    첫째.풀기();
    await 끝;
    expect(시작).toEqual([1, 2]);
  });

  it('android 가 돌아도 desktop 항목은 전역 자리를 다 쓴다', async () => {
    const 안드로이드 = 보류();
    const 시작: number[] = [];
    vi.mocked(callRunner).mockImplementation(async (_runId, item) => {
      시작.push(item.historyId);
      if (item.platform === 'android') await 안드로이드.약속;
      return 결과(item.historyId);
    });

    vi.mocked(finishRun).mockClear();
    const 끝 = dispatch(9002, [항목(1, 'android'), 항목(2, 'desktop'), 항목(3, 'desktop')]);
    await 잠깐();
    expect(시작.sort()).toEqual([1, 2, 3]);
    expect(finishRun).not.toHaveBeenCalled();

    안드로이드.풀기();
    await 끝;
    expect(finishRun).toHaveBeenCalledTimes(1);
  });

  it('멈춘 실행의 android 항목은 차례가 와도 러너를 부르지 않는다', async () => {
    const 첫째 = 보류();
    const 시작: number[] = [];
    vi.mocked(callRunner).mockImplementation(async (_runId, item) => {
      시작.push(item.historyId);
      await 첫째.약속;
      return 결과(item.historyId);
    });

    const 끝 = dispatch(9003, [항목(1, 'android'), 항목(2, 'android')]);
    await 잠깐();
    markAborted(9003);
    첫째.풀기();
    await 끝;
    expect(시작).toEqual([1]);
  });
});

describe('dispatch 의 게임 항목 (GAME-F1-09)', () => {
  const 팜 = 'http://farm.test';
  const 받음: string[] = [];
  const 받은토큰: (string | undefined)[] = [];

  function 가짜팜(기기들: unknown[]): void {
    vi.stubGlobal('fetch', async (주소: string | URL | Request, 설정?: RequestInit) => {
      받음.push(`${설정?.method ?? 'GET'} ${String(주소).replace(팜, '')}${설정?.body ? ` ${String(설정.body)}` : ''}`);
      받은토큰.push((설정?.headers as Record<string, string> | undefined)?.authorization);
      return new Response(JSON.stringify({ value: { devices: 기기들 }, held: {}, released: true }), { status: 200 });
    });
  }

  const 게임항목 = (historyId: number, tcId: string): PendingItem => ({ ...항목(historyId, 'android'), tcId, engine: 'GAME' });

  beforeEach(() => {
    vi.mocked(finishItem).mockClear();
  });

  afterEach(() => {
    vi.mocked(callRunner).mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    delete process.env.DEVICE_FARM_URL;
    받음.length = 0;
    받은토큰.length = 0;
    vi.mocked(실행팜토큰).mockResolvedValue(undefined);
  });

  it('폰을 한 번만 잡아 120분으로 쥐고 항목마다 늘리며, 세 항목이 같은 폰으로 돈 뒤 한 번 놓는다', async () => {
    process.env.DEVICE_FARM_URL = 팜;
    가짜팜([{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }]);
    const 폰들: (잡은폰 | undefined)[] = [];
    vi.mocked(callRunner).mockImplementation(async (_runId, item, _멈췄나, 잡은폰) => {
      폰들.push(잡은폰);
      return 결과(item.historyId);
    });

    await dispatch(9101, [게임항목(1, 'XDP-G1'), 게임항목(2, 'XDP-G2'), 게임항목(3, 'XDP-G3')]);

    expect(폰들).toEqual([1, 2, 3].map(() => ({ udid: 'R3CR10TCVCD', 토큰: undefined })));
    expect(받음.filter((줄) => 줄.startsWith('POST /api/devices/R3CR10TCVCD/hold '))).toEqual(['POST /api/devices/R3CR10TCVCD/hold {"minutes":120}']);
    expect(받음.filter((줄) => 줄 === 'POST /api/devices/R3CR10TCVCD/hold/extend')).toHaveLength(3);
    expect(받음.filter((줄) => 줄 === 'DELETE /api/devices/R3CR10TCVCD/hold')).toHaveLength(1);
    expect(받음.at(-1)).toBe('DELETE /api/devices/R3CR10TCVCD/hold');
    expect(finishItem).toHaveBeenCalledTimes(3);
  });

  it('누른 사람 토큰이 있으면 고르기 · 잡기 · 늘리기 · 놓기를 그 토큰으로 하고 러너 호출에도 같은 토큰을 넘긴다', async () => {
    process.env.DEVICE_FARM_URL = 팜;
    vi.stubEnv('DEVICE_FARM_TOKEN', 'pat_server');
    vi.mocked(실행팜토큰).mockResolvedValue('pat_kim');
    가짜팜([{ serial: 'R3CR10TCVCD', state: 'IDLE', detail: 'ready' }]);
    const 폰들: (잡은폰 | undefined)[] = [];
    vi.mocked(callRunner).mockImplementation(async (_runId, item, _멈췄나, 잡은폰) => {
      폰들.push(잡은폰);
      return 결과(item.historyId);
    });

    await dispatch(9104, [게임항목(1, 'XDP-G1'), 게임항목(2, 'XDP-G2')]);

    expect(실행팜토큰).toHaveBeenCalledWith(9104);
    expect(폰들).toEqual([{ udid: 'R3CR10TCVCD', 토큰: 'pat_kim' }, { udid: 'R3CR10TCVCD', 토큰: 'pat_kim' }]);
    expect(받은토큰.length).toBeGreaterThan(0);
    expect(new Set(받은토큰)).toEqual(new Set(['Bearer pat_kim']));
  });

  it('못 잡으면 러너를 부르지 않고 세 항목 다 그 까닭의 NA 로 닫는다', async () => {
    process.env.DEVICE_FARM_URL = 팜;
    가짜팜([]);

    await dispatch(9102, [게임항목(1, 'XDP-G1'), 게임항목(2, 'XDP-G2'), 게임항목(3, 'XDP-G3')]);

    expect(callRunner).not.toHaveBeenCalled();
    expect(vi.mocked(finishItem).mock.calls.map(([id, 답]) => [id, 답.status, 답.error?.message])).toEqual([
      [1, 'NA', 'Device VISION 에 빈 폰이 없습니다'],
      [2, 'NA', 'Device VISION 에 빈 폰이 없습니다'],
      [3, 'NA', 'Device VISION 에 빈 폰이 없습니다'],
    ]);
  });

  it('팜 주소가 없으면 폰 번호 없이 항목마다 러너 호출로 간다 — callRunner 가 NA 로 닫는다', async () => {
    const 폰들: (잡은폰 | undefined)[] = [];
    vi.mocked(callRunner).mockImplementation(async (_runId, item, _멈췄나, 잡은폰) => {
      폰들.push(잡은폰);
      return 결과(item.historyId);
    });

    await dispatch(9103, [게임항목(1, 'XDP-G1'), 게임항목(2, 'XDP-G2')]);

    expect(폰들).toEqual([undefined, undefined]);
  });
});
