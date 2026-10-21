// 성능 AI 일을 실제 DB 와 문으로 본다 — 초안 · 추천 세우기 · 작성 에이전트만 집기 · 결과 모양 검사 · 오래된 일 닫기 · 저장의 출처

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import perfRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPI';
const 남의접두사 = 'XPIB';
const 계정들 = ['xpi-agent', 'xpi-writer', 'xpi-reader', 'xpi-outsider'];

const 문서 = {
  openapi: '3.0.0',
  paths: { '/v1/login': { post: { requestBody: { content: { 'application/json': { example: { id: 'a' } } } } } }, '/v1/items': { get: {} } },
};

describe.skipIf(연결 === undefined)('성능 AI 일', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: import('pg').Pool;
  let 서비스 = 0;
  let 남의서비스 = 0;
  const 쿠키: Record<string, string> = {};
  const 프로젝트들: number[] = [];
  const 원래맥 = process.env.AUTHORING_AGENT_USER;

  const 부르기 = (누구: string, method: 'GET' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie: 쿠키[누구] ?? '' }, ...(payload === undefined ? {} : { payload }) });
  const 일상태 = async (id: number) => (await 부르기('xpi-writer', 'GET', `/api/perf/ai-jobs/${id}`)).json<{ status: string; output?: Record<string, unknown>; error?: string }>();
  const 집기 = async () => (await 부르기('xpi-agent', 'POST', '/api/perf/ai-jobs/claim')).json<{ job: { id: number; kind: string; input: Record<string, unknown> } | null }>().job;

  async function 계정(username: string, projectId: number, runs: string, authoring: string): Promise<void> {
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', true, false)`,
      [username, await 해시('열려라참깨')],
    );
    await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, $4)`, [username, projectId, runs, authoring]);
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    쿠키[username] = (res.headers['set-cookie'] as string).split(';')[0] ?? '';
  }

  async function 서비스만들기(prefix: string): Promise<{ id: number; projectId: number }> {
    const p = await pool.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [`${prefix} 프로젝트`]);
    const projectId = Number(p.rows[0]?.id);
    프로젝트들.push(projectId);
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#445566', '', $1, $2) RETURNING id`,
      [prefix, projectId],
    );
    return { id: Number(s.rows[0]?.id), projectId };
  }

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    process.env.AUTHORING_AGENT_USER = 'xpi-agent';
    app = Fastify();
    세션등록(app, 'xpi-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(perfRoutes, { prefix: '/api' });
    await app.ready();

    const 내것 = await 서비스만들기(접두사);
    서비스 = 내것.id;
    const 남의것 = await 서비스만들기(남의접두사);
    남의서비스 = 남의것.id;
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://shop.xpi.test')`, [서비스]);
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 1, 'PERSON', 'xpi', '검사')`,
      [서비스, JSON.stringify([{ reqId: 'XPI-REQ-001', feature: '비기능', text: '일 방문자 1만 명', basis: [], status: 'CONFIRMED' }])],
    );
    await pool.query("INSERT INTO api_doc_version (service_id, version, source, file_name, fingerprint, doc) VALUES ($1, 1, 'FILE', 'a.json', 'xpi1', $2)", [서비스, JSON.stringify(문서)]);
    await 계정('xpi-agent', 내것.projectId, 'none', 'write');
    await 계정('xpi-writer', 내것.projectId, 'write', 'none');
    await 계정('xpi-reader', 내것.projectId, 'read', 'none');
    await 계정('xpi-outsider', 남의것.projectId, 'write', 'none');
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    process.env.AUTHORING_AGENT_USER = 원래맥;
    const 서비스들 = [서비스, 남의서비스];
    await pool.query('DELETE FROM perf_ai_job WHERE service_id = ANY($1::bigint[])', [서비스들]);
    await pool.query('DELETE FROM perf_scenario WHERE service_id = ANY($1::bigint[])', [서비스들]);
    await pool.query('DELETE FROM prd_version WHERE service_id = ANY($1::bigint[])', [서비스들]);
    await pool.query('DELETE FROM api_doc_version WHERE service_id = ANY($1::bigint[])', [서비스들]);
    await pool.query('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [서비스들]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1::bigint[])', [서비스들]);
  });

  let 파일일 = 0;
  let 스웨거일 = 0;
  let 부하일 = 0;

  it('남의 애플리케이션 일은 그 계정이 배정된 작성 에이전트만 집는다', async () => {
    const r = await 부르기('xpi-outsider', 'POST', '/api/perf/suggest', { serviceId: 남의서비스, kind: 'TARGETS' });
    expect(r.statusCode).toBe(202);
    const 남의일 = r.json<{ jobId: number }>().jobId;
    expect((await 부르기('xpi-writer', 'GET', `/api/perf/ai-jobs/${남의일}`)).statusCode).toBe(403);
    expect((await 부르기('xpi-outsider', 'POST', '/api/perf/suggest', { serviceId: 서비스, kind: 'TARGETS' })).statusCode).toBe(403);
  });

  it('초안 · 추천을 세운다 — 파일은 본문 그대로, 없는 API · 아직 없는 추천은 거절한다', async () => {
    const 파일 = await app.inject({
      method: 'POST', url: `/api/perf/scenarios/draft?serviceId=${서비스}&from=FILE&name=order.jmx`,
      headers: { cookie: 쿠키['xpi-writer'] ?? '', 'content-type': 'application/octet-stream' }, payload: Buffer.from('<jmeterTestPlan/>'),
    });
    expect(파일.statusCode).toBe(202);
    파일일 = 파일.json<{ jobId: number }>().jobId;

    const 없는 = await 부르기('xpi-writer', 'POST', '/api/perf/scenarios/draft', { serviceId: 서비스, from: 'SWAGGER', apiDocVersion: 1, operations: [{ method: 'DELETE', path: '/v1/items' }] });
    expect(없는.statusCode).toBe(400);
    const 스 = await 부르기('xpi-writer', 'POST', '/api/perf/scenarios/draft', { serviceId: 서비스, from: 'SWAGGER', apiDocVersion: 1, operations: [{ method: 'post', path: '/v1/login' }] });
    expect(스.statusCode).toBe(202);
    스웨거일 = 스.json<{ jobId: number }>().jobId;

    const 부 = await 부르기('xpi-writer', 'POST', '/api/perf/suggest', { serviceId: 서비스, kind: 'LOAD' });
    expect(부.statusCode).toBe(202);
    부하일 = 부.json<{ jobId: number }>().jobId;
    expect((await 부르기('xpi-writer', 'POST', '/api/perf/suggest', { serviceId: 서비스, kind: 'PAGES' })).statusCode).toBe(400);
    expect((await 부르기('xpi-reader', 'POST', '/api/perf/suggest', { serviceId: 서비스, kind: 'LOAD' })).statusCode).toBe(403);
    expect(await 일상태(파일일)).toEqual({ status: 'QUEUED' });
  });

  it('녹화는 대상 서버 · 케이스를 먼저 본다', async () => {
    expect((await 부르기('xpi-writer', 'POST', '/api/perf/scenarios/draft', { serviceId: 서비스, from: 'RECORD', env: 'live', caseIds: ['XPI-001'] })).json()).toMatchObject({ error: 'ENV_NOT_FOUND' });
    expect((await 부르기('xpi-writer', 'POST', '/api/perf/scenarios/draft', { serviceId: 서비스, from: 'RECORD', env: 'qa', caseIds: ['XPIB-001'] })).statusCode).toBe(400);
  });

  it('작성 에이전트 계정만 집고, 집기는 오래된 차례다', async () => {
    expect((await 부르기('xpi-writer', 'POST', '/api/perf/ai-jobs/claim')).statusCode).toBe(403);
    const job = await 집기();
    expect(job).toMatchObject({ id: 파일일, kind: 'DRAFT_FILE', input: { name: 'order.jmx', text: '<jmeterTestPlan/>' } });
    expect(await 일상태(파일일)).toEqual({ status: 'RUNNING' });
  });

  it('모양이 틀린 결과는 일을 실패로 닫는다', async () => {
    const r = await 부르기('xpi-agent', 'POST', `/api/perf/ai-jobs/${파일일}/finish`, { output: { transactions: [] } });
    expect(r.json()).toMatchObject({ error: 'INVALID_OUTPUT' });
    expect(await 일상태(파일일)).toMatchObject({ status: 'FAILED', error: expect.stringContaining('결과 모양') });
    expect((await 부르기('xpi-agent', 'POST', `/api/perf/ai-jobs/${파일일}/finish`, { error: '또' })).statusCode).toBe(409);
  });

  it('맞는 결과는 끝나고, 그 초안으로 저장하면 버전에 출처가 붙는다', async () => {
    const job = await 집기();
    expect(job).toMatchObject({ id: 스웨거일, input: { apiDocVersion: 1, operations: [{ method: 'POST', path: '/v1/login' }] } });
    const tx = { name: '로그인', method: 'POST', url: '/v1/login', body: '{"id":"${username}"}' };
    expect((await 부르기('xpi-agent', 'POST', `/api/perf/ai-jobs/${스웨거일}/finish`, { output: { transactions: [tx] } })).statusCode).toBe(204);
    expect(await 일상태(스웨거일)).toMatchObject({ status: 'DONE', output: { transactions: [tx], notes: {} } });

    expect((await 부르기('xpi-writer', 'POST', '/api/perf/scenarios', { serviceId: 서비스, name: '로그인', body: { transactions: [tx] }, draftJobId: 파일일 })).statusCode).toBe(400);
    const 저장 = await 부르기('xpi-writer', 'POST', '/api/perf/scenarios', { serviceId: 서비스, name: '로그인', body: { transactions: [tx] }, draftJobId: 스웨거일 });
    expect(저장.statusCode).toBe(201);
    const 상세 = await 부르기('xpi-writer', 'GET', `/api/perf/scenarios/${저장.json<{ id: number }>().id}`);
    expect(상세.json<{ versions: { source: string }[] }>().versions[0]?.source).toBe('SWAGGER');
  });

  it('부하 크기 추천은 admin 이 피크 동시 사용자를 센다', async () => {
    const job = await 집기();
    expect(job).toMatchObject({ id: 부하일, kind: 'SUGGEST_LOAD', input: { prd: [{ reqId: 'XPI-REQ-001' }], guide: null } });
    await 부르기('xpi-agent', 'POST', `/api/perf/ai-jobs/${부하일}/finish`, { output: { dailyVisitors: 10_000, peakRatio: 0.15, avgStayMin: 5, reqIds: ['XPI-REQ-001'] } });
    expect(await 일상태(부하일)).toMatchObject({ status: 'DONE', output: { peakVus: 125, maxVus: 625, peakMinutes: 60 } });
    expect(await 집기()).toBeNull();
  });

  it('오래 쥔 일과 끊긴 녹화는 실패로 닫는다', async () => {
    const 오래 = await pool.query<{ id: string }>(
      `INSERT INTO perf_ai_job (kind, service_id, input, status, claimed_at) VALUES ('SUGGEST_TARGETS', $1, '{}', 'RUNNING', now() - interval '30 minutes') RETURNING id`,
      [서비스],
    );
    const 끊긴 = await pool.query<{ id: string }>(
      `INSERT INTO perf_ai_job (kind, service_id, input, status, created_at) VALUES ('DRAFT_RECORD', $1, '{}', 'RUNNING', now() - interval '2 minutes') RETURNING id`,
      [서비스],
    );
    expect(await 일상태(Number(오래.rows[0]?.id))).toMatchObject({ status: 'FAILED', error: expect.stringContaining('20분') });
    expect(await 일상태(Number(끊긴.rows[0]?.id))).toMatchObject({ status: 'FAILED', error: expect.stringContaining('녹화가 끊겼습니다') });
  });
});
