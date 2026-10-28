// maxihan 계정(SSO) 로그인 왕복을 문과 함께 실제 DB 로 본다. Auth_platform 쪽(oidc.ts)은 가짜로 끼운다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from './gate.js';
import { 교환, 시작, type 받은사람 } from './oidc.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

vi.mock('./oidc.js', async (원본) => ({
  ...(await 원본<typeof import('./oidc.js')>()),
  시작: vi.fn(),
  교환: vi.fn(),
}));

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xso-new', 'xso-linked', 'xso-taken', 'xso-off', 'xso-wait'];

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
  });

  const 쿠키 = (res: LightMyRequestResponse): Record<string, string> => {
    const 값 = res.cookies.find((c) => c.name === 'platform_session')?.value;
    return 값 === undefined ? {} : { platform_session: 값 };
  };

  /** start 로 왕복 값을 실은 출입증을 받고, 그 출입증으로 돌아온다 */
  async function 왕복(사람: 받은사람 | Error, 시작주소 = '/api/auth/sso/start', 앞쿠키: Record<string, string> = {}) {
    if (사람 instanceof Error) vi.mocked(교환).mockRejectedValueOnce(사람);
    else vi.mocked(교환).mockResolvedValueOnce(사람);
    const start: LightMyRequestResponse = await app.inject({ method: 'GET', url: 시작주소, cookies: 앞쿠키 });
    const back: LightMyRequestResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/sso/callback?code=xso-code&state=xso-state',
      cookies: 쿠키(start),
    });
    return { start, back };
  }

  const 사람 = (sub: string, username: string): 받은사람 => ({ sub, username, displayName: `${username} 이름` });

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

  it('start 는 로그인 카드가 고른 login_hint · prompt=login 만 authorize 에 넘긴다', async () => {
    await app.inject({ method: 'GET', url: '/api/auth/sso/start?login_hint=xso-linked' });
    expect(vi.mocked(시작).mock.lastCall?.[1]).toEqual({ loginHint: 'xso-linked' });
    await app.inject({ method: 'GET', url: '/api/auth/sso/start?prompt=login' });
    expect(vi.mocked(시작).mock.lastCall?.[1]).toEqual({ prompt: 'login' });
    await app.inject({ method: 'GET', url: '/api/auth/sso/start?login_hint=Evil%20One&prompt=none' });
    expect(vi.mocked(시작).mock.lastCall?.[1]).toEqual({});
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
    expect(back.headers.location).toBe('/?sso=ok');
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
    expect(back.headers.location).toBe('/?sso=ok');
    expect((await 행('xso-linked')).auth_sub).toBe('xso-sub-linked');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 쿠키(back) });
    expect(me.json<{ user: { mustChangePassword: boolean } }>().user.mustChangePassword).toBe(false);
    const { pool } = await import('../db/index.js');
    const 저장값 = await pool.query("SELECT must_change_password FROM app_user WHERE username = 'xso-linked'");
    expect(저장값.rows[0]).toEqual({ must_change_password: true });
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

  it('이미 묶인 계정이 나중에 작성 에이전트 이름이 되면 들어오지 못한다', async () => {
    vi.stubEnv('AUTHORING_AGENT_USER', 'xso-taken');
    let back: LightMyRequestResponse;
    try {
      ({ back } = await 왕복(사람('xso-sub-other', 'xso-taken')));
    } finally {
      vi.stubEnv('AUTHORING_AGENT_USER', 'xso-agent');
    }
    expect(back.headers.location).toBe('/?sso=username');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 쿠키(back) });
    expect(me.statusCode).toBe(401);
  });

  it('비활성 계정은 승인 대기와 같은 답이다', async () => {
    const { back } = await 왕복(사람('xso-sub-off', 'xso-off'));
    expect(back.headers.location).toBe('/?sso=pending');
  });

  it('Grafana 에서 왔고 대시보드 칸이 있으면 그 자리로 돌아간다', async () => {
    const { back } = await 왕복(사람('xso-sub-linked', 'xso-linked'), '/api/auth/sso/start?next=%2Fgrafana%2Fd%2Fabc');
    expect(back.headers.location).toBe('/grafana/d/abc');
  });

  it('대시보드 칸이 없으면 Grafana 자리 대신 첫 화면이고, Grafana 밖 주소는 받지 않는다', async () => {
    expect((await 왕복(사람('xso-sub-new', 'xso-new'), '/api/auth/sso/start?next=%2Fgrafana%2F')).back.headers.location).toBe('/?sso=ok');
    expect((await 왕복(사람('xso-sub-linked', 'xso-linked'), '/api/auth/sso/start?next=https%3A%2F%2Fevil.example')).back.headers.location).toBe(
      '/?sso=ok',
    );
  });

  it('Auth_platform 에 닿지 못하면 start 도 다시 누르기 안내로 간다', async () => {
    vi.mocked(시작).mockRejectedValueOnce(new Error('discovery 실패'));
    const start = await app.inject({ method: 'GET', url: '/api/auth/sso/start' });
    expect(start.statusCode).toBe(302);
    expect(start.headers.location).toBe('/?sso=failed');
  });

  it('앞사람 출입증이 있는 브라우저에서 승인 대기로 돌아오면 앞사람 출입증도 지운다', async () => {
    const { back: 앞사람 } = await 왕복(사람('xso-sub-linked', 'xso-linked'));
    const { back } = await 왕복(사람('xso-sub-wait', 'xso-wait'), '/api/auth/sso/start', 쿠키(앞사람));
    expect(back.headers.location).toBe('/?sso=pending');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 쿠키(back) });
    expect(me.statusCode).toBe(401);
  });

  it('교환이 실패하면 다시 시도 안내로 간다', async () => {
    const { back } = await 왕복(new Error('state 불일치'));
    expect(back.headers.location).toBe('/?sso=failed');
  });

  it('들어와 있는 사람이 뒤로 가기로 옛 돌아올 주소를 열어도 출입증이 살아 있고 첫 화면으로 간다', async () => {
    const { back } = await 왕복(사람('xso-sub-linked', 'xso-linked'));
    const 옛것 = await app.inject({ method: 'GET', url: '/api/auth/sso/callback?code=xso-code&state=xso-state', cookies: 쿠키(back) });
    expect(옛것.headers.location).toBe('/');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: { ...쿠키(back), ...쿠키(옛것) } });
    expect(me.statusCode).toBe(200);
  });

  it('왕복 중에 state 가 다른 주소가 오면 교환하지 않고 왕복 값도 남겨 진짜 돌아오기가 들어온다', async () => {
    vi.mocked(교환).mockClear();
    vi.mocked(교환).mockResolvedValueOnce(사람('xso-sub-linked', 'xso-linked'));
    const start = await app.inject({ method: 'GET', url: '/api/auth/sso/start' });
    const 엉뚱 = await app.inject({ method: 'GET', url: '/api/auth/sso/callback?code=x&state=other', cookies: 쿠키(start) });
    expect(엉뚱.headers.location).toBe('/?sso=failed');
    expect(교환).not.toHaveBeenCalled();
    const back = await app.inject({
      method: 'GET',
      url: '/api/auth/sso/callback?code=xso-code&state=xso-state',
      cookies: { ...쿠키(start), ...쿠키(엉뚱) },
    });
    expect(back.headers.location).toBe('/?sso=ok');
  });

  it('start 를 거치지 않고 돌아오면 교환하지 않는다', async () => {
    vi.mocked(교환).mockClear();
    const back = await app.inject({ method: 'GET', url: '/api/auth/sso/callback?code=x&state=y' });
    expect(back.headers.location).toBe('/?sso=failed');
    expect(교환).not.toHaveBeenCalled();
  });

  it('로그아웃은 이 앱 출입증만 지우고 Auth_platform 으로 보낼 주소를 주지 않는다', async () => {
    const { back } = await 왕복(사람('xso-sub-new', 'xso-new'));
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 쿠키(back) });
    expect(out.statusCode).toBe(204);
    expect(out.body).toBe('');
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
