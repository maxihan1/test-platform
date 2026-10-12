// 실행 남은 시간의 SQL — 항목별 최근 5건 중간값 · 중단 항목 빼기 · 기록 없음 대체 (DB 접속이 있을 때만 돈다)
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실행남은시간', () => {
  let pool: Pool;
  let 서비스 = 0;
  const 앞동시 = process.env.EXECUTION_CONCURRENCY;

  const 시작 = new Date('2026-10-01T00:00:00Z');
  const 끝 = new Date('2026-10-01T00:10:00Z');

  async function 실행(status: string, kind = 'FN'): Promise<number> {
    // 시나리오 실행은 칸 짝 CHECK 때문에 시나리오 버전이 있어야 한다
    let 시나리오: string | null = null;
    if (kind === 'SCENARIO') {
      시나리오 = (await pool.query<{ id: string }>(`INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XET 흐름', 'xet') RETURNING id`, [서비스])).rows[0]!.id;
      await pool.query(`INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xet', '검사')`, [시나리오]);
    }
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, started_at, scenario_id, scenario_version)
            VALUES ('XET 실행', 'XET', '', 'xet', 'qa', 'https://qa.example.com', $1, $2, $3, $4, $5::bigint, CASE WHEN $5::bigint IS NULL THEN NULL ELSE 1 END)
         RETURNING run_id`,
      [status, 서비스, kind, 시작, 시나리오],
    );
    return Number(r.rows[0]!.run_id);
  }

  // 끝난 항목은 durationMs 를 주고, 안 끝난 항목은 비운다. 분전은 시작 시각이다. 끝난 시각은 고정이라 남은 시간을 정확히 겨눈다
  async function 항목(runId: number, tcId: string, 칸: { durationMs?: number; 분전?: number; 회차?: number } = {}): Promise<void> {
    const 끝남 = 칸.durationMs !== undefined;
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema, status,
                             duration_ms, started_at, finished_at)
            VALUES ($1, $2, 'desktop', $7, $2, 'xet.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', 'NA',
                    $3, now() - make_interval(mins => $4::int), CASE WHEN $5::boolean THEN $6::timestamptz ELSE NULL END)`,
      [runId, tcId, 칸.durationMs ?? null, 칸.분전 ?? 0, 끝남, 끝, 칸.회차 ?? 1],
    );
  }

  const 치우기 = async () => {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XET', 'XET 남은 시간 검사용', '#3A5FCD', '', 'xet')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기();
    process.env.EXECUTION_CONCURRENCY = '2';
  });

  afterAll(async () => {
    await 치우기();
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    if (앞동시 === undefined) delete process.env.EXECUTION_CONCURRENCY;
    else process.env.EXECUTION_CONCURRENCY = 앞동시;
  });

  it('지난 기록은 항목마다 최근 5건의 중간값이고 중단(0) 항목은 뺀다. 기록 없는 항목은 이번 평균으로 채운다', async () => {
    const { 실행남은시간 } = await import('./eta.js');
    await 치우기();
    // 오래된 순으로 100~600, 가장 최근에 중단(0) 하나 — 중단을 뺀 최근 5건은 200~600 이라 중간값 400
    for (const [i, ms] of [100, 200, 300, 400, 500, 600].entries()) {
      await 항목(await 실행('FINISHED'), 'XET-001', { durationMs: ms, 분전: 100 - i });
    }
    await 항목(await 실행('ABORTED'), 'XET-001', { durationMs: 0, 분전: 1 });

    const 이번 = await 실행('RUNNING');
    await 항목(이번, 'XET-001');
    await 항목(이번, 'XET-002');
    await 항목(이번, 'XET-003', { durationMs: 1000 });
    await 항목(이번, 'XET-004', { durationMs: 0 });

    // (400 + 1000) ÷ min(동시 2, 안 끝난 2) — 기준 시각(마지막으로 끝난 항목)에 지금을 맞추면 그대로다
    expect(await 실행남은시간(이번, 끝)).toBe(700);
  });

  it('기준 시각은 마지막으로 끝난 항목이고 그 뒤로 흐른 만큼 줄어든다', async () => {
    const { 실행남은시간 } = await import('./eta.js');
    await 치우기();
    await 항목(await 실행('FINISHED'), 'XET-001', { durationMs: 1000, 분전: 100 });
    await 항목(await 실행('FINISHED'), 'XET-002', { durationMs: 1000, 분전: 100 });
    await 항목(await 실행('FINISHED'), 'XET-003', { durationMs: 1000, 분전: 100 });
    const 이번 = await 실행('RUNNING');
    await 항목(이번, 'XET-001');
    await 항목(이번, 'XET-002');
    await 항목(이번, 'XET-003');

    // 3000 ÷ min(동시 2, 안 끝난 3) = 1500. 끝난 항목이 없어 기준은 실행 시작 시각이다
    expect(await 실행남은시간(이번, 시작)).toBe(1500);
    expect(await 실행남은시간(이번, new Date(시작.getTime() + 400))).toBe(1100);
    expect(await 실행남은시간(이번, new Date(시작.getTime() + 60_000))).toBe(0);

    await 항목(이번, 'XET-004', { durationMs: 500 });
    // 끝난 항목이 생기면 기준이 그 시각으로 옮겨 가 셈을 다시 맞춘다 — 3000 ÷ 2 = 1500 에서 다시 줄어든다
    expect(await 실행남은시간(이번, new Date(끝.getTime() + 300))).toBe(1200);
  });

  it('같은 케이스 회차는 하나씩 돌아 한 칸으로 센다 (PRD-F9-36)', async () => {
    const { 실행남은시간 } = await import('./eta.js');
    await 치우기();
    await 항목(await 실행('FINISHED'), 'XET-001', { durationMs: 1000, 분전: 100 });
    const 이번 = await 실행('RUNNING');
    for (const 회차 of [1, 2, 3]) await 항목(이번, 'XET-001', { 회차 });

    // 3000 ÷ min(동시 2, 안 끝난 케이스 1) — 안 끝난 항목 수(3)로 나누면 반으로 어림한다
    expect(await 실행남은시간(이번, 시작)).toBe(3000);
  });

  it('다른 실행이 같이 돌면 칸을 나눠 쓴다 — 시나리오 실행은 세지 않는다', async () => {
    const { 실행남은시간 } = await import('./eta.js');
    await 치우기();
    await 항목(await 실행('FINISHED'), 'XET-001', { durationMs: 1000, 분전: 100 });
    await 항목(await 실행('FINISHED'), 'XET-002', { durationMs: 1000, 분전: 100 });
    const 이번 = await 실행('RUNNING');
    await 항목(이번, 'XET-001');
    await 항목(이번, 'XET-002');
    await 실행('RUNNING', 'SCENARIO');

    expect(await 실행남은시간(이번, 시작)).toBe(1000);
    await 실행('RUNNING', 'UI');
    // 칸 = max(1, min(2, 2) ÷ 2) = 1
    expect(await 실행남은시간(이번, 시작)).toBe(2000);
  });

  it('지난 기록도 이번에 끝난 항목도 없으면 null 이다', async () => {
    const { 실행남은시간 } = await import('./eta.js');
    const 이번 = await 실행('RUNNING');
    await 항목(이번, 'XET-009');
    expect(await 실행남은시간(이번)).toBeNull();
  });

  it('안 끝난 항목이 없으면 0 이다', async () => {
    const { 실행남은시간 } = await import('./eta.js');
    const 이번 = await 실행('FINISHED');
    await 항목(이번, 'XET-010', { durationMs: 300 });
    expect(await 실행남은시간(이번)).toBe(0);
  });
});
