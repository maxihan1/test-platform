// 실행 생성이 환경 수만큼 행을 만들고 값을 스냅샷으로 복사하는지, 결과가 절차까지 저장되는지 본다.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { ExecuteResponse } from '@platform/kit';

import { createRun, finishItem, finishRun } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 케이스 = `
  INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
  VALUES ($1, $2, $3, $4, $5, '{"type":"object","properties":{"아이디":{"description":"아이디"}}}',
          '{"type":"object","properties":{"결과":{"description":"결과"}}}')
  ON CONFLICT (tc_id) DO UPDATE SET name = EXCLUDED.name, platforms = EXCLUDED.platforms`;

const 서비스 = `
  WITH s AS (
    INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
    VALUES ($1, $2, '#445566', $4, $3)
    ON CONFLICT (prefix) DO UPDATE SET is_active = true, tests_repo = EXCLUDED.tests_repo
    RETURNING id
  )
  INSERT INTO service_env (service_id, env, base_url)
  SELECT id, 'qa', 'https://qa.example.com' FROM s
  ON CONFLICT (service_id, env) DO UPDATE SET base_url = EXCLUDED.base_url`;

describe.skipIf(연결 === undefined)('실행 저장', () => {
  let pool: Pool;

  async function 치운다(): Promise<void> {
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XBS%')");
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XBS%'");
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    // 실행은 tcId 접두사로 서비스를 찾고 그 서비스의 대상 서버에서 주소를 읽는다 (SPEC §6 · §7)
    await pool.query(서비스, ['XBS', 'XBS 서비스', 'xbs', 'https://xbs.example.com']);
    await pool.query(케이스, [
      'XBS-001',
      '두 환경을 지원하는 케이스',
      JSON.stringify(['desktop', 'mobile']),
      JSON.stringify(['사전조건 하나', '사전조건 둘']),
      'demo/XBS-001.spec.ts',
    ]);
  });

  afterAll(async () => {
    await 치운다();
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'XBS%'");
    await pool.query("DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix = 'XBS')");
    await pool.query("DELETE FROM service WHERE prefix = 'XBS'");
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  beforeEach(치운다);

  const 항목 = {
    tcId: 'XBS-001',
    platforms: ['desktop', 'mobile'] as const,
    params: { 아이디: 'tester' },
    expected: { 결과: true },
  };

  it('platforms 길이만큼 run_item을 만든다', async () => {
    const run = await createRun({ title: 'XBS 두 환경', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: [...항목.platforms] }] });
    expect(run.items).toHaveLength(2);
    expect(run.items.map((i) => i.platform).sort()).toEqual(['desktop', 'mobile']);

    const rows = await pool.query('SELECT count(*)::int AS n FROM run_item WHERE run_id = $1', [run.runId]);
    expect(rows.rows[0]?.n).toBe(2);
  });

  it('생성 직후에는 판정이 NA이고 끝난 시각이 비어 있다', async () => {
    const run = await createRun({ title: 'XBS 생성 직후', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });
    const row = await pool.query<{ status: string; finished_at: Date | null; duration_ms: number | null }>(
      'SELECT status, finished_at, duration_ms FROM run_item WHERE run_id = $1',
      [run.runId],
    );
    expect(row.rows[0]).toMatchObject({ status: 'NA', finished_at: null, duration_ms: null });
  });

  it('실행 묶음은 RUNNING으로 시작한다', async () => {
    const run = await createRun({ title: 'XBS 시작', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });
    const row = await pool.query<{ status: string }>('SELECT status FROM test_run WHERE run_id = $1', [run.runId]);
    expect(row.rows[0]?.status).toBe('RUNNING');
  });

  it('케이스명과 사전조건을 스냅샷으로 복사해 나중에 이름이 바뀌어도 그대로다', async () => {
    const run = await createRun({ title: 'XBS 스냅샷', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });
    await pool.query('UPDATE test_case SET name = $1 WHERE tc_id = $2', ['이름이 바뀐 케이스', 'XBS-001']);

    const row = await pool.query<{ tc_name: string; precondition: string[]; params: unknown; expected: unknown }>(
      'SELECT tc_name, precondition, params, expected FROM run_item WHERE run_id = $1',
      [run.runId],
    );
    expect(row.rows[0]?.tc_name).toBe('두 환경을 지원하는 케이스');
    expect(row.rows[0]?.precondition).toEqual(['사전조건 하나', '사전조건 둘']);
    expect(row.rows[0]?.params).toEqual({ 아이디: 'tester' });
    expect(row.rows[0]?.expected).toEqual({ 결과: true });

    await pool.query('UPDATE test_case SET name = $1 WHERE tc_id = $2', ['두 환경을 지원하는 케이스', 'XBS-001']);
  });

  it('러너에 넘길 파일 경로와 제한 시간을 같이 돌려준다', async () => {
    const run = await createRun({
      title: 'XBS 제한 시간',
      triggeredBy: 'tester',
      env: 'qa',
      items: [{ ...항목, platforms: ['desktop'], timeoutMs: 5000 }],
    });
    expect(run.items[0]).toMatchObject({ filePath: 'demo/XBS-001.spec.ts', timeoutMs: 5000 });
  });

  it('제한 시간을 안 주면 5분이 기본이다', async () => {
    const run = await createRun({ title: 'XBS 기본 제한', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });
    expect(run.items[0]?.timeoutMs).toBe(300_000);
  });

  it('카탈로그에 없는 케이스는 그 tcId를 사유에 담아 거절한다', async () => {
    await expect(
      createRun({ title: 'XBS 없는 케이스', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, tcId: 'XBS-404', platforms: ['desktop'] }] }),
    ).rejects.toThrow('XBS-404');
  });

  it('같은 케이스와 환경을 두 번 넣으면 거절한다', async () => {
    await expect(
      createRun({
        title: 'XBS 중복',
        triggeredBy: 'tester',
        env: 'qa',
        items: [
          { ...항목, platforms: ['desktop'] },
          { ...항목, platforms: ['desktop'] },
        ],
      }),
    ).rejects.toThrow('PC');
  });

  it('빈 목록은 거절한다', async () => {
    await expect(createRun({ title: 'XBS 빈 목록', triggeredBy: 'tester', env: 'qa', items: [] })).rejects.toThrow();
  });

  it('서비스 이름과 저장소와 대상 주소를 실행에 박제한다', async () => {
    const run = await createRun({ title: 'XBS 박제', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });

    const row = await pool.query<{ env: string; service_name: string; tests_repo: string; base_url: string; service_id: string }>(
      'SELECT env, service_name, tests_repo, base_url, service_id FROM test_run WHERE run_id = $1',
      [run.runId],
    );
    expect(row.rows[0]).toMatchObject({
      env: 'qa',
      service_name: 'XBS 서비스',
      tests_repo: 'https://xbs.example.com',
      base_url: 'https://qa.example.com',
    });
    expect(row.rows[0]?.service_id).not.toBeNull();
  });

  it('라벨과 제한 시간과 파일 경로를 항목에 박제한다', async () => {
    const run = await createRun({
      title: 'XBS 항목 박제',
      triggeredBy: 'tester',
      env: 'qa',
      items: [{ ...항목, platforms: ['desktop'], timeoutMs: 7000 }],
    });

    const row = await pool.query<{ file_path: string; param_schema: Record<string, unknown>; timeout_ms: number }>(
      'SELECT file_path, param_schema, timeout_ms FROM run_item WHERE run_id = $1',
      [run.runId],
    );
    expect(row.rows[0]?.file_path).toBe('demo/XBS-001.spec.ts');
    expect(row.rows[0]?.timeout_ms).toBe(7000);
    expect(row.rows[0]?.param_schema).toMatchObject({ properties: { 아이디: { description: '아이디' } } });
  });

  it('러너에 넘길 항목에 대상 주소가 실려 있다', async () => {
    const run = await createRun({ title: 'XBS 주소', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });
    expect(run.items[0]?.baseUrl).toBe('https://qa.example.com');
  });

  it('접두사가 섞이면 MIXED_SERVICE로 거절한다', async () => {
    await expect(
      createRun({
        title: 'XBS 섞임',
        triggeredBy: 'tester',
        env: 'qa',
        items: [
          { ...항목, platforms: ['desktop'] },
          { ...항목, tcId: 'XBR-001', platforms: ['desktop'] },
        ],
      }),
    ).rejects.toMatchObject({ code: 'MIXED_SERVICE' });
  });

  it('그 서비스에 없는 대상 서버는 ENV_NOT_FOUND로 거절한다', async () => {
    await expect(
      createRun({ title: 'XBS 없는 환경', triggeredBy: 'tester', env: '없는환경', items: [{ ...항목, platforms: ['desktop'] }] }),
    ).rejects.toMatchObject({ code: 'ENV_NOT_FOUND' });
  });

  it('등록되지 않은 접두사는 SERVICE_FORBIDDEN으로 거절한다', async () => {
    await expect(
      createRun({ title: 'XBS 없는 서비스', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, tcId: 'XBQ-001', platforms: ['desktop'] }] }),
    ).rejects.toMatchObject({ code: 'SERVICE_FORBIDDEN' });
  });

  const 결과: ExecuteResponse = {
    historyId: 0,
    status: 'FAIL',
    durationMs: 1234,
    steps: [
      {
        seq: 1,
        title: '로그인 API를 호출한다',
        status: 'PASS',
        durationMs: 312,
        assertions: [{ statement: '응답 코드가 정상이다', status: 'PASS', actual: 200, expected: 200 }],
      },
      {
        seq: 2,
        title: '토큰을 검증한다',
        status: 'FAIL',
        durationMs: 88,
        assertions: [{ statement: '토큰이 발급된다', status: 'FAIL', actual: false, expected: true, blocker: true }],
        line: 19,
        screenshotPath: 'artifacts/runs/1/1/2.png',
      },
    ],
  };

  it('결과를 받으면 판정·소요시간·끝난 시각을 채운다', async () => {
    const run = await createRun({ title: 'XBS 결과', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });
    const historyId = run.items[0]!.historyId;
    await finishItem(historyId, { ...결과, historyId });

    const row = await pool.query<{ status: string; duration_ms: number; finished_at: Date | null }>(
      'SELECT status, duration_ms, finished_at FROM run_item WHERE history_id = $1',
      [historyId],
    );
    expect(row.rows[0]?.status).toBe('FAIL');
    expect(row.rows[0]?.duration_ms).toBe(1234);
    expect(row.rows[0]?.finished_at).not.toBeNull();
  });

  it('절차와 검증 문장을 그대로 저장한다', async () => {
    const run = await createRun({ title: 'XBS 절차', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });
    const historyId = run.items[0]!.historyId;
    await finishItem(historyId, { ...결과, historyId });

    const rows = await pool.query<{ seq: number; title: string; assertions: unknown; line: number | null; screenshot_path: string | null }>(
      'SELECT seq, title, assertions, line, screenshot_path FROM run_item_step WHERE history_id = $1 ORDER BY seq',
      [historyId],
    );
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[1]?.assertions).toEqual([
      { statement: '토큰이 발급된다', status: 'FAIL', actual: false, expected: true, blocker: true },
    ]);
    expect(rows.rows[1]?.line).toBe(19);
    expect(rows.rows[1]?.screenshot_path).toBe('artifacts/runs/1/1/2.png');
  });

  it('러너가 죽은 항목은 NA와 사유로 남는다', async () => {
    const run = await createRun({ title: 'XBS 고장', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: ['desktop'] }] });
    const historyId = run.items[0]!.historyId;
    await finishItem(historyId, { historyId, status: 'NA', durationMs: 30, steps: [], error: { message: 'TIMEOUT' } });

    const row = await pool.query<{ status: string; error: { message: string } }>(
      'SELECT status, error FROM run_item WHERE history_id = $1',
      [historyId],
    );
    expect(row.rows[0]?.status).toBe('NA');
    expect(row.rows[0]?.error.message).toBe('TIMEOUT');
  });

  it('항목이 하나라도 안 끝났으면 실행 묶음은 FINISHED가 되지 않는다', async () => {
    const run = await createRun({ title: 'XBS 미완', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: [...항목.platforms] }] });
    await finishItem(run.items[0]!.historyId, { ...결과, historyId: run.items[0]!.historyId });
    await finishRun(run.runId);

    const row = await pool.query<{ status: string }>('SELECT status FROM test_run WHERE run_id = $1', [run.runId]);
    expect(row.rows[0]?.status).toBe('RUNNING');
  });

  it('항목이 전부 끝나면 FINISHED가 된다', async () => {
    const run = await createRun({ title: 'XBS 완료', triggeredBy: 'tester', env: 'qa', items: [{ ...항목, platforms: [...항목.platforms] }] });
    for (const item of run.items) await finishItem(item.historyId, { ...결과, historyId: item.historyId });
    await finishRun(run.runId);

    const row = await pool.query<{ status: string; finished_at: Date | null }>(
      'SELECT status, finished_at FROM test_run WHERE run_id = $1',
      [run.runId],
    );
    expect(row.rows[0]?.status).toBe('FINISHED');
    expect(row.rows[0]?.finished_at).not.toBeNull();
  });
});
