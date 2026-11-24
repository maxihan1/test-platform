import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findItem, findRun } from '../execution/queries.js';
import { compareWithPrevious } from './insights.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실패 항목의 유형과 한 줄', () => {
  let pool: Pool;
  let 서비스: number;
  let 실행: number;
  let 실행2: number;
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
    대상 = 실행,
  ): Promise<void> {
    const row = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, error, finished_at)
       VALUES ($1, $2, $3, $4, $2, 'xfy/a.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $5, 100, $6, now())
       RETURNING history_id`,
      [대상, tcId, platform, attempt, status, error === null ? null : JSON.stringify({ message: error })],
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
    // 둘째 실행은 첫째보다 늦게 시작해 견주기의 직전 실행이 되지 않는다 — 위 견주기 검사를 안 흔든다
    const 둘째 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ('XFY 둘째', 'tester', '홍길동', 'FINISHED', 'qa2', 'https://qa.example.com', $1, 'XFY 서비스',
               'https://github.com/example/xfy-tests', '2026-10-19T03:00:00Z')
       RETURNING run_id`,
      [서비스],
    );
    실행2 = Number(둘째.rows[0]!.run_id);
    await 항목('5pc', 'XFY-005', 'desktop', 1, 'FAIL', null, '옛 결과의 확인', 실행2);
    await 항목('6pc', 'XFY-006', 'desktop', 1, 'NA', 'BLOCKED', undefined, 실행2);
    const 한건 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, status, env, base_url, service_id, service_name, tests_repo, started_at, origin, rerun_of, finished_at)
       VALUES ('XFY 한 건', 'tester', 'FINISHED', 'qa', 'https://qa.example.com', $1, 'XFY 서비스', 'https://github.com/example/xfy-tests',
               '2026-10-19T02:00:00Z', 'SINGLE', $2, now()) RETURNING run_id`,
      [서비스, 실행2],
    );
    const 덮은 = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, finished_at)
       VALUES ($1, 'XFY-005', 'desktop', 1, 'XFY-005', 'xfy/a.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', 'FAIL', 100, now()) RETURNING history_id`,
      [Number(한건.rows[0]!.run_id)],
    );
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions) VALUES ($1, 1, '다시 한다', 'FAIL', 10, $2)`,
      [Number(덮은.rows[0]!.history_id), JSON.stringify([{ statement: '덮은 뒤의 확인', status: 'FAIL', actual: 1, expected: 2 }])],
    );
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('항목 상세가 유형과 한 줄을 싣는다 — 확인 문장이 있으면 그 문장, 없으면 오류 첫 줄 · 한글 없는 원문이면 유형 문장', async () => {
    expect((await findItem(실행, 번호['1pc']!))?.failure).toEqual({ type: 'mismatch', reason: '주문 수가 늘어난다' });
    expect((await findItem(실행, 번호['1mo']!))?.failure).toEqual({
      type: 'notFound',
      reason: "요소를 찾지 못했습니다 — getByRole('button')",
    });
  });

  it('통과 항목과 멈춰 닫힌 미실행은 이유가 없다', async () => {
    expect((await findItem(실행, 번호['3pc']!))?.failure).toBeNull();
    expect((await findItem(실행, 번호['4pc']!))?.failure).toBeNull();
  });

  it('실행 조회의 항목 줄은 끝난 Fail 줄에만 항목 상세와 같은 이유를 싣는다 — 통과 · 멈춘 줄 · Blocked 는 null 이고 한 건 실행이 덮은 줄은 덮은 뒤의 이유다', async () => {
    const 줄들 = new Map([...(await findRun(실행))!.items, ...(await findRun(실행2))!.items].map((i) => [i.tcId + i.platform, i.failure]));
    expect(줄들.get('XFY-001desktop')).toEqual({ type: 'mismatch', reason: '주문 수가 늘어난다' });
    expect(줄들.get('XFY-001desktop')).toEqual((await findItem(실행, 번호['1pc']!))?.failure);
    expect(줄들.get('XFY-001mobile')).toEqual({ type: 'notFound', reason: "요소를 찾지 못했습니다 — getByRole('button')" });
    expect(줄들.get('XFY-003desktop')).toBeNull();
    expect(줄들.get('XFY-004desktop')).toBeNull();
    expect(줄들.get('XFY-006desktop')).toBeNull();
    expect(줄들.get('XFY-005desktop')).toEqual({ type: 'mismatch', reason: '덮은 뒤의 확인' });
  });

  it('도는 실행은 Fail 줄에도 이유를 싣지 않고 끝나면 다시 싣는다 — 화면이 2초마다 읽는 통로라 줄마다 절차를 읽지 않는다', async () => {
    const 이유 = async () => new Map((await findRun(실행))!.items.map((i) => [i.tcId + i.platform, i.failure]));
    await pool.query("UPDATE test_run SET status = 'RUNNING' WHERE run_id = $1", [실행]);
    try {
      expect((await 이유()).get('XFY-001desktop')).toBeNull();
    } finally {
      await pool.query("UPDATE test_run SET status = 'FINISHED' WHERE run_id = $1", [실행]);
    }

    expect((await 이유()).get('XFY-001desktop')).toEqual({ type: 'mismatch', reason: '주문 수가 늘어난다' });
  });

  it('실패 케이스를 첫 실패 디바이스 · 처음 실패한 회차의 유형 하나로 묶는다', async () => {
    expect((await compareWithPrevious(실행)).실패유형들).toEqual([
      { type: 'mismatch', count: 1, tcIds: ['XFY-001'] },
      { type: 'timeout', count: 1, tcIds: ['XFY-002'] },
    ]);
  });
});
