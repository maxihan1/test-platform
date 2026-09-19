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
               'demo/XBQ-001.spec.ts',
               '{"type":"object","properties":{"아이디":{"type":"string","description":"박제된 라벨"}}}',
               '{"type":"object","properties":{"결과":{"type":"boolean","description":"박제된 기대 라벨"}}}', 300000)
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
    await pool.query("DELETE FROM evidence_document WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XBQ%')");
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XBQ%')");
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XBQ%'");
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'XBQ-%'");
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

  it('findRun — 증적 목록을 상태와 함께 싣는다', async () => {
    await pool.query(
      `INSERT INTO evidence_document (run_id, format, status, file_path)
       VALUES ($1, 'pdf', 'PENDING', NULL)`,
      [나중],
    );

    const found = await findRun(나중);
    expect(found?.evidence).toHaveLength(1);
    // 화면 버튼 문구가 이 값으로 갈린다. PENDING 이면 파일이 아직 없다 (SPEC §8.4)
    expect(found?.evidence[0]).toMatchObject({ format: 'pdf', status: 'PENDING', filePath: null });
  });

  it('findRun — 실행과 항목 목록이 같이 온다', async () => {
    const run = await findRun(나중);
    expect(run?.title).toBe('XBQ 나중에 돈 실행');
    expect(run?.items).toHaveLength(2);
    expect(run?.items.map((i) => i.platform).sort()).toEqual(['desktop', 'mobile']);
    expect(run?.items[0]?.tcName).toBe('조회용 케이스');
  });

  it('findRun — 목록이 「어떤 값으로 돌렸나」를 그릴 수 있게 값과 라벨을 싣는다 (SPEC §8.3)', async () => {
    const run = await findRun(나중);
    // §8.1 의 「JSON 원문을 목록에 노출하지 않는다」는 케이스 목록 규칙이다.
    // 라벨과 값을 붙여 쓴 한 줄은 JSON 원문이 아니라고 §8.3 이 명시했다
    expect(run?.items[0]?.params).toEqual({ 아이디: 'tester' });
    expect(run?.items[0]?.paramSchema).toMatchObject({
      properties: { 아이디: { description: '박제된 라벨' } },
    });
  });

  it('findRun — 없는 실행은 null이다', async () => {
    expect(await findRun(999_999_999)).toBeNull();
  });

  it('findItem — 라벨을 카탈로그가 아니라 항목에 박제된 스키마에서 읽을 수 있게 싣는다', async () => {
    // 케이스 코드의 .describe() 를 고친 날 반년 전 증적의 라벨까지 바뀌면 안 된다 (SPEC §3.3 · §6)
    await pool.query(
      `INSERT INTO test_case (tc_id, name, file_path, platforms, precondition, param_schema, expected_schema)
       VALUES ('XBQ-001', '조회용 케이스', 'demo/XBQ-001.spec.ts', '["desktop"]', '[]',
               '{"type":"object","properties":{"아이디":{"type":"string","description":"나중에 고친 라벨"}}}',
               '{"type":"object","properties":{}}')
       ON CONFLICT (tc_id) DO UPDATE SET param_schema = EXCLUDED.param_schema`,
    );

    const item = await findItem(나중, 실패항목);
    expect(item?.paramSchema).toMatchObject({
      properties: { 아이디: { description: '박제된 라벨' } },
    });
    expect(item?.expectedSchema).toMatchObject({
      properties: { 결과: { description: '박제된 기대 라벨' } },
    });
  });

  it('findItem — 회차를 싣는다. 목록이 3/5 통과를 세려면 필요하다 (SPEC §8.3)', async () => {
    const item = await findItem(나중, 실패항목);
    expect(item?.attempt).toBe(1);
  });

  it('findRun — 항목 목록에도 회차가 온다', async () => {
    const run = await findRun(나중);
    expect(run?.items[0]?.attempt).toBe(1);
  });

  it('findRun — 대상 서버 주소와 서비스 이름을 박제된 값으로 싣는다 (SPEC §8.3 RUN 머리)', async () => {
    const run = await findRun(나중);
    expect(run?.baseUrl).toBe('https://qa.example.com');
    expect(run?.serviceName).toBe('XBQ 서비스');
  });

  it('listRuns — 목록에도 대상 서버 주소가 온다', async () => {
    const 목록 = await listRuns('XBQ', 1, 50);
    const 것 = 목록.items.find((r) => r.runId === 나중);
    expect(것?.baseUrl).toBe('https://qa.example.com');
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
    const 마지막 = (await lastByCase(['XBQ'])).filter((r) => r.tcId === 'XBQ-001');
    expect(마지막).toHaveLength(1);
    expect(마지막[0]).toMatchObject({ platform: 'desktop', status: 'FAIL', historyId: 실패항목 });
  });

  it('lastByCase — 아직 안 끝난 항목은 마지막 결과가 아니다', async () => {
    const 마지막 = (await lastByCase(['XBQ'])).filter((r) => r.tcId === 'XBQ-001');
    expect(마지막.some((r) => r.platform === 'mobile')).toBe(false);
  });
});
