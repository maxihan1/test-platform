// 본인 비밀번호 바꾸기 POST /api/auth/password 를 문과 함께 실제 DB 로 본다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 토큰해시 } from './agentToken.js';
import { 인증등록 } from './gate.js';
import { 해시 } from './password.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xpw-검사용-세션-열쇠-32글자를-넘긴다-넉넉히';
const 지금비번 = 'xpw-current-pass-1';
const 새비번 = 'xpw-brand-new-pass-2';
const 토큰 = `tpa_${'x'.repeat(43)}`;

describe.skipIf(연결 === undefined)('본인 비밀번호 바꾸기', () => {
  let app: FastifyInstance;
  const 로그: string[] = [];
  const 옛작성계정 = process.env.AUTHORING_AGENT_USER;

  async function 계정넣기(username: string, role: 'member' | 'admin', 변경강제 = false) {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password)
            VALUES ($1, $1, $2, $3, true, $4)
       ON CONFLICT (username) DO UPDATE SET is_active = true, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash,
         is_approved = true, must_change_password = EXCLUDED.must_change_password`,
      [username, await 해시(지금비번), role, 변경강제],
    );
  }

  async function 로그인(username: string, password: string) {
    return app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });
  }

  async function 쿠키(username: string): Promise<{ platform_session: string }> {
    const res = await 로그인(username, 지금비번);
    return { platform_session: res.cookies[0]!.value };
  }

  function 바꾸기(cookies: { platform_session: string } | undefined, payload: Record<string, unknown>) {
    return app.inject({ method: 'POST', url: '/api/auth/password', cookies, payload });
  }

  beforeAll(async () => {
    await 계정넣기('xpw-ok', 'member');
    await 계정넣기('xpw-err', 'member');
    await 계정넣기('xpw-force', 'admin', true);
    await 계정넣기('xpw-tok', 'member');
    const { pool } = await import('../db/index.js');
    await pool.query('UPDATE app_user SET agent_token_hash = $2 WHERE username = $1', ['xpw-tok', 토큰해시(토큰)]);
    process.env.AUTHORING_AGENT_USER = 'xpw-tok';

    app = Fastify({ logger: { level: 'trace', stream: { write: (줄: string) => void 로그.push(줄) } } });
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(
      async (scope) => {
        scope.get('/settings/users', async () => ({ 지나감: true }));
      },
      { prefix: '/api' },
    );
    await app.ready();
  });

  afterAll(async () => {
    if (옛작성계정 === undefined) delete process.env.AUTHORING_AGENT_USER;
    else process.env.AUTHORING_AGENT_USER = 옛작성계정;
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xpw%'`);
    await app.close();
  });

  it('맞으면 204 · 새 비밀번호로 로그인되고 옛것은 안 되며 변경 강제가 풀린다', async () => {
    const res = await 바꾸기(await 쿠키('xpw-ok'), { currentPassword: 지금비번, newPassword: 새비번 });
    expect(res.statusCode).toBe(204);

    const { pool } = await import('../db/index.js');
    const 행 = await pool.query<{ must_change_password: boolean }>(
      'SELECT must_change_password FROM app_user WHERE username = $1',
      ['xpw-ok'],
    );
    expect(행.rows[0]?.must_change_password).toBe(false);
    expect((await 로그인('xpw-ok', 새비번)).statusCode).toBe(200);
    expect((await 로그인('xpw-ok', 지금비번)).statusCode).toBe(401);
  });

  it('바꾼 세션은 이어지고 그 전에 받은 다른 출입증은 401 이다', async () => {
    await 계정넣기('xpw-ok', 'member');
    const 다른쪽 = await 쿠키('xpw-ok');
    const 바꾸는쪽 = await 쿠키('xpw-ok');

    const res = await 바꾸기(바꾸는쪽, { currentPassword: 지금비번, newPassword: 새비번 });
    expect(res.statusCode).toBe(204);
    const 새쿠키 = res.cookies.find((c) => c.name === 'platform_session');
    const 이어진것 = { platform_session: 새쿠키?.value ?? 바꾸는쪽.platform_session };

    expect((await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 이어진것 })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/auth/me', cookies: 다른쪽 })).statusCode).toBe(401);
  });

  it('현재 비밀번호가 틀리면 400 INVALID_CREDENTIALS', async () => {
    const res = await 바꾸기(await 쿠키('xpw-err'), { currentPassword: '틀린-비밀번호-임', newPassword: 새비번 });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  it('새것이 8자 미만이면 400 PASSWORD_SHORT', async () => {
    const res = await 바꾸기(await 쿠키('xpw-err'), { currentPassword: 지금비번, newPassword: 'short7!' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'PASSWORD_SHORT' });
  });

  it('새것이 지금 것과 같으면 400 PASSWORD_SAME', async () => {
    const res = await 바꾸기(await 쿠키('xpw-err'), { currentPassword: 지금비번, newPassword: 지금비번 });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'PASSWORD_SAME' });
  });

  it('로그인하지 않았으면 401', async () => {
    const res = await 바꾸기(undefined, { currentPassword: 지금비번, newPassword: 새비번 });
    expect(res.statusCode).toBe(401);
  });

  it('에이전트 토큰으로는 403 AGENT_TOKEN_SCOPE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/password',
      headers: { authorization: `Bearer ${토큰}` },
      payload: { currentPassword: 지금비번, newPassword: 새비번 },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'AGENT_TOKEN_SCOPE' });
  });

  it('변경 강제 중인 계정이 바꾸고 나면 다른 자리도 지난다', async () => {
    const 쿠키값 = await 쿠키('xpw-force');
    expect((await app.inject({ method: 'GET', url: '/api/settings/users', cookies: 쿠키값 })).statusCode).toBe(403);

    const res = await 바꾸기(쿠키값, { currentPassword: 지금비번, newPassword: 새비번 });
    expect(res.statusCode).toBe(204);
    const 새쿠키 = { platform_session: res.cookies.find((c) => c.name === 'platform_session')?.value ?? '' };
    expect((await app.inject({ method: 'GET', url: '/api/settings/users', cookies: 새쿠키 })).statusCode).toBe(200);
  });

  it('요청 본문의 비밀번호는 로그에 남지 않는다', () => {
    expect(로그.length).toBeGreaterThan(0);
    const 전부 = 로그.join('');
    expect(전부).not.toContain(새비번);
    expect(전부).not.toContain(지금비번);
  });
});
