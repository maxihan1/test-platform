// QA 리포트 남은 리스크 AI 일 — 다시 만들 때 세우기 · 가져갈 때 재료와 MCP 열쇠 · 결과 저장 · 판단 말 거절 · 사람이 고치기 · 꺼진 에이전트 일 닫기 (DB 접속이 있을 때만 돈다)
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { 일열쇠사람 } from '../mcp/jobKey.js';
import perfRoutes from '../perf/routes.js';
import { 집기기록지우기 } from '../scenario/flowJob.js';
import { QA리포트를다시만든다 } from './qaReport.js';
import { 리스크일닫기 } from './qaReportAi.js';
import qaReportRoutes from './qaReportRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 에이전트 = 'xql-agent';

describe.skipIf(연결 === undefined)('QA 리포트 남은 리스크 AI 일', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 앱 = 0;
  const 계정들 = [에이전트, 'xql-writer', 'xql-reader'];
  const 쿠키 = new Map<string, string>();
  const 원래 = process.env.AUTHORING_AGENT_USER;

  const 부르기 = (누구: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie: 쿠키.get(누구) ?? '' }, ...(payload === undefined ? {} : { payload }) });
  type 집은일 = { id: number; kind: string; input: Record<string, unknown>; mcpKey?: string };
  const 집기 = async () => (await 부르기(에이전트, 'POST', '/api/perf/ai-jobs/claim')).json<{ job: 집은일 | null }>().job;
  const 끝 = (id: number, payload: object) => 부르기(에이전트, 'POST', `/api/perf/ai-jobs/${String(id)}/finish`, payload);
  const 리포트 = async () =>
    (await pool.query<{ id: string; version: number; ai: Record<string, unknown> | null; ai_job_id: string | null }>(
      'SELECT id, version, ai, ai_job_id FROM qa_report WHERE service_id = $1 ORDER BY version DESC LIMIT 1',
      [앱],
    )).rows[0]!;
  const 일상태 = async (id: number | string) => (await pool.query<{ status: string; error: string | null }>('SELECT status, error FROM perf_ai_job WHERE id = $1', [id])).rows[0]!;
  const 실행만들기 = async (status = 'FINISHED') =>
    Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, triggered_by_name, env, base_url, status, service_id, kind, origin, build_no, started_at, finished_at)
           VALUES ('XQL 실행', 'XQL 웹', '', 'xql-writer', 'xql-writer', 'qa', 'https://qa.xql.test', $2, $1, 'FN', 'MANUAL', '2.0', now() - interval '1 hour',
                   CASE WHEN $2 = 'RUNNING' THEN NULL ELSE now() END)
           RETURNING run_id`,
          [앱, status],
        )
      ).rows[0]!.run_id,
    );
  const 항목 = (runId: number, status: string) =>
    pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
       VALUES ($1, 'XQL-FN-001', 'desktop', 'XQL 결제', 'xql.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', $2, 100, now())`,
      [runId, status],
    );
  const 좋은답 = { output: { functional: [{ text: '결제 실패 1건이 판정 전입니다', refs: ['XQL-FN-001'] }], nonFunctional: [] } };

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    세션등록(app, 'xql-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(perfRoutes, { prefix: '/api' });
    await app.register(qaReportRoutes, { prefix: '/api' });
    await app.ready();

    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQL 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number((await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQL', 'XQL 웹', '#3A5FCD', '', 'xql', $1) RETURNING id`, [프로젝트])).rows[0]!.id);
    for (const [username, runs, authoring] of [
      [에이전트, 'read', 'write'],
      ['xql-writer', 'write', 'none'],
      ['xql-reader', 'read', 'none'],
    ] as const) {
      await pool.query(`INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1 || ' 이름', $2, 'member', true, false)`, [
        username,
        await 해시('열려라참깨'),
      ]);
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, $4)`, [username, 프로젝트, runs, authoring]);
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
      쿠키.set(username, (res.headers['set-cookie'] as string).split(';')[0] ?? '');
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM qa_report WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM perf_ai_job WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
    await app.close();
    if (원래 === undefined) delete process.env.AUTHORING_AGENT_USER;
    else process.env.AUTHORING_AGENT_USER = 원래;
  });

  it('도는 실행이 있으면 일을 안 세우고, 다 끝난 뒤 다시 만들면 세운다 — 성능 통로로는 안 보인다', async () => {
    const 도는 = await 실행만들기('RUNNING');
    const 첫 = await 실행만들기();
    await 항목(첫, 'FAIL');
    expect(await QA리포트를다시만든다({ runId: 첫 })).toBe('새 버전');
    expect((await 리포트()).ai_job_id).toBeNull();

    await pool.query(`UPDATE test_run SET status = 'FINISHED', finished_at = now() WHERE run_id = $1`, [도는]);
    expect(await QA리포트를다시만든다({ runId: 도는 })).toBe('고침');
    const 일 = (await 리포트()).ai_job_id;
    expect(일).not.toBeNull();
    expect(await 일상태(일!)).toMatchObject({ status: 'QUEUED' });
    expect((await 부르기('xql-writer', 'GET', `/api/perf/ai-jobs/${일!}`)).statusCode).toBe(404);
    expect((await 부르기('xql-reader', 'GET', `/api/qa-reports/${(await 리포트()).id}`)).json()).toMatchObject({ ai: null });
  });

  it('가져갈 때 첫 장 재료와 그 프로젝트로 좁힌 MCP 열쇠를 받고, 끝내면 처음 글을 그 버전에 쓴다 — 열쇠는 일이 끝나면 죽는다', async () => {
    const 집은 = (await 집기())!;
    expect(집은).toMatchObject({ kind: 'REPORT_RISK', input: { service: 'XQL', serviceName: 'XQL 웹', btsLinked: false, buildNo: '2.0', truncated: false } });
    expect(집은.input.summary).toMatchObject({ failures: { counts: { UNCLASSIFIED: 1 } } });
    expect(집은.mcpKey).toMatch(/^mcj_/);
    const 사람 = await 일열쇠사람(집은.mcpKey!);
    expect(사람?.username).toBe(에이전트);
    expect(사람?.services.map((s) => s.prefix)).toEqual(['XQL']);

    expect((await 끝(집은.id, 좋은답)).statusCode).toBe(204);
    expect((await 리포트()).ai).toEqual({
      first: '기능 리스크\n- 결제 실패 1건이 판정 전입니다 (XQL-FN-001)\n비기능 리스크\n- 확인된 리스크 없음',
      current: '기능 리스크\n- 결제 실패 1건이 판정 전입니다 (XQL-FN-001)\n비기능 리스크\n- 확인된 리스크 없음',
      editedBy: null,
      editedAt: null,
    });
    expect(await 일열쇠사람(집은.mcpKey!)).toBeNull();
  });

  it('첫 장이 같으면 다시 만들어도 새 일을 안 세운다. 새 실행으로 첫 장이 바뀌면 새 일을 세우고 글을 비운다 — 판단 말이 섞인 답은 받지 않고 「만들지 못했습니다」', async () => {
    const 앞일 = (await 리포트()).ai_job_id;
    const 같은 = (await pool.query<{ run_ids: string[] }>('SELECT run_ids FROM qa_report WHERE service_id = $1', [앱])).rows[0]!.run_ids[0]!;
    await QA리포트를다시만든다({ runId: Number(같은) });
    expect((await 리포트()).ai_job_id).toBe(앞일);

    const 새 = await 실행만들기();
    await 항목(새, 'PASS');
    expect(await QA리포트를다시만든다({ runId: 새 })).toBe('고침');
    const 지금 = await 리포트();
    expect(지금.ai_job_id).not.toBe(앞일);
    expect(지금.ai).toBeNull();

    const 집은 = (await 집기())!;
    const 답 = await 끝(집은.id, { output: { functional: [{ text: '이대로 배포 가능합니다', refs: [] }], nonFunctional: [] } });
    expect(답.statusCode).toBe(400);
    expect(답.json()).toMatchObject({ error: 'INVALID_OUTPUT' });
    expect(await 일상태(집은.id)).toMatchObject({ status: 'FAILED' });
    expect((await 부르기('xql-reader', 'GET', `/api/qa-reports/${지금.id}`)).json()).toMatchObject({ ai: { failed: true } });
  });

  it('사람이 고치면 처음 글은 남고, 그 뒤로는 다시 만들어도 맡기지 않는다. 실행 write 가 없으면 403 · 승인한 버전은 409', async () => {
    const id = (await 리포트()).id;
    expect((await 부르기('xql-reader', 'PATCH', `/api/qa-reports/${id}/ai`, { text: '고친 글' })).statusCode).toBe(403);
    expect((await 부르기('xql-writer', 'PATCH', `/api/qa-reports/${id}/ai`, { text: '  ' })).statusCode).toBe(400);
    const 답 = await 부르기('xql-writer', 'PATCH', `/api/qa-reports/${id}/ai`, { text: '기능 리스크\n- 직접 쓴 줄' });
    expect(답.statusCode).toBe(200);
    expect(답.json()).toMatchObject({ ai: { first: '', current: '기능 리스크\n- 직접 쓴 줄', editedBy: 'xql-writer 이름' } });

    const 새 = await 실행만들기();
    await 항목(새, 'PASS');
    const 앞일 = (await 리포트()).ai_job_id;
    await QA리포트를다시만든다({ runId: 새 });
    expect((await 리포트()).ai_job_id).toBe(앞일);
    expect((await 리포트()).ai).toMatchObject({ current: '기능 리스크\n- 직접 쓴 줄' });

    await pool.query(`UPDATE qa_report SET approved_by = 'xql-writer', approved_at = now(), pdf_path = '/x.pdf', pdf_sha256 = 'ab' WHERE id = $1`, [id]);
    expect((await 부르기('xql-writer', 'PATCH', `/api/qa-reports/${id}/ai`, { text: '또 고침' })).json()).toEqual({ error: 'APPROVED' });
    expect((await 부르기('xql-writer', 'PATCH', '/api/qa-reports/999999999/ai', { text: '글' })).statusCode).toBe(404);
  });

  it('승인한 버전에는 늦게 끝난 일의 글을 쓰지 않고, 꺼진 에이전트를 오래 기다린 일은 닫는다', async () => {
    const 새 = await 실행만들기();
    await 항목(새, 'FAIL');
    expect(await QA리포트를다시만든다({ runId: 새 })).toBe('새 버전');
    const v2 = await 리포트();
    expect(v2.version).toBe(2);
    const 집은 = (await 집기())!;
    await pool.query(`UPDATE qa_report SET approved_by = 'xql-writer', approved_at = now(), pdf_path = '/y.pdf', pdf_sha256 = 'cd' WHERE id = $1`, [v2.id]);
    expect((await 끝(집은.id, 좋은답)).statusCode).toBe(204);
    expect((await 리포트()).ai).toBeNull();

    const 늦은 = await 실행만들기();
    await 항목(늦은, 'PASS');
    expect(await QA리포트를다시만든다({ runId: 늦은 })).toBe('새 버전');
    const 대기 = (await 리포트()).ai_job_id!;
    await pool.query(`UPDATE perf_ai_job SET created_at = now() - interval '10 minutes' WHERE id = $1`, [대기]);
    집기기록지우기();
    await 리스크일닫기();
    expect(await 일상태(대기)).toEqual({ status: 'FAILED', error: '작성 에이전트가 꺼져 있다' });
  });
});
