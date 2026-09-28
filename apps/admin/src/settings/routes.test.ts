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

  type 권한 = 'none' | 'read' | 'write';
  type 줄 = { prefix: string; permissions: { cases: 권한; runs: 권한; authoring: 권한 } };
  interface 계정 {
    username: string;
    displayName: string;
    role: string;
    dashboard: string;
    isActive: boolean;
    isApproved: boolean;
    mustChangePassword: boolean;
    services: 줄[];
  }

  const 읽기 = (prefix: string): 줄 => ({ prefix, permissions: { cases: 'read', runs: 'none', authoring: 'none' } });

  async function 계정만들기(username: string, role: string, services: unknown[] = [], dashboard = 'read') {
    return app.inject({
      method: 'POST',
      url: '/api/settings/users',
      payload: { username, displayName: `${username} 님`, role, dashboard, services },
    });
  }

  async function 계정(username: string): Promise<계정 | undefined> {
    const res = await app.inject({ method: 'GET', url: '/api/settings/users' });
    return res.json<{ items: 계정[] }>().items.find((u) => u.username === username);
  }

  it('계정을 만들면 비밀번호를 한 번만 돌려주고 그 비밀번호로 로그인된다', async () => {
    const 만듦 = await 계정만들기('xfu4-viewer', 'member', [읽기('XFS4A')]);
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
    const res = await 계정만들기('xfu4-viewer', 'member');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'USERNAME_TAKEN' });
  });

  it('계정 목록은 서비스마다 권한 셋과 대시보드·승인·변경 강제를 싣는다', async () => {
    expect(await 계정('xfu4-viewer')).toMatchObject({
      role: 'member',
      dashboard: 'read',
      isApproved: true,
      mustChangePassword: true,
      services: [읽기('XFS4A')],
    });
  });

  it('만들 때 서비스마다 다른 권한과 대시보드 none 이 그대로 저장된다', async () => {
    const 줄들: 줄[] = [
      { prefix: 'XFS4A', permissions: { cases: 'write', runs: 'read', authoring: 'none' } },
      { prefix: 'XFS4F', permissions: { cases: 'none', runs: 'none', authoring: 'write' } },
    ];
    expect((await 계정만들기('xfu4-perm', 'member', 줄들, 'none')).statusCode).toBe(201);
    expect(await 계정('xfu4-perm')).toMatchObject({ dashboard: 'none', services: 줄들 });
  });

  it('권한 칸이 빠지거나 셋 다 none 이거나 대시보드가 write 면 400 PERMISSIONS_SHAPE 다', async () => {
    const 빠짐 = { prefix: 'XFS4A', permissions: { cases: 'read', runs: 'read' } };
    const 다없음 = { prefix: 'XFS4A', permissions: { cases: 'none', runs: 'none', authoring: 'none' } };
    const 만들기들 = [
      await 계정만들기('xfu4-bad1', 'member', [빠짐]),
      await 계정만들기('xfu4-bad2', 'member', [다없음]),
      await 계정만들기('xfu4-bad3', 'member', [], 'write'),
    ];
    const 고치기 = (payload: Record<string, unknown>) =>
      app.inject({ method: 'PATCH', url: '/api/settings/users/xfu4-perm', payload });
    const 고치기들 = [
      await 고치기({ services: [빠짐] }),
      await 고치기({ services: [다없음] }),
      await 고치기({ dashboard: 'write' }),
    ];

    for (const res of [...만들기들, ...고치기들]) {
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'PERMISSIONS_SHAPE' });
    }
    expect(await 계정('xfu4-bad1')).toBeUndefined();
  });

  it('services 를 보내면 배정을 통째로 바꾸고 대시보드도 고친다', async () => {
    const 새줄 = { prefix: 'XFS4F', permissions: { cases: 'read', runs: 'write', authoring: 'read' } } satisfies 줄;
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/settings/users/xfu4-perm',
      payload: { services: [새줄], dashboard: 'read' },
    });
    expect(res.statusCode).toBe(200);
    expect(await 계정('xfu4-perm')).toMatchObject({ dashboard: 'read', services: [새줄] });
  });

  it('등급은 member 와 admin 뿐이다 — viewer 는 400', async () => {
    expect((await 계정만들기('xfu4-old', 'viewer')).statusCode).toBe(400);
    const 고침 = await app.inject({
      method: 'PATCH',
      url: '/api/settings/users/xfu4-perm',
      payload: { role: 'operator' },
    });
    expect(고침.statusCode).toBe(400);
  });

  it('비밀번호를 다시 만들면 옛 비밀번호는 더 안 통한다', async () => {
    const 만듦 = await 계정만들기('xfu4-rotate', 'member');
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

  it('비밀번호를 다시 만들면 비밀번호 변경 강제가 다시 켜진다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE app_user SET must_change_password = false WHERE username = 'xfu4-rotate'`);
    expect((await 계정('xfu4-rotate'))?.mustChangePassword).toBe(false);

    await app.inject({ method: 'POST', url: '/api/settings/users/xfu4-rotate/password' });
    expect((await 계정('xfu4-rotate'))?.mustChangePassword).toBe(true);
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

    const 하나 = await 계정('xfu4-viewer');
    expect(하나?.isActive).toBe(false);
    expect(하나?.displayName).toBe('이름 바꿈');
  });

  const 운영계정수 = async () => {
    const { pool } = await import('../db/index.js');
    const 남은 = await pool.query<{ count: string }>(
      `SELECT count(*) FROM app_user WHERE role = 'admin' AND is_active AND is_approved`,
    );
    return Number(남은.rows[0]?.count ?? 0);
  };
  const 낮추기 = (username: string) =>
    app.inject({ method: 'PATCH', url: `/api/settings/users/${username}`, payload: { role: 'member' } });

  it('운영 계정이 둘이면 하나는 낮출 수 있고, 마지막 하나는 409다', async () => {
    await 계정만들기('xfu4-admin1', 'admin');
    await 계정만들기('xfu4-admin2', 'admin');

    expect((await 낮추기('xfu4-admin1')).statusCode).toBe(200);

    // 「마지막 하나」는 시스템 전체의 운영 계정 수로 판정한다. 같은 DB 를 다른 검사 파일도 쓰므로
    // 지금 몇인지를 읽어 그에 맞는 답을 본다 — 이 파일만 돌리면 언제나 409 쪽이다
    const 마지막인가 = (await 운영계정수()) <= 1;
    const res = await 낮추기('xfu4-admin2');

    expect(res.statusCode).toBe(마지막인가 ? 409 : 200);
    if (마지막인가) expect(res.json()).toEqual({ error: 'LAST_ADMIN' });
  });

  it('승인 대기 admin 은 운영 계정으로 세지 않는다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved)
            VALUES ('xfu4-pending', '대기', 'x', 'admin', false)`,
    );
    await 계정만들기('xfu4-admin3', 'admin');
    await 낮추기('xfu4-admin2');

    const 마지막인가 = (await 운영계정수()) <= 1;
    const res = await 낮추기('xfu4-admin3');

    expect(res.statusCode).toBe(마지막인가 ? 409 : 200);
    if (마지막인가) expect(res.json()).toEqual({ error: 'LAST_ADMIN' });
  });
});
