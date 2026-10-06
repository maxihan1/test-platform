// 부품 돌리기 검사 — 브라우저 없이 가짜 창(모킹·request·케이스 실행기)으로 순서·멈춤·모킹 구간을 본다 (SPEC 도메인/러너 §5.2)

import type { ScenarioExecuteRequest, ScenarioPartResult } from '@platform/kit';
import { describe, expect, it, vi } from 'vitest';

import { runParts, 주소, type PartDeps, type 창 } from './parts.js';

type Part = ScenarioExecuteRequest['parts'][number];

function 가짜(칸: Partial<창> & { baseUrl?: string } = {}) {
  const 줄: ScenarioPartResult[] = [];
  const { baseUrl = 'https://qa.example.com', ...창칸 } = 칸;
  const 지금창: 창 = {
    route: vi.fn(async () => {}),
    unroute: vi.fn(async () => {}),
    waitForTimeout: vi.fn(async () => {}),
    fetch: vi.fn(async () => ({ status: () => 200 })),
    runCase: vi.fn(async (_part, seq: number) => ({
      seq: seq + 2,
      steps: [
        { seq: seq + 1, title: '가', status: 'PASS' as const, durationMs: 1, assertions: [] },
        { seq: seq + 2, title: '나', status: 'PASS' as const, durationMs: 1, assertions: [] },
      ],
      failed: false,
    })),
    state: vi.fn(async () => ({ cookies: [], origins: [] })),
    close: vi.fn(async () => {}),
    ...창칸,
  };
  const deps: PartDeps = {
    baseUrl,
    partTimeoutMs: 30_000,
    newWindow: vi.fn(async () => 지금창),
    write: (result) => {
      줄.push(result);
    },
  };
  return { deps, 지금창, 줄 };
}

const 케이스 = (tcId = 'XRS-001', skipSteps: string[] = []): Part => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps, filePath: `/tests/${tcId}.spec.ts`,
});

describe('runParts', () => {
  it('부품마다 결과 줄 한 줄을 흘리고 케이스 절차 순번은 시나리오 전체에서 이어진다', async () => {
    const { deps, 지금창, 줄 } = 가짜();

    await runParts([케이스('XRS-001', ['가']), { kind: 'wait', ms: 5 }, 케이스('XRS-002')], deps);

    expect(줄.map((r) => [r.seq, r.status])).toEqual([[1, 'PASS'], [2, 'PASS'], [3, 'PASS']]);
    expect(줄[2]!.steps.map((s) => s.seq)).toEqual([3, 4]);
    const 표시판 = expect.objectContaining({ started: false, inStep: 0, judged: false });
    expect(지금창.runCase).toHaveBeenNthCalledWith(1, expect.objectContaining({ tcId: 'XRS-001', skipSteps: ['가'] }), 0, 표시판, {});
    expect(지금창.runCase).toHaveBeenNthCalledWith(2, expect.objectContaining({ tcId: 'XRS-002' }), 2, 표시판, {});
    expect(지금창.waitForTimeout).toHaveBeenCalledWith(5);
  });

  it('모킹은 context 에 걸고 끄기 전까지 뒤 부품의 mocks 에 실린다', async () => {
    const { deps, 지금창, 줄 } = 가짜();

    await runParts([
      { kind: 'mock', urlPattern: '**/api/pay', status: 500, contentType: 'application/json', body: '{}' },
      케이스(),
      { kind: 'unmock', urlPattern: '**/api/pay' },
      { kind: 'wait', ms: 1 },
    ], deps);

    expect(지금창.route).toHaveBeenCalledWith('**/api/pay', expect.any(Function));
    const 건것 = vi.mocked(지금창.route).mock.calls[0]![1];
    expect(지금창.unroute).toHaveBeenCalledWith('**/api/pay', 건것);
    expect(줄.map((r) => r.mocks)).toEqual([['**/api/pay'], ['**/api/pay'], [], []]);
  });

  it('모킹 핸들러는 적힌 응답으로 바꿔친다', async () => {
    const { deps, 지금창 } = 가짜();
    await runParts([{ kind: 'mock', urlPattern: '**/a', status: 503, contentType: 'text/plain', body: '점검 중' }], deps);
    const 핸들러 = vi.mocked(지금창.route).mock.calls[0]![1];
    const fulfill = vi.fn(async () => {});

    await 핸들러({ fulfill });

    expect(fulfill).toHaveBeenCalledWith({ status: 503, contentType: 'text/plain', body: '점검 중' });
  });

  it('같은 무늬로 다시 걸면 옛 것을 먼저 풀고, 안 건 무늬를 끄는 것은 그냥 넘어간다', async () => {
    const { deps, 지금창, 줄 } = 가짜();
    const 모킹 = { kind: 'mock' as const, urlPattern: '**/a', status: 200, contentType: 'text/plain', body: '' };

    await runParts([모킹, 모킹, { kind: 'unmock', urlPattern: '**/없음' }], deps);

    expect(지금창.unroute).toHaveBeenCalledTimes(1);
    expect(줄.map((r) => r.status)).toEqual(['PASS', 'PASS', 'PASS']);
  });

  it('API 부품은 대상 주소에 문자열로 이어 붙여 부르고 응답 코드가 다르면 거기서 멈춘다', async () => {
    const { deps, 지금창, 줄 } = 가짜({
      baseUrl: 'https://qa.example.com/shop/',
      fetch: vi.fn(async () => ({ status: () => 500 })),
    });

    await runParts([{ kind: 'api', method: 'POST', path: '/api/cart', body: { id: 1 }, expectStatus: 201 }, 케이스()], deps);

    expect(지금창.fetch).toHaveBeenCalledWith('https://qa.example.com/shop/api/cart', { method: 'POST', data: { id: 1 } });
    expect(줄).toHaveLength(1);
    expect(줄[0]).toMatchObject({ seq: 1, status: 'FAIL', error: { message: '응답 코드 500 — 기대 201' } });
  });

  it('케이스 부품이 실패하면 그 줄을 흘리고 멈춘다', async () => {
    const { deps, 줄 } = 가짜({
      runCase: vi.fn(async () => ({ seq: 1, steps: [], failed: true, error: { message: '화면이 안 떴다' } })),
    });

    await runParts([케이스(), { kind: 'wait', ms: 1 }], deps);

    expect(줄).toEqual([expect.objectContaining({ seq: 1, status: 'FAIL', error: { message: '화면이 안 떴다' } })]);
  });

  it('부품이 예외로 끝나도 실패 줄을 흘리고 멈춘다 — 「안 돌았음」으로 보이면 원인이 사라진다', async () => {
    const { deps, 줄 } = 가짜({ runCase: vi.fn(async () => { throw new Error('파일이 XRS-001 을 등록하지 않았다'); }) });

    await runParts([케이스(), { kind: 'wait', ms: 1 }], deps);

    expect(줄).toHaveLength(1);
    expect(줄[0]).toMatchObject({ status: 'FAIL', error: { message: '파일이 XRS-001 을 등록하지 않았다' } });
  });
});

describe('주소', () => {
  it('대상 주소 끝 / 를 떼고 문자열로 잇는다 — 대상 주소의 경로가 안 날아간다', () => {
    expect(주소('https://qa.example.com', '/api/a')).toBe('https://qa.example.com/api/a');
    expect(주소('https://qa.example.com/shop//', '/api/a')).toBe('https://qa.example.com/shop/api/a');
  });
});
