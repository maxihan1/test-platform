// 케이스 테스트 실행이 보낸 주소의 대상 서버 줄에서 앱 파일 경로를 찾아 android 요청에만 싣는지 본다. DB 는 가짜다 (APP-F1-03)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 폰을놓는다 } from './phone.js';
import * as runner from './runner.js';
import { 전부비운다 } from './trial.js';
import trialRoutes from './trialRoutes.js';

describe('케이스 테스트 실행 — 대상 서버 앱 파일', () => {
  let app: FastifyInstance;
  const 보냄 = vi.fn();
  const 빈스키마 = { type: 'object', properties: {} };
  const 줄 = { env: 'qa', base_url: 'https://qa.example.com', login_id: null, login_password: null, is_prod: false, role_accounts: [], app_path: '/apk/qa.apk' };

  beforeAll(async () => {
    const 질의 = async (sql: string) => {
      if (sql.includes('FROM test_case WHERE')) {
        return { rows: [{ platforms: ['android', 'desktop'], file_path: 'xap/a.spec.ts', param_schema: 빈스키마, expected_schema: 빈스키마 }] };
      }
      if (sql.includes('FROM service WHERE prefix')) return { rows: [{ id: '7' }] };
      if (sql.includes('FROM service_env WHERE service_id')) return { rows: [줄] };
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
    폰을놓는다();
    전부비운다();
    process.env.LOCAL_RUNNER_URL = 'http://127.0.0.1:1';
    보냄.mockReset();
    보냄.mockResolvedValue({ status: 200, json: { historyId: 1, status: 'PASS', durationMs: 5, steps: [] } });
  });

  const 보낸요청 = async (platform: string, baseUrl: string) => {
    await app.inject({ method: 'POST', url: '/api/cases/XAP-001/test-run', payload: { platform, baseUrl, params: {}, expected: {} } });
    await vi.waitFor(() => expect(보냄).toHaveBeenCalled());
    return 보냄.mock.calls[0]![1] as Record<string, unknown>;
  };

  it('android 는 주소 출처가 같은 줄의 앱 경로를 싣는다', async () => {
    expect((await 보낸요청('android', 'https://qa.example.com/login')).app).toBe('/apk/qa.apk');
  });

  it('출처가 다른 주소면 싣지 않는다 — 러너 환경값을 쓴다', async () => {
    expect('app' in (await 보낸요청('android', 'https://other.example.com'))).toBe(false);
  });

  it('desktop 은 싣지 않는다', async () => {
    expect('app' in (await 보낸요청('desktop', 'https://qa.example.com'))).toBe(false);
  });
});
