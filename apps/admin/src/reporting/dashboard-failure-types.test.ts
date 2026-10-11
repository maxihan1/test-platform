// 앱 대시보드 「실패 유형」 질의 검사 — 원인 재료를 SQL 이 제대로 싣는지 (도메인/리포팅 §8.12 「실패 유형」). 나누는 규칙 자체는 failureType.test 가 본다
// CI에는 postgres가 없을 수 있다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 대시보드 } from './dashboardResults.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('대시보드 실패 유형 질의', () => {
  let pool: Pool;
  let F = 0;

  async function 치우기(): Promise<void> {
    const 서비스들 = (await pool.query<{ id: string }>(`SELECT id FROM service WHERE prefix = 'XDQF'`)).rows.map((r) => Number(r.id));
    if (서비스들.length === 0) return;
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [서비스들]);
  }

  async function 실행(시간전: number): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, started_at, finished_at)
       VALUES ('XDQF 유형', 'xdq', 'qa', 'FINISHED', $1, 'XDQF 실패 유형', '', '', 'UI',
               now() - $2::double precision * interval '1 hour', now() - $2::double precision * interval '1 hour' + interval '5 minutes')
       RETURNING run_id`,
      [F, 시간전],
    );
    return Number(r.rows[0]!.run_id);
  }

  async function 항목(
    runId: number,
    tcId: string,
    status: string,
    옵션: { attempt?: number; 오류?: string; 절차오류?: string; 검증실패?: boolean } = {},
  ): Promise<void> {
    const { attempt = 1, 오류, 절차오류, 검증실패 = false } = 옵션;
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema, status, duration_ms, error, finished_at)
       VALUES ($1, $2, 'desktop', $3, $2, 'x.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $4, 100, $5, now())
       RETURNING history_id`,
      [runId, tcId, attempt, status, 오류 === undefined ? null : JSON.stringify({ message: 오류 })],
    );
    if (절차오류 === undefined && !검증실패) return;
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, error) VALUES ($1, 1, '단계', 'FAIL', 10, $2, $3)`,
      [
        Number(r.rows[0]!.history_id),
        JSON.stringify(검증실패 ? [{ statement: 'XDQF 합계가 맞다', status: 'FAIL', actual: 1, expected: 2 }] : []),
        절차오류 === undefined ? null : JSON.stringify({ message: 절차오류 }),
      ],
    );
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치우기();
    F = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XDQF', 'XDQF 실패 유형', '#445566', '', 'xdqf') RETURNING id`,
        )
      ).rows[0]!.id,
    );
    const 이번 = await 실행(3);
    await 항목(이번, 'XDQF-001', 'NA', {
      오류: '\u001b[31mTest timeout of 30000ms exceeded.\u001b[39m',
      절차오류: "locator.click: Test timeout of 30000ms exceeded.\nCall log:\n  - waiting for getByText('러너 상태')",
    });
    await 항목(이번, 'XDQF-002', 'NA', { 오류: 'ABORTED' });
    await 항목(이번, 'XDQF-003', 'NA', { 오류: '러너에 닿지 못했습니다' });
    await 항목(이번, 'XDQF-004', 'NA', { attempt: 1, 오류: 'TIMEOUT' });
    await 항목(이번, 'XDQF-004', 'FAIL', { attempt: 2, 검증실패: true });
    await 항목(이번, 'XDQF-005', 'PASS');
    const 직전창 = await 실행(20 * 24);
    await 항목(직전창, 'XDQF-001', 'FAIL', { 오류: 'page.goto: net::ERR_CONNECTION_REFUSED' });
  });

  afterAll(async () => {
    await 치우기();
    await pool.end();
  });

  it('이번 창 실패 · 미실행을 원인으로 나누고 멈춘 것은 따로 센다 — 직전 창은 안 센다', async () => {
    const 결과 = await 대시보드('UTC', [F], []);
    expect(Object.fromEntries(결과.failureTypes.types.map((t) => [t.type, [t.fail, t.notRun]]))).toEqual({
      mismatch: [1, 0],
      notFound: [0, 1],
      timeout: [0, 0],
      environment: [0, 1],
      other: [0, 0],
    });
    expect(결과.failureTypes.stopped).toBe(1);
  });

  it('유형 합계가 통과율 칸의 실패 · 미실행 수와 같다 — 멈춘 것은 미실행 쪽에 따로 있다', async () => {
    const 결과 = await 대시보드('UTC', [F], []);
    const 합 = (칸: 'fail' | 'notRun') => 결과.failureTypes.types.reduce((n, t) => n + t[칸], 0);
    expect(합('fail')).toBe(결과.passRate.current.fail);
    expect(합('notRun') + 결과.failureTypes.stopped).toBe(결과.passRate.current.notRun);
  });
});
