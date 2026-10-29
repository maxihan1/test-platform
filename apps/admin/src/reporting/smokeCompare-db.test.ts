// 빌드 회귀의 직전 실행 고르기 — 스모크 아닌 실행은 스모크를 건너뛰고, 스모크는 아무 앞 실행과 견준다 (도메인/리포팅 §7 insights previous)
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 앞판정SQL } from './dashboardSql.js';
import { 실패카드 } from './failures.js';
import { compareWithPrevious } from './insights.js';
import { 직전대비수 } from './runChange.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('빌드 회귀의 직전 실행 — 스모크 아닌 실행은 스모크를 건너뛴다 (GAME-F2-14 · RUN 20929)', () => {
  let pool: Pool;
  let 전체: number;
  let 회귀: number;
  let 다음스모크: number;

  async function 지운다(): Promise<void> {
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = (SELECT id FROM service WHERE prefix = 'XRG'))");
    await pool.query("DELETE FROM test_run WHERE service_id = (SELECT id FROM service WHERE prefix = 'XRG')");
    await pool.query("DELETE FROM service WHERE prefix = 'XRG'");
  }

  async function 실행(startedAt: string, buildStage: 'SMOKE' | 'FULL' | null, 항목: Record<string, 'PASS' | 'FAIL'>): Promise<number> {
    const row = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, status, env, base_url, service_id, service_name, tests_repo, started_at,
                             origin, build_no, build_stage)
       VALUES ('XRG 실행', 'tester', 'FINISHED', 'qa', 'https://qa.example.com', (SELECT id FROM service WHERE prefix = 'XRG'),
               'XRG 게임', 'https://github.com/example/xrg-tests', $1, $2, $3, $4)
       RETURNING run_id`,
      [startedAt, buildStage === null ? 'MANUAL' : 'BUILD', buildStage === null ? null : '39', buildStage],
    );
    const runId = Number(row.rows[0]!.run_id);
    for (const [tcId, status] of Object.entries(항목)) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                               precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
         VALUES ($1, $2, 'android', 1, $2, 'xrg/x.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $3, 100, now())`,
        [runId, tcId, status],
      );
    }
    return runId;
  }

  const 새로깨진것 = (비교: Awaited<ReturnType<typeof compareWithPrevious>>, 판정: string) =>
    비교.케이스들.filter((c) => c.판정 === 판정).map((c) => c.tcId);

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XRG', 'XRG 게임', '#445566', 'https://github.com/example/xrg-tests', 'xrg')`,
    );
    전체 = await 실행('2026-10-24T01:00:00Z', null, { 'XRG-001': 'PASS', 'XRG-002': 'PASS', 'XRG-003': 'PASS' });
    await 실행('2026-10-24T02:00:00Z', 'SMOKE', { 'XRG-001': 'PASS', 'XRG-002': 'PASS' });
    회귀 = await 실행('2026-10-24T03:00:00Z', 'FULL', { 'XRG-001': 'PASS', 'XRG-002': 'FAIL', 'XRG-003': 'FAIL' });
    다음스모크 = await 실행('2026-10-24T04:00:00Z', 'SMOKE', { 'XRG-001': 'FAIL', 'XRG-002': 'FAIL' });
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
  });

  it('회귀는 같은 빌드의 스모크를 건너뛰고 앞 전체 실행과 견줘 스모크에 없던 케이스까지 새로 깨진 것으로 낸다', async () => {
    const 비교 = await compareWithPrevious(회귀);
    expect(비교.previous?.runId).toBe(전체);
    expect(새로깨진것(비교, '새로깨짐')).toEqual(['XRG-002', 'XRG-003']);
    expect(비교.빠진건수).toBe(0);
  });

  it('스모크는 바로 앞 회귀와 견준다 — 회귀에서 이미 깨진 케이스를 또 신규로 세지 않는다', async () => {
    const 비교 = await compareWithPrevious(다음스모크);
    expect(비교.previous?.runId).toBe(회귀);
    expect(새로깨진것(비교, '새로깨짐')).toEqual(['XRG-001']);
    expect(새로깨진것(비교, '계속깨짐')).toEqual(['XRG-002']);
  });

  it('실행 기록 줄의 직전 대비 수도 같은 실행과 견준다', async () => {
    const 수 = await 직전대비수([회귀, 다음스모크]);
    expect(수.get(회귀)).toEqual({ newFail: 2, stillFail: 0 });
    expect(수.get(다음스모크)).toEqual({ newFail: 1, stillFail: 1 });
  });

  it('대시보드 회귀 실패의 앞 판정도 앞 전체 실행 것이다', async () => {
    const 줄 = await pool.query<{ tc_id: string }>(앞판정SQL, [[회귀]]);
    expect(줄.rows.map((r) => r.tc_id).sort()).toEqual(['XRG-001', 'XRG-002', 'XRG-003']);
  });

  it('회귀의 실패 카드 최근 흐름도 스모크를 건너뛴다 — 변화 「새로 깨짐」과 흐름이 어긋나지 않게', async () => {
    const 카드 = (await 실패카드(회귀, 1)).items.find((c) => c.tcId === 'XRG-002');
    expect(카드?.devices[0]?.recent).toEqual(['FAIL', 'PASS']);
  });
});
