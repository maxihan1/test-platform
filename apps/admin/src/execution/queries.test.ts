// 실행 조회 4종이 화면이 쓸 모양으로 나오는지 본다 (SPEC §7 · §8.3 · §8.4).
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { caseHistory, lastByCase } from './history.js';
import { findItem, findRun, listRuns } from './queries.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실행 조회', () => {
  let pool: Pool;
  let 먼저: number;
  let 나중: number;
  let 실패항목: number;

  async function 실행하나(title: string): Promise<number> {
    // 실행 목록은 service_id 로 거른다 (SPEC §6 · §8.7). 그 칸이 비면 목록에 뜨지 않는다
    const run = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url)
       VALUES ($1, 'tester', 'RUNNING', 'qa', (SELECT id FROM service WHERE prefix = 'XBQ'),
               'XBQ 서비스', 'https://xbq.example.com', 'https://qa.example.com') RETURNING run_id`,
      [title],
    );
    return Number(run.rows[0]!.run_id);
  }

  async function 항목하나(
    runId: number,
    platform: string,
    status: string,
    끝났나: boolean,
  ): Promise<number> {
    const row = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, precondition, params, expected, status, duration_ms, finished_at,
                             file_path, param_schema, expected_schema, timeout_ms)
       VALUES ($1, 'XBQ-001', $2, '조회용 케이스', '["사전조건 하나"]', '{"아이디":"tester"}', '{"결과":true}', $3, 100, $4,
               'demo/XBQ-001.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}', 300000)
       RETURNING history_id`,
      [runId, platform, status, 끝났나 ? new Date() : null],
    );
    return Number(row.rows[0]!.history_id);
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XBQ%')");
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XBQ%'");
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XBQ', 'XBQ 서비스', '#667788', 'https://xbq.example.com', 'xbq')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true`,
    );

    먼저 = await 실행하나('XBQ 먼저 돈 실행');
    await 항목하나(먼저, 'desktop', 'PASS', true);

    나중 = await 실행하나('XBQ 나중에 돈 실행');
    실패항목 = await 항목하나(나중, 'desktop', 'FAIL', true);
    await 항목하나(나중, 'mobile', 'NA', false);

    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, line, screenshot_path)
       VALUES ($1, 1, '로그인 API를 호출한다', 'PASS', 312, '[{"statement":"응답 코드가 정상이다","status":"PASS","actual":200,"expected":200}]', NULL, NULL),
              ($1, 2, '토큰을 검증한다', 'FAIL', 88, '[{"statement":"토큰이 발급된다","status":"FAIL","actual":false,"expected":true,"blocker":true}]', 19, 'artifacts/runs/1/1/2.png')`,
      [실패항목],
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XBQ%')");
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XBQ%'");
    await pool.query("DELETE FROM service WHERE prefix = 'XBQ'");
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('listRuns — 최근 실행이 먼저 나온다', async () => {
    const 목록 = await listRuns('XBQ', 1, 50);
    const 우리것 = 목록.items.filter((r) => r.title.startsWith('XBQ'));
    expect(우리것[0]?.runId).toBe(나중);
    expect(우리것[1]?.runId).toBe(먼저);
  });

  it('listRuns — 판정 개수를 같이 싣는다. 목록 화면이 실행마다 또 묻지 않게', async () => {
    const 목록 = await listRuns('XBQ', 1, 50);
    const 것 = 목록.items.find((r) => r.runId === 나중);
    expect(것?.counts).toEqual({ total: 2, pass: 0, fail: 1, na: 0, running: 1 });
  });

  it('findRun — 실행과 항목 목록이 같이 온다', async () => {
    const run = await findRun(나중);
    expect(run?.title).toBe('XBQ 나중에 돈 실행');
    expect(run?.items).toHaveLength(2);
    expect(run?.items.map((i) => i.platform).sort()).toEqual(['desktop', 'mobile']);
    expect(run?.items[0]?.tcName).toBe('조회용 케이스');
  });

  it('findRun — 목록에는 입력값 원문을 싣지 않는다', async () => {
    const run = await findRun(나중);
    expect(run?.items[0]).not.toHaveProperty('params');
  });

  it('findRun — 없는 실행은 null이다', async () => {
    expect(await findRun(999_999_999)).toBeNull();
  });

  it('findItem — 사전조건·입력값·절차·검증 문장이 전부 온다', async () => {
    const item = await findItem(나중, 실패항목);
    expect(item?.precondition).toEqual(['사전조건 하나']);
    expect(item?.params).toEqual({ 아이디: 'tester' });
    expect(item?.runTitle).toBe('XBQ 나중에 돈 실행');
    expect(item?.steps).toHaveLength(2);
    expect(item?.steps[1]).toMatchObject({
      seq: 2,
      title: '토큰을 검증한다',
      status: 'FAIL',
      line: 19,
      screenshotPath: 'artifacts/runs/1/1/2.png',
    });
    expect(item?.steps[1]?.assertions[0]?.statement).toBe('토큰이 발급된다');
  });

  it('findItem — 다른 실행의 항목 번호를 넣으면 null이다', async () => {
    expect(await findItem(먼저, 실패항목)).toBeNull();
  });

  it('caseHistory — 최신이 먼저 나온다', async () => {
    const 이력 = await caseHistory('XBQ-001', undefined, 1, 50);
    expect(이력.total).toBe(3);
    expect(이력.items[0]?.runId).toBe(나중);
    expect(이력.items[0]?.runTitle).toBe('XBQ 나중에 돈 실행');
  });

  it('caseHistory — 환경으로 거를 수 있다', async () => {
    const 이력 = await caseHistory('XBQ-001', 'mobile', 1, 50);
    expect(이력.items.every((i) => i.platform === 'mobile')).toBe(true);
    expect(이력.total).toBe(1);
  });

  it('lastByCase — 케이스와 환경마다 마지막 1건만 준다', async () => {
    const 마지막 = (await lastByCase()).filter((r) => r.tcId === 'XBQ-001');
    expect(마지막).toHaveLength(1);
    expect(마지막[0]).toMatchObject({ platform: 'desktop', status: 'FAIL', historyId: 실패항목 });
  });

  it('lastByCase — 아직 안 끝난 항목은 마지막 결과가 아니다', async () => {
    const 마지막 = (await lastByCase()).filter((r) => r.tcId === 'XBQ-001');
    expect(마지막.some((r) => r.platform === 'mobile')).toBe(false);
  });
});
