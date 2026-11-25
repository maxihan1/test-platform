// 호환성 실행이 테스트 프로시저를 실제 DB · 가짜 팜 · 가짜 러너로 도는지 본다 — 자동 선택 · 요청 하나 · 케이스 N줄 · 점검 나누기 · Blocked 미점검 까닭 · 러너 능력

import http from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 환경쓰기 } from '../perf/deviceFixture.js';
import { 설정 } from './runEngine.js';
import { 호환성실행시작 } from './runStart.js';
import { 세트하나 } from './store.js';
import compatRunRoutes from './runRoutes.js';
import compatRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 쉼 = (ms: number) => new Promise((r) => setTimeout(r, ms));
const 받기 = (req: http.IncomingMessage) => new Promise<string>((r) => { let b = ''; req.on('data', (c: Buffer) => (b += c.toString())); req.on('end', () => r(b)); });
const 번호들 = ['XCV-FN-101', 'XCV-FN-102', 'XCV-FN-103', 'XCV-FN-201'];

describe.skipIf(연결 === undefined)('호환성 실행 — 테스트 프로시저', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 팜: http.Server;
  let 러너: http.Server;
  let 폴더 = '';
  let 앱 = 0;
  let 세트 = 0;
  let 프로시저됨 = true;
  let 점검못함 = false;
  let 한도걸림 = false;
  const 보낸것: Record<string, unknown>[] = [];
  const 옛설정 = { ...설정 };
  const 옛환경 = { DEVICE_FARM_URL: process.env.DEVICE_FARM_URL, RUNNER_URL: process.env.RUNNER_URL, PLATFORM_ARTIFACTS_DIR: process.env.PLATFORM_ARTIFACTS_DIR, PLATFORM_TESTS_DIR: process.env.PLATFORM_TESTS_DIR, DEVICE_FARM_RUN_AS: process.env.DEVICE_FARM_RUN_AS };

  const 주소 = (s: http.Server) => `http://127.0.0.1:${(s.address() as { port: number }).port}`;
  const 끝나길 = async (runId: number) => {
    for (let i = 0; i < 200; i++) {
      const r = await pool.query<{ status: string }>('SELECT status FROM test_run WHERE run_id = $1', [runId]);
      if (r.rows[0]?.status !== 'RUNNING') return r.rows[0]?.status;
      await 쉼(50);
    }
    return 'RUNNING';
  };

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    폴더 = await mkdtemp(join(tmpdir(), 'xcv-'));
    await mkdir(join(폴더, 'tests', 'xcv', 'pages'), { recursive: true });
    await writeFile(join(폴더, 'tests', 'xcv', 'pages', 'home.page.ts'), "this.driver.$('id=cart_button')");
    await writeFile(join(폴더, 'tests', 'xcv', 'pages', 'write.page.ts'), "this.driver.$('id=post_button')");

    팜 = http.createServer((req, res) => {
      const json = (code: number, v: object) => res.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify({ value: v }));
      const m = /^\/api\/devices\/([\w-]+)\/hold/.exec(req.url ?? '');
      if (req.url?.startsWith('/api/devices') && m === null) return json(200, { devices: [{ serial: 'XCVA1', state: 'IDLE', model: 'SM-V', osVersion: '14' }], now: 0 });
      if (m !== null) return json(200, { held: {} });
      return res.writeHead(404).end();
    });
    러너 = http.createServer((req, res) => {
      void (async () => {
        if (req.url === '/health') return res.writeHead(200).end(JSON.stringify(프로시저됨 ? { procedure: true } : {}));
        const body = JSON.parse(await 받기(req)) as { runId: number; historyId: number };
        보낸것.push(body);
        // 101 은 1단계에서 틀리고 102 는 그 실패에 막혀 못 돈다. 103 은 101 에 안 기대 그대로 통과다. 찍힌 화면은 1단계(101) · 3단계(103) 사이
        const t0 = Date.now() - 3_000;
        const 때 = (ms: number) => new Date(t0 + ms).toISOString();
        const 곳 = join(폴더, 'runs', String(body.runId), String(body.historyId), 'farm');
        await mkdir(곳, { recursive: true });
        await writeFile(join(곳, 'ui-check.json'), JSON.stringify(점검못함 ? { status: 'none' } : {
          version: 1, status: 'done', ...(한도걸림 && { capped: { max: 400, at: 때(2_200) } }),
          screens: [
            { before: 'element/click', at: 때(100), status: 'done', locator: { using: 'id', value: 'com.x:id/cart_button' }, issues: [] },
            { before: 'element/click', at: 때(2_100), status: 'done', locator: { using: 'id', value: 'com.x:id/post_button' }, issues: [{ kind: 'overlap', box: [0, 0, 1, 1], note: '겹침' }] },
          ],
        }));
        const 단계 = (seq: number, tcId: string, status: string, ms: number) => ({ seq, title: `${tcId} 단계`, status, durationMs: 900, startedAt: 때(ms), tcId, assertions: [] });
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
          historyId: body.historyId, durationMs: 3_000, device: { model: 'SM-V', osVersion: '14', appVersion: null },
          results: [
            { tcId: 'XCV-FN-101', status: 'FAIL', durationMs: 900, steps: [단계(1, 'XCV-FN-101', 'FAIL', 0)], error: { message: '값이 다르다' } },
            { tcId: 'XCV-FN-102', status: 'NA', durationMs: 0, steps: [], error: { message: 'BLOCKED' }, blockedBy: 'XCV-FN-101' },
            { tcId: 'XCV-FN-103', status: 'PASS', durationMs: 900, steps: [단계(2, 'XCV-FN-103', 'PASS', 2_000)] },
          ],
        }));
      })();
    });
    await new Promise<void>((r) => 팜.listen(0, '127.0.0.1', r));
    await new Promise<void>((r) => 러너.listen(0, '127.0.0.1', r));
    환경쓰기({ DEVICE_FARM_URL: 주소(팜), RUNNER_URL: 주소(러너), PLATFORM_ARTIFACTS_DIR: 폴더, PLATFORM_TESTS_DIR: join(폴더, 'tests'), DEVICE_FARM_RUN_AS: undefined });
    Object.assign(설정, { 다시잡기ms: 30, 잡기상한ms: 60_000, 점검간격ms: 30, 점검상한ms: 60_000 });

    app = Fastify();
    await app.register(compatRoutes, { prefix: '/api' });
    await app.register(compatRunRoutes, { prefix: '/api' });
    await app.ready();

    const p = await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XCV 프로젝트') RETURNING id`);
    앱 = Number((await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind, procedure_mode) VALUES ('XCV', 'XCV', '#445566', '', 'xcv', $1, 'APP', true) RETURNING id`,
      [Number(p.rows[0]?.id)],
    )).rows[0]?.id);
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.example.com')`, [앱]);
    await pool.query(`INSERT INTO test_case (tc_id, name, platforms, file_path, param_schema, expected_schema, proc_id, proc_seq, proc_name) VALUES
      ('XCV-FN-101', '홈 장바구니', '["android"]', 'tests/xcv/XCV-TP-001.spec.ts', '{}', '{}', 'XCV-TP-001', 1, '글쓰기 흐름'),
      ('XCV-FN-102', '글쓰기', '["android"]', 'tests/xcv/XCV-TP-001.spec.ts', '{}', '{}', 'XCV-TP-001', 2, '글쓰기 흐름'),
      ('XCV-FN-103', '글 올리기', '["android"]', 'tests/xcv/XCV-TP-001.spec.ts', '{}', '{}', 'XCV-TP-001', 3, '글쓰기 흐름'),
      ('XCV-FN-201', '홈만', '["android"]', 'tests/xcv/XCV-FN-201.spec.ts', '{}', '{}', NULL, NULL, NULL)`);
    await pool.query(`INSERT INTO case_screen (tc_id, file, screen_url, name, open_urls) VALUES
      ('XCV-FN-101', 'tests/xcv/pages/home.page.ts', 'app:.Main/home', '홈', '{}'),
      ('XCV-FN-102', 'tests/xcv/pages/draft.page.ts', 'app:.Main/draft', '임시 글', '{}'),
      ('XCV-FN-103', 'tests/xcv/pages/write.page.ts', 'app:.Main/write', '글쓰기', '{}'),
      ('XCV-FN-201', 'tests/xcv/pages/home.page.ts', 'app:.Main/home', '홈', '{}')`);
    세트 = Number((await pool.query<{ id: string }>(
      `INSERT INTO compat_set (service_id, name, devices, one_per_model, created_by) VALUES ($1, 'XCV 세트', $2, false, 'xcv') RETURNING id`,
      [앱, JSON.stringify([{ serial: 'XCVA1', model: 'SM-V', name: 'V' }])],
    )).rows[0]?.id);
  }, 60_000);

  afterAll(async () => {
    Object.assign(설정, 옛설정);
    환경쓰기(옛환경);
    await app?.close();
    for (const s of [팜, 러너]) {
      s?.closeAllConnections();
      await new Promise<void>((r) => (s === undefined ? r() : s.close(() => r())));
    }
    const runs = (await pool.query<{ run_id: string }>('SELECT run_id FROM test_run WHERE service_id = $1', [앱])).rows.map((r) => r.run_id);
    await pool.query('DELETE FROM compat_verdict WHERE run_id = ANY($1::bigint[])', [runs]);
    await pool.query('DELETE FROM compat_screen WHERE run_id = ANY($1::bigint[])', [runs]);
    await pool.query('DELETE FROM compat_run_case WHERE run_id = ANY($1::bigint[])', [runs]);
    await pool.query('DELETE FROM compat_run_device WHERE run_id = ANY($1::bigint[])', [runs]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM compat_set WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM case_screen WHERE tc_id = ANY($1::text[])', [번호들]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [번호들]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
    await rm(폴더, { recursive: true, force: true });
  }, 60_000);

  it('자동 선택은 프로시저를 통째로 고르고 프로시저가 덮는 화면을 옛 꼴 케이스가 또 고르지 않는다', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/compat-sets/preview', payload: { serviceId: 앱, addedCases: [] } });
    expect(r.json<{ auto: unknown[] }>().auto).toEqual([
      { tcId: 'XCV-FN-101', name: '홈 장바구니', adds: 3, procId: 'XCV-TP-001', procName: '글쓰기 흐름', tcIds: ['XCV-FN-101', 'XCV-FN-102', 'XCV-FN-103'] },
    ]);
  });

  it('러너가 프로시저를 못 돌리면 사람이 누른 실행은 409 이고 정기 실행은 프로시저를 빼서 남은 케이스가 없으면 NO_CASE 다', async () => {
    프로시저됨 = false;
    try {
      const r = await app.inject({ method: 'POST', url: `/api/compat-sets/${세트}/runs`, payload: { env: 'qa' } });
      expect([r.statusCode, r.json<{ error: string }>().error]).toEqual([409, 'RUNNER_NO_PROCEDURE']);
      const set = (await 세트하나(세트))!;
      await expect(호환성실행시작(set, 'qa', { username: 'xcv', displayName: 'xcv' }, { occurrenceId: 0, setName: 'XCV' })).rejects.toMatchObject({ code: 'NO_CASE' });
    } finally {
      프로시저됨 = true;
    }
  });

  it('프로시저 하나를 요청 하나로 보내고 케이스 줄마다 판정 · 막은 케이스를 적고 찍힌 화면은 그 절차의 케이스에 붙는다', async () => {
    const 시작 = await app.inject({ method: 'POST', url: `/api/compat-sets/${세트}/runs`, payload: { env: 'qa' } });
    expect(시작.statusCode).toBe(201);
    const { runId } = 시작.json<{ runId: number }>();
    expect(await 끝나길(runId)).toBe('FINISHED');

    const 줄 = await pool.query<{ id: string; tc_id: string; exec_id: string; status: string; blocked_by: string | null; check_state: string }>(
      'SELECT id, tc_id, exec_id, status, blocked_by, check_state FROM compat_run_case WHERE run_id = $1 ORDER BY id',
      [runId],
    );
    const execId = 줄.rows[0]?.exec_id;
    expect(줄.rows.map((x) => [x.tc_id, x.exec_id === execId, x.status, x.blocked_by, x.check_state])).toEqual([
      ['XCV-FN-101', true, 'FAIL', null, 'done'],
      ['XCV-FN-102', true, 'NA', 'XCV-FN-101', 'done'],
      ['XCV-FN-103', true, 'PASS', null, 'done'],
    ]);
    expect(보낸것).toHaveLength(1);
    expect(보낸것[0]).toMatchObject({
      historyId: Number(execId), procId: 'XCV-TP-001', filePath: 'tests/xcv/XCV-TP-001.spec.ts', udid: 'XCVA1', uiCheck: true, timeoutMs: 900_000,
      cases: [{ tcId: 'XCV-FN-101' }, { tcId: 'XCV-FN-102' }, { tcId: 'XCV-FN-103' }],
    });

    const 화면 = await pool.query<{ case_run_id: string; screen_key: string }>('SELECT case_run_id, screen_key FROM compat_screen WHERE run_id = $1 ORDER BY id', [runId]);
    const 줄번호 = (t: string) => 줄.rows.find((x) => x.tc_id === t)?.id;
    expect(화면.rows.map((x) => [x.case_run_id, x.screen_key])).toEqual([[줄번호('XCV-FN-101'), 'app:.Main/home'], [줄번호('XCV-FN-103'), 'app:.Main/write']]);

    const 결과 = (await app.inject({ method: 'GET', url: `/api/compat-runs/${runId}` })).json<{ rows: { key: string; cells: { value: string; reason?: string }[] }[]; cards: { tcId: string }[] }>();
    expect(결과.rows.find((r) => r.key === 'app:.Main/draft')?.cells).toEqual([{ seq: 1, value: 'UNCHECKED', reason: 'XCV-FN-102 Blocked · 선행 케이스 XCV-FN-101 실패' }]);
    expect(결과.cards.map((c) => c.tcId)).toEqual(['XCV-FN-103']);
  });

  it('점검 파일에 상한 표시가 있으면 그때 돌던 케이스 줄에 남고 결과의 디바이스 줄에 실린다 — 없는 실행은 빈 목록이다', async () => {
    const 실행 = async () => {
      const { runId } = (await app.inject({ method: 'POST', url: `/api/compat-sets/${세트}/runs`, payload: { env: 'qa' } })).json<{ runId: number }>();
      expect(await 끝나길(runId)).toBe('FINISHED');
      const 줄 = await pool.query<{ check_cap: number | null }>('SELECT check_cap FROM compat_run_case WHERE run_id = $1 ORDER BY id', [runId]);
      const 결과 = (await app.inject({ method: 'GET', url: `/api/compat-runs/${runId}` })).json<{ devices: { capped: unknown }[] }>();
      return { 줄: 줄.rows.map((x) => x.check_cap), capped: 결과.devices.map((d) => d.capped) };
    };
    한도걸림 = true;
    try {
      expect(await 실행()).toEqual({ 줄: [null, null, 400], capped: [[{ tcId: 'XCV-FN-103', max: 400 }]] });
    } finally {
      한도걸림 = false;
    }
    expect(await 실행()).toEqual({ 줄: [null, null, null], capped: [[]] });
  });

  it('러너가 점검 없음을 남기면(비전 꺼짐 · 모르는 세션) 오류로 다루지 않고 바로 미점검으로 닫아 실행이 끝난다', async () => {
    점검못함 = true;
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const { runId } = (await app.inject({ method: 'POST', url: `/api/compat-sets/${세트}/runs`, payload: { env: 'qa' } })).json<{ runId: number }>();
      expect(await 끝나길(runId)).toBe('FINISHED');
      const 줄 = await pool.query<{ check_state: string }>('SELECT check_state FROM compat_run_case WHERE run_id = $1 ORDER BY id', [runId]);
      expect(줄.rows.map((x) => x.check_state)).toEqual(['missing', 'missing', 'missing']);
      expect(오류.mock.calls.flat().map(String).filter((x) => x.includes('점검 결과를 받다 깨져'))).toEqual([]);
    } finally {
      점검못함 = false;
      오류.mockRestore();
    }
  });
});
