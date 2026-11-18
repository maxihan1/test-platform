// 미션 목록 한 바퀴 — 에이전트가 올리고 · 결정 목록에 「미션 승인」으로 서고 · 체크한 미션으로 게임 시나리오 작성이 서고 · 제외 · 다음 목록이 제외를 물려받는다 (도메인/게임 §3.10 결정 24 · 도메인/작성 §3.6 「★ 결정 목록」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { 서비스권한 } from '../auth/permissions.js';
import prdAgentRoutes from '../prd/agentRoutes.js';
import decisionRoutes from './decisionRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XMN';
const 에이전트 = 'xmn-agent';
const 쓰기: 서비스권한 = { cases: 'write', runs: 'write', authoring: 'write' };

const 미션 = (id: string, 피해 = 6) => ({
  id,
  title: `${id} 레벨 1 탱커가 임프 3마리를 잡는다`,
  start: '탱커 · 레벨 1 · 혼자',
  todo: '임프 3마리 처치',
  success: '처치 줄 3줄',
  logs: [{ text: `받은 피해 줄: 전부 ${String(피해)}`, reqId: 'XMN-REQ-001' }],
});
const 목록본문 = (items: object[]) => ({ items, uncovered: [{ reqId: 'XMN-REQ-009', text: '레벨이 오르면 최대 체력이 10 오른다' }], gaps: [] });

type 항목 = { key: string; kind: string; picks: string[]; blockedBy: string | null; requestId?: number; missions?: { id: string }[]; skipped?: { id: string }[] } & Record<string, unknown>;

