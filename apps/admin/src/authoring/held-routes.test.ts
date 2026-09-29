// 보류 케이스 통로 검사 — 끝내기 모양 · 값 넣기 · 상세 · 머지 막기 · 집기 (SPEC 도메인/작성 §3.6 「★ 보류 케이스」 · §7)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 권한이되나 } from '../auth/gate.js';
import { 등급표, 토큰통로, 필요권한 } from '../auth/routeTable.js';
import { 라우트표 } from '../auth/scope.js';
import authoringAgentRoutes from './agentRoutes.js';
import type { 보류 } from './held.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWLR';
const 맥 = 'xwlr-맥';
const 사람 = 'xwlr1';
const 틀 = '/api/authoring/requests/:id/held/:tcId';

const 쿠폰: 보류 = {
  tcId: 'XWLR-001',
  file: 'tests/xwlr/coupon.spec.ts',
  kind: 'UNDECIDABLE',
  reason: '판정 불가 — 최종 금액 기준이 없다',
  fields: [
    { side: 'params', key: 'wait', description: '대기 초', type: 'number' },
    { side: 'expected', key: 'total', description: '최종 금액', type: 'number' },
  ],
};
const 다채움 = { 'XWLR-001': { params: { wait: 3 }, expected: { total: 1 }, by: 사람, at: 'x' } };
const 날짜: 보류 ={ tcId: 'XWLR-002', file: 'tests/xwlr/date.spec.ts', kind: 'ON_HOLD', reason: '보류 — 날짜', fields: [] };

describe('등급과 경계', () => {
  it('PUT·DELETE held 는 (작성, write) · 번호로 서비스를 찾는다 · 토큰 통로에 없다', () => {
    for (const 메서드 of ['PUT', 'DELETE']) {
      expect(등급표[`${메서드} ${틀}`]).toEqual({ 기능: 'authoring', 칸: 'write' });
      expect(토큰통로.has(`${메서드} ${틀}`)).toBe(false);
    }
    expect(라우트표[틀]).toEqual({ 종류: '작성요청', 칸: 'id' });
  });

  it('읽기 전용 계정은 PUT 이 막히고 쓰기 계정은 된다', () => {
    const 사람칸 = (칸: 'read' | 'write') => ({
      role: 'member' as const,
      services: [{ prefix: 접두사, permissions: { cases: 'write' as const, runs: 'write' as const, authoring: 칸 } }],
    });
    expect(권한이되나(사람칸('read'), 필요권한(틀, 'PUT'), [접두사])).toBe(false);
    expect(권한이되나(사람칸('write'), 필요권한(틀, 'PUT'), [접두사])).toBe(true);
  });
});

