// 작성 에이전트 토큰 — 발급·취소와 문(허용 통로)을 실제 DB 로 본다. CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { createHash } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authoringAgentRoutes from '../authoring/agentRoutes.js';
import authoringRoutes from '../authoring/routes.js';
import settingsRoutes from '../settings/routes.js';
import { 헤더토큰 } from './agentToken.js';
import { 등급표, 인증등록, 토큰통로 } from './gate.js';
import { 해시 } from './password.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xfu5-검사용-세션-열쇠-32글자를-넘긴다';
const 맥 = 'xfu5-맥';
const 운영 = 'xfu5-운영';
const 사람 = 'xfu5-사람';
const 서비스 = 'XFS6';

describe('헤더토큰 — DB 에 가기 전에 모양을 본다', () => {
  it('헤더가 없으면 토큰으로 온 것이 아니다', () => {
    expect(헤더토큰(undefined)).toBeNull();
  });

  it('Bearer tpa_ 모양이면 토큰을 꺼낸다', () => {
    const t = `tpa_${'a'.repeat(43)}`;
    expect(헤더토큰(`Bearer ${t}`)).toBe(t);
  });

  it('토큰통로의 모든 줄이 등급표에 있다 — 글자가 틀리면 맥이 돌 때에야 403 으로 드러난다', () => {
    const 없는것 = [...토큰통로].filter((쌍) => !(쌍 in 등급표));
    expect(없는것).toEqual([]);
  });

  it('에이전트가 산출물을 올리는 통로가 토큰으로 열린다 — 역방향 표시 사본·역기획서', () => {
    expect(토큰통로.has('POST /api/authoring/requests/:id/outputs')).toBe(true);
  });

  it('모양이 아니면 틀림 — 세션으로 넘어가지 않게', () => {
    expect(헤더토큰('Bearer 아무거나')).toBe('틀림');
    expect(헤더토큰(`Basic tpa_${'a'.repeat(43)}`)).toBe('틀림');
    expect(헤더토큰('')).toBe('틀림');
  });
});

