// 회원가입 POST /api/auth/signup 을 문과 함께 실제 DB 로 본다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from './gate.js';
import authRoutes from './routes.js';
import { 세션등록 } from './session.js';

const 연결 = process.env.DATABASE_URL;
const 비번 = 'xsg-signup-pass-1';

describe.skipIf(연결 === undefined)('회원가입', () => {
  let app: FastifyInstance;
  const 로그: string[] = [];

  beforeAll(async () => {
    app = Fastify({ logger: { level: 'trace', stream: { write: (줄: string) => void 로그.push(줄) } } });
    세션등록(app, 'xsg-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xsg%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xsg%'`);
    await app.close();
  });

  const 가입 = (payload: Record<string, unknown>) => app.inject({ method: 'POST', url: '/api/auth/signup', payload });

  async function 행(username: string) {
    const { pool } = await import('../db/index.js');
    const rows = await pool.query<{
      role: string;
      perm_dashboard: string;
      is_approved: boolean;
      must_change_password: boolean;
      display_name: string;
    }>('SELECT role, perm_dashboard, is_approved, must_change_password, display_name FROM app_user WHERE username = $1', [
      username,
    ]);
    return rows.rows[0];
  }

  it('로그인 없이 201 PENDING 이고 출입증을 굽지 않으며 승인 대기 member 로 들어간다', async () => {
    const res = await 가입({ username: 'xsg-ok', displayName: '가입자', password: 비번 });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ status: 'PENDING' });
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(await 행('xsg-ok')).toEqual({
      role: 'member',
      perm_dashboard: 'none',
      is_approved: false,
      must_change_password: false,
      display_name: '가입자',
    });
  });

  it('가입한 계정으로 로그인하면 403 PENDING_APPROVAL', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'xsg-ok', password: 비번 } });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'PENDING_APPROVAL' });
  });

  it('이미 있는 아이디는 승인 대기여도 409 USERNAME_TAKEN', async () => {
    const res = await 가입({ username: 'xsg-ok', displayName: '또', password: 비번 });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'USERNAME_TAKEN' });
  });

  it('아이디 모양이 틀리면 400 USERNAME_SHAPE', async () => {
    for (const username of ['Admin', 'x', `xsg${'a'.repeat(30)}`, '.xsg']) {
      const res = await 가입({ username, displayName: '모양', password: 비번 });
      expect(res.statusCode, username).toBe(400);
      expect(res.json(), username).toEqual({ error: 'USERNAME_SHAPE' });
    }
  });

  it('비밀번호가 8자 미만이면 PASSWORD_SHORT · 128자를 넘으면 INVALID_REQUEST', async () => {
    const 짧음 = await 가입({ username: 'xsg-short', displayName: '짧음', password: 'short7!' });
    expect(짧음.statusCode).toBe(400);
    expect(짧음.json()).toEqual({ error: 'PASSWORD_SHORT' });

    const 김 = await 가입({ username: 'xsg-long', displayName: '김', password: 'a'.repeat(129) });
    expect(김.statusCode).toBe(400);
    expect(김.json()).toEqual({ error: 'INVALID_REQUEST' });
    expect(await 행('xsg-short')).toBeUndefined();
    expect(await 행('xsg-long')).toBeUndefined();
  });

  it('이름이 비었거나 50자를 넘으면 400 INVALID_REQUEST', async () => {
    for (const displayName of ['', '가'.repeat(51)]) {
      const res = await 가입({ username: 'xsg-name', displayName, password: 비번 });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'INVALID_REQUEST' });
    }
    expect(await 행('xsg-name')).toBeUndefined();
  });

  it('이름은 앞뒤 공백을 떼고 저장하며 공백뿐이면 400 INVALID_REQUEST', async () => {
    const 빈것 = await 가입({ username: 'xsg-blank', displayName: '   ', password: 비번 });
    expect(빈것.statusCode).toBe(400);
    expect(빈것.json()).toEqual({ error: 'INVALID_REQUEST' });
    expect(await 행('xsg-blank')).toBeUndefined();

    const res = await 가입({ username: 'xsg-trim', displayName: '  공백이름  ', password: 비번 });
    expect(res.statusCode).toBe(201);
    expect((await 행('xsg-trim'))?.display_name).toBe('공백이름');
  });

  it('작성 에이전트 계정 이름으로는 409 USERNAME_TAKEN', async () => {
    const 옛이름 = process.env.AUTHORING_AGENT_USER;
    process.env.AUTHORING_AGENT_USER = 'xsg-agent';
    try {
      const res = await 가입({ username: 'xsg-agent', displayName: '흉내', password: 비번 });
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'USERNAME_TAKEN' });
      expect(await 행('xsg-agent')).toBeUndefined();
    } finally {
      if (옛이름 === undefined) delete process.env.AUTHORING_AGENT_USER;
      else process.env.AUTHORING_AGENT_USER = 옛이름;
    }
  });

  it('본문에 등급·권한을 실어도 무시한다', async () => {
    const res = await 가입({
      username: 'xsg-sneak',
      displayName: '몰래',
      password: 비번,
      role: 'admin',
      dashboard: 'read',
      services: [{ prefix: 'XFS2', permissions: { cases: 'write', runs: 'write', authoring: 'write' } }],
    });
    expect(res.statusCode).toBe(201);
    expect(await 행('xsg-sneak')).toMatchObject({ role: 'member', perm_dashboard: 'none', is_approved: false });

    const { pool } = await import('../db/index.js');
    const 배정 = await pool.query('SELECT 1 FROM user_service WHERE username = $1', ['xsg-sneak']);
    expect(배정.rowCount).toBe(0);
  });

  it('요청 본문의 비밀번호는 로그에 남지 않는다', () => {
    expect(로그.length).toBeGreaterThan(0);
    expect(로그.join('')).not.toContain(비번);
  });
});
