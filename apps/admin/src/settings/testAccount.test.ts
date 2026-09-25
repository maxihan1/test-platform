// 대상 서버 줄의 테스트 계정을 저장하고, 다시 저장해도 유지되며, 비밀번호 원문이 어디로도 안 나가는지 본다
// (SPEC 도메인/인증 §7 「envs[] 한 줄」). CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 사용자와해시 } from '../auth/store.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 원문 = 'pw-원문-XFS7';

describe.skipIf(연결 === undefined)('대상 서버 줄의 테스트 계정', () => {
  let app: FastifyInstance;
  let 번호 = 0;

  async function 치운다(): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu7%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu7%'`);
    await pool.query(`DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix LIKE 'XFS7%')`);
    await pool.query(`DELETE FROM service WHERE prefix LIKE 'XFS7%'`);
  }

  async function 줄들(): Promise<Record<string, unknown>[]> {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    const 하나 = res.json<{ items: { id: number; envs: Record<string, unknown>[] }[] }>().items.find((s) => s.id === 번호);
    return 하나?.envs ?? [];
  }

  async function 고친다(envs: Record<string, unknown>[]): Promise<number> {
    const res = await app.inject({ method: 'PATCH', url: `/api/settings/services/${String(번호)}`, payload: { envs } });
    return res.statusCode;
  }

  async function 저장된것(env: string): Promise<{ login_id: string | null; login_password: string | null } | undefined> {
    const { pool } = await import('../db/index.js');
    const { rows } = await pool.query<{ login_id: string | null; login_password: string | null }>(
      'SELECT login_id, login_password FROM service_env WHERE service_id = $1 AND env = $2',
      [번호, env],
    );
    return rows[0];
  }

  beforeAll(async () => {
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();
  });

  afterAll(async () => {
    await 치운다();
    await app.close();
    const { pool } = await import('../db/index.js');
    await pool.end();
  });

  beforeEach(async () => {
    await 치운다();
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: {
        prefix: 'XFS7A',
        name: 'XFS7A 서비스',
        color: '#112233',
        testsRepo: 'https://example.com/x.git',
        testsDir: 'xfs7a',
        envs: [
          { env: 'qa', baseUrl: 'https://qa.example.com', loginId: 'tester', loginPassword: 원문 },
          { env: 'prod', baseUrl: 'https://example.com' },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    번호 = res.json<{ id: number }>().id;
  });

  it('계정을 넣은 줄은 아이디와 비밀번호 설정 여부만 주고, 계정 없는 줄은 비어 있다', async () => {
    expect(await 줄들()).toEqual([
      { env: 'prod', baseUrl: 'https://example.com', loginId: null, hasLoginPassword: false },
      { env: 'qa', baseUrl: 'https://qa.example.com', loginId: 'tester', hasLoginPassword: true },
    ]);
    expect(await 저장된것('qa')).toEqual({ login_id: 'tester', login_password: 원문 });
  });

  it('비밀번호 원문은 설정 목록에도, 로그인 정보에도, 틀린 입력의 400 본문에도 없다', async () => {
    const 목록 = await app.inject({ method: 'GET', url: '/api/settings/services' });
    expect(목록.body).not.toContain(원문);

    const 만듦 = await app.inject({
      method: 'POST',
      url: '/api/settings/users',
      payload: { username: 'xfu7-viewer', displayName: 'xfu7 님', role: 'viewer', services: ['XFS7A'] },
    });
    expect(만듦.statusCode).toBe(201);
    const 로그인정보 = JSON.stringify(await 사용자와해시('xfu7-viewer'));
    expect(로그인정보).toContain('XFS7A');
    expect(로그인정보).not.toContain(원문);
    expect(로그인정보).not.toContain('tester');

    const 틀림 = await app.inject({
      method: 'PATCH',
      url: `/api/settings/services/${String(번호)}`,
      payload: { envs: [{ env: 'qa', baseUrl: '', loginPassword: 원문 }] },
    });
    expect(틀림.statusCode).toBe(400);
    expect(틀림.body).not.toContain(원문);
  });

  it('화면이 주소만 보내도 아이디와 비밀번호가 남는다', async () => {
    expect(await 고친다([{ env: 'qa', baseUrl: 'https://qa2.example.com' }])).toBe(200);
    expect(await 저장된것('qa')).toEqual({ login_id: 'tester', login_password: 원문 });
    expect((await 줄들()).find((e) => e.env === 'qa')).toMatchObject({ baseUrl: 'https://qa2.example.com', loginId: 'tester' });
  });

  it('null 이나 빈 글자를 보내면 지운다', async () => {
    expect(await 고친다([{ env: 'qa', baseUrl: 'https://qa.example.com', loginPassword: null }])).toBe(200);
    expect(await 저장된것('qa')).toEqual({ login_id: 'tester', login_password: null });

    expect(await 고친다([{ env: 'qa', baseUrl: 'https://qa.example.com', loginId: '  ' }])).toBe(200);
    expect(await 저장된것('qa')).toEqual({ login_id: null, login_password: null });
  });

  it('새 값을 보내면 바꾸고, 다른 이름의 줄은 계정을 이어받지 않는다', async () => {
    expect(await 고친다([{ env: 'qa', baseUrl: 'https://qa.example.com', loginPassword: 'pw-새것' }])).toBe(200);
    expect(await 저장된것('qa')).toEqual({ login_id: 'tester', login_password: 'pw-새것' });

    expect(await 고친다([{ env: 'qa2', baseUrl: 'https://qa.example.com' }])).toBe(200);
    expect(await 저장된것('qa2')).toEqual({ login_id: null, login_password: null });
  });
});
