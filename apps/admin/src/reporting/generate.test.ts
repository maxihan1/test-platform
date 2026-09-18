// 증적 문서 생성이 형식대로 파일을 남기고 evidence_document 를 닫는지 본다 (SPEC §8.4)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { generate } from './generate.js';
import { claim, findDocument } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 제목 = 'XDG 증적 생성 실행';

describe.skipIf(연결 === undefined)('증적 문서 생성', () => {
  let pool: Pool;
  let runId: number;
  let 증적폴더: string;

  async function 증적을치운다(): Promise<void> {
    await pool.query(
      'DELETE FROM evidence_document WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE $1)',
      [`${제목}%`],
    );
  }

  async function 통째로치운다(): Promise<void> {
    await 증적을치운다();
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE $1)', [
      `${제목}%`,
    ]);
    await pool.query('DELETE FROM test_run WHERE title LIKE $1', [`${제목}%`]);
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 통째로치운다();

    const run = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, env, status, service_name, tests_repo, base_url, started_at)
       VALUES ($1, 'tester', '검수자', 'demo', 'FINISHED', '', 'xdg-pdf', 'https://xdg-pdf.example.com', '2026-09-19T03:04:05Z')
       RETURNING run_id`,
      [제목],
    );
    runId = Number(run.rows[0].run_id);

    const item = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, finished_at)
       VALUES ($1, 'XDG-001', 'desktop', 1, '결제 수단을 등록한다', 'demo/XDG-001.spec.ts', 300000,
               '["로그인 되어 있다"]', '{"loginId":"tester"}', '{"ok":true}',
               '{"type":"object","properties":{}}', '{"type":"object","properties":{}}',
               'PASS', 1234, now())
       RETURNING history_id`,
      [runId],
    );

    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, screenshot_path)
       VALUES ($1, 1, '결제 화면을 연다', 'PASS', 312,
               '[{"statement":"응답 코드가 정상이다","status":"PASS","actual":200,"expected":200}]', NULL)`,
      [Number(item.rows[0].history_id)],
    );

    증적폴더 = await mkdtemp(join(tmpdir(), 'xdg-evidence-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 증적폴더;
  });

  afterAll(async () => {
    await 통째로치운다();
    await rm(증적폴더, { recursive: true, force: true });
    delete process.env.PLATFORM_ARTIFACTS_DIR;
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  beforeEach(증적을치운다);

  // Chromium 기동과 실행 대기줄을 함께 기다리므로 vitest 기본 5초로는 모자란다
  it('PDF 를 만들면 evidence/<runId>/<id>.pdf 가 생기고 READY 로 닫힌다', { timeout: 60_000 }, async () => {
    const 문서 = await claim(runId, 'PDF');

    await generate(문서.id, runId, 'PDF');

    const 기대경로 = join(증적폴더, 'evidence', String(runId), `${String(문서.id)}.pdf`);
    const 닫힌행 = await findDocument(문서.id);
    expect(닫힌행).toMatchObject({ status: 'READY', filePath: 기대경로, error: null });

    const 파일 = await readFile(기대경로);
    expect(파일.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  // 형식 셋이 전부 같은 규율로 닫히는지 본다. XLSX 만 확인이 빠져 있으면 그 갈래가 조용히 썩는다
  it('엑셀을 만들면 evidence/<runId>/<id>.xlsx 가 생기고 READY 로 닫힌다', { timeout: 60_000 }, async () => {
    const 문서 = await claim(runId, 'XLSX');

    await generate(문서.id, runId, 'XLSX');

    const 기대경로 = join(증적폴더, 'evidence', String(runId), `${String(문서.id)}.xlsx`);
    const 닫힌행 = await findDocument(문서.id);
    expect(닫힌행).toMatchObject({ status: 'READY', filePath: 기대경로, error: null });

    // xlsx 는 zip 이다. 앞 두 바이트가 PK 가 아니면 엑셀이 못 연다
    const 파일 = await readFile(기대경로);
    expect(파일.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('HTML 을 만들면 evidence/<runId>/<id>.html 이 생기고 READY 로 닫힌다', { timeout: 60_000 }, async () => {
    const 문서 = await claim(runId, 'HTML');

    await generate(문서.id, runId, 'HTML');

    const 기대경로 = join(증적폴더, 'evidence', String(runId), `${String(문서.id)}.html`);
    const 닫힌행 = await findDocument(문서.id);
    expect(닫힌행).toMatchObject({ status: 'READY', filePath: 기대경로, error: null });

    // 머리말의 실행 제목이 실제로 박혀 나오는지까지 본다. 빈 껍데기가 READY 로 닫히면 안 된다
    const 파일 = await readFile(기대경로, 'utf8');
    expect(파일).toContain(제목);
  });

  it('만들다 깨지면 FAILED 로 닫히고 원문 오류는 DB 에 들어가지 않는다', { timeout: 60_000 }, async () => {
    const 문서 = await claim(runId, 'PDF');

    await generate(문서.id, 999_999_999, 'PDF');

    const 닫힌행 = await findDocument(문서.id);
    expect(닫힌행).toMatchObject({ status: 'FAILED', filePath: null, error: '증적 문서를 만들지 못했습니다' });
    expect(닫힌행?.error).not.toContain('999999999');
  });
});
