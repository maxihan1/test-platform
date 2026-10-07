// 케이스 테스트 실행이 android 케이스에서 디바이스 잠금을 잡고 놓는지 본다. DB 는 가짜로 바꿔 DB 없이 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 폰을놓는다, 폰을바로잡는다 } from './phone.js';
import * as runner from './runner.js';
import { 전부비운다 } from './trial.js';
import trialRoutes from './trialRoutes.js';

describe('케이스 테스트 실행 통로 — android 디바이스 잠금', () => {
  let app: FastifyInstance;
  let 끝낸다: (결과: unknown) => void = () => undefined;
  let 터뜨린다: (사유: Error) => void = () => undefined;
  const 보냄 = vi.fn();
  const 바른스키마 = { type: 'object', properties: { loginId: { type: 'string' } }, required: ['loginId'] };
  const 풀렸나 = (): boolean => {
    const 잡았다 = 폰을바로잡는다();
    if (잡았다) 폰을놓는다();
    return 잡았다;
  };
  const 보낸다 = (tcId: string, body: object) => app.inject({ method: 'POST', url: `/api/cases/${tcId}/test-run`, payload: body });
  const 안드로이드 = { platform: 'android', baseUrl: 'https://qa.example.com', params: { loginId: 'u' }, expected: {} };

  beforeAll(async () => {
    const 질의 = async (sql: string, 값: string[]) => {
      if (sql.includes('FROM test_case WHERE')) {
        if (값[0] !== 'XTR-AND') return { rows: [] };
        const 스키마 = { param_schema: 바른스키마, expected_schema: { type: 'object', properties: {} } };
        return { rows: [{ platforms: ['android', 'desktop'], file_path: 'xtr/a.spec.ts', ...스키마 }] };
      }
      return { rows: [] };
    };
    vi.doMock('../db/index.js', () => ({ pool: { query: 질의, connect: async () => ({ query: 질의, release: () => undefined }) } }));
    vi.spyOn(runner, '러너에보낸다').mockImplementation(((...인자: unknown[]) => 보냄(...인자)) as never);
    app = Fastify();
    await app.register(trialRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    vi.doUnmock('../db/index.js');
    await app.close();
    delete process.env.LOCAL_RUNNER_URL;
  });

  beforeEach(() => {
    while (!풀렸나()) 폰을놓는다();
    전부비운다();
    process.env.LOCAL_RUNNER_URL = 'http://127.0.0.1:1';
    보냄.mockReset();
    보냄.mockImplementation(
      () =>
        new Promise((ok, 안됨) => {
          끝낸다 = ok;
          터뜨린다 = 안됨;
        }),
    );
  });

  const 결과 = { status: 200, json: { historyId: 1, status: 'PASS', durationMs: 5, steps: [] } };

  it('android 케이스는 202 이고 도는 동안 디바이스를 잡았다가 끝나면 놓는다', async () => {
    const res = await 보낸다('XTR-AND', 안드로이드);
    expect(res.statusCode).toBe(202);
    expect(풀렸나()).toBe(false);
    끝낸다(결과);
    await vi.waitFor(() => expect(풀렸나()).toBe(true));
  });

  it('디바이스가 이미 쓰이는 중이면 409 DEVICE_BUSY 이고 러너에 보내지 않는다', async () => {
    expect(폰을바로잡는다()).toBe(true);
    const res = await 보낸다('XTR-AND', 안드로이드);
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string }>().error).toBe('DEVICE_BUSY');
    expect(보냄).not.toHaveBeenCalled();
  });

  it('러너가 실패해도 디바이스를 놓는다', async () => {
    expect((await 보낸다('XTR-AND', 안드로이드)).statusCode).toBe(202);
    터뜨린다(new Error('러너 죽음'));
    await vi.waitFor(() => expect(풀렸나()).toBe(true));
  });

  it('이미 도는 테스트 실행이 있어 TRIAL_BUSY 로 거절돼도 디바이스를 놓는다', async () => {
    expect((await 보낸다('XTR-AND', { ...안드로이드, platform: 'desktop' })).statusCode).toBe(202);
    const res = await 보낸다('XTR-AND', 안드로이드);
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string }>().error).toBe('TRIAL_BUSY');
    expect(풀렸나()).toBe(true);
    끝낸다(결과);
  });

  it('검증에서 400 · 404 로 끝나도 디바이스가 잡혀 있지 않다', async () => {
    expect((await 보낸다('XTR-AND', { ...안드로이드, params: {} })).statusCode).toBe(400);
    expect(풀렸나()).toBe(true);
    expect((await 보낸다('XTR-999', 안드로이드)).statusCode).toBe(404);
    expect(풀렸나()).toBe(true);
    expect(보냄).not.toHaveBeenCalled();
  });

  it('desktop 은 디바이스 잠금을 건드리지 않는다', async () => {
    expect(폰을바로잡는다()).toBe(true);
    const res = await 보낸다('XTR-AND', { ...안드로이드, platform: 'desktop' });
    expect(res.statusCode).toBe(202);
    expect(풀렸나()).toBe(false);
    끝낸다(결과);
  });
});
