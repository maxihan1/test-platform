// 기능 테스트 케이스의 설계 기법 목록을 담는 칸 (PR #158 · test_case.techniques)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XCT-FN-001', 'XCT-FN-002'];

describe.skipIf(연결 === undefined)('설계 기법 칸', () => {
  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T>(sql, 값);
  };

  beforeAll(async () => {
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
  });

  afterAll(async () => {
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
  });

  it('text[] · NOT NULL · 기본 빈 목록이다', async () => {
    const r = await q<{ udt_name: string; is_nullable: string; column_default: string | null }>(
      `SELECT udt_name, is_nullable, column_default FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'test_case' AND column_name = 'techniques'`,
    );
    expect(r.rows).toEqual([{ udt_name: '_text', is_nullable: 'NO', column_default: "'{}'::text[]" }]);
  });

  const 넣기 = async (tcId: string, 기법?: string[]) => {
    const r = await q<{ techniques: string[] }>(
      기법 === undefined
        ? `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
           VALUES ($1, $1, '["desktop"]', '[]', 'xct/' || $1 || '.spec.ts', '{}', '{}') RETURNING techniques`
        : `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, techniques)
           VALUES ($1, $1, '["desktop"]', '[]', 'xct/' || $1 || '.spec.ts', '{}', '{}', $2) RETURNING techniques`,
      기법 === undefined ? [tcId] : [tcId, 기법],
    );
    return r.rows[0]!.techniques;
  };

  it('칸을 안 적고 넣은 행은 빈 목록이다', async () => {
    expect(await 넣기('XCT-FN-001')).toEqual([]);
  });

  it('기법 목록을 담고 그대로 읽는다', async () => {
    expect(await 넣기('XCT-FN-002', ['경계값 분석', '동등 분할'])).toEqual(['경계값 분석', '동등 분할']);
  });
});
