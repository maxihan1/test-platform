// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 확인 } from './identify.js';
import { 해시 } from './password.js';
import { 사용자와해시 } from './store.js';

const 연결 = process.env.DATABASE_URL;

function 가짜요청(username: string | undefined) {
  return { session: { get: () => username } };
}

describe.skipIf(연결 === undefined)('확인 함수', () => {
  let 서비스id = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const 서비스 = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XFS1', '인증 검사용', '#445566', 'https://example.com/xfs', 'xfs')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스id = 서비스.rows[0]!.id;

    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, '김확인', $2, 'operator')
       ON CONFLICT (username) DO UPDATE SET is_active = true, password_hash = EXCLUDED.password_hash`,
      ['xfu-live', await 해시('열려라참깨')],
    );
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_active)
            VALUES ($1, '박비활성', $2, 'admin', false)
       ON CONFLICT (username) DO UPDATE SET is_active = false`,
      ['xfu-dead', await 해시('아무거나')],
    );
    await pool.query(
      `INSERT INTO user_service (username, service_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      ['xfu-live', 서비스id],
    );
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu%'`);
    await pool.query(`DELETE FROM service_env WHERE service_id = $1`, [서비스id]);
    await pool.query(`DELETE FROM service WHERE prefix = 'XFS1'`);
  });

  it('세션에 담긴 아이디로 등급과 배정 서비스를 돌려준다', async () => {
    const user = await 확인(가짜요청('xfu-live'));
    expect(user?.username).toBe('xfu-live');
    expect(user?.displayName).toBe('김확인');
    expect(user?.role).toBe('operator');
    expect(user?.services.map((s) => s.prefix)).toEqual(['XFS1']);
  });

  it('세션이 비어 있으면 아무도 아니다', async () => {
    expect(await 확인(가짜요청(undefined))).toBeNull();
    expect(await 확인(가짜요청(''))).toBeNull();
  });

  it('세션이 살아 있어도 계정이 비활성이면 끊긴다', async () => {
    expect(await 확인(가짜요청('xfu-dead'))).toBeNull();
  });

  it('배정받은 서비스가 없으면 빈 목록이다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, '최없음', $2, 'viewer')
       ON CONFLICT (username) DO UPDATE SET is_active = true`,
      ['xfu-none', await 해시('없음')],
    );
    const user = await 확인(가짜요청('xfu-none'));
    expect(user?.services).toEqual([]);
  });

  it('비밀번호 해시는 확인 함수 밖으로 나가지 않는다', async () => {
    const user = await 확인(가짜요청('xfu-live'));
    expect(JSON.stringify(user)).not.toContain('scrypt$');

    const 안쪽 = await 사용자와해시('xfu-live');
    expect(안쪽?.passwordHash.startsWith('scrypt$')).toBe(true);
  });
});
