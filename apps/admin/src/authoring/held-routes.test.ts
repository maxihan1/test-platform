// 보류 케이스 통로 검사 — 끝내기 모양 · 입력 옮기기 · 값 넣기 · 되돌리기 (SPEC 도메인/작성 §3.6 「★ 보류 케이스」 · §7)

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
      ['이름이 글이 아님', { held: [{ ...쿠폰, name: 3 }] }],
      ['이름이 300자 넘음', { held: [{ ...쿠폰, name: '가'.repeat(301) }] }],
      ['heldUnknown 이 true 가 아님', { heldUnknown: 'yes' }],
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
      const 이름붙은 = { ...쿠폰, name: '쿠폰 두 장을 겹쳐 쓰면 최종 금액이 기준대로 나온다' };
      const r = await 부르기('POST', `/api/authoring/requests/${id}/finish`, { status: 'DONE', result: { held: [이름붙은, 날짜] } });
      expect(r.statusCode).toBe(200);
      const 다른 = await 넣기({ status: 'RUNNING' });
      const 모름 = await 부르기('POST', `/api/authoring/requests/${다른}/finish`, { status: 'DONE', result: { heldUnknown: true } });
      expect(모름.statusCode).toBe(200);
    });

    it('옮길 입력보다 새 행에 이미 들어온 입력이 이긴다', async () => {
      const 앞 = await 넣기({
        status: 'DONE',
        held: [쿠폰],
        input: { 'XWLR-001': { params: { wait: 3 }, expected: { total: 100 }, by: 사람, at: '2026-09-29T00:00:00.000Z' } },
      });
      const 새입력 = { 'XWLR-001': { params: { wait: 9 }, expected: { total: 7 }, by: 'xwlr2', at: '2026-09-29T01:00:00.000Z' } };
      const 새 = await 넣기({ status: 'RUNNING', kind: 'RERUN', source: 앞, input: 새입력 });
      부르는이 = 맥;
      const r = await 부르기('POST', `/api/authoring/requests/${새}/finish`, { status: 'DONE', result: { held: [쿠폰] } });
      expect(r.statusCode).toBe(200);
      expect(await 입력(새)).toEqual(새입력);
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
});
