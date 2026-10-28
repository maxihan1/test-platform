// 러너 시나리오 입구의 앱 · 게임 단계 — android 를 받고, 결정 16 표에서 막는 것은 400 이고, 통과 못 한 정식 실행은 팜 증적을 받는다 (SPEC 도메인/시나리오 §3.7 결정 16)

import type { ScenarioExecuteResponse } from '@platform/kit';
import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { 팜증적받기를줄세운다 } from './farmEvidence.js';
import { registerRoutes } from './routes.js';
import { executeScenario } from './scenario.js';

vi.mock('./scenario.js', async (원본) => ({
  ...(await 원본<typeof import('./scenario.js')>()),
  executeScenario: vi.fn(async (): Promise<ScenarioExecuteResponse> => ({ status: 'FAIL', durationMs: 0, parts: [] })),
}));

vi.mock('./farmEvidence.js', async (원본) => ({
  ...(await 원본<typeof import('./farmEvidence.js')>()),
  팜증적받기를줄세운다: vi.fn(),
}));

const 보냄 = (payload: object) => {
  const app = Fastify();
  registerRoutes(app);
  return app.inject({ method: 'POST', url: '/execute-scenario', payload });
};

const 케이스 = (칸: Record<string, unknown> = {}) => ({
  kind: 'case', tcId: 'TODO-001', params: {}, expected: {}, skipSteps: [], filePath: 'todo/TODO-001.spec.ts', ...칸,
});
const 앱 = (칸: Record<string, unknown> = {}) => 케이스({ appStep: true, ...칸 });
const 요청 = (칸: Record<string, unknown> = {}) => ({
  runId: 7, platform: 'android', baseUrl: 'https://qa.example.com', parts: [앱()], timeoutMs: 600_000, ...칸,
});
const 앞응답 = { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders', jsonPath: 'data.id' };
const 모킹 = { kind: 'mock', urlPattern: '**/api/pay', status: 200, contentType: 'application/json', body: '{}' };

beforeEach(() => {
  vi.mocked(executeScenario).mockClear();
  vi.mocked(팜증적받기를줄세운다).mockClear();
});

describe('POST /execute-scenario — 앱 · 게임 단계', () => {
  it('android 와 폰 연결 값 · 앱 단계 표시를 버리지 않고 실행에 넘긴다', async () => {
    const 칸 = { app: 'https://farm.example.com/apps/ash.apk', udid: 'R58M', engine: 'GAME', adminKey: { header: 'X-Admin-Key', value: 'k1' } };
    const res = await 보냄(요청({ ...칸, parts: [케이스(), 앱({ links: [{ kind: 'bind', param: 'orderId', value: 앞응답 }] })] }));

    expect(res.statusCode).toBe(200);
    expect(executeScenario).toHaveBeenCalledWith(expect.objectContaining({
      platform: 'android', ...칸, parts: [expect.not.objectContaining({ appStep: true }), expect.objectContaining({ appStep: true })],
    }));
  });

  it.each([
    ['앞 응답 돌려주기를 건다', [케이스(), 앱({ links: [{ kind: 'reuse', method: 'GET', urlPattern: '**/a', fromSeq: 1 }] })], '값 꽂기만 건다'],
    ['요청 막기를 건다', [앱({ links: [{ kind: 'block', method: 'DELETE', urlPattern: '**/a' }] })], '값 꽂기만 건다'],
    ['바꿔 보내기를 건다', [앱({ links: [{ kind: 'rewrite', method: 'POST', urlPattern: '**/a', to: { method: 'PUT', path: '/a/{}', value: 앞응답 } }] })], '값 꽂기만 건다'],
    ['넘겨받기를 끈다', [앱({ carryOver: false })], '넘겨받기를 끌 수 없다'],
    ['모킹 구간 안에 있다', [모킹, 케이스(), 앱()], '3번 앱 · 게임 단계가 모킹 구간 안에 있다'],
  ])('앱 단계에 %s 면 400 이다', async (_이름, parts, 까닭) => {
    const res = await 보냄(요청({ parts }));

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'INVALID_REQUEST', detail: expect.stringContaining(까닭) });
    expect(executeScenario).not.toHaveBeenCalled();
  });

  it('모킹을 앱 단계 앞에서 끄면 받는다 · 웹 단계의 막기는 그대로 받는다', async () => {
    const parts = [모킹, 케이스({ links: [{ kind: 'block', method: 'DELETE', urlPattern: '**/a' }] }), { kind: 'unmock', urlPattern: '**/api/pay' }, 앱()];
    expect((await 보냄(요청({ parts }))).statusCode).toBe(200);
  });

  it('통과 못 한 정식 실행은 시나리오 폴더로 팜 증적을 받고, 시험 실행 · 웹만의 시나리오는 안 받는다', async () => {
    await 보냄(요청());
    expect(팜증적받기를줄세운다).toHaveBeenCalledWith(7, 'scenario', 'FAIL');

    vi.mocked(팜증적받기를줄세운다).mockClear();
    await 보냄(요청({ runId: null, trialId: '5f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b' }));
    await 보냄(요청({ platform: 'desktop', parts: [케이스()] }));
    expect(팜증적받기를줄세운다).not.toHaveBeenCalled();
  });
});
