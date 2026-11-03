// 케이스 테스트 실행이 android 케이스에서 디바이스 잠금을 잡고 놓는지 본다. DB · 팜은 가짜로 바꿔 DB 없이 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as farm from './farm.js';
import * as farmToken from './farmToken.js';
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
  const 안드로이드 = { platform: 'android', env: 'qa', params: { loginId: 'u' }, expected: {} };

  beforeAll(async () => {
    const 질의 = async (sql: string, 값: string[]) => {
      if (sql.includes('FROM test_case WHERE')) {
        if (값[0] !== 'XTR-AND') return { rows: [] };
        const 스키마 = { param_schema: 바른스키마, expected_schema: { type: 'object', properties: {} } };
        return { rows: [{ platforms: ['android', 'desktop'], file_path: 'xtr/a.spec.ts', ...스키마 }] };
      }
      if (sql.includes('FROM service WHERE prefix')) return { rows: [{ id: '7', kind: 'SCREEN' }] };
      if (sql.includes('FROM service_env WHERE service_id')) {
        return { rows: [{ env: 'qa', base_url: 'https://qa.example.com', login_id: null, login_password: null, is_prod: false, role_accounts: [], app_path: null }] };
      }
      return { rows: [] };
    };
    vi.doMock('../db/index.js', () => ({ pool: { query: 질의, connect: async () => ({ query: 질의, release: () => undefined }) } }));
    vi.spyOn(runner, '보낸다').mockImplementation(((...인자: unknown[]) => 보냄(...인자)) as never);
    // 빈 폰은 늘 잡힌다 — 팜 잡기 · 놓기는 farm.test.ts 가 본다
    vi.spyOn(farm, '팜폰으로').mockImplementation(((_팜: string, 일: (udid: string, 화면: undefined) => Promise<unknown>) => 일('s1', undefined)) as never);
    vi.spyOn(farmToken, '사람팜토큰').mockResolvedValue(undefined);
    app = Fastify();
    await app.register(trialRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    vi.doUnmock('../db/index.js');
    await app.close();
    delete process.env.DEVICE_FARM_URL;
  });

  beforeEach(() => {
    while (!풀렸나()) 폰을놓는다();
    전부비운다();
    process.env.DEVICE_FARM_URL = 'http://127.0.0.1:1';
    보냄.mockReset();
    보냄.mockImplementation(
      () =>
        new Promise((ok, 안됨) => {
          끝낸다 = ok;
          터뜨린다 = 안됨;
        }),
    );
  });

  const 결과 = { historyId: 1, status: 'PASS', durationMs: 5, steps: [] };

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
    // 화면 문장이 사유를 다 말한다. 서버가 같은 말을 사유로 붙이면 화면에 두 번 뜬다
    expect(res.json<{ detail?: string }>().detail).toBeUndefined();
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

  it('이 서버에 Device VISION 이 없으면 409 FARM_OFF 이고 디바이스를 잡지 않는다', async () => {
    delete process.env.DEVICE_FARM_URL;
    const res = await 보낸다('XTR-AND', 안드로이드);
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: string }>().error).toBe('FARM_OFF');
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
