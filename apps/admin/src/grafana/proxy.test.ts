// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import grafanaProxy from './proxy.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xgfp-검사용-세션-열쇠-32글자를-넘긴다';

describe.skipIf(연결 === undefined)('Grafana 통로 — 넘겨주기', () => {
  let app: FastifyInstance;
  let 위쪽: Server;
  let 받은것: { url: string | undefined; headers: IncomingHttpHeaders } | null = null;

  beforeAll(async () => {
    위쪽 = createServer((req, res) => {
      받은것 = { url: req.url, headers: req.headers };
      res.setHeader('content-type', 'application/json');
      res.end('{"database":"ok"}');
    });
    await new Promise<void>((r) => 위쪽.listen(0, '127.0.0.1', r));
    process.env.GRAFANA_URL = `http://127.0.0.1:${String((위쪽.address() as AddressInfo).port)}`;

    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ('xgfp-member', 'xgfp-member', $1, 'member', 'read', true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, password_hash = EXCLUDED.password_hash,
                                            perm_dashboard = 'read', must_change_password = false`,
      [await 해시('열려라참깨')],
    );

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(grafanaProxy);
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xgfp%'`);
    await app.close();
    await new Promise<void>((r) => 위쪽.close(() => r()));
  });

  beforeEach(() => {
    받은것 = null;
  });

  async function 출입증(): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'xgfp-member', password: '열려라참깨' },
    });
    return res.cookies[0]!.value;
  }

  it('로그인한 사람의 요청은 경로 그대로 Grafana 에 닿고 아이디가 헤더로 실린다', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/grafana/api/health',
      cookies: { platform_session: await 출입증() },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ database: 'ok' });
    expect(받은것?.url).toBe('/grafana/api/health');
    expect(받은것?.headers['x-webauth-user']).toBe('xgfp-member');
  });

  it('요청에 실려 온 이름 헤더·Authorization·플랫폼 쿠키는 지우고 다른 쿠키는 넘긴다', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/grafana/api/health',
      headers: {
        'x-webauth-user': 'admin',
        authorization: 'Basic YWRtaW46YWRtaW4=',
        cookie: `grafana_session=abc; platform_session=${encodeURIComponent(await 출입증())}; theme=dark`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(받은것?.headers['x-webauth-user']).toBe('xgfp-member');
    expect(받은것?.headers.authorization).toBeUndefined();
    expect(받은것?.headers.cookie).not.toContain('platform_session');
    expect(받은것?.headers.cookie).toContain('grafana_session=abc');
    expect(받은것?.headers.cookie).toContain('theme=dark');
  });
});
