// 프로젝트 배포 신호의 가장자리 — 실패한 배포는 같은 빌드로 다시 걸린다 · CI 가 먼저 건 웹 빌드 실행은 다시 안 건다 ·
// 여러 애플리케이션에 걸친 버그도 케이스마다 마지막 실행이 통과하면 닫힌다 (도메인/BTS §3.12 「새 기능 바퀴」). 분배 · BTS 는 가짜다. DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 토큰해시 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 세션등록 } from '../auth/session.js';
import { createRun } from '../execution/store.js';

import btsDeployRoutes from './deploy.js';
import { 버그재검증 } from './deployFlow.js';

vi.mock('../execution/dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined), markAborted: vi.fn() }));

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XBM', 'XBMB'];
const 케이스들 = ['XBM-FN-001', 'XBMB-FN-001'];
const 열쇠 = 'pdk_xbm-deploy-key';

describe.skipIf(연결 === undefined)('프로젝트 배포 신호 가장자리', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 프로젝트 = 0;
  const 서비스: Record<string, number> = {};
  const 옛세션 = process.env.SESSION_SECRET;
  // BTS 에 못 닿는 가짜 — 맡기가 깨져 배포가 FAILED 로 끝나게
  const 부르기 = async () => ({ status: 503, json: null });
  const 신호 = (build: string) =>
    app.inject({ method: 'POST', url: `/api/projects/${String(프로젝트)}/deploys`, payload: { build }, headers: { authorization: `Bearer ${열쇠}` } });
  async function 상태기다림(id: number, 기대: string): Promise<{ run_ids: string[] }> {
    for (let i = 0; i < 100; i++) {
      const d = (await pool.query<{ state: string; run_ids: string[] }>('SELECT state, run_ids FROM bts_deploy WHERE id = $1', [id])).rows[0];
      if (d?.state === 기대) return d;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`배포 ${String(id)} 가 ${기대} 가 안 됐다`);
  }
  async function 끝낸다(runId: number, 결과: 'PASS' | 'FAIL'): Promise<void> {
    await pool.query('UPDATE run_item SET status = $2, finished_at = now() WHERE run_id = $1', [runId, 결과]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = clock_timestamp() WHERE run_id = $1", [runId]);
  }
  const 한건실행 = async (tcId: string) =>
    (await createRun({ origin: 'SCHEDULED', triggeredBy: 'xbm-admin', env: 'qa', items: [{ tcId, platforms: ['desktop'], params: {}, expected: {} }] })).runId;

  async function 치운다(): Promise<void> {
    const ids = `(SELECT id FROM service WHERE prefix = ANY($1))`;
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${ids})`, [접두사들]);
    await pool.query(`DELETE FROM test_run WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM app_build WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query(`DELETE FROM authoring_request WHERE project_id IN (SELECT id FROM project WHERE name = 'XBM 프로젝트')`);
    await pool.query(`DELETE FROM authoring_request WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM prd_version WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM service_env WHERE service_id IN ${ids}`, [접두사들]);
    // bts_link · bts_deploy · bts_claim · bts_outbox · bts_issue_case · 노트 사건은 service · project 와 같이 지워진다
    await pool.query('DELETE FROM service WHERE prefix = ANY($1)', [접두사들]);
    await pool.query("DELETE FROM project WHERE name = 'XBM 프로젝트'");
    await pool.query("DELETE FROM app_user WHERE username = 'xbm-admin'");
  }

  beforeAll(async () => {
    pool = (await import('../db/index.js')).pool;
    process.env.SESSION_SECRET = 'xbm-검사용-세션-열쇠-32바이트를-넉넉히-넘긴다';
    app = Fastify();
    세션등록(app, process.env.SESSION_SECRET);
    인증등록(app);
    await app.register(btsDeployRoutes, { prefix: '/api', 부르기 });
    await app.ready();
    await 치운다();
    await pool.query(
      "INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ('xbm-admin', '배포 관리자', NULL, 'admin', true, false)",
    );
    프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XBM 프로젝트') RETURNING id")).rows[0]!.id);
    for (const prefix of 접두사들) {
      서비스[prefix] = Number((await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#445566', '', $1, $2) RETURNING id`,
        [prefix, 프로젝트],
      )).rows[0]!.id);
      await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://qa.xbm.test')`, [서비스[prefix]]);
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, smoke)
         VALUES ($1, $1, '["desktop"]', '[]', 'xbm/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}', false)`,
        [`${prefix}-FN-001`],
      );
    }
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by,
                             deploy_key_hash, deploy_key_tail, deploy_key_by, deploy_key_at)
       VALUES ($1, 'https://bts.xbm.test', 'XBM', 'pat_xbm', 'whsec', $2, '{}', 'xbm-admin', $3, '-key', 'xbm-admin', now())`,
      [프로젝트, { DEPLOY_WAIT: 'wait', QA_REQUEST: 'qa-req', QA_REVIEW: 'review', DEV_REQUEST: 'dev', CODE_REVIEW: 'cr', CLOSED: 'closed' }, 토큰해시(열쇠)],
    );
  });

  afterAll(async () => {
    await 치운다();
    await app.close();
    if (옛세션 === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = 옛세션;
  });

  it('CI 가 먼저 건 웹 빌드 실행은 다시 안 걸고 · 맡기가 깨져 FAILED 로 끝난 배포는 같은 빌드로 다시 걸린다', async () => {
    // CI 토큰이 올린 것처럼 빌드 줄과 그 빌드의 회귀 실행(스모크 케이스가 없다)을 먼저 둔다
    const 빌드 = Number((await pool.query<{ id: string }>("INSERT INTO app_build (service_id, env, build_no, uploaded_by) VALUES ($1, 'qa', 'b7', 'xbm-admin') RETURNING id", [서비스.XBM])).rows[0]!.id);
    const CI실행 = (await createRun({ origin: 'BUILD', build: { id: 빌드, no: 'b7', stage: 'FULL' }, triggeredBy: 'xbm-admin', env: 'qa', items: [{ tcId: 'XBM-FN-001', platforms: ['desktop'], params: {}, expected: {} }] })).runId;
    const 첫 = await 신호('b7');
    expect(첫.statusCode).toBe(202);
    const 첫번호 = 첫.json<{ deployId: number }>().deployId;
    // 스모크가 없어 바로 맡기로 가고, BTS 가 503 이라 FAILED 다
    const 첫배포 = await 상태기다림(첫번호, 'FAILED');
    expect(첫배포.run_ids.map(Number)).toContain(CI실행);
    expect((await pool.query("SELECT 1 FROM test_run WHERE build_id = $1 AND origin = 'BUILD'", [빌드])).rowCount).toBe(1);

    const 다시 = await 신호('b7');
    expect(다시.statusCode).toBe(202);
    expect(다시.json<{ deployId: number }>().deployId).not.toBe(첫번호);
    expect((await pool.query('SELECT 1 FROM bts_deploy WHERE id = $1', [첫번호])).rowCount).toBe(0);
  });

  it('두 애플리케이션에 걸친 버그는 케이스마다 맡은 뒤 마지막 실행이 통과해야 닫힌다', async () => {
    const 배포 = Number((await pool.query<{ id: string }>("SELECT id FROM bts_deploy WHERE project_id = $1", [프로젝트])).rows[0]!.id);
    await pool.query("INSERT INTO bts_claim (project_id, issue_key, deploy_id, issue_type) VALUES ($1, 'XBM-7', $2, 'BUG')", [프로젝트, 배포]);
    for (const prefix of 접두사들) {
      await pool.query("INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env) VALUES ($1, 'XBM-7', $2, $3, 'qa')", [프로젝트, 서비스[prefix], `${prefix}-FN-001`]);
    }
    const 웹 = await 한건실행('XBM-FN-001');
    await 끝낸다(웹, 'PASS');
    expect(await 버그재검증(웹)).toEqual([]);
    const 앱실패 = await 한건실행('XBMB-FN-001');
    await 끝낸다(앱실패, 'FAIL');
    expect(await 버그재검증(앱실패)).toEqual([]);
    const 앱 = await 한건실행('XBMB-FN-001');
    await 끝낸다(앱, 'PASS');
    expect(await 버그재검증(앱)).toEqual(['XBM-7']);
  });

  it('롤백 신호는 받은 키로 바뀐 요구를 되돌린 판과 되돌림 요청을 세운다', async () => {
    await pool.query(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
       VALUES ($1, 1, '[]', 0, 'PERSON', 'xbm-admin', 'xbm'), ($1, 2, $2, 1, 'DECISION', 'xbm-admin', 'xbm')`,
      [서비스.XBM, JSON.stringify([{ reqId: 'XBM-REQ-001', feature: '쿠폰', text: '한 장만', basis: [{ from: 'XBM-9', quote: '한 장' }], status: 'CONFIRMED', byPerson: true, fromIssues: ['XBM-9'] }])],
    );
    const 답 = await app.inject({
      method: 'POST', url: `/api/projects/${String(프로젝트)}/deploys`, headers: { authorization: `Bearer ${열쇠}` },
      payload: { build: 'old-1', rollback: true, rollbackKeys: ['XBM-9'] },
    });
    expect(답.statusCode).toBe(202);
    const 판 = (await pool.query<{ source: string; deploy_id: string; items: unknown[] }>(
      'SELECT source, deploy_id, items FROM prd_version WHERE service_id = $1 ORDER BY version DESC LIMIT 1', [서비스.XBM],
    )).rows[0]!;
    expect([판.source, Number(판.deploy_id), 판.items]).toEqual(['ROLLBACK', 답.json<{ deployId: number }>().deployId, []]);
    expect((await pool.query("SELECT 1 FROM authoring_request WHERE service_id = $1 AND params ? 'rollbackDeploy'", [서비스.XBM])).rowCount).toBe(1);
  });
});
