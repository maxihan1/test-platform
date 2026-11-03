// 게임 첫 화면 통로와 게임 요청의 화면 기록 줄 — 게임만 game-screen · 게임은 app-screen 을 안 탄다 · 앱 파일이 없으면 까닭 · 창 기록은 앱 줄에 (도메인/게임 §7 · §3.10 「지도」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 서버팜토큰 } from '../execution/farmToken.js';
import prdAgentRoutes from '../prd/agentRoutes.js';

import appScreenAgentRoutes from './appScreen.js';

vi.mock('../execution/farmToken.js', () => ({ 서버팜토큰: vi.fn(async () => undefined) }));

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XGS';
const 에이전트 = 'xgs-agent';

describe.skipIf(연결 === undefined)('게임 첫 화면 · 게임 화면 기록 줄', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 원래 = { 에이전트: process.env.AUTHORING_AGENT_USER, 팜: process.env.DEVICE_FARM_URL };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 요청넣기 = async (env: string | null = null) => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by, env)
       VALUES ($1, 'AUTHOR', '{}', 'xgs', '검사', 'RUNNING', $2, $3) RETURNING id`,
      [서비스, 에이전트, env],
    );
    return Number(r.rows[0]!.id);
  };
  const 줄들 = async (값: [env: string, appPath: string | null, isProd: boolean][]) => {
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    for (const [env, appPath, isProd] of 값) {
      await q(`INSERT INTO service_env (service_id, env, base_url, is_prod, app_path) VALUES ($1, $2, 'https://xgs.example', $3, $4)`, [서비스, env, isProd, appPath]);
    }
  };
  const 종류 = (kind: string) => q('UPDATE service SET kind = $2 WHERE id = $1', [서비스, kind]);
  const 받기 = async (id: number, 길: string) => (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/${길}` })).json();
  const 치우기 = async () => {
    await q('DELETE FROM screen_link WHERE service_id = $1', [서비스]);
    await q('DELETE FROM screen_found WHERE service_id = $1', [서비스]);
    await q('DELETE FROM screen_record WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XGS 게임 첫 화면 검사용', '#3A5FCD', '', 'xgs', 'GAME') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
    process.env.AUTHORING_AGENT_USER = 에이전트;
    // 팜이 없는 배치 — 러너 · 팜을 부르기 전에 까닭으로 끝나 네트워크 없이 본다
    delete process.env.DEVICE_FARM_URL;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(appScreenAgentRoutes, { prefix: '/api' });
    await app.register(prdAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 치우기();
    await 종류('GAME');
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    for (const [이름, 값] of [['AUTHORING_AGENT_USER', 원래.에이전트], ['DEVICE_FARM_URL', 원래.팜]] as const) {
      if (값 === undefined) delete process.env[이름];
      else process.env[이름] = 값;
    }
  });

  it('게임은 game-screen 이 앱 줄의 앱 파일로 읽으러 가고 app-screen 은 비운다', async () => {
    await 줄들([['dev', null, false], ['qa', 'https://builds/qa.apk', false]]);
    const id = await 요청넣기();

    expect(await 받기(id, 'game-screen')).toEqual({ screen: null, reason: 'Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않다', game: null });
    expect(await 받기(id, 'app-screen')).toEqual({ screen: null, reason: null, appium: null });
  });

  it('서버 몫 대신 PAT 하나로 팜 폰을 잡고 러너 farmToken 에 싣고 응답 appium.token 으로도 준다', async () => {
    await 종류('APP');
    await 줄들([['qa', 'https://builds/qa.apk', false]]);
    const id = await 요청넣기();
    vi.mocked(서버팜토큰).mockResolvedValueOnce('pat_xgs');
    // 팜과 러너를 한 가짜 서버로 — 팜은 빈 폰 하나를 내주고 러너는 받은 몸을 남긴다
    const 팜머리들: (string | undefined)[] = [];
    const 러너몸들: unknown[] = [];
    const 가짜 = Fastify();
    가짜.get('/api/devices', async (req) => {
      팜머리들.push(req.headers.authorization);
      return { value: { devices: [{ serial: 'XGS1', state: 'IDLE' }] } };
    });
    가짜.route({ method: ['POST', 'DELETE'], url: '/api/devices/XGS1/hold', handler: async (req) => {
      팜머리들.push(req.headers.authorization);
      return { held: {} };
    } });
    가짜.post('/app-screen', async (req) => {
      러너몸들.push(req.body);
      return { screen: '화면 · 요소 1개' };
    });
    const 주소 = await 가짜.listen({ port: 0, host: '127.0.0.1' });
    const 원래러너 = process.env.RUNNER_URL;
    process.env.DEVICE_FARM_URL = 주소;
    process.env.RUNNER_URL = 주소;
    try {
      expect(await 받기(id, 'app-screen')).toEqual({
        screen: '화면 · 요소 1개',
        reason: null,
        appium: { url: `${주소}/wd/hub`, app: 'https://builds/qa.apk', token: 'pat_xgs' },
      });
    } finally {
      delete process.env.DEVICE_FARM_URL;
      if (원래러너 === undefined) delete process.env.RUNNER_URL;
      else process.env.RUNNER_URL = 원래러너;
      await 가짜.close();
    }
    expect(러너몸들).toEqual([{ app: 'https://builds/qa.apk', udid: 'XGS1', farmToken: 'pat_xgs' }]);
    expect(팜머리들).toEqual(['Bearer pat_xgs', 'Bearer pat_xgs', 'Bearer pat_xgs']);
    expect(서버팜토큰).toHaveBeenCalledOnce();
  });

  it('게임인데 운영 아닌 줄에 앱 파일이 없으면 까닭을 적는다 — 켤 게임이 없다', async () => {
    await 줄들([['dev', null, false], ['prod', 'https://builds/prod.apk', true]]);
    const id = await 요청넣기();

    expect(await 받기(id, 'game-screen')).toEqual({ screen: null, reason: '대상 서버 줄에 게임 앱 파일 경로가 없다', game: null });
  });

  it('게임이 아니면 game-screen 은 비우고 app-screen 은 지금처럼 읽으러 간다', async () => {
    await 종류('APP');
    await 줄들([['qa', 'https://builds/qa.apk', false]]);
    const id = await 요청넣기();

    expect(await 받기(id, 'game-screen')).toEqual({ screen: null, reason: null, game: null });
    expect(await 받기(id, 'app-screen')).toEqual({ screen: null, reason: 'Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않다', appium: null });
  });

  it('대상 서버가 없는 게임 요청의 창 기록은 앱 줄에 두고 그 줄에서 읽는다', async () => {
    await 줄들([['dev', null, false], ['qa', 'https://builds/qa.apk', false]]);
    const id = await 요청넣기();
    const 창 = { state: '로그아웃', url: 'game:Login', name: '로그인', textFp: 'ab12', structFp: 'cd34', record: '# scene:Login\n- Button LoginButton', crawledAt: '2026-10-23T00:00:00Z', links: [{ toUrl: 'game:Login/Canvas/SignupPanel', via: 'SignupButton 「가입」' }] };

    const 올림 = await app.inject({ method: 'PUT', url: `/api/authoring/requests/${id}/screens`, payload: 창 });

    expect(올림.statusCode).toBe(204);
    const 줄 = await q<{ env: string }>('SELECT env FROM screen_record WHERE service_id = $1', [서비스]);
    expect(줄.rows.map((r) => r.env)).toEqual(['qa']);
    const 읽음 = await 받기(id, 'screens');
    expect(읽음.screens.map((s: { url: string }) => s.url)).toEqual(['game:Login']);
    expect(읽음.links).toEqual([{ state: '로그아웃', fromUrl: 'game:Login', toUrl: 'game:Login/Canvas/SignupPanel', via: 'SignupButton 「가입」' }]);
  });

  it('본 창 알리기(done)도 앱 줄의 찾은 창으로 남고, 못 본 창은 complete 가 비면 안 지운다', async () => {
    await 줄들([['dev', null, false], ['qa', 'https://builds/qa.apk', false]]);
    const id = await 요청넣기();

    const r = await app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/screens/done`, payload: { seen: [{ state: '로그인:일반 회원', url: 'game:World/Canvas/InventoryPanel', name: '인벤토리' }], complete: [] } });

    expect(r.json()).toEqual({ deleted: 0, viewport: null });
    const 찾음 = await q<{ env: string; url: string }>('SELECT env, url FROM screen_found WHERE service_id = $1', [서비스]);
    expect(찾음.rows.map((x) => [x.env, x.url])).toEqual([['qa', 'game:World/Canvas/InventoryPanel']]);
  });

  it('게임인데 운영 아닌 앱 줄이 없으면 웹과 같이 빈 목록 · 400 BAD_SCREEN env 다', async () => {
    await 줄들([['prod', 'https://builds/prod.apk', true]]);
    const id = await 요청넣기();

    expect(await 받기(id, 'screens')).toEqual({ screens: [], links: [] });
    const r = await app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/screens/done`, payload: { seen: [], complete: [] } });
    expect([r.statusCode, r.json()]).toEqual([400, { error: 'BAD_SCREEN', detail: 'env' }]);
  });

  it('게임이 아닌 요청은 대상 서버가 없으면 지금처럼 올리지 못한다', async () => {
    await 종류('APP');
    await 줄들([['qa', 'https://builds/qa.apk', false]]);
    const id = await 요청넣기();

    const r = await app.inject({ method: 'PUT', url: `/api/authoring/requests/${id}/screens`, payload: {} });

    expect([r.statusCode, r.json()]).toEqual([400, { error: 'BAD_SCREEN', detail: 'env' }]);
  });
});
