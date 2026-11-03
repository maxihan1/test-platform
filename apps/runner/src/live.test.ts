// 테스트 모드 장면 통로 — 도는 동안만 장면을 내고(첫 장면 전 204) 끝나면 지우는지, 열쇠가 UUID 가 아니면 거절하는지 본다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { ExecuteResponse, ScenarioExecuteResponse } from '@platform/kit';
import Fastify from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { execute } from './execute.js';
import { 장면환경 } from './live.js';
import { registerRoutes } from './routes.js';
import { executeScenario } from './scenario.js';

vi.mock('./execute.js', async (원본) => ({ ...(await 원본<typeof import('./execute.js')>()), execute: vi.fn() }));
vi.mock('./scenario.js', async (원본) => ({ ...(await 원본<typeof import('./scenario.js')>()), executeScenario: vi.fn() }));

const 열쇠 = '0b7e2c1a-0000-4000-8000-000000000001';
const 장면 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const 케이스요청 = (칸: Record<string, unknown> = {}) => ({
  runId: 0, historyId: 0, tcId: 'TODO-001', platform: 'desktop', filePath: 'todo/TODO-001.spec.ts',
  baseUrl: 'https://qa.example.com', params: {}, expected: {}, live: 열쇠, ...칸,
});
const 시나리오요청 = (칸: Record<string, unknown> = {}) => ({
  runId: null, trialId: 열쇠, platform: 'desktop', baseUrl: 'https://qa.example.com', parts: [{ kind: 'wait', ms: 1 }], timeoutMs: 1000, live: 열쇠, ...칸,
});

let 산출물 = '';
const 옛값 = process.env.PLATFORM_ARTIFACTS_DIR;

