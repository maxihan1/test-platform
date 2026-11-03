// 케이스 테스트 실행이 고른 대상 서버 줄의 앱 파일을 폰을 잡은 뒤 android 요청에만 싣고, 장면 열쇠는 브라우저 요청에만 싣는지 본다. 모바일 웹은 팜이 있으면 실제 폰이다. DB · 팜은 가짜다 (APP-F1-03 · TMO-F3-02 · TMO-F4-03)

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
        return { rows: [{ platforms: ['android', 'desktop', 'mobile'], file_path: 'xap/a.spec.ts', param_schema: 빈스키마, expected_schema: 빈스키마 }] };
      }
      if (sql.includes('FROM service WHERE prefix')) return { rows: [{ id: '7', kind: 'SCREEN' }] };
      if (sql.includes('FROM service_env WHERE service_id')) return { rows: [줄] };
      return { rows: [] };
    };
    vi.doMock('../db/index.js', () => ({ pool: { query: 질의, connect: async () => ({ query: 질의, release: () => undefined }) } }));
    vi.spyOn(runner, '보낸다').mockImplementation(((...인자: unknown[]) => 보냄(...인자)) as never);
    vi.spyOn(farm, '팜폰으로').mockImplementation(((_팜: string, 일: (udid: string, 화면: undefined) => Promise<unknown>) => 일('s1', undefined)) as never);
    vi.spyOn(farm, '폰Chrome으로').mockImplementation(((_팜: string, 일: (칸: object, 화면: string) => Promise<unknown>) =>
      일({ udid: 's2', cdpUrl: 'wss://farm.test/api/devices/s2/chrome/cdp', farmToken: 'pat_me' }, 'https://farm.test/#phone=s2&view=k')) as never);
    vi.spyOn(farmToken, '사람팜토큰').mockResolvedValue('pat_me');
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

  it('mobile 은 팜이 있으면 실제 폰 Chrome 칸과 장면 열쇠를 싣고, 도는 동안 그 폰 화면 링크를 낸다', async () => {
    let 끝내기: (v: unknown) => void = () => undefined;
    보냄.mockImplementationOnce(() => new Promise((r) => (끝내기 = r)));
    const { 몸, trialId } = await 보낸요청({ platform: 'mobile', env: 'qa' });
    expect(몸).toMatchObject({ platform: 'mobile', udid: 's2', cdpUrl: 'wss://farm.test/api/devices/s2/chrome/cdp', farmToken: 'pat_me', live: trialId });
    expect('app' in 몸).toBe(false);
    const 도는중 = await app.inject({ method: 'GET', url: `/api/cases/XAP-001/test-run/${trialId}` });
    expect(도는중.json()).toEqual({ status: 'RUNNING', vision: { url: 'https://farm.test/#phone=s2&view=k' } });
    끝내기({ historyId: 1, status: 'PASS', durationMs: 5, steps: [] });
    await vi.waitFor(async () => expect((await app.inject({ method: 'GET', url: `/api/cases/XAP-001/test-run/${trialId}` })).json()).toMatchObject({ status: 'DONE' }));
  });

  it('mobile 실제 폰을 못 잡으면 409 로 막지 않고 그 까닭의 미실행으로 끝난다 — 러너에 안 보낸다', async () => {
    vi.mocked(farm.폰Chrome으로).mockImplementationOnce(((_팜: string, _일: unknown, 못잡음: (까닭: string) => unknown) =>
      Promise.resolve(못잡음('Device VISION 에 빈 폰이 없습니다'))) as never);
    const res = await 시작({ platform: 'mobile', env: 'qa' });
    expect(res.statusCode).toBe(202);
    const 읽기 = () => app.inject({ method: 'GET', url: `/api/cases/XAP-001/test-run/${res.json<{ trialId: string }>().trialId}` });
    await vi.waitFor(async () => expect((await 읽기()).json()).toMatchObject({ status: 'DONE', result: { status: 'NA', error: { message: 'Device VISION 에 빈 폰이 없습니다' } } }));
    expect(보냄).not.toHaveBeenCalled();
  });

  it('팜이 없는 서버의 mobile 은 서버 흉내다 — 폰 칸 없이 보낸다', async () => {
    delete process.env.DEVICE_FARM_URL;
    const { 몸 } = await 보낸요청({ platform: 'mobile', env: 'qa' });
    expect('cdpUrl' in 몸 || 'udid' in 몸).toBe(false);
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
