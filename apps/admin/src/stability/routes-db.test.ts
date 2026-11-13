// 안정화 지표 통로 — 메인 숫자 · 묶음 실행 둘 · 추이 · 목록 차례 · AI 요약 거르기 · 상세 · 해결 처리 · Issue Bunker 등록과 보내기 줄 · 권한 (DB 접속이 있을 때만 돈다)
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import type { BTS응답 } from '../bts/client.js';
import { 보낼줄점검 } from '../bts/outbox.js';
import stabilityRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('안정화 지표 통로', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 프로젝트 = 0;
  let 앱 = 0;
  let API앱 = 0;
  const 계정들 = ['xsy-reader', 'xsy-writer', 'xsy-none'];
  const 쿠키 = new Map<string, string>();
  const 실행 = { ui1: 0, fn1: 0, ui2: 0, fn2: 0 };
  const 오류 = { 신규: 0, 기존: 0, 확인: 0, 남의: 0 };

  const 부르기 = (누구: string, method: 'GET' | 'POST', url: string) => app.inject({ method, url, headers: { cookie: 쿠키.get(누구) ?? '' } });
  const 읽기 = async (url: string) => {
    const r = await 부르기('xsy-reader', 'GET', url);
    expect(r.statusCode, r.body).toBe(200);
    return r.json();
  };

  const 치우기 = async (): Promise<void> => {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [[앱, API앱]]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [[앱, API앱]]);
    await pool.query('DELETE FROM stab_run WHERE service_id = ANY($1)', [[앱, API앱]]);
    await pool.query('DELETE FROM stab_error WHERE service_id = ANY($1)', [[앱, API앱]]);
    await pool.query('DELETE FROM perf_ai_job WHERE service_id = ANY($1)', [[앱, API앱]]);
  };

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    app = Fastify();
    세션등록(app, 'xsy-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(stabilityRoutes, { prefix: '/api' });
    await app.ready();

    프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XSY 프로젝트') RETURNING id`)).rows[0]!.id);
    const 남의프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XSY 다른 프로젝트') RETURNING id`)).rows[0]!.id);
    앱 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id)
           VALUES ('XSY', 'XSY 웹', '#3A5FCD', '', 'xsy', $1) RETURNING id`,
          [프로젝트],
        )
      ).rows[0]!.id,
    );
    await pool.query(
      `WITH st AS (INSERT INTO sched_set (project_id, name, at, tz, days, is_base, created_by)
                   VALUES ($1, 'XSY 웹 전체 회귀', '03:00', 'Asia/Seoul', '{0,1,2,3,4,5,6}', true, '스케줄러') RETURNING id)
       INSERT INTO sched_set_item (set_id, seq, kind, service_id) SELECT id, 1, 'FN', $2 FROM st`,
      [프로젝트, 앱],
    );
    API앱 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ('XSYA', 'XSYA', '#3A5FCD', '', 'xsya', $1, 'API') RETURNING id`,
          [남의프로젝트],
        )
      ).rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.xsy.test/', 'XSY', 'qahub-xsy', 's', '{}', '{}', 'xsy')`,
      [프로젝트],
    );
    for (const [username, runs, pid] of [['xsy-reader', 'read', 프로젝트], ['xsy-writer', 'write', 프로젝트], ['xsy-none', 'none', 프로젝트]] as const) {
      await pool.query(
        `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', true, false)`,
        [username, await 해시('열려라참깨')],
      );
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, 'none')`, [username, pid, runs]);
      // API 애플리케이션 검사용 — 다른 프로젝트도 읽게
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, 'none')`, [username, 남의프로젝트, runs]);
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
      쿠키.set(username, (res.headers['set-cookie'] as string).split(';')[0] ?? '');
    }

    const 실행만들기 = async (kind: string, 시작: string): Promise<number> =>
      Number(
        (
          await pool.query<{ run_id: string }>(
            `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, origin, started_at, finished_at)
             VALUES ('XSY 정기', 'XSY', '', '스케줄러', 'qa', 'https://qa.xsy.test', 'FINISHED', $1, $2, 'SCHEDULED', $3, $3::timestamptz + interval '1 hour')
             RETURNING run_id`,
            [앱, kind, 시작],
          )
        ).rows[0]!.run_id,
      );
    // 서울 03:00 = UTC 전날 18:00
    실행.ui1 = await 실행만들기('UI', '2026-11-09T18:00:00Z');
    실행.fn1 = await 실행만들기('FN', '2026-11-09T18:30:00Z');
    실행.ui2 = await 실행만들기('UI', '2026-11-10T18:00:00Z');
    실행.fn2 = await 실행만들기('FN', '2026-11-10T18:30:00Z');
    const 항목 = async (runId: number, tcId: string, status: string): Promise<number> =>
      Number(
        (
          await pool.query<{ history_id: string }>(
            `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
             VALUES ($1, $2, 'desktop', $3, 'xsy.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', $4, 1000, now()) RETURNING history_id`,
            [runId, tcId, `${tcId} 이름`, status],
          )
        ).rows[0]!.history_id,
      );
    const ui항목 = await 항목(실행.ui2, 'XSY-UI-001', 'PASS');
    const fn항목 = await 항목(실행.fn2, 'XSY-FN-001', 'FAIL');
    const 옛항목 = await 항목(실행.fn1, 'XSY-FN-001', 'FAIL');

    const 일 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO perf_ai_job (kind, service_id, input, status, output, finished_at) VALUES ('STAB_SUMMARY', $1, '{}', 'DONE', $2, '2026-11-11T03:42:00Z') RETURNING id`,
          [앱, JSON.stringify({ headline: '임시' })],
        )
      ).rows[0]!.id,
    );
    const 집계줄 = (runId: number, day: string, build: string, residual: number, resolved: number, confirmed: number, aiJob: number | null) =>
      pool.query(
        `INSERT INTO stab_run (run_id, service_id, env, day, build_no, cases, error_cases, pass_error_cases, crashes, residual, new_errors, resolved, confirmed, ai_job_id)
         VALUES ($1, $2, 'qa', $3, $4, 2, 2, 1, NULL, $5, 1, $6, $7, $8)`,
        [runId, 앱, day, build, residual, resolved, confirmed, aiJob],
      );
    await 집계줄(실행.fn1, '2026-11-10', '20', 2, 1, 0, null);
    await 집계줄(실행.fn2, '2026-11-11', '22', 2, 0, 1, 일);

    const 종류 = async (serviceId: number, fp: string, title: string, firstRun: number, day: string, resolvedAt: string | null, confirmed: number | null) =>
      Number(
        (
          await pool.query<{ id: string }>(
            `INSERT INTO stab_error (service_id, env, source, fingerprint, title, message, first_run_id, first_day, first_build_no, resolved_at, confirmed_run_id)
             VALUES ($1, 'qa', 'WEB_PAGEERROR', $2, $3, 'TypeError: x', $4, $5, '20', $6, $7) RETURNING id`,
            [serviceId, fp, title, firstRun, day, resolvedAt, confirmed],
          )
        ).rows[0]!.id,
      );
    오류.기존 = await 종류(앱, 'xsy-old', 'TypeError · 기존', 실행.fn1, '2026-11-10', null, null);
    오류.확인 = await 종류(앱, 'xsy-fixed', 'TypeError · 고친 것', 실행.fn1, '2026-11-10', '2026-11-10T00:00:00Z', 실행.fn2);
    오류.신규 = await 종류(앱, 'xsy-new', 'TypeError · 신규', 실행.fn2, '2026-11-11', null, null);
    오류.남의 = await 종류(API앱, 'xsya', 'HTTP 500 · 남의 것', 실행.fn2, '2026-11-11', null, null);

    const 남음 = async (runId: number, errorId: number, state: string, cases: number, hits: number) =>
      pool.query('INSERT INTO stab_run_error (run_id, error_id, state, cases, hits) VALUES ($1, $2, $3, $4, $5)', [runId, errorId, state, cases, hits]);
    const 발생 = async (runId: number, errorId: number, h: number, tcId: string, status: string, seq: number | null) =>
      pool.query(
        `INSERT INTO stab_occurrence (run_id, error_id, history_id, tc_id, item_status, seq, hits, crash, device) VALUES ($1, $2, $3, $4, $5, $6, 2, false, NULL)`,
        [runId, errorId, h, tcId, status, seq],
      );
    await 남음(실행.fn1, 오류.기존, 'NEW', 1, 1);
    await 발생(실행.fn1, 오류.기존, 옛항목, 'XSY-FN-001', 'FAIL', 2);
    await 남음(실행.fn1, 오류.확인, 'NEW', 1, 1);
    await 발생(실행.fn1, 오류.확인, 옛항목, 'XSY-FN-001', 'FAIL', 2);
    await 남음(실행.fn2, 오류.기존, 'ONGOING', 1, 4);
    await 발생(실행.fn2, 오류.기존, fn항목, 'XSY-FN-001', 'FAIL', 2);
    await 남음(실행.fn2, 오류.신규, 'NEW', 1, 2);
    await 발생(실행.fn2, 오류.신규, ui항목, 'XSY-UI-001', 'PASS', 3);
    await pool.query(
      `INSERT INTO stab_sample (error_id, ord, run_id, history_id, tc_id, text, page, device, at) VALUES ($1, 1, $2, $3, 'XSY-UI-001', 'TypeError: x\n  at a.js:1', '/home', NULL, now())`,
      [오류.신규, 실행.fn2, ui항목],
    );
    // AI 요약 — 이 실행에 없는 번호(기존 · 999)는 주요 변화에서 버리고 기능 숫자는 서버가 센다
    await pool.query('UPDATE perf_ai_job SET output = $2 WHERE id = $1', [
      일,
      JSON.stringify({
        headline: '신규 오류 1종',
        changes: [
          { errorId: 오류.신규, text: '홈에서 TypeError' },
          { errorId: 999_999_999, text: '없는 것' },
        ],
        features: [{ name: '홈', tcIds: ['XSY-UI-001', 'XSY-UI-999'] }],
        verified: '1종 해결 확인',
        trend: '잔여 오류 그대로',
        errors: [{ errorId: 오류.신규, headline: '홈 첫 화면 오류', impact: '통과 판정이지만 오류', previous: '이전 실행에 없음', cause: '빈 값 추정' }],
      }),
    ]);
  });

  afterAll(async () => {
    await 치우기();
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    // bts_outbox · bts_link 는 project 와 같이, 빈 project 는 트리거가 지운다
    await pool.query('DELETE FROM sched_set WHERE project_id = $1', [프로젝트]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [[앱, API앱]]);
    await app.close();
  });

  it('메인 — 가장 최근 집계 · 묶음 실행 둘 · 이전 실행 · 추이의 빌드 적용 · 목록 차례 · AI 요약은 이 실행 것만 · 숫자는 서버가 센다', async () => {
    const d = await 읽기(`/api/stability?service=${String(앱)}`);
    expect(d.schedule).toEqual({ at: '03:00', tz: 'Asia/Seoul' });
    expect(d.runs).toEqual([
      { runId: 실행.fn2, day: '2026-11-11' },
      { runId: 실행.fn1, day: '2026-11-10' },
    ]);
    expect(d.run).toMatchObject({ runId: 실행.fn2, runIds: [실행.ui2, 실행.fn2], day: '2026-11-11', buildNo: '22', crashes: null, residual: 2, confirmed: 1 });
    expect(d.run.previous).toEqual({ runId: 실행.fn1, day: '2026-11-10', errorCases: 2, residual: 2, crashes: null });
    expect(d.trend.map((p: { buildChanged: boolean }) => p.buildChanged)).toEqual([false, true]);
    expect(d.errors.map((e: { id: number; state: string; previousCases: number; tcIds: string[] }) => [e.id, e.state, e.previousCases, e.tcIds])).toEqual([
      [오류.신규, 'NEW', 0, ['XSY-UI-001']],
      [오류.기존, 'ONGOING', 1, ['XSY-FN-001']],
    ]);
    expect(d.summary).toEqual({
      status: 'DONE',
      headline: '신규 오류 1종',
      changes: [{ errorId: 오류.신규, state: 'NEW', text: '홈에서 TypeError' }],
      features: [{ name: '홈', errorCases: 1 }],
      verified: '1종 해결 확인',
      trend: '잔여 오류 그대로',
      finishedAt: '2026-11-11T03:42:00.000Z',
    });
  });

  it('지난 실행을 고르면 「해결」은 그때 값 · 요약 일이 없으면 null · 틀린 값과 남의 번호', async () => {
    const d = await 읽기(`/api/stability?service=${String(앱)}&run=${String(실행.fn1)}&days=30`);
    expect(d.run).toMatchObject({ runId: 실행.fn1, runIds: [실행.ui1, 실행.fn1], resolved: 1, previous: null });
    expect(d.summary).toBeNull();
    expect((await 부르기('xsy-reader', 'GET', `/api/stability?service=${String(앱)}&days=8`)).statusCode).toBe(400);
    expect((await 부르기('xsy-reader', 'GET', `/api/stability?service=${String(앱)}&run=${String(실행.ui2)}`)).statusCode).toBe(404);
    expect((await 부르기('xsy-reader', 'GET', `/api/stability?service=${String(API앱)}`)).json()).toEqual({ error: 'NOT_SUPPORTED' });
    expect((await 부르기('xsy-none', 'GET', `/api/stability?service=${String(앱)}`)).statusCode).toBe(403);
  });

  it('상세 — 항목이 실제로 돈 실행(UI) · 숫자 넷 · 견본 · 추이 · 요약 · 기존 종류는 가장 최근 요약', async () => {
    const d = await 읽기(`/api/stability/errors/${String(오류.신규)}`);
    expect(d).toMatchObject({ id: 오류.신규, state: 'NEW', firstRunId: 실행.fn2, issue: null, btsLinked: true, runId: 실행.fn2 });
    expect(d.occurrences).toEqual([
      { tcId: 'XSY-UI-001', name: 'XSY-UI-001 이름', status: 'PASS', seq: 3, crash: false, historyId: expect.any(Number), runId: 실행.ui2 },
    ]);
    expect(d.kpis).toEqual({ cases: 1, runCases: 2, passCases: 1, crashCases: 0, firstCrashTcId: null, hits: 2, previousHits: 0 });
    expect(d.samples).toHaveLength(1);
    expect(d.trend).toEqual([
      { day: '2026-11-10', cases: 0 },
      { day: '2026-11-11', cases: 1 },
    ]);
    expect(d.ai).toEqual({ headline: '홈 첫 화면 오류', impact: '통과 판정이지만 오류', previous: '이전 실행에 없음', cause: '빈 값 추정', runId: 실행.fn2 });
    const 옛 = await 읽기(`/api/stability/errors/${String(오류.기존)}?run=${String(실행.fn1)}`);
    expect(옛.kpis.previousHits).toBe(0);
    expect((await 읽기(`/api/stability/errors/${String(오류.기존)}`)).kpis.previousHits).toBe(1);
    // 그 실행에 안 남은 종류 · 남의 애플리케이션 오류
    expect((await 부르기('xsy-reader', 'GET', `/api/stability/errors/${String(오류.신규)}?run=${String(실행.fn1)}`)).statusCode).toBe(404);
    expect((await 부르기('xsy-none', 'GET', `/api/stability/errors/${String(오류.신규)}`)).statusCode).toBe(403);
  });

  it('해결 처리 — 실행 write 만 · 한 번만 · 가장 최근 실행의 「해결」에 바로 보인다', async () => {
    const url = `/api/stability/errors/${String(오류.기존)}/resolve`;
    expect((await 부르기('xsy-reader', 'POST', url)).statusCode).toBe(403);
    expect((await 부르기('xsy-writer', 'POST', url)).statusCode).toBe(204);
    expect((await 부르기('xsy-writer', 'POST', url)).json()).toEqual({ error: 'ALREADY_RESOLVED' });
    expect((await 부르기('xsy-writer', 'POST', `/api/stability/errors/${String(오류.확인)}/resolve`)).json()).toEqual({ error: 'ALREADY_RESOLVED' });
    expect((await 읽기(`/api/stability?service=${String(앱)}`)).run.resolved).toBe(1);
    const e = (await pool.query('SELECT resolved_by FROM stab_error WHERE id = $1', [오류.기존])).rows[0];
    expect(e.resolved_by).toBe('xsy-writer');
  });

  it('Issue Bunker 등록 — 줄 하나 · 기다리는 동안 다시 못 누름 · 보내면 키가 차고 짝은 안 짓는다 · 안 이은 프로젝트', async () => {
    const url = `/api/stability/errors/${String(오류.신규)}/issue`;
    const r = await 부르기('xsy-writer', 'POST', url);
    expect(r.statusCode).toBe(202);
    expect(r.json()).toEqual({ state: 'PENDING' });
    expect((await 부르기('xsy-writer', 'POST', url)).json()).toEqual({ error: 'ALREADY_REGISTERED' });
    expect((await 읽기(`/api/stability/errors/${String(오류.신규)}`)).issue).toEqual({ state: 'PENDING' });

    const 보낸몸: unknown[] = [];
    const 가짜 = async (_자리: unknown, method: string, 경로: string, 몸?: unknown): Promise<BTS응답> => {
      if (method === 'POST' && 경로 === '/api/v1/issues') {
        보낸몸.push(몸);
        return { status: 201, json: { data: { key: 'XSY-7' } } };
      }
      return { status: 200, json: { data: {} } };
    };
    await pool.query("UPDATE bts_outbox SET next_at = now() WHERE project_id = $1 AND kind = 'STAB_CREATE'", [프로젝트]);
    await 보낼줄점검(가짜, async () => 200);
    expect(보낸몸).toHaveLength(1);
    expect(보낸몸[0]).toMatchObject({ projectKey: 'XSY', summary: '[XSY 웹] TypeError · 신규', labels: ['QA Hub', '안정화 지표'] });
    expect(보낸몸[0]).not.toHaveProperty('stabErrorId');
    expect((보낸몸[0] as { description: string }).description).toContain('XSY-UI-001 XSY-UI-001 이름 · 3단계 직후');
    expect((await 읽기(`/api/stability/errors/${String(오류.신규)}`)).issue).toEqual({ key: 'XSY-7', url: 'https://bts.xsy.test/issues/XSY-7' });
    expect((await pool.query('SELECT 1 FROM bts_issue_case WHERE service_id = $1', [앱])).rowCount).toBe(0);
    expect((await 부르기('xsy-writer', 'POST', url)).json()).toEqual({ error: 'ALREADY_REGISTERED' });

    expect((await 부르기('xsy-writer', 'POST', `/api/stability/errors/${String(오류.남의)}/issue`)).json()).toEqual({ error: 'BTS_NOT_LINKED' });
    expect((await 부르기('xsy-writer', 'POST', '/api/stability/errors/999999999/issue')).statusCode).toBe(404);
  });

  it('Issue Bunker 등록이 포기되면 까닭을 보이고 다시 누를 수 있다 · 견본의 ``` 는 울타리를 닫지 않는다', async () => {
    await pool.query("UPDATE stab_sample SET text = 'a ``` b ```` c' WHERE error_id = $1", [오류.신규]);
    const url = `/api/stability/errors/${String(오류.기존)}/issue`;
    expect((await 부르기('xsy-writer', 'POST', url)).statusCode).toBe(202);
    await pool.query("UPDATE bts_outbox SET next_at = now() WHERE project_id = $1 AND kind = 'STAB_CREATE'", [프로젝트]);
    await 보낼줄점검(async () => ({ status: 400, json: null }), async () => 200);
    expect((await 읽기(`/api/stability/errors/${String(오류.기존)}`)).issue).toEqual({ state: 'GAVE_UP', reason: 'Issue Bunker 가 요청을 거절했습니다 (400)' });
    expect((await 부르기('xsy-writer', 'POST', url)).statusCode).toBe(202);

    const { 등록본문 } = await import('./issue.js');
    const { 오류읽기, 오류상세 } = await import('./detail.js');
    const e = (await 오류읽기(오류.신규))!;
    const 본문 = 등록본문(e, (await 오류상세(e, null))!, 'https://tc.xsy.test');
    expect(본문).toContain('`````\na ``` b ```` c\n`````');
    expect(본문).toContain('https://tc.xsy.test/#/stability/errors/');
    expect(본문).toContain('?service=XSY');
  });
});
