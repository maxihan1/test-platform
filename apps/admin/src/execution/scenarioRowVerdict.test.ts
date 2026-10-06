// E2E 탭 줄이 접은 판정 verdict 를 싣는지 본다 — 실패와 시간 초과 · 강제 종료를 화면이 가르는 근거 (SPEC 도메인/시나리오 §7 「실행 목록의 E2E 탭」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listRuns } from './queries.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XSV';

describe.skipIf(연결 === undefined)('E2E 탭 줄 — 접은 판정', () => {
  let 서비스 = 0;
  let 시나리오 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 실행치우기 = async () => {
    await q('DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
  };

  const 치우기 = async () => {
    await 실행치우기();
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  const 실행 = async (부품들: { status: string; message?: string }[], status = 'FINISHED') => {
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, started_at, finished_at)
       VALUES ('XSV 실행', 'xsv', 'qa', $2, $1, 'XSV', '', '', 'SCENARIO', $3, 1, now(),
               CASE WHEN $2 = 'RUNNING' THEN NULL ELSE now() END)
       RETURNING run_id`,
      [서비스, status, 시나리오],
    );
    const runId = Number(r.rows[0]!.run_id);
    for (const [i, 부품] of 부품들.entries()) {
      await q(
        `INSERT INTO scenario_run_part (run_id, seq, kind, part, status, error, finished_at)
         VALUES ($1, $2, 'wait', '{}', $3, $4, now())`,
        [runId, i + 1, 부품.status, 부품.message === undefined ? null : JSON.stringify({ message: 부품.message })],
      );
    }
    return runId;
  };

  beforeAll(async () => {
    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xsv')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 줄 판정 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기();
    const s = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XSV 시나리오', 'xsv') RETURNING id`,
      [서비스],
    );
    시나리오 = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xsv', '검사')`,
      [시나리오],
    );
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('줄마다 접은 판정을 싣는다 — 전부 PASS · FAIL 섞임 · FAIL 없는 NA(시간 초과 · 강제 종료) · 도는 중 null', async () => {
    const 통과 = await 실행([{ status: 'PASS' }, { status: 'PASS' }]);
    const 실패 = await 실행([{ status: 'PASS' }, { status: 'FAIL' }, { status: 'NA' }]);
    const 시간초과 = await 실행([{ status: 'PASS' }, { status: 'NA', message: 'TIMEOUT' }]);
    const 강제종료 = await 실행([{ status: 'PASS' }, { status: 'NA', message: 'ABORTED' }]);
    const 도는중 = await 실행([{ status: 'PASS' }, { status: 'NA' }], 'RUNNING');

    try {
      const 탭 = await listRuns(접두사, 1, 50, { kind: 'scenario' });
      const 판정 = (runId: number) => 탭.items.find((i) => i.runId === runId)!.verdict;
      expect(판정(통과)).toBe('PASS');
      expect(판정(실패)).toBe('FAIL');
      expect(판정(시간초과)).toBe('NA');
      expect(판정(강제종료)).toBe('NA');
      expect(판정(도는중)).toBeNull();
    } finally {
      await 실행치우기();
    }
  });
});
