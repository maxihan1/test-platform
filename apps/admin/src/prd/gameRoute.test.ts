// 조작 맵 통로 — 본문 검사(한도 · 가르개 · 상태와 까닭) · 게임 애플리케이션만 · 올린 행만 넣고 고치기 · 지우기 · 빌드 번호 지키기 · 경로 검색이 읽는 맵 글 (도메인/게임 §7 game-route)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import prdAgentRoutes from './agentRoutes.js';
import { 조작행검사 } from './gameRoute.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XGT';
const 에이전트 = 'xgt-agent';
const 공격 = {
  kind: 'MOVE', fromKey: 'zone:Dungeon', action: '적 누르기 → 「공격」 누르기', toKey: 'state:처치', helper: 'game.tap', durationMs: 3200,
  fields: { fn: '전투.공격()', progress: '처치 줄 수' }, status: 'OK', buildNo: '15309',
};
const 몰살 = { kind: 'SETUP', fromKey: 'zone:Dungeon', action: '/gm killall', toKey: 'state:몬스터 없음', warning: '경험치를 줘 레벨이 오른다 — 레벨 맞추기보다 먼저', status: 'OK' };
const 파티 = { kind: 'MOVE', fromKey: 'state:인원=2', action: '파티 초대', status: 'BLOCKED', reason: '두 번째 계정 없음' };

