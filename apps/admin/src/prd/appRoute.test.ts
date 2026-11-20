// 앱 조작 맵 통로 — 본문 검사(한도 · 가르개 · 상태와 까닭) · Android 앱만 · 올린 줄만 넣고 고치기 · 지우기 · 빌드 번호 지키기 · 경로 검색이 읽는 맵 글 (도메인/작성 §7 app-route)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import prdAgentRoutes from './agentRoutes.js';
import { 맵줄검사 } from './appRoute.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAR';
const 에이전트 = 'xar-agent';
const 알림탭 = {
  kind: 'MOVE', fromKey: 'app:.MainActivity/홈', action: '「알림」 탭 누르기', toKey: 'app:.MainActivity/알림', durationMs: 800,
  fields: { fn: '홈.알림열기()', 누른곳: 'bottom_nav_notifications' }, status: 'OK', buildNo: '412',
};
const 남의글 = { kind: 'SETUP', fromKey: '다른 계정이 API 로 글 올리기', action: '타임라인에 남의 글 있음', helper: '남의글올리기', warning: '그 계정을 먼저 팔로우해야 보인다', status: 'OK' };
const 알림API = { kind: 'API', fromKey: 'app:.MainActivity/알림', action: 'GET /api/v1/notifications', status: 'OK' };
const 결제 = { kind: 'MOVE', fromKey: 'app:.CheckoutActivity/결제', action: '「구글 결제」 누르기', status: 'BLOCKED', reason: '다른 앱 결제 화면으로 넘어감' };