describe.skipIf(연결 === undefined)('작성 에이전트 토큰', () => {
  let app: FastifyInstance;
  let 운영쿠키 = '';
  let 사람쿠키 = '';
  const 옛이름 = process.env.AUTHORING_AGENT_USER;

  async function 계정넣기(username: string, role: string) {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, $1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET is_active = true, role = EXCLUDED.role,
                                            password_hash = EXCLUDED.password_hash, agent_token_hash = NULL`,
      [username, await 해시('열려라참깨'), role],
    );
    await pool.query(
      `INSERT INTO user_service (username, service_id) SELECT $1, id FROM service WHERE prefix = $2
       ON CONFLICT DO NOTHING`,
      [username, 서비스],
    );
  }

  async function 로그인(username: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: '열려라참깨' },
    });
    return (res.headers['set-cookie'] as string).split(';')[0]!;
  }

  async function 발급(username: string) {
    return app.inject({
      method: 'POST',
      url: `/api/settings/users/${username}/agent-token`,
      headers: { cookie: 운영쿠키 },
    });
  }

  function 토큰으로(method: 'GET' | 'POST' | 'PATCH', url: string, 토큰: string, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${토큰}` }, payload });
  }

  async function 계정줄(username: string) {
    const res = await app.inject({ method: 'GET', url: '/api/settings/users', headers: { cookie: 운영쿠키 } });
    return res.json<{ items: Record<string, unknown>[] }>().items.find((u) => u.username === username);
  }

  beforeAll(async () => {
    process.env.AUTHORING_AGENT_USER = 맥;
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'xfu5 토큰 검사', '#223344', 'https://example.com/x', 'x')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true`,
      [서비스],
    );
    await 계정넣기(맥, 'operator');
    await 계정넣기(운영, 'admin');
    await 계정넣기(사람, 'operator');

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    운영쿠키 = await 로그인(운영);
    사람쿠키 = await 로그인(사람);
  });

  afterAll(async () => {
    if (옛이름 === undefined) delete process.env.AUTHORING_AGENT_USER;
    else process.env.AUTHORING_AGENT_USER = 옛이름;
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu5%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu5%'`);
    await pool.query(`DELETE FROM service WHERE prefix = $1`, [서비스]);
    await app.close();
  });

  it('작성 에이전트 계정이 아니면 발급하지 않는다', async () => {
    const res = await 발급(사람);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'NOT_AUTHORING_AGENT' });
  });

  it('운영 등급이 아니면 발급 통로에 못 닿는다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/settings/users/${맥}/agent-token`,
      headers: { cookie: 사람쿠키 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('발급하면 토큰을 한 번 주고 DB 에는 해시만 남는다', async () => {
    const res = await 발급(맥);
    expect(res.statusCode).toBe(200);
    const { agentToken } = res.json<{ agentToken: string }>();
    expect(agentToken).toMatch(/^tpa_[A-Za-z0-9_-]{43}$/);

    const { pool } = await import('../db/index.js');
    const 행 = await pool.query<{ agent_token_hash: string }>(
      'SELECT agent_token_hash FROM app_user WHERE username = $1',
      [맥],
    );
    expect(행.rows[0]!.agent_token_hash).toBe(createHash('sha256').update(agentToken).digest('hex'));

    expect(await 계정줄(맥)).toMatchObject({ hasAgentToken: true, isAuthoringAgent: true });
    expect(await 계정줄(사람)).toMatchObject({ hasAgentToken: false, isAuthoringAgent: false });
  });

  it('토큰으로 나를 물으면 그 계정이 온다', async () => {
    const { agentToken } = (await 발급(맥)).json<{ agentToken: string }>();
    const res = await 토큰으로('GET', '/api/auth/me', agentToken);
    expect(res.statusCode).toBe(200);
    expect(res.json<{ user: { username: string } }>().user.username).toBe(맥);
  });

  it('토큰으로 맥의 통로는 지나간다 — 집기', async () => {
    const { agentToken } = (await 발급(맥)).json<{ agentToken: string }>();
    const res = await 토큰으로('POST', `/api/authoring/requests/claim?service=${서비스}`, agentToken);
    expect(res.statusCode).toBe(204);
  });

  it('토큰으로 목록 밖 통로는 403 — 요청 만들기·머지·실행', async () => {
    const { agentToken } = (await 발급(맥)).json<{ agentToken: string }>();
    for (const [method, url] of [
      ['POST', `/api/authoring/requests?service=${서비스}`],
      ['POST', `/api/authoring/merges?service=${서비스}`],
      ['GET', '/api/settings/users'],
    ] as const) {
      const res = await 토큰으로(method, url, agentToken, {});
      expect(res.statusCode, `${method} ${url}`).toBe(403);
      expect(res.json()).toEqual({ error: 'AGENT_TOKEN_SCOPE' });
    }
  });

  it('다시 발급하면 옛 토큰은 그 자리에서 안 먹는다', async () => {
    const 옛것 = (await 발급(맥)).json<{ agentToken: string }>().agentToken;
    const 새것 = (await 발급(맥)).json<{ agentToken: string }>().agentToken;
    expect((await 토큰으로('GET', '/api/auth/me', 옛것)).statusCode).toBe(401);
    expect((await 토큰으로('GET', '/api/auth/me', 새것)).statusCode).toBe(200);
  });

  it('취소하면 204 이고 토큰은 401, 목록은 없음으로 바뀐다', async () => {
    const { agentToken } = (await 발급(맥)).json<{ agentToken: string }>();
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/settings/users/${맥}/agent-token`,
      headers: { cookie: 운영쿠키 },
    });
    expect(res.statusCode).toBe(204);
    expect((await 토큰으로('GET', '/api/auth/me', agentToken)).statusCode).toBe(401);
    expect(await 계정줄(맥)).toMatchObject({ hasAgentToken: false });
  });

  it('틀린 토큰은 살아 있는 세션이 같이 와도 401 — 세션으로 넘어가지 않는다', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: 사람쿠키, authorization: `Bearer tpa_${'x'.repeat(43)}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it('계정을 비활성으로 내리면 토큰도 401', async () => {
    const { agentToken } = (await 발급(맥)).json<{ agentToken: string }>();
    const { pool } = await import('../db/index.js');
    await pool.query('UPDATE app_user SET is_active = false WHERE username = $1', [맥]);
    try {
      expect((await 토큰으로('GET', '/api/auth/me', agentToken)).statusCode).toBe(401);
    } finally {
      await pool.query('UPDATE app_user SET is_active = true WHERE username = $1', [맥]);
    }
  });

  it('서버가 작성 계정을 다른 이름으로 바꾸면 옛 계정의 토큰은 401 — 목록에는 남아 화면에서 지울 수 있다', async () => {
    const { agentToken } = (await 발급(맥)).json<{ agentToken: string }>();
    process.env.AUTHORING_AGENT_USER = 사람;
    try {
      expect((await 토큰으로('GET', '/api/auth/me', agentToken)).statusCode).toBe(401);
      expect(await 계정줄(맥)).toMatchObject({ hasAgentToken: true, isAuthoringAgent: false });
    } finally {
      process.env.AUTHORING_AGENT_USER = 맥;
    }
  });

  it('토큰으로 HEAD 도 GET 처럼 지나간다 — Fastify 가 GET 에 HEAD 를 붙인다', async () => {
    const { agentToken } = (await 발급(맥)).json<{ agentToken: string }>();
    const res = await app.inject({ method: 'HEAD', url: '/api/auth/me', headers: { authorization: `Bearer ${agentToken}` } });
    expect(res.statusCode).toBe(200);
  });

  it('비밀번호를 다시 만들어도 토큰은 그대로다 — 두 열쇠는 따로 논다', async () => {
    const { agentToken } = (await 발급(맥)).json<{ agentToken: string }>();
    await app.inject({
      method: 'POST',
      url: `/api/settings/users/${맥}/password`,
      headers: { cookie: 운영쿠키 },
    });
    expect((await 토큰으로('GET', '/api/auth/me', agentToken)).statusCode).toBe(200);
  });
});
