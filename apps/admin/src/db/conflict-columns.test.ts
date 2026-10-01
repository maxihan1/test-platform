// 반영 때 겹친 케이스에 사람이 고른 것(남긴다 · 뺀다)을 담는 칸 (SPEC 도메인/작성 「★ 반영 때 겹침 검사」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XCN';

describe.skipIf(연결 === undefined)('겹침 결정 칸', () => {
  let 서비스 = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xcn')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 겹침 결정 칸 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('새 요청의 결정 칸은 비어 있다', async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ conflict_input: unknown }>(
      `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', 'xcn', '검사', 'PENDING')
       RETURNING conflict_input`,
      [서비스],
    );
    expect(r.rows[0]!.conflict_input).toBeNull();
  });

  it('케이스마다 고른 것을 JSON 으로 담고 그대로 읽는다', async () => {
    const { pool } = await import('../db/index.js');
    const 고른것 = { 'XCN-001': { action: 'KEEP', by: 'xcn', at: '2026-10-01T00:00:00.000Z' } };
    const r = await pool.query<{ conflict_input: unknown }>(
      `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status, conflict_input)
       VALUES ($1, 'AUTHOR', 'xcn', '검사', 'PENDING', $2)
       RETURNING conflict_input`,
      [서비스, JSON.stringify(고른것)],
    );
    expect(r.rows[0]!.conflict_input).toEqual(고른것);
  });
});
