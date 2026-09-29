// 보류 케이스 상세 · 머지 판정 · 집기 칸 검사 (SPEC 도메인/작성 §3.6 「★ 보류 케이스」 · §7)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import type { 보류 } from './held.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWLM';
const 맥 = 'xwlm-맥';
const 사람 = 'xwlm1';

const 쿠폰: 보류 = {
  tcId: 'XWLM-001',
  file: 'tests/xwlm/coupon.spec.ts',
  kind: 'UNDECIDABLE',
  reason: '판정 불가 — 최종 금액 기준이 없다',
  fields: [
    { side: 'params', key: 'wait', description: '대기 초', type: 'number' },
    { side: 'expected', key: 'total', description: '최종 금액', type: 'number' },
  ],
};
const 다채움 = { 'XWLM-001': { params: { wait: 3 }, expected: { total: 1 }, by: 사람, at: 'x' } };
const 날짜: 보류 = { tcId: 'XWLM-002', file: 'tests/xwlm/date.spec.ts', kind: 'ON_HOLD', reason: '보류 — 날짜', fields: [] };

describe.skipIf(연결 === undefined)('보류 상세 · 머지 · 집기', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 사람;

  const pool = async () => (await import('../db/index.js')).pool;
  const 넣기 = async (칸: { status: string; kind?: string; source?: number; held?: 보류[]; heldUnknown?: true; input?: object; env?: string }) => {
    const 결과 = 칸.held === undefined && 칸.heldUnknown === undefined ? null : { held: 칸.held, heldUnknown: 칸.heldUnknown };
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
        결과 === null ? null : JSON.stringify(결과),
        칸.input === undefined ? null : JSON.stringify(칸.input),
        칸.env !== undefined,
        칸.env ?? null,
        칸.status === 'DONE' ? 'https://github.com/acme/xwlm/pull/1' : null,
      ],
    );
    return Number(r.rows[0]!.id);
  };
  const 부르기 = (method: 'GET' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, ...(payload === undefined ? {} : { payload }) });
  const 머지 = (몸: object) => 부르기('POST', `/api/authoring/merges?service=${접두사}`, 몸);

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XWLM 보류 머지 검사용', '#3A5FCD', 'https://github.com/acme/xwlm', 'xwlm')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await p.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password)
       VALUES ($1, 'stg', 'https://stg.xwlm.test', 'tester', 'pw-xwlm'), ($1, 'prod', 'https://xwlm.test', NULL, NULL),
              ($1, 'dev', 'https://dev.xwlm.test', 'tester', NULL)`,
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

  describe('상세 held[] · heldOpen', () => {
    it('result.held 한 줄마다 입력을 붙이고 남은 수를 센다', async () => {
      const id = await 넣기({
        status: 'DONE',
        held: [쿠폰, 날짜],
        input: { 'XWLM-001': { params: { wait: 3 }, expected: { total: 1 }, by: 사람, at: 'x' } },
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

    it('보류 목록을 못 읽은 실행은 heldUnknown: true', async () => {
      const id = await 넣기({ status: 'DONE', heldUnknown: true });
      expect((await 부르기('GET', `/api/authoring/requests/${id}`)).json()).toMatchObject({ heldUnknown: true });
      const 읽은 = await 넣기({ status: 'DONE', held: [날짜] });
      expect((await 부르기('GET', `/api/authoring/requests/${읽은}`)).json()).toMatchObject({ heldUnknown: false });
    });

    it('정방향 보류면 mergeEnvs 에 테스트 계정 있는 줄 이름만 · 대조와 보류 없는 것에는 없다', async () => {
      const 정 = await 넣기({ status: 'DONE', held: [쿠폰] });
      expect((await 부르기('GET', `/api/authoring/requests/${정}`)).json().mergeEnvs).toEqual(['stg']);
      const 대조 = await 넣기({ status: 'DONE', held: [쿠폰], env: 'stg' });
      expect('mergeEnvs' in (await 부르기('GET', `/api/authoring/requests/${대조}`)).json()).toBe(false);
      const 없음 = await 넣기({ status: 'DONE' });
      expect('mergeEnvs' in (await 부르기('GET', `/api/authoring/requests/${없음}`)).json()).toBe(false);
    });
  });

  describe('머지 { sourceId, env? }', () => {
    it('보류 목록을 못 읽은 실행은 409 HELD_UNKNOWN', async () => {
      const id = await 넣기({ status: 'DONE', heldUnknown: true });
      expect((await 머지({ sourceId: id })).json()).toMatchObject({ error: 'HELD_UNKNOWN' });
    });

    it('판정은 뿌리 잠금 안에서 한다 — 잠금을 기다리는 동안 입력이 되돌려지면 HELD_OPEN', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰], input: 다채움, env: 'stg' });
      const 손 = await (await pool()).connect();
      try {
        await 손.query('BEGIN');
        await 손.query(`SELECT pg_advisory_xact_lock(hashtext('authoring-root'), ($1::bigint % 2147483647)::int)`, [id]);
        const 보냄 = 머지({ sourceId: id });
        await new Promise((r) => setTimeout(r, 300));
        await (await pool()).query('UPDATE authoring_request SET held_input = NULL WHERE id = $1', [id]);
        await 손.query('COMMIT');
        expect((await 보냄).json()).toMatchObject({ error: 'HELD_OPEN' });
      } finally {
        손.release();
      }
    });

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
      const id = await 넣기({ status: 'DONE', held: [날짜], input: { 'XWLM-002': { removed: true, by: 사람, at: 'x' } } });
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
          'XWLM-001': { params: { wait: 3 }, expected: { total: 1 }, by: 사람, at: 'x' },
          'XWLM-002': { removed: true, by: 사람, at: 'x' },
        },
      });
      expect((await 머지({ sourceId: id })).statusCode).toBe(201);
      const r = await 집기();
      expect(r.kind).toBe('MERGE');
      expect(r.held).toEqual({ 'XWLM-001': { params: { wait: 3 }, expected: { total: 1 } }, 'XWLM-002': { removed: true } });
      expect(r.target).toEqual({ env: 'stg', baseUrl: 'https://stg.xwlm.test', loginId: 'tester', loginPassword: 'pw-xwlm' });
    });

    it('정방향 머지면 머지 요청의 env 줄을 target 으로 싣는다', async () => {
      const id = await 넣기({ status: 'DONE', held: [쿠폰], input: 다채움 });
      expect((await 머지({ sourceId: id, env: 'stg' })).statusCode).toBe(201);
      const r = await 집기();
      expect(r.held).toEqual({ 'XWLM-001': { params: { wait: 3 }, expected: { total: 1 } } });
      expect(r.target).toEqual({ env: 'stg', baseUrl: 'https://stg.xwlm.test', loginId: 'tester', loginPassword: 'pw-xwlm' });
    });

    it('대조 원본이라도 제거만 했으면 target 을 안 싣는다 — 돌릴 케이스가 없다', async () => {
      const id = await 넣기({ status: 'DONE', held: [날짜], env: 'stg', input: { 'XWLM-002': { removed: true, by: 사람, at: 'x' } } });
      expect((await 머지({ sourceId: id })).statusCode).toBe(201);
      const r = await 집기();
      expect(r.held).toEqual({ 'XWLM-002': { removed: true } });
      expect('target' in r).toBe(false);
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
