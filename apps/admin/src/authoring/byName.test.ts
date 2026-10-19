// 보류 입력 · 겹침 결정의 「한 사람」을 아이디에서 계정 이름으로 바꾸는 도우미 검사.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 입력자이름으로 } from './byName.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('입력자이름으로', () => {
  const pool = async () => (await import('../db/index.js')).pool;

  beforeAll(async () => {
    await (await pool()).query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ('xnm-a', '맥시', 'x', 'member', 'read', true, false)`,
    );
  });

  afterAll(async () => {
    await (await pool()).query("DELETE FROM app_user WHERE username = 'xnm-a'");
  });

  it('계정이 있으면 이름으로, 없거나 비었으면 그대로 둔다', async () => {
    const 입력 = [
      { action: 'KEEP', by: 'xnm-a', at: 't' },
      { action: 'DROP', by: 'xnm-gone', at: 't' },
      { action: 'KEEP', by: '', at: 't' },
      null,
    ];
    expect(await 입력자이름으로(입력)).toEqual([
      { action: 'KEEP', by: '맥시', at: 't' },
      { action: 'DROP', by: 'xnm-gone', at: 't' },
      { action: 'KEEP', by: '', at: 't' },
      null,
    ]);
  });

  it('입력이 없으면 DB 를 보지 않는다', async () => {
    expect(await 입력자이름으로([null])).toEqual([null]);
  });
});