describe('앱 조작 맵 본문 검사', () => {
  it('칸이 틀리면 그 자리를 돌려준다', () => {
    expect(맵줄검사({})).toEqual({ error: 'BAD_ROUTE', detail: 'rows' });
    expect(맵줄검사({ rows: [{ ...남의글, kind: 'LOG' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.kind' });
    expect(맵줄검사({ rows: [{ ...남의글, kind: 'toString' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.kind' });
    expect(맵줄검사({ rows: [{ ...남의글, fromKey: ' ' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fromKey' });
    expect(맵줄검사({ rows: [{ ...남의글, action: 'x'.repeat(201) }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.action' });
    expect(맵줄검사({ rows: [{ ...남의글, toKey: 3 }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.toKey' });
    expect(맵줄검사({ rows: [{ ...남의글, durationMs: -1 }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.durationMs' });
    expect(맵줄검사({ rows: [{ ...남의글, durationMs: 1.5 }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.durationMs' });
    expect(맵줄검사({ rows: [{ ...남의글, warning: 'x'.repeat(501) }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.warning' });
    expect(맵줄검사({ rows: [{ ...남의글, fields: ['fn'] }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fields' });
    expect(맵줄검사({ rows: [{ ...남의글, fields: { 긴: 'x'.repeat(10_001) } }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fields' });
    expect(맵줄검사({ rows: [{ ...남의글, fields: { fn: '' } }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fields.fn' });
    expect(맵줄검사({ rows: [{ ...남의글, buildNo: 'x'.repeat(101) }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.buildNo' });
    expect(맵줄검사({ rows: [남의글, 남의글] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.1.action' });
    expect(맵줄검사({ rows: [남의글], remove: [{ kind: 'SETUP', fromKey: 남의글.fromKey, action: 남의글.action }] })).toEqual({ error: 'BAD_ROUTE', detail: 'remove.0' });
    expect(맵줄검사({ rows: [], remove: [{ kind: 'SETUP', fromKey: 남의글.fromKey }] })).toEqual({ error: 'BAD_ROUTE', detail: 'remove.0' });
  });

  it('한 번에 5,000줄까지 받는다 — crawl 한 번의 이동 · API 줄이 한 본문에 든다', () => {
    const 줄들 = (n: number) => Array.from({ length: n }, (_, i) => ({ ...알림API, action: `GET /api/v1/x${String(i)}` }));
    expect(맵줄검사({ rows: 줄들(5_000) })).not.toHaveProperty('error');
    expect(맵줄검사({ rows: 줄들(5_001) })).toEqual({ error: 'BAD_ROUTE', detail: 'rows' });
  });

  it('맵 글을 한 줄씩 자르는 가르개(줄바꿈 · 「 · 」 · 「 → 」)와 NUL 은 글 칸에 못 넣는다', () => {
    expect(맵줄검사({ rows: [{ ...알림탭, action: '「알림」 탭\n누르기' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.action' });
    expect(맵줄검사({ rows: [{ ...남의글, warning: '팔로우 · 먼저' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.warning' });
    expect(맵줄검사({ rows: [{ ...알림탭, action: '홈 → 알림' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.action' });
    expect(맵줄검사({ rows: [{ ...알림탭, fromKey: 'app:.MainActivity/홈 ' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fromKey' });
    expect(맵줄검사({ rows: [{ ...알림탭, toKey: '→ app:.MainActivity/알림' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.toKey' });
    expect(맵줄검사({ rows: [{ ...남의글, helper: '남의\u0000글' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.helper' });
    expect(맵줄검사({ rows: [{ ...알림탭, fields: { 누른곳: 'bottom\u0000nav' } }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.fields' });
  });

  it('AI 는 확인 · 진행 불가만 올리고 까닭은 진행 불가에만 꼭 있다 · 탐색 때는 fields.fn 이 null 이어도 된다', () => {
    expect(맵줄검사({ rows: [{ ...남의글, status: 'RECHECK' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.status' });
    expect(맵줄검사({ rows: [{ ...결제, reason: undefined }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.reason' });
    expect(맵줄검사({ rows: [{ ...남의글, reason: '이유' }] })).toEqual({ error: 'BAD_ROUTE', detail: 'rows.0.reason' });
    expect(맵줄검사({ rows: [{ ...알림탭, fields: { fn: null } }] })).not.toHaveProperty('error');
  });

  it('빈 칸은 null 로 채우고 remove 는 없으면 빈 목록이다', () => {
    expect(맵줄검사({ rows: [결제] })).toEqual({
      rows: [{ ...결제, toKey: null, helper: null, durationMs: null, warning: null, fields: null, buildNo: null }],
      remove: [],
    });
  });
});

describe.skipIf(연결 === undefined)('앱 조작 맵 에이전트 통로', () => {
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
       VALUES ($1, 'AUTHOR', '{}', 'xar', '검사', 'RUNNING', $2) RETURNING id`,
      [서비스, 에이전트],
    );
    return Number(r.rows[0]!.id);
  };
  const 치우기 = async () => {
    await q('DELETE FROM app_route WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };
  const 주소 = (id: number) => `/api/authoring/requests/${String(id)}/app-route`;
  const 올리기 = (id: number, 몸: object) => app.inject({ method: 'PUT', url: 주소(id), payload: 몸 });
  const 맵 = async (id: number) => (await app.inject({ method: 'GET', url: 주소(id) })).json<{ text: string }>().text;

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XAR 앱 조작 맵 검사용', '#3A5FCD', '', 'xar', 'APP') RETURNING id`,
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
        const r = await 올리기(id, { rows: [남의글] });
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
    const r = await 올리기(id, { rows: [남의글] });
    expect([r.statusCode, r.json()]).toEqual([409, { error: 'NOT_RUNNING', detail: 'DONE' }]);
  });

  it('올린 줄만 넣고 고치며 remove 는 지우고, 빈 칸은 지난 값을 지키며 fields 는 열쇠마다 덮는다', async () => {
    const id = await 요청넣기();
    expect((await 올리기(id, { rows: [알림탭, 남의글, 결제] })).statusCode).toBe(204);
    const 함수만 = { kind: 'MOVE', fromKey: 알림탭.fromKey, action: 알림탭.action, fields: { fn: '홈.알림탭()' }, status: 'OK' };
    expect((await 올리기(id, { rows: [함수만], remove: [{ kind: 'MOVE', fromKey: 결제.fromKey, action: 결제.action }] })).statusCode).toBe(204);
    const r = await q<{ kind: string; to_key: string | null; duration_ms: number | null; warning: string | null; fields: unknown; build_no: string | null }>(
      'SELECT kind, to_key, duration_ms, warning, fields, build_no FROM app_route WHERE service_id = $1 ORDER BY kind',
      [서비스],
    );
    expect(r.rows).toEqual([
      { kind: 'MOVE', to_key: 'app:.MainActivity/알림', duration_ms: 800, warning: null, fields: { fn: '홈.알림탭()', 누른곳: 'bottom_nav_notifications' }, build_no: '412' },
      { kind: 'SETUP', to_key: null, duration_ms: null, warning: 남의글.warning, fields: null, build_no: null },
    ]);
    const 틀림 = await 올리기(id, { rows: [{ ...남의글, fromKey: '' }] });
    expect([틀림.statusCode, 틀림.json()]).toEqual([400, { error: 'BAD_ROUTE', detail: 'rows.0.fromKey' }]);
  });

  it('빌드 번호 없는 확인은 「다시 확인」 · 지난 빌드를 지키고, 빌드를 실은 확인 · 진행 불가는 그것을 바꾼다', async () => {
    const id = await 요청넣기();
    await 올리기(id, { rows: [알림탭, 결제] });
    await q(`UPDATE app_route SET status = 'RECHECK' WHERE service_id = $1`, [서비스]);
    const { buildNo: _빌드, ...빌드없는탭 } = 알림탭;
    const 상태 = async () =>
      (await q<{ action: string; status: string; reason: string | null; build_no: string | null }>(
        'SELECT action, status, reason, build_no FROM app_route WHERE service_id = $1 ORDER BY action COLLATE "C"', [서비스],
      )).rows;
    await 올리기(id, { rows: [{ ...빌드없는탭, durationMs: 700 }, { ...결제, status: 'OK', reason: undefined }] });
    expect(await 상태()).toEqual([
      { action: '「구글 결제」 누르기', status: 'RECHECK', reason: null, build_no: null },
      { action: '「알림」 탭 누르기', status: 'RECHECK', reason: null, build_no: '412' },
    ]);
    await 올리기(id, { rows: [{ ...알림탭, buildNo: '413' }, 결제] });
    expect(await 상태()).toEqual([
      { action: '「구글 결제」 누르기', status: 'BLOCKED', reason: 결제.reason, build_no: null },
      { action: '「알림」 탭 누르기', status: 'OK', reason: null, build_no: '413' },
    ]);
  });

  it('맵 글은 종류마다 한 줄씩 — 상태 · 빌드 · 소요 · 도우미 · 함수 · 경고, 나머지 칸은 맨 끝 JSON', async () => {
    const id = await 요청넣기();
    expect(await 맵(id)).toBe('# 앱 조작 맵 — 줄 0개. 「어떻게 가나」만 담는다 — 기대값의 근거가 아니다\n');
    const 용어 = { kind: 'TERM', fromKey: '툿', action: '「게시」', toKey: 'app:.ComposeActivity/글쓰기', status: 'OK' };
    const 평점 = { kind: 'POPUP', fromKey: '평점 요청 창', action: '「나중에」 누르기', status: 'OK' };
    await 올리기(id, { rows: [알림탭, 남의글, 알림API, 결제, 용어, 평점] });
    await q(`UPDATE app_route SET status = 'RECHECK' WHERE service_id = $1 AND kind = 'API'`, [서비스]);
    expect(await 맵(id)).toBe(
      [
        '# 앱 조작 맵 — 줄 6개. 「어떻게 가나」만 담는다 — 기대값의 근거가 아니다',
        '',
        '## 이동 (MOVE) — 2줄',
        '- app:.CheckoutActivity/결제 → 「구글 결제」 누르기 · 진행 불가 — 다른 앱 결제 화면으로 넘어감',
        '- app:.MainActivity/홈 → 「알림」 탭 누르기 → app:.MainActivity/알림 · 확인 · 빌드 412 · 소요 800ms · 함수 홈.알림열기() · 칸 {"누른곳":"bottom_nav_notifications"}',
        '',
        '## 데이터 세팅 (SETUP) — 1줄',
        '- 다른 계정이 API 로 글 올리기 → 타임라인에 남의 글 있음 · 확인 · 도우미 남의글올리기 · ⚠ 그 계정을 먼저 팔로우해야 보인다',
        '',
        '## API (API) — 1줄',
        '- app:.MainActivity/알림 → GET /api/v1/notifications · 다시 확인',
        '',
        '## 용어 (TERM) — 1줄',
        '- 툿 → 「게시」 → app:.ComposeActivity/글쓰기 · 확인',
        '',
        '## 돌발 팝업 (POPUP) — 1줄',
        '- 평점 요청 창 → 「나중에」 누르기 · 확인',
      ].join('\n') + '\n',
    );
  });
});
