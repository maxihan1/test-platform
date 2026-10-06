// 부품 흐름 검사 ③ — 케이스 부품 시험 한도와 예외로 끝난 부품 · 창 닫기를 가짜 창으로 본다 (SPEC 도메인/시나리오 §3.7 「동시성 · 시간」 · 결정 12)

import type { ScenarioExecuteRequest } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { 미룬삭제 } from './links.js';
import { runParts } from './parts.js';
import { 쿠키, 창들 } from './parts-fake.js';

type Part = ScenarioExecuteRequest['parts'][number];

const 케이스 = (tcId = 'XRS-001', skipSteps: string[] = []): Extract<Part, { kind: 'case' }> => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps, filePath: `/tests/${tcId}.spec.ts`,
});

describe('부품 시험 한도', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('넘으면 상태를 찍고 창을 닫고 FAIL 로 멈춘다 — 5초 안에 온 절차는 싣는다', async () => {
    vi.useFakeTimers();
    let 닫힘: () => void = () => {};
    const 닫힐때 = new Promise<void>((done) => {
      닫힘 = done;
    });
    const parts: Part[] = [케이스('XRS-001'), 케이스('XRS-002')];
    const { deps, 받은, 줄 } = 창들(parts, {
      partTimeoutMs: 1000,
      창마다: (n) => (n !== 1 ? {} : {
        runCase: vi.fn(async (_part, seq: number) => {
          await 닫힐때;
          return { seq: seq + 1, steps: [{ seq: seq + 1, title: '기다림', status: 'FAIL' as const, durationMs: 1, assertions: [] }], failed: true, error: { message: 'Target closed' } };
        }),
        state: vi.fn(async () => ({ cookies: [쿠키('찍음')], origins: [] })),
        close: vi.fn(async () => {
          닫힘();
        }),
      }),
    });

    const 돌림 = runParts(parts, deps);
    await vi.advanceTimersByTimeAsync(1000);
    await 돌림;

    expect(줄).toHaveLength(1);
    expect(줄[0]).toMatchObject({ seq: 1, status: 'FAIL', error: { message: '부품 제한 시간 1000ms 를 넘었다' } });
    expect(줄[0]!.steps.map((s) => s.title)).toEqual(['기다림']);
    expect(받은[1]!.부품?.찍은상태).toEqual({ cookies: [쿠키('찍음')], origins: [] });
    expect(받은).toHaveLength(2);
  });

  it('5초 안에 절차가 안 오면 절차 없이 FAIL 이다', async () => {
    vi.useFakeTimers();
    const parts: Part[] = [케이스('XRS-001')];
    const { deps, 줄 } = 창들(parts, {
      partTimeoutMs: 1000,
      창마다: (n) => (n !== 1 ? {} : { runCase: vi.fn(() => new Promise<never>(() => {})) }),
    });

    const 돌림 = runParts(parts, deps);
    await vi.advanceTimersByTimeAsync(6000);
    await 돌림;

    expect(줄).toEqual([expect.objectContaining({ status: 'FAIL', steps: [], error: { message: '부품 제한 시간 1000ms 를 넘었다' } })]);
  });

  it('한도 0 은 한도 없음이다 — 루트 설정 timeout 0(무제한)에 모든 부품이 0ms 에 죽지 않게', async () => {
    vi.useFakeTimers();
    const parts: Part[] = [케이스('XRS-001')];
    const { deps, 줄 } = 창들(parts, {
      partTimeoutMs: 0,
      창마다: (n) => (n !== 1 ? {} : {
        runCase: vi.fn(async (_part, seq: number) => {
          await new Promise((done) => setTimeout(done, 60_000));
          return { seq: seq + 1, steps: [], failed: false };
        }),
      }),
    });

    const 돌림 = runParts(parts, deps);
    await vi.advanceTimersByTimeAsync(60_000);
    await 돌림;

    expect(줄.map((r) => r.status)).toEqual(['PASS']);
  });
});

