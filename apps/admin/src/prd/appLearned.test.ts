// 앱 배운 것 통로 — 본문 검사(종류 · 열쇠 앞머리 · 화면 키 · learned 앱 갈래) · Android 앱만 · 올린 줄만 통째로 바꾸고 null 은 지우기 · 찾기 명령이 읽는 글 (도메인/작성 §7 app-learned)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import prdAgentRoutes from './agentRoutes.js';
import { 배운줄검사 } from './appLearned.js';
import { 배운것틀림 } from './gameKinds.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAL';
const 에이전트 = 'xal-agent';
const 글자수 = {
  kind: 'INPUT', key: 'input:글쓰기-글자수', name: '글쓰기 글자 수 한도', screen: 'app:.ComposeActivity/글쓰기',
  learned: { text: '500자를 넘기면 「게시」가 꺼지고 남은 글자 수가 빨갛게 -1 로 바뀐다', belief: 'CONFIRMED', seen: 2, build: '412', data: { 한도: 500, 넘으면: '-1' } },
};
const 물음 = { kind: 'ASK', key: 'ask:예약-게시', name: '예약 게시가 있나', learned: { text: '글쓰기 메뉴에 시계 아이콘이 있는데 눌러도 아무 일이 없다', belief: 'GUESS' } };
const 쪽지 = { kind: 'NOTE', key: 'note:쪽지', name: '다음 세션에게', learned: { text: '알림 화면은 남의 글이 있어야 채워진다 — 도우미 남의글올리기 먼저', belief: 'SEEN' } };

describe('배운것틀림 — 앱 갈래', () => {
  const 확인 = 글자수.learned;

  it('게임 칸(shape · marks)과 「게임 글」 믿음은 앱에서 틀리고 게임에서는 맞다', () => {
    expect(배운것틀림({ ...확인, shape: 'FIXED' }, 'INPUT', '앱')).toBe('shape');
    expect(배운것틀림({ ...확인, marks: ['CHEAT'] }, 'INPUT', '앱')).toBe('marks');
    expect(배운것틀림({ text: '안내 글', belief: 'GAME_TEXT' }, 'SIGNAL', '앱')).toBe('belief');
    expect(배운것틀림({ text: '안내 글', belief: 'GAME_TEXT', shape: 'FIXED' }, 'SIGNAL')).toBeNull();
  });

  it('믿음은 꼭 있다 — 게임의 KIND 줄 예외가 없다', () => {
    expect(배운것틀림({ text: '종류' }, 'KIND', '앱')).toBe('belief');
    expect(배운것틀림({ text: '종류' }, 'KIND')).toBeNull();
  });

  it('확인 줄은 두 번 이상 본 횟수 · 빌드 · 잰 값이 있어야 한다', () => {
    expect(배운것틀림(확인, 'INPUT', '앱')).toBeNull();
    expect(배운것틀림({ ...확인, seen: 1 }, 'INPUT', '앱')).toBe('seen');
    expect(배운것틀림({ ...확인, seen: undefined }, 'INPUT', '앱')).toBe('seen');
    expect(배운것틀림({ ...확인, build: undefined }, 'INPUT', '앱')).toBe('build');
    expect(배운것틀림({ ...확인, data: undefined }, 'INPUT', '앱')).toBe('data');
    expect(배운것틀림({ ...확인, data: null }, 'INPUT', '앱')).toBe('data');
    expect(배운것틀림({ ...확인, seen: 1, build: undefined, data: undefined }, 'INPUT')).toBeNull();
    expect(배운것틀림({ text: '한 번 봄', belief: 'SEEN', seen: 1 }, 'RULE', '앱')).toBeNull();
  });
});

