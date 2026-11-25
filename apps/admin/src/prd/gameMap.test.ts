// 게임 지도 통로 — 본문 검사 · 게임 애플리케이션만 · 올린 열쇠만 넣고 고치기 · 지우기 · 서버 값은 지키기 · AI 가 읽는 지도 글 (도메인/게임 §7 game-elements · game-map)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import prdAgentRoutes from './agentRoutes.js';
import { 요소검사 } from './gameMap.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XGE';
const 에이전트 = 'xge-agent';
const 장검 = { kind: 'DATA', key: 'item:sword_long', name: '장검', value: { 공격력: 14, 가격: 1200 }, reqIds: ['REQ-ITEM-001'] };
const 마을 = { kind: 'WORLD', key: 'zone:Town', name: '마을', value: { 안전지대: true }, reqIds: [] };
const 보라 = { kind: 'MOVE', key: 'move:성향 선량→보라', name: '선량에서 보라로', reqIds: ['REQ-PK-003'] };

describe('게임 요소 본문 검사', () => {
  it('칸이 틀리면 그 자리를 돌려준다', () => {
    expect(요소검사({})).toEqual({ error: 'BAD_ELEMENT', detail: 'elements' });
    expect(요소검사({ elements: [{ ...장검, kind: 'QUEST' }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.kind' });
    expect(요소검사({ elements: [{ ...장검, kind: 'toString' }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.kind' });
    expect(요소검사({ elements: [{ ...장검, key: 'sword_long' }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.key' });
    expect(요소검사({ elements: [장검, 장검] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.1.key' });
    expect(요소검사({ elements: [{ ...장검, name: ' ' }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.name' });
    expect(요소검사({ elements: [{ ...장검, value: 'x'.repeat(10_001) }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.value' });
    expect(요소검사({ elements: [{ ...장검, reqIds: [3] }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.reqIds' });
    expect(요소검사({ elements: [장검], remove: ['item:sword_long'] })).toEqual({ error: 'BAD_ELEMENT', detail: 'remove.0' });
  });

  const 배움 = { text: '고기 5 를 쓴다', belief: 'CONFIRMED', seen: 2, build: '59', shape: 'FIXED', data: { 앞: 20, 뒤: 15 }, related: ['item:meat'] };
  const 규칙 = { kind: 'RULE', key: 'rule:심기', name: '심기', learned: 배움 };
  const 날씨 = { kind: 'KIND', key: 'kind:WEATHER', name: '날씨', learned: { text: '날씨가 무엇을 바꾸나' } };
  const 눈 = { kind: 'WEATHER', key: 'weather:눈', name: '눈', learned: { text: '느려진다', belief: 'GUESS' } };

  it('배운 것의 칸이 틀리면 그 칸을 돌려준다 — 모르는 칸도 거절한다', () => {
    const 칸 = (learned: unknown) => 요소검사({ elements: [{ ...규칙, learned }] });
    expect(칸({ ...배움, text: ' ' })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned.text' });
    expect(칸({ ...배움, belief: '확인' })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned.belief' });
    expect(칸({ text: '믿음 없음' })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned.belief' });
    expect(칸({ ...배움, seen: -1 })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned.seen' });
    expect(칸({ ...배움, marks: ['CHEAT', 'CHEAT'] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned.marks' });
    expect(칸({ ...배움, related: ['고기'] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned.related' });
    expect(칸({ ...배움, confidence: 1 })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned.confidence' });
    expect(칸({ ...배움, data: 'x'.repeat(10_000) })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned' });
    expect(칸({ ...배움, data: '\u0000' })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned' });
  });

  it('배운 것만 실은 줄은 기획서 값과 근거를 본문에 만들지 않는다', () => {
    expect(요소검사({ elements: [규칙] })).toEqual({ elements: [규칙], remove: [] });
  });

  it('기획서에서 온 다섯 밖의 종류는 종류 이름이 열쇠 앞머리다', () => {
    expect(요소검사({ elements: [{ ...규칙, key: 'item:심기' }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.key' });
  });

  it('게임이 만든 종류는 지도나 본문에 정의가 있어야 하고 기본 종류 · 정해진 앞머리 이름은 못 쓴다', () => {
    expect(요소검사({ elements: [눈] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.kind' });
    expect(요소검사({ elements: [눈, 날씨] })).toEqual({ elements: [눈, 날씨], remove: [] });
    expect(요소검사({ elements: [눈] }, new Map([['WEATHER', []]]))).toEqual({ elements: [눈], remove: [] });
    expect(요소검사({ elements: [{ ...날씨, key: 'kind:RULE' }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.key' });
    expect(요소검사({ elements: [{ ...날씨, key: 'kind:ITEM' }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.key' });
    expect(요소검사({ elements: [{ kind: 'KIND', key: 'kind:WEATHER', name: '날씨' }] })).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned' });
  });

  it('정의를 지우려면 그 종류를 쓰던 줄도 같은 본문에서 옮기거나 지운다', () => {
    const 지움 = { ...날씨, learned: null };
    const 지도 = new Map([['WEATHER', ['weather:눈']]]);
    expect(요소검사({ elements: [지움] }, 지도)).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned' });
    expect(요소검사({ elements: [지움, { ...눈, learned: null }] }, 지도)).toEqual({ elements: [지움, { ...눈, learned: null }], remove: [] });
  });

  it('게임이 만든 종류는 게임 하나에 스무 개까지다', () => {
    const 스물 = new Map(Array.from({ length: 20 }, (_, i) => [`X${String.fromCharCode(65 + i)}`, []]));
    expect(요소검사({ elements: [날씨] }, 스물)).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.kind' });
    expect(요소검사({ elements: [{ ...날씨, key: 'kind:XA' }] }, 스물)).not.toHaveProperty('error');
  });

  it('값과 근거가 없어도 되고 remove 는 없으면 빈 목록이다', () => {
    expect(요소검사({ elements: [보라] })).toEqual({ elements: [{ ...보라, value: null }], remove: [] });
  });
});

describe.skipIf(연결 === undefined)('게임 지도 에이전트 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 원래 = process.env.AUTHORING_AGENT_USER;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 요청넣기 = async () => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by)
       VALUES ($1, 'AUTHOR', '{}', 'xge', '검사', 'RUNNING', $2) RETURNING id`,
      [서비스, 에이전트],
    );
    return Number(r.rows[0]!.id);
  };
  const 치우기 = async () => {
    await q('DELETE FROM game_element_case WHERE service_id = $1', [서비스]);
    await q('DELETE FROM game_element WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };
  const 올리기 = (id: number, 몸: object) => app.inject({ method: 'PUT', url: `/api/authoring/requests/${id}/game-elements`, payload: 몸 });
  const 지도 = async (id: number) => (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/game-map` })).json<{ text: string }>().text;

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform) VALUES ($1, 'XGE 게임 지도 검사용', '#3A5FCD', '', 'xge', 'GAME', 'android') RETURNING id`,
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
      const r = await 올리기(id, { elements: [장검] });
      expect([r.statusCode, r.json()]).toEqual([400, { error: 'NOT_GAME_SERVICE' }]);
      expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/game-map` })).statusCode).toBe(400);
    } finally {
      await q(`UPDATE service SET kind = 'GAME', game_platform = 'android' WHERE id = $1`, [서비스]);
    }
  });

  it('올린 열쇠만 넣고 고치며 remove 는 지우고, 실행이 쓴 서버 값은 지킨다', async () => {
    const id = await 요청넣기();
    expect((await 올리기(id, { elements: [장검, 마을, 보라] })).statusCode).toBe(204);
    await q(`UPDATE game_element SET server_value = '{"공격력": 12, "가격": 1200}' WHERE service_id = $1 AND key = 'item:sword_long'`, [서비스]);
    expect((await 올리기(id, { elements: [{ ...장검, name: '롱소드' }], remove: ['zone:Town'] })).statusCode).toBe(204);
    const r = await q<{ key: string; name: string; server_value: unknown }>('SELECT key, name, server_value FROM game_element WHERE service_id = $1 ORDER BY key', [서비스]);
    expect(r.rows).toEqual([
      { key: 'item:sword_long', name: '롱소드', server_value: { 공격력: 12, 가격: 1200 } },
      { key: 'move:성향 선량→보라', name: '선량에서 보라로', server_value: null },
    ]);
    const 틀림 = await 올리기(id, { elements: [{ ...장검, key: '' }] });
    expect([틀림.statusCode, 틀림.json()]).toEqual([400, { error: 'BAD_ELEMENT', detail: 'elements.0.key' }]);
  });

  it('배운 것은 기획서 값과 섞이지 않는다 — 어느 쪽을 올려도 다른 쪽이 남고, remove 는 기획서 몫만 비운다', async () => {
    const id = await 요청넣기();
    const 줄 = async () =>
      (await q<{ key: string; value: unknown; req_ids: string[]; prd_changed: string[]; text: string | null }>(`SELECT key, value, req_ids, prd_changed, learned->>'text' AS text FROM game_element WHERE service_id = $1 ORDER BY key`, [서비스])).rows;
    const 배움 = { text: '두 번 같았다', belief: 'CONFIRMED', seen: 2 };
    await 올리기(id, { elements: [장검] });
    await q(`UPDATE game_element SET prd_changed = '{REQ-ITEM-001}' WHERE service_id = $1`, [서비스]);

    expect((await 올리기(id, { elements: [{ kind: 'DATA', key: 'item:sword_long', name: '장검', learned: 배움 }] })).statusCode).toBe(204);
    expect(await 줄()).toEqual([{ key: 'item:sword_long', value: 장검.value, req_ids: 장검.reqIds, prd_changed: ['REQ-ITEM-001'], text: '두 번 같았다' }]);

    await 올리기(id, { elements: [장검] });
    expect(await 줄()).toEqual([{ key: 'item:sword_long', value: 장검.value, req_ids: 장검.reqIds, prd_changed: [], text: '두 번 같았다' }]);

    await 올리기(id, { elements: [], remove: ['item:sword_long'] });
    expect(await 줄()).toEqual([{ key: 'item:sword_long', value: null, req_ids: [], prd_changed: [], text: '두 번 같았다' }]);

    await 올리기(id, { elements: [{ kind: 'DATA', key: 'item:sword_long', name: '장검', learned: null }] });
    expect(await 줄()).toEqual([]);
  });

  it('게임이 만든 종류 — 정의가 지도에 있으면 받고, 지도 글에 그 이름으로 찍히며, 정의 없이 남은 줄도 빠지지 않는다', async () => {
    const id = await 요청넣기();
    const 날씨 = { kind: 'KIND', key: 'kind:WEATHER', name: '날씨', learned: { text: '날씨가 무엇을 바꾸나' } };
    const 눈 = { kind: 'WEATHER', key: 'weather:눈', name: '눈', learned: { text: '느려진다', belief: 'GUESS' } };
    expect((await 올리기(id, { elements: [눈] })).json()).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.kind' });
    expect((await 올리기(id, { elements: [날씨] })).statusCode).toBe(204);
    expect((await 올리기(id, { elements: [눈] })).statusCode).toBe(204);
    expect((await 올리기(id, { elements: [{ ...날씨, learned: null }] })).json()).toEqual({ error: 'BAD_ELEMENT', detail: 'elements.0.learned' });
    expect(await 지도(id)).toBe(
      [
        '# 게임 지도 — 요소 2개 · 배운 줄 2개. 기대값의 근거가 아니다 — 근거는 표준 기획서 항목뿐이다',
        '',
        '## 게임이 만든 종류 (KIND) — 1개',
        '- kind:WEATHER · 날씨 · 배움 {"text":"날씨가 무엇을 바꾸나"}',
        '',
        '## 날씨 (WEATHER) — 1개',
        '- weather:눈 · 눈 · 배움 {"text":"느려진다","belief":"GUESS"}',
      ].join('\n') + '\n',
    );
    await q(`DELETE FROM game_element WHERE service_id = $1 AND kind = 'KIND'`, [서비스]);
    expect(await 지도(id)).toContain('## WEATHER (WEATHER) — 1개\n- weather:눈');
  });

  it('지도 글은 종류마다 요소 한 줄 — 기획서 값 · 근거 · 서버 값과 같은지 · 거친 케이스', async () => {
    const id = await 요청넣기();
    expect(await 지도(id)).toBe('# 게임 지도 — 요소 0개. 기대값의 근거가 아니다 — 근거는 표준 기획서 항목뿐이다\n');
    await 올리기(id, { elements: [장검, 마을, 보라] });
    const 실행 = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id)
       VALUES ('XGE 대조', 'XGE', '', 'xge', 'qa', 'http://xge.test', 'FINISHED', $1) RETURNING run_id`,
      [서비스],
    );
    const 번호 = 실행.rows[0]!.run_id;
    try {
      await q(`UPDATE game_element SET server_value = '{"가격": 1200, "공격력": 14}', checked_run = $2 WHERE service_id = $1 AND key = 'item:sword_long'`, [서비스, 번호]);
      await q(`UPDATE game_element SET server_value = '{"안전지대": false}', checked_run = $2 WHERE service_id = $1 AND key = 'zone:Town'`, [서비스, 번호]);
      await q(`UPDATE game_element SET server_value = '{"성향": "보라"}' WHERE service_id = $1 AND key = 'move:성향 선량→보라'`, [서비스]);
      await q(`INSERT INTO game_element_case (service_id, key, tc_id) VALUES ($1, 'item:sword_long', 'XGE-FN-002'), ($1, 'item:sword_long', 'XGE-FN-001')`, [서비스]);
      expect(await 지도(id)).toBe(
        [
          '# 게임 지도 — 요소 3개. 기대값의 근거가 아니다 — 근거는 표준 기획서 항목뿐이다',
          '',
          '## 게임 데이터 (DATA) — 1개',
          `- item:sword_long · 장검 · 기획서 {"가격":1200,"공격력":14} · 근거 REQ-ITEM-001 · 서버 {"가격":1200,"공격력":14} 같음 (실행 #${번호}) · 케이스 XGE-FN-001, XGE-FN-002`,
          '',
          '## 월드 (WORLD) — 1개',
          `- zone:Town · 마을 · 기획서 {"안전지대":true} · 서버 {"안전지대":false} 다름 (실행 #${번호}) · 거친 케이스 없음`,
          '',
          '## 상태 바뀜 (MOVE) — 1개',
          '- move:성향 선량→보라 · 선량에서 보라로 · 근거 REQ-PK-003 · 서버 {"성향":"보라"} 비교할 기획서 값 없음 · 거친 케이스 없음',
        ].join('\n') + '\n',
      );
    } finally {
      await q('UPDATE game_element SET checked_run = NULL WHERE service_id = $1', [서비스]);
      await q('DELETE FROM test_run WHERE run_id = $1', [번호]);
    }
  });
});
