// 호환성 실행 한 바퀴를 실제 DB · 가짜 팜 · 가짜 러너로 본다 — 차례 잡기 · 모델별 1대 바꿔 잡기 · 점검 결과 → 화면 줄 · 결과 · 판정 · 중단 · 다시 켜기 정리

import http from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listRuns } from '../execution/queries.js';
import { 호환성알림 } from '../notifications/compat.js';
import { 환경쓰기 } from '../perf/deviceFixture.js';
import { 설정, 호환성다시켜기, 호환성중단 } from './runEngine.js';
import compatRunRoutes from './runRoutes.js';
import compatRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

const 팜기기 = [
  { serial: 'XCRA1', state: 'OCCUPIED', model: 'SM-A', osVersion: '14', manufacturer: 'samsung', resolution: '1080x2400' },
  { serial: 'XCRA2', state: 'IDLE', model: 'SM-A', osVersion: '14', manufacturer: 'samsung', resolution: '1080x2400', formFactor: 'foldable', fold: 'unfolded' },
  { serial: 'XCRB1', state: 'IDLE', model: 'SM-B', osVersion: '13', manufacturer: 'samsung', resolution: '720x1600' },
];

const 쉼 = (ms: number) => new Promise((r) => setTimeout(r, ms));
const 받기 = (req: http.IncomingMessage) => new Promise<string>((r) => { let b = ''; req.on('data', (c: Buffer) => (b += c.toString())); req.on('end', () => r(b)); });

