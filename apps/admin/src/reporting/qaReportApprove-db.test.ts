// QA 리포트 승인 — admin 만 · 수행자 금지 · 도는 실행 · AI 일 막기 · 굳힌 PDF 지문 · 승인 뒤 버전 2 · 알림의 승인 전 줄 (DB 접속이 있을 때만 돈다)
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import notificationRoutes from '../notifications/routes.js';
import { QA리포트를다시만든다 } from './qaReport.js';
import qaReportRoutes from './qaReportRoutes.js';

// Chromium 을 띄우지 않는다 — 그린 HTML 을 그대로 PDF 자리에 담아 굳힌 내용을 글자로 본다
vi.mock('./generate.js', async (원래) => ({ ...(await 원래<typeof import('./generate.js')>()), PDF로: async (html: string) => Buffer.from(html) }));

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('QA 리포트 승인', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 앱 = 0;
  let 남의프로젝트 = 0;
  let 폴더 = '';
  let 첫실행 = 0;
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;
  // xqp-doer 는 admin 이지만 실행을 건 수행자다
  const 계정들 = ['xqp-admin', 'xqp-doer', 'xqp-member', 'xqp-outsider'];
  const 쿠키 = new Map<string, string>();

  const 부르기 = (누구: string, method: 'GET' | 'POST', url: string) => app.inject({ method, url, headers: { cookie: 쿠키.get(누구) ?? '' } });
  const 승인 = (누구: string, id: number) => 부르기(누구, 'POST', `/api/qa-reports/${String(id)}/approve`);
  const 승인전줄 = async (누구: string) => ((await 부르기(누구, 'GET', '/api/notifications')).json() as { approvals: { reportId: number; version: number }[] }).approvals;
  const 마지막 = async () =>
    (await pool.query<{ id: string; version: number }>(`SELECT id, version FROM qa_report WHERE service_id = $1 ORDER BY version DESC LIMIT 1`, [앱])).rows[0]!;
  const 실행만들기 = async (칸: { origin?: string; status?: string; rerunOf?: number; 누가?: string }) =>
    Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, triggered_by_name, env, base_url, status, service_id, kind, origin, build_no, rerun_of, started_at, finished_at)
           VALUES ('XQP 실행', 'XQP 웹', '', $5, $5, 'qa', 'https://qa.xqp.test', $2, $1, 'FN', $3, '1.0', $4, now() - interval '1 hour',
                   CASE WHEN $2 = 'RUNNING' THEN NULL ELSE now() END)
           RETURNING run_id`,
          [앱, 칸.status ?? 'FINISHED', 칸.origin ?? 'MANUAL', 칸.rerunOf ?? null, 칸.누가 ?? 'xqp-doer'],
        )
      ).rows[0]!.run_id,
    );
  const 항목 = (runId: number) =>
    pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
       VALUES ($1, 'XQP-FN-001', 'desktop', 'XQP 이름', 'xqp.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', 'PASS', 100, now())`,
      [runId],
    );

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    폴더 = await mkdtemp(join(tmpdir(), 'xqp-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 폴더;
    app = Fastify();
    세션등록(app, 'xqp-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(qaReportRoutes, { prefix: '/api' });
    await app.register(notificationRoutes, { prefix: '/api' });
    await app.ready();

    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQP 프로젝트') RETURNING id`)).rows[0]!.id);
    남의프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQP 다른 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number((await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQP', 'XQP 웹', '#3A5FCD', '', 'xqp', $1) RETURNING id`, [프로젝트])).rows[0]!.id);
    for (const [username, role, pid] of [
      ['xqp-admin', 'admin', 프로젝트],
      ['xqp-doer', 'admin', 프로젝트],
      ['xqp-member', 'member', 프로젝트],
      ['xqp-outsider', 'admin', 남의프로젝트],
    ] as const) {
      await pool.query(`INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1 || ' 이름', $2, $3, true, false)`, [
        username,
        await 해시('열려라참깨'),
        role,
      ]);
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'write', 'write', 'none')`, [username, pid]);
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
      쿠키.set(username, (res.headers['set-cookie'] as string).split(';')[0] ?? '');
    }
    첫실행 = await 실행만들기({});
    await 항목(첫실행);
    expect(await QA리포트를다시만든다({ runId: 첫실행 })).toBe('새 버전');
  });

  afterAll(async () => {
    await pool.query('DELETE FROM qa_report WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM perf_ai_job WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1 AND rerun_of IS NOT NULL', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
    await pool.query('DELETE FROM project WHERE id = $1', [남의프로젝트]);
    await app.close();
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    await rm(폴더, { recursive: true, force: true });
  });

  it('admin 이 아니거나 배정 밖이거나 수행자면 승인하지 못하고, 승인 전 줄도 승인할 수 있는 admin 에게만 선다', async () => {
    const v1 = Number((await 마지막()).id);
    expect((await 승인('xqp-member', v1)).json()).toEqual({ error: 'FORBIDDEN', need: 'admin' });
    const 밖 = await 승인('xqp-outsider', v1);
    expect(밖.statusCode).toBe(403);
    expect(밖.json()).toMatchObject({ error: 'SERVICE_FORBIDDEN' });
    const 본인 = await 승인('xqp-doer', v1);
    expect(본인.statusCode).toBe(403);
    expect(본인.json()).toEqual({ error: 'SELF_APPROVAL' });
    expect((await 승인('xqp-admin', 999_999_999)).statusCode).toBe(404);

    expect(await 승인전줄('xqp-admin')).toEqual([expect.objectContaining({ kind: 'qa_report', reportId: v1, buildNo: '1.0', version: 1, prefix: 'XQP' })]);
    expect(await 승인전줄('xqp-doer')).toEqual([]);
    expect(await 승인전줄('xqp-member')).toEqual([]);
    expect(await 승인전줄('xqp-outsider')).toEqual([]);
  });

  it('묶음에 도는 실행이 있거나 AI 일이 안 끝났으면 승인하지 못한다', async () => {
    const v1 = Number((await 마지막()).id);
    // 시작만 하고 다시 만들기는 안 돌았다 — 첫 장의 「진행 중」은 0 이어도 지금 표에서 센다
    const 도는 = await 실행만들기({ status: 'RUNNING', 누가: 'xqp-admin-아님' });
    expect(await 승인전줄('xqp-admin')).toEqual([]);
    expect((await 승인('xqp-admin', v1)).json()).toEqual({ error: 'RUNNING' });
    await pool.query('DELETE FROM test_run WHERE run_id = $1', [도는]);
    // 붙은 한 건 실행이 도는 중이어도 막는다 — 끝나면 붙은 결과가 바뀔 수 있다
    const 도는한건 = await 실행만들기({ origin: 'SINGLE', status: 'RUNNING', rerunOf: 첫실행, 누가: 'xqp-admin' });
    expect((await 승인('xqp-admin', v1)).json()).toEqual({ error: 'RUNNING' });
    await pool.query('DELETE FROM test_run WHERE run_id = $1', [도는한건]);

    const 일 = (await pool.query<{ id: string }>(`INSERT INTO perf_ai_job (kind, service_id, input, status) VALUES ('REPORT_RISK', $1, '{}', 'QUEUED') RETURNING id`, [앱])).rows[0]!.id;
    await pool.query('UPDATE qa_report SET ai_job_id = $1 WHERE id = $2', [일, v1]);
    expect((await 승인('xqp-admin', v1)).json()).toEqual({ error: 'AI_PENDING' });
    await pool.query(`UPDATE perf_ai_job SET status = 'DONE' WHERE id = $1`, [일]);
  });

  it('승인하면 그 버전의 PDF 를 승인 칸을 채워 굳히고 지문을 남긴다 — 받으면 굳힌 파일 그대로다', async () => {
    const v1 = Number((await 마지막()).id);
    const 답 = await 승인('xqp-admin', v1);
    expect(답.statusCode).toBe(200);
    const { approval } = 답.json() as { approval: { by: string; byName: string; sha256: string; late: boolean } };
    expect(approval).toMatchObject({ by: 'xqp-admin', byName: 'xqp-admin 이름', late: false });

    const 행 = (await pool.query<{ pdf_path: string; pdf_sha256: string }>('SELECT pdf_path, pdf_sha256 FROM qa_report WHERE id = $1', [v1])).rows[0]!;
    const 굳힌 = await readFile(행.pdf_path);
    expect(행.pdf_sha256).toBe(createHash('sha256').update(굳힌).digest('hex'));
    expect(approval.sha256).toBe(행.pdf_sha256);
    const 글 = 굳힌.toString('utf8');
    expect(글).toContain('승인됨 · xqp-admin 이름');
    expect(글).not.toContain('class="draft-mark"');
    // 굳힌 PDF 가 기준 문서다 — 「받을 때 다시 만들었다」는 HTML 에만 단다
    expect(글).not.toContain('승인한 기준 문서는 굳힌 PDF 입니다');

    const 받은 = await 부르기('xqp-member', 'GET', `/api/qa-reports/${String(v1)}/file?format=PDF`);
    expect(Buffer.from(받은.rawPayload).equals(굳힌)).toBe(true);
    expect((await 부르기('xqp-member', 'GET', `/api/qa-reports/${String(v1)}`)).json()).toMatchObject({ approval: { by: 'xqp-admin', sha256: 행.pdf_sha256 } });
    expect((await 승인('xqp-admin', v1)).json()).toEqual({ error: 'ALREADY_APPROVED' });
    expect(await 승인전줄('xqp-admin')).toEqual([]);
  });

  it('승인 뒤 결과를 안 바꾼 한 건 실행은 버전을 올리지 않고, 다시 건 실행은 버전 2 를 승인 전으로 세운다', async () => {
    const 한건 = await 실행만들기({ origin: 'SINGLE', rerunOf: 첫실행 });
    await 항목(한건);
    expect(await QA리포트를다시만든다({ runId: 한건 })).toBe('그대로');
    expect((await 마지막()).version).toBe(1);

    const 다시 = await 실행만들기({ 누가: 'xqp-member' });
    await 항목(다시);
    expect(await QA리포트를다시만든다({ runId: 다시 })).toBe('새 버전');
    const v2 = await 마지막();
    expect(v2.version).toBe(2);
    expect(await 승인전줄('xqp-admin')).toEqual([expect.objectContaining({ reportId: Number(v2.id), version: 2 })]);
    // 버전 2 의 수행자는 둘이다 — xqp-doer 는 버전 2 도 승인하지 못한다
    expect((await 승인('xqp-doer', Number(v2.id))).json()).toEqual({ error: 'SELF_APPROVAL' });
    expect((await 승인('xqp-admin', Number(v2.id))).statusCode).toBe(200);
  });

  it('더 새 버전이 있으면 NOT_LATEST · 애플리케이션을 지운 리포트는 아무도 승인하지 못한다 · 빌드 없는 정기 실행은 알리지 않는다', async () => {
    const 정기 = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, origin, started_at, finished_at)
           VALUES ('XQP 정기', 'XQP 웹', '', 'scheduler', 'qa', 'https://qa.xqp.test', 'FINISHED', $1, 'FN', 'SCHEDULED', now() - interval '1 hour', now()) RETURNING run_id`,
          [앱],
        )
      ).rows[0]!.run_id,
    );
    await 항목(정기);
    expect(await QA리포트를다시만든다({ runId: 정기 })).toBe('새 버전');
    const 정기리포트 = Number((await pool.query<{ id: string }>(`SELECT id FROM qa_report WHERE bundle_key = $1`, [`R:${String(정기)}`])).rows[0]!.id);
    expect((await 승인전줄('xqp-admin')).map((x) => x.reportId)).not.toContain(정기리포트);

    // 승인 전 버전 위에 더 새 버전이 서는 길은 없다 — 표에 직접 세워 마지막 버전 검사를 본다
    await pool.query(
      `INSERT INTO qa_report (bundle_key, service_id, service_name, env, run_id, version, summary, approved_by, approved_at, pdf_path, pdf_sha256)
       VALUES ($1, $2, 'XQP 웹', 'qa', $3, 2, '{}', 'xqp-admin', now(), '/x.pdf', 'ab')`,
      [`R:${String(정기)}`, 앱, 정기],
    );
    expect((await 승인('xqp-admin', 정기리포트)).json()).toEqual({ error: 'NOT_LATEST' });
    await pool.query(`DELETE FROM qa_report WHERE bundle_key = $1 AND version = 2`, [`R:${String(정기)}`]);

    await pool.query('UPDATE qa_report SET service_id = NULL WHERE id = $1', [정기리포트]);
    expect((await 승인('xqp-admin', 정기리포트)).json()).toEqual({ error: 'FORBIDDEN', need: 'admin' });
    await pool.query('DELETE FROM qa_report WHERE id = $1', [정기리포트]);
  });
});
