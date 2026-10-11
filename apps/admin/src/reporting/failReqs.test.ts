// 실패 요구사항 · 카드 판정 · 버그 통로 검사 — 요구 모으기 · reqs · judgment · POST /api/runs/:runId/bugs (도메인/리포팅 「실패 요구사항」)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import reportingRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xdb-검사용-세션-열쇠-32글자를-넘긴다-넘긴다';
const 계정들 = ['xdb-writer', 'xdb-reader'];

describe.skipIf(연결 === undefined)('실패 요구사항 · 판정', () => {
  let pool: Pool;
  let 라우트앱: FastifyInstance;
  let 문앱: FastifyInstance;
  let 서비스 = 0;
  let 끝남 = 0;
  let 도는중 = 0;
  let 시나리오실행 = 0;

  async function 치우기(): Promise<void> {
    await pool.query('DELETE FROM user_service WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    const 서비스들 = (await pool.query<{ id: string }>(`SELECT id FROM service WHERE prefix = 'XDB'`)).rows.map((r) => Number(r.id));
    if (서비스들.length === 0) return;
    await pool.query('DELETE FROM run_case_bug WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM scenario WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM req_case WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM prd_version WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [서비스들]);
  }

  async function 실행만들기(status: string, 시나리오: number | null = null): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, finished_at)
       VALUES ('XDB 실행', 'xdb', 'qa', $1, $2, 'XDB 마켓', '', '', $3, $4, $5, CASE WHEN $1 = 'RUNNING' THEN NULL ELSE now() END)
       RETURNING run_id`,
      [status, 서비스, 시나리오 === null ? 'UI' : 'SCENARIO', 시나리오, 시나리오 === null ? null : 1],
    );
    return Number(r.rows[0]!.run_id);
  }

  async function 항목(runId: number, tcId: string, platform: string, status: string, attempt = 1): Promise<void> {
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, params, expected, param_schema, expected_schema, status, attempt, finished_at)
       VALUES ($1, $2, $3, $4, '', '{}', '{}', '{}', '{}', $5, $6, now())`,
      [runId, tcId, platform, `${tcId} 케이스`, status, attempt],
    );
  }

  async function 요구(reqId: string, tcId: string, axis = '정상'): Promise<void> {
    await pool.query('INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, $2, $3, $4)', [서비스, reqId, tcId, axis]);
  }

  async function 화면이맞음(runId: number, tcId: string, 사람: string, 폐기 = false): Promise<number> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, discarded_at)
       VALUES ($1, 'AUTHOR', $2, $3, $3, 'DONE', CASE WHEN $4 THEN now() ELSE NULL END) RETURNING id`,
      [서비스, JSON.stringify({ prdApply: true, screenRight: { runId, tcId, env: 'qa', reqIds: ['XDB-R1'] } }), 사람, 폐기],
    );
    return Number(r.rows[0]!.id);
  }

  async function 계정(username: string, runs: 'read' | 'write'): Promise<void> {
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, 'member', 'read', true, false)`,
      [username, await 해시('열려라참깨')],
    );
    await pool.query(
      `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, 'none')`,
      [username, 서비스, runs],
    );
  }

  async function 출입증(username: string): Promise<Record<string, string>> {
    const res = await 문앱.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    return { platform_session: res.cookies[0]!.value };
  }

  const 버그 = (앱: FastifyInstance, runId: number | string, body: unknown, cookies?: Record<string, string>) =>
    앱.inject({ method: 'POST', url: `/api/runs/${String(runId)}/bugs`, payload: body as object, ...(cookies === undefined ? {} : { cookies }) });

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치우기();
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XDB', 'XDB 마켓', '#445566', '', 'xdb') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    const 시나리오 = await pool.query<{ id: string }>(`INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XDB 흐름', 'xdb') RETURNING id`, [서비스]);
    await pool.query(`INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xdb', '검사')`, [시나리오.rows[0]!.id]);

    const 판 = [
      { reqId: 'XDB-R2', feature: '가입', text: '두 번째 요구', basis: [], status: '확정' },
      { reqId: 'XDB-R1', feature: '가입', text: '첫 번째 요구', basis: [], status: '확정' },
    ];
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 2, 'PERSON', 'xdb', '검사')`,
      [서비스, JSON.stringify(판)],
    );

    끝남 = await 실행만들기('FINISHED');
    await 항목(끝남, 'XDB-001', 'desktop', 'FAIL');
    await 항목(끝남, 'XDB-001', 'mobile', 'PASS');
    await 항목(끝남, 'XDB-002', 'mobile', 'FAIL');
    await 항목(끝남, 'XDB-003', 'desktop', 'PASS');
    await 항목(끝남, 'XDB-004', 'desktop', 'FAIL');
    await 항목(끝남, 'XDB-005', 'desktop', 'PASS');
    await 항목(끝남, 'XDB-005', 'desktop', 'FAIL', 2);
    도는중 = await 실행만들기('RUNNING');
    시나리오실행 = await 실행만들기('FINISHED', Number(시나리오.rows[0]!.id));

    await 요구('XDB-R1', 'XDB-001');
    await 요구('XDB-R1', 'XDB-001', '경계');
    await 요구('XDB-R2', 'XDB-001', '예외');
    await 요구('XDB-R2', 'XDB-002');
    await 요구('XDB-R1', 'XDB-003');
    await 요구('XDB-R1', 'XDB-005');
    await 요구('XDB-OLD', 'XDB-002');

    await 계정('xdb-writer', 'write');
    await 계정('xdb-reader', 'read');

    라우트앱 = Fastify();
    await 라우트앱.register(reportingRoutes, { prefix: '/api' });
    await 라우트앱.ready();
    문앱 = Fastify();
    세션등록(문앱, 열쇠);
    인증등록(문앱);
    await 문앱.register(authRoutes, { prefix: '/api' });
    await 문앱.register(reportingRoutes, { prefix: '/api' });
    await 문앱.ready();
  });

  afterAll(async () => {
    await 라우트앱.close();
    await 문앱.close();
    await 치우기();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('insights 의 실패요구들은 실패 케이스를 요구로 모으고 판 차례 뒤에 판에 없는 번호를 둔다', async () => {
    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/insights` });

    expect(res.statusCode).toBe(200);
    expect(res.json().실패요구들).toEqual([
      { reqId: 'XDB-R2', text: '두 번째 요구', tcIds: ['XDB-001', 'XDB-002'] },
      { reqId: 'XDB-R1', text: '첫 번째 요구', tcIds: ['XDB-001', 'XDB-005'] },
      { reqId: 'XDB-OLD', text: null, tcIds: ['XDB-002'] },
    ]);
  });

  it('통과한 케이스와 지도에 없는 실패 케이스는 요구로 모이지 않고 회차 하나만 실패여도 모인다', async () => {
    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/insights` });

    const tcIds = (res.json().실패요구들 as { tcIds: string[] }[]).flatMap((r) => r.tcIds);
    expect(tcIds).not.toContain('XDB-003');
    expect(tcIds).not.toContain('XDB-004');
    expect(tcIds).toContain('XDB-005');
  });

  it('failures 카드마다 reqs 는 축이 달라도 번호 한 줄이고 judgment 는 비어 있다', async () => {
    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/failures?page=1` });

    const 카드 = (res.json().items as { tcId: string; reqs: unknown[]; judgment: unknown }[]).find((c) => c.tcId === 'XDB-001')!;
    expect(카드.reqs).toEqual([
      { reqId: 'XDB-R2', text: '두 번째 요구' },
      { reqId: 'XDB-R1', text: '첫 번째 요구' },
    ]);
    expect(카드.judgment).toBeNull();
    const 없음 = (res.json().items as { tcId: string; reqs: unknown[] }[]).find((c) => c.tcId === 'XDB-004')!;
    expect(없음.reqs).toEqual([]);
  });

  it('버그 통로는 서비스 쓰기만 되고 두 번 눌러도 처음 것이 남는다', async () => {
    const 쓰는사람 = await 출입증('xdb-writer');
    const 첫 = await 버그(문앱, 끝남, { tcId: 'XDB-002' }, 쓰는사람);

    expect(첫.statusCode).toBe(200);
    expect(첫.json().byName).toBe('xdb-writer');
    const 다시 = await 버그(라우트앱, 끝남, { tcId: 'XDB-002' });
    expect(다시.statusCode).toBe(200);
    expect(다시.json()).toEqual(첫.json());
    const 줄수 = await pool.query('SELECT 1 FROM run_case_bug WHERE run_id = $1 AND tc_id = $2', [끝남, 'XDB-002']);
    expect(줄수.rowCount).toBe(1);
  });

  it('버그를 남기면 그 카드의 judgment 가 BUG 로 보인다', async () => {
    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/failures?page=1` });

    const 카드 = (res.json().items as { tcId: string; judgment: { kind: string; byName: string } | null }[]).find((c) => c.tcId === 'XDB-002')!;
    expect(카드.judgment).toMatchObject({ kind: 'BUG', byName: 'xdb-writer' });
  });

  it('화면이 맞음 작성 요청이 버그를 이기고 폐기한 요청은 치지 않는다', async () => {
    await 버그(라우트앱, 끝남, { tcId: 'XDB-001' });
    await 화면이맞음(끝남, 'XDB-001', '먼저');
    const 나중 = await 화면이맞음(끝남, 'XDB-001', '나중');
    await 화면이맞음(끝남, 'XDB-002', '폐기됨', true);

    const res = await 라우트앱.inject({ method: 'GET', url: `/api/runs/${String(끝남)}/failures?page=1` });

    const 카드들 = res.json().items as { tcId: string; judgment: { kind: string; byName: string; requestId?: number } | null }[];
    expect(카드들.find((c) => c.tcId === 'XDB-001')!.judgment).toMatchObject({ kind: 'SCREEN', requestId: 나중, byName: '나중' });
    expect(카드들.find((c) => c.tcId === 'XDB-002')!.judgment?.kind).toBe('BUG');
  });

  it('실패 항목이 없는 케이스는 400 NOT_FAILED 다', async () => {
    const res = await 버그(라우트앱, 끝남, { tcId: 'XDB-003' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('NOT_FAILED');
  });

  it('도는 실행은 409 · 없는 실행과 시나리오 실행은 404 · 글자가 아닌 tcId 는 400 이다', async () => {
    expect((await 버그(라우트앱, 도는중, { tcId: 'XDB-001' })).json().error).toBe('RUN_NOT_FINISHED');
    expect((await 버그(라우트앱, 999999999, { tcId: 'XDB-001' })).statusCode).toBe(404);
    expect((await 버그(라우트앱, 시나리오실행, { tcId: 'XDB-001' })).statusCode).toBe(404);
    expect((await 버그(라우트앱, 끝남, { tcId: 7 })).json().error).toBe('INVALID_REQUEST');
    expect((await 버그(라우트앱, 끝남, {})).json().error).toBe('INVALID_REQUEST');
    expect((await 버그(라우트앱, '1e3', { tcId: 'XDB-001' })).statusCode).toBe(400);
  });

  it('실행 읽기만 있는 사람은 버그를 남길 수 없다', async () => {
    const 읽는사람 = await 출입증('xdb-reader');

    const res = await 버그(문앱, 끝남, { tcId: 'XDB-004' }, 읽는사람);

    expect(res.statusCode).toBe(403);
    const 줄수 = await pool.query('SELECT 1 FROM run_case_bug WHERE run_id = $1 AND tc_id = $2', [끝남, 'XDB-004']);
    expect(줄수.rowCount).toBe(0);
  });
});
