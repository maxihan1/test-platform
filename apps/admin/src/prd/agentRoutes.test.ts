// 작성 에이전트의 표준 기획서 통로 — 맥 계정 · 집은 쪽 · 도는 중 문턱과 옮기기 결과 · 집기가 적는 읽은 판 (도메인/작성 §7 「표준 기획서 통로」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 집기 } from '../authoring/agentStore.js';
import prdAgentRoutes from './agentRoutes.js';
import { 사람저장 } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPG';
const 에이전트 = 'xpg-agent';
const 사람 = { username: 'xpg', displayName: '검사' };
const 항목 = (text: string) => ({ feature: '주문', text, basis: [{ from: '기획서.docx', quote: text }], status: 'CONFIRMED' as const });

describe.skipIf(연결 === undefined)('표준 기획서 에이전트 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 에이전트;
  const 원래 = process.env.AUTHORING_AGENT_USER;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 요청넣기 = async (kind: string, status: string, params: object = {}, source: number | null = null) => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, claimed_by)
       VALUES ($1, $2, $3, $4, 'xpg', '검사', $5, CASE WHEN $5 = 'PENDING' THEN NULL ELSE $6 END) RETURNING id`,
      [서비스, kind, source, JSON.stringify(params), status, 에이전트],
    );
    return Number(r.rows[0]!.id);
  };
  const 읽은판 = async (id: number) =>
    (await q<{ prd_version: number | null }>('SELECT prd_version FROM authoring_request WHERE id = $1', [id])).rows[0]?.prd_version;

  const 치우기 = async () => {
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xpg')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 표준 기획서 에이전트 통로 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(prdAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    부르는이 = 에이전트;
    await 치우기();
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    process.env.AUTHORING_AGENT_USER = 원래;
  });

  it('맥 계정이 아니면 403, 끝난 요청이면 409', async () => {
    const id = await 요청넣기('AUTHOR', 'RUNNING');
    부르는이 = 'xpg-person';
    expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/prd` })).json()).toEqual({ error: 'NOT_AUTHORING_AGENT' });
    부르는이 = 에이전트;
    const 끝난것 = await 요청넣기('AUTHOR', 'DONE');
    const r = await app.inject({ method: 'GET', url: `/api/authoring/requests/${끝난것}/prd` });
    expect([r.statusCode, r.json()]).toEqual([409, { error: 'NOT_RUNNING', detail: 'DONE' }]);
    const 올림 = await app.inject({ method: 'POST', url: `/api/authoring/requests/${끝난것}/prd`, payload: { items: 'x' } });
    expect([올림.statusCode, 올림.json()]).toEqual([409, { error: 'NOT_RUNNING', detail: 'DONE' }]);
  });

  it('지금 판을 읽고, 올리면 AGENT 판이 서고 요청의 읽은 판이 그 판이 된다 — 사람이 고친 항목은 남긴다', async () => {
    const id = await 요청넣기('AUTHOR', 'RUNNING');
    expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/prd` })).json()).toEqual({ version: 0, items: [], base: null });

    const 첫 = await app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/prd`, payload: { baseVersion: 0, items: [항목('5만원 이상 무료 배송')] } });
    expect(첫.json()).toEqual({ version: 1, keptByPerson: [] });
    expect(await 읽은판(id)).toBe(1);

    await 사람저장(서비스, 접두사, 1, [{ ...항목('3만원 이상 무료 배송'), reqId: 'XPG-REQ-001' }], 사람);
    const 둘 = await app.inject({
      method: 'POST',
      url: `/api/authoring/requests/${id}/prd`,
      payload: { baseVersion: 1, items: [{ ...항목('5만원 이상 무료 배송'), reqId: 'XPG-REQ-001' }, 항목('주문은 취소할 수 있다')] },
    });
    expect(둘.json()).toEqual({ version: 3, keptByPerson: ['XPG-REQ-001'] });
    const 지금 = await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/prd` });
    expect(지금.json()).toMatchObject({
      version: 3,
      items: [{ reqId: 'XPG-REQ-001', text: '3만원 이상 무료 배송', byPerson: true }, { reqId: 'XPG-REQ-002' }],
    });
    const 지어냄 = await app.inject({
      method: 'POST',
      url: `/api/authoring/requests/${id}/prd`,
      payload: { baseVersion: 3, items: [{ ...항목('x'), reqId: 'XPG-REQ-009' }] },
    });
    expect([지어냄.statusCode, 지어냄.json()]).toEqual([400, { error: 'PRD_REUSED', detail: 'XPG-REQ-009' }]);
  });

  it('기준 판(마지막으로 병합된 작성이 읽은 판)을 같이 싣는다 — 반영 요청이 바뀐 항목과 옛 문장을 안다', async () => {
    await 사람저장(서비스, 접두사, 0, [항목('5만원 이상 무료 배송')], 사람);
    const 앞작성 = await 요청넣기('AUTHOR', 'DONE');
    await q('UPDATE authoring_request SET prd_version = 1 WHERE id = $1', [앞작성]);
    await 요청넣기('MERGE', 'DONE', {}, 앞작성);
    await 사람저장(서비스, 접두사, 1, [{ ...항목('3만원 이상 무료 배송'), reqId: 'XPG-REQ-001' }], 사람);
    const 반영 = await 요청넣기('AUTHOR', 'RUNNING', { prdApply: true });
    expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${반영}/prd` })).json()).toMatchObject({
      version: 2,
      items: [{ reqId: 'XPG-REQ-001', text: '3만원 이상 무료 배송' }],
      base: { version: 1, items: [{ reqId: 'XPG-REQ-001', text: '5만원 이상 무료 배송' }] },
    });
  });

  it('반영 요청은 집을 때 적은 판을 읽는다 — 그 뒤에 저장한 판은 다음 반영 몫이다', async () => {
    await 사람저장(서비스, 접두사, 0, [항목('5만원 이상 무료 배송')], 사람);
    const 반영 = await 요청넣기('AUTHOR', 'PENDING', { prdApply: true });
    expect((await 집기(서비스, 에이전트))?.id).toBe(반영);
    await 사람저장(서비스, 접두사, 1, [{ ...항목('3만원 이상 무료 배송'), reqId: 'XPG-REQ-001' }], 사람);
    expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${반영}/prd` })).json()).toMatchObject({
      version: 1,
      items: [{ text: '5만원 이상 무료 배송' }],
    });
    const 작성 = await 요청넣기('AUTHOR', 'RUNNING');
    expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${작성}/prd` })).json()).toMatchObject({ version: 2 });
  });

  it('집기가 작성 · 재실행에만 지금 판을 적고 케이스 고치기와 그 다시 적용은 비운다', async () => {
    const 작성 = await 요청넣기('AUTHOR', 'PENDING');
    expect((await 집기(서비스, 에이전트))?.id).toBe(작성);
    expect(await 읽은판(작성)).toBeNull();

    await 사람저장(서비스, 접두사, 0, [항목('5만원 이상 무료 배송')], 사람);
    const 고치기 = await 요청넣기('EDIT', 'PENDING', { edits: [] });
    const 다시적용 = await 요청넣기('RERUN', 'PENDING', { edits: [] }, 고치기);
    const 재실행 = await 요청넣기('RERUN', 'PENDING', {}, 작성);
    for (let i = 0; i < 3; i += 1) await 집기(서비스, 에이전트);
    expect([await 읽은판(고치기), await 읽은판(다시적용), await 읽은판(재실행)]).toEqual([null, null, 1]);
  });
});
