// 프로젝트 QA 리포트 — 만들기 검사 · 굳힌 숫자 · 지난 리포트 · 권한 · AI 문단 · 문장 고치기 · 파일 (DB 접속이 있을 때만 돈다)
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import perfRoutes from '../perf/routes.js';
import { 집기기록지우기 } from '../scenario/flowJob.js';
import type { 프로젝트리포트응답 } from './qaProjectReportShape.js';
import qaProjectReportRoutes from './qaProjectReportRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 에이전트 = 'xqj-agent';
const 기간 = { from: '2026-11-01', to: '2026-11-07', tz: 'Asia/Seoul' };

describe.skipIf(연결 === undefined)('프로젝트 QA 리포트', { timeout: 120_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 프로젝트 = 0;
  let 앱 = 0;
  const 계정들 = [에이전트, 'xqj-writer', 'xqj-reader', 'xqj-none'];
  const 쿠키 = new Map<string, string>();
  const 원래 = process.env.AUTHORING_AGENT_USER;
  const 부르기 = (누구: string, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie: 쿠키.get(누구) ?? '' }, ...(payload === undefined ? {} : { payload }) });
  const 만들기 = (누구: string, 몸: object = {}) => 부르기(누구, 'POST', '/api/qa-project-reports', { projectId: 프로젝트, ...기간, ...몸 });
  const 하나 = async (id: number) => (await 부르기('xqj-reader', 'GET', `/api/qa-project-reports/${String(id)}`)).json<프로젝트리포트응답>();

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    세션등록(app, 'xqj-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(perfRoutes, { prefix: '/api' });
    await app.register(qaProjectReportRoutes, { prefix: '/api' });
    await app.ready();

    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQJ 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number((await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQJ', 'XQJ 웹', '#3A5FCD', '', 'xqj', $1) RETURNING id`, [프로젝트])).rows[0]!.id);
    for (const [username, runs, authoring] of [
      [에이전트, 'read', 'write'],
      ['xqj-writer', 'write', 'none'],
      ['xqj-reader', 'read', 'none'],
      ['xqj-none', 'none', 'none'],
    ] as const) {
      await pool.query(`INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1 || ' 이름', $2, 'member', true, false)`, [
        username,
        await 해시('열려라참깨'),
      ]);
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, $4)`, [username, 프로젝트, runs, authoring]);
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
      쿠키.set(username, (res.headers['set-cookie'] as string).split(';')[0] ?? '');
    }

    // 기간 안: 기능 실행 하나(통과 1 · 실패 1) · 멈춘 실행 하나 · 기간 밖 실행 하나(안 센다)
    const 실행 = async (status: string, 시작: string) =>
      Number(
        (
          await pool.query<{ run_id: string }>(
            `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, triggered_by_name, env, base_url, status, service_id, kind, origin, build_no, started_at, finished_at)
             VALUES ('XQJ 실행', 'XQJ 웹', '', 'xqj-writer', 'xqj-writer', 'qa', 'https://qa.xqj.test', $2, $1, 'FN', 'MANUAL', '1.0', $3, $3) RETURNING run_id`,
            [앱, status, 시작],
          )
        ).rows[0]!.run_id,
      );
    const 항목 = (runId: number, tcId: string, status: string) =>
      pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
         VALUES ($1, $2, 'desktop', $2, 'xqj.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', $3, 100, now())`,
        [runId, tcId, status],
      );
    const 끝난 = await 실행('FINISHED', '2026-11-03T10:00:00+09:00');
    await 항목(끝난, 'XQJ-FN-001', 'PASS');
    await 항목(끝난, 'XQJ-FN-002', 'FAIL');
    await 실행('ABORTED', '2026-11-04T10:00:00+09:00');
    const 앞 = await 실행('FINISHED', '2026-10-20T10:00:00+09:00');
    await 항목(앞, 'XQJ-FN-001', 'FAIL');
    await 항목(앞, 'XQJ-FN-002', 'PASS');
    // 기간 뒤에 고쳐 통과한 실행 — 지난 기간 리포트의 회귀 실패 · 해결 셈에 들면 안 된다
    await 항목(await 실행('FINISHED', '2026-11-10T10:00:00+09:00'), 'XQJ-FN-002', 'PASS');

    // 애플리케이션 리포트 — 기간 안 하나(승인 전), 기간 밖 하나
    const 리포트 = (열쇠: string, build: string, 끝: string) =>
      pool.query(
        `INSERT INTO qa_report (bundle_key, service_id, service_name, env, build_no, summary) VALUES ($1, $2, 'XQJ 웹', 'qa', $3, $4)`,
        [열쇠, 앱, build, JSON.stringify({ kinds: ['FN'], overview: { startedAt: 끝, finishedAt: 끝 }, results: { functional: [{ kind: 'FN', result: { pass: 1, fail: 1, notRun: 0, unconfirmed: 0 } }], nonFunctional: [] } })],
      );
    await 리포트('B:XQJ:qa:1.0', '1.0', '2026-11-03T02:00:00Z');
    await 리포트('B:XQJ:qa:0.9', '0.9', '2026-10-20T02:00:00Z');
    // 버전 1 을 승인한 뒤 버전 2(승인 전)가 선 묶음 — 부록은 승인한 버전 1 을 가리킨다
    await pool.query(
      `INSERT INTO qa_report (bundle_key, service_id, service_name, env, build_no, version, summary, approved_by, approved_at, pdf_path, pdf_sha256)
       VALUES ('B:XQJ:qa:1.1', $1, 'XQJ 웹', 'qa', '1.1', 1, $2, 'xqj-admin', now(), 'x.pdf', 'aa')`,
      [앱, JSON.stringify({ overview: { startedAt: '2026-11-05T02:00:00Z', finishedAt: '2026-11-05T02:00:00Z' }, results: { functional: [], nonFunctional: [] } })],
    );
    await pool.query(
      `INSERT INTO qa_report (bundle_key, service_id, service_name, env, build_no, version, summary) VALUES ('B:XQJ:qa:1.1', $1, 'XQJ 웹', 'qa', '1.1', 2, $2)`,
      [앱, JSON.stringify({ overview: { startedAt: '2026-11-05T02:00:00Z', finishedAt: '2026-11-06T02:00:00Z' }, results: { functional: [{ kind: 'FN', result: { pass: 1, fail: 1, notRun: 0, unconfirmed: 0 } }], nonFunctional: [] } })],
    );

    // 성능 목표 둘 통과 · 하나 미달, 안정화 하루
    await pool.query(
      `INSERT INTO perf_run (kind, service_id, env, base_url, config, status, verdict, targets, origin, started_at, finished_at)
       VALUES ('PAGE', $1, 'qa', 'https://qa.xqj.test', '{}', 'DONE', 'FAIL', $2, 'MANUAL', '2026-11-05T10:00:00+09:00', '2026-11-05T10:10:00+09:00')`,
      [앱, JSON.stringify([{ verdict: 'PASS' }, { verdict: 'PASS' }, { verdict: 'FAIL' }])],
    );
    await pool.query(
      `INSERT INTO stab_run (run_id, service_id, env, day, cases, error_cases, pass_error_cases, residual, new_errors, resolved, confirmed)
       VALUES (987654321, $1, 'qa', '2026-11-05', 40, 3, 2, 4, 1, 0, 1)`,
      [앱],
    );

    // Issue Bunker — 배포 하나 · 맡은 이슈 하나(기간 안에 확인) · 결함 하나(열림)
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, webhook_secret, status_map, resolution_map, updated_by) VALUES ($1, 'https://bunker.xqj.invalid', 'XQJ', 's', '{}', '{}', 'xqj')`,
      [프로젝트],
    );
    const 배포 = (
      await pool.query<{ id: string }>(
        `INSERT INTO bts_deploy (project_id, build_no, service_ids, created_at) VALUES ($1, 'abc1234-1102', $2, '2026-11-02T10:00:00+09:00') RETURNING id`,
        [프로젝트, [앱]],
      )
    ).rows[0]!.id;
    await pool.query(`INSERT INTO bts_claim (project_id, issue_key, deploy_id, issue_type, released_at) VALUES ($1, 'XQJ-1', $2, 'TASK', '2026-11-03T10:00:00+09:00')`, [프로젝트, 배포]);
    await pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, created_at) VALUES ($1, 'XQJ-3', $2, 'XQJ-FN-001', 'qa', '2026-10-30T12:00:00+09:00')`, [
      프로젝트,
      앱,
    ]);
    await pool.query(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env, created_at) VALUES ($1, 'XQJ-2', $2, 'XQJ-FN-002', 'qa', '2026-11-03T12:00:00+09:00')`, [
      프로젝트,
      앱,
    ]);

    // 매일 도는 정기 실행 세트 — 다음 기간 일곱 회차
    await pool.query(`INSERT INTO sched_set (project_id, name, at, tz, days, created_by) VALUES ($1, 'XQJ 회귀', '02:00', 'Asia/Seoul', '{0,1,2,3,4,5,6}', 'xqj')`, [프로젝트]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM qa_project_report WHERE project_id = $1', [프로젝트]);
    await pool.query('DELETE FROM qa_report WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM perf_ai_job WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM perf_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM sched_set WHERE project_id = $1', [프로젝트]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
    await pool.query('DELETE FROM project WHERE id = $1', [프로젝트]);
    집기기록지우기();
    await app.close();
    if (원래 === undefined) delete process.env.AUTHORING_AGENT_USER;
    else process.env.AUTHORING_AGENT_USER = 원래;
  });

  it('기간 · 시간대 · 권한이 틀리면 만들지 않는다', async () => {
    expect((await 만들기('xqj-writer', { to: '2999-01-01' })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '종료일은 오늘까지입니다' });
    expect((await 만들기('xqj-writer', { from: '2026-07-01' })).json()).toMatchObject({ detail: '기간은 92일까지입니다' });
    expect((await 만들기('xqj-writer', { from: '2026-11-08' })).json()).toMatchObject({ detail: '시작일이 종료일보다 늦습니다' });
    expect((await 만들기('xqj-writer', { tz: 'Mars/Base' })).statusCode).toBe(400);
    expect((await 만들기('xqj-reader')).json()).toEqual({ error: 'FORBIDDEN', need: 'runs:write' });
    expect((await 만들기('xqj-none')).statusCode).toBe(403);
  });

  it('기간 안 숫자를 굳힌다 — 판정 · 애플리케이션 리포트 · 배포 · 변경 확인 · 결함 · 비기능 · 막힌 것 · 다음 예정 · 부록', async () => {
    const res = await 만들기('xqj-writer');
    expect(res.statusCode).toBe(201);
    const r = await 하나(res.json<{ id: number }>().id);
    expect(r).toMatchObject({ projectName: 'XQJ 프로젝트', from: 기간.from, to: 기간.to, origin: 'MANUAL', createdBy: 'xqj-writer 이름', ai: null });
    const b = r.body;
    expect(b.apps).toHaveLength(1);
    expect(b.apps[0]).toMatchObject({ prefix: 'XQJ', runs: { pass: 1, fail: 1, notRun: 0 }, newFailures: 1, resolved: 1, builds: ['1.0', '1.1'], reports: 2, unapproved: 2, openDefects: 2 });
    expect(b.apps[0]!.last).toMatchObject({ buildNo: '1.1', version: 2, approved: false });
    expect(b.apps[0]!.last?.results.functional[0]).toMatchObject({ kind: 'FN', result: { pass: 1, fail: 1 } });
    expect(b.passRate.current).toEqual({ pass: 1, fail: 1, notRun: 0 });
    expect(b.daily).toHaveLength(7);
    expect(b.deploys).toMatchObject({ count: 1, rollbacks: 0 });
    expect(b.changes).toEqual({ issues: 1, confirmed: 1 });
    expect(b.defects).toMatchObject({ opened: 1, start: 1 });
    expect(b.defects?.days.map((d) => d.open)).toEqual([1, 1, 2, 2, 2, 2, 2]);
    expect(b.nonFunctional[0]!.perf).toEqual([expect.objectContaining({ day: '2026-11-05', kind: 'PAGE', pass: 2, fail: 1 })]);
    expect(b.nonFunctional[0]!.stab).toMatchObject({ days: [{ day: '2026-11-05', passErrorCases: 2, cases: 40, crashes: null, residual: 4 }], confirmed: 1 });
    expect(b.blocked).toEqual([{ serviceId: 앱, name: 'XQJ 웹', aborted: 1, prepFailed: 0, perfErrors: 0 }]);
    expect(b.upcoming).toMatchObject({ from: '2026-11-08', to: '2026-11-14', sets: [{ name: 'XQJ 회귀', runs: 7 }] });
    expect(b.appendix[0]!.reports).toEqual([
      expect.objectContaining({ buildNo: '1.0', approved: false }),
      expect.objectContaining({ buildNo: '1.1', version: 1, approved: true }),
    ]);
    expect(b.previous).toBeNull();
  });

  it('다시 만들면 새 리포트가 서고 지난 리포트를 가리킨다 — 목록은 최근 차례, 배정 없는 사람은 못 본다', async () => {
    const id = (await 만들기('xqj-writer')).json<{ id: number }>().id;
    const 목록 = (await 부르기('xqj-reader', 'GET', `/api/qa-project-reports?projectId=${String(프로젝트)}`)).json<{ items: { id: number }[]; total: number }>();
    expect(목록.total).toBe(2);
    expect(목록.items[0]!.id).toBe(id);
    expect((await 하나(id)).body.previous).toMatchObject({ id: 목록.items[1]!.id, from: 기간.from });
    expect((await 부르기('xqj-none', 'GET', `/api/qa-project-reports?projectId=${String(프로젝트)}`)).statusCode).toBe(403);
    expect((await 부르기('xqj-none', 'GET', `/api/qa-project-reports/${String(id)}`)).statusCode).toBe(403);
    expect((await 부르기('xqj-reader', 'GET', '/api/qa-project-reports/999999999')).statusCode).toBe(404);
  });

  it('리포터 AI 가 지난 리포트와 견준 재료로 쓰고, 사람이 고치면 처음 글이 남는다', async () => {
    const 목록 = (await 부르기('xqj-reader', 'GET', `/api/qa-project-reports?projectId=${String(프로젝트)}`)).json<{ items: { id: number }[] }>().items;
    // 먼저 만든 리포트의 일부터 집힌다
    const 일들: { id: number; input: Record<string, unknown> }[] = [];
    for (let i = 0; i < 2; i++) 일들.push((await 부르기(에이전트, 'POST', '/api/perf/ai-jobs/claim')).json<{ job: { id: number; input: Record<string, unknown> } }>().job);
    const 둘째 = 일들.find((j) => j.input.projectReportId === 목록[0]!.id)!;
    expect(둘째.input).toMatchObject({ projectName: 'XQJ 프로젝트', btsLinked: true, period: { from: 기간.from, to: 기간.to }, previous: { id: 목록[1]!.id, risks: null } });

    const 답 = { output: { functional: [{ text: '신규 · 결제 실패 1건이 남았습니다', refs: ['XQJ'] }], nonFunctional: [] } };
    expect((await 부르기(에이전트, 'POST', `/api/perf/ai-jobs/${String(둘째.id)}/finish`, 답)).statusCode).toBe(204);
    const ai = (await 하나(목록[0]!.id)).ai;
    expect(ai).toMatchObject({ first: '기능 리스크\n- 신규 · 결제 실패 1건이 남았습니다 (XQJ)\n비기능 리스크\n- 확인된 리스크 없음', editedBy: null });

    expect((await 부르기('xqj-reader', 'PATCH', `/api/qa-project-reports/${String(목록[0]!.id)}/ai`, { text: '고친 글' })).statusCode).toBe(403);
    const 고침 = await 부르기('xqj-writer', 'PATCH', `/api/qa-project-reports/${String(목록[0]!.id)}/ai`, { text: '고친 글' });
    expect(고침.json()).toMatchObject({ ai: { first: ai && 'first' in ai ? ai.first : '', current: '고친 글', editedBy: 'xqj-writer 이름' } });

    // 다른 일이 실패로 닫히면 그 리포트는 「못 만들었다」다
    const 첫째 = 일들.find((j) => j !== 둘째)!;
    await 부르기(에이전트, 'POST', `/api/perf/ai-jobs/${String(첫째.id)}/finish`, { error: '안 됨' });
    expect((await 하나(목록[1]!.id)).ai).toEqual({ failed: true });
  });

  it('HTML 은 시안 차례로 그리고 워드를 낸다', async () => {
    const id = (await 부르기('xqj-reader', 'GET', `/api/qa-project-reports?projectId=${String(프로젝트)}`)).json<{ items: { id: number }[] }>().items[0]!.id;
    const html = await 부르기('xqj-reader', 'GET', `/api/qa-project-reports/${String(id)}/file?format=HTML`);
    expect(html.headers['content-type']).toContain('text/html');
    const 글 = html.body;
    const 차례 = ['1. 개요', '2. 애플리케이션별 상태', '3. 이번 기간', '4. 결함 추이', '5. 비기능 품질', '6. 진행을 막은 것', '7. 지난 리포트 대비 리스크', '8. 다음 기간 예정', '9. 부록'];
    expect(차례.map((x) => 글.indexOf(x))).toEqual([...차례.map((x) => 글.indexOf(x))].sort((a, b) => a - b));
    expect(글).toContain('고친 글');
    expect(글).toContain('매일 02:00');
    expect(글).not.toMatch(/배포 가능|배포 보류/);
    const 워드 = await 부르기('xqj-reader', 'GET', `/api/qa-project-reports/${String(id)}/file?format=DOCX`);
    expect(워드.headers['content-disposition']).toContain(`qa-project-report-${String(id)}.docx`);
    expect((await 부르기('xqj-reader', 'GET', `/api/qa-project-reports/${String(id)}/file?format=XLSX`)).statusCode).toBe(400);
  });
});
