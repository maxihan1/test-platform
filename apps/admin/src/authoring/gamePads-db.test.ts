// PC 게임 작성 — 새 작성의 지원 패드 갈아 끼우기 · 집기 응답의 gamePlatform · gamePads · game-screen 비우기 · app-link 의 빌드 줄 (도메인/게임 §3.10 「윈도우 PC」 · 작성 §7 · GAME-F4-05)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 서버팜토큰 } from '../execution/farmToken.js';

import authoringAgentRoutes from './agentRoutes.js';
import appScreenAgentRoutes from './appScreen.js';
import authoringRoutes from './routes.js';

vi.mock('../execution/farmToken.js', () => ({ 서버팜토큰: vi.fn(async () => undefined) }));

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XGF';
const 에이전트 = 'xgf-agent';

describe.skipIf(연결 === undefined)('PC 게임 작성 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 원래 = { 에이전트: process.env.AUTHORING_AGENT_USER, 팜: process.env.DEVICE_FARM_URL };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 플랫폼 = (kind: 'GAME' | 'APP', game: 'android' | 'windows' | null) =>
    q('UPDATE service SET kind = $2, game_platform = $3, game_pads = $4::jsonb WHERE id = $1', [서비스, kind, game, '[]']);
  const 패드읽기 = async () => (await q<{ game_pads: string[] }>('SELECT game_pads FROM service WHERE id = $1', [서비스])).rows[0]!.game_pads;
  const 줄들 = async (값: [env: string, appPath: string | null, isProd: boolean][]) => {
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    for (const [env, appPath, isProd] of 값) {
      await q(`INSERT INTO service_env (service_id, env, base_url, is_prod, app_path) VALUES ($1, $2, 'https://xgf.example', $3, $4)`, [서비스, env, isProd, appPath]);
    }
  };
  const 빌드올리기 = async (env: string, 번호: string, 언제: string) =>
    Number(
      (await q<{ id: string }>(
        `INSERT INTO app_build (service_id, env, build_no, file_path, uploaded_by, uploaded_at) VALUES ($1, $2, $3, '/tmp/xgf.zip', 'xgf', now() - $4::interval) RETURNING id`,
        [서비스, env, 번호, 언제],
      )).rows[0]!.id,
    );
  const 요청넣기 = async (status: 'PENDING' | 'RUNNING', env: string | null = null) =>
    Number(
      (await q<{ id: string }>(
        `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by, env)
         VALUES ($1, 'AUTHOR', '{}', 'xgf', '검사', $2, $3, $4) RETURNING id`,
        [서비스, status, status === 'RUNNING' ? 에이전트 : null, env],
      )).rows[0]!.id,
    );
  const 작성 = (본문: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: { kind: 'AUTHOR', ...본문 } });
  const 받기 = async (id: number, 길: string) => (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/${길}` })).json();
  const 집기 = async () => (await app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` })).json<Record<string, unknown>>();
  const 치우기 = async () => {
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('DELETE FROM app_build WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform) VALUES ($1, 'XGF PC 게임 작성 검사용', '#3A5FCD', '', 'xgf', 'GAME', 'windows') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
    process.env.AUTHORING_AGENT_USER = 에이전트;
    delete process.env.DEVICE_FARM_URL;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.register(appScreenAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 치우기();
    await 플랫폼('GAME', 'windows');
    await q(`UPDATE service SET code_repos = '[]' WHERE id = $1`, [서비스]);
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

  it('PC 게임의 새 작성은 gamePads 로 애플리케이션 지원 패드를 갈아 끼우고, 빈 배열이면 비우고, 안 보내면 그대로 둔다', async () => {
    expect((await 작성({ gamePads: ['ps5', 'xbox'] })).statusCode).toBe(201);
    expect(await 패드읽기()).toEqual(['ps5', 'xbox']);

    await 치우기();
    expect((await 작성({})).statusCode).toBe(201);
    expect(await 패드읽기()).toEqual(['ps5', 'xbox']);

    await 치우기();
    expect((await 작성({ gamePads: [] })).statusCode).toBe(201);
    expect(await 패드읽기()).toEqual([]);
  });

  it('넷 밖 값 · 겹친 값 · 배열이 아닌 값은 400 BAD_PAD 이고 요청도 패드도 안 남는다', async () => {
    await q(`UPDATE service SET game_pads = '["switch"]' WHERE id = $1`, [서비스]);
    for (const gamePads of [['ps5', 'wii'], ['ps5', 'ps5'], 'ps5', [5]]) {
      const r = await 작성({ gamePads });
      expect([r.statusCode, r.json()]).toEqual([400, { error: 'BAD_PAD' }]);
    }
    expect(await 패드읽기()).toEqual(['switch']);
    expect((await q('SELECT 1 FROM authoring_request WHERE service_id = $1', [서비스])).rowCount).toBe(0);
  });

  it('PC 게임이 아니면 gamePads 는 빈 배열이어도 400 NOT_PC_GAME — 모바일 게임 · 앱', async () => {
    for (const [kind, game] of [['GAME', 'android'], ['APP', null]] as const) {
      await 플랫폼(kind, game);
      const r = await 작성({ gamePads: [] });
      expect([r.statusCode, r.json()]).toEqual([400, { error: 'NOT_PC_GAME' }]);
    }
    expect((await q('SELECT 1 FROM authoring_request WHERE service_id = $1', [서비스])).rowCount).toBe(0);
  });

  it('집기 응답에 게임 애플리케이션이면 gamePlatform · gamePads 가 실리고 앱이면 두 칸이 없다', async () => {
    await q(`UPDATE service SET game_pads = '["ps4","switch"]' WHERE id = $1`, [서비스]);
    await 요청넣기('PENDING');
    expect(await 집기()).toMatchObject({ gamePlatform: 'windows', gamePads: ['ps4', 'switch'] });

    await 치우기();
    await 플랫폼('GAME', 'android');
    await 요청넣기('PENDING');
    expect(await 집기()).toMatchObject({ gamePlatform: 'android', gamePads: [] });

    await 치우기();
    await 플랫폼('APP', null);
    await 요청넣기('PENDING');
    const 앱 = await 집기();
    expect(앱).not.toHaveProperty('gamePlatform');
    expect(앱).not.toHaveProperty('gamePads');
  });

  it('게임 애플리케이션에 코드 저장소가 있으면 집기 응답에 codeRepos 가 실리고, 비었거나 앱이면 칸이 없다', async () => {
    const 저장소 = [{ name: '게임', url: 'https://github.com/xgf/game' }];
    await q('UPDATE service SET code_repos = $2::jsonb WHERE id = $1', [서비스, JSON.stringify(저장소)]);
    await 요청넣기('PENDING');
    expect(await 집기()).toMatchObject({ gamePlatform: 'windows', codeRepos: 저장소 });

    await 치우기();
    await 플랫폼('APP', null);
    await 요청넣기('PENDING');
    expect(await 집기()).not.toHaveProperty('codeRepos');

    await 치우기();
    await 플랫폼('GAME', 'android');
    await q(`UPDATE service SET code_repos = '[]' WHERE id = $1`, [서비스]);
    await 요청넣기('PENDING');
    expect(await 집기()).not.toHaveProperty('codeRepos');
  });

  it('game-screen 은 PC 게임이면 폰을 안 잡고, 빌드가 없으면 그 까닭 · 있으면 팜 주소와 zip 링크를 주며, 모바일 게임은 지금처럼 앱 파일을 본다', async () => {
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'https://qahub.xgf.test');
    vi.stubEnv('SESSION_SECRET', 'xgf-session-secret');
    try {
      await 줄들([['qa', null, false]]);
      const id = await 요청넣기('RUNNING');
      expect(await 받기(id, 'game-screen')).toEqual({ screen: null, reason: 'Windows 빌드가 없다 — 그 애플리케이션에 Windows 빌드 zip 을 올린 뒤 다시 작성한다', game: null });

      const 빌드 = await 빌드올리기('qa', 'xgf-1', '1 hour');
      expect(await 받기(id, 'game-screen')).toEqual({ screen: null, reason: 'PC 게임은 작성 AI 가 PC 에서 읽는다', game: null });

      vi.stubEnv('DEVICE_FARM_URL', 'http://vision.xgf.test/');
      const 답 = await 받기(id, 'game-screen');
      expect(답).toMatchObject({ screen: null, reason: 'PC 게임은 작성 AI 가 PC 에서 읽는다', game: { url: 'http://vision.xgf.test/wd/hub' } });
      expect(답.game.app).toContain(`/api/builds/${빌드}/`);

      await 플랫폼('GAME', 'android');
      vi.stubEnv('DEVICE_FARM_URL', '');
      expect(await 받기(id, 'game-screen')).toEqual({ screen: null, reason: '대상 서버 줄에 게임 앱 파일 경로가 없다', game: null });
    } finally {
      vi.unstubAllEnvs();
      vi.mocked(서버팜토큰).mockClear();
    }
  });

  it('app-link 는 PC 게임이면 빌드가 있는 줄(짚은 줄, 아니면 운영 아닌 첫 줄)의 최신 빌드 주소를 주고 app_path 로 물러서지 않는다', async () => {
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'https://qahub.xgf.test');
    vi.stubEnv('SESSION_SECRET', 'xgf-session-secret');
    try {
      await 줄들([['dev', 'https://builds/dev.apk', false], ['qa', null, false], ['qa2', null, false], ['prod', null, true]]);
      const 아무줄 = await 요청넣기('RUNNING');
      expect(await 받기(아무줄, 'app-link')).toEqual({ app: null, buildNo: null });

      await 빌드올리기('prod', 'xgf-prod', '3 hour');
      expect(await 받기(아무줄, 'app-link')).toEqual({ app: null, buildNo: null });

      await 빌드올리기('qa', 'xgf-1', '2 hour');
      const 큐에이새것 = await 빌드올리기('qa', 'xgf-2', '1 hour');
      const 큐에이투 = await 빌드올리기('qa2', 'xgf-3', '0 seconds');
      expect((await 받기(아무줄, 'app-link')).app).toContain(`/api/builds/${큐에이새것}/`);

      const 짚음 = await 요청넣기('RUNNING', 'qa2');
      expect((await 받기(짚음, 'app-link')).app).toContain(`/api/builds/${큐에이투}/`);

      const 빌드없는줄 = await 요청넣기('RUNNING', 'dev');
      expect(await 받기(빌드없는줄, 'app-link')).toEqual({ app: null, buildNo: null });
    } finally {
      vi.unstubAllEnvs();
      vi.mocked(서버팜토큰).mockClear();
    }
  });

  it('집기 accounts · adminKey 는 PC 게임이면 app-link 와 같은 줄(빌드가 있는 줄)에서 온다 — 앱 파일 경로가 비어도 실린다', async () => {
    await 줄들([['dev', null, false], ['qa', null, false], ['prod', null, true]]);
    await q(
      `UPDATE service_env SET base_url = 'https://' || env || '.xgf.example', login_id = 'xgf-player', login_password = 'xgf-비밀번호-원문-4a1',
         admin_key = jsonb_build_object('header', 'X-Admin-Key', 'value', env || '-xgf-어드민-키-원문') WHERE service_id = $1`,
      [서비스],
    );
    await 빌드올리기('prod', 'xgf-prod', '1 hour');
    await 빌드올리기('qa', 'xgf-1', '1 hour');
    await 요청넣기('PENDING');
    const r = await 집기();
    expect((r.accounts as { baseUrl: string }[] | undefined)?.[0]?.baseUrl).toBe('https://qa.xgf.example');
    expect(r.adminKey).toMatchObject({ env: 'qa', value: 'qa-xgf-어드민-키-원문' });
  });
});
