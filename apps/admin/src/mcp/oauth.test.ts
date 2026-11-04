// /mcp 브라우저 로그인 — 401 머리 · 자원 정보(RFC 9728) · access token(JWT) 확인을 실제 DB 계정과 가짜 Auth 열쇠로 본다 (도메인/BTS §7 「MCP」 · S28). DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 세션등록 } from '../auth/session.js';
import { 가짜Auth띄우기, 검사자원, type 가짜Auth } from './authFixture.js';
import mcpRoutes from './server.js';

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xmo-me', 'xmo-off', 'xmo-agent'];
const 자원정보 = 'resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/mcp", scope="commander"';

describe.skipIf(연결 === undefined)('MCP 브라우저 로그인', () => {
  let app: FastifyInstance;
  let auth: 가짜Auth;
  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  const 부르기 = async (열쇠: string | null, 방식 = 'Bearer') =>
    app.inject({
      method: 'POST',
      url: '/mcp',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(열쇠 !== null && { authorization: `${방식} ${열쇠}` }) },
      payload: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
    });

  beforeAll(async () => {
    auth = await 가짜Auth띄우기();
    vi.stubEnv('AUTH_ISSUER', auth.issuer);
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 'xmo-secret');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'http://localhost:3000/');
    vi.stubEnv('AUTHORING_AGENT_USER', 'xmo-agent');
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    for (const 이름 of 계정들) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub, is_active)
         VALUES ($1, $1, NULL, 'member', 'none', true, false, $2, $3)`,
        [이름, `${이름}-sub`, 이름 !== 'xmo-off'],
      );
    }
    app = Fastify();
    세션등록(app, 'xmo-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(mcpRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
    await auth?.닫기();
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    vi.unstubAllEnvs();
  });

  it('열쇠가 없으면 401 과 로그인할 자리 머리 — Claude 는 이 머리를 보고 브라우저 로그인을 연다', async () => {
    const res = await 부르기(null);
    expect(res.statusCode).toBe(401);
    expect(res.headers['www-authenticate']).toBe(`Bearer ${자원정보}`);
  });

  it('맞는 토큰은 200 · 방식 이름은 대소문자를 안 가린다', async () => {
    const 토큰 = await auth.토큰('xmo-me-sub');
    expect((await 부르기(토큰)).statusCode).toBe(200);
    expect((await 부르기(토큰, 'bearer')).statusCode).toBe(200);
  });

  it('옛 PAT · 다른 창구 몫 토큰 · 서명 · 발급처 · 기간이 틀린 토큰 · 꺼진 계정 · 묶인 계정 없음 · 작성 에이전트 계정은 401 invalid_token', async () => {
    const 틀린것 = [
      'pat_old00001',
      'mcj_없는열쇠',
      await auth.토큰('xmo-me-sub', { aud: 'test-platform' }),
      await auth.토큰('xmo-me-sub', { aud: 'devicefarm' }),
      await auth.토큰('xmo-me-sub', { 남의열쇠: true }),
      await auth.토큰('xmo-me-sub', { iss: 'https://auth.other.test' }),
      await auth.토큰('xmo-me-sub', { exp: '-5m' }),
      await auth.토큰('xmo-off-sub'),
      await auth.토큰('xmo-nobody-sub'),
      await auth.토큰('xmo-agent-sub'),
    ];
    for (const 열쇠 of 틀린것) {
      const res = await 부르기(열쇠);
      expect(res.statusCode).toBe(401);
      expect(res.headers['www-authenticate']).toBe(`Bearer error="invalid_token", ${자원정보}`);
    }
  });

  it('Auth 열쇠 묶음을 못 받으면 401 이 아니라 503 — 401 이면 Claude 가 로그인을 다시 띄운다', async () => {
    vi.stubEnv('AUTH_ISSUER', 'http://127.0.0.1:9');
    try {
      expect((await 부르기(await auth.토큰('xmo-me-sub', { iss: 'http://127.0.0.1:9' }))).statusCode).toBe(503);
    } finally {
      vi.stubEnv('AUTH_ISSUER', auth.issuer);
    }
  });

  it('자원 정보 두 자리 — 이 창구 주소 · 로그인할 Auth · 범위', async () => {
    for (const url of ['/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-protected-resource']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ resource: 검사자원, authorization_servers: [auth.issuer], scopes_supported: ['commander'], bearer_methods_supported: ['header'] });
    }
  });

  it('SSO 를 끈 설치는 자원 정보가 404 이고 401 머리는 Bearer 하나', async () => {
    for (const 칸 of ['AUTH_ISSUER', 'AUTH_CLIENT_ID', 'AUTH_CLIENT_SECRET']) vi.stubEnv(칸, '');
    try {
      expect((await app.inject({ method: 'GET', url: '/.well-known/oauth-protected-resource/mcp' })).statusCode).toBe(404);
      expect((await 부르기(null)).headers['www-authenticate']).toBe('Bearer');
      expect((await 부르기(await auth.토큰('xmo-me-sub'))).headers['www-authenticate']).toBe('Bearer error="invalid_token"');
    } finally {
      vi.stubEnv('AUTH_ISSUER', auth.issuer);
      vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
      vi.stubEnv('AUTH_CLIENT_SECRET', 'xmo-secret');
    }
  });

  it('열쇠는 몸을 읽기 전에 본다 — 열쇠 없이 깨진 몸을 보내도 400 이 아니라 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/mcp', headers: { 'content-type': 'application/json' }, payload: '{깨진' });
    expect(res.statusCode).toBe(401);
  });
});
