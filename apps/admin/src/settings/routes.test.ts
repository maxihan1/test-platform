// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xfu4-검사용-세션-열쇠-32글자를-넘긴다';

describe.skipIf(연결 === undefined)('설정 API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    세션등록(app, 열쇠);
    // 등급을 막는 것은 미들웨어다. 여기서는 설정 API 자체만 본다
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.register(authRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu4%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu4%'`);
    await pool.query(
      `DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix LIKE 'XFS4%')`,
    );
    await pool.query(`DELETE FROM service WHERE prefix LIKE 'XFS4%'`);
    await app.close();
  });

  async function 서비스만들기(prefix: string, 더할것: Record<string, unknown> = {}) {
    return app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: {
        prefix,
        name: `${prefix} 서비스`,
        color: '#112233',
        testsRepo: 'https://example.com/x.git',
        testsDir: prefix.toLowerCase(),
        envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
        ...더할것,
      },
    });
  }

  async function 목록(): Promise<Record<string, unknown>[]> {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    return res.json<{ items: Record<string, unknown>[] }>().items;
  }

  it('서비스를 만들면 201과 번호를 준다', async () => {
    const res = await 서비스만들기('XFS4A');
    expect(res.statusCode).toBe(201);
    expect(typeof res.json<{ id: number }>().id).toBe('number');
  });

  it('목록에 대상 서버와 케이스 수가 함께 실린다', async () => {
    const 하나 = (await 목록()).find((s) => s.prefix === 'XFS4A');
    expect(하나?.testsDir).toBe('xfs4a');
    expect(하나?.envs).toEqual([{ env: 'qa', baseUrl: 'https://qa.example.com', loginId: null, hasLoginPassword: false }]);
    expect(하나?.caseCount).toBe(0);
    expect(하나?.isActive).toBe(true);
  });

  it('접두사가 이미 쓰였으면 409다', async () => {
    const res = await 서비스만들기('XFS4A');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'PREFIX_TAKEN' });
  });

  it('접두사 모양이 §2와 다르면 400이다', async () => {
    for (const 나쁜것 of ['xfs4b', '4XFS', 'XFS-4', 'AVERYLONGPREFIX']) {
      const res = await 서비스만들기(나쁜것);
      expect(res.statusCode, 나쁜것).toBe(400);
      expect(res.json<{ error: string }>().error).toBe('PREFIX_SHAPE');
    }
  });

  it('웹훅 주소는 응답에 담기지 않고 설정됐는지만 준다', async () => {
    await 서비스만들기('XFS4C', { slackWebhook: 'https://hooks.slack.test/비밀주소' });
    const 목록문자열 = JSON.stringify(await 목록());

    expect(목록문자열).not.toContain('비밀주소');
    const 하나 = (await 목록()).find((s) => s.prefix === 'XFS4C');
    expect(하나?.hasSlackWebhook).toBe(true);
    expect((await 목록()).find((s) => s.prefix === 'XFS4A')?.hasSlackWebhook).toBe(false);
  });

  it('피그마 토큰은 응답에 담기지 않고 설정됐는지만 준다 — 웹훅과 같은 규칙', async () => {
    await 서비스만들기('XFS4F', { figmaToken: 'figd_비밀토큰' });
    const 목록문자열 = JSON.stringify(await 목록());

    expect(목록문자열).not.toContain('비밀토큰');
    expect((await 목록()).find((s) => s.prefix === 'XFS4F')?.hasFigmaToken).toBe(true);
    expect((await 목록()).find((s) => s.prefix === 'XFS4A')?.hasFigmaToken).toBe(false);
  });

  it('피그마 토큰을 고쳐 넣고, 빈 글자로 고치면 지워진다', async () => {
    const id = (await 목록()).find((s) => s.prefix === 'XFS4A')?.id;
    const 고치기 = (figmaToken: string) =>
      app.inject({
        method: 'PATCH',
        url: `/api/settings/services/${String(id)}`,
        payload: { figmaToken },
      });

    expect((await 고치기('figd_새토큰')).statusCode).toBe(200);
    expect((await 목록()).find((s) => s.prefix === 'XFS4A')?.hasFigmaToken).toBe(true);
    expect((await 고치기('')).statusCode).toBe(200);
    expect((await 목록()).find((s) => s.prefix === 'XFS4A')?.hasFigmaToken).toBe(false);
  });

  it('접두사를 고치려 들면 400이다', async () => {
    const id = (await 목록()).find((s) => s.prefix === 'XFS4A')?.id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/settings/services/${String(id)}`,
      payload: { prefix: 'XFS4Z', name: '바꾼 이름' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'PREFIX_IMMUTABLE' });
  });

  it('서비스 번호가 정수 범위를 벗어나면 400이다', async () => {
    for (const 틀린번호 of ['abc', '1e21', '0', '-1']) {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/settings/services/${틀린번호}`,
        payload: { name: '아무거나' },
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it('이름·색·대상 서버는 언제든 고친다', async () => {
    const id = (await 목록()).find((s) => s.prefix === 'XFS4A')?.id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/settings/services/${String(id)}`,
      payload: {
        name: '이름 바꿈',
        envs: [
          { env: 'dev', baseUrl: 'https://dev.example.com' },
          { env: 'qa', baseUrl: 'https://qa2.example.com' },
        ],
      },
    });
    expect(res.statusCode).toBe(200);

    const 하나 = (await 목록()).find((s) => s.prefix === 'XFS4A');
    expect(하나?.name).toBe('이름 바꿈');
    expect(하나?.envs).toEqual([
      { env: 'dev', baseUrl: 'https://dev.example.com', loginId: null, hasLoginPassword: false },
      { env: 'qa', baseUrl: 'https://qa2.example.com', loginId: null, hasLoginPassword: false },
    ]);
  });

  it('서비스를 지우지 않고 비활성으로 내린다', async () => {
    const id = (await 목록()).find((s) => s.prefix === 'XFS4C')?.id;
    await app.inject({
      method: 'PATCH',
      url: `/api/settings/services/${String(id)}`,
      payload: { isActive: false },
    });

    const 하나 = (await 목록()).find((s) => s.prefix === 'XFS4C');
    expect(하나).toBeDefined();
    expect(하나?.isActive).toBe(false);
  });
});
