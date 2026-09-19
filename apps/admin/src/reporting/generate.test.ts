// 증적 문서 생성이 형식대로 파일을 남기고 evidence_document 를 닫는지 본다 (SPEC §8.4)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import ExcelJS from 'exceljs';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { generate } from './generate.js';
import { claim, findDocument } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 제목 = 'XDG 증적 생성 실행';

/** 1×1 PNG. 진짜 파일이어야 base64 로 심기는지까지 본다 */
const 픽셀 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe.skipIf(연결 === undefined)('증적 문서 생성', () => {
  let pool: Pool;
  let runId: number;
  let 증적폴더: string;
  /** 러너가 DB 에 남기는 실제 형식이다 (packages/kit runtime/artifacts.ts shotPath) */
  let 있는화면: string;
  let 없는화면: string;
  let 벗어난화면: string;

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

    const historyId = Number(item.rows[0].history_id);
    있는화면 = `artifacts/runs/${String(runId)}/${String(historyId)}/1.png`;
    없는화면 = `artifacts/runs/${String(runId)}/${String(historyId)}/2.png`;
    벗어난화면 = `artifacts/runs/${String(runId)}/../../../../etc/hosts`;

    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, screenshot_path)
       VALUES ($1, 1, '결제 화면을 연다', 'PASS', 312,
               '[{"statement":"응답 코드가 정상이다","status":"PASS","actual":200,"expected":200}]', $2),
              ($1, 2, '카드 번호를 넣는다', 'PASS', 210,
               '[{"statement":"카드가 등록된다","status":"PASS","actual":true,"expected":true}]', $3),
              ($1, 3, '결제를 누른다', 'PASS', 140,
               '[{"statement":"결제가 끝난다","status":"PASS","actual":true,"expected":true}]', $4)`,
      [historyId, 있는화면, 없는화면, 벗어난화면],
    );

    증적폴더 = await mkdtemp(join(tmpdir(), 'xdg-evidence-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 증적폴더;

    // 저장값의 artifacts/ 접두사는 PLATFORM_ARTIFACTS_DIR 과 겹친다. 떼고 붙여야 실제 파일 자리다
    const 실파일 = join(증적폴더, 있는화면.slice('artifacts/'.length));
    await mkdir(dirname(실파일), { recursive: true });
    await writeFile(실파일, 픽셀);
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

  // 결함: 저장된 경로를 그대로 <img src> 에 넣으면 HTML 은 404, PDF 는 setContent 라 요청조차 안 나갔다.
  // 세 형식 어디에서도 그림이 안 떴고 검수처가 받는 문서가 「화면 증적」 없이 나갔다 (SPEC §8.4)
  it('HTML 은 스크린샷을 data: URI 로 문서 안에 심는다', { timeout: 60_000 }, async () => {
    const 문서 = await claim(runId, 'HTML');

    await generate(문서.id, runId, 'HTML');

    const 파일 = await readFile(join(증적폴더, 'evidence', String(runId), `${String(문서.id)}.html`), 'utf8');

    // 파일이 있는 스텝 하나만 심긴다. 없는 것과 경로가 벗어난 것은 조용히 빠진다
    expect(파일.match(/src="data:image\/png;base64,/g)).toHaveLength(1);
    expect(파일).toContain(픽셀.toString('base64'));
    // 바깥 파일을 가리키는 img 가 하나라도 남으면 PDF 에서 그대로 빈 칸이 된다
    expect(파일).not.toContain('src="artifacts/');
    expect(파일).not.toContain(있는화면);
    expect(파일).not.toContain(없는화면);
  });

  it('스크린샷 파일이 없거나 경로가 벗어나도 READY 로 닫힌다', { timeout: 60_000 }, async () => {
    const 문서 = await claim(runId, 'HTML');

    await generate(문서.id, runId, 'HTML');

    // 그림 한 장이 사라졌다고 증적 전체를 못 내면 안 된다
    expect(await findDocument(문서.id)).toMatchObject({ status: 'READY', error: null });
  });

  it('엑셀은 심지 않고 저장된 경로 글자를 그대로 쓴다', { timeout: 60_000 }, async () => {
    const 문서 = await claim(runId, 'XLSX');

    await generate(문서.id, runId, 'XLSX');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(join(증적폴더, 'evidence', String(runId), `${String(문서.id)}.xlsx`));
    const ws = wb.worksheets[0]!;
    // 칸 번호로 읽으면 머리행에 칸이 하나 늘 때마다 여기가 조용히 다른 칸을 읽는다.
    // 실제로 2026-09-20 에 사유 칸이 들어오면서 판정 칸을 읽고 있었다 — 이름으로 찾는다
    const 머리 = ws.getRow(1).values as (string | undefined)[];
    const 경로열 = 머리.indexOf('스크린샷경로');
    expect(경로열).toBeGreaterThan(0);
    const 경로칸 = [2, 3, 4].map((행) => String(ws.getRow(행).getCell(경로열).value ?? ''));

    // 이미지를 박으면 파일이 무거워지고 열기 느려진다 (SPEC §8.4). 심는 변환을 XLSX 가 타면 안 된다
    expect(경로칸).toEqual([있는화면, 없는화면, 벗어난화면]);
    expect(ws.getImages()).toEqual([]);
  });

  it('만들다 깨지면 FAILED 로 닫히고 원문 오류는 DB 에 들어가지 않는다', { timeout: 60_000 }, async () => {
    const 문서 = await claim(runId, 'PDF');

    await generate(문서.id, 999_999_999, 'PDF');

    const 닫힌행 = await findDocument(문서.id);
    expect(닫힌행).toMatchObject({ status: 'FAILED', filePath: null, error: '증적 문서를 만들지 못했습니다' });
    expect(닫힌행?.error).not.toContain('999999999');
  });
});
