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
    const 서비스 = (await q("SELECT id FROM service WHERE prefix = 'XCK'")).rows.map((r) => r.id);
    await q('DELETE FROM req_case WHERE service_id = ANY($1)', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = ANY($1)', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q("DELETE FROM service WHERE prefix = 'XCK'");
  });

  const 목록 = async (kind?: 'UI' | 'FN') =>
    (await listCases({ service: 'XCK', q: '', activeOnly: true, page: 1, pageSize: 50, kind })).items.map((c) => c.tcId);

  it('UI 는 -UI- 번호만 · FN 은 옛 꼴과 -FN- · 없으면 둘 다', async () => {
    expect(await 목록('UI')).toEqual(['XCK-UI-001']);
    expect(await 목록('FN')).toEqual(['XCK-001', 'XCK-FN-002']);
    expect(await 목록()).toEqual(['XCK-001', 'XCK-FN-002', 'XCK-UI-001']);
  });

  it('미확정 요약도 종류를 따른다 — UI 목록 부제에 기능 미확정이 섞이지 않는다', async () => {
    const 서비스 = (await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XCK', 'XCK 종류 거르기 검사용', '#888888', '', 'xck') RETURNING id`,
    )).rows[0].id;
    const 항목 = [{ reqId: 'XCK-REQ-001', feature: '기능', text: '확인 필요', basis: [{ from: '기획서.docx', quote: '인용' }], status: 'NEEDS_CHECK' }];
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
       VALUES ($1, 1, $2, 1, 'PERSON', 'xck', '검사')`,
      [서비스, JSON.stringify(항목)],
    );
    await q("INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XCK-REQ-001', 'XCK-001', '정상')", [서비스]);
    const 셈 = async (kind?: 'UI' | 'FN') =>
      (await listCases({ service: 'XCK', q: '', activeOnly: true, page: 1, pageSize: 50, kind })).unconfirmed.count;
    expect([await 셈('UI'), await 셈('FN'), await 셈()]).toEqual([0, 1, 1]);
  });
});
