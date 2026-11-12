// 안정화 AI 실행 요약 일 — 가져갈 때 재료 굳히기 · 끝 알리기 거르기 · 모양 틀림 · 집계 줄 없는 일 · 성능 통로 404 (DB 접속이 있을 때만 돈다)
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import perfRoutes from '../perf/routes.js';
import { 견본앞자, 요약일세우기 } from './summary.js';

const 연결 = process.env.DATABASE_URL;
const 에이전트 = 'xsz-agent';

describe.skipIf(연결 === undefined)('안정화 AI 실행 요약 일', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 앱 = 0;
  let 쿠키 = '';
  const 실행 = { ui: 0, fn: 0 };
  const 오류 = { 신규: 0, 기존: 0, 확인: 0 };
  const 원래맥 = process.env.AUTHORING_AGENT_USER;

  const 부르기 = (method: 'GET' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie: 쿠키 }, ...(payload === undefined ? {} : { payload }) });
  const 집기 = async () => (await 부르기('POST', '/api/perf/ai-jobs/claim')).json<{ job: { id: number; kind: string; input: Record<string, unknown> } | null }>().job;
  const 일 = async (id: number) =>
    (await pool.query<{ status: string; input: Record<string, unknown>; output: Record<string, unknown> | null; error: string | null }>('SELECT status, input, output, error FROM perf_ai_job WHERE id = $1', [id])).rows[0]!;
  const 세우기 = async (): Promise<number> => {
    const c = await pool.connect();
    try {
      return await 요약일세우기(c, 앱, 실행.fn);
    } finally {
      c.release();
    }
  };

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    세션등록(app, 'xsz-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(perfRoutes, { prefix: '/api' });
    await app.ready();

    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XSZ 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, schedule_at, schedule_tz, schedule_env)
           VALUES ('XSZ', 'XSZ 웹', '#3A5FCD', '', 'xsz', $1, '03:00', 'Asia/Seoul', 'qa') RETURNING id`,
          [프로젝트],
        )
      ).rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', true, false)`,
      [에이전트, await 해시('열려라참깨')],
    );
    await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', 'read', 'write')`, [에이전트, 프로젝트]);
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 에이전트, password: '열려라참깨' } });
    쿠키 = (res.headers['set-cookie'] as string).split(';')[0] ?? '';

    const 실행만들기 = async (kind: string, 시작: string): Promise<number> =>
      Number(
        (
          await pool.query<{ run_id: string }>(
            `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, origin, started_at, finished_at)
             VALUES ('XSZ 정기', 'XSZ', '', '스케줄러', 'qa', 'https://qa.xsz.test', 'FINISHED', $1, $2, 'SCHEDULED', $3, $3::timestamptz + interval '1 hour')
             RETURNING run_id`,
            [앱, kind, 시작],
          )
        ).rows[0]!.run_id,
      );
    실행.ui = await 실행만들기('UI', '2026-11-10T18:00:00Z');
    실행.fn = await 실행만들기('FN', '2026-11-10T18:30:00Z');
    const 항목 = async (runId: number, tcId: string, name: string): Promise<number> =>
      Number(
        (
          await pool.query<{ history_id: string }>(
            `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
             VALUES ($1, $2, 'desktop', $3, 'xsz.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', 'PASS', 1000, now()) RETURNING history_id`,
            [runId, tcId, name],
          )
        ).rows[0]!.history_id,
      );
    const ui항목 = await 항목(실행.ui, 'XSZ-UI-001', '홈 첫 화면');
    const fn항목 = await 항목(실행.fn, 'XSZ-FN-001', '로그인');

    await pool.query(
      `INSERT INTO stab_run (run_id, service_id, env, day, build_no, cases, error_cases, pass_error_cases, crashes, residual, new_errors, resolved, confirmed)
       VALUES ($1, $2, 'qa', '2026-11-11', '22', 2, 2, 2, NULL, 2, 1, 0, 1)`,
      [실행.fn, 앱],
    );
    const 종류 = async (fp: string, title: string, confirmed: number | null): Promise<number> =>
      Number(
        (
          await pool.query<{ id: string }>(
            `INSERT INTO stab_error (service_id, env, source, fingerprint, title, message, first_run_id, first_day, first_build_no, resolved_at, confirmed_run_id)
             VALUES ($1, 'qa', 'WEB_PAGEERROR', $2, $3, 'TypeError: x', $4, '2026-11-11', '22', $5, $6) RETURNING id`,
            [앱, fp, title, 실행.fn, confirmed === null ? null : '2026-11-10T00:00:00Z', confirmed],
          )
        ).rows[0]!.id,
      );
    오류.기존 = await 종류('xsz-old', 'TypeError · 기존', null);
    오류.신규 = await 종류('xsz-new', 'TypeError · 신규', null);
    오류.확인 = await 종류('xsz-fixed', 'TypeError · 고친 것', 실행.fn);
    for (const [errorId, state, h, tcId] of [
      [오류.기존, 'ONGOING', fn항목, 'XSZ-FN-001'],
      [오류.신규, 'NEW', ui항목, 'XSZ-UI-001'],
    ] as const) {
      await pool.query('INSERT INTO stab_run_error (run_id, error_id, state, cases, hits) VALUES ($1, $2, $3, 1, 1)', [실행.fn, errorId, state]);
      await pool.query(
        `INSERT INTO stab_occurrence (run_id, error_id, history_id, tc_id, item_status, seq, hits, crash, device) VALUES ($1, $2, $3, $4, 'PASS', 3, 1, false, NULL)`,
        [실행.fn, errorId, h, tcId],
      );
    }
    await pool.query(
      `INSERT INTO stab_sample (error_id, ord, run_id, history_id, tc_id, text, page, device, at) VALUES ($1, 1, $2, $3, 'XSZ-UI-001', $4, '/home', NULL, now())`,
      [오류.신규, 실행.fn, ui항목, `TypeError: x\n${'가'.repeat(3000)}`],
    );
  });

  afterAll(async () => {
    // stab_* · perf_ai_job 은 service 와 같이, 빈 project 는 트리거가 지운다
    await pool.query('DELETE FROM run_item WHERE run_id = ANY($1)', [[실행.ui, 실행.fn]]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM stab_error WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM user_project WHERE username = $1', [에이전트]);
    await pool.query('DELETE FROM app_user WHERE username = $1', [에이전트]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
    process.env.AUTHORING_AGENT_USER = 원래맥;
    await app.close();
  });

  it('가져갈 때 재료를 만들어 일에 굳히고, 끝 알리기는 재료에 없는 번호와 기존 종류를 버린다', async () => {
    const id = await 세우기();
    expect((await pool.query('SELECT ai_job_id FROM stab_run WHERE run_id = $1', [실행.fn])).rows[0]).toEqual({ ai_job_id: String(id) });
    // 결과는 안정화 통로로만 읽는다
    expect((await 부르기('GET', `/api/perf/ai-jobs/${String(id)}`)).statusCode).toBe(404);

    const 집은 = await 집기();
    expect(집은).toMatchObject({ id, kind: 'STAB_SUMMARY' });
    const 재료 = 집은!.input as {
      runId: number;
      numbers: Record<string, unknown>;
      errors: { errorId: number; state: string; sample: string | null; occurrences: unknown[] }[];
      confirmed: unknown[];
      cases: unknown[];
      trend: unknown[];
    };
    expect(재료).toMatchObject({ runId: 실행.fn, day: '2026-11-11', buildNo: '22', previous: null, truncated: { errors: false, cases: false } });
    expect(재료.numbers).toMatchObject({ cases: 2, errorCases: 2, residual: 2, newErrors: 1, confirmed: 1 });
    expect(재료.errors.map((e) => [e.errorId, e.state])).toEqual([
      [오류.신규, 'NEW'],
      [오류.기존, 'ONGOING'],
    ]);
    expect(재료.errors[0]!.sample).toHaveLength(견본앞자);
    expect(재료.errors[0]!.occurrences).toEqual([{ tcId: 'XSZ-UI-001', seq: 3 }]);
    expect(재료.confirmed).toEqual([{ errorId: 오류.확인, title: 'TypeError · 고친 것' }]);
    expect(재료.cases).toEqual([
      { tcId: 'XSZ-FN-001', name: '로그인' },
      { tcId: 'XSZ-UI-001', name: '홈 첫 화면' },
    ]);
    expect(재료.trend).toHaveLength(1);
    expect((await 일(id)).input).toEqual(재료);

    const 끝 = await 부르기('POST', `/api/perf/ai-jobs/${String(id)}/finish`, {
      output: {
        headline: '신규 오류 1종이 홈에서 나왔습니다',
        changes: [
          { errorId: 오류.신규, text: '홈 첫 화면 TypeError' },
          { errorId: 오류.기존, text: '기존' },
        ],
        features: [{ name: '홈', tcIds: ['XSZ-UI-001', 'XSZ-UI-999'] }],
        verified: '1종 해결 확인',
        trend: '견줄 점이 없습니다',
        errors: [
          { errorId: 오류.신규, headline: '홈 첫 화면 오류', impact: '통과 판정 케이스 1건', previous: '이전 실행에 없음', cause: '빈 값으로 보입니다' },
          { errorId: 999_999_999, headline: '없는 것', impact: '-', previous: '-', cause: '-' },
        ],
      },
    });
    expect(끝.statusCode, 끝.body).toBe(204);
    const 끝난 = await 일(id);
    expect(끝난.status).toBe('DONE');
    expect(끝난.output).toMatchObject({
      changes: [{ errorId: 오류.신규, text: '홈 첫 화면 TypeError' }],
      features: [{ name: '홈', tcIds: ['XSZ-UI-001'] }],
      errors: [{ errorId: 오류.신규, headline: '홈 첫 화면 오류' }],
    });
  });

  it('모양이 틀리면 일을 실패로 닫는다', async () => {
    const id = await 세우기();
    expect((await 집기())?.id).toBe(id);
    const 끝 = await 부르기('POST', `/api/perf/ai-jobs/${String(id)}/finish`, { output: { headline: '가'.repeat(121) } });
    expect(끝.statusCode).toBe(400);
    expect(끝.json()).toMatchObject({ error: 'INVALID_OUTPUT' });
    expect((await 일(id)).status).toBe('FAILED');
  });

  it('집계 줄이 없는 일은 가져갈 때 실패로 닫고 넘기지 않는다', async () => {
    const id = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO perf_ai_job (kind, service_id, input, status, created_by) VALUES ('STAB_SUMMARY', $1, '{"runId": 999999999}', 'QUEUED', '스케줄러') RETURNING id`,
          [앱],
        )
      ).rows[0]!.id,
    );
    expect(await 집기()).toBeNull();
    expect(await 일(id)).toMatchObject({ status: 'FAILED', error: '실행 999999999 의 집계 줄이 없습니다' });
  });
});
