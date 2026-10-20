// maxihan 계정(SSO) 로그인 왕복을 문과 함께 실제 DB 로 본다. Auth_platform 쪽(oidc.ts)은 가짜로 끼운다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from './gate.js';
import { 교환, 로그아웃주소, 시작, type 받은사람 } from './oidc.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

vi.mock('./oidc.js', async (원본) => ({
  ...(await 원본<typeof import('./oidc.js')>()),
  시작: vi.fn(),
  교환: vi.fn(),
  로그아웃주소: vi.fn(),
}));

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xso-new', 'xso-linked', 'xso-taken', 'xso-off'];

describe.skipIf(연결 === undefined)('maxihan 계정(SSO) 로그인', () => {
  let app: FastifyInstance;

  async function 치우기() {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
  }

  beforeAll(async () => {
    vi.stubEnv('AUTH_ISSUER', 'http://127.0.0.1:9');
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 'xso-secret');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'http://localhost:3000/');
    await 치우기();
    const { pool } = await import('../db/index.js');
    // 설정 화면에서 미리 만든 계정 · 다른 sub 가 이미 가진 계정 · 비활성 계정
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub, is_active)
            VALUES ('xso-linked', '미리 만든 사람', 'scrypt$00$00', 'member', 'read', true, true, NULL, true),
                   ('xso-taken', '먼저 묶인 사람', NULL, 'member', 'none', true, false, 'xso-sub-other', true),
                   ('xso-off', '꺼진 사람', NULL, 'member', 'none', true, false, 'xso-sub-off', false)`,
    );

    app = Fastify();
    세션등록(app, 'xso-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await 치우기();
    await app.close();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.mocked(시작).mockResolvedValue({
      url: 'http://127.0.0.1:9/oauth2/authorize?client_id=test-platform',
      왕복: { state: 'xso-state', nonce: 'xso-nonce', verifier: 'xso-verifier' },
    });
    vi.mocked(로그아웃주소).mockResolvedValue('http://127.0.0.1:9/connect/logout?id_token_hint=xso');
  });

  const 쿠키 = (res: LightMyRequestResponse): Record<string, string> => {
    const 값 = res.cookies.find((c) => c.name === 'platform_session')?.value;
    return 값 === undefined ? {} : { platform_session: 값 };
  };

  /** start 로 왕복 값을 실은 출입증을 받고, 그 출입증으로 돌아온다 */
  async function 왕복(사람: 받은사람 | Error) {
    if (사람 instanceof Error) vi.mocked(교환).mockRejectedValueOnce(사람);
    else vi.mocked(교환).mockResolvedValueOnce(사람);
    const start: LightMyRequestResponse = await app.inject({ method: 'GET', url: '/api/auth/sso/start' });
    const back: LightMyRequestResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/sso/callback?code=xso-code&state=xso-state',
      cookies: 쿠키(start),
    });
    return { start, back };
  }

  const 사람 = (sub: string, username: string): 받은사람 => ({ sub, username, displayName: `${username} 이름`, idToken: `id.${sub}` });

  async function 행(username: string) {
    const { pool } = await import('../db/index.js');
    const rows = await pool.query('SELECT role, perm_dashboard, is_approved, password_hash, auth_sub FROM app_user WHERE username = $1', [
      username,
    ]);
    return rows.rows[0];
  }

  it('start 는 Auth_platform authorize 로 보낸다', async () => {
    const { start } = await 왕복(사람('xso-sub-new', 'xso-new'));
    expect(start.statusCode).toBe(302);
    expect(start.headers.location).toBe('http://127.0.0.1:9/oauth2/authorize?client_id=test-platform');
  });

  it('처음 온 사람은 승인 대기 member 가 되고 출입증 없이 대기 안내로 간다', async () => {
    const { back } = await 왕복(사람('xso-sub-new', 'xso-new'));
    expect(back.headers.location).toBe('/?sso=pending');
    expect(await 행('xso-new')).toEqual({
      role: 'member',
      perm_dashboard: 'none',
      is_approved: false,
      password_hash: null,
      auth_sub: 'xso-sub-new',
    });
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 쿠키(back) });
    expect(me.statusCode).toBe(401);
  });

  it('돌아온 주소 · 왕복 값을 그대로 교환에 넘긴다', async () => {
    await 왕복(사람('xso-sub-new', 'xso-new'));
    const [, 주소, 값] = vi.mocked(교환).mock.lastCall!;
    expect(주소.href).toBe('http://localhost:3000/api/auth/sso/callback?code=xso-code&state=xso-state');
    expect(값).toEqual({ state: 'xso-state', nonce: 'xso-nonce', verifier: 'xso-verifier' });
  });

  it('운영자가 수락하면 다음 로그인에서 들어온다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query("UPDATE app_user SET is_approved = true WHERE username = 'xso-new'");
    const { back } = await 왕복(사람('xso-sub-new', 'xso-new'));
    expect(back.headers.location).toBe('/');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 쿠키(back) });
    expect(me.statusCode).toBe(200);
    expect(me.json<{ user: { username: string } }>().user.username).toBe('xso-new');
  });

  it('username 이 바뀌어도 sub 로 같은 계정을 찾는다', async () => {
    const { back } = await 왕복(사람('xso-sub-new', 'xso-renamed'));
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 쿠키(back) });
    expect(me.json<{ user: { username: string } }>().user.username).toBe('xso-new');
    expect(await 행('xso-renamed')).toBeUndefined();
  });

  it('아직 안 묶인 같은 username 계정에 한 번 묶고 비밀번호 변경 강제와 상관없이 들어온다', async () => {
    const { back } = await 왕복(사람('xso-sub-linked', 'xso-linked'));
    expect(back.headers.location).toBe('/');
    expect((await 행('xso-linked')).auth_sub).toBe('xso-sub-linked');
  });

  it('다른 sub 가 가진 username 은 묶지 않고 아이디 안내로 간다', async () => {
    const { back } = await 왕복(사람('xso-sub-intruder', 'xso-taken'));
    expect(back.headers.location).toBe('/?sso=username');
    expect((await 행('xso-taken')).auth_sub).toBe('xso-sub-other');
  });

  it('작성 에이전트 이름은 묶지 않는다', async () => {
    vi.stubEnv('AUTHORING_AGENT_USER', 'xso-agent');
    const { back } = await 왕복(사람('xso-sub-agent', 'xso-agent'));
    expect(back.headers.location).toBe('/?sso=username');
    expect(await 행('xso-agent')).toBeUndefined();
  });

  it('비활성 계정은 승인 대기와 같은 답이다', async () => {
    const { back } = await 왕복(사람('xso-sub-off', 'xso-off'));
    expect(back.headers.location).toBe('/?sso=pending');
  });

  it('교환이 실패하면 다시 시도 안내로 간다', async () => {
    const { back } = await 왕복(new Error('state 불일치'));
    expect(back.headers.location).toBe('/?sso=failed');
  });

  it('start 를 거치지 않고 돌아오면 교환하지 않는다', async () => {
    vi.mocked(교환).mockClear();
    const back = await app.inject({ method: 'GET', url: '/api/auth/sso/callback?code=x&state=y' });
    expect(back.headers.location).toBe('/?sso=failed');
    expect(교환).not.toHaveBeenCalled();
  });

  it('로그아웃은 출입증을 지우고 Auth_platform 로그아웃 주소를 준다', async () => {
    const { back } = await 왕복(사람('xso-sub-new', 'xso-new'));
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 쿠키(back) });
    expect(out.json()).toEqual({ redirect: 'http://127.0.0.1:9/connect/logout?id_token_hint=xso' });
    expect(vi.mocked(로그아웃주소).mock.lastCall?.[1]).toBe('id.xso-sub-new');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 쿠키(out) });
    expect(me.statusCode).toBe(401);
  });

  it('비밀번호 길(로그인 · 가입 · 비밀번호 바꾸기)은 404 이고 methods 는 sso 를 알린다', async () => {
    for (const url of ['/api/auth/login', '/api/auth/signup', '/api/auth/password']) {
      expect((await app.inject({ method: 'POST', url, payload: {} })).statusCode).toBe(404);
    }
    expect((await app.inject({ method: 'GET', url: '/api/auth/methods' })).json()).toEqual({ sso: true });
  });
});
