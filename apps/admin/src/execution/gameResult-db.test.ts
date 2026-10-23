// 게임 항목 결과가 게임 지도의 서버 값과 서비스 지도의 케이스 줄을 채우고, 지도가 깨져도 판정은 남기는지 본다 (GAME-F1-09 — DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createRun, finishItem } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호 = 'XGR-FN-001';
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XGR')";

describe.skipIf(연결 === undefined)('게임 항목 결과 저장', () => {
  let pool: Pool;

  async function 치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM game_element WHERE service_id = ${서비스번호}`);
    await pool.query(`DELETE FROM service_api WHERE service_id = ${서비스번호}`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
    await pool.query('DELETE FROM test_case WHERE tc_id = $1', [번호]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XGR'");
  }

  const 시작 = async (): Promise<{ runId: number; historyId: number }> => {
    const { runId, items } = await createRun({
      origin: 'MANUAL',
      triggeredBy: 'tester',
      env: 'qa',
      items: [{ tcId: 번호, platforms: ['android'], params: {}, expected: {} }],
    });
    return { runId, historyId: items[0]!.historyId };
  };

  const 요소 = async (key: string) =>
    (await pool.query<{ server_value: unknown; checked_run: string | null }>(`SELECT server_value, checked_run FROM game_element WHERE service_id = ${서비스번호} AND key = $1`, [key])).rows[0]!;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind)
       VALUES ('XGR', 'XGR 게임', '#445566', 'https://xgr.example.com', 'xgr', 'GAME')`,
    );
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES (${서비스번호}, 'qa', 'http://127.0.0.1:5080')`);
    await pool.query(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ($1, $1, '["android"]', '[]', 'xgr/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
      [번호],
    );
    await pool.query(
      `INSERT INTO game_element (service_id, kind, key, name) VALUES (${서비스번호}, 'DATA', 'item:sword_long', '장검'), (${서비스번호}, 'DATA', 'item:potion', '물약')`,
    );
  });

  afterAll(async () => {
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('요소 대조는 지도에 있는 열쇠의 서버 값과 확인한 실행을 적고, 없는 열쇠는 그냥 지나간다', async () => {
    const { runId, historyId } = await 시작();
    await finishItem(historyId, {
      historyId,
      status: 'PASS',
      durationMs: 1,
      steps: [],
      elementChecks: [
        { key: 'item:sword_long', serverValue: { gold: 120 }, same: true },
        { key: 'item:없는요소', serverValue: 1, same: true },
      ],
    });
    expect(await 요소('item:sword_long')).toEqual({ server_value: { gold: 120 }, checked_run: String(runId) });
    expect((await 요소('item:potion')).server_value).toBeNull();
  });

  it('부른 API 는 서비스 지도의 케이스 줄이 되고 같은 방식 · 주소는 한 줄이다', async () => {
    const { runId, historyId } = await 시작();
    await finishItem(historyId, {
      historyId,
      status: 'PASS',
      durationMs: 1,
      steps: [],
      apiCalls: [
        { method: 'POST', path: '/admin/forced', status: 200 },
        { method: 'POST', path: '/admin/forced', status: 200 },
        { method: 'GET', path: '/admin/players/42', status: 200 },
      ],
    });
    const 줄들 = await pool.query<{ method: string; path: string; ok_status: number | null; run_id: string }>(
      `SELECT a.method, a.path, a.ok_status, u.run_id FROM service_api a JOIN service_api_use u ON u.api_id = a.id
        WHERE a.service_id = ${서비스번호} AND u.tc_id = $1 ORDER BY a.path`,
      [번호],
    );
    expect(줄들.rows).toEqual([
      { method: 'POST', path: '/admin/forced', ok_status: 200, run_id: String(runId) },
      { method: 'GET', path: '/admin/players/:n', ok_status: 200, run_id: String(runId) },
    ]);
  });

  it('미실행 항목과 더 새 실행 뒤에 끝난 옛 실행은 케이스 줄을 바꾸지 않는다', async () => {
    const 경로들 = async () =>
      (
        await pool.query<{ path: string }>(
          `SELECT a.path FROM service_api a JOIN service_api_use u ON u.api_id = a.id WHERE a.service_id = ${서비스번호} AND u.tc_id = $1 ORDER BY a.path`,
          [번호],
        )
      ).rows.map((r) => r.path);
    const 옛 = await 시작();
    const 새 = await 시작();
    await finishItem(새.historyId, { historyId: 새.historyId, status: 'PASS', durationMs: 1, steps: [], apiCalls: [{ method: 'GET', path: '/new', status: 200 }] });
    await finishItem(옛.historyId, { historyId: 옛.historyId, status: 'PASS', durationMs: 1, steps: [], apiCalls: [{ method: 'GET', path: '/old', status: 200 }] });
    expect(await 경로들()).toEqual(['/new']);

    const 끊김 = await 시작();
    await finishItem(끊김.historyId, { historyId: 끊김.historyId, status: 'NA', durationMs: 1, steps: [], apiCalls: [{ method: 'GET', path: '/half', status: 200 }] });
    expect(await 경로들()).toEqual(['/new']);
  });

  it('지도를 못 채워도 판정과 절차는 남기고 알린다', async () => {
    const 소리 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { historyId } = await 시작();
    await finishItem(historyId, {
      historyId,
      status: 'FAIL',
      durationMs: 7,
      steps: [{ seq: 1, title: '단계', status: 'FAIL', durationMs: 1, assertions: [] }],
      elementChecks: [{ key: 'item:potion', serverValue: 5, same: false }],
      apiCalls: [{ method: 'GET', path: '//[', status: 500 }],
    });
    const 행 = (await pool.query<{ status: string }>('SELECT status FROM run_item WHERE history_id = $1', [historyId])).rows[0]!;
    const 절차 = await pool.query('SELECT 1 FROM run_item_step WHERE history_id = $1', [historyId]);
    expect(행.status).toBe('FAIL');
    expect(절차.rowCount).toBe(1);
    expect((await 요소('item:potion')).server_value).toBeNull();
    expect(소리).toHaveBeenCalledTimes(1);
    소리.mockRestore();
  });
});
