// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 에이전트토큰만들기 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import grafanaProxy from './proxy.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xgfg-검사용-세션-열쇠-32글자를-넘긴다';

describe.skipIf(연결 === undefined)('Grafana 통로 — 문', () => {
  let app: FastifyInstance;
  let 위쪽: Server;
  let 닿은수 = 0;

  async function 계정넣기(username: string, role: 'member' | 'admin', dashboard: 'none' | 'read', 변경강제 = false) {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, $3, $4, true, $5)
       ON CONFLICT (username) DO UPDATE SET is_active = true, role = EXCLUDED.role,
                                            password_hash = EXCLUDED.password_hash, perm_dashboard = EXCLUDED.perm_dashboard,
                                            is_approved = true, must_change_password = EXCLUDED.must_change_password`,
      [username, await 해시('열려라참깨'), role, dashboard, 변경강제],
    );
  }

  beforeAll(async () => {
    위쪽 = createServer((_req, res) => {
      닿은수 += 1;
      res.end('grafana');
    });
    await new Promise<void>((r) => 위쪽.listen(0, '127.0.0.1', r));
    process.env.GRAFANA_URL = `http://127.0.0.1:${String((위쪽.address() as AddressInfo).port)}`;
    process.env.AUTHORING_AGENT_USER = 'xgfg-agent';

    await 계정넣기('xgfg-member', 'member', 'read');
    await 계정넣기('xgfg-none', 'member', 'none');
    await 계정넣기('xgfg-change', 'member', 'read', true);
    await 계정넣기('xgfg-admin', 'admin', 'none');
    await 계정넣기('xgfg-agent', 'admin', 'read');
    await 계정넣기('xgfg-stamp', 'member', 'read');

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(grafanaProxy);
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xgfg%'`);
    delete process.env.AUTHORING_AGENT_USER;
    await app.close();
    await new Promise<void>((r) => 위쪽.close(() => r()));
  });

  beforeEach(() => {
    닿은수 = 0;
  });

  async function 출입증(username: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: '열려라참깨' },
    });
    return res.cookies[0]!.value;
  }

  it('로그인 안 한 화면 GET 은 돌아올 주소를 싣고 로그인 화면으로 보낸다', async () => {
    const 주소 = '/grafana/d/abc?orgId=1&from=now-1h';
    const res = await app.inject({ method: 'GET', url: 주소 });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`/?next=${encodeURIComponent(주소)}#/login`);
    expect(닿은수).toBe(0);
  });

  it('HEAD 는 GET 과 같이 본다', async () => {
    expect((await app.inject({ method: 'HEAD', url: '/grafana/d/abc' })).statusCode).toBe(302);
    expect((await app.inject({ method: 'HEAD', url: '/grafana/api/search' })).statusCode).toBe(401);
    expect(닿은수).toBe(0);
  });

  it('끝 / 가 없는 /grafana 도 문을 지난다', async () => {
    const res = await app.inject({ method: 'GET', url: '/grafana' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`/?next=${encodeURIComponent('/grafana/')}#/login`);
    expect(닿은수).toBe(0);
  });

  it('로그인 안 한 /grafana/api/** 와 GET 아닌 요청은 401 이다', async () => {
    expect((await app.inject({ method: 'GET', url: '/grafana/api/search' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/grafana/api/ds/query', payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/grafana/d/abc', payload: {} })).statusCode).toBe(401);
    expect(닿은수).toBe(0);
  });

  it('한 글자를 인코딩한 주소로 문을 비키지 못한다', async () => {
    for (const url of ['/%67rafana/api/health', '/grafana/%61pi/health', '/%67rafana/d/abc']) {
      const res = await app.inject({ method: 'GET', url });
      expect([302, 401, 404], url).toContain(res.statusCode);
    }
    expect(닿은수).toBe(0);
  });

  it('대시보드 칸이 none 이면 403 이다', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/grafana/d/abc',
      cookies: { platform_session: await 출입증('xgfg-none') },
    });
    expect(res.statusCode).toBe(403);
    expect(닿은수).toBe(0);
  });

  it('비밀번호 변경 강제 중이면 403 PASSWORD_CHANGE_REQUIRED 다', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/grafana/api/search',
      cookies: { platform_session: await 출입증('xgfg-change') },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'PASSWORD_CHANGE_REQUIRED' });
    expect(닿은수).toBe(0);
  });

  it('에이전트 토큰으로는 못 연다', async () => {
    const 발급 = await 에이전트토큰만들기('xgfg-agent');
    if (typeof 발급 === 'string') throw new Error(`토큰 발급 실패: ${발급}`);
    const res = await app.inject({
      method: 'GET',
      url: '/grafana/api/search',
      headers: { authorization: `Bearer ${발급.토큰}` },
    });
    expect(res.statusCode).toBe(403);
    expect(닿은수).toBe(0);
  });

  it('비밀번호가 바뀐 뒤의 옛 출입증은 로그인 안 한 것으로 본다', async () => {
    const 옛것 = await 출입증('xgfg-stamp');
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE app_user SET password_hash = $1 WHERE username = 'xgfg-stamp'`, [await 해시('새비밀번호다')]);

    const 화면 = await app.inject({ method: 'GET', url: '/grafana/d/abc', cookies: { platform_session: 옛것 } });
    expect(화면.statusCode).toBe(302);
    const api = await app.inject({ method: 'GET', url: '/grafana/api/search', cookies: { platform_session: 옛것 } });
    expect(api.statusCode).toBe(401);
    expect(닿은수).toBe(0);
  });

  it('대시보드 read 인 member 와 admin 은 지나간다', async () => {
    for (const username of ['xgfg-member', 'xgfg-admin']) {
      const res = await app.inject({
        method: 'GET',
        url: '/grafana/d/abc',
        cookies: { platform_session: await 출입증(username) },
      });
      expect(res.statusCode, username).toBe(200);
      expect(res.body).toBe('grafana');
    }
    expect(닿은수).toBe(2);
  });
});
