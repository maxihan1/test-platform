// 성능 통로 DB 검사가 같이 쓰는 차림 — 앱 · 애플리케이션 · 계정 · 시나리오 · 실행 한 줄 (검사 전용, 제품 코드가 아니다)

import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';
import type { Pool } from 'pg';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { bucketOf, emptyHist } from './hist.js';
import perfRoutes from './routes.js';
import type { RunConfig, ScenarioBody } from './types.js';

export interface 초줄 {
  sec: number;
  vus: number;
  requests: number;
  errors: number;
  ms: number;
  tx?: string;
}

export interface 실행넣기옵션 {
  scenarioId: number | null;
  scenarioVersion?: number;
  status?: 'QUEUED' | 'RUNNING' | 'DONE' | 'STOPPED' | 'ERROR';
  verdict?: 'PASS' | 'FAIL' | null;
  stopReason?: string | null;
  testType?: 'LOAD' | 'STRESS' | 'SPIKE' | 'SOAK';
  env?: string;
  origin?: 'MANUAL' | 'SCHEDULED';
  degraded?: boolean | null;
  targets?: object[] | null;
  series?: 초줄[];
  peakVus?: number | null;
  p95?: number | null;
}

export interface 차림 {
  app: FastifyInstance;
  pool: Pool;
  서비스: number;
  프로젝트: number;
  관리자: string;
  읽기만: string;
  쓰기: string;
  사람: (cookie: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object) => Promise<LightMyRequestResponse>;
  시나리오만들기: (name: string, body?: ScenarioBody) => Promise<number>;
  실행넣기: (o: 실행넣기옵션) => Promise<number>;
  정리: () => Promise<void>;
}

export const 설정: RunConfig = {
  testType: 'LOAD', load: { basis: 'VUS', stages: [{ durationSec: 30, target: 10 }] }, targets: [], agentIds: [], monitorIds: [],
  allowedHosts: [], pageCheck: false, accountsRows: 0, durationSec: 30, maxVus: 100,
};

/** 접두사 하나가 곧 이 검사의 이름이다. 계정은 소문자 접두사 + -admin · -reader · -writer */
export async function 차리기(접두사: string): Promise<차림> {
  const { pool } = await import('../db/index.js');
  const 소문자 = 접두사.toLowerCase();
  const 계정들 = ['admin', 'reader', 'writer'].map((x) => `${소문자}-${x}`);
  const app = Fastify();
  세션등록(app, `${소문자}-검사용-세션-열쇠-32글자를-넘긴다-넉넉히`);
  인증등록(app);
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(perfRoutes, { prefix: '/api' });
  await app.ready();

  const p = await pool.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [`${접두사} 프로젝트`]);
  const 프로젝트 = Number(p.rows[0]?.id);
  const s = await pool.query<{ id: string }>(
    `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#445566', '', $1, $2) RETURNING id`,
    [접두사, 프로젝트],
  );
  const 서비스 = Number(s.rows[0]?.id);
  await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://shop.${소문자}.test'), ($1, 'live', 'http://live.${소문자}.test')`, [서비스]);
  await pool.query(`UPDATE service_env SET is_prod = true WHERE service_id = $1 AND env = 'live'`, [서비스]);

  async function 계정(username: string, role: 'member' | 'admin', runs: 'read' | 'write'): Promise<string> {
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, $3, true, false)`,
      [username, await 해시('열려라참깨'), role],
    );
    await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, 'none')`, [username, 프로젝트, runs]);
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    return (res.headers['set-cookie'] as string).split(';')[0] ?? '';
  }
  const 관리자 = await 계정(계정들[0] as string, 'admin', 'write');
  const 읽기만 = await 계정(계정들[1] as string, 'member', 'read');
  const 쓰기 = await 계정(계정들[2] as string, 'member', 'write');

  return {
    app, pool, 서비스, 프로젝트, 관리자, 읽기만, 쓰기,
    사람: (cookie, method, url, payload) => app.inject({ method, url, headers: { cookie }, ...(payload === undefined ? {} : { payload }) }),
    async 시나리오만들기(name, body) {
      const res = await app.inject({
        method: 'POST', url: '/api/perf/scenarios', headers: { cookie: 관리자 },
        payload: { serviceId: 서비스, name, body: body ?? { transactions: [{ name: '로그인', method: 'POST', url: '/api/login' }, { name: '목록', method: 'GET', url: '/api/items' }] } },
      });
      return res.json<{ id: number }>().id;
    },
    async 실행넣기(o) {
      const status = o.status ?? 'DONE';
      const verdict = o.verdict === undefined ? (status === 'DONE' ? 'PASS' : null) : o.verdict;
      const r = await pool.query<{ id: string }>(
        `INSERT INTO perf_run (kind, service_id, scenario_id, scenario_version, env, base_url, test_type, config, status, verdict, stop_reason, targets, peak_vus, p95_ms, degraded, origin, started_at, finished_at)
         VALUES ('LOAD', $1, $2, $3, $4, 'http://x.test', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now() - interval '1 minute', CASE WHEN $7 IN ('DONE', 'STOPPED', 'ERROR') THEN now() END) RETURNING id`,
        [
          서비스, o.scenarioId, o.scenarioId === null ? null : (o.scenarioVersion ?? 1), o.env ?? 'qa', o.testType ?? 'LOAD', JSON.stringify(설정), status, verdict, o.stopReason ?? null,
          o.targets === undefined || o.targets === null ? null : JSON.stringify(o.targets), o.peakVus ?? null, o.p95 ?? null, o.degraded ?? null, o.origin ?? 'MANUAL',
        ],
      );
      const id = Number(r.rows[0]?.id);
      for (const x of o.series ?? []) {
        const hist = emptyHist();
        hist[bucketOf(x.ms)] = x.requests;
        await pool.query('INSERT INTO perf_series (run_id, sec, tx, vus, requests, errors, hist) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, x.sec, x.tx ?? '', x.vus, x.requests, x.errors, hist]);
      }
      return id;
    },
    async 정리() {
      await app.close();
      const ids = [서비스];
      await pool.query('DELETE FROM perf_ai_job WHERE service_id = ANY($1::bigint[])', [ids]);
      await pool.query('DELETE FROM perf_run WHERE service_id = ANY($1::bigint[])', [ids]);
      await pool.query('DELETE FROM perf_scenario WHERE service_id = ANY($1::bigint[])', [ids]);
      await pool.query('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [ids]);
      await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
      await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
      await pool.query('DELETE FROM service WHERE id = ANY($1::bigint[])', [ids]);
    },
  };
}
