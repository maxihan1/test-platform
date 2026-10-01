// 반영 때 겹침 — 끝내기 검사 · 상세 칸 · 고르기 통로 · 반영 409 · 집기 칸 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」 · §7)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 등급표 } from '../auth/routeTable.js';
import { 라우트표 } from '../auth/scope.js';
import authoringAgentRoutes from './agentRoutes.js';
import type { 겹침 } from './conflicts.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWY';
const 맥 = 'xwy-맥';
const 사람 = 'xwy1';

const 번호겹침: 겹침 = {
  tcId: 'XWY-002',
  name: '쿠폰 적용',
  file: 'tests/xwy/XWY-002.spec.ts',
  kinds: ['TCID'],
  with: [{ tcId: 'XWY-002', name: '먼저 들어온 쿠폰', file: 'tests/xwy/XWY-002-coupon.spec.ts' }],
};
const 이름겹침: 겹침 = {
  tcId: 'XWY-003',
  name: '로그인',
  file: 'tests/xwy/XWY-003.spec.ts',
  kinds: ['NAME', 'REQUIREMENT'],
  with: [{ tcId: 'XWY-010', name: '로그인', file: 'tests/xwy/XWY-010.spec.ts' }],
  requirements: ['REQ-7'],
};

describe('라우트 표 — 고르기 통로', () => {
  it('고르기와 되돌리기는 (작성, write) 이고 번호로 서비스를 찾는다', () => {
    for (const 메서드 of ['PUT', 'DELETE']) {
      expect(등급표[`${메서드} /api/authoring/requests/:id/conflicts/:tcId`]).toEqual({ 기능: 'authoring', 칸: 'write' });
    }
    expect(라우트표['/api/authoring/requests/:id/conflicts/:tcId']).toEqual({ 종류: '작성요청', 칸: 'id' });
  });
});