describe('예외로 끝난 부품 · 창 닫기', () => {
  it('케이스 실행이 던져도 이음 오류를 맨 앞에 두고 안 걸린 이어 주기를 덧붙인다 (결정 12)', async () => {
    const parts: Part[] = [{ ...케이스('XRS-001'), links: [
      { kind: 'reuse', method: 'POST', urlPattern: '**/api/posts', fromSeq: 1 },
      { kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' },
    ] }];
    const { deps, 줄 } = 창들(parts, {
      창마다: (n, 부품) => (n !== 1 ? {} : {
        runCase: vi.fn(async () => {
          부품!.걸림.add(0);
          부품!.오류 ??= '1번 부품에 맞는 응답이 없다';
          throw new Error('파일이 XRS-001 을 등록하지 않았다');
        }),
      }),
    });

    await runParts(parts, deps);

    expect(줄[0]).toMatchObject({
      status: 'FAIL',
      error: { message: '1번 부품에 맞는 응답이 없다 · 파일이 XRS-001 을 등록하지 않았다\n안 걸린 이어 주기 — 요청 막기 DELETE **/api/cart' },
    });
  });

  it('앞 창을 닫다가 던져도 새 창은 끝에 닫힌다 — 새 창이 새지 않는다', async () => {
    const parts: Part[] = [케이스('XRS-001')];
    const { deps, 받은, 줄 } = 창들(parts, {
      창마다: (n) => (n !== 0 ? {} : {
        close: vi.fn(async () => {
          throw new Error('이미 닫혔다');
        }),
      }),
    });

    await runParts(parts, deps);

    expect(줄[0]).toMatchObject({ status: 'FAIL', error: { message: '이미 닫혔다' } });
    expect(받은[1]!.창.close).toHaveBeenCalledTimes(1);
  });

  it('앞 창 상태를 읽고 → 새 창을 열고 → 앞 창을 닫는다', async () => {
    const parts: Part[] = [케이스('XRS-001')];
    const { deps, 받은 } = 창들(parts);

    await runParts(parts, deps);

    const 차례 = (f: unknown, n = 0) => vi.mocked(f as () => void).mock.invocationCallOrder[n]!;
    const 앞 = 받은[0]!.창;
    expect(차례(앞.state)).toBeLessThan(차례(deps.newWindow, 1));
    expect(차례(deps.newWindow, 1)).toBeLessThan(차례(앞.close));
  });
});

describe('기다림에 상한 (2026-10-06 게이트 2)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const 미룸 = (fromSeq: number): 미룬삭제 => ({ fromSeq, url: `https://qa.example.com/api/posts/${fromSeq}`, headers: {}, state: { cookies: [], origins: [] } });

  // 요청 한도(상한)는 sendDelete 에 넘겨 Playwright 가 먼저 끊고, 바깥은 5초 더 기다린다 — 같은 값이면 바깥이 먼저 끝나
  // 아직 날아가는 삭제를 「안 끝났다」로 적고 다음 삭제가 겹쳐 나가 거꾸로 보내는 순서가 깨진다 (2026-10-06 재검사)
  it('미룬 삭제 하나가 부품 시험 한도 안에 안 끝나면 그 줄에 오류를 남기고 나머지를 보낸다 — 다 통과한 시나리오가 판정 없음이 되지 않게', async () => {
    vi.useFakeTimers();
    const parts: Part[] = [케이스('XRS-001')];
    const { deps, 뒷정리, 이음 } = 창들(parts, { partTimeoutMs: 1000 });
    이음.미룸.push(미룸(1), 미룸(2));
    deps.sendDelete = vi.fn((d: 미룬삭제) => (d.fromSeq === 2 ? new Promise<number>(() => {}) : Promise.resolve(200)));

    const 돌림 = runParts(parts, deps);
    await vi.advanceTimersByTimeAsync(1000);
    expect(뒷정리).toEqual([]);
    await vi.advanceTimersByTimeAsync(5000);
    await 돌림;

    expect(vi.mocked(deps.sendDelete).mock.calls.map(([d, 한도]) => [d.fromSeq, 한도])).toEqual([[2, 1000], [1, 1000]]);
    expect(뒷정리).toEqual([[
      { fromSeq: 2, method: 'DELETE', url: 'https://qa.example.com/api/posts/2', error: '미룬 삭제가 1000ms 안에 끝나지 않았다' },
      { fromSeq: 1, method: 'DELETE', url: 'https://qa.example.com/api/posts/1', status: 200 },
    ]]);
  });

  it('부품 한도가 0(없음)이어도 미룬 삭제 하나는 30초까지만 기다린다', async () => {
    vi.useFakeTimers();
    const parts: Part[] = [케이스('XRS-001')];
    const { deps, 뒷정리, 이음 } = 창들(parts, { partTimeoutMs: 0 });
    이음.미룸.push(미룸(1));
    deps.sendDelete = vi.fn(() => new Promise<number>(() => {}));

    const 돌림 = runParts(parts, deps);
    await vi.advanceTimersByTimeAsync(35_000);
    await 돌림;

    expect(vi.mocked(deps.sendDelete).mock.calls[0]![1]).toBe(30_000);
    expect(뒷정리[0]).toEqual([{ fromSeq: 1, method: 'DELETE', url: 'https://qa.example.com/api/posts/1', error: '미룬 삭제가 30000ms 안에 끝나지 않았다' }]);
  });

  it('한도에 걸린 뒤 창 상태 읽기가 안 끝나도 창을 닫고 FAIL 로 멈춘다 — 부품 한도가 무력해지지 않게', async () => {
    vi.useFakeTimers();
    const parts: Part[] = [케이스('XRS-001')];
    const { deps, 받은, 줄 } = 창들(parts, {
      partTimeoutMs: 1000,
      창마다: (n) => (n !== 1 ? {} : {
        runCase: vi.fn(() => new Promise<never>(() => {})),
        state: vi.fn(() => new Promise<never>(() => {})),
      }),
    });

    const 돌림 = runParts(parts, deps);
    await vi.advanceTimersByTimeAsync(11_000);
    await 돌림;

    expect(줄).toEqual([expect.objectContaining({ status: 'FAIL', error: { message: '부품 제한 시간 1000ms 를 넘었다' } })]);
    expect(받은[1]!.창.close).toHaveBeenCalled();
  });
});
