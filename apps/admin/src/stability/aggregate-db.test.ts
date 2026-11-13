// 안정화 웹 집계 — 그날 묶음 · 분모 · 예외 축 · 메아리 · 상태 차례 · 해결 확인 · 건너뛰기 · 견본 셋 · 빠진 집계 (DB 접속이 있을 때만 돈다)
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 기준세트세우기, 기준세트지우기 } from './schedFixture.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('안정화 웹 집계', () => {
  let pool: Pool;
  let 서비스 = 0;

  const 치우기 = async (): Promise<void> => {
    // run_trace · run_network · run_console 은 run_item 과, stab_* 는 service 와 같이 지워진다
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_error WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XAG', 'XAG 안정화 집계 검사용', '#3A5FCD', '', 'xag')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    await 기준세트지우기(pool, 서비스);
    await 기준세트세우기(pool, 서비스);
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    await 기준세트지우기(pool, 서비스);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  async function 실행(env: string, kind: 'UI' | 'FN', 시작: string, status = 'FINISHED'): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, origin, started_at, finished_at)
       VALUES ('XAG 정기', 'XAG', '', '스케줄러', $1, 'https://qa.xag.test', $2, $3, $4, 'SCHEDULED', $5, $5::timestamptz + interval '1 hour')
       RETURNING run_id`,
      [env, status, 서비스, kind, 시작],
    );
    return Number(r.rows[0]!.run_id);
  }

  async function 항목(runId: number, tcId: string, status: string, trace: 'DONE' | 'NONE' | null = 'DONE'): Promise<number> {
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected,
                             param_schema, expected_schema, status, duration_ms, finished_at)
            VALUES ($1, $2, 'desktop', $2, 'xag.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', $3, 1000, now())
         RETURNING history_id`,
      [runId, tcId, status],
    );
    const h = Number(r.rows[0]!.history_id);
    if (trace !== null) await pool.query('INSERT INTO run_trace (history_id, status) VALUES ($1, $2)', [h, trace]);
    return h;
  }

  let 차례 = 0;
  const 화면 = (h: number, 경로: string, atMs = 10) =>
    pool.query(`INSERT INTO run_network (history_id, ord, seq, at_ms, method, url, status, resource_type) VALUES ($1, $2, 1, $3, 'GET', $4, 200, 'document')`, [
      h,
      ++차례,
      atMs,
      `https://qa.xag.test${경로}`,
    ]);
  const 콘솔 = (h: number, level: string, text: string, atMs = 100) =>
    pool.query('INSERT INTO run_console (history_id, ord, seq, at_ms, level, text, url) VALUES ($1, $2, 2, $3, $4, $5, NULL)', [h, ++차례, atMs, level, text]);
  const 요청 = (h: number, method: string, 경로: string, status: number) =>
    pool.query(`INSERT INTO run_network (history_id, ord, seq, at_ms, method, url, status, resource_type) VALUES ($1, $2, 2, 50, $3, $4, $5, 'fetch')`, [
      h,
      ++차례,
      method,
      `https://qa.xag.test${경로}`,
      status,
    ]);

  const 집계 = async (runId: number) => (await import('./aggregate.js')).집계한다(runId, 0, 1);
  const 집계줄 = async (runId: number) => (await pool.query('SELECT * FROM stab_run WHERE run_id = $1', [runId])).rows[0];
  const 상태들 = async (runId: number) =>
    Object.fromEntries(
      (
        await pool.query<{ title: string; state: string; cases: number; prev_resolved_at: Date | null }>(
          'SELECT e.title, x.state, x.cases, x.prev_resolved_at FROM stab_run_error x JOIN stab_error e ON e.id = x.error_id WHERE x.run_id = $1',
          [runId],
        )
      ).rows.map((r) => [r.title, { state: r.state, cases: r.cases, 재발전해결: r.prev_resolved_at !== null }]),
    );

  it('그날 UI · 기능 실행을 둘 다 끝난 뒤 한 번에 집계하고 예외 축 · 메아리 · 기록 없음을 뺀다', async () => {
    const ui = await 실행('qa', 'UI', '2001-03-10T18:00:00Z');
    const fn = await 실행('qa', 'FN', '2001-03-10T18:00:05Z', 'RUNNING');
    const u1 = await 항목(ui, 'XAG-UI-001', 'PASS');
    await 화면(u1, '/home');
    await 콘솔(u1, 'pageerror', "TypeError: Cannot read properties of undefined (reading 'id')\n    at a (https://qa.xag.test/main.js:1:2)");
    const f1 = await 항목(fn, 'XAG-FN-001', 'PASS');
    await 요청(f1, 'GET', '/api/items/12', 500);
    await 콘솔(f1, 'error', 'Failed to load resource: the server responded with a status of 500 ()');
    const f2 = await 항목(fn, 'XAG-FN-002', 'FAIL');
    await 화면(f2, '/home');
    await 요청(f2, 'POST', '/api/login', 401);
    await 콘솔(f2, 'pageerror', "TypeError: Cannot read properties of undefined (reading 'name')");
    await 항목(fn, 'XAG-FN-003', 'PASS', 'NONE');
    await pool.query("INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XAG-REQ-1', 'XAG-FN-002', '예외'), ($1, 'XAG-REQ-1', 'XAG-FN-002', '정상')", [서비스]);

    expect(await 집계(ui)).toBe('기다림');
    await pool.query("UPDATE test_run SET status = 'FINISHED' WHERE run_id = $1", [fn]);
    expect(await 집계(fn)).toBe('집계함');
    expect(await 집계(ui)).toBe('건너뜀');

    expect(await 집계줄(ui)).toBeUndefined();
    expect(await 집계줄(fn)).toMatchObject({
      env: 'qa',
      cases: 3,
      error_cases: 3,
      pass_error_cases: 2,
      crashes: null,
      residual: 2,
      new_errors: 2,
      resolved: 0,
      confirmed: 0,
    });
    expect(new Date((await 집계줄(fn)).day).getDate()).toBe(11);
    // 같은 트랜잭션에서 AI 실행 요약 일을 세운다
    expect((await pool.query('SELECT kind, status, input, created_by, run_id FROM perf_ai_job WHERE id = $1', [(await 집계줄(fn)).ai_job_id])).rows).toEqual([
      { kind: 'STAB_SUMMARY', status: 'QUEUED', input: { runId: fn }, created_by: '스케줄러', run_id: null },
    ]);
    expect(await 상태들(fn)).toEqual({
      "TypeError · Cannot read properties of undefined (reading '*')": { state: 'NEW', cases: 2, 재발전해결: false },
      'HTTP 500 · GET /api/items/:n': { state: 'NEW', cases: 1, 재발전해결: false },
    });
    const 발생 = (await pool.query('SELECT tc_id, item_status, seq, hits FROM stab_occurrence WHERE run_id = $1 ORDER BY tc_id', [fn])).rows;
    expect(발생).toEqual([
      { tc_id: 'XAG-FN-001', item_status: 'PASS', seq: 2, hits: 1 },
      { tc_id: 'XAG-FN-002', item_status: 'FAIL', seq: 2, hits: 1 },
      { tc_id: 'XAG-UI-001', item_status: 'PASS', seq: 2, hits: 1 },
    ]);
    const 첫 = (await pool.query('SELECT first_run_id, first_day FROM stab_error WHERE service_id = $1 AND env = $2', [서비스, 'qa'])).rows;
    expect(첫.every((r) => Number(r.first_run_id) === fn)).toBe(true);
  });

  it('다음 날 — 늘면 증가 · 시작 전 해결은 재발 · 안 남은 해결은 해결 확인 · 실행 중 해결은 그대로', async () => {
    const 첫날 = await 실행('qa2', 'FN', '2001-04-01T18:00:00Z');
    for (const [tc, 글] of [['XAG-FN-001', 'Error: A'], ['XAG-FN-002', 'Error: B'], ['XAG-FN-003', 'Error: C'], ['XAG-FN-004', 'Error: D']] as const) {
      await 콘솔(await 항목(첫날, tc, 'PASS'), 'pageerror', 글);
    }
    expect(await 집계(첫날)).toBe('집계함');

    const 둘째시작 = '2001-04-02T18:00:00Z';
    const 해결 = (글: string, 때: string) =>
      pool.query("UPDATE stab_error SET resolved_at = $3, resolved_by = 'xag' WHERE service_id = $1 AND env = 'qa2' AND message = $2", [서비스, 글, 때]);
    await 해결('Error: B', '2001-04-02T17:00:00Z');
    await 해결('Error: C', '2001-04-02T17:00:00Z');
    await 해결('Error: D', '2001-04-02T18:10:00Z');

    const 둘째 = await 실행('qa2', 'FN', 둘째시작);
    for (const [tc, 글] of [['XAG-FN-001', 'Error: A'], ['XAG-FN-005', 'Error: A'], ['XAG-FN-002', 'Error: B'], ['XAG-FN-004', 'Error: D']] as const) {
      await 콘솔(await 항목(둘째, tc, 'PASS'), 'pageerror', 글);
    }
    await 항목(둘째, 'XAG-FN-003', 'PASS');
    expect(await 집계(둘째)).toBe('집계함');

    expect(await 상태들(둘째)).toEqual({
      '콘솔 오류 · Error: A': { state: 'UP', cases: 2, 재발전해결: false },
      '콘솔 오류 · Error: B': { state: 'REOPENED', cases: 1, 재발전해결: true },
      '콘솔 오류 · Error: D': { state: 'ONGOING', cases: 1, 재발전해결: false },
    });
    expect(await 집계줄(둘째)).toMatchObject({ cases: 5, residual: 3, new_errors: 0, resolved: 1, confirmed: 1 });
    const 종류 = Object.fromEntries(
      (
        await pool.query<{ message: string; resolved_at: Date | null; confirmed_run_id: string | null }>(
          "SELECT message, resolved_at, confirmed_run_id FROM stab_error WHERE service_id = $1 AND env = 'qa2'",
          [서비스],
        )
      ).rows.map((r) => [r.message, { 해결: r.resolved_at !== null, 확인: r.confirmed_run_id === null ? null : Number(r.confirmed_run_id) }]),
    );
    expect(종류).toEqual({
      'Error: A': { 해결: false, 확인: null },
      'Error: B': { 해결: false, 확인: null },
      'Error: C': { 해결: true, 확인: 둘째 },
      'Error: D': { 해결: true, 확인: null },
    });
  });

  it('중단이 섞인 날은 건너뛰고 뒤 묶음이 먼저 집계됐으면 앞 묶음을 끼우지 않는다', async () => {
    await 실행('qa3', 'UI', '2001-05-01T18:00:00Z');
    const 끊긴 = await 실행('qa3', 'FN', '2001-05-01T18:00:05Z', 'ABORTED');
    expect(await 집계(끊긴)).toBe('건너뜀');

    const 앞 = await 실행('qa3', 'FN', '2001-05-02T18:00:00Z');
    const 뒤 = await 실행('qa3', 'FN', '2001-05-03T18:00:00Z');
    await 항목(앞, 'XAG-FN-001', 'PASS');
    await 항목(뒤, 'XAG-FN-001', 'PASS');
    expect(await 집계(뒤)).toBe('집계함');
    expect(await 집계(앞)).toBe('건너뜀');
    expect(await 집계줄(앞)).toBeUndefined();
    expect(await 집계줄(끊긴)).toBeUndefined();
  });

  it('견본은 이번 묶음 것을 앞에 두고 가장 최근 셋만 남긴다', async () => {
    const 첫 = await 실행('qa4', 'FN', '2001-06-01T18:00:00Z');
    await 콘솔(await 항목(첫, 'XAG-FN-001', 'PASS'), 'pageerror', 'Error: E', 100);
    await 콘솔(await 항목(첫, 'XAG-FN-002', 'PASS'), 'pageerror', 'Error: E', 200);
    expect(await 집계(첫)).toBe('집계함');
    const 둘 = await 실행('qa4', 'FN', '2001-06-02T18:00:00Z');
    await 콘솔(await 항목(둘, 'XAG-FN-003', 'PASS'), 'pageerror', 'Error: E', 100);
    await 콘솔(await 항목(둘, 'XAG-FN-004', 'PASS'), 'pageerror', 'Error: E', 200);
    expect(await 집계(둘)).toBe('집계함');

    const 견본 = (
      await pool.query<{ ord: number; run_id: string; tc_id: string }>(
        "SELECT s.ord, s.run_id, s.tc_id FROM stab_sample s JOIN stab_error e ON e.id = s.error_id WHERE e.service_id = $1 AND e.env = 'qa4' ORDER BY s.ord",
        [서비스],
      )
    ).rows.map((r) => [r.ord, Number(r.run_id), r.tc_id]);
    expect(견본).toEqual([
      [1, 둘, 'XAG-FN-004'],
      [2, 둘, 'XAG-FN-003'],
      [3, 첫, 'XAG-FN-002'],
    ]);
  });

  it('trace 상태 줄이 끝내 안 서는 항목은 풀 일이 줄에 없으면 상한까지 안 기다리고 기록 없음으로 센다', async () => {
    const 실 = await 실행('qa6', 'FN', '2001-08-01T18:00:00Z');
    await 콘솔(await 항목(실, 'XAG-FN-001', 'PASS'), 'pageerror', 'TypeError: F');
    await 항목(실, 'XAG-FN-002', 'NA', null);
    const 앞 = Date.now();
    expect(await (await import('./aggregate.js')).집계한다(실, 60_000, 10)).toBe('집계함');
    expect(Date.now() - 앞).toBeLessThan(10_000);
    expect(await 집계줄(실)).toMatchObject({ cases: 1, residual: 1 });
  });

  it('다시 켜질 때 24시간 안에 끝난 정기 실행 중 자기 묶음의 집계 줄이 없는 것만 고른다', async () => {
    const 두시간전 = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const 최근 = await 실행('qa7', 'FN', 두시간전);
    const 오래된 = await 실행('qa7', 'FN', '2001-07-01T18:00:00Z');
    const 앞실행 = await 실행('qa8', 'UI', 두시간전);
    const 뒤실행 = await 실행('qa8', 'FN', 두시간전);
    await pool.query(
      "INSERT INTO stab_run (run_id, service_id, env, day, cases, error_cases, pass_error_cases, residual, new_errors, resolved, confirmed) VALUES ($1, $2, 'qa8', '2001-07-01', 0, 0, 0, 0, 0, 0, 0)",
      [뒤실행, 서비스],
    );

    const 후보 = await (await import('./aggregate.js')).빠진집계후보();
    expect(후보).toContain(최근);
    expect(후보).not.toContain(오래된);
    expect(후보).not.toContain(앞실행);
    expect(후보).not.toContain(뒤실행);
  });
});
