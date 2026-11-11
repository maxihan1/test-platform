// 실행 전 준비를 DB 로 본다 — 준비 주소 읽기 · 준비 실패로 닫기 · 멈춘 실행 안 덮기 · 마지막 결과에서 빠지기 (DATABASE_URL 이 있을 때만)

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { dispatch } from './dispatcher.js';
import { lastByCase } from './history.js';
import { 부를준비들, 준비실패로닫는다 } from './prep.js';
import { createRun } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XPX')";

describe.skipIf(연결 === undefined)('실행 전 준비', () => {
  let pool: Pool;
  let 준비서버: Server;
  let 받은수 = 0;

  async function 실행을치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
  }

  async function 치운다(): Promise<void> {
    await 실행을치운다();
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [['XPX-001']]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XPX'");
  }

  const 실행만들기 = async (): Promise<{ runId: number; items: Awaited<ReturnType<typeof createRun>>['items'] }> =>
    createRun({
      origin: 'MANUAL', triggeredBy: 'xpx', triggeredByName: '실행자', notifySlack: false, env: 'qa',
      items: [{ tcId: 'XPX-001', platforms: ['desktop', 'mobile'], params: {}, expected: {} }],
    });

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    준비서버 = createServer((req, res) => {
      받은수 += 1;
      req.resume();
      res.statusCode = 500;
      res.end('seed failed xpx-secret-value');
    });
    await new Promise<void>((끝) => 준비서버.listen(0, '127.0.0.1', 끝));
    const 주소 = `http://127.0.0.1:${String((준비서버.address() as AddressInfo).port)}/prep/`;
    await 치운다();
    await pool.query(
      `WITH s AS (
         INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XPX', 'XPX 서비스', '#445566', '', 'xpx') RETURNING id
       )
       INSERT INTO service_env (service_id, env, base_url, prep) SELECT id, 'qa', 'https://qa.example.com', $1::jsonb FROM s`,
      [JSON.stringify({ url: 주소, header: 'X-Prep-Key', value: 'xpx-secret-value', timeoutSec: 10 })],
    );
    await pool.query(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ('XPX-001', 'XPX-001 이름', '["desktop","mobile"]', '[]', 'xpx/XPX-001.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
    );
  });

  beforeEach(실행을치운다);

  afterAll(async () => {
    await 치운다();
    await pool.end();
    준비서버.closeAllConnections();
    await new Promise<void>((끝) => 준비서버.close(() => 끝()));
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('준비 주소는 끝의 / 를 뗀 열쇠로 읽고 실행의 애플리케이션 · 대상 서버 · 시작 방식을 싣는다', async () => {
    const { runId } = await 실행만들기();
    const 읽음 = await 부를준비들(runId);
    expect(읽음.env).toBe('qa');
    expect(읽음.origin).toBe('MANUAL');
    expect(읽음.준비들).toHaveLength(1);
    expect(읽음.준비들[0]!.service).toBe('XPX');
    expect(읽음.준비들[0]!.열쇠.endsWith('/prep')).toBe(true);
  });

  it('준비가 실패하면 실행을 PREP_FAILED 로 닫고 까닭을 가려 남기며, 항목은 마지막 결과에 안 든다', async () => {
    await pool.query("INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url) SELECT 'XPX 앞', 'xpx', 'FINISHED', 'qa', id, 'XPX', '', 'https://qa.example.com' FROM service WHERE prefix = 'XPX'");
    const { runId, items } = await 실행만들기();
    받은수 = 0;

    await dispatch(runId, items);

    expect(받은수).toBe(1);
    const 실행 = (await pool.query<{ status: string; prep_note: string; finished_at: Date | null }>('SELECT status, prep_note, finished_at FROM test_run WHERE run_id = $1', [runId])).rows[0]!;
    expect(실행.status).toBe('PREP_FAILED');
    expect(실행.finished_at).not.toBeNull();
    expect(실행.prep_note).toMatch(/^HTTP 500 · seed failed /);
    expect(실행.prep_note).not.toContain('xpx-secret-value');
    const 항목 = (await pool.query<{ status: string; message: string }>("SELECT status, error->>'message' AS message FROM run_item WHERE run_id = $1", [runId])).rows;
    expect(항목).toEqual([{ status: 'NA', message: 'PREP_FAILED' }, { status: 'NA', message: 'PREP_FAILED' }]);
    expect((await lastByCase(['XPX'])).filter((l) => l.tcId === 'XPX-001')).toEqual([]);
  });

  it('멈추기가 먼저 닫은 실행은 늦은 준비 실패가 덮지 않는다', async () => {
    const { runId } = await 실행만들기();
    await pool.query("UPDATE test_run SET status = 'ABORTED', finished_at = now() WHERE run_id = $1", [runId]);

    expect(await 준비실패로닫는다(runId, '시간 초과 120초')).toBe(false);
    expect((await pool.query<{ status: string; prep_note: string | null }>('SELECT status, prep_note FROM test_run WHERE run_id = $1', [runId])).rows[0]).toEqual({ status: 'ABORTED', prep_note: null });
  });
});
