// 케이스 테스트 실행이 고른 대상 서버 줄의 앱 파일을 폰을 잡은 뒤 android 요청에만 싣고, 장면 열쇠는 브라우저 요청에만 싣는지 본다. DB · 팜은 가짜다 (APP-F1-03 · TMO-F3-02)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as farm from './farm.js';
import * as farmToken from './farmToken.js';
import { 폰을놓는다 } from './phone.js';
import * as runner from './runner.js';
import { 전부비운다 } from './trial.js';
import trialRoutes from './trialRoutes.js';

describe('케이스 테스트 실행 — 대상 서버 줄 · 앱 파일 · 장면 열쇠', () => {
  let app: FastifyInstance;
  const 보냄 = vi.fn();
  const 빈스키마 = { type: 'object', properties: {} };
  const 줄 = { env: 'qa', base_url: 'https://qa.example.com', login_id: null, login_password: null, is_prod: false, role_accounts: [], app_path: '/apk/qa.apk' };

  beforeAll(async () => {
    const 질의 = async (sql: string) => {
      if (sql.includes('FROM test_case WHERE')) {
        return { rows: [{ platforms: ['android', 'desktop'], file_path: 'xap/a.spec.ts', param_schema: 빈스키마, expected_schema: 빈스키마 }] };
      }
      if (sql.includes('FROM service WHERE prefix')) return { rows: [{ id: '7', kind: 'SCREEN' }] };
      if (sql.includes('FROM service_env WHERE service_id')) return { rows: [줄] };
      return { rows: [] };
    };
    vi.doMock('../db/index.js', () => ({ pool: { query: 질의, connect: async () => ({ query: 질의, release: () => undefined }) } }));
    vi.spyOn(runner, '보낸다').mockImplementation(((...인자: unknown[]) => 보냄(...인자)) as never);
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
    폰을놓는다();
    전부비운다();
    process.env.DEVICE_FARM_URL = 'http://127.0.0.1:1';
    보냄.mockReset();
    보냄.mockResolvedValue({ historyId: 1, status: 'PASS', durationMs: 5, steps: [] });
  });

  const 시작 = (body: object) =>
    app.inject({ method: 'POST', url: '/api/cases/XAP-001/test-run', payload: { params: {}, expected: {}, ...body } });
  const 보낸요청 = async (body: object) => {
    const res = await 시작(body);
    await vi.waitFor(() => expect(보냄).toHaveBeenCalled());
    return { 몸: 보냄.mock.calls[0]![1] as Record<string, unknown>, trialId: res.json<{ trialId: string }>().trialId };
  };

  it('android 는 폰을 잡고 그 줄의 앱 경로를 싣는다 — 장면 열쇠는 안 싣는다', async () => {
    const { 몸 } = await 보낸요청({ platform: 'android', env: 'qa' });
    expect(몸).toMatchObject({ baseUrl: 'https://qa.example.com', udid: 's1', app: '/apk/qa.apk' });
    expect('live' in 몸).toBe(false);
  });

  it('desktop 은 앱 경로를 안 싣고 이 시험 번호를 장면 열쇠로 싣는다', async () => {
    const { 몸, trialId } = await 보낸요청({ platform: 'desktop', env: 'qa' });
    expect('app' in 몸).toBe(false);
    expect(몸.live).toBe(trialId);
  });

  it('주소는 대상 서버 줄에서 찾는다 — 본문에 주소를 실어도 안 본다', async () => {
    const { 몸 } = await 보낸요청({ platform: 'desktop', env: 'qa', baseUrl: 'http://169.254.169.254' });
    expect(몸.baseUrl).toBe('https://qa.example.com');
  });

  it('대상 서버 이름이 없거나 모르는 이름이면 400 ENV_NOT_FOUND 이고 러너에 안 보낸다', async () => {
    for (const body of [{ platform: 'desktop' }, { platform: 'desktop', env: 'prod' }]) {
      const res = await 시작(body);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
      expect(res.json<{ error: string }>().error).toBe('ENV_NOT_FOUND');
    }
    expect(보냄).not.toHaveBeenCalled();
  });
});
