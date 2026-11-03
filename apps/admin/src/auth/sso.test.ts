// maxihan 계정(SSO) 로그인 왕복을 문과 함께 실제 DB 로 본다. Auth_platform 쪽(oidc.ts)은 가짜로 끼운다. DATABASE_URL이 있을 때만 돈다
// back-channel 로그아웃은 가짜 JWKS 서버를 issuer 로 세우고 진짜 jose 확인을 거친다

import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWTPayload } from 'jose';
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
const 계정들 = ['xso-new', 'xso-linked', 'xso-taken', 'xso-off', 'xso-wait'];
const 끊은sid들 = ['xso-sid-real', 'xso-sid-gone', 'xso-sid-live'];
const 로그아웃사건 = 'http://schemas.openid.net/event/backchannel-logout';

describe.skipIf(연결 === undefined)('maxihan 계정(SSO) 로그인', () => {
  let app: FastifyInstance;
  let 열쇠서버: Server;
  let issuer = '';
  let 우리열쇠: CryptoKey;
  let 남의열쇠: CryptoKey;

  async function 치우기() {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM auth_revoked_sid WHERE sid = ANY($1)', [끊은sid들]);
  }

  beforeAll(async () => {
    // Auth_platform 의 JWKS 자리(<issuer>/oauth2/jwks)만 흉내 낸다. 남의 열쇠는 묶음에 없다
    const 우리 = await generateKeyPair('RS256');
    우리열쇠 = 우리.privateKey;
    남의열쇠 = (await generateKeyPair('RS256')).privateKey;
    const 묶음 = JSON.stringify({ keys: [{ ...(await exportJWK(우리.publicKey)), kid: 'xso-kid', alg: 'RS256', use: 'sig' }] });
    열쇠서버 = createServer((req, res) => {
      res.writeHead(req.url === '/oauth2/jwks' ? 200 : 404, { 'content-type': 'application/json' }).end(묶음);
    });
    await new Promise<void>((풀림) => 열쇠서버.listen(0, '127.0.0.1', 풀림));
    issuer = `http://127.0.0.1:${(열쇠서버.address() as AddressInfo).port}`;

    vi.stubEnv('AUTH_ISSUER', issuer);
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
    await new Promise((풀림) => 열쇠서버.close(풀림));
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

  const 사람 = (sub: string, username: string, sid?: string): 받은사람 => ({
    sub,
    username,
    displayName: `${username} 이름`,
    idToken: `id.${sub}`,
    ...(sid === undefined ? {} : { sid }),
  });

  /** 로그인 왕복을 거치지 않고 칸을 골라 구운 출입증 — 구운 시각 · Auth 세션을 정해 둬야 하는 검사에 쓴다 */
  const 구운출입증 = (칸: Record<string, string | number>): Record<string, string> => ({
    platform_session: app.encodeSecureSession(app.createSecureSession(칸)),
  });

  const 나 = async (cookies: Record<string, string>) => (await app.inject({ method: 'GET', url: '/api/auth/me', cookies })).statusCode;

  /** Auth_platform 이 보내는 logout_token 모양. 칸 · 머리를 덮어 틀린 token 을 만든다 */
  async function 로그아웃토큰(칸: JWTPayload, 머리: Record<string, string> = {}, 열쇠 = 우리열쇠): Promise<string> {
    const 지금 = Math.floor(Date.now() / 1000);
    return new SignJWT({ iss: issuer, aud: 'test-platform', iat: 지금, exp: 지금 + 120, jti: randomUUID(), events: { [로그아웃사건]: {} }, ...칸 })
      .setProtectedHeader({ alg: 'RS256', typ: 'logout+jwt', kid: 'xso-kid', ...머리 })
      .sign(열쇠);
  }

  const 알리기 = (payload: string) =>
    app.inject({
      method: 'POST',
      url: '/api/auth/backchannel-logout',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload,
    });
  const 토큰알리기 = (token: string) => 알리기(new URLSearchParams({ logout_token: token }).toString());

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

  it('로그아웃은 출입증을 지우고 로그인 때 받은 id token 으로 Auth_platform 로그아웃 주소를 준다', async () => {
    const { back } = await 왕복(사람('xso-sub-new', 'xso-new'));
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 쿠키(back) });
    expect(out.json()).toEqual({ redirect: 'http://127.0.0.1:9/connect/logout?id_token_hint=xso' });
    expect(vi.mocked(로그아웃주소).mock.lastCall?.[1]).toBe('id.xso-sub-new');
    expect(await 나(쿠키(out))).toBe(401);
  });

  it('id token 이 없는 옛 출입증이나 Auth_platform 에 닿지 못하면 출입증만 지우고 204 다', async () => {
    const 옛것 = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 구운출입증({ username: 'xso-new', method: 'sso' }) });
    expect(옛것.statusCode).toBe(204);
    expect(await 나(쿠키(옛것))).toBe(401);

    vi.mocked(로그아웃주소).mockRejectedValueOnce(new Error('discovery 실패'));
    const { back } = await 왕복(사람('xso-sub-new', 'xso-new'));
    const 못닿음 = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 쿠키(back) });
    expect(못닿음.statusCode).toBe(204);
    expect(await 나(쿠키(못닿음))).toBe(401);
  });

  it('back-channel — 로그인 때 받은 sid 의 Auth 세션이 끝났다고 오면 그 출입증만 끊는다', async () => {
    const { back: 끊길것 } = await 왕복(사람('xso-sub-linked', 'xso-linked', 'xso-sid-real'));
    const { back: 남을것 } = await 왕복(사람('xso-sub-linked', 'xso-linked', 'xso-sid-live'));
    expect(await 나(쿠키(끊길것))).toBe(200);

    const 답 = await 토큰알리기(await 로그아웃토큰({ sub: 'xso-sub-linked', sid: 'xso-sid-real' }));
    expect(답.statusCode).toBe(200);
    expect(답.headers['cache-control']).toBe('no-store');
    expect(await 나(쿠키(끊길것))).toBe(401);
    expect(await 나(쿠키(남을것))).toBe(200);
  });

  it('back-channel — sid 없이 sub 만 오면 그 사람이 iat 전에 구운 출입증을 다 끊고, 늦게 온 옛 알림은 시각을 되돌리지 않는다', async () => {
    const iat = Math.floor(Date.now() / 1000) - 20;
    const 출입증 = (초: number) => 구운출입증({ username: 'xso-linked', method: 'sso', idToken: 'id.x', authSid: 'xso-sid-live', loginAt: 초 * 1000 });
    expect(await 나(출입증(iat - 5))).toBe(200);

    expect((await 토큰알리기(await 로그아웃토큰({ sub: 'xso-sub-linked', iat }))).statusCode).toBe(200);
    expect(await 나(출입증(iat - 5))).toBe(401);
    expect(await 나(출입증(iat + 5))).toBe(200);

    expect((await 토큰알리기(await 로그아웃토큰({ sub: 'xso-sub-linked', iat: iat - 10 }))).statusCode).toBe(200);
    expect(await 나(출입증(iat - 5))).toBe(401);
    expect(await 나(출입증(iat + 5))).toBe(200);

    expect((await 토큰알리기(await 로그아웃토큰({ sub: 'xso-sub-nobody' }))).statusCode).toBe(200);
  });

  it('back-channel — 서명 · 머리 · 칸이 틀린 token 은 400 이고 아무것도 끊지 않는다', async () => {
    const 살아있음 = 구운출입증({ username: 'xso-linked', method: 'sso', idToken: 'id.x', authSid: 'xso-sid-gone', loginAt: Date.now() });
    const 지금 = Math.floor(Date.now() / 1000);
    const 틀린것들 = [
      await 로그아웃토큰({ sid: 'xso-sid-gone' }, {}, 남의열쇠),
      await 로그아웃토큰({ sid: 'xso-sid-gone' }, { kid: 'xso-other-kid' }, 남의열쇠),
      await 로그아웃토큰({ sid: 'xso-sid-gone' }, { typ: 'JWT' }),
      await 로그아웃토큰({ sid: 'xso-sid-gone', aud: 'bts' }),
      await 로그아웃토큰({ sid: 'xso-sid-gone', iss: 'http://127.0.0.1:9' }),
      await 로그아웃토큰({ sid: 'xso-sid-gone', iat: 지금 - 600, exp: 지금 - 480 }),
      await 로그아웃토큰({ sid: 'xso-sid-gone', iat: 지금 - 600, exp: 지금 + 60 }),
      await 로그아웃토큰({ sid: 'xso-sid-gone', events: { 'http://example.com/other': {} } }),
      await 로그아웃토큰({ sid: 'xso-sid-gone', nonce: 'xso-nonce' }),
      await 로그아웃토큰({}),
    ];
    for (const [번호, token] of 틀린것들.entries()) {
      const 답 = await 토큰알리기(token);
      expect(답.statusCode, `${번호}번 token`).toBe(400);
      expect(답.json()).toEqual({ error: 'INVALID_LOGOUT_TOKEN' });
      expect(답.headers['cache-control']).toBe('no-store');
    }
    expect((await 알리기('')).statusCode).toBe(400);
    expect(await 나(살아있음)).toBe(200);
  });

  it('구운 지 24시간이 지난 SSO 출입증은 칸을 다시 고쳐 수명이 늘었어도 끊긴다', async () => {
    const 어제 = Date.now() - 24 * 60 * 60 * 1000 - 1000;
    const 출입증 = (loginAt: number) => 구운출입증({ username: 'xso-new', method: 'sso', idToken: 'id.x', authSid: 'xso-sid-live', loginAt });
    expect(await 나(출입증(어제))).toBe(401);
    expect(await 나(출입증(어제 + 60 * 1000))).toBe(200);
  });

  it('비밀번호 길(로그인 · 가입 · 비밀번호 바꾸기)은 404 이고 methods 는 sso 를 알린다', async () => {
    for (const url of ['/api/auth/login', '/api/auth/signup', '/api/auth/password']) {
      expect((await app.inject({ method: 'POST', url, payload: {} })).statusCode).toBe(404);
    }
    expect((await app.inject({ method: 'GET', url: '/api/auth/methods' })).json()).toEqual({ sso: true });
  });
});