describe.skipIf(연결 === undefined)('반영 때 겹침 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 사람;

  const pool = async () => (await import('../db/index.js')).pool;
  const 넣기 = async (칸: { status: string; kind?: string; source?: number; result?: object; input?: object }) => {
    const r = await (await pool()).query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, requested_by, requested_by_name, status, claimed_by, started_at, finished_at,
          result, conflict_input, pr_url, spec_text)
       VALUES ($1, $2, $3, $4, '요청자', $5, $6, now(),
               CASE WHEN $5 IN ('PENDING', 'RUNNING') THEN NULL ELSE now() END, $7, $8, $9, $10)
       RETURNING id`,
      [
        서비스,
        칸.kind ?? 'AUTHOR',
        칸.source ?? null,
        사람,
        칸.status,
        칸.status === 'PENDING' ? null : 맥,
        칸.result === undefined ? null : JSON.stringify(칸.result),
        칸.input === undefined ? null : JSON.stringify(칸.input),
        칸.status === 'DONE' ? 'https://github.com/acme/xwy/pull/1' : null,
        칸.kind === 'MERGE' ? '머지 요청' : null,
      ],
    );
    return Number(r.rows[0]!.id);
  };
  /** 작성 실행 하나와 그것을 원본으로 겹침에 걸려 실패한 반영 하나 */
  const 겹친판 = async (input?: object) => {
    const 원본 = await 넣기({ status: 'DONE', input });
    await 넣기({ status: 'FAILED', kind: 'MERGE', source: 원본, result: { conflicts: [번호겹침, 이름겹침] } });
    return 원본;
  };
  const 부르기 = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, ...(payload === undefined ? {} : { payload }) });
  const 상세 = async (id: number) => (await 부르기('GET', `/api/authoring/requests/${id}`)).json();
  const 고르기 = (id: number, tcId: string, 몸: object) => 부르기('PUT', `/api/authoring/requests/${id}/conflicts/${tcId}`, 몸);
  const 머지 = (몸: object) => 부르기('POST', `/api/authoring/merges?service=${접두사}`, 몸);
  const 끝내기 = async (id: number, 몸: object) => {
    부르는이 = 맥;
    const r = await 부르기('POST', `/api/authoring/requests/${id}/finish`, 몸);
    부르는이 = 사람;
    return r;
  };

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XWY 반영 겹침 검사용', '#3A5FCD', 'https://github.com/acme/xwy', 'xwy')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
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
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  describe('끝내기 result.conflicts', () => {
    it('반영이 겹침으로 실패하면 목록을 받는다', async () => {
      const 원본 = await 넣기({ status: 'DONE' });
      const 반영 = await 넣기({ status: 'RUNNING', kind: 'MERGE', source: 원본 });
      const r = await 끝내기(반영, { status: 'FAILED', error: '겹치는 케이스 2건', result: { conflicts: [번호겹침, 이름겹침] } });
      expect(r.statusCode).toBe(200);
      expect((await 상세(원본)).conflictsOpen).toBe(2);
    });

    it('모양이 틀리거나 같은 tcId 가 두 줄이면 400 BAD_CONFLICTS', async () => {
      const 원본 = await 넣기({ status: 'DONE' });
      const 반영 = await 넣기({ status: 'RUNNING', kind: 'MERGE', source: 원본 });
      for (const conflicts of [[{ ...번호겹침, kinds: ['SAME'] }], [번호겹침, 번호겹침], '목록 아님', [{ ...번호겹침, tcId: '' }]]) {
        const r = await 끝내기(반영, { status: 'FAILED', error: 'x', result: { conflicts } });
        expect(r.json()).toMatchObject({ error: 'BAD_CONFLICTS' });
      }
    });

    it('반영의 실패가 아닌 끝내기에 실리면 400 BAD_CONFLICTS', async () => {
      const 작성 = await 넣기({ status: 'RUNNING' });
      expect((await 끝내기(작성, { status: 'FAILED', error: 'x', result: { conflicts: [번호겹침] } })).json()).toMatchObject({
        error: 'BAD_CONFLICTS',
      });
      const 원본 = await 넣기({ status: 'DONE' });
      const 반영 = await 넣기({ status: 'RUNNING', kind: 'MERGE', source: 원본 });
      expect((await 끝내기(반영, { status: 'DONE', result: { pulled: true, conflicts: [] } })).json()).toMatchObject({
        error: 'BAD_CONFLICTS',
      });
    });
  });

  describe('상세 conflicts[] · conflictsOpen', () => {
    it('가장 최근 반영이 겹침으로 실패했으면 목록에 고른 것을 붙이고 남은 수를 센다', async () => {
      const 원본 = await 겹친판({ 'XWY-002': { action: 'DROP', by: 사람, at: 'x' } });
      const r = await 상세(원본);
      expect(r.conflictsOpen).toBe(1);
      expect(r.conflicts).toEqual([
        { ...번호겹침, input: { action: 'DROP', by: 사람, at: 'x' } },
        { ...이름겹침, input: null },
      ]);
    });

    it('그 뒤 반영이 서거나 다른 까닭으로 실패했거나 반영이 없으면 빈 목록이다', async () => {
      const 없음 = await 넣기({ status: 'DONE' });
      expect(await 상세(없음)).toMatchObject({ conflicts: [], conflictsOpen: 0 });
      const 원본 = await 겹친판();
      const 다음 = await 넣기({ status: 'PENDING', kind: 'MERGE', source: 원본 });
      expect(await 상세(원본)).toMatchObject({ conflicts: [], conflictsOpen: 0 });
      await (await pool()).query(`UPDATE authoring_request SET status = 'FAILED', finished_at = now(), result = '{}' WHERE id = $1`, [다음]);
      expect(await 상세(원본)).toMatchObject({ conflicts: [], conflictsOpen: 0 });
    });
  });

  describe('고르기 PUT · DELETE', () => {
    it('고른 것을 원본 행에 남기고 되돌린다', async () => {
      const 원본 = await 겹친판();
      expect((await 고르기(원본, 'XWY-002', { action: 'KEEP' })).statusCode).toBe(200);
      expect((await 고르기(원본, 'XWY-003', { action: 'DROP' })).statusCode).toBe(200);
      const r = await 상세(원본);
      expect(r.conflictsOpen).toBe(0);
      expect(r.conflicts[0].input).toMatchObject({ action: 'KEEP', by: 사람 });
      expect((await 부르기('DELETE', `/api/authoring/requests/${원본}/conflicts/XWY-002`)).statusCode).toBe(200);
      expect((await 상세(원본)).conflictsOpen).toBe(1);
    });

    it('목록에 없는 tcId · 틀린 action 은 400 BAD_CONFLICT', async () => {
      const 원본 = await 겹친판();
      expect((await 고르기(원본, 'XWY-099', { action: 'KEEP' })).json()).toEqual({ error: 'BAD_CONFLICT', detail: 'XWY-099' });
      expect((await 고르기(원본, 'XWY-002', { action: 'RENUMBER' })).json()).toEqual({ error: 'BAD_CONFLICT', detail: 'XWY-002' });
      expect((await 고르기(원본, 'XWY-002', {})).json()).toMatchObject({ error: 'BAD_CONFLICT' });
      expect((await 부르기('DELETE', `/api/authoring/requests/${원본}/conflicts/XWY-099`)).json()).toMatchObject({
        error: 'BAD_CONFLICT',
      });
    });

    it('반영이 대기 · 도는 중이면 409 MERGE_ACTIVE', async () => {
      const 원본 = await 겹친판();
      await 넣기({ status: 'RUNNING', kind: 'MERGE', source: 원본 });
      expect((await 고르기(원본, 'XWY-002', { action: 'KEEP' })).json()).toMatchObject({ error: 'MERGE_ACTIVE' });
      expect((await 부르기('DELETE', `/api/authoring/requests/${원본}/conflicts/XWY-002`)).json()).toMatchObject({
        error: 'MERGE_ACTIVE',
      });
    });

    it('뒤에 실행이 더 있으면 409 NOT_LATEST', async () => {
      const 원본 = await 겹친판();
      await 넣기({ status: 'DONE', kind: 'RERUN', source: 원본 });
      expect((await 고르기(원본, 'XWY-002', { action: 'KEEP' })).json()).toMatchObject({ error: 'NOT_LATEST' });
    });

    it('없는 요청은 404', async () => {
      expect((await 고르기(987654321, 'XWY-002', { action: 'KEEP' })).statusCode).toBe(404);
    });
  });

  describe('반영 409 CONFLICT_OPEN', () => {
    it('고르지 않은 겹침이 있으면 문장 detail 과 함께 막고, 다 고르면 선다', async () => {
      const 원본 = await 겹친판({ 'XWY-002': { action: 'KEEP', by: 사람, at: 'x' } });
      const 막힘 = await 머지({ sourceId: 원본 });
      expect(막힘.statusCode).toBe(409);
      expect(막힘.json()).toEqual({ error: 'CONFLICT_OPEN', detail: '겹치는 케이스 1건을 아직 고르지 않았다' });
      await 고르기(원본, 'XWY-003', { action: 'DROP' });
      expect((await 머지({ sourceId: 원본 })).statusCode).toBe(201);
    });
  });

  describe('집기(MERGE) conflicts', () => {
    const 집기 = async () => {
      부르는이 = 맥;
      const r = (await 부르기('POST', `/api/authoring/requests/claim?service=${접두사}`)).json();
      부르는이 = 사람;
      return r;
    };

    it('원본의 결정 전부를 싣는다 — 지금 목록으로 거르지 않는다', async () => {
      const 원본 = await 넣기({
        status: 'DONE',
        input: {
          'XWY-002': { action: 'KEEP', by: 사람, at: 'x' },
          'XWY-050': { action: 'DROP', by: 사람, at: 'x' },
        },
      });
      expect((await 머지({ sourceId: 원본 })).statusCode).toBe(201);
      const r = await 집기();
      expect(r.kind).toBe('MERGE');
      expect(r.conflicts).toEqual([
        { tcId: 'XWY-002', action: 'KEEP' },
        { tcId: 'XWY-050', action: 'DROP' },
      ]);
    });

    it('결정이 없으면 빈 목록 · 반영이 아니면 키가 없다', async () => {
      const 원본 = await 넣기({ status: 'DONE' });
      expect((await 머지({ sourceId: 원본 })).statusCode).toBe(201);
      expect((await 집기()).conflicts).toEqual([]);
      await 넣기({ status: 'PENDING' });
      const 작성 = await 집기();
      expect(작성.kind).toBe('AUTHOR');
      expect('conflicts' in 작성).toBe(false);
    });
  });
});
