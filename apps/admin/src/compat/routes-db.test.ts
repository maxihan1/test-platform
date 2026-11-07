// 호환성 세트 · 디바이스 통로를 실제 DB 와 가짜 팜으로 본다 — 자동 선택 · 화면 커버리지 · 예상 시간 · 세트 저장 규칙 · 권한

import http from 'node:http';

import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { 환경로 } from '../perf/deviceFixture.js';
import compatRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

const 팜기기 = [
  { serial: 'R3CR1', state: 'IDLE', detail: 'ready', model: 'SM-G996N', osVersion: '14', manufacturer: 'samsung', resolution: '1080x2400', marketName: 'Galaxy S21+ 5G', density: 450, inches: 6.7, formFactor: 'phone', tags: [] },
  {
    serial: 'FOLD1', state: 'OCCUPIED', model: 'SM-F946N', osVersion: '14', manufacturer: 'samsung', resolution: '1812x2176', density: '높음', formFactor: 'foldable',
    displays: [{ size: '1812x2176', inches: 7.6 }, { size: '904x2316', inches: 6.2 }], fold: 'unfolded',
  },
  { serial: 'R3CR2', state: 'IDLE', model: 'SM-G996N', osVersion: '13', manufacturer: 'samsung', resolution: '1080x2400' },
  { serial: 'bad serial!', state: 'IDLE' },
];

