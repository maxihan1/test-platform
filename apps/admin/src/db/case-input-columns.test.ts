// 케이스 저장 입력값 표 — 케이스마다 한 벌 · 없는 케이스는 못 가리킨다 (SPEC 공통/4-데이터모델 §6 case_input)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 케이스 = 'XCI-001';

describe.skipIf(연결 === undefined)('case_input 표', () => {
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  const 치우기 = async () => {
    await q('DELETE FROM case_input WHERE tc_id = ANY($1)', [[케이스, 'XCI-999']]);
    await q('DELETE FROM test_case WHERE tc_id = $1', [케이스]);
  };

  beforeAll(async () => {
    await 치우기();
    await q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ($1, 'XCI 표 검사', '["desktop"]', '[]', 'xci/a.spec.ts', '{}', '{}')`,
      [케이스],
    );
  });

  afterAll(치우기);

  it('한 케이스에 한 벌만 둔다', async () => {
    await q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, '{"a":1}', '{}', 'xci')`, [케이스]);
    await expect(
      q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, '{"a":2}', '{}', 'xci')`, [케이스]),
    ).rejects.toThrow('case_input_pkey');
    const r = await q('SELECT saved_at FROM case_input WHERE tc_id = $1', [케이스]);
    expect(r.rows[0]).toHaveProperty('saved_at');
  });

  it('카탈로그에 없는 케이스는 가리키지 못한다', async () => {
    await expect(
      q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ('XCI-999', '{}', '{}', 'xci')`),
    ).rejects.toThrow('case_input_tc_id_fkey');
  });
});
