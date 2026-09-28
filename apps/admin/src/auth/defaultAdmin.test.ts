// 빈 서버가 기본 계정을 스스로 만드는지 검사 (SPEC 공통/6-인프라 §9.2 · 도메인/인증 §3.5)

import type { PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 기본계정만들기 } from './defaultAdmin.js';
import { 검증 } from './password.js';

const 연결 = process.env.DATABASE_URL;

type 행 = {
  username: string;
  display_name: string;
  password_hash: string;
  role: string;
  is_approved: boolean;
  must_change_password: boolean;
  perm_dashboard: string;
};

// 검사 DB 는 비어 있지 않다 — 진짜 표와 같은 모양의 임시 표로 가려 「빈 서버」를 만든다
describe.skipIf(연결 === undefined)('기본 계정', () => {
  let c: PoolClient;

  beforeEach(async () => {
    const { pool } = await import('../db/index.js');
    c = await pool.connect();
    await c.query('CREATE TEMP TABLE app_user (LIKE public.app_user INCLUDING ALL)');
    await c.query('SET search_path = pg_temp, public');
  });

  afterEach(async () => {
    await c.query('DROP TABLE IF EXISTS pg_temp.app_user');
    await c.query('RESET search_path');
    c.release();
  });

  const 전부 = async (): Promise<행[]> => (await c.query<행>('SELECT * FROM pg_temp.app_user')).rows;

  it('빈 표면 admin 하나를 만들고 true 를 돌려준다', async () => {
    expect(await 기본계정만들기(c)).toBe(true);
    const 행들 = await 전부();
    expect(행들).toHaveLength(1);
    expect(행들[0]).toMatchObject({
      username: 'admin',
      display_name: '운영자',
      role: 'admin',
      is_approved: true,
      must_change_password: true,
      perm_dashboard: 'read',
    });
    expect(await 검증('admin', 행들[0]!.password_hash)).toBe(true);
  });

  it('두 번 불러도 하나뿐이고 두 번째는 false', async () => {
    await 기본계정만들기(c);
    expect(await 기본계정만들기(c)).toBe(false);
    expect(await 전부()).toHaveLength(1);
  });

  it('승인 대기 계정이 하나라도 있으면 만들지 않는다', async () => {
    await c.query(
      `INSERT INTO pg_temp.app_user (username, display_name, password_hash) VALUES ('xfu9p', '대기', 'x')`,
    );
    expect(await 기본계정만들기(c)).toBe(false);
    expect((await 전부()).map((x) => x.username)).toEqual(['xfu9p']);
  });
});
