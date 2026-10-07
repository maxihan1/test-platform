// 실패 카드 통로가 리포팅 §7 의 응답 모양 · 오류 · 디바이스 거르기 · 권한을 지키는지 본다
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { 카드쪽크기 } from './failuresShape.js';
import reportingRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xfcr-검사용-세션-열쇠-32글자를-넘긴다';
const 계정들 = ['xfcr-reader', 'xfcr-noruns'];

describe.skipIf(연결 === undefined)('실패 카드 통로', () => {
  let pool: Pool;
  // 라우트만 띄운 앱으로 경로 번호 검사를 본다 — 문은 숫자 모양이 아닌 번호를 라우트 앞에서 403 으로 막는다
  let 라우트앱: FastifyInstance;
  let 문앱: FastifyInstance;
  let 서비스 = 0;
  const 실행: Record<string, number> = {};

  async function 치우기(): Promise<void> {
    await pool.query('DELETE FROM user_service WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    const 서비스들 = (await pool.query<{ id: string }>(`SELECT id FROM service WHERE prefix = 'XFCR'`)).rows.map((r) =>
      Number(r.id),
    );
    if (서비스들.length === 0) return;
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM scenario WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [서비스들]);
  }

  async function 실행만들기(이름: string, status: string, 시나리오: number | null = null): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, finished_at)
       VALUES ($1, 'xfcr', 'qa', $2, $3, 'XFCR 마켓', '', '', $4, $5, $6, CASE WHEN $2 = 'RUNNING' THEN NULL ELSE now() END)
       RETURNING run_id`,
      [이름, status, 서비스, 시나리오 === null ? 'UI' : 'SCENARIO', 시나리오, 시나리오 === null ? null : 1],
    );
    실행[이름] = Number(r.rows[0]!.run_id);
    return 실행[이름];
  }

  async function 항목(runId: number, tcId: string, platform: string, status: string): Promise<void> {
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, params, expected, param_schema, expected_schema,
                             status, finished_at)
       VALUES ($1, $2, $3, $4, '', '{}', '{}', '{}', '{}', $5, now())`,
      [runId, tcId, platform, `${tcId} 케이스`, status],
    );
  }

  async function 계정(username: string, runs: 'read' | 'none'): Promise<void> {
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

  const 주소 = (runId: number | string, 질의 = 'page=1'): string => `/api/runs/${String(runId)}/failures?${질의}`;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치우기();
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XFCR', 'XFCR 마켓', '#445566', '', 'xfcr') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    const 시나리오 = await pool.query<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XFCR 주문 흐름', 'xfcr') RETURNING id`,
      [서비스],
    );
    const 시나리오번호 = Number(시나리오.rows[0]!.id);
    await pool.query(
      `INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xfcr', '검사')`,
      [시나리오번호],
    );

    const 끝남 = await 실행만들기('끝남', 'FINISHED');
    await 항목(끝남, 'XFCR-001', 'desktop', 'FAIL');
    await 항목(끝남, 'XFCR-001', 'mobile', 'FAIL');
    await 항목(끝남, 'XFCR-002', 'mobile', 'FAIL');
    await 항목(끝남, 'XFCR-003', 'desktop', 'PASS');
    await 실행만들기('도는중', 'RUNNING');
    await 실행만들기('시나리오', 'FINISHED', 시나리오번호);

    await 계정('xfcr-reader', 'read');
    await 계정('xfcr-noruns', 'none');

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

  it('끝난 실행은 확정 실패 케이스를 쪽 모양으로 낸다', async () => {
    const res = await 라우트앱.inject({ method: 'GET', url: 주소(실행.끝남!) });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Object.keys(body).sort()).toEqual(['items', 'page', 'pageSize', 'total']);
    expect(body).toMatchObject({ total: 2, page: 1, pageSize: 카드쪽크기 });
    expect(body.items.map((c: { tcId: string }) => c.tcId)).toEqual(['XFCR-001', 'XFCR-002']);
  });

  it('도는 실행은 409 RUN_NOT_FINISHED 다', async () => {
    const res = await 라우트앱.inject({ method: 'GET', url: 주소(실행.도는중!) });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'RUN_NOT_FINISHED', detail: 'RUNNING' });
  });

  it('없는 번호 · 시나리오 실행은 404 RUN_NOT_FOUND 다', async () => {
    for (const runId of [999999999, 실행.시나리오!]) {
      const res = await 라우트앱.inject({ method: 'GET', url: 주소(runId) });
      expect(res.statusCode, String(runId)).toBe(404);
      expect(res.json().error, String(runId)).toBe('RUN_NOT_FOUND');
    }
  });

  it('경로 번호 · page · platform 이 모양 밖이면 400 INVALID_REQUEST 다', async () => {
    const 주소들 = [
      ...['abc', '1e3', '0x10', '0', '-1'].map((값) => 주소(값)),
      ...['', 'page=abc', 'page=0', 'page=-1', 'page=1.5', 'page=1&page=2'].map((질의) => 주소(실행.끝남!, 질의)),
      ...['platform=ios', 'platform=', 'platform=desktop&platform=mobile'].map((질의) => 주소(실행.끝남!, `page=1&${질의}`)),
    ];
    for (const url of 주소들) {
      const res = await 라우트앱.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(400);
      expect(res.json().error, url).toBe('INVALID_REQUEST');
    }
  });

  it('platform 을 주면 그 디바이스로 거른 결과다', async () => {
    const 모바일 = (await 라우트앱.inject({ method: 'GET', url: 주소(실행.끝남!, 'page=1&platform=mobile') })).json();
    expect(모바일.total).toBe(2);
    expect(모바일.items.flatMap((c: { devices: { platform: string }[] }) => c.devices.map((d) => d.platform))).toEqual([
      'mobile',
      'mobile',
    ]);

    const 데스크톱 = (await 라우트앱.inject({ method: 'GET', url: 주소(실행.끝남!, 'page=1&platform=desktop') })).json();
    expect(데스크톱.total).toBe(1);
    expect(데스크톱.items[0].tcId).toBe('XFCR-001');
    expect(데스크톱.items[0].devices.map((d: { platform: string }) => d.platform)).toEqual(['desktop']);
  });

  it('그 실행의 서비스에 실행 read 가 없으면 insights 와 같은 403 이고 실행 read 면 200 이다', async () => {
    const 못봄 = await 출입증('xfcr-noruns');
    const 카드 = await 문앱.inject({ method: 'GET', url: 주소(실행.끝남!), cookies: 못봄 });
    const 견주기 = await 문앱.inject({ method: 'GET', url: `/api/runs/${String(실행.끝남)}/insights`, cookies: 못봄 });
    expect(카드.statusCode).toBe(403);
    expect(카드.json()).toEqual({ error: 'FORBIDDEN', need: 'runs:read' });
    expect(카드.json()).toEqual(견주기.json());

    const 봄 = await 출입증('xfcr-reader');
    const res = await 문앱.inject({ method: 'GET', url: 주소(실행.끝남!), cookies: 봄 });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(2);
  });
});