describe.skipIf(연결 === undefined)('호환성 세트 · 디바이스 통로', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 팜: http.Server;
  let 팜주소 = '';
  let 앱 = 0;
  let 남의앱 = 0;
  let 테스트실행 = 0;
  const 계정들 = ['xcp-reader', 'xcp-writer', 'xcp-none'];
  const 쿠키 = new Map<string, string>();
  const 케이스들 = ['XCP-001', 'XCP-002', 'XCP-003', 'XCP-004', 'XCPB-001'];

  const 부르기 = (누구: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie: 쿠키.get(누구) ?? '' }, ...(payload === undefined ? {} : { payload }) });
  const 팜으로 = (일: () => Promise<void>) => 환경로({ DEVICE_FARM_URL: 팜주소, DEVICE_FARM_RUN_AS: undefined }, 일);

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    팜 = http.createServer((req, res) => {
      if (req.url?.startsWith('/api/devices')) res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ value: { devices: 팜기기, now: 0 } }));
      else res.writeHead(404).end();
    });
    await new Promise<void>((r) => 팜.listen(0, '127.0.0.1', r));
    팜주소 = `http://127.0.0.1:${(팜.address() as { port: number }).port}`;

    app = Fastify();
    세션등록(app, 'xcp-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(compatRoutes, { prefix: '/api' });
    await app.ready();

    const p = await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XCP 프로젝트') RETURNING id`);
    const 프로젝트 = Number(p.rows[0]?.id);
    const 서비스 = async (prefix: string) =>
      Number((await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#445566', '', $1, $2) RETURNING id`,
        [prefix, 프로젝트],
      )).rows[0]?.id);
    앱 = await 서비스('XCP');
    남의앱 = await 서비스('XCPB');

    for (const [username, runs] of [['xcp-reader', 'read'], ['xcp-writer', 'write'], ['xcp-none', 'none']] as const) {
      await pool.query(
        `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', true, false)`,
        [username, await 해시('열려라참깨')],
      );
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, 'none')`, [username, 프로젝트, runs]);
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
      쿠키.set(username, (res.headers['set-cookie'] as string).split(';')[0] ?? '');
    }

    for (const [tc, platforms] of [['XCP-001', '["mobile"]'], ['XCP-002', '["mobile"]'], ['XCP-003', '["android"]'], ['XCP-004', '["desktop"]'], ['XCPB-001', '["mobile"]']]) {
      await pool.query(`INSERT INTO test_case (tc_id, name, platforms, file_path, param_schema, expected_schema) VALUES ($1, $1 || ' 이름', $2, 'tests/xcp/a.spec.ts', '{}', '{}')`, [tc, platforms]);
    }
    await pool.query(
      `INSERT INTO case_screen (tc_id, file, screen_url, name, open_urls) VALUES
         ('XCP-001', 'tests/xcp/pages/home.page.ts', '/home', '홈화면', '{/cart,/my}'),
         ('XCP-002', 'tests/xcp/pages/home.page.ts', '/home', '홈화면', '{}'),
         ('XCP-002', 'tests/xcp/pages/login.page.ts', '/login', '로그인화면', '{}'),
         ('XCP-003', 'tests/xcp/pages/cart.page.ts', '/cart', '장바구니화면', '{}'),
         ('XCP-004', 'tests/xcp/pages/orphan.page.ts', '/orphan', NULL, '{}'),
         ('XCPB-001', 'tests/xcpb/pages/a.page.ts', '/a', 'A화면', '{/b}')`,
    );
    await pool.query(
      `INSERT INTO screen_found (service_id, env, state, url, name) VALUES
         ($1, 'qa', '로그아웃', '/home', '홈'), ($1, 'qa', '로그아웃', '/cart', '장바구니'), ($1, 'dev', '로그인:판매자', '/cart', ''),
         ($1, 'qa', '로그아웃', '/my', '내 정보'), ($1, 'qa', '로그아웃', '/orphan', '외딴 화면')`,
      [앱],
    );
    await pool.query(
      `INSERT INTO screen_record (service_id, env, state, url, name, text_fp, struct_fp, record, crawled_at) VALUES ($1, 'qa', '로그아웃', '/login', '로그인', 'a', 'b', '# /login', now())`,
      [앱],
    );
    await pool.query(`INSERT INTO game_element (service_id, kind, key, name) VALUES ($1, 'WORLD', 'zone:Town', '마을'), ($1, 'DATA', 'item:sword', '검')`, [앱]);
    await pool.query(`INSERT INTO game_element_case (service_id, key, tc_id) VALUES ($1, 'zone:Town', 'XCP-003')`, [앱]);

    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, started_at)
       VALUES ('XCP 실행', 'XCP', '', 'xcp', 'qa', 'https://qa.example.com', 'DONE', $1, 'UI', now()) RETURNING run_id`,
      [앱],
    );
    테스트실행 = Number(r.rows[0]?.run_id);
    for (const [attempt, ms, status, platform] of [[1, 100_000, 'PASS', 'mobile'], [2, 140_000, 'PASS', 'mobile'], [3, 999_000, 'FAIL', 'mobile'], [1, 5_000, 'PASS', 'desktop']] as const) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, started_at, finished_at)
         VALUES ($1, 'XCP-001', $5, $2, 'XCP-001', 'xcp.spec.ts', 5000, '[]', '{}', '{}', '{}', '{}', $4, $3, now(), now())`,
        [테스트실행, attempt, ms, status, platform],
      );
    }
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    팜?.closeAllConnections();
    await new Promise<void>((r) => (팜 === undefined ? r() : 팜.close(() => r())));
    const ids = [앱, 남의앱];
    await pool.query('DELETE FROM compat_set WHERE service_id = ANY($1::bigint[])', [ids]);
    await pool.query('DELETE FROM run_item WHERE run_id = $1', [테스트실행]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1::bigint[])', [ids]);
    await pool.query('DELETE FROM case_screen WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query('DELETE FROM game_element_case WHERE service_id = ANY($1::bigint[])', [ids]);
    await pool.query('DELETE FROM game_element WHERE service_id = ANY($1::bigint[])', [ids]);
    await pool.query('DELETE FROM screen_record WHERE service_id = ANY($1::bigint[])', [ids]);
    await pool.query('DELETE FROM screen_found WHERE service_id = ANY($1::bigint[])', [ids]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1::text[])', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1::text[])', [계정들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1::bigint[])', [ids]);
  }, 60_000);

  it('디바이스 목록은 팜 칸과 상태 넷을 옮기고 모양이 틀린 칸 · 줄은 빼며 팜이 꺼지면 502 다', async () => {
    await 팜으로(async () => {
      const res = await 부르기('xcp-reader', 'GET', '/api/compat-devices');
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        devices: [
          { serial: 'R3CR1', model: 'SM-G996N', manufacturer: 'samsung', os: '14', resolution: '1080x2400', state: 'IDLE', marketName: 'Galaxy S21+ 5G', density: 450, inches: 6.7, formFactor: 'phone' },
          {
            serial: 'FOLD1', model: 'SM-F946N', manufacturer: 'samsung', os: '14', resolution: '1812x2176', state: 'OCCUPIED', formFactor: 'foldable',
            displays: [{ size: '1812x2176', inches: 7.6 }, { size: '904x2316', inches: 6.2 }], fold: 'unfolded',
          },
          { serial: 'R3CR2', model: 'SM-G996N', manufacturer: 'samsung', os: '13', resolution: '1080x2400', state: 'IDLE' },
        ],
      });
    });
    await 환경로({ DEVICE_FARM_URL: undefined }, async () => {
      expect((await 부르기('xcp-reader', 'GET', '/api/compat-devices')).json()).toEqual({ error: 'FARM_UNREACHABLE' });
    });
    expect((await 부르기('xcp-none', 'GET', '/api/compat-devices')).statusCode).toBe(403);
  });

  it('미리 셈은 화면을 가장 많이 더하는 케이스부터 고르고 장소 · 화면 기록도 전체 목록에 센다', async () => {
    const res = await 부르기('xcp-reader', 'POST', '/api/compat-sets/preview', { serviceId: 앱, addedCases: ['XCP-003'] });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      auto: [
        { tcId: 'XCP-001', name: 'XCP-001 이름', adds: 3 },
        { tcId: 'XCP-002', name: 'XCP-002 이름', adds: 1 },
        { tcId: 'XCP-003', name: 'XCP-003 이름', adds: 1 },
      ],
      coverage: { covered: 5, total: 6, fallback: false },
      uncovered: [{ key: '/orphan', name: '외딴 화면' }],
    });
    expect((await 부르기('xcp-reader', 'POST', '/api/compat-sets/preview', { serviceId: 앱, addedCases: ['XCP-004', 'XCPB-001', 'XCP-999'] })).json())
      .toEqual({ error: 'UNKNOWN_CASE', tcIds: ['XCP-004', 'XCPB-001', 'XCP-999'] });
  });

  it('크롤 화면 기록이 없으면 케이스가 아는 화면으로 세고 그렇게 알린다', async () => {
    const res = await 부르기('xcp-reader', 'POST', '/api/compat-sets/preview', { serviceId: 남의앱, addedCases: [] });
    expect(res.json()).toEqual({
      auto: [{ tcId: 'XCPB-001', name: 'XCPB-001 이름', adds: 2 }],
      coverage: { covered: 2, total: 2, fallback: true },
      uncovered: [],
    });
  });

  it('세트를 만들면 사본을 팜에서 채우고 상세는 예상 시간을 낸다 — 목록 · 고치기 · 치우기까지', async () => {
    let id = 0;
    await 팜으로(async () => {
      const 만듦 = await 부르기('xcp-writer', 'POST', '/api/compat-sets', { serviceId: 앱, name: '주요 폰', onePerModel: true, devices: [{ serial: 'R3CR1' }, { serial: 'FOLD1' }], addedCases: ['XCP-003', 'XCP-003'] });
      expect(만듦.statusCode).toBe(201);
      id = 만듦.json<{ id: number }>().id;
    });

    const 상세 = await 부르기('xcp-reader', 'GET', `/api/compat-sets/${id}`);
    expect(상세.json()).toEqual({
      id, name: '주요 폰', onePerModel: true,
      devices: [{ serial: 'R3CR1', model: 'SM-G996N', name: 'Galaxy S21+ 5G' }, { serial: 'FOLD1', model: 'SM-F946N', name: 'SM-F946N' }],
      addedCases: ['XCP-003'],
      coverage: { covered: 5, total: 6, fallback: false },
      lastRun: null,
      auto: [
        { tcId: 'XCP-001', name: 'XCP-001 이름', adds: 3 },
        { tcId: 'XCP-002', name: 'XCP-002 이름', adds: 1 },
        { tcId: 'XCP-003', name: 'XCP-003 이름', adds: 1 },
      ],
      uncovered: [{ key: '/orphan', name: '외딴 화면' }],
      estimate: { runs: 6, testMinutes: 8, checkMinutes: 1 },
    });
    expect((await 부르기('xcp-reader', 'GET', `/api/compat-sets?serviceId=${앱}`)).json<{ sets: { id: number }[] }>().sets.map((s) => s.id)).toEqual([id]);

    // 저장한 뒤 꺼진 직접 추가 케이스는 셈에서만 빠지고, 상세가 준 몸을 그대로 다시 보내도 저장된다
    await pool.query("UPDATE test_case SET is_active = false WHERE tc_id = 'XCP-003'");
    try {
      await 팜으로(async () => {
        expect((await 부르기('xcp-writer', 'PUT', `/api/compat-sets/${id}`, { serviceId: 앱, name: '주요 폰', onePerModel: true, devices: [{ serial: 'R3CR1' }, { serial: 'FOLD1' }], addedCases: ['XCP-003'] })).statusCode).toBe(200);
      });
      expect((await 부르기('xcp-reader', 'GET', `/api/compat-sets/${id}`)).json()).toMatchObject({ addedCases: ['XCP-003'], coverage: { covered: 4, total: 6 } });
    } finally {
      await pool.query("UPDATE test_case SET is_active = true WHERE tc_id = 'XCP-003'");
    }

    // 팜이 꺼져도 이미 세트에 있던 디바이스는 옛 사본으로 고친다. 새 디바이스는 확인할 길이 없어 502 다
    await 환경로({ DEVICE_FARM_URL: undefined }, async () => {
      expect((await 부르기('xcp-writer', 'PUT', `/api/compat-sets/${id}`, { serviceId: 앱, name: '이름 바꿈', onePerModel: false, devices: [{ serial: 'FOLD1' }], addedCases: [] })).statusCode).toBe(200);
      expect((await 부르기('xcp-writer', 'PUT', `/api/compat-sets/${id}`, { serviceId: 앱, name: '이름 바꿈', onePerModel: false, devices: [{ serial: 'NEW1' }], addedCases: [] })).json()).toEqual({ error: 'FARM_UNREACHABLE' });
    });
    expect((await 부르기('xcp-reader', 'GET', `/api/compat-sets/${id}`)).json()).toMatchObject({ name: '이름 바꿈', onePerModel: false, devices: [{ serial: 'FOLD1', model: 'SM-F946N', name: 'SM-F946N' }], addedCases: [] });
    expect((await 부르기('xcp-writer', 'PUT', `/api/compat-sets/${id}`, { serviceId: 남의앱, name: 'x', onePerModel: true, devices: [{ serial: 'FOLD1' }], addedCases: [] })).statusCode).toBe(400);

    expect((await 부르기('xcp-writer', 'DELETE', `/api/compat-sets/${id}`)).statusCode).toBe(204);
    expect((await 부르기('xcp-reader', 'GET', `/api/compat-sets/${id}`)).statusCode).toBe(404);
    expect((await 부르기('xcp-writer', 'PUT', `/api/compat-sets/${id}`, { serviceId: 앱, name: 'x', onePerModel: true, devices: [{ serial: 'FOLD1' }], addedCases: [] })).statusCode).toBe(404);
    expect((await 부르기('xcp-writer', 'DELETE', `/api/compat-sets/${id}`)).statusCode).toBe(404);
    expect((await 부르기('xcp-reader', 'GET', `/api/compat-sets?serviceId=${앱}`)).json()).toEqual({ sets: [] });
    expect((await pool.query('SELECT 1 FROM compat_set WHERE id = $1 AND NOT is_active', [id])).rowCount).toBe(1);
  });

  it('디바이스 0대 · 모르는 디바이스 · 고를 수 없는 케이스를 거절하고 권한을 지킨다', async () => {
    const 몸 = { serviceId: 앱, name: '거절', onePerModel: true, devices: [{ serial: 'R3CR1' }], addedCases: [] };
    await 팜으로(async () => {
      expect((await 부르기('xcp-writer', 'POST', '/api/compat-sets', { ...몸, devices: [] })).json()).toEqual({ error: 'NO_DEVICE' });
      expect((await 부르기('xcp-writer', 'POST', '/api/compat-sets', { ...몸, devices: [{ serial: 'NOPE1' }, { serial: 'R3CR1' }] })).json()).toEqual({ error: 'UNKNOWN_DEVICE', serials: ['NOPE1'] });
      expect((await 부르기('xcp-writer', 'POST', '/api/compat-sets', { ...몸, devices: [{ serial: 'R3CR1' }, { serial: 'R3CR1' }] })).statusCode).toBe(400);
      expect((await 부르기('xcp-writer', 'POST', '/api/compat-sets', { ...몸, addedCases: ['XCP-004'] })).json()).toEqual({ error: 'UNKNOWN_CASE', tcIds: ['XCP-004'] });
      expect((await 부르기('xcp-writer', 'POST', '/api/compat-sets', { ...몸, devices: [{ serial: 'R3CR1' }, { serial: 'R3CR2' }] })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '모델별 1대를 켠 세트는 같은 모델을 한 대만 고릅니다' });
      expect((await 부르기('xcp-reader', 'POST', '/api/compat-sets', 몸)).statusCode).toBe(403);
    });
    expect((await 부르기('xcp-none', 'GET', `/api/compat-sets?serviceId=${앱}`)).statusCode).toBe(403);
    expect((await 부르기('xcp-none', 'POST', '/api/compat-sets/preview', { serviceId: 앱, addedCases: [] })).statusCode).toBe(403);
    expect((await 부르기('xcp-reader', 'GET', '/api/compat-sets')).statusCode).toBe(400);
    expect((await pool.query("SELECT 1 FROM compat_set WHERE service_id = $1 AND name = '거절'", [앱])).rowCount).toBe(0);
  });
});
