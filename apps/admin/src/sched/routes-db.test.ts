// 정기 실행 세트 통로를 실제 DB 로 본다 — 저장 규칙 · 400 사유 · 빠진 줄 · 기준 세트 · 달력 · 후보 · 프로젝트 권한
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import schedRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('정기 실행 세트 통로', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 프로젝트 = 0;
  let 남의프로젝트 = 0;
  const 앱 = new Map<string, number>();
  let 섞인시나리오 = 0;
  let 남의시나리오 = 0;
  let 호환성세트 = 0;
  const 계정들 = ['xks-reader', 'xks-writer', 'xks-none', 'xks-other'];
  const 케이스들 = ['XKS-FN-001', 'XKS-FN-002', 'XKS-FN-003', 'XKS-UI-001', 'XKSA-FN-001', 'XKSO-FN-001'];
  const 쿠키 = new Map<string, string>();

  const 부르기 = (누구: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie: 쿠키.get(누구) ?? '' }, ...(payload === undefined ? {} : { payload }) });
  const 내일 = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const 기본 = () => ({
    projectId: 프로젝트,
    name: '출시 전 점검',
    at: '02:00',
    tz: 'Asia/Seoul',
    days: [1, 3, 5],
    items: [
      { kind: 'FN', service: 'XKS', tcIds: null },
      { kind: 'UI', service: 'XKS', tcIds: ['XKS-UI-001'] },
      { kind: 'E2E', scenarioId: 섞인시나리오 },
      { kind: 'COMPAT', compatSetId: 호환성세트 },
      { kind: 'FN', service: 'XKSA', tcIds: ['XKSA-FN-001'] },
    ],
    envs: [{ service: 'XKS', env: 'qa' }, { service: 'XKSA', env: 'qa' }],
  });
  const 만들기 = async (몸: object) => {
    const res = await 부르기('xks-writer', 'POST', '/api/sched/sets', 몸);
    expect(res.statusCode, res.body).toBe(201);
    return (res.json() as { id: number }).id;
  };
  const 세트읽기 = async (id: number) => (await 부르기('xks-reader', 'GET', `/api/sched/sets/${id}`)).json() as Record<string, unknown>;
  const 거절 = async (몸: object, method: 'POST' | 'PUT' = 'POST', url = '/api/sched/sets') => {
    const res = await 부르기('xks-writer', method, url, 몸);
    expect(res.statusCode, res.body).toBe(400);
    return (res.json() as { detail: string }).detail;
  };

  const 치우기 = async () => {
    const 번호 = [...앱.values()];
    await pool.query('DELETE FROM sched_set WHERE project_id = ANY($1::bigint[])', [[프로젝트, 남의프로젝트]]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1::bigint[]))', [번호]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1::bigint[])', [번호]);
    await pool.query('DELETE FROM compat_set WHERE service_id = ANY($1::bigint[])', [번호]);
    await pool.query('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1::bigint[]))', [번호]);
    await pool.query('DELETE FROM scenario WHERE service_id = ANY($1::bigint[])', [번호]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await pool.query('DELETE FROM service_env WHERE service_id = ANY($1::bigint[])', [번호]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1::text[])', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1::text[])', [계정들]);
  };

  beforeAll(async () => {
    ({ pool } = await import('../db/index.js'));
    app = Fastify();
    세션등록(app, 'xks-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(schedRoutes, { prefix: '/api' });
    await app.ready();

    프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XKS 프로젝트') RETURNING id")).rows[0]!.id);
    남의프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XKS 다른 프로젝트') RETURNING id")).rows[0]!.id);
    for (const [prefix, kind, 어디] of [['XKS', 'SCREEN', 프로젝트], ['XKSA', 'API', 프로젝트], ['XKSM', 'SCREEN', 프로젝트], ['XKSO', 'SCREEN', 남의프로젝트]] as const) {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ($1, $1 || ' 앱', '#445566', '', $1, $2, $3) RETURNING id`,
        [prefix, 어디, kind],
      );
      앱.set(prefix, Number(r.rows[0]!.id));
    }
    await pool.query(
      `INSERT INTO service_env (service_id, env, base_url, is_prod) VALUES
         ($1, 'qa', 'https://qa.xks', false), ($1, 'live', 'https://xks', true), ($1, 'stage', 'https://stage.xks', false),
         ($2, 'qa', 'https://qa.xksa', false), ($3, 'qa', 'https://qa.xksm', false), ($4, 'qa', 'https://qa.xkso', false)`,
      [앱.get('XKS'), 앱.get('XKSA'), 앱.get('XKSM'), 앱.get('XKSO')],
    );
    for (const tc of 케이스들) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active) VALUES ($1, $1, 'tests/xks/a.spec.ts', '{}', '{}', $2)`,
        [tc, tc !== 'XKS-FN-003'],
      );
    }
    const 시나리오 = async (serviceId: number, 이름: string, parts: object[]) => {
      const id = Number((await pool.query<{ id: string }>('INSERT INTO scenario (service_id, name, created_by) VALUES ($1, $2, $3) RETURNING id', [serviceId, 이름, 'xks'])).rows[0]!.id);
      await pool.query(`INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, $2, 'xks', '검사')`, [id, JSON.stringify(parts)]);
      return id;
    };
    섞인시나리오 = await 시나리오(앱.get('XKS')!, '주문 흐름', [{ kind: 'api', method: 'GET', path: '/health', expectStatus: 200, service: 'XKSM' }]);
    남의시나리오 = await 시나리오(앱.get('XKSO')!, '남의 흐름', [{ kind: 'wait', ms: 10 }]);
    호환성세트 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO compat_set (service_id, name, devices, created_by) VALUES ($1, '주요 폰', '[]', 'xks') RETURNING id`, [앱.get('XKS')])).rows[0]!.id,
    );

    for (const [username, runs, 어디] of [['xks-reader', 'read', 프로젝트], ['xks-writer', 'write', 프로젝트], ['xks-none', 'none', 프로젝트], ['xks-other', 'write', 남의프로젝트]] as const) {
      await pool.query(
        `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', true, false)`,
        [username, await 해시('열려라참깨')],
      );
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'read', $3, 'none')`, [username, 어디, runs]);
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
      쿠키.set(username, (res.headers['set-cookie'] as string).split(';')[0] ?? '');
    }
  });

  afterAll(async () => {
    await 치우기();
    // 남은 애플리케이션이 없는 프로젝트는 트리거가 같이 지운다
    await pool.query('DELETE FROM service WHERE id = ANY($1::bigint[])', [[...앱.values()]]);
    await app.close();
  });

  it('여러 애플리케이션 · 종류를 섞어 저장하고 세트줄로 읽는다', async () => {
    const id = await 만들기(기본());
    const s = await 세트읽기(id);
    expect(s).toMatchObject({
      name: '출시 전 점검', at: '02:00', tz: 'Asia/Seoul', days: [1, 3, 5], onceOn: null, isOn: true, isBase: false,
      items: [
        { kind: 'FN', service: 'XKS', tcIds: null, label: '기능 전체' },
        { kind: 'UI', service: 'XKS', tcIds: ['XKS-UI-001'], label: 'XKS-UI-001' },
        { kind: 'E2E', service: 'XKS', scenarioId: 섞인시나리오, label: '주문 흐름' },
        { kind: 'COMPAT', service: 'XKS', compatSetId: 호환성세트, label: '주요 폰' },
        { kind: 'FN', service: 'XKSA', tcIds: ['XKSA-FN-001'], label: 'XKSA-FN-001' },
      ],
      skipped: [], missing: { cases: 0, tests: 0 }, avgMinutes: null, last: null, baseable: false,
    });
    expect((s.envs as { service: string }[]).map((e) => e.service).sort()).toEqual(['XKS', 'XKSA']);
    const 목록 = (await 부르기('xks-reader', 'GET', `/api/sched/sets?projectId=${프로젝트}`)).json() as { items: { id: number }[] };
    expect(목록.items.map((x) => x.id)).toContain(id);
  });

  it('400 — API 의 UI 줄 · 다른 프로젝트 · 실서비스 · 빠진 서버 · 지난 한 번만 · 이름 겹침 · 섞인 E2E 서버 · 모르는 케이스', async () => {
    const 몸 = 기본();
    expect(await 거절({ ...몸, name: 'a', items: [{ kind: 'UI', service: 'XKSA', tcIds: null }] })).toContain('API 애플리케이션');
    expect(await 거절({ ...몸, name: 'b', items: [{ kind: 'FN', service: 'XKSO', tcIds: null }] })).toContain('다른 프로젝트');
    expect(await 거절({ ...몸, name: 'c', items: [{ kind: 'E2E', scenarioId: 남의시나리오 }] })).toContain('다른 프로젝트');
    expect(await 거절({ ...몸, name: 'd', envs: [{ service: 'XKS', env: 'live' }, { service: 'XKSA', env: 'qa' }] })).toContain('실서비스');
    expect(await 거절({ ...몸, name: 'e', envs: [{ service: 'XKS', env: 'qa' }] })).toContain('XKSA 의 대상 서버가 빠졌습니다');
    expect(await 거절({ ...몸, name: 'f', days: null, onceOn: '2020-01-01' })).toBe('PAST_ONCE');
    expect(await 거절({ ...몸, name: 'g', days: [], onceOn: undefined })).toBeTruthy();
    // stage 는 시작 애플리케이션에만 있어 지나가는 XKSM 에 같은 이름 줄이 없다
    expect(await 거절({ ...몸, name: 'h', envs: [{ service: 'XKS', env: 'stage' }, { service: 'XKSA', env: 'qa' }] })).toContain('지나가는 애플리케이션');
    expect(await 거절({ ...몸, name: 'i', items: [{ kind: 'FN', service: 'XKS', tcIds: ['XKS-FN-003', 'XKS-UI-001'] }] })).toContain('XKS-FN-003, XKS-UI-001');
    expect(await 거절({ ...몸, tz: 'Mars/Base' })).toBe('tz: Mars/Base');
    await 만들기({ ...몸, name: '이름 겹침' });
    expect(await 거절({ ...몸, name: '이름 겹침' })).toBe('NAME_TAKEN');
    // 내일의 한 번만은 받는다
    await 만들기({ ...몸, name: '한 번만', days: null, onceOn: 내일() });
  });

  it('고칠 때 이미 있던 빠진 줄은 받고, 새로 넣는 고를 수 없는 케이스는 거절한다', async () => {
    const id = await 만들기({ ...기본(), name: '고르기', items: [{ kind: 'FN', service: 'XKS', tcIds: ['XKS-FN-001', 'XKS-FN-002'] }], envs: [{ service: 'XKS', env: 'qa' }] });
    await pool.query("UPDATE test_case SET is_active = false WHERE tc_id = 'XKS-FN-002'");
    try {
      expect(await 세트읽기(id)).toMatchObject({ skipped: [], missing: { cases: 1, tests: 0 } });
      const 고침 = { name: '고르기 2', at: '03:00', days: [0], items: [{ kind: 'FN', service: 'XKS', tcIds: ['XKS-FN-001', 'XKS-FN-002'] }], envs: [{ service: 'XKS', env: 'qa' }] };
      expect((await 부르기('xks-writer', 'PUT', `/api/sched/sets/${id}`, 고침)).statusCode).toBe(200);
      expect(await 세트읽기(id)).toMatchObject({ name: '고르기 2', at: '03:00', days: [0], tz: 'Asia/Seoul' });
      expect(await 거절({ ...고침, items: [{ kind: 'FN', service: 'XKS', tcIds: ['XKS-FN-001', 'XKS-FN-003'] }] }, 'PUT', `/api/sched/sets/${id}`)).toContain('XKS-FN-003');
      // 줄의 케이스가 다 빠지면 그 줄이 통째로 빠진다
      await pool.query("UPDATE test_case SET is_active = false WHERE tc_id = 'XKS-FN-001'");
      expect(await 세트읽기(id)).toMatchObject({ skipped: [{ seq: 1, reason: 'CASES_GONE' }], missing: { cases: 2, tests: 0 } });
      // 대상 서버가 실서비스가 되면 줄이 통째로 빠져 테스트로 센다. 고치기는 막지 않는다
      await pool.query("UPDATE test_case SET is_active = true WHERE tc_id = 'XKS-FN-001'");
      await pool.query("UPDATE service_env SET is_prod = true WHERE service_id = $1 AND env = 'qa'", [앱.get('XKS')]);
      expect(await 세트읽기(id)).toMatchObject({ skipped: [{ seq: 1, reason: 'ENV_PROD' }], missing: { cases: 0, tests: 1 } });
      expect((await 부르기('xks-writer', 'PUT', `/api/sched/sets/${id}`, 고침)).statusCode).toBe(200);
    } finally {
      await pool.query("UPDATE test_case SET is_active = true WHERE tc_id IN ('XKS-FN-001', 'XKS-FN-002')");
      await pool.query("UPDATE service_env SET is_prod = false WHERE service_id = $1 AND env = 'qa'", [앱.get('XKS')]);
    }
  });

  it('끄면 기다리던 회차가 빠지고, 기준은 꼴이 맞는 세트 하나만 된다', async () => {
    const 회귀 = { ...기본(), name: 'XKS 전체 회귀', items: [{ kind: 'FN', service: 'XKS', tcIds: null }, { kind: 'UI', service: 'XKS', tcIds: null }], envs: [{ service: 'XKS', env: 'qa' }] };
    const id = await 만들기(회귀);
    const 둘째 = await 만들기({ ...회귀, name: 'XKS 전체 회귀 둘째' });
    const 섞인 = await 만들기({ ...기본(), name: '섞인 세트' });
    const 회차 = Number((await pool.query<{ id: string }>("INSERT INTO sched_occurrence (set_id, planned_on, planned_at) VALUES ($1, '2026-11-01', now()) RETURNING id", [id])).rows[0]!.id);

    expect((await 부르기('xks-writer', 'PATCH', `/api/sched/sets/${id}`, { isOn: false })).statusCode).toBe(200);
    expect((await pool.query('SELECT state FROM sched_occurrence WHERE id = $1', [회차])).rows[0]).toEqual({ state: 'SKIPPED' });
    expect(await 세트읽기(id)).toMatchObject({ isOn: false, baseable: true });

    expect((await 부르기('xks-writer', 'PATCH', `/api/sched/sets/${id}`, { isBase: true })).statusCode).toBe(200);
    expect(await 세트읽기(둘째)).toMatchObject({ baseable: false });
    expect((await 부르기('xks-writer', 'PATCH', `/api/sched/sets/${둘째}`, { isBase: true })).json()).toEqual({ error: 'INVALID_REQUEST', detail: 'BASE_SET_SHAPE' });
    expect((await 부르기('xks-writer', 'PATCH', `/api/sched/sets/${섞인}`, { isBase: true })).json()).toEqual({ error: 'INVALID_REQUEST', detail: 'BASE_SET_SHAPE' });
    // 기준 세트를 꼴 밖으로 고치면 거절한다
    const { projectId: _p, tz: _t, ...고침 } = { ...회귀, items: [...회귀.items, { kind: 'COMPAT', compatSetId: 호환성세트 }] };
    expect(await 거절(고침, 'PUT', `/api/sched/sets/${id}`)).toBe('BASE_SET_SHAPE');
    expect(await 거절({ ...고침, items: 회귀.items, days: null, onceOn: 내일() }, 'PUT', `/api/sched/sets/${id}`)).toBe('BASE_SET_SHAPE');
  });

  it('달력은 회차가 만든 실행을 종류 없이 모으고, 세트 카드에 마지막 결과 · 평균 시간이 선다', async () => {
    const id = await 만들기({ ...기본(), name: '달력' });
    const 회차 = Number(
      (await pool.query<{ id: string }>(
        `INSERT INTO sched_occurrence (set_id, planned_on, planned_at, state, started_at, finished_at, notes)
         VALUES ($1, '2026-11-10', '2026-11-09T17:00:00Z', 'DONE', '2026-11-09T17:10:00Z', '2026-11-09T17:40:00Z', '[{"kind":"E2E","service":"XKS","reason":"SCENARIO_ARCHIVED"}]') RETURNING id`,
        [id],
      )).rows[0]!.id,
    );
    const 실행 = async (kind: string, 상태들: string[]) => {
      const runId = Number(
        (await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, started_at, origin, sched_occurrence_id)
           VALUES ($1, 'XKS', '', '스케줄러', 'qa', 'https://qa.xks', 'FINISHED', $2, $3, now(), 'SCHEDULED', $4) RETURNING run_id`,
          [`정기 · 달력 · ${kind}`, 앱.get('XKS'), kind, 회차],
        )).rows[0]!.run_id,
      );
      for (const [i, status] of 상태들.entries()) {
        await pool.query(`INSERT INTO run_item (run_id, tc_id, tc_name, file_path, timeout_ms, params, expected, param_schema, expected_schema, status)
           VALUES ($1, $2, $2, 'xks.spec.ts', 5000, '{}', '{}', '{}', '{}', $3)`, [runId, `XKS-${kind}-00${i + 1}`, status]);
      }
      return runId;
    };
    const 기능 = await 실행('FN', ['PASS', 'FAIL', 'NA']);
    const ui = await 실행('UI', ['PASS']);

    const res = await 부르기('xks-reader', 'GET', `/api/sched/calendar?projectId=${프로젝트}&from=2026-11-01&to=2026-11-30`);
    expect(res.statusCode, res.body).toBe(200);
    const 칸 = (res.json() as { occurrences: { id: number }[] }).occurrences.find((o) => o.id === 회차);
    expect(칸).toMatchObject({
      setId: id, plannedOn: '2026-11-10', state: 'DONE', verdict: 'FAIL', suspects: 0,
      runs: [
        { runId: 기능, kind: 'FN', service: 'XKS', passed: 1, failed: 1, other: 1 },
        { runId: ui, kind: 'UI', passed: 1, failed: 0, other: 0 },
      ],
      notes: [{ kind: 'E2E', service: 'XKS', reason: 'SCENARIO_ARCHIVED' }],
    });
    expect(await 세트읽기(id)).toMatchObject({ avgMinutes: 30, last: { occurrenceId: 회차, verdict: 'FAIL', runIds: [기능, ui] } });

    expect((await 부르기('xks-reader', 'GET', `/api/sched/calendar?projectId=${프로젝트}&from=2026-11-01&to=2027-01-15`)).statusCode).toBe(400);
  });

  it('후보는 프로젝트 애플리케이션의 활성 케이스 수 · 시나리오 · 호환성 세트다', async () => {
    const res = await 부르기('xks-reader', 'GET', `/api/sched/candidates?projectId=${프로젝트}`);
    expect(res.statusCode).toBe(200);
    const b = res.json() as { services: object[]; scenarios: object[]; compatSets: object[] };
    expect(b.services).toEqual([
      { prefix: 'XKS', name: 'XKS 앱', kind: 'SCREEN', fn: 2, ui: 1 },
      { prefix: 'XKSA', name: 'XKSA 앱', kind: 'API', fn: 1, ui: 0 },
      { prefix: 'XKSM', name: 'XKSM 앱', kind: 'SCREEN', fn: 0, ui: 0 },
    ]);
    expect(b.scenarios).toEqual([{ id: 섞인시나리오, name: '주문 흐름', service: 'XKS', path: ['XKS', 'XKSM'], runnable: true }]);
    expect(b.compatSets).toEqual([{ id: 호환성세트, name: '주요 폰', service: 'XKS' }]);
  });

  it('보기는 그 프로젝트의 실행 read, 쓰기는 write — 다른 프로젝트 사람은 못 본다', async () => {
    const id = await 만들기({ ...기본(), name: '권한' });
    expect((await 부르기('xks-reader', 'POST', '/api/sched/sets', { ...기본(), name: '읽기만' })).statusCode).toBe(403);
    expect((await 부르기('xks-reader', 'PATCH', `/api/sched/sets/${id}`, { isOn: false })).statusCode).toBe(403);
    expect((await 부르기('xks-none', 'GET', `/api/sched/sets?projectId=${프로젝트}`)).statusCode).toBe(403);
    expect((await 부르기('xks-other', 'GET', `/api/sched/sets/${id}`)).statusCode).toBe(403);
    expect((await 부르기('xks-other', 'GET', `/api/sched/calendar?projectId=${프로젝트}&from=2026-11-01&to=2026-11-02`)).statusCode).toBe(403);
    expect((await 부르기('xks-other', 'POST', '/api/sched/sets', { ...기본(), name: '남의 것' })).statusCode).toBe(403);
    expect((await 부르기('xks-reader', 'GET', '/api/sched/sets/999999999')).statusCode).toBe(404);
  });
});
