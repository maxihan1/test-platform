// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from './gate.js';
import { 해시 } from './password.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xfu3-검사용-세션-열쇠-32글자를-넘긴다';

describe.skipIf(연결 === undefined)('인증 미들웨어', () => {
  let app: FastifyInstance;
  const 서비스id: Record<string, number> = {};

  async function 서비스넣기(prefix: string, name: string) {
    const { pool } = await import('../db/index.js');
    const rows = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#223344', 'https://example.com/x', 'x')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [prefix, name],
    );
    서비스id[prefix] = rows.rows[0]!.id;
  }

  async function 계정넣기(username: string, role: string, 서비스들: string[]) {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, $1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET is_active = true, role = EXCLUDED.role,
                                            password_hash = EXCLUDED.password_hash`,
      [username, await 해시('열려라참깨'), role],
    );
    for (const prefix of 서비스들) {
      await pool.query(
        `INSERT INTO user_service (username, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [username, 서비스id[prefix]],
      );
    }
  }

  async function 출입증(username: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: '열려라참깨' },
    });
    return res.cookies[0]!.value;
  }

  beforeAll(async () => {
    await 서비스넣기('XFS3A', '문 검사용 가');
    await 서비스넣기('XFS3B', '문 검사용 나');
    await 계정넣기('xfu3-viewer', 'viewer', ['XFS3A']);
    await 계정넣기('xfu3-operator', 'operator', ['XFS3A']);
    await 계정넣기('xfu3-admin', 'admin', ['XFS3A']);

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });

    // 문만 검사한다. 뒤에 붙는 실제 갈래 대신 통과 여부만 말하는 자리를 둔다
    await app.register(
      async (scope) => {
        scope.get('/catalog/cases', async (req) => ({ 지나감: true, 누구: req.user?.username }));
        scope.post('/catalog/scan', async () => ({ 지나감: true }));
        scope.post('/runs', async () => ({ 지나감: true }));
        scope.get('/settings/services', async () => ({ 지나감: true }));
        scope.post('/settings/services', async () => ({ 지나감: true }));
      },
      { prefix: '/api' },
    );

    app.get('/health', async () => ({ ok: true }));
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu3%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu3%'`);
    await pool.query(`DELETE FROM service WHERE prefix LIKE 'XFS3%'`);
    await app.close();
  });

  it('로그인하지 않으면 모든 /api 가 401이다', async () => {
    for (const [method, url] of [
      ['GET', '/api/catalog/cases?service=XFS3A'],
      ['POST', '/api/runs'],
      ['GET', '/api/settings/services'],
      ['GET', '/api/auth/me'],
    ] as const) {
      const res = await app.inject({ method, url });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('로그인 자체와 /health 는 문을 지나지 않는다', async () => {
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    const 로그인 = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'xfu3-viewer', password: '열려라참깨' },
    });
    expect(로그인.statusCode).toBe(200);
  });

  it('보기만 등급은 읽되 바꾸지 못한다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-viewer') };

    const 읽기 = await app.inject({ method: 'GET', url: '/api/catalog/cases?service=XFS3A', cookies: 쿠키 });
    expect(읽기.statusCode).toBe(200);
    expect(읽기.json<{ 누구: string }>().누구).toBe('xfu3-viewer');

    const 실행 = await app.inject({ method: 'POST', url: '/api/runs', cookies: 쿠키, payload: {} });
    expect(실행.statusCode).toBe(403);
    expect(실행.json()).toEqual({ error: 'FORBIDDEN', need: 'operator' });
  });

  it('보기만 등급도 로그아웃은 된다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      cookies: { platform_session: await 출입증('xfu3-viewer') },
    });
    expect(res.statusCode).toBe(204);
  });

  it('실행까지 등급은 실행하되 설정은 못 연다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };

    const 스캔 = await app.inject({ method: 'POST', url: '/api/catalog/scan', cookies: 쿠키 });
    expect(스캔.statusCode).toBe(200);

    const 설정읽기 = await app.inject({ method: 'GET', url: '/api/settings/services', cookies: 쿠키 });
    expect(설정읽기.statusCode).toBe(403);
    expect(설정읽기.json()).toEqual({ error: 'FORBIDDEN', need: 'admin' });
  });

  it('운영 등급은 설정을 연다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-admin') };
    expect((await app.inject({ method: 'GET', url: '/api/settings/services', cookies: 쿠키 })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/settings/services', cookies: 쿠키 })).statusCode).toBe(200);
  });

  it('배정받지 않은 서비스는 403이고 404로 감추지 않는다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };
    const res = await app.inject({ method: 'GET', url: '/api/catalog/cases?service=XFS3B', cookies: 쿠키 });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XFS3B' });
  });

  it('실행 요청의 서비스는 tcId 접두사에서 알아낸다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-operator') };

    const 내것 = await app.inject({
      method: 'POST',
      url: '/api/runs',
      cookies: 쿠키,
      payload: { items: [{ tcId: 'XFS3A-001' }, { tcId: 'XFS3A-002' }] },
    });
    expect(내것.statusCode).toBe(200);

    const 남의것 = await app.inject({
      method: 'POST',
      url: '/api/runs',
      cookies: 쿠키,
      payload: { items: [{ tcId: 'XFS3A-001' }, { tcId: 'XFS3B-001' }] },
    });
    expect(남의것.statusCode).toBe(403);
    expect(남의것.json()).toEqual({ error: 'SERVICE_FORBIDDEN', detail: 'XFS3B' });
  });

  it('운영 등급이어도 배정받지 않은 서비스는 열리지 않는다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-admin') };
    const res = await app.inject({ method: 'GET', url: '/api/catalog/cases?service=XFS3B', cookies: 쿠키 });
    expect(res.statusCode).toBe(403);
  });

  it('설정 자리는 서비스에 매이지 않는다', async () => {
    const 쿠키 = { platform_session: await 출입증('xfu3-admin') };
    const res = await app.inject({
      method: 'GET',
      url: '/api/settings/services?service=XFS3B',
      cookies: 쿠키,
    });
    expect(res.statusCode).toBe(200);
  });
});