describe('조작 맵 본문 검사', () => {
  it('칸이 틀리면 그 자리를 돌려준다', () => {
    expect(조작행검사({})).toEqual({ error: 'BAD_ROUTE', detail: 'rows' });
    expect(조작행검사({ rows: [{ ...몰살, kind: 'QUEST' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.kind' });
    expect(조작행검사({ rows: [{ ...몰살, kind: 'toString' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.kind' });
    expect(조작행검사({ rows: [{ ...몰살, fromKey: ' ' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fromKey' });
    expect(조작행검사({ rows: [{ ...몰살, action: 'x'.repeat(201) }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.action' });
    expect(조작행검사({ rows: [{ ...몰살, toKey: 3 }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.toKey' });
    expect(조작행검사({ rows: [{ ...몰살, durationMs: -1 }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.durationMs' });
    expect(조작행검사({ rows: [{ ...몰살, durationMs: 1.5 }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.durationMs' });
    expect(조작행검사({ rows: [{ ...몰살, warning: 'x'.repeat(501) }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.warning' });
    expect(조작행검사({ rows: [{ ...몰살, fields: ['fn'] }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fields' });
    expect(조작행검사({ rows: [{ ...몰살, fields: { 긴: 'x'.repeat(10_001) } }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fields' });
    expect(조작행검사({ rows: [{ ...몰살, fields: { fn: '' } }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fields.fn' });
    expect(조작행검사({ rows: [{ ...몰살, buildNo: 'x'.repeat(101) }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.buildNo' });
    expect(조작행검사({ rows: [몰살, 몰살] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.1.action' });
    expect(조작행검사({ rows: [몰살], remove: [{ kind: 'SETUP', fromKey: 'zone:Dungeon', action: '/gm killall' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'remove.0' });
    expect(조작행검사({ rows: [], remove: [{ kind: 'SETUP', fromKey: 'zone:Dungeon' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'remove.0' });
    expect(조작행검사({ rows: Array.from({ length: 2_001 }, (_, i) => ({ ...몰살, action: `동작 ${String(i)}` })) })).toEqual({ error: 'BAD_ROUTE', detail: 'rows' });
  });

  it('맵 글을 한 줄씩 자르는 가르개(줄바꿈 · 「 · 」 · 「 → 」)는 글 칸에 못 넣는다', () => {
    expect(조작행검사({ rows: [{ ...몰살, action: '/gm killall\n/gm level 1' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.action' });
    expect(조작행검사({ rows: [{ ...몰살, warning: '레벨이 오른다 · 먼저' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.warning' });
    expect(조작행검사({ rows: [공격] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.action' });
    expect(조작행검사({ rows: [{ ...공격, action: '적 누르기→공격' }] })).not.toHaveProperty('error');
    expect(조작행검사({ rows: [{ ...몰살, fromKey: 'zone:Town ' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fromKey' });
    expect(조작행검사({ rows: [{ ...몰살, action: '누르기 ·' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.action' });
    expect(조작행검사({ rows: [{ ...몰살, toKey: '→ zone:Town' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.toKey' });
  });

  it('NUL 이 든 글 · 칸은 500 이 아니라 그 자리로 돌려준다', () => {
    expect(조작행검사({ rows: [{ ...몰살, helper: 'game\u0000tap' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.helper' });
    expect(조작행검사({ rows: [{ ...몰살, fields: { progress: '처치\u0000줄' } }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fields' });
  });

  it('탐색 플레이 때는 함수 이름이 아직 없어 fields.fn 이 null 이어도 된다', () => {
    expect(조작행검사({ rows: [{ ...몰살, fields: { fn: null, progress: '처치 줄 수' } }] })).not.toHaveProperty('error');
  });

  it('AI 는 확인 · 진행 불가만 올리고 까닭은 진행 불가에만 꼭 있다', () => {
    expect(조작행검사({ rows: [{ ...몰살, status: 'RECHECK' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.status' });
    expect(조작행검사({ rows: [{ ...파티, reason: undefined }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.reason' });
    expect(조작행검사({ rows: [{ ...몰살, reason: '이유' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.reason' });
  });

  it('빈 칸은 null 로 채우고 remove 는 없으면 빈 목록이다', () => {
    expect(조작행검사({ rows: [파티] })).toEqual({
      rows: [{ ...파티, toKey: null, helper: null, durationMs: null, warning: null, fields: null, buildNo: null }],
      remove: [],
    });
  });
});

describe.skipIf(연결 === undefined)('조작 맵 에이전트 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 원래 = process.env.AUTHORING_AGENT_USER;
  const 이동 = { ...공격, action: '적 누르기 후 「공격」 누르기' };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 요청넣기 = async () => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by)
       VALUES ($1, 'AUTHOR', '{}', 'xgt', '검사', 'RUNNING', $2) RETURNING id`,
      [서비스, 에이전트],
    );
    return Number(r.rows[0]!.id);
  };
  const 치우기 = async () => {
    await q('DELETE FROM game_route WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };
  const 올리기 = (id: number, 몸: object) => app.inject({ method: 'PUT', url: `/api/authoring/requests/${String(id)}/game-route`, payload: 몸 });
  const 맵 = async (id: number) => (await app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}/game-route` })).json<{ text: string }>().text;

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform) VALUES ($1, 'XGT 조작 맵 검사용', '#3A5FCD', '', 'xgt', 'GAME', 'android') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '작성 에이전트', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(prdAgentRoutes, { prefix: '/api' });
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

  it('게임이 아닌 애플리케이션이면 400 NOT_GAME_SERVICE', async () => {
    const id = await 요청넣기();
    await q(`UPDATE service SET kind = 'APP', game_platform = NULL WHERE id = $1`, [서비스]);
    try {
      const r = await 올리기(id, { rows: [몰살] });
      expect([r.statusCode, r.json()]).toEqual([400, { error: 'NOT_GAME_SERVICE' }]);
      expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}/game-route` })).statusCode).toBe(400);
    } finally {
      await q(`UPDATE service SET kind = 'GAME', game_platform = 'android' WHERE id = $1`, [서비스]);
    }
  });

  it('끝난 요청에는 409 NOT_RUNNING', async () => {
    const id = await 요청넣기();
    await q(`UPDATE authoring_request SET status = 'DONE' WHERE id = $1`, [id]);
    const r = await 올리기(id, { rows: [몰살] });
    expect([r.statusCode, r.json()]).toEqual([409, { error: 'NOT_RUNNING', detail: 'DONE' }]);
  });

  it('올린 행만 넣고 고치며 remove 는 지우고, 빈 칸은 지난 값을 지키며 fields 는 열쇠마다 덮는다', async () => {
    const id = await 요청넣기();
    expect((await 올리기(id, { rows: [이동, 몰살, 파티] })).statusCode).toBe(204);
    const 함수만 = { kind: 'SETUP', fromKey: 'zone:Dungeon', action: '/gm killall', fields: { fn: 'gm.몰살()' }, status: 'OK' };
    expect((await 올리기(id, { rows: [함수만], remove: [{ kind: 'MOVE', fromKey: 'state:인원=2', action: '파티 초대' }] })).statusCode).toBe(204);
    const r = await q<{ kind: string; to_key: string | null; warning: string | null; fields: unknown; status: string; reason: string | null }>(
      'SELECT kind, to_key, warning, fields, status, reason FROM game_route WHERE service_id = $1 ORDER BY kind, action',
      [서비스],
    );
    expect(r.rows).toEqual([
      { kind: 'MOVE', to_key: 'state:처치', warning: null, fields: { fn: '전투.공격()', progress: '처치 줄 수' }, status: 'OK', reason: null },
      { kind: 'SETUP', to_key: 'state:몬스터 없음', warning: 몰살.warning, fields: { fn: 'gm.몰살()' }, status: 'OK', reason: null },
    ]);
    const 틀림 = await 올리기(id, { rows: [{ ...몰살, fromKey: '' }] });
    expect([틀림.statusCode, 틀림.json()]).toEqual([400, { error: 'BAD_ROUTE', detail: 'rows.0.fromKey' }]);
  });

  it('빌드 번호 없는 확인은 다시 해 본 것이 아니라 「재확인 필요」 · 지난 빌드를 지키고, 빌드를 실은 확인 · 진행 불가는 그것을 바꾼다', async () => {
    const id = await 요청넣기();
    await 올리기(id, { rows: [이동, 파티] });
    await q(`UPDATE game_route SET status = 'RECHECK' WHERE service_id = $1`, [서비스]);
    const { buildNo: _빌드, ...빌드없는이동 } = 이동;
    const 상태 = async () =>
      (await q<{ action: string; status: string; reason: string | null; build_no: string | null }>(
        'SELECT action, status, reason, build_no FROM game_route WHERE service_id = $1 ORDER BY action', [서비스],
      )).rows;
    await 올리기(id, { rows: [{ ...빌드없는이동, durationMs: 2800 }, { ...파티, status: 'OK', reason: undefined }] });
    expect(await 상태()).toEqual([
      { action: '적 누르기 후 「공격」 누르기', status: 'RECHECK', reason: null, build_no: '15309' },
      { action: '파티 초대', status: 'RECHECK', reason: null, build_no: null },
    ]);
    await 올리기(id, { rows: [{ ...이동, buildNo: '15400' }, 파티] });
    expect(await 상태()).toEqual([
      { action: '적 누르기 후 「공격」 누르기', status: 'OK', reason: null, build_no: '15400' },
      { action: '파티 초대', status: 'BLOCKED', reason: '두 번째 계정 없음', build_no: null },
    ]);
    await 올리기(id, { rows: [{ ...이동, status: 'BLOCKED', reason: '창을 못 엶', buildNo: undefined }] });
    expect((await 상태())[0]).toEqual({ action: '적 누르기 후 「공격」 누르기', status: 'BLOCKED', reason: '창을 못 엶', build_no: null });
  });

  it('맵 글은 종류마다 한 행 한 줄 — 상태 · 빌드 · 소요 · 도우미 · 함수 · 경고, 나머지 칸은 맨 끝 JSON', async () => {
    const id = await 요청넣기();
    expect(await 맵(id)).toBe('# 조작 맵 — 행 0개. 「어떻게 가나」만 담는다 — 기대값의 근거가 아니다\n');
    const 용어 = { kind: 'TERM', fromKey: '대장장이', action: '「대장장이 브론」', toKey: 'npc:Blacksmith', status: 'OK' };
    await 올리기(id, { rows: [이동, 몰살, 파티, 용어] });
    await q(`UPDATE game_route SET status = 'RECHECK' WHERE service_id = $1 AND kind = 'SETUP'`, [서비스]);
    expect(await 맵(id)).toBe(
      [
        '# 조작 맵 — 행 4개. 「어떻게 가나」만 담는다 — 기대값의 근거가 아니다',
        '',
        '## 이동 · 조작 (MOVE) — 2행',
        '- state:인원=2 → 파티 초대 · 진행 불가 — 두 번째 계정 없음',
        '- zone:Dungeon → 적 누르기 후 「공격」 누르기 → state:처치 · 확인 · 빌드 15309 · 소요 3200ms · 도우미 game.tap · 함수 전투.공격() · 칸 {"progress":"처치 줄 수"}',
        '',
        '## 상태 설정 (SETUP) — 1행',
        '- zone:Dungeon → /gm killall → state:몬스터 없음 · 재확인 필요 · ⚠ 경험치를 줘 레벨이 오른다 — 레벨 맞추기보다 먼저',
        '',
        '## 용어 (TERM) — 1행',
        '- 대장장이 → 「대장장이 브론」 → npc:Blacksmith · 확인',
      ].join('\n') + '\n',
    );
  });
});
