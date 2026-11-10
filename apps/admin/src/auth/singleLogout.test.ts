// 한 곳 로그아웃 = 전체 로그아웃(S24) — 로그아웃이 Auth_platform 로그아웃 주소를 주고, Auth 가 보낸 back-channel 알림으로 출입증이 끊기는지 실제 DB 로 본다.
// 가짜 JWKS 서버를 issuer 로 세우고 진짜 jose 확인을 거친다. 로그인 왕복(oidc.ts 시작 · 교환)과 로그아웃 주소는 가짜다. DATABASE_URL이 있을 때만 돈다

import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWTPayload } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from './gate.js';
import { 교환, 로그아웃주소, 시작 } from './oidc.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

vi.mock('./oidc.js', async (원본) => ({
  ...(await 원본<typeof import('./oidc.js')>()),
  시작: vi.fn(),
  교환: vi.fn(),
  로그아웃주소: vi.fn(),
}));

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xsl-me', 'xsl-fresh'];
const 끊은sid들 = ['xsl-sid-real', 'xsl-sid-gone', 'xsl-sid-live'];
const 로그아웃사건 = 'http://schemas.openid.net/event/backchannel-logout';

describe.skipIf(연결 === undefined)('한 곳 로그아웃 (S24)', () => {
  let app: FastifyInstance;
  let 열쇠서버: Server;
  let issuer = '';
  let 우리열쇠: CryptoKey;
  let 남의열쇠: CryptoKey;

  async function 치우기() {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM auth_revoked_sid WHERE sid = ANY($1)', [끊은sid들]);
    // Scout 대화는 계정과 같이 지워진다. 프로젝트는 애플리케이션이 없어 이름으로 지운다
    await pool.query(`DELETE FROM project WHERE name = 'XSL 프로젝트'`);
  }

  beforeAll(async () => {
    // Auth_platform 의 JWKS 자리(<issuer>/oauth2/jwks)만 흉내 낸다. 남의 열쇠는 묶음에 없다
    const 우리 = await generateKeyPair('RS256');
    우리열쇠 = 우리.privateKey;
    남의열쇠 = (await generateKeyPair('RS256')).privateKey;
    const 묶음 = JSON.stringify({ keys: [{ ...(await exportJWK(우리.publicKey)), kid: 'xsl-kid', alg: 'RS256', use: 'sig' }] });
    열쇠서버 = createServer((req, res) => {
      res.writeHead(req.url === '/oauth2/jwks' ? 200 : 404, { 'content-type': 'application/json' }).end(묶음);
    });
    await new Promise<void>((풀림) => 열쇠서버.listen(0, '127.0.0.1', 풀림));
    issuer = `http://127.0.0.1:${(열쇠서버.address() as AddressInfo).port}`;

    vi.stubEnv('AUTH_ISSUER', issuer);
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 'xsl-secret');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'http://localhost:3000/');
    await 치우기();
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub)
            VALUES ('xsl-me', '끊길 사람', NULL, 'member', 'none', true, false, 'xsl-sub-me'),
                   ('xsl-fresh', '남을 사람', NULL, 'member', 'none', true, false, 'xsl-sub-fresh')`,
    );

    app = Fastify();
    세션등록(app, 'xsl-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
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
      왕복: { state: 'xsl-state', nonce: 'xsl-nonce', verifier: 'xsl-verifier' },
    });
    vi.mocked(로그아웃주소).mockResolvedValue('http://127.0.0.1:9/connect/logout?id_token_hint=xsl');
  });

  const 쿠키 = (res: LightMyRequestResponse): Record<string, string> => {
    const 값 = res.cookies.find((c) => c.name === 'platform_session')?.value;
    return 값 === undefined ? {} : { platform_session: 값 };
  };

  /** 진짜 로그인 왕복으로 구운 출입증 — 돌아오기가 id token · sid · 구운 시각을 싣는지까지 거친다 */
  async function 로그인(sub: string, username: string, sid?: string): Promise<Record<string, string>> {
    vi.mocked(교환).mockResolvedValueOnce({ sub, username, displayName: username, idToken: `id.${sub}`, ...(sid === undefined ? {} : { sid }) });
    const start = await app.inject({ method: 'GET', url: '/api/auth/sso/start' });
    const back = await app.inject({ method: 'GET', url: '/api/auth/sso/callback?code=xsl-code&state=xsl-state', cookies: 쿠키(start) });
    expect(back.headers.location).toBe('/?sso=ok');
    return 쿠키(back);
  }

  /** 로그인 왕복을 거치지 않고 칸을 골라 구운 출입증 — 구운 시각 · Auth 세션을 정해 둬야 하는 검사에 쓴다 */
  const 구운출입증 = (칸: Record<string, string | number>): Record<string, string> => ({
    platform_session: app.encodeSecureSession(app.createSecureSession(칸)),
  });

  const 나 = async (cookies: Record<string, string>) => (await app.inject({ method: 'GET', url: '/api/auth/me', cookies })).statusCode;

  /** Auth_platform 이 보내는 logout_token 모양. 칸 · 머리를 덮어 틀린 token 을 만든다 */
  async function 로그아웃토큰(칸: JWTPayload, 머리: Record<string, string> = {}, 열쇠 = 우리열쇠): Promise<string> {
    const 지금 = Math.floor(Date.now() / 1000);
    return new SignJWT({ iss: issuer, aud: 'test-platform', iat: 지금, exp: 지금 + 120, jti: randomUUID(), events: { [로그아웃사건]: {} }, ...칸 })
      .setProtectedHeader({ alg: 'RS256', typ: 'logout+jwt', kid: 'xsl-kid', ...머리 })
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

  it('로그아웃은 출입증을 지우고 로그인 때 받은 id token 으로 Auth_platform 로그아웃 주소를 준다', async () => {
    const 출입증 = await 로그인('xsl-sub-fresh', 'xsl-fresh');
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 출입증 });
    expect(out.json()).toEqual({ redirect: 'http://127.0.0.1:9/connect/logout?id_token_hint=xsl' });
    expect(vi.mocked(로그아웃주소).mock.lastCall?.[1]).toBe('id.xsl-sub-fresh');
    expect(await 나(쿠키(out))).toBe(401);
  });

  it('id token 이 없는 옛 출입증이나 discovery 를 못 하면 출입증만 지우고 204 다', async () => {
    const 옛것 = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 구운출입증({ username: 'xsl-fresh', method: 'sso' }) });
    expect(옛것.statusCode).toBe(204);
    expect(await 나(쿠키(옛것))).toBe(401);

    vi.mocked(로그아웃주소).mockRejectedValueOnce(new Error('discovery 실패'));
    const 못닿음 = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: await 로그인('xsl-sub-fresh', 'xsl-fresh') });
    expect(못닿음.statusCode).toBe(204);
    expect(await 나(쿠키(못닿음))).toBe(401);
  });

  it('back-channel — 로그인 때 받은 sid 의 Auth 세션이 끝났다고 오면 그 출입증만 끊는다', async () => {
    const 끊길것 = await 로그인('xsl-sub-me', 'xsl-me', 'xsl-sid-real');
    const 남을것 = await 로그인('xsl-sub-me', 'xsl-me', 'xsl-sid-live');
    expect(await 나(끊길것)).toBe(200);

    const 답 = await 토큰알리기(await 로그아웃토큰({ sub: 'xsl-sub-me', sid: 'xsl-sid-real' }));
    expect(답.statusCode).toBe(200);
    expect(답.headers['cache-control']).toBe('no-store');
    expect(await 나(끊길것)).toBe(401);
    expect(await 나(남을것)).toBe(200);
  });

  it('back-channel — sid 없이 sub 만 오면 그 사람이 iat + 1초 전에 구운 출입증을 다 끊고, 늦게 온 옛 알림은 시각을 되돌리지 않는다', async () => {
    const iat = Math.floor(Date.now() / 1000) - 20;
    const 출입증 = (초: number) => 구운출입증({ username: 'xsl-me', method: 'sso', idToken: 'id.x', authSid: 'xsl-sid-live', loginAt: 초 * 1000 });
    expect(await 나(출입증(iat - 5))).toBe(200);

    expect((await 토큰알리기(await 로그아웃토큰({ sub: 'xsl-sub-me', iat }))).statusCode).toBe(200);
    expect(await 나(출입증(iat - 5))).toBe(401);
    expect(await 나(출입증(iat + 0.5))).toBe(401);
    expect(await 나(출입증(iat + 1))).toBe(200);
    expect(await 나(출입증(iat + 5))).toBe(200);

    expect((await 토큰알리기(await 로그아웃토큰({ sub: 'xsl-sub-me', iat: iat - 10 }))).statusCode).toBe(200);
    expect(await 나(출입증(iat - 5))).toBe(401);
    expect(await 나(출입증(iat + 5))).toBe(200);

    expect((await 토큰알리기(await 로그아웃토큰({ sub: 'xsl-sub-nobody' }))).statusCode).toBe(200);
  });

  it('back-channel — 서명 · 머리 · 칸이 틀린 token 은 400 이고 아무것도 끊지 않는다', async () => {
    const 살아있음 = 구운출입증({ username: 'xsl-fresh', method: 'sso', idToken: 'id.x', authSid: 'xsl-sid-gone', loginAt: Date.now() });
    const 지금 = Math.floor(Date.now() / 1000);
    const 틀린것들 = [
      await 로그아웃토큰({ sid: 'xsl-sid-gone' }, {}, 남의열쇠),
      await 로그아웃토큰({ sid: 'xsl-sid-gone' }, { kid: 'xsl-other-kid' }, 남의열쇠),
      await 로그아웃토큰({ sid: 'xsl-sid-gone' }, { typ: 'JWT' }),
      await 로그아웃토큰({ sid: 'xsl-sid-gone', aud: 'bts' }),
      await 로그아웃토큰({ sid: 'xsl-sid-gone', iss: 'http://127.0.0.1:9' }),
      await 로그아웃토큰({ sid: 'xsl-sid-gone', iat: 지금 - 600, exp: 지금 - 480 }),
      await 로그아웃토큰({ sid: 'xsl-sid-gone', iat: 지금 - 600, exp: 지금 + 60 }),
      await 로그아웃토큰({ sid: 'xsl-sid-gone', events: { 'http://example.com/other': {} } }),
      await 로그아웃토큰({ sid: 'xsl-sid-gone', nonce: 'xsl-nonce' }),
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
    const 출입증 = (loginAt: number) => 구운출입증({ username: 'xsl-fresh', method: 'sso', idToken: 'id.x', authSid: 'xsl-sid-live', loginAt });
    expect(await 나(출입증(어제))).toBe(401);
    expect(await 나(출입증(어제 + 60 * 1000))).toBe(200);
  });

  it('SSO 로그인은 Scout 대화 키를 굽고, back-channel 은 끊는 출입증의 대화를 지운다 — sid 는 그 줄, sid 없으면 끊긴 시각 전에 만든 것', async () => {
    const 출입증 = await 로그인('xsl-sub-me', 'xsl-me', 'xsl-sid-real');
    expect(app.decodeSecureSession(출입증.platform_session ?? '')?.get('chatKey')).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const { pool } = await import('../db/index.js');
    const 프로젝트 = (await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XSL 프로젝트') RETURNING id`)).rows[0]!.id;
    const iat = Math.floor(Date.now() / 1000) - 20;
    const 대화 = (키: string, sid: string | null, 만든초: number) =>
      pool.query('INSERT INTO chat_conversation (session_key, project_id, username, auth_sid, created_at) VALUES ($1, $2, $3, $4, to_timestamp($5))', [키, 프로젝트, 'xsl-me', sid, 만든초]);
    await 대화('xsl-k-real', 'xsl-sid-real', iat + 100);
    await 대화('xsl-k-live', 'xsl-sid-live', iat + 100);
    await 대화('xsl-k-old', null, iat - 5);
    await 대화('xsl-k-new', null, iat + 5);
    const 남은키 = async () => (await pool.query<{ session_key: string }>('SELECT session_key FROM chat_conversation WHERE project_id = $1 ORDER BY session_key', [프로젝트])).rows.map((r) => r.session_key);

    await 토큰알리기(await 로그아웃토큰({ sub: 'xsl-sub-me', sid: 'xsl-sid-real' }));
    expect(await 남은키()).toEqual(['xsl-k-live', 'xsl-k-new', 'xsl-k-old']);
    await 토큰알리기(await 로그아웃토큰({ sub: 'xsl-sub-me', iat }));
    expect(await 남은키()).toEqual(['xsl-k-live', 'xsl-k-new']);
  });
});
