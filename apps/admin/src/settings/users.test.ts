// 설정 API 의 계정 쪽 — 서비스별 권한·대시보드·변경 강제. CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xfu9-검사용-세션-열쇠-32글자를-넘긴다';

describe.skipIf(연결 === undefined)('설정 API — 계정', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    세션등록(app, 열쇠);
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.register(authRoutes, { prefix: '/api' });
    await app.ready();
    for (const prefix of ['XFS9A', 'XFS9F']) {
      await app.inject({
        method: 'POST',
        url: '/api/settings/services',
        payload: {
          prefix,
          name: `${prefix} 서비스`,
          color: '#112233',
          testsRepo: 'https://example.com/x.git',
          testsDir: prefix.toLowerCase(),
          envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
        },
      });
    }
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu9%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu9%'`);
    await pool.query(
      `DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix LIKE 'XFS9%')`,
    );
    await pool.query(`DELETE FROM service WHERE prefix LIKE 'XFS9%'`);
    await app.close();
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
    const 만듦 = await 계정만들기('xfu9-viewer', 'member', [읽기('XFS9A')]);
    expect(만듦.statusCode).toBe(201);

    const { username, tempPassword } = 만듦.json<{ username: string; tempPassword: string }>();
    expect(username).toBe('xfu9-viewer');

    const 로그인 = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password: tempPassword },
    });
    expect(로그인.statusCode).toBe(200);
    expect(로그인.json<{ user: { services: { prefix: string }[] } }>().user.services.map((s) => s.prefix)).toEqual([
      'XFS9A',
    ]);
  });

  it('아이디가 이미 있으면 409다', async () => {
    const res = await 계정만들기('xfu9-viewer', 'member');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'USERNAME_TAKEN' });
  });

  it('계정 목록은 서비스마다 권한 셋과 대시보드·승인·변경 강제를 싣는다', async () => {
    expect(await 계정('xfu9-viewer')).toMatchObject({
      role: 'member',
      dashboard: 'read',
      isApproved: true,
      mustChangePassword: true,
      services: [읽기('XFS9A')],
    });
  });

  it('만들 때 서비스마다 다른 권한과 대시보드 none 이 그대로 저장된다', async () => {
    const 줄들: 줄[] = [
      { prefix: 'XFS9A', permissions: { cases: 'write', runs: 'read', authoring: 'none' } },
      { prefix: 'XFS9F', permissions: { cases: 'none', runs: 'none', authoring: 'write' } },
    ];
    expect((await 계정만들기('xfu9-perm', 'member', 줄들, 'none')).statusCode).toBe(201);
    expect(await 계정('xfu9-perm')).toMatchObject({ dashboard: 'none', services: 줄들 });
  });

  it('권한 칸이 빠지거나 셋 다 none 이거나 대시보드가 write 면 400 PERMISSIONS_SHAPE 다', async () => {
    const 빠짐 = { prefix: 'XFS9A', permissions: { cases: 'read', runs: 'read' } };
    const 다없음 = { prefix: 'XFS9A', permissions: { cases: 'none', runs: 'none', authoring: 'none' } };
    const 만들기들 = [
      await 계정만들기('xfu9-bad1', 'member', [빠짐]),
      await 계정만들기('xfu9-bad2', 'member', [다없음]),
      await 계정만들기('xfu9-bad3', 'member', [], 'write'),
    ];
    const 고치기 = (payload: Record<string, unknown>) =>
      app.inject({ method: 'PATCH', url: '/api/settings/users/xfu9-perm', payload });
    const 고치기들 = [
      await 고치기({ services: [빠짐] }),
      await 고치기({ services: [다없음] }),
      await 고치기({ dashboard: 'write' }),
    ];

    for (const res of [...만들기들, ...고치기들]) {
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'PERMISSIONS_SHAPE' });
    }
    expect(await 계정('xfu9-bad1')).toBeUndefined();
  });

  it('같은 서비스 줄이 두 번이면 400 PERMISSIONS_SHAPE 다 — 뒤엣것이 조용히 버려지지 않게', async () => {
    const 두번 = [읽기('XFS9A'), { prefix: 'XFS9A', permissions: { cases: 'write', runs: 'write', authoring: 'write' } }];
    const 만듦 = await 계정만들기('xfu9-dup', 'member', 두번);
    const 고침 = await app.inject({ method: 'PATCH', url: '/api/settings/users/xfu9-perm', payload: { services: 두번 } });
    for (const res of [만듦, 고침]) {
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'PERMISSIONS_SHAPE' });
    }
    expect(await 계정('xfu9-dup')).toBeUndefined();
  });

  it('권한 칸 말고 다른 칸도 틀렸으면 INVALID_REQUEST 다 — 권한만 고치라고 잘못 알리지 않게', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/users',
      payload: { username: '', displayName: 'x', role: 'member', dashboard: 'read', services: [{ prefix: 'XFS9A' }] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toBe('INVALID_REQUEST');
  });

  it('services 를 보내면 배정을 통째로 바꾸고 대시보드도 고친다', async () => {
    const 새줄 = { prefix: 'XFS9F', permissions: { cases: 'read', runs: 'write', authoring: 'read' } } satisfies 줄;
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/settings/users/xfu9-perm',
      payload: { services: [새줄], dashboard: 'read' },
    });
    expect(res.statusCode).toBe(200);
    expect(await 계정('xfu9-perm')).toMatchObject({ dashboard: 'read', services: [새줄] });
  });

  it('등급은 member 와 admin 뿐이다 — viewer 는 400', async () => {
    expect((await 계정만들기('xfu9-old', 'viewer')).statusCode).toBe(400);
    const 고침 = await app.inject({
      method: 'PATCH',
      url: '/api/settings/users/xfu9-perm',
      payload: { role: 'operator' },
    });
    expect(고침.statusCode).toBe(400);
  });

  it('비밀번호를 다시 만들면 옛 비밀번호는 더 안 통한다', async () => {
    const 만듦 = await 계정만들기('xfu9-rotate', 'member');
    const 옛것 = 만듦.json<{ tempPassword: string }>().tempPassword;

    const 다시 = await app.inject({
      method: 'POST',
      url: '/api/settings/users/xfu9-rotate/password',
    });
    const 새것 = 다시.json<{ tempPassword: string }>().tempPassword;
    expect(새것).not.toBe(옛것);

    async function 로그인(password: string) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'xfu9-rotate', password },
      });
      return res.statusCode;
    }
    expect(await 로그인(새것)).toBe(200);
    expect(await 로그인(옛것)).toBe(401);
  });

  it('비밀번호를 다시 만들면 비밀번호 변경 강제가 다시 켜진다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE app_user SET must_change_password = false WHERE username = 'xfu9-rotate'`);
    expect((await 계정('xfu9-rotate'))?.mustChangePassword).toBe(false);

    await app.inject({ method: 'POST', url: '/api/settings/users/xfu9-rotate/password' });
    expect((await 계정('xfu9-rotate'))?.mustChangePassword).toBe(true);
  });

  it('없는 계정의 비밀번호를 다시 만들면 404다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/users/xfu9-없는사람/password',
    });
    expect(res.statusCode).toBe(404);
  });

  it('계정을 지우지 않고 비활성으로 내린다', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/settings/users/xfu9-viewer',
      payload: { isActive: false, displayName: '이름 바꿈' },
    });
    expect(res.statusCode).toBe(200);

    const 하나 = await 계정('xfu9-viewer');
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
    await 계정만들기('xfu9-admin1', 'admin');
    await 계정만들기('xfu9-admin2', 'admin');

    expect((await 낮추기('xfu9-admin1')).statusCode).toBe(200);

    // 「마지막 하나」는 시스템 전체의 운영 계정 수로 판정한다. 같은 DB 를 다른 검사 파일도 쓰므로
    // 지금 몇인지를 읽어 그에 맞는 답을 본다 — 이 파일만 돌리면 언제나 409 쪽이다
    const 마지막인가 = (await 운영계정수()) <= 1;
    const res = await 낮추기('xfu9-admin2');

    expect(res.statusCode).toBe(마지막인가 ? 409 : 200);
    if (마지막인가) expect(res.json()).toEqual({ error: 'LAST_ADMIN' });
  });

  it('승인 대기 admin 은 운영 계정으로 세지 않는다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved)
            VALUES ('xfu9-pending', '대기', 'x', 'admin', false)`,
    );
    await 계정만들기('xfu9-admin3', 'admin');
    await 낮추기('xfu9-admin2');

    const 마지막인가 = (await 운영계정수()) <= 1;
    const res = await 낮추기('xfu9-admin3');

    expect(res.statusCode).toBe(마지막인가 ? 409 : 200);
    if (마지막인가) expect(res.json()).toEqual({ error: 'LAST_ADMIN' });
  });
});
