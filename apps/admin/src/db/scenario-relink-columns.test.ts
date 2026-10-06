// 시나리오 부품 행의 이어 주기 세 칸(unconfirmed · bound · cleanup)이 빈 기본값으로 차는지 지키는 검사 (도메인/시나리오 §3.7 결정 12)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XRL';

describe.skipIf(연결 === undefined)('시나리오 이어 주기 칸', () => {
  let 서비스 = 0;
  let 실행 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 치우기 = async () => {
    await q(
      `DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)`,
      [서비스],
    );
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q(
      'DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)',
      [서비스],
    );
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xrl')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 이어 주기 칸 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    await 치우기();
    const 시나리오 = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XRL 주문 흐름', 'xrl') RETURNING id`,
      [서비스],
    );
    const 시나리오id = Number(시나리오.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name)
       VALUES ($1, 1, '[]', 'xrl', '검사')`,
      [시나리오id],
    );
    const r = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version)
       VALUES ('XRL 실행', 'xrl', 'demo', 'FINISHED', $1, 'XRL', '', '', 'SCENARIO', $2, 1)
       RETURNING run_id`,
      [서비스, 시나리오id],
    );
    실행 = Number(r.rows[0]!.run_id);
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('세 칸을 안 주고 넣은 case 부품은 미확정 없음 · 꽂은 값 {} · 뒷정리 [] 이고 미확정 사유는 그대로 읽힌다', async () => {
    const 넣기 = (seq: number, 사유?: string) =>
      q<{ unconfirmed: string | null; bound: unknown; cleanup: unknown }>(
        `INSERT INTO scenario_run_part
           (run_id, seq, kind, tc_id, part, file_path, param_schema, expected_schema, timeout_ms, status
            ${사유 === undefined ? '' : ', unconfirmed'})
         VALUES ($1, $2, 'case', 'XRL-001', '{}', 'xrl/a.spec.ts', '{}', '{}', 300000, 'NA'
                 ${사유 === undefined ? '' : ', $3'})
         RETURNING unconfirmed, bound, cleanup`,
        사유 === undefined ? [실행, seq] : [실행, seq, 사유],
      );
    expect((await 넣기(1)).rows[0]).toEqual({ unconfirmed: null, bound: {}, cleanup: [] });
    expect((await 넣기(2, '화면에서 본 값')).rows[0]!.unconfirmed).toBe('화면에서 본 값');
  });
});