describe('앱 배운 것 본문 검사', () => {
  it('칸이 틀리면 그 자리를 돌려준다', () => {
    expect(배운줄검사({})).toEqual({ error: 'BAD_LEARNED', detail: 'rows' });
    expect(배운줄검사({ rows: [{ ...글자수, kind: 'MOVE' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.kind' });
    expect(배운줄검사({ rows: [{ ...글자수, kind: 'toString' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.kind' });
    expect(배운줄검사({ rows: [{ ...글자수, name: ' ' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.name' });
    expect(배운줄검사({ rows: [{ ...글자수, name: 'x'.repeat(201) }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.name' });
    expect(배운줄검사({ rows: [{ ...글자수, name: '글쓰기\n한도' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.name' });
    expect(배운줄검사({ rows: [{ ...글자수, name: '글\u0000쓰기' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.name' });
    expect(배운줄검사({ rows: [{ ...글자수, name: '글\ud800쓰기' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.name' });
    expect(배운줄검사({ rows: [{ ...글자수, screen: '.ComposeActivity/글쓰기' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.screen' });
    expect(배운줄검사({ rows: [{ ...글자수, learned: undefined }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.learned' });
    expect(배운줄검사({ rows: [{ ...글자수, learned: { ...글자수.learned, belief: 'MAYBE' } }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.learned.belief' });
    expect(배운줄검사({ rows: [글자수, 글자수] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.1.key' });
  });

  it('열쇠 앞머리가 종류의 소문자이고 쪽지는 note:쪽지 하나뿐이다', () => {
    expect(배운줄검사({ rows: [{ ...글자수, key: 'rule:글쓰기-글자수' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.key' });
    expect(배운줄검사({ rows: [{ ...글자수, key: 'input:' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.key' });
    expect(배운줄검사({ rows: [{ ...쪽지, key: 'note:둘째' }] })).toEqual({ error: 'BAD_LEARNED', detail: 'rows.0.key' });
    expect(배운줄검사({ rows: [글자수, 물음, 쪽지] })).not.toHaveProperty('error');
  });

  it('한 번에 5,000줄까지 받고, 화면 없는 줄은 null · learned null 은 지울 줄이다', () => {
    const 줄들 = (n: number) => Array.from({ length: n }, (_, i) => ({ ...물음, key: `ask:물음-${String(i)}` }));
    expect(배운줄검사({ rows: 줄들(5_000) })).not.toHaveProperty('error');
    expect(배운줄검사({ rows: 줄들(5_001) })).toEqual({ error: 'BAD_LEARNED', detail: 'rows' });
    expect(배운줄검사({ rows: [물음, { ...글자수, learned: null }] })).toEqual({
      rows: [{ ...물음, screen: null }, { ...글자수, learned: null }],
    });
  });
});

describe.skipIf(연결 === undefined)('앱 배운 것 에이전트 통로', () => {
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
       VALUES ($1, 'AUTHOR', '{}', 'xal', '검사', 'RUNNING', $2) RETURNING id`,
      [서비스, 에이전트],
    );
    return Number(r.rows[0]!.id);
  };
  const 치우기 = async () => {
    await q('DELETE FROM app_learned WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };
  const 주소 = (id: number) => `/api/authoring/requests/${String(id)}/app-learned`;
  const 올리기 = (id: number, 몸: object) => app.inject({ method: 'PUT', url: 주소(id), payload: 몸 });
  const 글 = async (id: number) => (await app.inject({ method: 'GET', url: 주소(id) })).json<{ text: string }>().text;

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XAL 앱 배운 것 검사용', '#3A5FCD', '', 'xal', 'APP') RETURNING id`,
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

  it('Android 앱이 아니면(게임 · 웹) 400 NOT_APP_SERVICE', async () => {
    const id = await 요청넣기();
    try {
      for (const 바꿈 of [`kind = 'GAME', game_platform = 'android'`, `kind = 'SCREEN', game_platform = NULL`]) {
        await q(`UPDATE service SET ${바꿈} WHERE id = $1`, [서비스]);
        const r = await 올리기(id, { rows: [물음] });
        expect([r.statusCode, r.json()]).toEqual([400, { error: 'NOT_APP_SERVICE' }]);
        expect((await app.inject({ method: 'GET', url: 주소(id) })).statusCode).toBe(400);
      }
    } finally {
      await q(`UPDATE service SET kind = 'APP', game_platform = NULL WHERE id = $1`, [서비스]);
    }
  });

  it('끝난 요청에는 409 NOT_RUNNING', async () => {
    const id = await 요청넣기();
    await q(`UPDATE authoring_request SET status = 'DONE' WHERE id = $1`, [id]);
    const r = await 올리기(id, { rows: [물음] });
    expect([r.statusCode, r.json()]).toEqual([409, { error: 'NOT_RUNNING', detail: 'DONE' }]);
  });

  it('올린 줄만 넣고, 같은 열쇠는 통째로 바꾸며, learned null 은 그 줄을 지운다', async () => {
    const id = await 요청넣기();
    expect((await 올리기(id, { rows: [글자수, 물음, 쪽지] })).statusCode).toBe(204);
    const 다시 = { ...글자수, name: '글자 수 한도', screen: undefined, learned: { text: '한도는 500자다', belief: 'SEEN', seen: 1 } };
    expect((await 올리기(id, { rows: [다시, { ...물음, learned: null }, { ...물음, key: 'ask:없는-줄', learned: null }] })).statusCode).toBe(204);
    const r = await q<{ key: string; kind: string; name: string; screen_key: string | null; learned: unknown }>(
      'SELECT key, kind, name, screen_key, learned FROM app_learned WHERE service_id = $1 ORDER BY key COLLATE "C"',
      [서비스],
    );
    expect(r.rows).toEqual([
      { key: 'input:글쓰기-글자수', kind: 'INPUT', name: '글자 수 한도', screen_key: null, learned: 다시.learned },
      { key: 'note:쪽지', kind: 'NOTE', name: 쪽지.name, screen_key: null, learned: 쪽지.learned },
    ]);
    const 틀림 = await 올리기(id, { rows: [{ ...글자수, learned: { ...글자수.learned, seen: 1 } }] });
    expect([틀림.statusCode, 틀림.json()]).toEqual([400, { error: 'BAD_LEARNED', detail: 'rows.0.learned.seen' }]);
  });

  it('배운 것 글은 종류마다 열쇠 차례로 한 줄씩 — 화면이 없으면 그 칸을 빼고 배움 JSON 은 맨 끝', async () => {
    const id = await 요청넣기();
    expect(await 글(id)).toBe('# 앱 배운 것 — 줄 0개. 기대값의 근거가 아니다\n');
    const 규칙 = { kind: 'RULE', key: 'rule:좋아요-되돌리기', name: '좋아요 두 번', screen: 'app:.MainActivity/홈', learned: { text: '두 번 누르면 좋아요가 풀린다 · 숫자도 1 줄어든다', belief: 'SEEN', seen: 1 } };
    await 올리기(id, { rows: [쪽지, 물음, 글자수, 규칙] });
    // jsonb 는 키 차례를 바꿔 저장한다 — 배움 JSON 은 풀어서 견준다
    const 풀기 = (줄: string) => (줄.includes(' · 배움 ') ? [줄.slice(0, 줄.indexOf(' · 배움 ')), JSON.parse(줄.slice(줄.indexOf(' · 배움 ') + ' · 배움 '.length))] : [줄]);
    expect((await 글(id)).split('\n').map(풀기)).toEqual(
      [
        ['# 앱 배운 것 — 줄 4개. 기대값의 근거가 아니다'],
        [''],
        ['## 규칙 (RULE) — 1줄'],
        ['- rule:좋아요-되돌리기 · 좋아요 두 번 · 화면 app:.MainActivity/홈', 규칙.learned],
        [''],
        ['## 입력 (INPUT) — 1줄'],
        ['- input:글쓰기-글자수 · 글쓰기 글자 수 한도 · 화면 app:.ComposeActivity/글쓰기', 글자수.learned],
        [''],
        ['## 궁금한 것 (ASK) — 1줄'],
        ['- ask:예약-게시 · 예약 게시가 있나', 물음.learned],
        [''],
        ['## 쪽지 (NOTE) — 1줄'],
        ['- note:쪽지 · 다음 세션에게', 쪽지.learned],
        [''],
      ],
    );
  });
});
