// 정식 실행이 케이스가 선언하지 않은 디바이스를 실행을 만들기 전에 거절하는지 본다 (DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRun, RunInputError } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 서비스 = `
  WITH s AS (
    INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
    VALUES ('XBP', 'XBP 서비스', '#445566', 'https://xbp.example.com', 'xbp')
    ON CONFLICT (prefix) DO UPDATE SET is_active = true, tests_repo = EXCLUDED.tests_repo
    RETURNING id
  )
  INSERT INTO service_env (service_id, env, base_url)
  SELECT id, 'qa', 'https://qa.example.com' FROM s
  ON CONFLICT (service_id, env) DO UPDATE SET base_url = EXCLUDED.base_url`;

const 케이스 = `
  INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
  VALUES ('XBP-001', '앱만 선언한 케이스', '["android"]', '[]', 'xbp/XBP-001.spec.ts',
          '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')
  ON CONFLICT (tc_id) DO UPDATE SET platforms = EXCLUDED.platforms`;

const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XBP')";

describe.skipIf(연결 === undefined)('정식 실행 선언 대조', () => {
  let pool: Pool;

  async function 치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM test_case WHERE tc_id = 'XBP-001'");
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XBP'");
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(서비스);
    await pool.query(케이스);
  });

  afterAll(async () => {
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('선언 밖 디바이스가 있으면 실행을 만들기 전에 INVALID_REQUEST 로 거절한다', async () => {
    const err = await createRun({
      title: 'XBP 선언 밖 디바이스',
      triggeredBy: 'tester',
      env: 'qa',
      items: [{ tcId: 'XBP-001', platforms: ['desktop'], params: {}, expected: {} }],
    }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RunInputError);
    expect((err as RunInputError).code).toBe('INVALID_REQUEST');
    expect((err as RunInputError).message).toContain('XBP-001');
    expect((err as RunInputError).message).toContain('PC 환경을');

    const runs = await pool.query(`SELECT 1 FROM test_run WHERE service_id = ${서비스번호}`);
    expect(runs.rowCount).toBe(0);
  });
});
