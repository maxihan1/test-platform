// 설정 API 의 가입 수락·거절 — 승인 대기 계정만 움직인다. CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 세션등록 } from '../auth/session.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('설정 API — 가입 수락·거절', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    세션등록(app, 'xpa-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: {
        prefix: 'XPA',
        name: 'XPA 서비스',
        color: '#112233',
        testsRepo: 'https://example.com/x.git',
        testsDir: 'xpa',
        envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
      },
    });
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xpa%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xpa%'`);
    await pool.query(`DELETE FROM app_user WHERE username IN ('Xpa-upper', '.xpa-dot')`);
    await pool.query(`DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix LIKE 'XPA%')`);
    await pool.query(`DELETE FROM service WHERE prefix LIKE 'XPA%'`);
    await app.close();
  });

  type 권한 = 'none' | 'read' | 'write';
  type 줄 = { prefix: string; permissions: { cases: 권한; runs: 권한; authoring: 권한 } };

  async function 계정(username: string) {
    const res = await app.inject({ method: 'GET', url: '/api/settings/users' });
    return res
      .json<{ items: { username: string; isApproved: boolean; role: string; dashboard: string; services: 줄[] }[] }>()
      .items.find((u) => u.username === username);
  }
  const 대기넣기 = async (username: string) => {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved) VALUES ($1, '대기', 'x', 'member', false)`,
      [username],
    );
  };
  const 수락 = (username: string, payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: `/api/settings/users/${username}/approve`, payload });
  const 거절 = (username: string) => app.inject({ method: 'DELETE', url: `/api/settings/users/${username}` });

  it('수락하면 서비스별 권한·대시보드·등급을 저장하고 승인되며, 두 번째 수락은 409 ALREADY_APPROVED 다', async () => {
    await 대기넣기('xpa-ok');
    expect((await 계정('xpa-ok'))?.isApproved).toBe(false);
    const 줄들: 줄[] = [{ prefix: 'XPA', permissions: { cases: 'write', runs: 'read', authoring: 'none' } }];
    expect((await 수락('xpa-ok', { dashboard: 'none', services: 줄들, role: 'admin' })).statusCode).toBe(200);
    expect(await 계정('xpa-ok')).toMatchObject({ isApproved: true, role: 'admin', dashboard: 'none', services: 줄들 });

    const 다시 = await 수락('xpa-ok', { dashboard: 'read', services: [] });
    expect(다시.statusCode).toBe(409);
    expect(다시.json()).toEqual({ error: 'ALREADY_APPROVED' });
  });

  it('수락에서 셋 다 none 인 줄은 400 PERMISSIONS_SHAPE 이고 승인되지 않는다', async () => {
    await 대기넣기('xpa-bad');
    const 다없음 = { prefix: 'XPA', permissions: { cases: 'none', runs: 'none', authoring: 'none' } };
    const res = await 수락('xpa-bad', { dashboard: 'read', services: [다없음] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'PERMISSIONS_SHAPE' });
    expect((await 계정('xpa-bad'))?.isApproved).toBe(false);
  });

  it('승인 대기 계정에 PATCH 는 409 NOT_APPROVED 다', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/settings/users/xpa-bad', payload: { dashboard: 'none' } });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'NOT_APPROVED' });
  });

  it('거절은 승인 대기 계정만 지운다 — 승인된 계정 409 APPROVED_USER · 없는 계정 404', async () => {
    expect((await 거절('xpa-bad')).statusCode).toBe(204);
    expect(await 계정('xpa-bad')).toBeUndefined();

    const 승인됨 = await 거절('xpa-ok');
    expect(승인됨.statusCode).toBe(409);
    expect(승인됨.json()).toEqual({ error: 'APPROVED_USER' });
    expect(await 계정('xpa-ok')).toBeDefined();

    const 없음 = await 거절('xpa-없는사람');
    expect(없음.statusCode).toBe(404);
    expect(없음.json()).toEqual({ error: 'NOT_FOUND' });
  });

  it('계정 만들기도 가입과 같은 아이디 규칙이다 — 모양이 틀리면 400 USERNAME_SHAPE', async () => {
    for (const username of ['Xpa-upper', '.xpa-dot']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/settings/users',
        payload: { username, displayName: '모양', role: 'member', dashboard: 'read', services: [] },
      });
      expect(res.statusCode, username).toBe(400);
      expect(res.json(), username).toEqual({ error: 'USERNAME_SHAPE' });
    }
    expect(await 계정('Xpa-upper')).toBeUndefined();
  });
});
