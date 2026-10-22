// E2E AI 흐름 후보를 실제 DB 와 문으로 본다 — 꺼짐 503 · 재료 모자람 409 · 같은 일 재사용 · 흐름 일 먼저 집기 · 다듬기 · 값 연결 가리기 · 성능 통로 404 · 오래된 대기 닫기 (도메인/시나리오 §3.7 결정 15 · §7 「마법사 통로」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import perfRoutes from '../perf/routes.js';

import { 집기기록지우기 } from './flowJob.js';
import scenarioRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XFL';
const 계정들 = ['xfl-agent', 'xfl-writer', 'xfl-mapper'];
const 번호들 = ['XFL-FN-001', 'XFL-FN-002', 'XFL-FN-003'];

type 결과 = { status: string; candidates: { steps: { tcId: string }[]; links: { toSeq: number; link: unknown }[] }[] | null; error: string | null; material: { cases: number } };

describe.skipIf(연결 === undefined)('E2E AI 흐름 후보', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: import('pg').Pool;
  let 서비스 = 0;
  const 쿠키: Record<string, string> = {};
  const 원래맥 = process.env.AUTHORING_AGENT_USER;

  const 부르기 = (누구: string, method: 'GET' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie: 쿠키[누구] ?? '' }, ...(payload === undefined ? {} : { payload }) });
  const 맡기기 = (payload: object) => 부르기('xfl-writer', 'POST', '/api/scenarios/flow-suggestions', payload);
  const 결과보기 = async (누구: string, id: number) => (await 부르기(누구, 'GET', `/api/scenarios/flow-suggestions/${id}`)).json<결과>();
  const 집기 = async () => (await 부르기('xfl-agent', 'POST', '/api/perf/ai-jobs/claim')).json<{ job: { id: number; kind: string; input: { cases: unknown[] } } | null }>().job;

  async function 계정(username: string, projectId: number, runs: string, authoring: string): Promise<void> {
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', true, false)`,
      [username, await 해시('열려라참깨')],
    );
    await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, $4)`, [username, projectId, runs, authoring]);
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    쿠키[username] = (res.headers['set-cookie'] as string).split(';')[0] ?? '';
  }

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    process.env.AUTHORING_AGENT_USER = 'xfl-agent';
    app = Fastify();
    세션등록(app, 'xfl-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(perfRoutes, { prefix: '/api' });
    await app.register(scenarioRoutes, { prefix: '/api' });
    await app.ready();

    const p = await pool.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', ['XFL 프로젝트']);
    const projectId = Number(p.rows[0]?.id);
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#445566', '', 'xfl', $2) RETURNING id`,
      [접두사, projectId],
    );
    서비스 = Number(s.rows[0]?.id);
    for (const tc of 번호들) {
      const 칸 = tc === 'XFL-FN-002' ? '{"type":"object","properties":{"orderId":{"type":"string"}}}' : '{}';
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, file_path, param_schema, expected_schema, is_active) VALUES ($1, $1, '["desktop"]', 'xfl/a.spec.ts', $2, '{}', true)`,
        [tc, 칸],
      );
    }
    const 부른다 = async (method: string, path: string, tcId: string) => {
      const api = await pool.query<{ id: string }>('INSERT INTO service_api (service_id, method, host, path) VALUES ($1, $2, $3, $4) RETURNING id', [서비스, method, 'xfl.test', path]);
      await pool.query('INSERT INTO service_api_use (api_id, service_id, tc_id, run_id) VALUES ($1, $2, $3, 1)', [api.rows[0]?.id, 서비스, tcId]);
    };
    await 부른다('POST', '/api/orders', 'XFL-FN-001');
    await 부른다('GET', '/api/orders/:n', 'XFL-FN-002');
    await 계정('xfl-agent', projectId, 'none', 'write');
    await 계정('xfl-writer', projectId, 'write', 'none');
    await 계정('xfl-mapper', projectId, 'read', 'read');
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    process.env.AUTHORING_AGENT_USER = 원래맥;
    await pool.query('DELETE FROM perf_ai_job WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_api WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  let 흐름일 = 0;
  let 흐름글일 = 0;
  let 성능일 = '';

  it('작성 에이전트가 집으러 온 적이 없으면 503 이다', async () => {
    집기기록지우기();
    expect((await 맡기기({ service: 접두사, platform: 'desktop' })).json()).toMatchObject({ error: 'AGENT_OFFLINE' });
  });

  it('도는 케이스가 둘보다 적으면 409, 같은 사람 · 디바이스 · 흐름 글이면 같은 일이다', async () => {
    expect(await 집기()).toBeNull();
    성능일 = (await pool.query<{ id: string }>(
      `INSERT INTO perf_ai_job (kind, service_id, input, status) VALUES ('SUGGEST_TARGETS', $1, '{}', 'QUEUED') RETURNING id`,
      [서비스],
    )).rows[0]?.id ?? '';
    expect((await 맡기기({ service: 접두사, platform: 'mobile' })).json()).toMatchObject({ error: 'NO_DATA' });
    const 첫 = await 맡기기({ service: 접두사, platform: 'desktop' });
    expect(첫.statusCode).toBe(202);
    흐름일 = 첫.json<{ jobId: number }>().jobId;
    expect((await 맡기기({ service: 접두사, platform: 'desktop', wish: '' })).json()).toEqual({ jobId: 흐름일 });
    흐름글일 = (await 맡기기({ service: 접두사, platform: 'desktop', wish: '주문 취소' })).json<{ jobId: number }>().jobId;
    expect(흐름글일).not.toBe(흐름일);
    expect((await 부르기('xfl-mapper', 'POST', '/api/scenarios/flow-suggestions', { service: 접두사, platform: 'desktop' })).statusCode).toBe(403);
  });

  it('집기는 먼저 온 성능 일보다 흐름 추천 일을 먼저 주고, 성능 통로는 흐름 일에 404 다', async () => {
    const job = await 집기();
    expect(job).toMatchObject({ id: 흐름일, kind: 'SUGGEST_FLOWS' });
    expect(job?.input.cases).toHaveLength(3);
    expect((await 부르기('xfl-writer', 'GET', `/api/perf/ai-jobs/${흐름일}`)).statusCode).toBe(404);
    expect(await 결과보기('xfl-writer', 흐름일)).toMatchObject({ status: 'RUNNING', candidates: null, material: { cases: 3 } });
    await pool.query('DELETE FROM perf_ai_job WHERE id = $1', [성능일]);
  });

  it('다듬은 후보를 남기고, (작성, read) 가 없는 사람에게는 값 연결을 뺀다', async () => {
    const 몸 = { output: { candidates: [{ name: '주문 흐름', why: '주문한 것을 연다', tcIds: ['XFL-FN-001', 'XFL-FN-404', 'XFL-FN-002'], links: [{ fromSeq: 1, toSeq: 3, jsonPath: 'id' }] }] } };
    expect((await 부르기('xfl-agent', 'POST', `/api/perf/ai-jobs/${흐름일}/finish`, 몸)).statusCode).toBe(204);
    const 지도본 = await 결과보기('xfl-mapper', 흐름일);
    expect(지도본).toMatchObject({ status: 'DONE', error: null });
    expect(지도본.candidates?.[0]?.steps.map((s) => s.tcId)).toEqual(['XFL-FN-001', 'XFL-FN-002']);
    expect(지도본.candidates?.[0]?.links).toEqual([expect.objectContaining({
      toSeq: 2,
      link: { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/api/orders{,?*}', jsonPath: 'id' } },
    })]);
    expect((await 결과보기('xfl-writer', 흐름일)).candidates?.[0]?.links).toEqual([]);
  });

  it('다듬은 뒤 후보가 없으면 일은 실패이고 끝 알리기는 204 다', async () => {
    const job = await 집기();
    expect(job?.id).toBe(흐름글일);
    const 몸 = { output: { candidates: [{ name: '없는 흐름', why: '지어냈다', tcIds: ['XFL-FN-404', 'XFL-FN-405'] }] } };
    expect((await 부르기('xfl-agent', 'POST', `/api/perf/ai-jobs/${흐름글일}/finish`, 몸)).statusCode).toBe(204);
    expect(await 결과보기('xfl-writer', 흐름글일)).toMatchObject({ status: 'FAILED', candidates: null, error: '쓸 수 있는 흐름 후보가 없다' });
  });

  it('맡긴 뒤 에이전트가 꺼지면 2분 넘은 대기 일을 결과 보기 때 닫는다', async () => {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO perf_ai_job (kind, service_id, input, status, created_at) VALUES ('SUGGEST_FLOWS', $1, $2, 'QUEUED', now() - interval '3 minutes') RETURNING id`,
      [서비스, JSON.stringify({ platform: 'desktop', wish: null, reqs: [], cases: [], links: [], truncated: false })],
    );
    집기기록지우기();
    expect(await 결과보기('xfl-writer', Number(r.rows[0]?.id))).toMatchObject({ status: 'FAILED', error: '작성 에이전트가 꺼져 있다' });
  });
});
