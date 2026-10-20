// API 문서 통로가 도메인/API §7 의 경로 · 응답 · 거절을 지키는지 본다 — 판 올리기 · 지금 받기 · 판 비교 · 커버리지. 문 없이 라우트만 띄운다

import Fastify, { type FastifyInstance } from 'fastify';
import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import apiDocRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAD';
const 화면접두사 = 'XADS';

const 문서 = (판: string, 더할것: Record<string, unknown> = {}) => ({
  openapi: '3.1.0',
  info: { title: '알림', version: 판 },
  paths: {
    '/v1/pushes': {
      post: {
        responses: {
          '201': { content: { 'application/json': { schema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } } } },
          '400': { description: '틀림' },
        },
      },
    },
    ...더할것,
  },
});

describe.skipIf(연결 === undefined)('API 문서 통로', { timeout: 30_000 }, () => {
  let app: FastifyInstance;
  let 문서서버: Server;
  let 서비스 = 0;
  let 화면서비스 = 0;
  let 실행보임 = true;
  let 내줄것: { 코드: number; 글: string } = { 코드: 200, 글: '' };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 부르기 = (method: 'GET' | 'POST', 경로: string, id = 서비스) => app.inject({ method, url: `/api/services/${String(id)}${경로}` });
  const 올리기 = (몸: string | Buffer, 이름 = 'openapi.json') =>
    app.inject({
      method: 'POST',
      url: `/api/services/${String(서비스)}/api-docs?name=${encodeURIComponent(이름)}`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: 몸,
    });

  const 치우기 = async () => {
    await q('DELETE FROM api_call_seen WHERE service_id = $1', [서비스]);
    await q('DELETE FROM api_doc_version WHERE service_id = $1', [서비스]);
    await q("DELETE FROM test_case WHERE tc_id IN ('XAD-FN-001', 'XAD-FN-002')");
  };

  beforeAll(async () => {
    문서서버 = createServer((_req, res) => {
      res.writeHead(내줄것.코드, { 'content-type': 'application/json' });
      res.end(내줄것.글);
    });
    await new Promise<void>((r) => 문서서버.listen(0, '127.0.0.1', r));
    const 포트 = (문서서버.address() as AddressInfo).port;
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, api_doc_path, api_doc_env)
       VALUES ($1, 'XAD API 문서 검사용', '#3A5FCD', '', 'xad', 'API', '/openapi.json', 'stg') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
    await q("INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'stg', $2)", [서비스, `http://127.0.0.1:${String(포트)}/`]);
    const t = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, 'XADS 화면 검사용', '#3A5FCD', '', 'xads') RETURNING id`,
      [화면접두사],
    );
    화면서비스 = Number(t.rows[0]!.id);
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      const 권한 = { cases: 'none', runs: 실행보임 ? 'read' : 'none', authoring: 'write' } as const;
      req.user = {
        username: 'xad-person',
        displayName: '검사',
        services: [{ id: 서비스, prefix: 접두사, permissions: 권한 }],
      } as unknown as NonNullable<typeof req.user>;
    });
    await app.register(apiDocRoutes, { prefix: '/api' });
    await app.ready();
  }, 60_000);

  beforeEach(async () => {
    실행보임 = true;
    await 치우기();
  });

  afterAll(async () => {
    await app.close();
    await new Promise((r) => 문서서버.close(r));
    await 치우기();
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service WHERE id = ANY($1)', [[서비스, 화면서비스]]);
  }, 60_000);

  it('API 종류가 아니면 400 NOT_API_SERVICE · 없는 번호는 404 · 숫자가 아니면 400', async () => {
    expect((await 부르기('GET', '/api-docs', 화면서비스)).json()).toEqual({ error: 'NOT_API_SERVICE' });
    expect((await app.inject({ method: 'GET', url: '/api/services/9999999999/api-docs' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/services/1e3/api-docs' })).statusCode).toBe(400);
    expect((await 부르기('GET', '/api-docs/abc')).statusCode).toBe(400);
  });

  it('파일을 올리면 판 1 이고 같은 내용이면 판을 안 올린다 — 들여쓰기 · 키 차례만 달라도 같다', async () => {
    expect((await 부르기('GET', '/api-docs')).json()).toEqual({ docPath: '/openapi.json', docEnv: 'stg', versions: [] });
    const 첫 = await 올리기(JSON.stringify(문서('1')));
    expect(첫.statusCode).toBe(201);
    expect(첫.json()).toEqual({ version: 1, created: true });
    const { paths, info, openapi } = 문서('1');
    expect((await 올리기(JSON.stringify({ paths, info, openapi }, null, 2))).json()).toEqual({ version: 1, created: false });
    expect((await 올리기(JSON.stringify(문서('2')), '두번째.json')).json()).toEqual({ version: 2, created: true });

    const 목록 = (await 부르기('GET', '/api-docs')).json<{ versions: Record<string, unknown>[] }>();
    expect(목록.versions).toMatchObject([
      { version: 2, source: 'FILE', env: null, fileName: '두번째.json', createdBy: 'xad-person' },
      { version: 1, source: 'FILE', env: null, fileName: 'openapi.json' },
    ]);
    expect((await 부르기('GET', '/api-docs/1')).json()).toEqual({ version: 1, doc: 문서('1') });
    expect((await 부르기('GET', '/api-docs/9')).statusCode).toBe(404);
  });

  it('OpenAPI 3 JSON 이 아니면 400 BAD_API_DOC 과 까닭 · 5MB 를 넘으면 413', async () => {
    expect((await 올리기('{"swagger":"2.0"}')).json()).toEqual({
      error: 'BAD_API_DOC',
      reason: 'Swagger 2.0 문서입니다 — OpenAPI 3 으로 변환해서 올려 주세요',
    });
    expect((await 올리기(Buffer.alloc(5 * 1024 * 1024 + 1, 32))).statusCode).toBe(413);
  });

  it('지금 받기는 기준 서버 주소 + 문서 경로에서 받아 그 서버 이름으로 판을 올린다', async () => {
    내줄것 = { 코드: 200, 글: JSON.stringify(문서('1')) };
    const 받음 = await 부르기('POST', '/api-docs/fetch');
    expect(받음.statusCode).toBe(201);
    expect(받음.json()).toEqual({ version: 1, created: true });
    expect((await 부르기('GET', '/api-docs')).json<{ versions: unknown[] }>().versions).toMatchObject([{ version: 1, source: 'URL', env: 'stg', fileName: null }]);

    내줄것 = { 코드: 503, 글: '' };
    expect((await 부르기('POST', '/api-docs/fetch')).json()).toEqual({ error: 'API_DOC_FETCH_FAILED', reason: '응답 코드 503' });
    내줄것 = { 코드: 200, 글: '<html></html>' };
    expect((await 부르기('POST', '/api-docs/fetch')).json()).toMatchObject({ error: 'BAD_API_DOC' });
  });

  it('문서 경로나 기준 서버가 비면 400 NO_API_DOC_URL', async () => {
    await q('UPDATE service SET api_doc_env = NULL WHERE id = $1', [서비스]);
    try {
      expect((await 부르기('POST', '/api-docs/fetch')).json()).toEqual({ error: 'NO_API_DOC_URL' });
    } finally {
      await q("UPDATE service SET api_doc_env = 'stg' WHERE id = $1", [서비스]);
    }
  });

  it('판 비교는 두 판의 새 · 바뀜 · 없어짐을 주고 없는 판이면 404', async () => {
    await 올리기(JSON.stringify(문서('1')));
    await 올리기(JSON.stringify(문서('2', { '/v1/devices': { post: { responses: { '201': {} } } } })));
    expect((await 부르기('GET', '/api-docs/compare?from=1&to=2')).json()).toEqual({
      changes: [{ method: 'POST', path: '/v1/devices', change: 'NEW', breaking: false, notes: [] }],
    });
    expect((await 부르기('GET', '/api-docs/compare?from=1&to=7')).statusCode).toBe(404);
    expect((await 부르기('GET', '/api-docs/compare?from=1')).statusCode).toBe(400);
  });

  it('커버리지는 마지막 판의 API × 숫자 응답 코드를 활성 케이스가 받은 것으로 센다 — 실행을 못 보면 lastRunId 를 비운다', async () => {
    expect((await 부르기('GET', '/api-coverage')).json()).toEqual({ version: null, total: 0, covered: 0, operations: [] });
    await 올리기(JSON.stringify(문서('1')));
    await q(
      `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active)
       VALUES ('XAD-FN-001', '보내기', 'xad/a.spec.ts', '{}', '{}', true), ('XAD-FN-002', '꺼짐', 'xad/b.spec.ts', '{}', '{}', false)`,
    );
    await q(
      `INSERT INTO api_call_seen (service_id, tc_id, method, path, status, run_id) VALUES
         ($1, 'XAD-FN-001', 'POST', '/v1/pushes', 201, 11), ($1, 'XAD-FN-002', 'POST', '/v1/pushes', 400, 12)`,
      [서비스],
    );
    const 기대 = (lastRunId: number | null) => ({
      version: 1,
      total: 2,
      covered: 1,
      operations: [
        {
          method: 'POST',
          path: '/v1/pushes',
          codes: [
            { status: 201, seen: true, noShape: false, lastRunId },
            { status: 400, seen: false, noShape: true, lastRunId: null },
          ],
        },
      ],
    });
    expect((await 부르기('GET', '/api-coverage')).json()).toEqual(기대(11));
    실행보임 = false;
    expect((await 부르기('GET', '/api-coverage')).json()).toEqual(기대(null));
  });
});
