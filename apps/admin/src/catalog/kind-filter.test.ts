// 케이스 목록 · 엑셀이 종류(UI · 기능)로 거르는지 본다 (SPEC 도메인/카탈로그 §7 `?kind=` · PR #132)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 종류읽기 } from './routes.js';
import { listCases } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XCK-001', 'XCK-FN-002', 'XCK-UI-001'];

describe('종류읽기', () => {
  it('ui · fn 만 종류이고 없거나 모르면 거르지 않는다', () => {
    expect(['ui', 'fn', undefined, 'UI', 'x'].map(종류읽기)).toEqual(['UI', 'FN', undefined, undefined, undefined]);
  });
});

describe.skipIf(연결 === undefined)('케이스 목록의 종류 거르기', () => {
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  beforeAll(async () => {
    for (const tcId of 번호들) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1, '["desktop"]', '[]', 'xck/' || $1 || '.spec.ts', '{}', '{}')
         ON CONFLICT (tc_id) DO UPDATE SET is_active = true`,
        [tcId],
      );
    }
  });

  afterAll(async () => {
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
  });

  const 목록 = async (kind?: 'UI' | 'FN') =>
    (await listCases({ service: 'XCK', q: '', activeOnly: true, page: 1, pageSize: 50, kind })).items.map((c) => c.tcId);

  it('UI 는 -UI- 번호만 · FN 은 옛 꼴과 -FN- · 없으면 둘 다', async () => {
    expect(await 목록('UI')).toEqual(['XCK-UI-001']);
    expect(await 목록('FN')).toEqual(['XCK-001', 'XCK-FN-002']);
    expect(await 목록()).toEqual(['XCK-001', 'XCK-FN-002', 'XCK-UI-001']);
  });
});
