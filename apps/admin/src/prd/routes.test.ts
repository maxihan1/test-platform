// 표준 기획서 API 가 도메인/작성 §7 「표준 기획서 통로」의 경로 · 응답 · 거절을 지키는지 본다. 문 없이 라우트만 띄운다

import Fastify, { type FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringRoutes from '../authoring/routes.js';
import prdRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPR';
const 근거 = [{ from: '기획서.docx', ref: 'REQ-CART-1', quote: '장바구니는 20개까지 담는다' }];
const 항목 = (text: string, 덧: Record<string, unknown> = {}) => ({ feature: '장바구니', text, basis: 근거, status: 'CONFIRMED', ...덧 });

describe.skipIf(연결 === undefined)('표준 기획서 API', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 부르기 = (method: 'GET' | 'PUT' | 'POST', 주소: string, payload?: object) =>
    app.inject({ method, url: `/api${주소}${주소.includes('?') ? '&' : '?'}service=${접두사}`, ...(payload ? { payload } : {}) });

  const 치우기 = async () => {
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xpr')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 표준 기획서 API 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    app = Fastify();
    await app.register(prdRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(치우기);

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('표준 기획서가 없으면 판 0 과 빈 칸들이다. 서비스가 없으면 400', async () => {
    const r = await 부르기('GET', '/prd');
    expect(r.json()).toEqual({
      version: 0,
      items: [],
      cases: {},
      unapplied: { changed: [], added: [], removed: [] },
      needsCheck: { count: 0, oldestSince: null },
    });
    expect((await app.inject({ method: 'GET', url: '/api/prd' })).json()).toEqual({ error: 'SERVICE_REQUIRED' });
  });

  it('저장하면 서버가 번호를 매기고, 낡은 판 · 틀린 항목 · 지어낸 번호는 거절한다', async () => {
    expect((await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('20개까지'), 항목('비면 안내', { status: 'NEEDS_CHECK' })] })).json()).toEqual({ version: 1 });
    const 지금 = (await 부르기('GET', '/prd')).json();
    expect(지금).toMatchObject({
      version: 1,
      items: [{ reqId: 'XPR-REQ-001', byPerson: true }, { reqId: 'XPR-REQ-002', status: 'NEEDS_CHECK' }],
      unapplied: { added: ['XPR-REQ-001', 'XPR-REQ-002'] },
      needsCheck: { count: 1 },
    });

    const 낡음 = await 부르기('PUT', '/prd', { baseVersion: 0, items: [] });
    expect([낡음.statusCode, 낡음.json()]).toEqual([409, { error: 'PRD_STALE', latest: 1 }]);
    const 틀림 = await 부르기('PUT', '/prd', { baseVersion: 1, items: [항목('')] });
    expect([틀림.statusCode, 틀림.json()]).toEqual([400, { error: 'BAD_PRD', detail: '0.text' }]);
    const 지어냄 = await 부르기('PUT', '/prd', { baseVersion: 1, items: [항목('x', { reqId: 'XPR-REQ-007' })] });
    expect([지어냄.statusCode, 지어냄.json()]).toEqual([400, { error: 'PRD_REUSED', detail: 'XPR-REQ-007' }]);
    expect((await 부르기('PUT', '/prd', { items: [] })).json()).toEqual({ error: 'BAD_PRD', detail: 'baseVersion' });
  });

  it('999 항목이 1MiB 를 넘어도 받는다', async () => {
    const items = Array.from({ length: 999 }, () => 항목('가'.repeat(900)));
    expect(Buffer.byteLength(JSON.stringify(items))).toBeGreaterThan(1024 * 1024);
    const r = await 부르기('PUT', '/prd', { baseVersion: 0, items });
    expect([r.statusCode, r.json()]).toEqual([200, { version: 1 }]);
  });

  it('판 이력 · 그 판 통째 · 일괄 확정 · 되돌리기', async () => {
    await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('20개까지', { status: 'NEEDS_CHECK' })] });
    const 확정 = await 부르기('POST', '/prd/confirm', { baseVersion: 1, reqIds: ['XPR-REQ-001'] });
    expect(확정.json()).toEqual({ version: 2 });
    const 또 = await 부르기('POST', '/prd/confirm', { baseVersion: 2, reqIds: ['XPR-REQ-001'] });
    expect([또.statusCode, 또.json()]).toEqual([400, { error: 'BAD_CONFIRM', detail: 'XPR-REQ-001' }]);

    expect((await 부르기('POST', '/prd/revert', { baseVersion: 2, toVersion: 1 })).json()).toEqual({ version: 3 });
    const 없음 = await 부르기('POST', '/prd/revert', { baseVersion: 3, toVersion: 9 });
    expect([없음.statusCode, 없음.json()]).toEqual([404, { error: 'NOT_FOUND' }]);

    const 이력 = (await 부르기('GET', '/prd/versions')).json() as { version: number; source: string }[];
    expect(이력.map((x) => [x.version, x.source])).toEqual([[3, 'REVERT'], [2, 'PERSON'], [1, 'PERSON']]);
    expect((await 부르기('GET', '/prd/versions/1')).json()).toMatchObject({ version: 1, items: [{ status: 'NEEDS_CHECK' }] });
    expect((await 부르기('GET', '/prd/versions/9')).statusCode).toBe(404);
  });

  it('반영은 자료 없는 작성 요청을 곧장 줄에 세우고, 반영 안 됨이 0 이면 409', async () => {
    const 없음 = await 부르기('POST', '/prd/apply');
    expect([없음.statusCode, 없음.json()]).toEqual([409, { error: 'NOTHING_TO_APPLY' }]);
    await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('20개까지')] });
    const r = await 부르기('POST', '/prd/apply');
    expect(r.statusCode).toBe(201);
    const 행 = await q<{ kind: string; status: string; params: object }>('SELECT kind, status, params FROM authoring_request WHERE id = $1', [
      (r.json() as { id: number }).id,
    ]);
    expect(행.rows[0]).toEqual({ kind: 'AUTHOR', status: 'PENDING', params: { prdApply: true } });

    const 또 = await 부르기('POST', '/prd/apply');
    expect([또.statusCode, 또.json()]).toEqual([409, { error: 'APPLY_OPEN', detail: [(r.json() as { id: number }).id] }]);
    await q('UPDATE authoring_request SET discarded_at = now() WHERE service_id = $1', [서비스]);
    expect((await 부르기('POST', '/prd/apply')).statusCode).toBe(201);
  });

  it('작성 요청 통로로 prdApply 를 실으면 400, 반영 요청의 재실행은 prdApply 를 물려받는다', async () => {
    const 실음 = await app.inject({
      method: 'POST',
      url: `/api/authoring/requests?service=${접두사}`,
      payload: { kind: 'AUTHOR', params: { prdApply: true } },
    });
    expect([실음.statusCode, 실음.json()]).toEqual([400, { error: 'BAD_PRD_APPLY' }]);

    const 원본 = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', '{"prdApply": true}', 'xpr', '검사', 'DONE') RETURNING id`,
      [서비스],
    );
    const r = await app.inject({
      method: 'POST',
      url: `/api/authoring/requests?service=${접두사}`,
      payload: { kind: 'RERUN', sourceId: Number(원본.rows[0]!.id) },
    });
    expect(r.statusCode).toBe(201);
    const 행 = await q<{ params: object }>('SELECT params FROM authoring_request WHERE id = $1', [(r.json() as { id: number }).id]);
    expect(행.rows[0]?.params).toEqual({ prdApply: true });
  });

  it('워드는 지금 판을 싣고 그 서비스 테스트 계정 비밀번호를 가린다 · 판이 없으면 404 · docx 말고는 400', async () => {
    const 없음 = await 부르기('GET', '/prd/export?format=docx');
    expect([없음.statusCode, 없음.json()]).toEqual([404, { error: 'NOT_FOUND' }]);
    const 엑셀 = await 부르기('GET', '/prd/export?format=xlsx');
    expect([엑셀.statusCode, 엑셀.json()]).toEqual([400, { error: 'BAD_FORMAT' }]);

    await q(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password) VALUES ($1, 'qa', 'https://qa.xpr.test', 'tester', 'Xpr!secret9')`,
      [서비스],
    );
    await 부르기('PUT', '/prd', { baseVersion: 0, items: [항목('계정 Xpr!secret9 로 담는다')] });
    const r = await 부르기('GET', '/prd/export?format=docx');
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(r.headers['content-disposition']).toBe('attachment; filename="XPR-PRD-v1.docx"');
    const 본문 = await (await JSZip.loadAsync(r.rawPayload)).file('word/document.xml')!.async('string');
    expect(본문).toContain('XPR-REQ-001');
    expect(본문).toContain('계정 •••••• 로 담는다');
    expect(본문).not.toContain('Xpr!secret9');
  });
});
