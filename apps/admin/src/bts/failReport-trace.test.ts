// 실패 등록은 그 순간까지 맡긴 trace 풀기를 기다린다 — 마지막 항목의 네트워크 · 콘솔이 이슈 본문에서 빠지지 않는다 (도메인/BTS 「버그 바퀴」)
// DATABASE_URL 이 있을 때만 돈다

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import JSZip from 'jszip';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// trace 풀기가 zip 을 읽는 자리를 붙잡는다 — 실행이 끝난 직후 마지막 항목이 아직 줄에 있는 때를 만든다
const 문 = vi.hoisted(() => ({ 열림: Promise.resolve() }));
vi.mock('../artifactFile.js', async (진짜) => {
  const m = await 진짜<typeof import('../artifactFile.js')>();
  return {
    ...m,
    볼륨파일읽기: async (경로: string): Promise<Buffer> => {
      await 문.열림;
      return m.볼륨파일읽기(경로);
    },
  };
});

const 연결 = process.env.DATABASE_URL;

const j = (...줄: unknown[]): string => 줄.map((l) => JSON.stringify(l)).join('\n');

async function 가짜zip(): Promise<Buffer> {
  const 묶음 = new JSZip();
  묶음.file('test.trace', j({ type: 'context-options', monotonicTime: 0 }));
  묶음.file(
    '1-trace.network',
    j({
      type: 'resource-snapshot',
      snapshot: {
        _monotonicTime: 20, _resourceType: 'fetch', time: 4,
        request: { method: 'POST', url: 'http://a/api/order' },
        response: { status: 500, content: { mimeType: 'application/json', text: '{}' } },
      },
    }),
  );
  묶음.file('1-trace.trace', j({ type: 'console', messageType: 'error', text: '주문 저장 실패', time: 30, location: { url: 'http://a/' } }));
  return 묶음.generateAsync({ type: 'nodebuffer' });
}

describe.skipIf(연결 === undefined)('실패 등록 — trace 풀기 기다리기', () => {
  let pool: Pool;
  let 서비스 = 0;
  let 임시 = '';
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    임시 = mkdtempSync(join(tmpdir(), 'xbt-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XBT 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XBT', 'XBT 마켓', '#112233', '', 'xbt', $1) RETURNING id`,
          [프로젝트],
        )
      ).rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'DM', 'qahub-xbt', 's', '{}', '{}', 'xbt')`,
      [프로젝트],
    );
  });

  afterAll(async () => {
    // run_trace · run_network · run_console 은 run_item 과, bts_outbox · service_api 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    rmSync(임시, { recursive: true, force: true });
  });

  it('마지막 항목의 trace 가 아직 줄에 있으면 풀릴 때까지 기다렸다가 실패한 요청 · 콘솔 오류를 본문에 넣는다', async () => {
    const { trace경로, trace적재를맡긴다 } = await import('../execution/traceIngest.js');
    const { 실패등록 } = await import('./failReport.js');
    const runId = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, started_at, finished_at)
           VALUES ('XBT 실행', 'xbt', 'qa', 'FINISHED', $1, 'XBT 마켓', '', 'http://a', 'FN', now() - interval '1 minute', now()) RETURNING run_id`,
          [서비스],
        )
      ).rows[0]!.run_id,
    );
    const historyId = Number(
      (
        await pool.query<{ history_id: string }>(
          `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected,
                                 param_schema, expected_schema, status, duration_ms, finished_at)
           VALUES ($1, 'XBT-001', 'desktop', 1, 'XBT-001 주문 저장', 'xbt/a.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', 'FAIL', 100, now())
           RETURNING history_id`,
          [runId],
        )
      ).rows[0]!.history_id,
    );
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions) VALUES ($1, 1, '주문을 저장한다', 'FAIL', 10, '[]')`,
      [historyId],
    );
    const 경로 = trace경로(runId, historyId);
    mkdirSync(dirname(경로), { recursive: true });
    writeFileSync(경로, await 가짜zip());

    let 열기 = (): void => undefined;
    문.열림 = new Promise((r) => {
      열기 = r;
    });
    void trace적재를맡긴다(historyId);
    const 등록 = 실패등록(runId);
    const 먼저 = await Promise.race([등록.then(() => '등록'), new Promise((r) => setTimeout(() => r('기다림'), 1000))]);
    열기();
    expect(await 등록).toBe(1);
    expect(먼저).toBe('기다림');

    const 본문 = (
      await pool.query<{ payload: { description: string } }>(`SELECT payload FROM bts_outbox WHERE service_id = $1 AND kind = 'CREATE'`, [서비스])
    ).rows[0]!.payload.description;
    expect(본문).toContain('- 요청: POST http://a/api/order → 500');
    expect(본문).toContain('- 콘솔: [error] 주문 저장 실패');
    expect(본문).not.toContain('Test Commander 실행 결과에서 보세요');
  });
});
