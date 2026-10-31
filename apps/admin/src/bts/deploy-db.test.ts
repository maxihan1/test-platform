// 프로젝트 배포 신호 — 배포 열쇠 문 · 거절 코드 · 같은 빌드 다시 · 애플리케이션마다 스모크 · 다 통과면 맡기 · 깨지면 보류 댓글 · 늦은 이슈 ·
// 버그 재검증 닫기 · 「QA 요청」을 떠나면 놓기 · BTS 이은 앱 APK 는 실행 안 걸기 (도메인/BTS §3.12 「새 기능 바퀴」 · §7). 분배 · BTS 는 가짜다. DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 토큰해시 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import buildRoutes from '../execution/buildRoutes.js';
import { createRun } from '../execution/store.js';

import type { BTS자리 } from './client.js';
import btsDeployRoutes from './deploy.js';
import { 배포판정, 버그재검증 } from './deployFlow.js';
import { 늦은이슈점검 } from './deployLate.js';
import { BTS알림처리 } from './inbound.js';
import { 보낼줄점검 } from './outbox.js';

vi.mock('../execution/dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined), markAborted: vi.fn() }));

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XBN', 'XBNA'];
const 케이스들 = ['XBN-FN-001', 'XBN-FN-002', 'XBNA-FN-001'];
const 열쇠 = 'pdk_xbn-deploy-key';
const CI열쇠 = `cit_${'x'.repeat(43)}`;

describe.skipIf(연결 === undefined)('프로젝트 배포 신호', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 프로젝트 = 0;
  const 서비스: Record<string, number> = {};
  const 옛환경 = { ...process.env };
  // 가짜 BTS — 「QA 요청」 검색은 이 목록을 준다. 부른 것을 적어 둔다
  let QA요청: { key: string; typeKey: string }[] = [];
  const 부른것: { method: string; 경로: string; 몸: unknown }[] = [];
  const 부르기 = async (_자리: BTS자리, method: string, 경로: string, 몸?: unknown) => {
    부른것.push({ method, 경로, 몸 });
    if (경로 === '/api/v1/search/aql') return { status: 200, json: { data: QA요청, meta: {} } };
    if (method === 'GET') return { status: 200, json: { data: { key: 경로.split('/').pop(), currentStateKey: 'qa-req', version: 3, typeKey: 'bug', summary: '' } } };
    return { status: 201, json: { data: {} } };
  };

  const 신호 = (몸: object, 헤더: Record<string, string> = { authorization: `Bearer ${열쇠}` }, id = 프로젝트) =>
    app.inject({ method: 'POST', url: `/api/projects/${String(id)}/deploys`, payload: 몸, headers: 헤더 });
  const 배포 = async (id: number) =>
    (await pool.query<{ state: string; run_ids: string[] }>('SELECT state, run_ids FROM bts_deploy WHERE id = $1', [id])).rows[0]!;
  async function 실행기다림(id: number, 수: number): Promise<number[]> {
    for (let i = 0; i < 100; i++) {
      const d = await 배포(id);
      if (d.run_ids.length >= 수) return d.run_ids.map(Number);
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`배포 ${String(id)} 의 실행이 안 섰다`);
  }
  async function 끝낸다(runIds: number[], 결과: (tcId: string) => 'PASS' | 'FAIL'): Promise<void> {
    for (const runId of runIds) {
      const 항목 = (await pool.query<{ id: string; tc_id: string }>('SELECT history_id AS id, tc_id FROM run_item WHERE run_id = $1', [runId])).rows;
      for (const i of 항목) await pool.query('UPDATE run_item SET status = $2, finished_at = now() WHERE history_id = $1', [i.id, 결과(i.tc_id)]);
      await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = now() WHERE run_id = $1", [runId]);
    }
  }
  const 보낸줄 = async (kind: string) =>
    (await pool.query<{ issue_key: string; payload: { body?: string; toStatusKey?: string; comment?: string } }>(
      'SELECT issue_key, payload FROM bts_outbox WHERE project_id = $1 AND kind = $2 ORDER BY id',
      [프로젝트, kind],
    )).rows;
  const 초안들 = async () =>
    (await pool.query<{ service_id: string; keys: string[] }>(
      `SELECT service_id, params->'issueKeys' AS keys FROM authoring_request WHERE kind = 'PRD_DRAFT' AND service_id = ANY($1) ORDER BY id`,
      [Object.values(서비스)],
    )).rows;
  const 맡음 = async () =>
    (await pool.query<{ issue_key: string; issue_type: string; late: boolean; released: boolean }>(
      'SELECT issue_key, issue_type, late, released_at IS NOT NULL AS released FROM bts_claim WHERE project_id = $1 ORDER BY id',
      [프로젝트],
    )).rows;

  async function 치운다(): Promise<void> {
    const ids = `(SELECT id FROM service WHERE prefix = ANY($1))`;
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${ids})`, [접두사들]);
    await pool.query(`DELETE FROM test_run WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM app_build WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query(`DELETE FROM authoring_request WHERE project_id IN (SELECT id FROM project WHERE name = 'XBN 프로젝트')`);
    await pool.query(`DELETE FROM authoring_request WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM service_env WHERE service_id IN ${ids}`, [접두사들]);
    // bts_link · bts_deploy · bts_claim · bts_outbox · bts_issue_case · service_token · 노트 사건은 service · project 와 같이 지워진다
    await pool.query('DELETE FROM service WHERE prefix = ANY($1)', [접두사들]);
    await pool.query("DELETE FROM project WHERE name = 'XBN 프로젝트'");
    await pool.query("DELETE FROM app_user WHERE username = 'xbn-admin'");
  }

  beforeAll(async () => {
    pool = (await import('../db/index.js')).pool;
    Object.assign(process.env, {
      SESSION_SECRET: 'xbn-검사용-세션-열쇠-32바이트를-넉넉히-넘긴다',
      // 앱 케이스를 빌드 실행에서 빼지 않게 — 분배가 가짜라 닿지는 않는다
      DEVICE_FARM_URL: 'http://farm.xbn.test',
    });
    app = Fastify();
    세션등록(app, process.env.SESSION_SECRET!);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(btsDeployRoutes, { prefix: '/api', 부르기 });
    await app.register(buildRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();

    await pool.query(
      "INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ('xbn-admin', '배포 관리자', NULL, 'admin', true, false)",
    );
    프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XBN 프로젝트') RETURNING id")).rows[0]!.id);
    for (const [prefix, kind] of [['XBN', 'SCREEN'], ['XBNA', 'APP']] as const) {
      서비스[prefix] = Number((await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ($1, $1, '#445566', '', $1, $2, $3) RETURNING id`,
        [prefix, 프로젝트, kind],
      )).rows[0]!.id);
      await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://qa.xbn.test'), ($1, 'live', 'http://live.xbn.test')`, [서비스[prefix]]);
      await pool.query(`UPDATE service_env SET is_prod = true WHERE service_id = $1 AND env = 'live'`, [서비스[prefix]]);
    }
    for (const [tcId, platforms, smoke] of [['XBN-FN-001', '["desktop"]', true], ['XBN-FN-002', '["desktop"]', false], ['XBNA-FN-001', '["android"]', true]] as const) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, smoke)
         VALUES ($1, $1, $2, '[]', 'xbn/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}', $3)`,
        [tcId, platforms, smoke],
      );
    }
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by,
                             deploy_key_hash, deploy_key_tail, deploy_key_by, deploy_key_at)
       VALUES ($1, 'https://bts.xbn.test', 'XBN', 'pat_xbn', 'whsec', $2, '{}', 'xbn-admin', $3, '-key', 'xbn-admin', now())`,
      [프로젝트, { DEPLOY_WAIT: 'wait', QA_REQUEST: 'qa-req', QA_REVIEW: 'review', DEV_REQUEST: 'dev', CODE_REVIEW: 'cr', CLOSED: 'closed' }, 토큰해시(열쇠)],
    );
    await pool.query("INSERT INTO service_token (service_id, name, token_hash, created_by) VALUES ($1, 'XBNA CI', $2, 'xbn-admin')", [서비스.XBNA, 토큰해시(CI열쇠)]);
  });

  afterAll(async () => {
    await 치운다();
    await app.close();
    // 같은 프로세스에서 도는 다음 DB 검사 파일이 팜 없음(FARM_OFF)을 보게 되돌린다
    for (const k of ['SESSION_SECRET', 'DEVICE_FARM_URL'] as const) {
      if (옛환경[k] === undefined) delete process.env[k];
      else process.env[k] = 옛환경[k];
    }
  });

  it('배포 열쇠만 받는다 — 없거나 틀리면 401, 다른 프로젝트 · 사람 통로는 403', async () => {
    expect((await 신호({ build: 'a1' }, {})).statusCode).toBe(401);
    expect((await 신호({ build: 'a1' }, { authorization: 'Bearer pdk_틀림' })).statusCode).toBe(401);
    const 남의 = await 신호({ build: 'a1' }, { authorization: `Bearer ${열쇠}` }, 프로젝트 + 100000);
    expect([남의.statusCode, 남의.json<{ error: string }>().error]).toEqual([403, 'AGENT_TOKEN_SCOPE']);
    const 사람통로 = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${열쇠}` } });
    expect([사람통로.statusCode, 사람통로.json<{ error: string }>().error]).toEqual([403, 'AGENT_TOKEN_SCOPE']);
  });

  it('거절 코드 — BAD_BUILD · UNKNOWN_SERVICE · ENV_REQUIRED · UNKNOWN_ENV · PROD_ENV_BLOCKED · 앱 빌드가 없으면 NO_BUILD', async () => {
    const 오류 = async (몸: object) => {
      const r = await 신호(몸);
      return [r.statusCode, r.json<{ error: string }>().error];
    };
    expect(await 오류({ build: '' })).toEqual([400, 'BAD_BUILD']);
    expect(await 오류({ build: 'x'.repeat(101) })).toEqual([400, 'BAD_BUILD']);
    expect(await 오류({ build: 'a1', services: ['XBD'] })).toEqual([400, 'UNKNOWN_SERVICE']);
    expect(await 오류({ build: 'a1', env: 'nope' })).toEqual([404, 'UNKNOWN_ENV']);
    expect(await 오류({ build: 'a1', env: 'live' })).toEqual([400, 'PROD_ENV_BLOCKED']);
    expect(await 오류({ build: 'a1' })).toEqual([400, 'NO_BUILD']);
    await pool.query("INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'stage', 'http://stage.xbn.test')", [서비스.XBN]);
    expect(await 오류({ build: 'a1', services: ['XBN'] })).toEqual([400, 'ENV_REQUIRED']);
    await pool.query("DELETE FROM service_env WHERE service_id = $1 AND env = 'stage'", [서비스.XBN]);
    expect((await pool.query('SELECT 1 FROM bts_deploy WHERE project_id = $1', [프로젝트])).rowCount).toBe(0);
  });

  it('BTS 이은 프로젝트의 앱 APK 올리기는 빌드만 남기고 실행을 안 건다', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/builds',
      headers: { authorization: `Bearer ${CI열쇠}` },
      payload: { env: 'qa', buildNo: '41', apkUrl: 'https://files.xbn.test/app-41.apk' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json<{ runIds: number[] }>().runIds).toEqual([]);
    expect((await pool.query('SELECT 1 FROM test_run WHERE service_id = $1', [서비스.XBNA])).rowCount).toBe(0);
  });

  let 첫배포 = 0;
  it('애플리케이션마다 스모크를 걸고 · 같은 빌드가 다시 오면 앞 배포 번호를 준다 · 다 통과면 「QA 요청」 이슈를 맡는다', async () => {
    const r = await 신호({ build: 'a1b2c3d-202610311530' });
    expect(r.statusCode).toBe(202);
    첫배포 = r.json<{ deployId: number }>().deployId;
    const runIds = await 실행기다림(첫배포, 2);
    const 실행들 = (await pool.query<{ prefix: string; build_stage: string; build_no: string; triggered_by_name: string }>(
      'SELECT s.prefix, t.build_stage, t.build_no, t.triggered_by_name FROM test_run t JOIN service s ON s.id = t.service_id WHERE t.run_id = ANY($1) ORDER BY s.prefix',
      [runIds],
    )).rows;
    // 웹은 배포 빌드 번호로 빌드 줄을 세우고, 앱은 CI 가 올린 최신 APK(41)로 돈다
    expect(실행들).toEqual([
      { prefix: 'XBN', build_stage: 'SMOKE', build_no: 'a1b2c3d-202610311530', triggered_by_name: 'BTS · 배포 관리자' },
      { prefix: 'XBNA', build_stage: 'SMOKE', build_no: '41', triggered_by_name: 'BTS · 배포 관리자' },
    ]);
    const 다시 = await 신호({ build: 'a1b2c3d-202610311530' });
    expect([다시.statusCode, 다시.json<{ deployId: number }>().deployId]).toEqual([200, 첫배포]);
    expect((await pool.query("SELECT 1 FROM project_note_event WHERE project_id = $1 AND kind = 'DEPLOY'", [프로젝트])).rowCount).toBe(1);

    // 맡기 전 — 맡는 중인 옛 줄 XBN-9 는 「QA 요청」을 떠났다(알림을 놓쳤다). XBN-2 는 딸린 테스트가 있는 버그, XBN-3 은 사람이 올린 버그
    await pool.query("INSERT INTO bts_claim (project_id, issue_key, deploy_id, issue_type) VALUES ($1, 'XBN-9', $2, 'TASK')", [프로젝트, 첫배포]);
    await pool.query("INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env) VALUES ($1, 'XBN-2', $2, 'XBN-FN-002', 'qa')", [프로젝트, 서비스.XBN]);
    QA요청 = [{ key: 'XBN-1', typeKey: 'task' }, { key: 'XBN-2', typeKey: 'bug' }, { key: 'XBN-3', typeKey: 'bug' }];

    await 끝낸다(runIds.slice(0, 1), () => 'PASS');
    await 배포판정(첫배포, 부르기);
    expect((await 배포(첫배포)).state).toBe('SMOKE');
    await 끝낸다(runIds, () => 'PASS');
    await 배포판정(첫배포, 부르기);
    await 배포판정(첫배포, 부르기);
    expect((await 배포(첫배포)).state).toBe('CLAIMED');
    expect(await 맡음()).toEqual([
      { issue_key: 'XBN-9', issue_type: 'TASK', late: false, released: true },
      { issue_key: 'XBN-1', issue_type: 'TASK', late: false, released: false },
      { issue_key: 'XBN-2', issue_type: 'BUG', late: false, released: false },
      { issue_key: 'XBN-3', issue_type: 'BUG', late: false, released: false },
    ]);
    const 검색 = 부른것.find((b) => b.경로 === '/api/v1/search/aql');
    expect(검색?.몸).toEqual({ projectKey: 'XBN', query: 'status = "qa-req"', page: 0, size: 100 });
    expect((await 보낸줄('COMMENT')).map((c) => [c.issue_key, c.payload.body?.split('\n')[0]])).toEqual([['XBN-3', '딸린 테스트 없음 — 사람이 확인해 주세요']]);
    // 새로 맡은 task 는 애플리케이션마다 PRD 초안 하나 — 버그는 초안이 없다 (새 기능 바퀴 5)
    expect(await 초안들()).toEqual([
      { service_id: String(서비스.XBN), keys: ['XBN-1'] },
      { service_id: String(서비스.XBNA), keys: ['XBN-1'] },
    ]);
  });

  it('늦게 「QA 요청」에 온 이슈는 다음 점검이 늦은 이슈로 맡는다', async () => {
    QA요청 = [...QA요청, { key: 'XBN-4', typeKey: 'story' }];
    expect(await 늦은이슈점검(부르기)).toBe(1);
    expect((await 맡음()).at(-1)).toEqual({ issue_key: 'XBN-4', issue_type: 'TASK', late: true, released: false });
    expect(await 늦은이슈점검(부르기)).toBe(0);
    // 늦은 이슈는 따로 작은 초안이 된다
    expect((await 초안들()).slice(2).map((x) => x.keys)).toEqual([['XBN-4'], ['XBN-4']]);
  });

  it('맡은 버그의 딸린 케이스가 다 통과하면 「재검증 통과」로 닫는다 — 한 번만 · 보낼 때 판 번호를 읽는다', async () => {
    const 다른곳 = await createRun({
      origin: 'SCHEDULED',
      triggeredBy: 'xbn-admin',
      env: 'qa',
      items: [{ tcId: 'XBN-FN-002', platforms: ['desktop'], params: {}, expected: {} }],
    });
    await 끝낸다([다른곳.runId], () => 'FAIL');
    expect(await 버그재검증(다른곳.runId)).toEqual([]);
    const 실행 = await createRun({
      origin: 'SCHEDULED',
      triggeredBy: 'xbn-admin',
      env: 'qa',
      items: [{ tcId: 'XBN-FN-002', platforms: ['desktop'], params: {}, expected: {} }],
    });
    await 끝낸다([실행.runId], () => 'PASS');
    expect(await 버그재검증(실행.runId)).toEqual(['XBN-2']);
    expect(await 버그재검증(실행.runId)).toEqual([]);
    const 옮김 = await 보낸줄('TRANSITION');
    expect(옮김.map((t) => [t.issue_key, t.payload.toStatusKey, t.payload.comment?.split('\n')[0]])).toEqual([
      ['XBN-2', 'closed', '재검증 통과 — 빌드 a1b2c3d-202610311530'],
    ]);
    expect((await pool.query("SELECT resolution FROM bts_issue_case WHERE issue_key = 'XBN-2' AND closed_at IS NOT NULL")).rows).toEqual([{ resolution: 'FIXED' }]);
    expect((await 맡음()).find((c) => c.issue_key === 'XBN-2')?.released).toBe(true);

    부른것.length = 0;
    await 보낼줄점검(부르기, async () => 201);
    const 보낸옮김 = 부른것.find((b) => b.경로 === '/api/v1/issues/XBN-2/transition');
    expect(보낸옮김?.몸).toMatchObject({ toStatusKey: 'closed', expectedVersion: 3 });
  });

  it('이슈가 「QA 요청」을 떠났다는 알림이 오면 맡음을 놓는다', async () => {
    const 이슈상태 = async (_자리: BTS자리, _m: string, 경로: string) =>
      ({ status: 200, json: { data: { key: 경로.split('/').pop(), currentStateKey: 'wait', typeKey: 'task', summary: '' } } });
    await BTS알림처리(
      { projectId: 프로젝트, baseUrl: 'https://bts.xbn.test', botKey: 'pat_xbn', btsProject: 'XBN' },
      { event: 'issue.transitioned', deliveryId: 'xbn-d1', data: { issueKey: 'XBN-1' } },
      이슈상태,
    );
    expect((await 맡음()).find((c) => c.issue_key === 'XBN-1')?.released).toBe(true);
  });

  it('스모크가 하나라도 깨지면 맡지 않고 「QA 요청」 이슈마다 보류 댓글을 단다', async () => {
    const r = await 신호({ build: 'e5f6a7b-202610311600' });
    expect(r.statusCode).toBe(202);
    const id = r.json<{ deployId: number }>().deployId;
    const runIds = await 실행기다림(id, 2);
    const 맡기전 = (await 맡음()).length;
    QA요청 = [{ key: 'XBN-1', typeKey: 'task' }, { key: 'XBN-5', typeKey: 'task' }];
    await 끝낸다(runIds, (tcId) => (tcId === 'XBNA-FN-001' ? 'FAIL' : 'PASS'));
    await 배포판정(id, 부르기);
    expect((await 배포(id)).state).toBe('HELD');
    expect((await 맡음()).length).toBe(맡기전);
    const 보류 = (await 보낸줄('COMMENT')).filter((c) => c.payload.body?.startsWith('스모크 실패'));
    expect(보류.map((c) => c.issue_key)).toEqual(['XBN-1', 'XBN-5']);
    expect(보류[0]!.payload.body).toContain('XBNA');
    // 보류된 배포는 늦은 이슈를 찾지 않는다 — 가장 새 배포가 보류다
    expect(await 늦은이슈점검(부르기)).toBe(0);
  });
});
