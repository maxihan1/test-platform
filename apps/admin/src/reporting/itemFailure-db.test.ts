import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findItem } from '../execution/queries.js';
import { compareWithPrevious } from './insights.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실패 항목의 유형과 한 줄', () => {
  let pool: Pool;
  let 서비스: number;
  let 실행: number;
  const 번호: Record<string, number> = {};

  async function 지운다(): Promise<void> {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  }

  async function 항목(
    키: string,
    tcId: string,
    platform: string,
    attempt: number,
    status: string,
    error: string | null,
    실패확인?: string,
  ): Promise<void> {
    const row = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, error, finished_at)
       VALUES ($1, $2, $3, $4, $2, 'xfy/a.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $5, 100, $6, now())
       RETURNING history_id`,
      [실행, tcId, platform, attempt, status, error === null ? null : JSON.stringify({ message: error })],
    );
    번호[키] = Number(row.rows[0]!.history_id);
    if (실패확인 !== undefined) {
      await pool.query(
        `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions)
         VALUES ($1, 1, '주문한다', 'FAIL', 10, $2)`,
        [번호[키], JSON.stringify([{ statement: 실패확인, status: 'FAIL', actual: 1, expected: 2 }])],
      );
    }
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await pool.query("DELETE FROM service WHERE prefix = 'XFY'");
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XFY', 'XFY 서비스', '#445566', 'https://github.com/example/xfy-tests', 'xfy') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ('XFY 실행', 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com', $1, 'XFY 서비스',
               'https://github.com/example/xfy-tests', '2026-10-19T01:00:00Z')
       RETURNING run_id`,
      [서비스],
    );
    실행 = Number(r.rows[0]!.run_id);

    await 항목('1pc', 'XFY-001', 'desktop', 1, 'FAIL', 'Error: expect(received)', '주문 수가 늘어난다');
    await 항목('1mo', 'XFY-001', 'mobile', 1, 'FAIL', "\u001b[2m\nTest timeout of 30000ms exceeded.\n waiting for getByRole('button')");
    await 항목('2mo1', 'XFY-002', 'mobile', 1, 'FAIL', 'TimeoutError: Timeout 5000ms exceeded.');
    await 항목('2mo2', 'XFY-002', 'mobile', 2, 'FAIL', "waiting for getByRole('link')");
    await 항목('3pc', 'XFY-003', 'desktop', 1, 'PASS', null);
    await 항목('4pc', 'XFY-004', 'desktop', 1, 'NA', 'ABORTED');
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('항목 상세가 유형과 한 줄을 싣는다 — 확인 문장이 있으면 그 문장, 없으면 색 코드를 걷은 오류 첫 줄', async () => {
    expect((await findItem(실행, 번호['1pc']!))?.failure).toEqual({ type: 'mismatch', reason: '주문 수가 늘어난다' });
    expect((await findItem(실행, 번호['1mo']!))?.failure).toEqual({
      type: 'notFound',
      reason: 'Test timeout of 30000ms exceeded.',
    });
  });

  it('통과 항목과 멈춰 닫힌 미실행은 이유가 없다', async () => {
    expect((await findItem(실행, 번호['3pc']!))?.failure).toBeNull();
    expect((await findItem(실행, 번호['4pc']!))?.failure).toBeNull();
  });

  it('실패 케이스를 첫 실패 디바이스 · 처음 실패한 회차의 유형 하나로 묶는다', async () => {
    expect((await compareWithPrevious(실행)).실패유형들).toEqual([
      { type: 'mismatch', count: 1, tcIds: ['XFY-001'] },
      { type: 'timeout', count: 1, tcIds: ['XFY-002'] },
    ]);
  });
});
