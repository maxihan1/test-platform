// QA 리포트 파일 통로 — 첫 장과 같은 실행의 항목으로 구획을 그리고 · HTML · 워드 · 굳힌 PDF 를 낸다 (DB 접속이 있을 때만 돈다)
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { QA리포트를다시만든다 } from './qaReport.js';
import qaReportRoutes from './qaReportRoutes.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('QA 리포트 파일', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 앱 = 0;
  let 남의프로젝트 = 0;
  let 리포트 = 0;
  let 폴더 = '';
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;
  const 계정들 = ['xqe-reader', 'xqe-other'];
  const 케이스들 = ['XQE-FN-001', 'XQE-FN-002'];
  const 쿠키 = new Map<string, string>();

  const 부르기 = (누구: string, url: string) => app.inject({ method: 'GET', url, headers: { cookie: 쿠키.get(누구) ?? '' } });
  const 실행만들기 = async (build: string, origin: string, 시작: string, rerunOf: number | null = null) =>
    Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, triggered_by_name, env, base_url, status, service_id, kind, origin, build_no, rerun_of, started_at, finished_at)
           VALUES ('XQE 실행', 'XQE 웹', '', 'xqe-a', 'xqe-a', 'qa', 'https://qa.xqe.test', 'FINISHED', $1, 'FN', $2, $3, $4, $5, $5::timestamptz + interval '1 hour')
           RETURNING run_id`,
          [앱, origin, build, rerunOf, 시작],
        )
      ).rows[0]!.run_id,
    );
  const 항목 = (runId: number, tcId: string, status: string) =>
    pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, error, finished_at)
       VALUES ($1, $2, 'desktop', $2 || ' 이름', 'xqe.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', $3, 100, CASE WHEN $3 = 'FAIL' THEN '{"message":"boom"}'::jsonb END, now())`,
      [runId, tcId, status],
    );

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    폴더 = await mkdtemp(join(tmpdir(), 'xqe-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 폴더;
    app = Fastify();
    세션등록(app, 'xqe-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(qaReportRoutes, { prefix: '/api' });
    await app.ready();

    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQE 프로젝트') RETURNING id`)).rows[0]!.id);
    남의프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQE 다른 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number((await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQE', 'XQE 웹', '#3A5FCD', '', 'xqe', $1) RETURNING id`, [프로젝트])).rows[0]!.id);
    for (const tc of 케이스들) await pool.query(`INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema) VALUES ($1, $1 || ' 이름', 'xqe.spec.ts', '{}', '{}')`, [tc]);
    await pool.query(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XQE-REQ-001', 'XQE-FN-001', '정상')`, [앱]);
    for (const [username, pid] of [['xqe-reader', 프로젝트], ['xqe-other', 남의프로젝트]] as const) {
      await pool.query(`INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', true, false)`, [username, await 해시('열려라참깨')]);
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', 'read', 'none')`, [username, pid]);
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
      쿠키.set(username, (res.headers['set-cookie'] as string).split(';')[0] ?? '');
    }

    // 빌드 2.0 — 앞 실행에서 깨진 FN-001 을 뒤 실행이 통과로 덮는다. FN-002 를 실패로 바꾼 한 건 실행은 다른 빌드라 덮지 않는다
    const 앞 = await 실행만들기('2.0', 'MANUAL', '2026-11-12T01:00:00Z');
    await 항목(앞, 'XQE-FN-001', 'FAIL');
    await 항목(앞, 'XQE-FN-002', 'PASS');
    const 뒤 = await 실행만들기('2.0', 'MANUAL', '2026-11-12T03:00:00Z');
    await 항목(뒤, 'XQE-FN-001', 'PASS');
    const 남의빌드 = await 실행만들기('2.1', 'SINGLE', '2026-11-12T05:00:00Z', 앞);
    await 항목(남의빌드, 'XQE-FN-002', 'FAIL');
    await QA리포트를다시만든다({ runId: 앞 });
    expect(await QA리포트를다시만든다({ runId: 뒤 })).toBe('고침');
    리포트 = Number((await pool.query<{ id: string }>('SELECT id FROM qa_report WHERE service_id = $1', [앱])).rows[0]!.id);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM qa_report WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1 AND rerun_of IS NOT NULL', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM req_case WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
    await pool.query('DELETE FROM project WHERE id = $1', [남의프로젝트]);
    await app.close();
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    await rm(폴더, { recursive: true, force: true });
  });

  it('HTML 은 첫 장 숫자를 낸 그 실행의 항목으로 구획을 그린다', async () => {
    const res = await 부르기('xqe-reader', `/api/qa-reports/${리포트}/file?format=HTML`);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['content-disposition']).toBe(`inline; filename="qa-report-${리포트}-v1.html"`);
    expect(res.body).toContain('통과 2 · 실패 0 · 미실행 0');
    const 칩 = (tc: string, 판정: string, 꼴: string) => `<span>${tc}</span><span class="chip ${꼴}">${판정}</span>`;
    expect(res.body).toContain(칩('XQE-FN-001', '통과', 'c-pass'));
    expect(res.body).toContain(칩('XQE-FN-002', '통과', 'c-pass'));
    expect(res.body).not.toContain(칩('XQE-FN-002', '실패', 'c-fail'));
    expect(res.body).toContain('견줄 이전 빌드 없음');
    expect(res.body).toContain('Issue Bunker 미연결');
  });

  it('워드는 내려받기로 내고 같은 글을 싣는다', async () => {
    const res = await 부르기('xqe-reader', `/api/qa-reports/${리포트}/file?format=DOCX`);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.headers['content-disposition']).toBe(`attachment; filename="qa-report-${리포트}-v1.docx"`);
    const 몸 = await (await JSZip.loadAsync(res.rawPayload)).file('word/document.xml')!.async('string');
    expect(몸).toContain('요구사항 추적표');
    expect(몸).toContain('XQE-REQ-001');
  });

  it('승인한 버전의 PDF 는 굳힌 파일 그대로다', async () => {
    const 굳힌 = join(폴더, 'qa-report', `${리포트}.pdf`);
    await mkdir(join(폴더, 'qa-report'), { recursive: true });
    await writeFile(굳힌, '%PDF-굳힌');
    await pool.query(`UPDATE qa_report SET approved_by = 'xqe-admin', approved_at = now(), pdf_path = $2, pdf_sha256 = 'ab' WHERE id = $1`, [리포트, 굳힌]);
    const res = await 부르기('xqe-reader', `/api/qa-reports/${리포트}/file?format=PDF`);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body).toBe('%PDF-굳힌');
  });

  it('형식이 틀리면 400 · 없는 번호는 404 · 남의 프로젝트는 403', async () => {
    expect((await 부르기('xqe-reader', `/api/qa-reports/${리포트}/file?format=XLSX`)).statusCode).toBe(400);
    expect((await 부르기('xqe-reader', `/api/qa-reports/${리포트}/file`)).statusCode).toBe(400);
    expect((await 부르기('xqe-other', `/api/qa-reports/${리포트}/file?format=HTML`)).statusCode).toBe(403);
    expect((await 부르기('xqe-reader', '/api/qa-reports/999999999/file?format=HTML')).statusCode).toBe(404);
  });
});
