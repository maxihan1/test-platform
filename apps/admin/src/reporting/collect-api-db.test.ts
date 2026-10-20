// 증적 수집이 API 애플리케이션 항목에만 절차 원문 · 응답 형식 검사를 싣는지 본다 (도메인/API §3.8 「리포트」 · DATABASE_URL 이 있을 때만)

import type { StepResult } from '@platform/kit';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { finishItem } from '../execution/store.js';
import { collectRun } from './collect.js';

const 연결 = process.env.DATABASE_URL;

const 절차: StepResult = {
  seq: 1,
  title: '푸시를 보낸다',
  status: 'PASS',
  durationMs: 30,
  assertions: [{ statement: '응답 코드가 201 이다', status: 'PASS', actual: 201, expected: 201 }],
  httpTrace: {
    request: { method: 'POST', url: 'https://stg.example.com/v1/pushes', data: { pin: 's3cr3t-pin' } },
    response: { status: 201, body: '{"echo":"s3cr3t-pin"}' },
  },
  shapeChecks: [{ method: 'POST', path: '/v1/pushes', status: 201, result: 'PASS' }],
};

describe.skipIf(연결 === undefined)('증적의 API 원문', () => {
  let pool: Pool;
  const 서비스들: number[] = [];

  async function 지운다(): Promise<void> {
    const 번호 = await pool.query<{ id: string }>("SELECT id FROM service WHERE prefix IN ('XDW', 'XDWS')");
    const ids = 번호.rows.map((r) => r.id);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1::bigint[]))', [ids]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1::bigint[])', [ids]);
    await pool.query('DELETE FROM service WHERE id = ANY($1::bigint[])', [ids]);
  }

  async function 실행(서비스: number): Promise<number> {
    const run = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url, service_id, service_name, tests_repo)
       VALUES ('XDW 실행', 'tester', '홍길동', 'FINISHED', 'stg', 'https://stg.example.com', $1, 'XDW 알림 서버', '') RETURNING run_id`,
      [서비스],
    );
    const runId = Number(run.rows[0]!.run_id);
    const item = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema, status)
       VALUES ($1, 'XDW-FN-001', 'desktop', 1, '푸시를 보낸다', 'xdw/a.spec.ts', 300000, '[]',
               '{"pin":"s3cr3t-pin"}', '{}', '{"properties":{"pin":{"type":"string","secret":true}}}', '{}', 'NA')
       RETURNING history_id`,
      [runId],
    );
    const historyId = Number(item.rows[0]!.history_id);
    await finishItem(historyId, { historyId, status: 'PASS', durationMs: 30, steps: [절차] });
    return runId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();
    for (const [prefix, kind] of [['XDW', 'API'], ['XDWS', 'SCREEN']] as const) {
      const s = await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, $1, '#445566', '', lower($1), $2) RETURNING id`,
        [prefix, kind],
      );
      서비스들.push(Number(s.rows[0]!.id));
    }
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('API 애플리케이션 항목은 절차에 원문과 응답 형식 검사가 실리고, 항목 비밀값은 원문에서도 가린다', async () => {
    const 문서 = await collectRun(await 실행(서비스들[0]!));
    const 첫절차 = 문서?.items[0]?.steps[0];
    expect(첫절차?.httpTrace).toEqual({
      request: 'POST https://stg.example.com/v1/pushes\n본문 {\n  "pin": "********"\n}',
      response: '201\n{"echo":"********"}',
    });
    expect(첫절차?.shapeChecks).toEqual([{ method: 'POST', path: '/v1/pushes', status: 201, result: 'PASS' }]);
  });

  it('화면 애플리케이션 항목은 원문이 저장돼 있어도 싣지 않는다', async () => {
    const 문서 = await collectRun(await 실행(서비스들[1]!));
    const 첫절차 = 문서?.items[0]?.steps[0];
    expect([첫절차?.httpTrace, 첫절차?.shapeChecks]).toEqual([undefined, undefined]);
  });
});