describe.skipIf(연결 === undefined)('보류 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 사람;

  const pool = async () => (await import('../db/index.js')).pool;
  const 넣기 = async (칸: {
    status: string;
    kind?: string;
    source?: number;
    held?: 보류[];
    input?: object;
    env?: string;
    prUrl?: string;
  }): Promise<number> => {
    const r = await (await pool()).query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, requested_by, requested_by_name, status, claimed_by, started_at, finished_at,
          result, held_input, compare, env, pr_url)
       VALUES ($1, $2, $3, $4, '요청자', $5, $6, now(),
               CASE WHEN $5 IN ('PENDING', 'RUNNING') THEN NULL ELSE now() END, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        서비스,
        칸.kind ?? 'AUTHOR',
        칸.source ?? null,
        사람,
        칸.status,
        칸.status === 'PENDING' ? null : 맥,
        칸.held === undefined ? null : JSON.stringify({ held: 칸.held }),
        칸.input === undefined ? null : JSON.stringify(칸.input),
        칸.env !== undefined,
        칸.env ?? null,
        칸.prUrl ?? (칸.status === 'DONE' ? 'https://github.com/acme/xwlr/pull/1' : null),
      ],
    );
    return Number(r.rows[0]!.id);
  };
  const 입력 = async (id: number) =>
    (await (await pool()).query<{ held_input: Record<string, Record<string, unknown>> | null }>(
      'SELECT held_input FROM authoring_request WHERE id = $1',
      [id],
    )).rows[0]!.held_input;
  const 부르기 = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, ...(payload === undefined ? {} : { payload }) });
  const 값넣기 = (id: number, tcId: string, 몸: object) => 부르기('PUT', `/api/authoring/requests/${id}/held/${tcId}`, 몸);
  const 머지 = (몸: object) => 부르기('POST', `/api/authoring/merges?service=${접두사}`, 몸);

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XWLR 보류 통로 검사용', '#3A5FCD', 'https://github.com/acme/xwlr', 'xwlr')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await p.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password)
       VALUES ($1, 'stg', 'https://stg.xwlr.test', 'tester', 'pw-xwlr'), ($1, 'prod', 'https://xwlr.test', NULL, NULL)`,
      [서비스],
    );
    process.env.AUTHORING_AGENT_USER = 맥;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: 부르는이, role: 'admin', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    부르는이 = 사람;
    await (await pool()).query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const p = await pool();
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  describe('끝내기 result.held', () => {
    it.each([
      ['held 가 배열이 아님', { held: 'x' }],
      ['tcId 모양이 아님', { held: [{ ...쿠폰, tcId: 'bad' }] }],
      ['kind 밖', { held: [{ ...쿠폰, kind: 'MAYBE' }] }],
      ['사유가 빔', { held: [{ ...쿠폰, reason: '' }] }],
      ['칸 타입 밖', { held: [{ ...쿠폰, fields: [{ side: 'params', key: 'a', description: 'a', type: 'array' }] }] }],
      ['enum 에 선택지 없음', { held: [{ ...쿠폰, fields: [{ side: 'params', key: 'a', description: 'a', type: 'enum' }] }] }],
      ['모르는 키', { held: [{ ...쿠폰, extra: 1 }] }],
      ['tcId 중복', { held: [쿠폰, 쿠폰] }],
    ])('%s 이면 400 BAD_HELD 이고 행은 도는 중으로 남는다', async (_이름, result) => {
      부르는이 = 맥;
      const id = await 넣기({ status: 'RUNNING' });
      const r = await 부르기('POST', `/api/authoring/requests/${id}/finish`, { status: 'DONE', result });
      expect(r.statusCode).toBe(400);
      expect(r.json()).toMatchObject({ error: 'BAD_HELD' });
      const 행 = (await (await pool()).query('SELECT status FROM authoring_request WHERE id = $1', [id])).rows[0];
      expect(행.status).toBe('RUNNING');
    });

    it('맞는 모양이면 받는다', async () => {
      부르는이 = 맥;
      const id = await 넣기({ status: 'RUNNING' });
      const r = await 부르기('POST', `/api/authoring/requests/${id}/finish`, { status: 'DONE', result: { held: [쿠폰, 날짜] } });
      expect(r.statusCode).toBe(200);
    });

    it('DONE 이면 앞 끝난 실행의 입력 가운데 같은 tcId · 같은 칸만 옮긴다', async () => {
      const 앞 = await 넣기({
        status: 'DONE',
        held: [쿠폰, 날짜],
        input: {
          'XWLR-001': { params: { wait: 3 }, expected: { total: 100 }, by: 사람, at: '2026-09-29T00:00:00.000Z' },
          'XWLR-002': { removed: true, by: 사람, at: '2026-09-29T00:00:00.000Z' },
        },
      });
      const 새 = await 넣기({ status: 'RUNNING', kind: 'RERUN', source: 앞 });
      부르는이 = 맥;
      const 새쿠폰 = { ...쿠폰, fields: [쿠폰.fields[0]!] };
      const r = await 부르기('POST', `/api/authoring/requests/${새}/finish`, { status: 'DONE', result: { held: [새쿠폰] } });
      expect(r.statusCode).toBe(200);
      expect(await 입력(새)).toEqual({ 'XWLR-001': { params: { wait: 3 }, by: 사람, at: '2026-09-29T00:00:00.000Z' } });
      expect(await 입력(앞)).not.toBeNull();
    });

    it('FAILED 는 옮기지 않는다', async () => {
      const 앞 = await 넣기({ status: 'DONE', held: [날짜], input: { 'XWLR-002': { removed: true, by: 사람, at: 'x' } } });
      const 새 = await 넣기({ status: 'RUNNING', kind: 'RERUN', source: 앞 });
      부르는이 = 맥;
      await 부르기('POST', `/api/authoring/requests/${새}/finish`, { status: 'FAILED', result: { held: [날짜] } });
      expect(await 입력(새)).toBeNull();
    });
  });

  describe('PUT · DELETE …/held/:tcId', () => {
    it('맞는 값이면 넣고 누가 · 언제는 서버가 붙인다 · DELETE 가 되돌린다', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰, 날짜] });
      const r = await 값넣기(id, 'XWLR-001', { params: { wait: 3 } });
      expect(r.statusCode).toBe(200);
      const 넣은것 = await 입력(id);
      expect(넣은것?.['XWLR-001']).toMatchObject({ params: { wait: 3 }, by: 사람 });
      expect(typeof 넣은것?.['XWLR-001']?.at).toBe('string');

      expect((await 값넣기(id, 'XWLR-002', { removed: true })).statusCode).toBe(200);
      expect((await 부르기('DELETE', `/api/authoring/requests/${id}/held/XWLR-001`)).statusCode).toBe(200);
      expect(Object.keys((await 입력(id)) ?? {})).toEqual(['XWLR-002']);
    });

    it.each([
      ['모르는 tcId', 'XWLR-009', { removed: true }],
      ['tcId 모양 아님', 'nope', { removed: true }],
      ['모르는 칸', 'XWLR-001', { params: { nope: 1 } }],
      ['타입 틀림', 'XWLR-001', { params: { wait: '3' } }],
      ['값과 제거를 같이', 'XWLR-001', { params: { wait: 3 }, removed: true }],
      ['by 를 부르는 쪽이 적음', 'XWLR-001', { params: { wait: 3 }, by: 'x' }],
    ])('%s 이면 400 BAD_HELD', async (_이름, tcId, 몸) => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰] });
      const r = await 값넣기(id, tcId, 몸);
      expect(r.statusCode).toBe(400);
      expect(r.json()).toMatchObject({ error: 'BAD_HELD' });
    });

    it('번호 모양이 아니면 400 BAD_ID · 없는 번호면 404', async () => {
      expect((await 값넣기(Number.NaN, 'XWLR-001', { removed: true })).json()).toMatchObject({ error: 'BAD_ID' });
      expect((await 값넣기(9_999_999_999, 'XWLR-001', { removed: true })).statusCode).toBe(404);
    });

    it('뿌리의 최신 끝난 실행이 아니면 409 NOT_LATEST', async () => {
      const 앞 = await 넣기({ status: 'DONE', held: [쿠폰] });
      const 새 = await 넣기({ status: 'DONE', kind: 'RERUN', source: 앞, held: [쿠폰] });
      expect((await 값넣기(앞, 'XWLR-001', { removed: true })).json()).toMatchObject({ error: 'NOT_LATEST' });
      expect((await 값넣기(새, 'XWLR-001', { removed: true })).statusCode).toBe(200);
      const 도는 = await 넣기({ status: 'RUNNING', kind: 'RERUN', source: 앞 });
      expect((await 값넣기(새, 'XWLR-001', { removed: true })).json()).toMatchObject({ error: 'NOT_LATEST' });
      expect((await 값넣기(도는, 'XWLR-001', { removed: true })).json()).toMatchObject({ error: 'NOT_LATEST' });
    });

    it('같은 뿌리에 머지가 대기 · 도는 중이면 PUT · DELETE 둘 다 409 MERGE_ACTIVE', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰] });
      await 넣기({ status: 'PENDING', kind: 'MERGE', source: id });
      expect((await 값넣기(id, 'XWLR-001', { removed: true })).json()).toMatchObject({ error: 'MERGE_ACTIVE' });
      expect((await 부르기('DELETE', `/api/authoring/requests/${id}/held/XWLR-001`)).json()).toMatchObject({
        error: 'MERGE_ACTIVE',
      });
    });

    it('실패한 머지 뒤에는 다시 넣을 수 있다', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰] });
      await 넣기({ status: 'FAILED', kind: 'MERGE', source: id });
      expect((await 값넣기(id, 'XWLR-001', { removed: true })).statusCode).toBe(200);
    });
  });

  describe('상세 held[] · heldOpen', () => {
    it('result.held 한 줄마다 입력을 붙이고 남은 수를 센다', async () => {
      const id = await 넣기({
        status: 'DONE',
        held: [쿠폰, 날짜],
        input: { 'XWLR-001': { params: { wait: 3 }, expected: { total: 1 }, by: 사람, at: 'x' } },
      });
      const r = (await 부르기('GET', `/api/authoring/requests/${id}`)).json();
      expect(r.heldOpen).toBe(1);
      expect(r.held).toEqual([
        { ...쿠폰, input: { params: { wait: 3 }, expected: { total: 1 }, by: 사람, at: 'x' } },
        { ...날짜, input: null },
      ]);
    });

    it('보류가 없으면 held: [] · heldOpen: 0', async () => {
      const id = await 넣기({ status: 'DONE' });
      const r = (await 부르기('GET', `/api/authoring/requests/${id}`)).json();
      expect(r).toMatchObject({ held: [], heldOpen: 0 });
    });
  });

  describe('머지 { sourceId, env? }', () => {

    it('남은 보류가 있으면 409 HELD_OPEN', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰] });
      expect((await 머지({ sourceId: id })).json()).toMatchObject({ error: 'HELD_OPEN' });
    });

    it('정방향이고 채운 보류가 있으면 테스트 계정 있는 env 가 필수', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰], input: 다채움 });
      expect((await 머지({ sourceId: id })).json()).toMatchObject({ error: 'BAD_ENV' });
      expect((await 머지({ sourceId: id, env: 'prod' })).json()).toMatchObject({ error: 'BAD_ENV' });
      expect((await 머지({ sourceId: id, env: 'nope' })).json()).toMatchObject({ error: 'BAD_ENV' });
      expect((await 머지({ sourceId: id, env: 'stg' })).statusCode).toBe(201);
    });

    it('제거만 했으면 env 없이 된다', async () => {
      const id = await 넣기({ status: 'DONE', held: [날짜], input: { 'XWLR-002': { removed: true, by: 사람, at: 'x' } } });
      expect((await 머지({ sourceId: id })).statusCode).toBe(201);
    });

    it('대조 원본은 env 를 물려받고 env 가 오면 400 BAD_ENV', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰], input: 다채움, env: 'stg' });
      expect((await 머지({ sourceId: id, env: 'stg' })).json()).toMatchObject({ error: 'BAD_ENV' });
      expect((await 머지({ sourceId: id })).statusCode).toBe(201);
    });
  });

  describe('집기(MERGE) held · target', () => {
    const 집기 = async () => {
      부르는이 = 맥;
      return (await 부르기('POST', `/api/authoring/requests/claim?service=${접두사}`)).json();
    };

    it('대조 원본의 머지면 입력(by · at 뺀)과 원본 env 줄의 target 을 싣는다', async () => {
      const id = await 넣기({
        status: 'DONE',
        held: [쿠폰, 날짜],
        env: 'stg',
        input: {
          'XWLR-001': { params: { wait: 3 }, expected: { total: 1 }, by: 사람, at: 'x' },
          'XWLR-002': { removed: true, by: 사람, at: 'x' },
        },
      });
      expect((await 머지({ sourceId: id })).statusCode).toBe(201);
      const r = await 집기();
      expect(r.kind).toBe('MERGE');
      expect(r.held).toEqual({ 'XWLR-001': { params: { wait: 3 }, expected: { total: 1 } }, 'XWLR-002': { removed: true } });
      expect(r.target).toEqual({ env: 'stg', baseUrl: 'https://stg.xwlr.test', loginId: 'tester', loginPassword: 'pw-xwlr' });
    });

    it.skip('정방향 머지면 머지 요청의 env 줄을 target 으로 싣는다 — 머지 행에 env 를 둘 자리가 없다(compare_check)', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰], input: 다채움 });
      expect((await 머지({ sourceId: id, env: 'stg' })).statusCode).toBe(201);
      const r = await 집기();
      expect(r.held).toEqual({ 'XWLR-001': { params: { wait: 3 }, expected: { total: 1 } } });
      expect(r.target).toEqual({ env: 'stg', baseUrl: 'https://stg.xwlr.test', loginId: 'tester', loginPassword: 'pw-xwlr' });
    });

    it('입력이 없으면 두 키 자체가 없다', async () => {
      const id = await 넣기({ status: 'DONE' });
      expect((await 머지({ sourceId: id })).statusCode).toBe(201);
      const r = await 집기();
      expect(r.kind).toBe('MERGE');
      expect('held' in r).toBe(false);
      expect('target' in r).toBe(false);
    });
  });
});
