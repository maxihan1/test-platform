// 본인 디바이스 팜 토큰 통로를 문 · 세션 · 실제 DB 와 같이 본다. Auth_platform whoami 는 로컬 가짜 서버다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from './gate.js';
import { 교환, 시작 } from './oidc.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

vi.mock('./oidc.js', async (원본) => ({
  ...(await 원본<typeof import('./oidc.js')>()),
  시작: vi.fn(),
  교환: vi.fn(),
}));

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xft-me'];

describe.skipIf(연결 === undefined)('디바이스 팜 토큰 통로', () => {
  let app: FastifyInstance;
  let 가짜인증: FastifyInstance;
  let 쿠키: Record<string, string> = {};

  async function 치우기() {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
  }

  async function 저장된값(): Promise<string | null> {
    const { pool } = await import('../db/index.js');
    const { rows } = await pool.query<{ farm_token: string | null }>('SELECT farm_token FROM app_user WHERE username = $1', ['xft-me']);
    return rows[0]?.farm_token ?? null;
  }

  beforeAll(async () => {
    가짜인증 = Fastify();
    가짜인증.get('/api/v1/users/me/whoami', async (req, reply) => {
      const 머리 = req.headers.authorization;
      if (머리 === 'Bearer pat_mine1234') return { userId: 'xft-sub-me', username: 'xft-me', authMethod: 'pat' };
      if (머리 === 'Bearer pat_other5678') return { userId: 'xft-sub-other', username: 'xft-other', authMethod: 'pat' };
      if (머리 === 'Bearer pat_down0000') return reply.code(500).send({ error: 'boom' });
      return reply.code(401).send({ error: 'invalid_token' });
    });
    await 가짜인증.listen({ port: 0, host: '127.0.0.1' });
    const 주소 = 가짜인증.server.address();
    vi.stubEnv('AUTH_ISSUER', `http://127.0.0.1:${typeof 주소 === 'object' && 주소 !== null ? 주소.port : 0}/`);
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 'xft-secret');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'http://localhost:3000/');

    await 치우기();
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub, is_active)
            VALUES ('xft-me', '팜 토큰 사람', NULL, 'member', 'none', true, false, 'xft-sub-me', true)`,
    );

    app = Fastify();
    세션등록(app, 'xft-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.ready();

    vi.mocked(시작).mockResolvedValue({
      url: 'http://127.0.0.1:9/oauth2/authorize?client_id=test-platform',
      왕복: { state: 'xft-state', nonce: 'xft-nonce', verifier: 'xft-verifier' },
    });
    vi.mocked(교환).mockResolvedValue({ sub: 'xft-sub-me', username: 'xft-me', displayName: '팜 토큰 사람' });
    const 굽기 = (res: LightMyRequestResponse): Record<string, string> => {
      const 값 = res.cookies.find((c) => c.name === 'platform_session')?.value;
      return 값 === undefined ? {} : { platform_session: 값 };
    };
    const start = await app.inject({ method: 'GET', url: '/api/auth/sso/start' });
    const back = await app.inject({ method: 'GET', url: '/api/auth/sso/callback?code=xft-code&state=xft-state', cookies: 굽기(start) });
    expect(back.headers.location).toBe('/?sso=ok');
    쿠키 = 굽기(back);
  });

  afterAll(async () => {
    await 치우기();
    await app.close();
    await 가짜인증.close();
    vi.unstubAllEnvs();
  });

  const 넣기 = (token: unknown) => app.inject({ method: 'PUT', url: '/api/auth/farm-token', cookies: 쿠키, payload: { token } });

  it('로그인하지 않으면 셋 다 401 이다', async () => {
    for (const method of ['GET', 'PUT', 'DELETE'] as const) {
      const res = await app.inject({ method, url: '/api/auth/farm-token', ...(method === 'PUT' ? { payload: { token: 'pat_mine1234' } } : {}) });
      expect(res.statusCode).toBe(401);
    }
  });

  it('pat_ 로 시작하지 않거나 공백이 섞이면 Auth_platform 에 묻기 전에 FARM_TOKEN_SHAPE 다', async () => {
    for (const 값 of ['tpa_abc', 'pat_a b', 123, 'pat_' + 'x'.repeat(200)]) {
      const res = await 넣기(값);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'FARM_TOKEN_SHAPE' });
    }
    expect(await 저장된값()).toBeNull();
  });

  it('Auth_platform 이 401 이면 FARM_TOKEN_INVALID · 남의 토큰이면 FARM_TOKEN_NOT_YOURS · 고장이면 502 이고 저장하지 않는다', async () => {
    expect((await 넣기('pat_wrong999')).json()).toEqual({ error: 'FARM_TOKEN_INVALID' });
    const 남의것 = await 넣기('pat_other5678');
    expect(남의것.statusCode).toBe(400);
    expect(남의것.json()).toEqual({ error: 'FARM_TOKEN_NOT_YOURS' });
    const 고장 = await 넣기('pat_down0000');
    expect(고장.statusCode).toBe(502);
    expect(고장.json()).toEqual({ error: 'AUTH_UNREACHABLE' });
    expect(await 저장된값()).toBeNull();
  });

  it('본인 토큰이면 원문을 두고 응답 · 보기에는 끝 4자만 준다. 지우면 다시 없음이다', async () => {
    const 처음 = await app.inject({ method: 'GET', url: '/api/auth/farm-token', cookies: 쿠키 });
    expect(처음.json()).toEqual({ farmToken: null });

    const 저장 = await 넣기('  pat_mine1234 ');
    expect(저장.statusCode).toBe(200);
    expect(저장.json()).toEqual({ farmToken: { last4: '1234' } });
    expect(저장.body).not.toContain('pat_mine');
    expect(await 저장된값()).toBe('pat_mine1234');

    const 보기 = await app.inject({ method: 'GET', url: '/api/auth/farm-token', cookies: 쿠키 });
    expect(보기.json()).toEqual({ farmToken: { last4: '1234' } });

    const 지우기 = await app.inject({ method: 'DELETE', url: '/api/auth/farm-token', cookies: 쿠키 });
    expect(지우기.statusCode).toBe(204);
    expect(await 저장된값()).toBeNull();
  });
});
