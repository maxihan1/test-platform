// 사람이 멈춰 안 돌고 닫힌 항목(NA · ABORTED)이 케이스 마지막 결과를 덮지 않는지 DB 로 본다 (DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { lastByCase } from './history.js';
import { createRun } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XLA')";

describe.skipIf(연결 === undefined)('멈춰 닫힌 항목은 마지막 결과가 아니다', () => {
  let pool: Pool;

  async function 실행을치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
  }

  async function 치운다(): Promise<void> {
    await 실행을치운다();
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [['XLA-001']]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XLA'");
  }

  async function 닫은실행(status: 'PASS' | 'NA', 사유?: string): Promise<number> {
    const { runId } = await createRun({
      origin: 'MANUAL', triggeredBy: 'xla', triggeredByName: '실행자', notifySlack: false, env: 'qa',
      items: [{ tcId: 'XLA-001', platforms: ['desktop'], params: {}, expected: {} }],
    });
    await pool.query(
      'UPDATE run_item SET status = $2, error = $3::jsonb, finished_at = clock_timestamp() WHERE run_id = $1',
      [runId, status, 사유 === undefined ? null : JSON.stringify({ message: 사유 })],
    );
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = clock_timestamp() WHERE run_id = $1", [runId]);
    return runId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(
      `WITH s AS (
         INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XLA', 'XLA 서비스', '#445566', '', 'xla') RETURNING id
       )
       INSERT INTO service_env (service_id, env, base_url) SELECT id, 'qa', 'https://qa.example.com' FROM s`,
    );
    await pool.query(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ('XLA-001', 'XLA-001 이름', '["desktop"]', '[]', 'xla/XLA-001.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
    );
  });

  beforeEach(실행을치운다);

  afterAll(async () => {
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('통과 뒤에 멈춰 안 돌고 닫힌 실행이 와도 마지막 결과는 통과 그대로다 — 흐름 막대에도 안 든다', async () => {
    await 닫은실행('PASS');
    await 닫은실행('NA', 'ABORTED');

    const 결과 = (await lastByCase(['XLA'])).find((l) => l.tcId === 'XLA-001');

    expect(결과?.status).toBe('PASS');
    expect(결과?.recent).toEqual(['PASS']);
  });

  it('ABORTED 가 아닌 NA(실제 미실행)는 그대로 마지막 결과다', async () => {
    await 닫은실행('PASS');
    await 닫은실행('NA', '러너 연결 거절');

    expect((await lastByCase(['XLA'])).find((l) => l.tcId === 'XLA-001')?.status).toBe('NA');
  });
});
