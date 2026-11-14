// QA 리포트 빌드 묶기 · 첫 장 숫자 · 다시 만들기 · 버전 · 읽기 통로 (DB 접속이 있을 때만 돈다)
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { QA리포트를다시만든다 } from './qaReport.js';
import qaReportRoutes from './qaReportRoutes.js';
import type { 첫장 } from './qaReportSummary.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('QA 리포트 빌드 묶기', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 앱 = 0;
  let 남의앱 = 0;
  const 계정들 = ['xqb-reader', 'xqb-other'];
  const 케이스들 = ['XQB-FN-001', 'XQB-FN-002', 'XQB-FN-003', 'XQB-FN-004', 'XQB-UI-001', 'XQB-UI-002'];
  const 쿠키 = new Map<string, string>();
  const 실행 = { 앞빌드: 0, 기능: 0, 정기UI: 0 };

  const 부르기 = (누구: string, url: string) => app.inject({ method: 'GET', url, headers: { cookie: 쿠키.get(누구) ?? '' } });
  const 리포트 = async (bundle: string) =>
    (await pool.query<{ id: string; version: number; run_ids: string[]; summary: 첫장; performers: string[]; approved_at: Date | null }>(
      'SELECT id, version, run_ids, summary, performers, approved_at FROM qa_report WHERE bundle_key = $1 ORDER BY version', [bundle],
    )).rows;

  const 실행만들기 = async (o: { kind: string; build: string | null; origin: string; by: string; 시작: string; status?: string; rerunOf?: number }) =>
    Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, triggered_by_name, env, base_url, status, service_id, kind, origin, build_no, rerun_of, started_at, finished_at)
           VALUES ('XQB 실행', 'XQB 웹', 'https://git.xqb.test/tests', $1, $1, 'qa', 'https://qa.xqb.test', $2, $3, $4, $5, $6, $7, $8, CASE WHEN $2 = 'RUNNING' THEN NULL ELSE $8::timestamptz + interval '1 hour' END)
           RETURNING run_id`,
          [o.by, o.status ?? 'FINISHED', 앱, o.kind, o.origin, o.build, o.rerunOf ?? null, o.시작],
        )
      ).rows[0]!.run_id,
    );
  const 항목 = (runId: number, tcId: string, status: string, message: string | null = null) =>
    pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, error, finished_at)
       VALUES ($1, $2, 'desktop', $2, 'xqb.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', $3, 100, $4, now())`,
      [runId, tcId, status, message === null ? null : JSON.stringify({ message })],
    );

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    app = Fastify();
    세션등록(app, 'xqb-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(qaReportRoutes, { prefix: '/api' });
    await app.ready();

    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQB 프로젝트') RETURNING id`)).rows[0]!.id);
    const 남의프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XQB 다른 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number((await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQB', 'XQB 웹', '#3A5FCD', '', 'xqb', $1) RETURNING id`, [프로젝트])).rows[0]!.id);
    남의앱 = Number((await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XQBO', 'XQBO 웹', '#3A5FCD', '', 'xqbo', $1) RETURNING id`, [남의프로젝트])).rows[0]!.id);
    for (const tc of 케이스들) await pool.query(`INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema) VALUES ($1, $1 || ' 이름', 'xqb.spec.ts', '{}', '{}')`, [tc]);
    for (const [username, pid] of [['xqb-reader', 프로젝트], ['xqb-other', 남의프로젝트]] as const) {
      await pool.query(`INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', true, false)`, [username, await 해시('열려라참깨')]);
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', 'read', 'none')`, [username, pid]);
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
      쿠키.set(username, (res.headers['set-cookie'] as string).split(';')[0] ?? '');
    }

    // 앞 빌드 1.0.0 · 이번 빌드 1.0:1 — 빌드 번호의 ':' 는 묶음 열쇠에서 감싼다
    실행.앞빌드 = await 실행만들기({ kind: 'FN', build: '1.0.0', origin: 'MANUAL', by: 'xqb-a', 시작: '2026-11-10T01:00:00Z' });
    await 항목(실행.앞빌드, 'XQB-FN-001', 'PASS');
    실행.기능 = await 실행만들기({ kind: 'FN', build: '1.0:1', origin: 'MANUAL', by: 'xqb-a', 시작: '2026-11-12T01:00:00Z' });
    await 항목(실행.기능, 'XQB-FN-001', 'FAIL', 'boom');
    await 항목(실행.기능, 'XQB-FN-002', 'FAIL', 'page.goto: net::ERR_CONNECTION_REFUSED');
    await 항목(실행.기능, 'XQB-FN-003', 'NA', 'ABORTED');
    실행.정기UI = await 실행만들기({ kind: 'UI', build: '1.0:1', origin: 'SCHEDULED', by: '스케줄러', 시작: '2026-11-12T03:00:00Z' });
    await 항목(실행.정기UI, 'XQB-UI-001', 'FAIL', 'boom');
    await 항목(실행.정기UI, 'XQB-UI-002', 'PASS');
    await pool.query(`INSERT INTO run_case_bug (run_id, tc_id, marked_by, marked_by_name) VALUES ($1, 'XQB-UI-001', 'xqb-b', 'B')`, [실행.정기UI]);
    // 안정화 집계 줄 — 웹은 페이지 오류 · 콘솔 · 네트워크 셋이 다 선다
    await pool.query(
      `INSERT INTO stab_run (run_id, service_id, env, day, build_no, cases, error_cases, pass_error_cases, residual, new_errors, resolved, confirmed)
       VALUES ($1, $2, 'qa', '2026-11-12', '1.0:1', 5, 3, 2, 3, 1, 0, 1)`,
      [실행.정기UI, 앱],
    );
    const 오류 = Number((await pool.query<{ id: string }>(
      `INSERT INTO stab_error (service_id, env, source, fingerprint, title, first_run_id, first_day) VALUES ($1, 'qa', 'WEB_CONSOLE', 'xqb', 'TypeError', $2, '2026-11-12') RETURNING id`,
      [앱, 실행.정기UI],
    )).rows[0]!.id);
    await pool.query(`INSERT INTO stab_run_error (run_id, error_id, state, cases, hits) VALUES ($1, $2, 'REOPENED', 2, 3)`, [실행.정기UI, 오류]);
    for (const [i, tc] of ['XQB-UI-002', 'XQB-FN-009'].entries()) {
      await pool.query(`INSERT INTO stab_occurrence (run_id, error_id, history_id, tc_id, item_status, hits, crash) VALUES ($1, $2, $3, $4, 'PASS', 1, false)`, [실행.정기UI, 오류, i + 1, tc]);
    }
  });

  afterAll(async () => {
    await pool.query('DELETE FROM qa_report WHERE service_id = ANY($1)', [[앱, 남의앱]]);
    await pool.query('DELETE FROM perf_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM run_case_bug WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1 AND rerun_of IS NOT NULL', [앱]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM stab_error WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [[앱, 남의앱]]);
    await app.close();
  });

  const 열쇠 = () => `B:${앱}:qa:1.0%3A1`;

  it('같은 빌드 실행을 한 리포트로 묶고 첫 장 숫자를 굳힌다', async () => {
    expect(await QA리포트를다시만든다({ runId: 실행.기능 })).toBe('새 버전');
    expect(await QA리포트를다시만든다({ runId: 실행.정기UI })).toBe('고침');
    const [v1, ...더] = await 리포트(열쇠());
    expect(더).toHaveLength(0);
    expect(v1!.run_ids.map(Number)).toEqual([실행.기능, 실행.정기UI]);
    // 정기 실행의 스케줄러는 수행자가 아니다
    expect(v1!.performers).toEqual(['xqb-a']);
    const s = v1!.summary;
    expect(s.kinds).toEqual(['FN', 'UI']);
    expect(s.overview).toMatchObject({ buildNo: '1.0:1', env: 'qa', runs: 2, running: 0, testsRepo: 'https://git.xqb.test/tests' });
    expect(s.results.functional).toEqual([
      { kind: 'FN', result: { pass: 0, fail: 2, notRun: 1, unconfirmed: 0 } },
      { kind: 'UI', result: { pass: 1, fail: 1, notRun: 0, unconfirmed: 0 } },
      { kind: 'E2E', result: null },
    ]);
    expect(s.results.nonFunctional).toEqual([
      { kind: 'COMPAT', quality: 'COMPATIBILITY', result: null },
      { kind: 'PERF', quality: 'PERFORMANCE_EFFICIENCY', result: null },
      {
        kind: 'STAB',
        quality: 'RELIABILITY',
        result: {
          day: '2026-11-12', days: 1, passErrorCases: 2, cases: 5, residual: 3, newErrors: 1, reopened: 1, confirmed: 1,
          sources: [{ source: 'WEB_PAGEERROR', cases: 0 }, { source: 'WEB_CONSOLE', cases: 2 }, { source: 'WEB_NETWORK', cases: 0 }],
        },
      },
    ]);
    expect(s.plan.cases.find((c) => c.kind === 'FN')).toEqual({
      kind: 'FN', planned: 4, ran: 3,
      notIncluded: [{ tcId: 'XQB-FN-004', name: 'XQB-FN-004 이름' }],
      notRun: [{ tcId: 'XQB-FN-003', name: 'XQB-FN-003', platform: 'desktop', cause: 'stopped' }],
    });
    // 사람 판정(결함) · 원인 규칙(환경) · 미분류. 멈춰 안 돈 FN-003 과 안정화 오류는 실패 분류에 안 든다
    expect(s.failures.counts).toEqual({ PRODUCT: 1, TEST: 0, ENV: 1, UNCLASSIFIED: 1 });
    expect(s.failures.items.find((f) => f.tcId === 'XQB-UI-001')).toMatchObject({ class: 'PRODUCT', by: 'PERSON' });
    expect(s.previous).toEqual({ buildNo: '1.0.0', reportId: null });
  });

  it('승인 뒤 정기 실행은 버전을 안 올리고 사람 실행 · 같은 빌드 한 건 실행은 버전 2 를 세운다', async () => {
    await pool.query(`UPDATE qa_report SET approved_by = 'xqb-admin', approved_at = now(), pdf_path = '/x.pdf', pdf_sha256 = 'ab' WHERE bundle_key = $1`, [열쇠()]);
    const 정기 = await 실행만들기({ kind: 'FN', build: '1.0:1', origin: 'SCHEDULED', by: '스케줄러', 시작: '2026-11-13T03:00:00Z' });
    await 항목(정기, 'XQB-FN-001', 'PASS');
    expect(await QA리포트를다시만든다({ runId: 정기 })).toBe('그대로');
    // 다른 빌드에서 돈 한 건 실행은 이 묶음에 안 든다
    const 남의빌드 = await 실행만들기({ kind: 'FN', build: '1.0.2', origin: 'SINGLE', by: 'xqb-c', 시작: '2026-11-13T04:00:00Z', rerunOf: 실행.기능 });
    expect(await QA리포트를다시만든다({ runId: 남의빌드 })).toBe('없음');
    const 한건 = await 실행만들기({ kind: 'FN', build: '1.0:1', origin: 'SINGLE', by: 'xqb-c', 시작: '2026-11-13T05:00:00Z', rerunOf: 실행.기능 });
    await 항목(한건, 'XQB-FN-001', 'PASS');
    expect(await QA리포트를다시만든다({ runId: 한건 })).toBe('새 버전');
    const [v1, v2] = await 리포트(열쇠());
    expect(v1!.approved_at).not.toBeNull();
    expect(v2!.version).toBe(2);
    // 승인한 뒤 버전 2 를 세우기 전에 끝난 정기 실행은 담지 않는다
    expect(v2!.run_ids.map(Number)).toEqual([실행.기능, 실행.정기UI]);
    expect(v2!.performers).toEqual(['xqb-a', 'xqb-c']);
    expect(v2!.summary.results.functional[0]).toEqual({ kind: 'FN', result: { pass: 1, fail: 1, notRun: 1, unconfirmed: 0 } });
  });

  it('도는 실행은 담지 않고 수만 센다', async () => {
    const 도는 = await 실행만들기({ kind: 'UI', build: '1.0:1', origin: 'MANUAL', by: 'xqb-d', 시작: '2026-11-13T06:00:00Z', status: 'RUNNING' });
    expect(await QA리포트를다시만든다({ runId: 실행.기능 })).toBe('고침');
    const 끝난 = await 실행만들기({ kind: 'UI', build: '1.0:1', origin: 'MANUAL', by: 'xqb-d', 시작: '2026-11-13T07:00:00Z' });
    expect(await QA리포트를다시만든다({ runId: 끝난 })).toBe('고침');
    const v2 = (await 리포트(열쇠()))[1]!;
    expect(v2.run_ids.map(Number)).not.toContain(도는);
    expect(v2.summary.overview.running).toBe(1);
  });

  it('같은 빌드 성능 실행도 묶음에 들고 목표 통과 · 미달을 센다', async () => {
    const 성능 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO perf_run (kind, service_id, env, base_url, config, status, verdict, targets, origin, triggered_by, triggered_by_name, build_no, started_at, finished_at)
           VALUES ('PAGE', $1, 'qa', 'https://qa.xqb.test', '{}', 'DONE', 'FAIL', '[{"verdict":"PASS"},{"verdict":"FAIL"}]', 'MANUAL', 'xqb-p', 'P', '1.0:1', now(), now()) RETURNING id`,
          [앱],
        )
      ).rows[0]!.id,
    );
    expect(await QA리포트를다시만든다({ perfRunId: 성능 })).toBe('고침');
    const v2 = (await 리포트(열쇠()))[1]!;
    expect(v2.summary.kinds).toContain('PERF');
    expect(v2.summary.results.nonFunctional[1]).toEqual({ kind: 'PERF', quality: 'PERFORMANCE_EFFICIENCY', result: { runs: 1, pass: 1, fail: 1 } });
    expect(v2.performers).toContain('xqb-p');
    expect((await 부르기('xqb-reader', `/api/perf/runs/${String(성능)}/qa-report`)).json()).toEqual({ id: Number(v2.id) });
  });

  it('빌드 없는 실행은 실행 하나가 리포트다', async () => {
    const 하나 = await 실행만들기({ kind: 'UI', build: null, origin: 'MANUAL', by: 'xqb-a', 시작: '2026-11-13T08:00:00Z' });
    await 항목(하나, 'XQB-UI-002', 'PASS');
    expect(await QA리포트를다시만든다({ runId: 하나 })).toBe('새 버전');
    const [r] = await 리포트(`R:${하나}`);
    expect(r!.summary.overview.buildNo).toBeNull();
    expect(r!.summary.previous).toBeNull();
  });

  it('읽기 통로 — 목록은 묶음마다 마지막 버전 · 상세 · 실행이 든 리포트 · 남의 프로젝트는 막힌다', async () => {
    const 목록 = await 부르기('xqb-reader', '/api/qa-reports?service=XQB&env=qa');
    expect(목록.statusCode, 목록.body).toBe(200);
    const 줄 = (목록.json() as { items: { id: number; buildNo: string | null; version: number; kinds: string[] }[]; total: number }).items.find((i) => i.buildNo === '1.0:1');
    expect(줄).toMatchObject({ version: 2, kinds: ['FN', 'UI', 'PERF'] });
    expect((await 부르기('xqb-reader', '/api/qa-reports?service=XQB&approved=true')).json()).toMatchObject({ total: 0 });

    const 상세 = await 부르기('xqb-reader', `/api/qa-reports/${String(줄!.id)}`);
    expect(상세.statusCode, 상세.body).toBe(200);
    expect(상세.json()).toMatchObject({ version: 2, approval: null, versions: [{ version: 1 }, { version: 2, approvedAt: null }] });
    const v1 = (상세.json() as { versions: { id: number }[] }).versions[0]!.id;
    expect((await 부르기('xqb-reader', `/api/qa-reports/${String(v1)}`)).json()).toMatchObject({ approval: { by: 'xqb-admin', late: false, sha256: 'ab' } });

    expect((await 부르기('xqb-reader', `/api/runs/${String(실행.기능)}/qa-report`)).json()).toEqual({ id: 줄!.id });
    expect((await 부르기('xqb-reader', `/api/runs/${String(실행.앞빌드)}/qa-report`)).statusCode).toBe(404);
    expect((await 부르기('xqb-other', `/api/qa-reports/${String(줄!.id)}`)).statusCode).toBe(403);
    expect((await 부르기('xqb-other', '/api/qa-reports?service=XQB')).statusCode).toBe(403);
    expect((await 부르기('xqb-reader', '/api/qa-reports?service=XQB&approved=yes')).statusCode).toBe(400);
  });
});
