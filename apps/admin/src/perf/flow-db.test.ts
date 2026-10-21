// 성능 실행 한 바퀴를 실제 DB 와 문으로 본다 — pga_ 토큰 범위 · 실서비스 금지 · 허용 호스트 · 스모크 → 본 테스트 → 판정 · 자동 중단 · 끊김 · 사람 중단

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { 도는실행들, 한번돌기 } from './engine.js';
import { bucketOf, emptyHist } from './hist.js';
import perfRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPE';
const 남의접두사 = 'XPEB';
const 계정들 = ['xpe-admin', 'xpe-reader', 'xpe-outsider'];
const 에이전트이름 = ['xpe-load', 'xpe-load-off', 'xpe-mon-other'];

const 분포 = (ms: number, n: number) => {
  const h = emptyHist();
  h[bucketOf(ms)] = n;
  return h;
};
const 초 = (sec: number, vus: number, requests: number, errors: number, ms = 100) => ({ sec, vus, txs: [{ name: '목록', requests, errors, hist: 분포(ms, requests) }] });
const 쉼 = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(연결 === undefined)('성능 실행 흐름', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: import('pg').Pool;
  let 서비스 = 0;
  let 남의서비스 = 0;
  let 관리자 = '';
  let 읽기만 = '';
  let 남 = '';
  let 토큰 = '';
  let 시나리오 = 0;
  const 프로젝트들: number[] = [];

  const 사람 = (cookie: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie }, ...(payload === undefined ? {} : { payload }) });
  const 에이전트 = (url: string, payload: object = {}, t = 토큰) => app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${t}` }, payload });

  async function 계정(username: string, role: 'member' | 'admin', runs: 'none' | 'read' | 'write', projectId: number | null): Promise<string> {
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, $3, true, false)`,
      [username, await 해시('열려라참깨'), role],
    );
    if (projectId !== null) {
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, 'none')`, [username, projectId, runs]);
    }
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    return (res.headers['set-cookie'] as string).split(';')[0] ?? '';
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

  // 실행을 만든 통로도 엔진을 한 번 부른다. 겹치면 그쪽이 끝날 때까지 다시 부른다
  async function 될때까지<T>(일: () => Promise<T | null>): Promise<T> {
    for (let i = 0; i < 160; i++) {
      await 한번돌기();
      const v = await 일();
      if (v !== null) return v;
      await 쉼(50);
    }
    throw new Error('기다린 일이 오지 않았다');
  }
  const 일받기 = () => 될때까지(async () => (await 에이전트('/api/perf/agent/claim')).json<{ job: Record<string, unknown> | null }>().job);
  const 상태 = async (runId: number) => (await 사람(관리자, 'GET', `/api/perf/runs/${runId}`)).json<{ status: string; verdict: string | null; stopReason: string | null; targets: { verdict: string }[] | null }>();
  async function 끝날때까지(runId: number) {
    return 될때까지(async () => {
      const s = await 상태(runId);
      return ['DONE', 'STOPPED', 'ERROR'].includes(s.status) ? s : null;
    });
  }
  const 실행만들기 = (more: object = {}) => 사람(관리자, 'POST', '/api/perf/runs', {
    scenarioId: 시나리오, env: 'qa', testType: 'LOAD', stages: [{ durationSec: 30, target: 10 }],
    targets: [{ metric: 'P95', op: '<=', value: 500, source: 'AI' }, { metric: 'ERROR_RATE', op: '<=', value: 1, source: 'AI' }], agentIds: [에이전트번호], ...more,
  });
  let 에이전트번호 = 0;

  async function 스모크통과(runId: number) {
    const smoke = await 일받기();
    expect(smoke.kind).toBe('SMOKE');
    await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, 초(0, 1, 3, 0));
    await 에이전트(`/api/perf/agent/runs/${runId}/done`, { status: 'OK' });
    return 일받기();
  }

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    app = Fastify();
    세션등록(app, 'xpe-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(perfRoutes, { prefix: '/api' });
    await app.ready();

    const 내것 = await 서비스만들기(접두사);
    서비스 = 내것.id;
    const 남의것 = await 서비스만들기(남의접두사);
    남의서비스 = 남의것.id;
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://shop.xpe.test'), ($1, 'live', 'http://live.xpe.test')`, [서비스]);
    await pool.query(`UPDATE service_env SET is_prod = true WHERE service_id = $1 AND env = 'live'`, [서비스]);
    await pool.query(`INSERT INTO project_api_server (project_id, host, name) VALUES ($1, 'api.xpe.test', '결제')`, [내것.projectId]);
    관리자 = await 계정('xpe-admin', 'admin', 'write', 내것.projectId);
    읽기만 = await 계정('xpe-reader', 'member', 'read', 내것.projectId);
    남 = await 계정('xpe-outsider', 'member', 'write', 남의것.projectId);

    const 발급 = await 사람(관리자, 'POST', '/api/perf/agents', { name: 'xpe-load', mode: 'LOAD' });
    expect(발급.statusCode).toBe(201);
    ({ id: 에이전트번호, token: 토큰 } = 발급.json<{ id: number; token: string }>());
    await 에이전트('/api/perf/agent/hello', { version: '0.1.0', host: 'box-1' });
    const 시 = await 사람(관리자, 'POST', '/api/perf/scenarios', {
      serviceId: 서비스, name: '상품 목록', body: { transactions: [{ name: '목록', method: 'GET', url: '/api/items', check: { status: [200] } }] },
    });
    expect(시.statusCode).toBe(201);
    시나리오 = 시.json<{ id: number }>().id;
  }, 60_000);

  afterAll(async () => {
    for (const id of 도는실행들().keys()) await 사람(관리자, 'POST', `/api/perf/runs/${id}/stop`);
    await app?.close();
    const 서비스들 = [서비스, 남의서비스];
    await pool.query('DELETE FROM perf_run WHERE service_id = ANY($1::bigint[])', [서비스들]);
    await pool.query('DELETE FROM perf_scenario WHERE service_id = ANY($1::bigint[])', [서비스들]);
    await pool.query('DELETE FROM perf_agent WHERE name = ANY($1)', [에이전트이름]);
    await pool.query('DELETE FROM project_api_server WHERE project_id = ANY($1::bigint[])', [프로젝트들]);
    await pool.query('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [서비스들]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1::bigint[])', [서비스들]);
  }, 60_000);

  it('pga_ 토큰은 에이전트 통로만 연다 — 사람 통로는 403, 틀린 토큰 · 세션은 에이전트 통로에서 401', async () => {
    expect((await app.inject({ method: 'GET', url: `/api/perf/scenarios?serviceId=${서비스}`, headers: { authorization: `Bearer ${토큰}` } })).json()).toEqual({ error: 'AGENT_TOKEN_SCOPE' });
    expect((await 에이전트('/api/perf/agent/claim', {}, `pga_${'a'.repeat(43)}`)).statusCode).toBe(401);
    expect((await 사람(관리자, 'POST', '/api/perf/agent/claim', {})).statusCode).toBe(401);
  });

  it('hello 의 최대 가상 사용자는 빈 칸만 채우고 사람이 고친 값이 이긴다', async () => {
    const 연락 = await 에이전트('/api/perf/agent/hello', { version: '0.1.0', host: 'box-1', maxVus: 500 });
    expect(연락.json()).toMatchObject({ agentId: 에이전트번호, name: 'xpe-load', mode: 'LOAD' });
    await 에이전트('/api/perf/agent/hello', { version: '0.1.0', host: 'box-1', maxVus: 300 });
    const 목록 = async () => (await 사람(관리자, 'GET', '/api/perf/agents')).json<{ agents: { name: string; maxVus: number; status: string }[] }>().agents.find((a) => a.name === 'xpe-load');
    expect(await 목록()).toMatchObject({ maxVus: 500, status: 'CONNECTED' });
    expect((await 사람(관리자, 'PATCH', `/api/perf/agents/${에이전트번호}`, { maxVus: 800 })).statusCode).toBe(200);
    await 에이전트('/api/perf/agent/hello', { version: '0.1.0', host: 'box-1', maxVus: 500 });
    expect((await 목록())?.maxVus).toBe(800);
  });

  it('실서비스 서버 · 허용 밖 호스트 · 연결 안 된 에이전트 · 남의 프로젝트 모니터링은 실행을 만들지 않는다', async () => {
    expect((await 실행만들기({ env: 'live' })).json()).toEqual({ error: 'PROD_ENV_BLOCKED' });
    const 밖 = await 사람(관리자, 'PUT', `/api/perf/scenarios/${시나리오}`, { body: { transactions: [{ name: '외부', method: 'GET', url: 'https://evil.test/x' }] } });
    expect(밖.json()).toMatchObject({ error: 'HOST_NOT_ALLOWED', detail: '외부' });
    const 꺼짐 = (await 사람(관리자, 'POST', '/api/perf/agents', { name: 'xpe-load-off', mode: 'LOAD' })).json<{ id: number }>();
    expect((await 실행만들기({ agentIds: [꺼짐.id] })).statusCode).toBe(409);
    const 남모니터 = (await 사람(관리자, 'POST', '/api/perf/agents', { name: 'xpe-mon-other', mode: 'MONITOR', projectId: 프로젝트들[1] })).json<{ id: number }>();
    expect((await 실행만들기({ monitorIds: [남모니터.id] })).statusCode).toBe(400);
  });

  it('보기만 권한은 실행을 못 걸고 남의 프로젝트 사람은 실행을 못 본다', async () => {
    expect((await 사람(읽기만, 'POST', '/api/perf/runs', { scenarioId: 시나리오 })).json()).toMatchObject({ error: 'FORBIDDEN' });
    expect((await 사람(읽기만, 'GET', `/api/perf/scenarios?serviceId=${서비스}`)).statusCode).toBe(200);
    expect((await 사람(남, 'GET', `/api/perf/scenarios/${시나리오}`)).json()).toMatchObject({ error: 'SERVICE_FORBIDDEN' });
  });

  it('스모크 테스트를 지나 본 테스트를 돌고 1초 숫자를 합쳐 통과로 판정한다', async () => {
    const runId = (await 실행만들기()).json<{ runId: number }>().runId;
    const load = await 스모크통과(runId);
    expect(load).toMatchObject({ kind: 'LOAD', segment: '0:1', segmentSequence: '0,1', durationSec: 30, allowedHosts: ['shop.xpe.test', 'api.xpe.test'] });
    expect(load.env).toMatchObject({ BASE_URL: 'http://shop.xpe.test' });
    expect(String(load.script)).toContain('"executor":"ramping-vus"');
    for (let s = 0; s < 3; s++) await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, 초(s, 10, 50, 0, 120));
    // 늦게 온 조각은 vus 0 으로 같은 초에 더한다
    await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, 초(2, 0, 10, 0, 120));
    await 에이전트(`/api/perf/agent/runs/${runId}/done`, { status: 'OK' });
    const 끝 = await 끝날때까지(runId);
    expect(끝).toMatchObject({ status: 'DONE', verdict: 'PASS', stopReason: null });
    const series = (await 사람(관리자, 'GET', `/api/perf/runs/${runId}/series?from=2`)).json<{ series: { tx: string; vus: number; requests: number }[] }>().series;
    expect(series.find((r) => r.tx === '')).toMatchObject({ vus: 10, requests: 60 });
    const 로그 = (await 사람(관리자, 'GET', `/api/perf/runs/${runId}/events`)).json<{ events: { message: string }[] }>().events.map((e) => e.message);
    expect(로그.some((m) => m.startsWith('스모크 테스트를 통과했습니다'))).toBe(true);
    expect(로그.at(-1)).toBe('실행이 끝났습니다 — 통과');
  });

  it('스모크 테스트에서 에러가 나면 본 테스트 없이 SMOKE_FAILED 로 멈춘다', async () => {
    const runId = (await 실행만들기()).json<{ runId: number }>().runId;
    expect((await 일받기()).kind).toBe('SMOKE');
    await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, 초(0, 1, 3, 1));
    await 에이전트(`/api/perf/agent/runs/${runId}/done`, { status: 'OK' });
    expect(await 끝날때까지(runId)).toMatchObject({ status: 'STOPPED', verdict: null, stopReason: 'SMOKE_FAILED' });
  });

  it('에러율 20% 이상이 10초 이어지면 ERROR_LIMIT 으로 멈추고 실패로 판정한다', async () => {
    const runId = (await 실행만들기()).json<{ runId: number }>().runId;
    await 스모크통과(runId);
    for (let s = 0; s < 12; s++) await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, 초(s, 10, 10, 5));
    // 시계를 앞으로 당겨 12초가 다 끝난 것으로 본다(끊김 30초 안)
    await 한번돌기(Date.now() + 22_000);
    expect(await 끝날때까지(runId)).toMatchObject({ status: 'STOPPED', verdict: 'FAIL', stopReason: 'ERROR_LIMIT' });
    expect((await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, 초(13, 10, 10, 0))).json()).toEqual({ stop: true });
  });

  it('부하를 맡은 에이전트가 시작 시각 뒤 30초 동안 조용하면 AGENT_LOST 로 멈춘다', async () => {
    const runId = (await 실행만들기()).json<{ runId: number }>().runId;
    await 일받기();
    // 시작 시각 전의 기다림은 끊김으로 안 센다
    await 한번돌기(Date.now() + 20_000);
    expect((await 상태(runId)).status).toBe('SMOKE');
    await 한번돌기(Date.now() + 60_000);
    expect(await 끝날때까지(runId)).toMatchObject({ status: 'STOPPED', stopReason: 'AGENT_LOST' });
  });

  it('사람이 실행 중단을 누르면 USER 로 멈추고 에이전트에게 멈추라고 답한다', async () => {
    const runId = (await 실행만들기()).json<{ runId: number }>().runId;
    await 스모크통과(runId);
    expect((await 사람(관리자, 'POST', `/api/perf/runs/${runId}/stop`)).statusCode).toBe(202);
    expect(await 상태(runId)).toMatchObject({ status: 'STOPPED', stopReason: 'USER', verdict: null });
    expect((await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, 초(0, 10, 10, 0))).json()).toEqual({ stop: true });
    expect((await 사람(관리자, 'POST', `/api/perf/runs/${runId}/stop`)).statusCode).toBe(409);
  });
});
