// 작성이 찾은 돌발 팝업 행 — 끝 보고에 실려 오고 반영(MERGE)이 DONE 으로 끝날 때만 조작 맵에 오른다 (도메인/게임 §3.10 「돌발 팝업 자동 닫기」 · GAME-F5-15)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import authoringAgentRoutes from '../authoring/agentRoutes.js';
import { 끝내기팝업맞나 } from './gamePopupMerge.js';

vi.mock('../catalog/scanRun.js', () => ({ 병합뒤훑기: async () => undefined }));

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XGU';
const 에이전트 = 'xgu-agent';
const 초대 = { kind: 'POPUP', fromKey: 'game:Main/Canvas/Invite', action: '/Canvas/Invite/Decline', status: 'OK' };
const 출석 = { kind: 'POPUP', fromKey: 'game:Main/Canvas/Attendance', action: '/Canvas/Attendance/Close', status: 'OK' };

describe('끝 보고의 돌발 팝업 행 검사', () => {
  it('작성 DONE 의 「확인」 POPUP 행만 받는다', () => {
    expect(끝내기팝업맞나('AUTHOR', 'DONE', {}, undefined)).toBe(true);
    expect(끝내기팝업맞나('AUTHOR', 'DONE', {}, [초대, 출석])).toBe(true);
    expect(끝내기팝업맞나('RERUN', 'DONE', {}, [초대])).toBe(true);
  });

  it('반영 · 실패 · 테스트 고침 · 다른 종류 행 · 진행 불가 · 빈 목록 · 100개 넘음 · 같은 행 둘은 거절한다', () => {
    expect(끝내기팝업맞나('MERGE', 'DONE', {}, [초대])).toBe(false);
    expect(끝내기팝업맞나('AUTHOR', 'FAILED', {}, [초대])).toBe(false);
    expect(끝내기팝업맞나('AUTHOR', 'DONE', { testFix: { auto: true } }, [초대])).toBe(false);
    expect(끝내기팝업맞나('AUTHOR', 'DONE', {}, [{ ...초대, kind: 'MOVE' }])).toBe(false);
    expect(끝내기팝업맞나('AUTHOR', 'DONE', {}, [{ ...초대, status: 'BLOCKED', reason: '닫기 단추 없음' }])).toBe(false);
    expect(끝내기팝업맞나('AUTHOR', 'DONE', {}, [])).toBe(false);
    expect(끝내기팝업맞나('AUTHOR', 'DONE', {}, Array.from({ length: 101 }, (_, i) => ({ ...초대, action: `/Close/${String(i)}` })))).toBe(false);
    expect(끝내기팝업맞나('AUTHOR', 'DONE', {}, [초대, 초대])).toBe(false);
    expect(끝내기팝업맞나('AUTHOR', 'DONE', {}, { rows: [초대] })).toBe(false);
  });
});

