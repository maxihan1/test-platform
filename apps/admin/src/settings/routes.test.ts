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

  async function 계정만들기(username: string, role: string, services: string[] = []) {
    return app.inject({
      method: 'POST',
      url: '/api/settings/users',
      payload: { username, displayName: `${username} 님`, role, services },
    });
  }

  it('계정을 만들면 비밀번호를 한 번만 돌려주고 그 비밀번호로 로그인된다', async () => {
    const 만듦 = await 계정만들기('xfu4-viewer', 'viewer', ['XFS4A']);
    expect(만듦.statusCode).toBe(201);

    const { username, tempPassword } = 만듦.json<{ username: string; tempPassword: string }>();
    expect(username).toBe('xfu4-viewer');

    const 로그인 = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: tempPassword },
    });
    expect(로그인.statusCode).toBe(200);
    expect(로그인.json<{ user: { services: { prefix: string }[] } }>().user.services.map((s) => s.prefix)).toEqual([
      'XFS4A',
    ]);
  });

  it('아이디가 이미 있으면 409다', async () => {
    const res = await 계정만들기('xfu4-viewer', 'viewer');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'USERNAME_TAKEN' });
  });

  it('계정 목록은 배정 서비스를 접두사로 싣는다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/settings/users' });
    const 하나 = res
      .json<{ items: { username: string; services: string[]; role: string }[] }>()
      .items.find((u) => u.username === 'xfu4-viewer');

    expect(하나?.role).toBe('viewer');
    expect(하나?.services).toEqual(['XFS4A']);
  });

  it('비밀번호를 다시 만들면 옛 비밀번호는 더 안 통한다', async () => {
    const 만듦 = await 계정만들기('xfu4-rotate', 'viewer');
    const 옛것 = 만듦.json<{ tempPassword: string }>().tempPassword;

    const 다시 = await app.inject({
      method: 'POST',
      url: '/api/settings/users/xfu4-rotate/password',
    });
    const 새것 = 다시.json<{ tempPassword: string }>().tempPassword;
    expect(새것).not.toBe(옛것);

    async function 로그인(password: string) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'xfu4-rotate', password },
      });
      return res.statusCode;
    }
    expect(await 로그인(새것)).toBe(200);
    expect(await 로그인(옛것)).toBe(401);
  });

  it('없는 계정의 비밀번호를 다시 만들면 404다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/users/xfu4-없는사람/password',
    });
    expect(res.statusCode).toBe(404);
  });

  it('계정을 지우지 않고 비활성으로 내린다', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/settings/users/xfu4-viewer',
      payload: { isActive: false, displayName: '이름 바꿈' },
    });
    expect(res.statusCode).toBe(200);

    const 목록 = await app.inject({ method: 'GET', url: '/api/settings/users' });
    const 하나 = 목록
      .json<{ items: { username: string; isActive: boolean; displayName: string }[] }>()
      .items.find((u) => u.username === 'xfu4-viewer');
    expect(하나?.isActive).toBe(false);
    expect(하나?.displayName).toBe('이름 바꿈');
  });

  it('운영 계정이 둘이면 하나는 낮출 수 있고, 마지막 하나는 409다', async () => {
    const { pool } = await import('../db/index.js');
    await 계정만들기('xfu4-admin1', 'admin');
    await 계정만들기('xfu4-admin2', 'admin');

    const 낮추기 = (username: string) =>
      app.inject({ method: 'PATCH', url: `/api/settings/users/${username}`, payload: { role: 'viewer' } });

    expect((await 낮추기('xfu4-admin1')).statusCode).toBe(200);

    // 「마지막 하나」는 시스템 전체의 활성 운영 계정 수로 판정한다. 같은 DB 를 다른 검사 파일이
    // 병렬로 쓰므로 지금 몇인지를 읽어 그에 맞는 답을 본다 — 이 파일만 돌리면 언제나 409 쪽이다
    const 남은 = await pool.query<{ count: string }>(
      `SELECT count(*) FROM app_user WHERE role = 'admin' AND is_active`,
    );
    const 마지막인가 = Number(남은.rows[0]?.count ?? 0) <= 1;
    const res = await 낮추기('xfu4-admin2');

    expect(res.statusCode).toBe(마지막인가 ? 409 : 200);
    if (마지막인가) expect(res.json()).toEqual({ error: 'LAST_ADMIN' });
  });
});
