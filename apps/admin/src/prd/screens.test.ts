// 작성 에이전트의 화면 기록 통로 — 문턱 · 올리기(같은 키 바꾸기 · 연결 갈아 끼우기) · 다 본 상태만 지우기 (도메인/작성 §7 「표준 기획서 통로」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import prdAgentRoutes from './agentRoutes.js';
import { 다봄검사, 화면검사 } from './screens.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XHG';
const 에이전트 = 'xhg-agent';
const 화면 = (state: string, url: string, record = `# https://x.test${url.replace(':n', '1')}\n본 것`) => ({
  state, url, name: `${url} 화면`, textFp: 'aaaaaaaaaaaa', structFp: 'bbbbbbbbbbbb', record, crawledAt: '2026-10-01T00:00:00.000Z',
});

describe('화면 기록 본문 검사', () => {
  it('칸이 틀리면 그 칸 이름을 돌려준다', () => {
    expect(화면검사({ ...화면('로그인', '/cart'), state: '손님' })).toEqual({ error: 'BAD_SCREEN', detail: 'state' });
    expect(화면검사({ ...화면('로그인', '/cart'), textFp: 'XYZ' })).toEqual({ error: 'BAD_SCREEN', detail: 'textFp' });
    expect(화면검사({ ...화면('로그인', '/cart'), record: 'x'.repeat(200_001) })).toEqual({ error: 'BAD_SCREEN', detail: 'record' });
    expect(화면검사({ ...화면('로그인', '/cart'), crawledAt: '어제' })).toEqual({ error: 'BAD_SCREEN', detail: 'crawledAt' });
    expect(화면검사({ ...화면('로그인', '/cart'), links: [{ toUrl: '/a', via: '' }] })).toEqual({ error: 'BAD_SCREEN', detail: 'links.0.via' });
    expect(다봄검사({ seen: [], complete: true })).toEqual({ error: 'BAD_SCREEN', detail: 'complete' });
    expect(다봄검사({ seen: [{ state: '로그인' }], complete: [] })).toEqual({ error: 'BAD_SCREEN', detail: 'seen.0' });
  });
});

describe.skipIf(연결 === undefined)('화면 기록 에이전트 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 에이전트;
  const 원래 = process.env.AUTHORING_AGENT_USER;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 요청넣기 = async (status: string) => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by)
       VALUES ($1, 'AUTHOR', '{}', 'xhg', '검사', $2, $3) RETURNING id`,
      [서비스, status, 에이전트],
    );
    return Number(r.rows[0]!.id);
  };
  const 치우기 = async () => {
    await q('DELETE FROM screen_link WHERE service_id = $1', [서비스]);
    await q('DELETE FROM screen_record WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };
  const 올리기 = (id: number, 몸: object) => app.inject({ method: 'PUT', url: `/api/authoring/requests/${id}/screens`, payload: 몸 });
  const 차례 = <T extends { state: string }>(xs: T[]) => [...xs].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  // 정렬 차례는 DB 의 글자 정렬을 따른다 — 견줄 때는 이쪽에서 다시 줄 세운다
  const 읽기 = async (id: number) => {
    const 몸 = (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/screens` })).json() as { screens: { state: string }[]; links: { state: string }[] };
    return { screens: 차례(몸.screens), links: 차례(몸.links) };
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xhg')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 화면 기록 통로 검사용`],
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
    const id = await 요청넣기('RUNNING');
    부르는이 = 'xhg-person';
    expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}/screens` })).json()).toEqual({ error: 'NOT_AUTHORING_AGENT' });
    부르는이 = 에이전트;
    const 끝난것 = await 요청넣기('DONE');
    const r = await 올리기(끝난것, 화면('로그인', '/cart'));
    expect([r.statusCode, r.json()]).toEqual([409, { error: 'NOT_RUNNING', detail: 'DONE' }]);
  });

  it('같은 상태 + 틀은 바꾸고 그 화면에서 나간 연결은 보낸 것으로 갈아 끼운다', async () => {
    const id = await 요청넣기('RUNNING');
    expect(await 읽기(id)).toEqual({ screens: [], links: [] });
    expect((await 올리기(id, { ...화면('로그인', '/board/:n'), links: [{ toUrl: '/cart', via: '담기' }, { toUrl: '/', via: '홈' }] })).statusCode).toBe(204);
    expect((await 올리기(id, 화면('로그아웃', '/board/:n'))).statusCode).toBe(204);
    const 바꿈 = { ...화면('로그인', '/board/:n', '# https://x.test/board/7\n바뀐 것'), textFp: 'cccccccccccc' };
    expect((await 올리기(id, { ...바꿈, links: [{ toUrl: '/cart', via: '담기' }, { toUrl: '/cart', via: '담기' }] })).statusCode).toBe(204);
    expect(await 읽기(id)).toEqual({
      screens: 차례([화면('로그아웃', '/board/:n'), 바꿈]),
      links: [{ state: '로그인', fromUrl: '/board/:n', toUrl: '/cart', via: '담기' }],
    });
    const 틀림 = await 올리기(id, { ...화면('로그인', '/cart'), structFp: '' });
    expect([틀림.statusCode, 틀림.json()]).toEqual([400, { error: 'BAD_SCREEN', detail: 'structFp' }]);
  });

  it('다 본 상태에서 못 본 화면만 지운다 — 다 본 상태가 비면 안 지우고, 다른 상태 기록은 남는다', async () => {
    const id = await 요청넣기('RUNNING');
    for (const [s, u] of [['로그아웃', '/'], ['로그아웃', '/old'], ['로그인', '/'], ['로그인', '/mypage']] as const) {
      await 올리기(id, { ...화면(s, u), links: [{ toUrl: '/x', via: '이동' }] });
    }
    const 다봄 = (몸: object) => app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/screens/done`, payload: 몸 });
    const 본것 = [{ state: '로그아웃', url: '/' }];
    expect((await 다봄({ seen: 본것, complete: [] })).json()).toEqual({ deleted: 0 });
    expect((await 다봄({ seen: 본것, complete: ['로그아웃'] })).json()).toEqual({ deleted: 1 });
    const 남은것 = await 읽기(id);
    const 키들 = (xs: object[]) => xs.map((x) => Object.values(x).slice(0, 2).join(' ')).sort();
    expect(키들(남은것.screens)).toEqual(['로그아웃 /', '로그인 /', '로그인 /mypage']);
    expect(키들(남은것.links)).toEqual(['로그아웃 /', '로그인 /', '로그인 /mypage']);
  });
});
