// 열린 작성이 있으면 새 테스트 만들기를 409 AUTHORING_OPEN 으로 거절하는지 본다 (도메인/작성 §3.6 「★ 결정 목록」 「서버 막기」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAssetRoutes from './assets.js';
import { 열린작성, 케이스쓴열린작성 } from './openRoots.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWD';

describe.skipIf(연결 === undefined)('서버 막기 — 열린 작성', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 부르기 = (주소: string, payload: object = {}) =>
    app.inject({ method: 'POST', url: `/api${주소}?service=${접두사}`, payload });
  const 넣기 = async (칸: { kind?: string; status: string; source?: number; result?: object }): Promise<number> => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, result, stop_reason, stopped_by)
       VALUES ($1, $2, $3, '{}', 'xwd', '검사', $4, $5, CASE WHEN $4 = 'STOPPED' THEN 'USER' END, CASE WHEN $4 = 'STOPPED' THEN 'xwd' END)
       RETURNING id`,
      [서비스, 칸.kind ?? 'AUTHOR', 칸.source ?? null, 칸.status, 칸.result === undefined ? null : JSON.stringify(칸.result)],
    );
    return Number(r.rows[0]!.id);
  };
  const 치우기 = async () => {
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xwd')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 서버 막기 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 'xwd', displayName: '검사', services: [] } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAssetRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(치우기);

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('열린 작성은 대기 · 도는 중 · 끝났고 반영 전 · 반영 중 · 반영 실패 · 고치기이고, 작성 실패 · 중단 · 초안 · 병합 · 폐기는 아니다', async () => {
    const 대기 = await 넣기({ status: 'PENDING' });
    const 도는 = await 넣기({ status: 'RUNNING' });
    const 끝남 = await 넣기({ status: 'DONE' });
    const 반영중 = await 넣기({ status: 'DONE' });
    await 넣기({ kind: 'MERGE', status: 'RUNNING', source: 반영중 });
    const 반영실패 = await 넣기({ status: 'DONE' });
    await 넣기({ kind: 'MERGE', status: 'FAILED', source: 반영실패 });
    const 다시도는 = await 넣기({ status: 'FAILED' });
    await 넣기({ kind: 'RERUN', status: 'PENDING', source: 다시도는 });
    const 고치기 = await 넣기({ kind: 'EDIT', status: 'DONE' });
    const 병합 = await 넣기({ status: 'DONE' });
    await 넣기({ kind: 'MERGE', status: 'DONE', source: 병합 });
    await 넣기({ status: 'FAILED' });
    await 넣기({ status: 'STOPPED' });
    await 넣기({ status: 'DRAFT' });
    const 폐기 = await 넣기({ status: 'DONE' });
    await q('UPDATE authoring_request SET discarded_at = now() WHERE id = $1', [폐기]);

    expect(await 열린작성(서비스)).toEqual([대기, 도는, 끝남, 반영중, 반영실패, 다시도는, 고치기]);
    expect(await 열린작성(서비스, undefined, 끝남)).not.toContain(끝남);
  });

  it('새 작성 · 제출 · 다른 요청의 재실행을 거절하고, 그 요청 자신의 재실행은 받는다', async () => {
    const 열린 = await 넣기({ status: 'DONE' });
    const 실패 = await 넣기({ status: 'FAILED' });
    const 초안 = await 넣기({ status: 'DRAFT' });
    await q(`INSERT INTO authoring_asset (request_id, position, kind, name, figma_url) VALUES ($1, 1, 'FIGMA', $2, $2)`, [
      초안,
      'https://www.figma.com/design/abc/xwd',
    ]);

    const 새 = await 부르기('/authoring/requests', { kind: 'AUTHOR' });
    expect([새.statusCode, 새.json()]).toEqual([409, { error: 'AUTHORING_OPEN', detail: [열린] }]);
    const 제출 = await app.inject({ method: 'POST', url: `/api/authoring/requests/${String(초안)}/submit` });
    expect([제출.statusCode, 제출.json()]).toEqual([409, { error: 'AUTHORING_OPEN', detail: [열린] }]);
    expect((await q<{ status: string }>('SELECT status FROM authoring_request WHERE id = $1', [초안])).rows[0]?.status).toBe('DRAFT');
    const 남의재실행 = await 부르기('/authoring/requests', { kind: 'RERUN', sourceId: 실패 });
    expect([남의재실행.statusCode, 남의재실행.json()]).toEqual([409, { error: 'AUTHORING_OPEN', detail: [열린] }]);

    expect((await 부르기('/authoring/requests', { kind: 'RERUN', sourceId: 열린 })).statusCode).toBe(201);
    await q('UPDATE authoring_request SET discarded_at = now() WHERE service_id = $1 AND id <> $2', [서비스, 초안]);
    expect((await 부르기('/authoring/requests', { kind: 'AUTHOR' })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: `/api/authoring/requests/${String(초안)}/submit` })).statusCode).toBe(200);
  });

  it('케이스 고치기를 막는 열린 작성은 그 케이스를 이미 다 쓴 것뿐이다 — 도는 중인 작성 · 병합된 작성은 안 막는다', async () => {
    const 케이스 = { cases: [{ tcId: 'XWD-001', name: '담기', file: 'tests/xwd/a.spec.ts', change: 'NEW', verifies: [], reqs: [] }] };
    const 끝남 = await 넣기({ status: 'DONE', result: 케이스 });
    const 반영중 = await 넣기({ status: 'DONE', result: 케이스 });
    await 넣기({ kind: 'MERGE', status: 'PENDING', source: 반영중 });
    const 다시도는 = await 넣기({ status: 'DONE', result: 케이스 });
    await 넣기({ kind: 'RERUN', status: 'RUNNING', source: 다시도는 });
    const 병합 = await 넣기({ status: 'DONE', result: 케이스 });
    await 넣기({ kind: 'MERGE', status: 'DONE', source: 병합 });
    await 넣기({ status: 'DONE', result: { cases: [{ ...케이스.cases[0], tcId: 'XWD-002' }] } });

    const { pool } = await import('../db/index.js');
    const 손 = await pool.connect();
    try {
      expect(await 케이스쓴열린작성(손, 서비스, ['XWD-001', 'XWD-009'])).toEqual([끝남, 반영중]);
      expect(await 케이스쓴열린작성(손, 서비스, ['XWD-009'])).toEqual([]);
    } finally {
      손.release();
    }
  });
});
