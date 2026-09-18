// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 해시 } from './password.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xfu2-검사용-세션-열쇠-32글자를-넘긴다';

describe.skipIf(연결 === undefined)('Auth API', () => {
  let app: FastifyInstance;
  let 서비스id = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const 서비스 = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XFS2', '로그인 검사용', '#334455', 'https://example.com/xfs2', 'xfs2')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스id = 서비스.rows[0]!.id;

    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, '김로그인', $2, 'operator')
       ON CONFLICT (username) DO UPDATE SET is_active = true, password_hash = EXCLUDED.password_hash`,
      ['xfu2-live', await 해시('열려라참깨')],
    );
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_active)
            VALUES ($1, '박비활성', $2, 'operator', false)
       ON CONFLICT (username) DO UPDATE SET is_active = false, password_hash = EXCLUDED.password_hash`,
      ['xfu2-dead', await 해시('열려라참깨')],
    );
    await pool.query(
      `INSERT INTO user_service (username, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      ['xfu2-live', 서비스id],
    );

    app = Fastify();
    await 세션등록(app, 열쇠);
    await app.register(authRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu2%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu2%'`);
    await pool.query(`DELETE FROM service WHERE prefix = 'XFS2'`);
    await app.close();
  });

  async function 로그인(username: string, password: string) {
    return app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password },
    });
  }

  it('맞으면 사람과 배정 서비스를 돌려주고 출입증을 굽는다', async () => {
    const res = await 로그인('xfu2-live', '열려라참깨');
    expect(res.statusCode).toBe(200);

    const { user } = res.json<{ user: { username: string; role: string; services: { prefix: string }[] } }>();
    expect(user.username).toBe('xfu2-live');
    expect(user.role).toBe('operator');
    expect(user.services.map((s) => s.prefix)).toEqual(['XFS2']);
    expect(res.cookies.some((c) => c.name === 'platform_session')).toBe(true);
  });

  it('비밀번호 해시는 응답에 담기지 않는다', async () => {
    const res = await 로그인('xfu2-live', '열려라참깨');
    expect(res.body).not.toContain('scrypt$');
    expect(res.body).not.toContain('열려라참깨');
  });

  it('아이디가 틀렸든 비밀번호가 틀렸든 답이 같다', async () => {
    const 아이디틀림 = await 로그인('xfu2-없는사람', '열려라참깨');
    const 비번틀림 = await 로그인('xfu2-live', '틀린비밀번호');

    expect(아이디틀림.statusCode).toBe(401);
    expect(비번틀림.statusCode).toBe(401);
    expect(아이디틀림.json()).toEqual({ error: 'INVALID_CREDENTIALS' });
    expect(비번틀림.json()).toEqual(아이디틀림.json());
  });

  it('비활성 계정도 같은 401이다', async () => {
    const res = await 로그인('xfu2-dead', '열려라참깨');
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  it('빈 요청에도 같은 401로 답한다', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: {} });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  it('로그인 안 한 채로 나를 물으면 401이다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('출입증을 들고 오면 나를 돌려준다', async () => {
    const 들어옴 = await 로그인('xfu2-live', '열려라참깨');
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { platform_session: 들어옴.cookies[0]!.value },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json<{ user: { displayName: string } }>().user.displayName).toBe('김로그인');
  });

  it('로그아웃하면 204 이고 그 출입증은 더 안 통한다', async () => {
    const 들어옴 = await 로그인('xfu2-live', '열려라참깨');
    const 나감 = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      cookies: { platform_session: 들어옴.cookies[0]!.value },
    });
    expect(나감.statusCode).toBe(204);

    const 빈출입증 = 나감.cookies.find((c) => c.name === 'platform_session');
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { platform_session: 빈출입증?.value ?? '' },
    });
    expect(res.statusCode).toBe(401);
  });
});