describe.skipIf(연결 === undefined)('미션 목록 · 미션 승인', () => {
  let 에이전트앱: FastifyInstance;
  let 사람앱: FastifyInstance;
  let 서비스 = 0;
  const 원래 = process.env.AUTHORING_AGENT_USER;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  /** 미션을 올릴 도는 작성 — 올린 뒤 끝내고 병합까지 해 둬야 열린 작성이 없다 */
  const 도는요청 = async (): Promise<number> => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by)
       VALUES ($1, 'AUTHOR', '{}', 'xmn', '검사', 'RUNNING', $2) RETURNING id`,
      [서비스, 에이전트],
    );
    return Number(r.rows[0]!.id);
  };
  const 끝내고병합 = async (id: number) => {
    await q(`UPDATE authoring_request SET status = 'DONE', finished_at = now() WHERE id = $1`, [id]);
    await q(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, finished_at)
       VALUES ($1, 'MERGE', $2, '{}', 'xmn', '검사', 'DONE', now())`,
      [서비스, id],
    );
  };
  const 올리기 = (id: number, 몸: object) => 에이전트앱.inject({ method: 'PUT', url: `/api/authoring/requests/${String(id)}/missions`, payload: 몸 });
  const 미션항목 = async (): Promise<항목 | undefined> =>
    ((await 사람앱.inject({ method: 'GET', url: `/api/authoring/decisions?service=${접두사}` })).json() as { items: 항목[] }).items.find((x) => x.kind === 'MISSIONS');
  const 진행 = (key: string, missions: unknown) =>
    사람앱.inject({ method: 'POST', url: `/api/authoring/decisions/run?service=${접두사}`, payload: { prdVersion: 0, picks: [{ key, pick: 'WRITE', missions }] } });
  const 제외 = (requestId: number, id: string, skip: boolean) =>
    사람앱.inject({ method: 'POST', url: `/api/authoring/decisions/skip-mission?service=${접두사}`, payload: { requestId, id, skip } });
  const 치우기 = async () => {
    await q('DELETE FROM authoring_request WHERE service_id = $1 AND kind = $2', [서비스, 'MERGE']);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q(`UPDATE service SET kind = 'GAME' WHERE id = $1`, [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XMN 미션 승인 검사용', '#3A5FCD', '', 'xmn', 'GAME') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
    process.env.AUTHORING_AGENT_USER = 에이전트;
    에이전트앱 = Fastify();
    에이전트앱.decorateRequest('user', null);
    에이전트앱.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await 에이전트앱.register(prdAgentRoutes, { prefix: '/api' });
    await 에이전트앱.ready();
    사람앱 = Fastify();
    사람앱.decorateRequest('user', null);
    사람앱.addHook('preHandler', async (req) => {
      req.user = {
        username: 'xmn', displayName: '검사', role: 'admin', dashboard: 'read', mustChangePassword: false,
        services: [{ id: 서비스, prefix: 접두사, permissions: 쓰기 }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await 사람앱.register(decisionRoutes, { prefix: '/api' });
    await 사람앱.ready();
  });

  beforeEach(치우기);

  afterAll(async () => {
    await 에이전트앱.close();
    await 사람앱.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    if (원래 === undefined) delete process.env.AUTHORING_AGENT_USER;
    else process.env.AUTHORING_AGENT_USER = 원래;
  });

  it('게임이 아니면 400 NOT_GAME_SERVICE, 모양이 틀리면 400 INVALID_MISSIONS 이고 아무것도 안 남는다', async () => {
    const id = await 도는요청();
    expect((await 올리기(id, { items: [{ ...미션('M01'), id: 'X' }], uncovered: [], gaps: [] })).json()).toEqual({ error: 'INVALID_MISSIONS', detail: 'items[0].id' });
    await q(`UPDATE service SET kind = 'APP' WHERE id = $1`, [서비스]);
    expect((await 올리기(id, 목록본문([미션('M01')]))).json()).toEqual({ error: 'NOT_GAME_SERVICE' });
    expect((await q<{ missions: unknown }>('SELECT missions FROM authoring_request WHERE id = $1', [id])).rows[0]!.missions).toBeNull();
  });

  it('올린 미션이 「미션 승인」으로 서고, 체크한 미션만 게임 시나리오 작성 요청에 실린 뒤 목록에서 빠진다', async () => {
    const id = await 도는요청();
    expect((await 올리기(id, 목록본문([미션('M01'), 미션('M02')]))).statusCode).toBe(204);
    expect(await 미션항목()).toBeUndefined(); // 도는 중인 작성의 목록은 아직 안 보인다
    await 끝내고병합(id);

    const 항목 = (await 미션항목())!;
    expect(항목).toMatchObject({ group: 3, picks: ['WRITE'], blockedBy: null, requestId: id, uncovered: [{ reqId: 'XMN-REQ-009' }], gaps: [], skipped: [] });
    expect(항목.missions!.map((m) => m.id)).toEqual(['M01', 'M02']);

    expect((await 진행(항목.key, ['M09'])).json()).toEqual({ error: 'BAD_PICK', detail: 항목.key });
    const r = await 진행(항목.key, ['M01']);
    expect(r.statusCode).toBe(201);
    const step = (r.json() as { steps: { step: number; requestId: number | null }[] }).steps[0]!;
    expect(step.step).toBe(7);
    const 세운 = (await q<{ params: { missions: { from: number; items: { id: string }[] } } }>('SELECT params FROM authoring_request WHERE id = $1', [step.requestId])).rows[0]!;
    expect(세운.params.missions.from).toBe(id);
    expect(세운.params.missions.items.map((m) => m.id)).toEqual(['M01']);

    // 세운 작성이 열린 작성이라 고르기는 닫히지만 남은 미션은 M02 하나다
    expect((await 미션항목())!.missions!.map((m) => m.id)).toEqual(['M02']);
  });

  it('[제외]한 미션은 접힌 목록으로 가고 되돌릴 수 있으며, 다음에 올린 목록이 제외를 물려받는다. 내용이 바뀐 미션은 다시 고른다', async () => {
    const 첫 = await 도는요청();
    await 올리기(첫, 목록본문([미션('M01'), 미션('M02')]));
    await 끝내고병합(첫);
    expect((await 제외(첫, 'M09', true)).json()).toEqual({ error: 'NOT_FOUND' });
    expect((await 제외(첫, 'M02', true)).json()).toEqual({ ok: true });
    expect(await 미션항목()).toMatchObject({ missions: [{ id: 'M01' }], skipped: [{ id: 'M02' }] });

    const 항목 = (await 미션항목())!;
    await 진행(항목.key, ['M01']);
    await q(`UPDATE authoring_request SET status = 'DONE' WHERE service_id = $1 AND status = 'PENDING'`, [서비스]);
    await q(`INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status) SELECT service_id, 'MERGE', id, '{}', 'xmn', '검사', 'DONE' FROM authoring_request WHERE service_id = $1 AND params ? 'missions'`, [서비스]);
    expect(await 미션항목()).toMatchObject({ picks: [], missions: [], skipped: [{ id: 'M02' }] });

    const 둘째 = await 도는요청();
    await 올리기(둘째, 목록본문([미션('M01', 7), 미션('M02')]));
    await 끝내고병합(둘째);
    expect(await 미션항목()).toMatchObject({ requestId: 둘째, picks: ['WRITE'], missions: [{ id: 'M01' }], skipped: [{ id: 'M02' }] });

    expect((await 제외(둘째, 'M02', false)).json()).toEqual({ ok: true });
    expect((await 미션항목())!.missions!.map((m) => m.id)).toEqual(['M01', 'M02']);
  });
});
