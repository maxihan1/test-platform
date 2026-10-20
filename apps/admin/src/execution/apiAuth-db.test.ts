// 정식 실행이 그 대상 서버 줄의 API 인증을 항목에 싣는지 본다 (도메인/API §3.8 「API 인증」 · API-F1-04 — DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRun } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호 = 'XAU-FN-001';
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XAU')";
const 인증 = [{ name: '고객사 A', tokenUrl: '/v1/oauth/token', clientId: 'client-a', clientSecret: 'secret-a-1234' }];

describe.skipIf(연결 === undefined)('정식 실행의 API 인증', () => {
  let pool: Pool;

  async function 치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
    await pool.query('DELETE FROM test_case WHERE tc_id = $1', [번호]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XAU'");
  }

  const 실행 = () =>
    createRun({
      origin: 'MANUAL',
      triggeredBy: 'tester',
      env: 'stg',
      items: [{ tcId: 번호, platforms: ['desktop'], params: {}, expected: {} }],
    });

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind)
       VALUES ('XAU', 'XAU 알림 서버', '#445566', 'https://xau.example.com', 'xau', 'API')`,
    );
    await pool.query(
      `INSERT INTO service_env (service_id, env, base_url, api_auths) VALUES (${서비스번호}, 'stg', 'http://127.0.0.1:3003', $1)`,
      [JSON.stringify(인증)],
    );
    await pool.query(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ($1, $1, '["desktop"]', '[]', 'xau/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
      [번호],
    );
  });

  afterAll(async () => {
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('그 대상 서버 줄의 인증을 비밀값 원문 그대로 싣는다 — 러너 · kit 이 토큰을 받는다', async () => {
    const { items } = await 실행();
    expect(items[0]?.apiAuths).toEqual(인증);
  });

  it('인증이 없는 줄이면 키를 싣지 않는다', async () => {
    await pool.query(`UPDATE service_env SET api_auths = '[]' WHERE service_id = ${서비스번호}`);
    const { items } = await 실행();
    expect(items[0]).not.toHaveProperty('apiAuths');
  });
});
