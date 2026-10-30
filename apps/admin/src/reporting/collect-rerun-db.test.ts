// 한 건 실행이 붙은 실행의 증적 자료가 지금 결과이고 원래 항목을 같이 읽는지 DB 로 본다 (DATABASE_URL 이 있을 때만 · 도메인/리포팅 §8.4 「다시 실행이 붙은 실행」)
// fixture 접두사 XDZ — 자기 service_id 로 run_item → test_run → test_case → service_env → service 순으로 지운다. LIKE 를 안 쓴다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createRun } from '../execution/store.js';
import { collectRun } from './collect.js';

const 연결 = process.env.DATABASE_URL;
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XDZ')";
const 케이스들 = ['XDZ-001', 'XDZ-002'];

describe.skipIf(연결 === undefined)('증적 자료 — 한 건 실행이 붙은 실행', () => {
  let pool: Pool;

  async function 치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XDZ'");
  }

  const 건다 = (tcIds: string[]) =>
    createRun({
      origin: 'MANUAL',
      triggeredBy: 'xdz',
      triggeredByName: '다시 돌린 사람',
      notifySlack: false,
      env: 'qa',
      items: tcIds.map((tcId) => ({ tcId, platforms: ['desktop'], params: {}, expected: {} })),
    });

  const 판정 = (runId: number, tcId: string, status: 'PASS' | 'FAIL') =>
    pool.query('UPDATE run_item SET status = $3, finished_at = clock_timestamp() WHERE run_id = $1 AND tc_id = $2', [runId, tcId, status]);
  const 닫는다 = async (runId: number) => {
    await pool.query("UPDATE run_item SET status = 'PASS', finished_at = clock_timestamp() WHERE run_id = $1 AND finished_at IS NULL", [runId]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = clock_timestamp() WHERE run_id = $1", [runId]);
  };
  const 절차 = (runId: number, tcId: string, title: string) =>
    pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status)
       SELECT history_id, 1, $3, 'PASS' FROM run_item WHERE run_id = $1 AND tc_id = $2`,
      [runId, tcId, title],
    );

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(
      `WITH s AS (
         INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XDZ', 'XDZ 서비스', '#445566', '', 'xdz') RETURNING id
       )
       INSERT INTO service_env (service_id, env, base_url) SELECT id, 'qa', 'https://qa.example.com' FROM s`,
    );
    for (const tcId of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $2, '["desktop"]', '[]', $3, '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tcId, `${tcId} 이름`, `xdz/${tcId}.spec.ts`],
      );
    }
  });

  afterAll(async () => {
    await 치운다();
    await pool.end();
  });

  it('덮인 항목은 다시 돈 항목이고 원래 항목과 두 절차가 따로 읽힌다 — 덮이지 않은 항목은 그대로다', async () => {
    const { runId: 원래 } = await 건다(케이스들);
    await 판정(원래, 'XDZ-001', 'FAIL');
    await 닫는다(원래);
    await 절차(원래, 'XDZ-001', '처음 절차');

    const { runId: 한건 } = await 건다(['XDZ-001']);
    const 붙음 = await pool.query<{ origin: string; rerun_of: string }>('SELECT origin, rerun_of FROM test_run WHERE run_id = $1', [한건]);
    expect(붙음.rows[0]).toEqual({ origin: 'SINGLE', rerun_of: String(원래) });
    await 판정(한건, 'XDZ-001', 'PASS');
    await 닫는다(한건);
    await 절차(한건, 'XDZ-001', '다시 돈 절차');

    const doc = (await collectRun(원래))!;
    expect(doc.items.map((i) => [i.tcId, i.status])).toEqual([
      ['XDZ-001', 'PASS'],
      ['XDZ-002', 'PASS'],
    ]);
    const 덮음 = doc.items[0]!;
    expect(덮음.steps.map((s) => s.title)).toEqual(['다시 돈 절차']);
    expect(덮음.rerun?.triggeredBy).toBe('다시 돌린 사람');
    expect(덮음.rerun?.original.status).toBe('FAIL');
    expect(덮음.rerun?.original.steps.map((s) => s.title)).toEqual(['처음 절차']);
    expect(doc.items[1]!.rerun).toBeUndefined();
  });
});