describe.skipIf(연결 === undefined)('호환성 실행 · 결과 · 판정', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 팜: http.Server;
  let 러너: http.Server;
  let 폴더 = '';
  let 앱 = 0;
  let 세트 = 0;
  const 놓음: string[] = [];
  const 보낸것: Record<string, unknown>[] = [];
  let 러너멈춤 = false;
  let Chrome켬 = 0;
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
    폴더 = await mkdtemp(join(tmpdir(), 'xcr-'));
    await mkdir(join(폴더, 'tests', 'xcr', 'pages'), { recursive: true });
    await writeFile(join(폴더, 'tests', 'xcr', 'pages', 'home.page.ts'), "static readonly 주소 = 'app:.Main/home'; this.driver.$('id=cart_button')");

    팜 = http.createServer((req, res) => {
      const json = (code: number, v: object) => res.writeHead(code, { 'content-type': 'application/json' }).end(JSON.stringify({ value: v }));
      const m = /^\/api\/devices\/([\w-]+)\/hold/.exec(req.url ?? '');
      if (/^\/api\/devices\/[\w-]+\/chrome$/.test(req.url ?? '')) {
        Chrome켬 += 1;
        return json(200, { cdpUrl: 'ws://127.0.0.1:9/cdp', sessionId: 'chrome-xcr' });
      }
      if (req.url === '/api/sessions/chrome-xcr/artifacts/ui-check.json') {
        // 산출물 파일은 { value } 로 감싸지 않고 내용 그대로 온다 (비전 안내서 10절)
        return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
          version: 1, status: 'done',
          screens: [{ before: 'cdp click', at: new Date().toISOString(), w: 1, h: 1, status: 'done', file: 'ui-009.png', url: 'https://qa.example.com/web/cart', issues: [{ kind: 'offscreen', box: [0, 0, 1, 1], note: '밖' }] }],
        }));
      }
      if (req.url === '/api/sessions/chrome-xcr/artifacts/ui-009.png') return res.writeHead(200, { 'content-type': 'image/png' }).end('png');
      if (req.url?.startsWith('/api/devices') && m === null) return json(200, { devices: 팜기기, now: 0 });
      if (m !== null && req.method === 'DELETE') { 놓음.push(m[1]!); return json(200, {}); }
      if (m !== null && req.url?.endsWith('/extend')) return json(200, {});
      if (m !== null) return m[1] === 'XCRA1' ? json(409, { refused: '사용 중' }) : json(200, { held: {} });
      return res.writeHead(404).end();
    });
    러너 = http.createServer((req, res) => {
      void (async () => {
        if (req.url === '/health') return res.writeHead(200).end('{}');
        if (req.url === '/abort') return res.writeHead(200, { 'content-type': 'application/json' }).end('{"aborted":true}');
        const body = JSON.parse(await 받기(req)) as { runId: number; historyId: number };
        보낸것.push(body);
        if (러너멈춤) await 쉼(400);
        const 곳 = join(폴더, 'runs', String(body.runId), String(body.historyId), 'farm');
        await mkdir(곳, { recursive: true });
        await writeFile(join(곳, 'ui-001.png'), 'png');
        await writeFile(join(곳, 'ui-check.json'), JSON.stringify({
          version: 1, status: 'done',
          screens: [
            { before: 'element/click', at: new Date().toISOString(), w: 1, h: 1, status: 'done', file: 'ui-001.png', locator: { using: 'id', value: 'com.x:id/cart_button' }, issues: [{ kind: 'overlap', box: [0, 0, 1, 1], note: '겹침' }] },
            { before: 'actions', at: new Date().toISOString(), w: 1, h: 1, status: 'done', issues: [] },
          ],
        }));
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
          historyId: body.historyId, status: 'PASS', durationMs: 100, steps: [{ seq: 1, title: '연다', status: 'PASS', durationMs: 100, assertions: [] }],
          device: { model: 'SM-X', osVersion: '14', appVersion: null },
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

    const p = await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XCR 프로젝트') RETURNING id`);
    앱 = Number((await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ('XCR', 'XCR', '#445566', '', 'xcr', $1, 'APP') RETURNING id`,
      [Number(p.rows[0]?.id)],
    )).rows[0]?.id);
    await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.example.com')`, [앱]);
    await pool.query(`INSERT INTO test_case (tc_id, name, platforms, file_path, param_schema, expected_schema) VALUES
      ('XCR-001', '홈 열기', '["android"]', 'tests/xcr/a.spec.ts', '{}', '{}'), ('XCR-002', '웹 장바구니', '["mobile"]', 'tests/xcr/b.spec.ts', '{}', '{}')`);
    await pool.query(`INSERT INTO case_screen (tc_id, file, screen_url, name, open_urls) VALUES
      ('XCR-001', 'tests/xcr/pages/home.page.ts', 'app:.Main/home', '홈화면', '{}'), ('XCR-002', 'tests/xcr/pages/web.page.ts', '/web/cart', '웹 장바구니', '{}')`);
    세트 = Number((await pool.query<{ id: string }>(
      `INSERT INTO compat_set (service_id, name, devices, one_per_model, created_by) VALUES ($1, 'XCR 세트', $2, true, 'xcr') RETURNING id`,
      [앱, JSON.stringify([{ serial: 'XCRA1', model: 'SM-A', name: 'A' }, { serial: 'XCRB1', model: 'SM-B', name: 'B' }])],
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
    await pool.query(`DELETE FROM case_screen WHERE tc_id IN ('XCR-001', 'XCR-002')`);
    await pool.query(`DELETE FROM test_case WHERE tc_id IN ('XCR-001', 'XCR-002')`);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [앱]);
    await pool.query('DELETE FROM service WHERE id = $1', [앱]);
    await rm(폴더, { recursive: true, force: true });
  }, 60_000);

  it('사용 중인 디바이스는 같은 모델로 바꿔 잡고 · 앱은 러너가 · 모바일 웹은 admin 이 Chrome 점검을 켜고 · 점검 결과가 화면 × 디바이스 칸이 된다', async () => {
    const 시작 = await app.inject({ method: 'POST', url: `/api/compat-sets/${세트}/runs`, payload: { env: 'qa' } });
    expect(시작.statusCode).toBe(201);
    const { runId } = 시작.json<{ runId: number }>();
    expect(await 끝나길(runId)).toBe('FINISHED');

    const 케이스 = await pool.query<{ id: string; seq: number; tc_id: string }>('SELECT id, seq, tc_id FROM compat_run_case WHERE run_id = $1 ORDER BY seq, id', [runId]);
    const 폰 = (seq: number) => (seq === 1 ? 'XCRA2' : 'XCRB1');
    expect(보낸것.map((b) => [b.udid, b.uiCheck ?? null, b.cdpUrl ?? null, b.historyId])).toEqual(
      케이스.rows.map((c) => [폰(c.seq), c.tc_id === 'XCR-001' ? true : null, c.tc_id === 'XCR-002' ? 'ws://127.0.0.1:9/cdp' : null, Number(c.id)]),
    );
    expect([놓음, Chrome켬]).toEqual([['XCRA2', 'XCRB1'], 2]);

    const 결과 = (await app.inject({ method: 'GET', url: `/api/compat-runs/${runId}` })).json<{
      run: { state: string }; devices: { serial: string; fold: string | null; state: string; os: string | null }[]; rows: { key: string; cells: { seq: number; value: string }[] }[];
      counts: Record<string, number>; cards: { screenId: number; step: number }[]; hiddenOk: number;
    }>();
    expect(결과.run.state).toBe('FINISHED');
    expect(결과.devices.map((d) => [d.serial, d.fold, d.state, d.os])).toEqual([['XCRA2', 'OPEN', 'DONE', '14'], ['XCRB1', null, 'DONE', '14']]);
    // 의심 없는 「화면 모름」 줄은 표에도 숨긴 수에도 안 든다(§3.13 「결과 · 판정」). 웹 주소는 같은 틀로 바꾼다
    expect([결과.rows.map((r) => r.key), 결과.hiddenOk]).toEqual([['/web/cart', 'app:.Main/home'], 0]);
    expect(결과.rows[1]?.cells).toEqual([{ seq: 1, value: 'PENDING' }, { seq: 2, value: 'PENDING' }]);
    expect(결과.counts).toMatchObject({ devices: 2, states: 2, pending: 4, confirmed: 0 });
    expect(결과.cards[0]?.step).toBe(1);

    // 앱 그림은 러너가, Chrome 그림은 admin 이 실행 폴더에 받아 둔다
    for (const 카드 of 결과.cards) {
      const 그림 = await app.inject({ method: 'GET', url: `/api/compat-runs/${runId}/screens/${카드.screenId}/image` });
      expect([그림.statusCode, 그림.headers['content-type']]).toEqual([200, 'image/png']);
    }

    expect((await app.inject({ method: 'PUT', url: `/api/compat-runs/${runId}/verdicts`, payload: { key: 'app:.Main/home', seq: 1, verdict: 'CONFIRMED' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PUT', url: `/api/compat-runs/${runId}/verdicts`, payload: { key: '/없음', seq: 1, verdict: 'CONFIRMED' } })).json()).toEqual({ error: 'NOT_SUSPECT' });
    const 판정뒤 = (await app.inject({ method: 'GET', url: `/api/compat-runs/${runId}` })).json<{ counts: Record<string, number> }>();
    expect(판정뒤.counts).toMatchObject({ confirmed: 1, pending: 3 });

    const 목록 = await listRuns('XCR', 1, 20, { kind: 'compat' });
    expect(목록.items[0]).toMatchObject({ runId, kind: 'COMPAT', compat: { setName: 'XCR 세트', confirmed: 1, pending: 3, affected: { states: 2, total: 2 } } });
    const 세트목록 = (await app.inject({ method: 'GET', url: `/api/compat-sets?serviceId=${앱}` })).json<{ sets: { lastRun: { runId: number; confirmed: number } | null }[] }>();
    expect(세트목록.sets[0]?.lastRun).toMatchObject({ runId, confirmed: 1, pending: 3 });
    const 알림 = await 호환성알림([{ id: 앱, prefix: 'XCR', name: 'XCR' }], (id) => ({ serviceId: id, prefix: 'XCR', serviceName: 'XCR' }), 7, 50);
    expect(알림.recent.find((n) => n.runId === runId)).toMatchObject({ kind: 'run', testKind: 'COMPAT', status: 'FINISHED', compat: { pending: 3, unchecked: 0 } });
  });

  it('팜 등록에서 빠진 디바이스의 상태는 기다리지 않고 건너뛴다', async () => {
    const 빠진세트 = Number((await pool.query<{ id: string }>(
      `INSERT INTO compat_set (service_id, name, devices, one_per_model, created_by) VALUES ($1, 'XCR 빠진 세트', $2, true, 'xcr') RETURNING id`,
      [앱, JSON.stringify([{ serial: 'XCRB1', model: 'SM-B', name: 'B' }, { serial: 'XCRGONE', model: 'SM-Z', name: 'Z' }])],
    )).rows[0]?.id);
    const { runId } = (await app.inject({ method: 'POST', url: `/api/compat-sets/${빠진세트}/runs`, payload: { env: 'qa' } })).json<{ runId: number }>();
    expect(await 끝나길(runId)).toBe('FINISHED');
    const 상태 = await pool.query<{ state: string; skip_reason: string | null }>('SELECT state, skip_reason FROM compat_run_device WHERE run_id = $1 ORDER BY seq', [runId]);
    expect(상태.rows).toEqual([{ state: 'DONE', skip_reason: null }, { state: 'SKIPPED', skip_reason: '디바이스가 Device VISION 등록에서 빠졌습니다' }]);
  });

  it('중단하면 도는 케이스를 끊고 남은 상태는 STOPPED · 실행은 바로 ABORTED 다', async () => {
    러너멈춤 = true;
    보낸것.length = 0;
    const { runId } = (await app.inject({ method: 'POST', url: `/api/compat-sets/${세트}/runs`, payload: { env: 'qa' } })).json<{ runId: number }>();
    for (let i = 0; i < 100 && 보낸것.length === 0; i++) await 쉼(20);
    expect(await 호환성중단(runId)).toEqual({ aborted: 1 });
    expect(await 호환성중단(runId)).toBeNull();
    const 머리 = await pool.query<{ status: string }>('SELECT status FROM test_run WHERE run_id = $1', [runId]);
    expect(머리.rows[0]?.status).toBe('ABORTED');
    for (let i = 0; i < 100; i++) {
      const 점검 = await pool.query(`SELECT 1 FROM compat_run_case WHERE run_id = $1 AND check_state = 'checking'`, [runId]);
      const 잡음 = await pool.query('SELECT 1 FROM compat_run_device WHERE run_id = $1 AND held_serial IS NOT NULL', [runId]);
      if ((점검.rowCount ?? 0) === 0 && (잡음.rowCount ?? 0) === 0) break;
      await 쉼(30);
    }
    const 상태 = await pool.query<{ seq: number; state: string; skip_reason: string | null }>('SELECT seq, state, skip_reason FROM compat_run_device WHERE run_id = $1 ORDER BY seq', [runId]);
    expect(상태.rows.map((r) => r.state)).toEqual(['STOPPED', 'STOPPED']);
    expect(상태.rows[1]?.skip_reason).toBe('실행을 중단했습니다');
    러너멈춤 = false;
  });

  it('admin 이 다시 켜지면 도는 호환성 실행은 멈추고 점검 중인 케이스는 미점검이며 잡은 디바이스를 놓는다', async () => {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_id, service_name, tests_repo, triggered_by, env, base_url, status, kind, compat_set_id)
       VALUES ('XCR 세트', $1, 'XCR', '', 'xcr', 'qa', 'https://qa.example.com', 'RUNNING', 'COMPAT', $2) RETURNING run_id`,
      [앱, 세트],
    );
    const runId = Number(r.rows[0]?.run_id);
    await pool.query(`INSERT INTO compat_run_device (run_id, seq, serial, model, name, state, held_serial) VALUES ($1, 1, 'XCRB1', 'SM-B', 'B', 'RUNNING', 'XCRB1')`, [runId]);
    await pool.query(
      `INSERT INTO compat_run_case (run_id, seq, tc_id, tc_name, picked, file_path, timeout_ms, check_state, started_at, finished_at) VALUES
         ($1, 1, 'XCR-001', '홈 열기', 'AUTO', 'x', 1000, 'checking', now(), now()), ($1, 1, 'XCR-002', '웹 장바구니', 'AUTO', 'x', 1000, NULL, now(), NULL)`,
      [runId],
    );
    놓음.length = 0;
    expect(await 호환성다시켜기()).toBe(1);
    expect(놓음).toEqual(['XCRB1']);
    const 머리 = await pool.query<{ status: string }>('SELECT status FROM test_run WHERE run_id = $1', [runId]);
    const 케이스 = await pool.query<{ check_state: string | null; status: string; finished: boolean }>(
      'SELECT check_state, status, finished_at IS NOT NULL AS finished FROM compat_run_case WHERE run_id = $1 ORDER BY tc_id',
      [runId],
    );
    const 상태 = await pool.query<{ state: string; skip_reason: string; held_serial: string | null }>('SELECT state, skip_reason, held_serial FROM compat_run_device WHERE run_id = $1', [runId]);
    expect(머리.rows[0]?.status).toBe('ABORTED');
    // 돌던 케이스는 결과를 받을 쪽이 없어 미실행으로 닫는다 — 안 닫으면 결과 칸이 영영 「도는 중」이다
    expect(케이스.rows).toEqual([{ check_state: 'missing', status: 'NA', finished: true }, { check_state: null, status: 'NA', finished: true }]);
    expect(상태.rows[0]).toEqual({ state: 'STOPPED', skip_reason: '서버가 다시 켜져 실행이 멈췄습니다', held_serial: null });
  });
});