describe.skipIf(연결 === undefined)('돌발 팝업 행 — 병합 뒤 조작 맵에 올리기', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 원래 = process.env.AUTHORING_AGENT_USER;

  const pool = async () => (await import('../db/index.js')).pool;
  const q = async <T extends object = Record<string, unknown>>(sql: string, 값: unknown[] = []) => (await pool()).query<T>(sql, 값);
  const 행넣기 = async (칸: Record<string, unknown>): Promise<number> => {
    const 이름들 = Object.keys(칸);
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, requested_by, requested_by_name, ${이름들.join(', ')})
       VALUES ($1, 'xgu-writer', '팝업 병합 검사', ${이름들.map((_, i) => `$${String(i + 2)}`).join(', ')}) RETURNING id`,
      [서비스, ...이름들.map((k) => 칸[k])],
    );
    return Number(r.rows[0]!.id);
  };
  const 도는작성 = (params: object = {}) =>
    행넣기({ status: 'RUNNING', claimed_by: 에이전트, started_at: new Date(), params: JSON.stringify(params) });
  const 도는머지 = (원본: number) => 행넣기({ kind: 'MERGE', source_id: 원본, status: 'RUNNING', claimed_by: 에이전트, started_at: new Date() });
  const 끝내기 = (id: number, 본문: object) => app.inject({ method: 'POST', url: `/api/authoring/requests/${String(id)}/finish`, payload: 본문 });
  const 맵팝업 = async () =>
    (await q<{ from_key: string; action: string; status: string }>(
      `SELECT from_key, action, status FROM game_route WHERE service_id = $1 AND kind = 'POPUP' ORDER BY from_key COLLATE "C"`, [서비스],
    )).rows;
  const 치우기 = async () => {
    await q('DELETE FROM game_route WHERE service_id = $1', [서비스]);
    await q(`DELETE FROM authoring_request WHERE service_id = $1 AND kind = 'MERGE'`, [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform) VALUES ($1, 'XGU 팝업 병합 검사용', '#3A5FCD', '', 'xgu', 'GAME', 'android') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(치우기);

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    if (원래 === undefined) delete process.env.AUTHORING_AGENT_USER;
    else process.env.AUTHORING_AGENT_USER = 원래;
  });

  it('작성이 끝났을 때는 맵에 없고, 그 실행을 반영한 MERGE 가 DONE 으로 끝나면 오른다', async () => {
    const 작성 = await 도는작성();
    expect((await 끝내기(작성, { status: 'DONE', result: { popupRows: [초대, 출석] } })).statusCode).toBe(200);
    expect(await 맵팝업()).toEqual([]);
    const 머지 = await 도는머지(작성);
    expect((await 끝내기(머지, { status: 'DONE', result: { pulled: true } })).statusCode).toBe(200);
    expect(await 맵팝업()).toEqual([
      { from_key: 'game:Main/Canvas/Attendance', action: '/Canvas/Attendance/Close', status: 'OK' },
      { from_key: 'game:Main/Canvas/Invite', action: '/Canvas/Invite/Decline', status: 'OK' },
    ]);
  });

  it('반영이 실패하면 오르지 않는다', async () => {
    const 작성 = await 도는작성();
    await 끝내기(작성, { status: 'DONE', result: { popupRows: [초대] } });
    const 머지 = await 도는머지(작성);
    expect((await 끝내기(머지, { status: 'FAILED', error: 'CI 가 빨갛다' })).statusCode).toBe(200);
    expect(await 맵팝업()).toEqual([]);
  });

  it('꼴이 틀리거나 테스트 고침 요청이면 400 BAD_RESULT popupRows 로 끝내기를 받지 않는다', async () => {
    const 작성 = await 도는작성();
    const r = await 끝내기(작성, { status: 'DONE', result: { popupRows: [{ ...초대, kind: 'MOVE' }] } });
    expect([r.statusCode, r.json()]).toEqual([400, { error: 'BAD_RESULT', detail: 'popupRows' }]);
    const 고침 = await 도는작성({ testFix: { auto: true, cases: [], note: '' } });
    const g = await 끝내기(고침, { status: 'DONE', result: { popupRows: [초대] } });
    expect([g.statusCode, g.json()]).toEqual([400, { error: 'BAD_RESULT', detail: 'popupRows' }]);
  });

  it('맵에 이미 있는 「재확인 필요」 팝업은 빌드 없는 병합으로 풀지 않는다', async () => {
    await q(`INSERT INTO game_route (service_id, kind, from_key, action, status) VALUES ($1, 'POPUP', $2, $3, 'RECHECK')`, [서비스, 초대.fromKey, 초대.action]);
    const 작성 = await 도는작성();
    await 끝내기(작성, { status: 'DONE', result: { popupRows: [초대, 출석] } });
    await 끝내기(await 도는머지(작성), { status: 'DONE', result: { pulled: true } });
    expect((await 맵팝업()).map((x) => x.status)).toEqual(['OK', 'RECHECK']);
  });
});
