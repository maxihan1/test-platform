// 시나리오 실행이 케이스 실행 자리에 섞이지 않는지 본다 — 목록·집계·견주기·중단·재기동 복구 (SPEC 도메인/시나리오 §3.7 결정 10)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { compareWithPrevious } from '../reporting/insights.js';

import { listRuns } from './queries.js';
import { runSummary } from './runSummary.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XBK';

describe.skipIf(연결 === undefined)('test_run 의 kind 거르기', () => {
  let 서비스 = 0;
  let 시나리오 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 실행치우기 = async () => {
    await q(
      'DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)',
      [서비스],
    );
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
  };

  const 치우기 = async () => {
    await 실행치우기();
    await q(
      'DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)',
      [서비스],
    );
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  const 실행 = async (칸: { 시나리오?: boolean; status?: string; startedAt?: string } = {}) => {
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, started_at, finished_at)
       VALUES ('XBK 실행', 'xbk', 'qa', $2, $1, 'XBK', '', '', $3, $4, $5,
               COALESCE($6::timestamptz, now()), CASE WHEN $2 = 'RUNNING' THEN NULL ELSE now() END)
       RETURNING run_id`,
      [
        서비스,
        칸.status ?? 'FINISHED',
        칸.시나리오 === true ? 'SCENARIO' : 'CASE',
        칸.시나리오 === true ? 시나리오 : null,
        칸.시나리오 === true ? 1 : null,
        칸.startedAt ?? null,
      ],
    );
    return Number(r.rows[0]!.run_id);
  };

  beforeAll(async () => {
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xbk')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} kind 거르기 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기();
    const s = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XBK 주문 흐름', 'xbk') RETURNING id`,
      [서비스],
    );
    시나리오 = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name)
       VALUES ($1, 1, '[]', 'xbk', '검사')`,
      [시나리오],
    );
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('실행 목록과 머리 집계는 시나리오 실행을 안 센다', async () => {
    await 실행치우기();
    const 케이스실행 = await 실행();
    await 실행({ 시나리오: true });

    const 목록 = await listRuns(접두사, 1, 50);
    expect(목록.total).toBe(1);
    expect(목록.items.map((i) => i.runId)).toEqual([케이스실행]);
    expect((await runSummary(접두사, {})).runs).toBe(1);
  });

  it('견주기의 직전 실행은 시나리오 실행을 건너뛴다', async () => {
    await 실행치우기();
    const A = await 실행({ startedAt: '2026-09-29T01:00:00Z' });
    await 실행({ 시나리오: true, startedAt: '2026-09-29T02:00:00Z' });
    const B = await 실행({ startedAt: '2026-09-29T03:00:00Z' });

    expect((await compareWithPrevious(B)).previous?.runId).toBe(A);
  });
});
