// 직전 실행과 견주기의 미확정 검사 — 판정·실패덩어리에서 빼되 「빠진 건수」로 세지 않는다 (도메인/리포팅 §7 insights · 실행 §3.2)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다. fixture 접두사 XDV — 자기 것만 지운다 (CLAUDE.md §3)
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { compareWithPrevious } from './insights.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('직전 실행과 견주기 — 미확정', () => {
  let pool: Pool;
  let 이번 = 0;

  async function 지운다(): Promise<void> {
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XDV%')");
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XDV%'");
    await pool.query("DELETE FROM service WHERE prefix = 'XDV'");
  }

  async function 실행(title: string, startedAt: string): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ($1, 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com',
               (SELECT id FROM service WHERE prefix = 'XDV'), 'XDV 서비스', 'https://github.com/example/xdv', $2)
       RETURNING run_id`,
      [title, startedAt],
    );
    return Number(r.rows[0]!.run_id);
  }

  async function 항목(runId: number, tcId: string, status: string, 미확정: string | null, 오류: string | null = null) {
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, error, finished_at, unconfirmed)
       VALUES ($1, $2, 'desktop', 1, $3, 'xdv/x.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $4, 100, $5, now(), $6)`,
      [runId, tcId, `${tcId} 케이스`, status, 오류 === null ? null : JSON.stringify({ message: 오류 }), 미확정],
    );
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XDV', 'XDV 서비스', '#334455', 'https://github.com/example/xdv', 'xdv')`,
    );
    const 앞 = await 실행('XDV 앞', '2026-09-25T01:00:00Z');
    이번 = await 실행('XDV 이번', '2026-09-26T01:00:00Z');
    await 항목(앞, 'XDV-001', 'FAIL', null);
    await 항목(이번, 'XDV-001', 'FAIL', '기획서와 다름 D1', '미확정 실패');
    await 항목(앞, 'XDV-002', 'PASS', '화면에만 D2');
    await 항목(이번, 'XDV-002', 'FAIL', null, '확정된 뒤 실패');
    await 항목(앞, 'XDV-003', 'PASS', null);
    await 항목(이번, 'XDV-003', 'FAIL', null, '확정 실패');
    await 항목(앞, 'XDV-004', 'PASS', null);
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
  });

  it('이번에 미확정인 케이스는 판정에도 「빠진 건수」에도 안 든다', async () => {
    const 결과 = await compareWithPrevious(이번);
    expect(결과.케이스들.map((c) => c.tcId)).not.toContain('XDV-001');
    expect(결과.빠진건수).toBe(1);
  });

  it('직전만 미확정이었던 케이스는 새 케이스처럼 견주지 않는다', async () => {
    const 결과 = await compareWithPrevious(이번);
    expect(결과.케이스들.map((c) => c.tcId)).not.toContain('XDV-002');
  });

  it('확정끼리는 그대로 견준다', async () => {
    const 결과 = await compareWithPrevious(이번);
    expect(결과.케이스들).toEqual([{ tcId: 'XDV-003', tcName: 'XDV-003 케이스', platform: 'desktop', 판정: '새로깨짐' }]);
  });

  it('실패덩어리에 미확정 실패가 안 든다', async () => {
    const 결과 = await compareWithPrevious(이번);
    expect(결과.실패덩어리들.map((d) => d.대표문장).sort()).toEqual(['확정 실패', '확정된 뒤 실패']);
  });
});
