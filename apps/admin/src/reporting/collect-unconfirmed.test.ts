// 증적 자료의 미확정 사유 검사 — run_item 에 박제된 값을 읽고 케이스가 나중에 확정돼도 그대로다 (도메인/리포팅 「미확정 항목은 꼬리표로 보인다」)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다. fixture 접두사 XDU — 자기 것만 지운다 (CLAUDE.md §3)
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { collectRun } from './collect.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('증적 자료 — 미확정 사유', () => {
  let pool: Pool;
  let 실행 = 0;

  async function 지운다(): Promise<void> {
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XDU%')");
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XDU%'");
    await pool.query("DELETE FROM req_case WHERE service_id IN (SELECT id FROM service WHERE prefix = 'XDU')");
    await pool.query("DELETE FROM prd_version WHERE service_id IN (SELECT id FROM service WHERE prefix = 'XDU')");
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'XDU-%'");
    await pool.query("DELETE FROM service WHERE prefix = 'XDU'");
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XDU', 'XDU 미확정 서비스', '#334455', 'https://github.com/example/xdu-tests', 'xdu')`,
    );
    await pool.query(
      `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema)
       VALUES ('XDU-001', '저장한다', 'xdu/XDU-001.spec.ts', '{}', '{}')`,
    );
    const run = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ('XDU 역방향', 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com',
               (SELECT id FROM service WHERE prefix = 'XDU'), 'XDU 미확정 서비스',
               'https://github.com/example/xdu-tests', '2026-09-26T01:00:00Z')
       RETURNING run_id`,
    );
    실행 = Number(run.rows[0]!.run_id);
    for (const [tc, 사유] of [
      ['XDU-001', '기획서와 다름 — 차이 D1 (작성 요청 7)'],
      ['XDU-002', null],
    ] as const) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                               precondition, params, expected, param_schema, expected_schema,
                               status, duration_ms, finished_at, unconfirmed)
         VALUES ($1, $2, 'desktop', 1, '저장한다', 'xdu/x.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}',
                 'PASS', 100, now(), $3)`,
        [실행, tc, 사유],
      );
    }
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
  });

  it('항목마다 박제된 미확정 사유를 싣고 확정 항목은 null 이다', async () => {
    const 문서 = await collectRun(실행);
    expect(문서?.items.map((i) => [i.tcId, i.unconfirmed])).toEqual([
      ['XDU-001', '기획서와 다름 — 차이 D1 (작성 요청 7)'],
      ['XDU-002', null],
    ]);
  });

  it('요구가 나중에 확정돼도 그날의 증적은 박제값 그대로다 — 리포팅은 표준 기획서를 안 읽는다', async () => {
    const 서비스 = "(SELECT id FROM service WHERE prefix = 'XDU')";
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
       VALUES (${서비스}, 1, $1, 1, 'PERSON', 'xdu', '검사')`,
      [JSON.stringify([{ reqId: 'XDU-REQ-001', feature: '저장', text: '저장', basis: [{ from: '화면', quote: '저장' }], status: 'CONFIRMED', byPerson: true }])],
    );
    await pool.query(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES (${서비스}, 'XDU-REQ-001', 'XDU-001', '정상')`);
    const 문서 = await collectRun(실행);
    expect(문서?.items.find((i) => i.tcId === 'XDU-001')?.unconfirmed).toBe('기획서와 다름 — 차이 D1 (작성 요청 7)');
  });
});
