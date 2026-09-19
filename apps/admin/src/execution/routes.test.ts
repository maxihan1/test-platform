// 실행 API가 SPEC §7의 경로와 응답 형태를 지키는지 본다.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import executionRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;

const 케이스 = `
  INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (tc_id) DO UPDATE SET param_schema = EXCLUDED.param_schema, expected_schema = EXCLUDED.expected_schema`;

const 입력스키마 = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, description: '글 제목' },
    userId: { type: 'number', default: 7, description: '작성자 번호' },
  },
  required: ['title'],
};

const 기대스키마 = {
  type: 'object',
  properties: { statusCode: { type: 'number', default: 201, description: '응답 코드' } },
};

describe.skipIf(연결 === undefined)('ParamSet API', () => {
  let app: FastifyInstance;
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await pool.query("DELETE FROM param_set WHERE tc_id LIKE 'XBR%'");
    await pool.query(케이스, [
      'XBR-002',
      '입력값이 있는 케이스',
      JSON.stringify(['desktop']),
      JSON.stringify([]),
      'demo/XBR-002.spec.ts',
      JSON.stringify(입력스키마),
      JSON.stringify(기대스키마),
    ]);

    app = Fastify();
    await app.register(executionRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM param_set WHERE tc_id LIKE 'XBR%'");
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'XBR%'");
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('POST /api/cases/:tcId/param-sets — 스키마에 맞으면 저장한다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '기본값 묶음', params: { title: '제목', userId: 3 }, expected: { statusCode: 201 } },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(typeof body.id).toBe('number');
    expect(body.name).toBe('기본값 묶음');
    expect(body.params).toEqual({ title: '제목', userId: 3 });
  });

  it('GET /api/cases/:tcId/param-sets — 저장한 묶음이 목록에 나온다', async () => {
    const body = (await app.inject({ method: 'GET', url: '/api/cases/XBR-002/param-sets' })).json();
    expect(body.items.map((i: { name: string }) => i.name)).toContain('기본값 묶음');
  });

  it('입력값이 스키마와 어긋나면 400과 칸별 사유를 돌려준다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '어긋난 묶음', params: { title: '', userId: '셋' }, expected: {} },
    });
    expect(res.statusCode).toBe(400);

    const body = res.json();
    expect(body.error).toBe('INVALID_PARAMS');
    expect(body.violations.map((v: { path: string }) => v.path).sort()).toEqual(['title', 'userId']);
    expect(body.violations[0].message).toContain('글 제목');
  });

  it('기대값도 expected_schema로 검증한다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '기대값이 어긋난 묶음', params: { title: '제목' }, expected: { statusCode: '이백일' } },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().violations[0].path).toBe('statusCode');
  });

  it('반드시 채워야 하는 칸이 비면 저장하지 않는다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '빈 묶음', params: {}, expected: {} },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().violations[0].path).toBe('title');
  });

  it('같은 이름으로 또 저장하면 409로 거절한다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-002/param-sets',
      payload: { name: '기본값 묶음', params: { title: '다른 제목' }, expected: {} },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('DUPLICATE_NAME');
  });

  it('없는 케이스에는 저장하지 않는다', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/XBR-404/param-sets',
      payload: { name: '아무거나', params: {}, expected: {} },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('CASE_NOT_FOUND');
  });

  it('DELETE /api/param-sets/:id — 지우면 목록에서 사라진다', async () => {
    const 만든것 = (
      await app.inject({
        method: 'POST',
        url: '/api/cases/XBR-002/param-sets',
        payload: { name: '지울 묶음', params: { title: '제목' }, expected: {} },
      })
    ).json();

    const res = await app.inject({ method: 'DELETE', url: `/api/param-sets/${만든것.id}` });
    expect(res.statusCode).toBe(204);

    const body = (await app.inject({ method: 'GET', url: '/api/cases/XBR-002/param-sets' })).json();
    expect(body.items.map((i: { name: string }) => i.name)).not.toContain('지울 묶음');
  });

  it('없는 묶음을 지우려 하면 404다', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/param-sets/999999999' });
    expect(res.statusCode).toBe(404);
  });

  // 검사 없이 지나가던 자리들이다. Number('abc')는 NaN 이고 Number.isInteger(1e21)은 true다 —
  // 둘 다 그대로 Postgres 로 가면 잡히지 않은 500 이 된다
  it('경로의 번호가 정수 범위를 벗어나면 500이 아니라 400이다', async () => {
    for (const 값 of ['abc', '1e21', '0', '-1']) {
      const 자리들 = [
        { method: 'POST' as const, url: `/api/runs/${값}/abort` },
        { method: 'GET' as const, url: `/api/runs/${값}` },
        { method: 'GET' as const, url: `/api/runs/${값}/items/1` },
        { method: 'GET' as const, url: `/api/runs/1/items/${값}` },
        { method: 'DELETE' as const, url: `/api/param-sets/${값}` },
      ];
      for (const 자리 of 자리들) {
        const res = await app.inject(자리);
        expect(res.statusCode, `${자리.method} ${자리.url}`).toBe(400);
        expect(res.json().error, `${자리.method} ${자리.url}`).toBe('INVALID_REQUEST');
      }
    }
  });
});