beforeAll(() => {
  산출물 = mkdtempSync(join(tmpdir(), 'runner-live-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 산출물;
});

afterAll(() => {
  if (옛값 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
  else process.env.PLATFORM_ARTIFACTS_DIR = 옛값;
  rmSync(산출물, { recursive: true, force: true });
});

afterEach(() => {
  vi.mocked(execute).mockReset();
  vi.mocked(executeScenario).mockReset();
});

function 서버() {
  const app = Fastify();
  registerRoutes(app);
  return app;
}

// 실행이 끝나지 않고 기다리게 한다 — 도는 동안의 통로를 두드리려고
function 붙잡는다<T>(답: T): { 대기: () => Promise<T>; 끝내기: () => void } {
  let 끝내기 = () => {};
  const 끝 = new Promise<T>((done) => {
    끝내기 = () => done(답);
  });
  return { 대기: () => 끝, 끝내기: () => 끝내기() };
}

describe('장면환경', () => {
  it('열쇠가 오면 동작마다 1초 쉬고 산출물 폴더의 live/<열쇠>.jpg 에 장면을 쓰게 한다', () => {
    expect(장면환경(열쇠)).toEqual({ PLATFORM_LIVE_FILE: join(산출물, 'live', `${열쇠}.jpg`), PLATFORM_SLOW_MO: '1000' });
  });

  it('열쇠가 없으면 둘 다 빈 값이다 — 러너를 켠 셸의 값이 정식 실행에 번지지 않게', () => {
    expect(장면환경(undefined)).toEqual({ PLATFORM_LIVE_FILE: '', PLATFORM_SLOW_MO: '' });
  });
});

describe('GET /live/:key', () => {
  const 장면읽기 = (app: ReturnType<typeof 서버>, key = 열쇠) => app.inject({ method: 'GET', url: `/live/${key}` });

  it.each([
    ['케이스 테스트 실행', '/execute', 케이스요청, () => vi.mocked(execute)],
    ['E2E 시험 실행', '/execute-scenario', 시나리오요청, () => vi.mocked(executeScenario)],
  ] as const)('%s — 첫 장면 전은 204, 장면이 생기면 그 JPEG 를 200 으로, 끝나면 404 이고 파일도 지운다', async (_이름, 길, 요청, 실행) => {
    const 잡음 = 붙잡는다({ status: 'PASS', durationMs: 0 } as ExecuteResponse & ScenarioExecuteResponse);
    실행().mockImplementation(잡음.대기);
    const app = 서버();
    const 돌림 = app.inject({ method: 'POST', url: 길, payload: 요청() });
    await vi.waitFor(() => expect(실행()).toHaveBeenCalled());

    expect((await 장면읽기(app)).statusCode).toBe(204);

    const 파일 = 장면환경(열쇠).PLATFORM_LIVE_FILE;
    mkdirSync(dirname(파일), { recursive: true });
    writeFileSync(파일, 장면);
    writeFileSync(`${파일}.tmp`, 장면);
    const 받음 = await 장면읽기(app);
    expect(받음.statusCode).toBe(200);
    expect(받음.headers['content-type']).toBe('image/jpeg');
    expect(받음.headers['cache-control']).toBe('no-store');
    expect(받음.rawPayload.equals(장면)).toBe(true);

    잡음.끝내기();
    expect((await 돌림).statusCode).toBe(200);
    expect((await 장면읽기(app)).statusCode).toBe(404);
    expect(existsSync(파일)).toBe(false);
    expect(existsSync(`${파일}.tmp`)).toBe(false);
  });

  it('실행이 던져도 열쇠를 닫는다 — 끝난 실행의 장면을 계속 내지 않는다', async () => {
    vi.mocked(execute).mockRejectedValue(new Error('자식을 못 띄웠다'));
    const app = 서버();

    expect((await app.inject({ method: 'POST', url: '/execute', payload: 케이스요청() })).statusCode).toBe(500);
    expect((await 장면읽기(app)).statusCode).toBe(404);
  });

  it('모르는 열쇠 · 경로 같은 열쇠는 404 다 — 남의 장면 · 러너 파일을 못 본다', async () => {
    const app = 서버();

    expect((await 장면읽기(app, '0b7e2c1a-0000-4000-8000-000000000999')).statusCode).toBe(404);
    expect((await 장면읽기(app, '..%2F..%2Fetc%2Fpasswd')).statusCode).toBe(404);
  });

  it('장면 열쇠가 없는 실행은 장면을 안 낸다', async () => {
    const 잡음 = 붙잡는다({ status: 'PASS', durationMs: 0 } as ExecuteResponse);
    vi.mocked(execute).mockImplementation(잡음.대기);
    const app = 서버();
    const 돌림 = app.inject({ method: 'POST', url: '/execute', payload: 케이스요청({ live: undefined }) });
    await vi.waitFor(() => expect(execute).toHaveBeenCalled());

    expect((await 장면읽기(app)).statusCode).toBe(404);
    잡음.끝내기();
    await 돌림;
  });
});

describe('장면 열쇠 입구 검사', () => {
  it.each([
    ['/execute', 케이스요청],
    ['/execute-scenario', 시나리오요청],
  ] as const)('%s 에 UUID 가 아닌 열쇠가 오면 400 이다 — 장면 파일 이름에 그대로 들어간다', async (길, 요청) => {
    const res = await 서버().inject({ method: 'POST', url: 길, payload: 요청({ live: '../../etc/x' }) });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_REQUEST');
    expect(execute).not.toHaveBeenCalled();
    expect(executeScenario).not.toHaveBeenCalled();
  });

  it.each([
    ['/execute', () => 케이스요청({ runId: 12, historyId: 34 })],
    ['/execute-scenario', () => 시나리오요청({ runId: 12, trialId: undefined })],
  ] as const)('%s 정식 실행에 열쇠가 오면 400 이다 — 정식 실행은 늦추지도 그리지도 않는다', async (길, 요청) => {
    const res = await 서버().inject({ method: 'POST', url: 길, payload: 요청() });

    expect(res.statusCode).toBe(400);
    expect(res.json().detail).toContain('장면 열쇠');
    expect(execute).not.toHaveBeenCalled();
    expect(executeScenario).not.toHaveBeenCalled();
  });

  it('열쇠를 버리지 않고 실행에 넘긴다', async () => {
    vi.mocked(execute).mockResolvedValue({ status: 'PASS', durationMs: 0 } as ExecuteResponse);

    await 서버().inject({ method: 'POST', url: '/execute', payload: 케이스요청() });

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ live: 열쇠 }), expect.any(String));
  });
});
