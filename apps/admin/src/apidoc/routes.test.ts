// API 문서 통로가 도메인/API §7 의 경로 · 응답 · 거절을 지키는지 본다 — 판 올리기 · 지금 받기 · 판 비교 · 커버리지. 문 없이 라우트만 띄운다
// 바뀐 API 다시 작성은 결정 진행(POST /api/authoring/decisions/run)으로 세운다 (작성 §3.6 「★ 결정 목록」 ③ 「바뀐 API」)

import Fastify, { type FastifyInstance } from 'fastify';
import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import decisionRoutes from '../authoring/decisionRoutes.js';
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
  const 바뀐API = async () =>
    (await app.inject({ method: 'GET', url: `/api/authoring/decisions?service=${접두사}` }))
      .json<{ items: { key: string; kind: string; picks: string[] }[] }>()
      .items.filter((x) => x.kind === 'API_CHANGED');
  const 다시작성 = (key: string, env: string) =>
    app.inject({ method: 'POST', url: `/api/authoring/decisions/run?service=${접두사}`, payload: { prdVersion: 0, picks: [{ key, pick: 'REDO', env }] } });
  /** 그 판으로 쓴 API 작성이 병합됐다 — 바뀐 API 의 기준 판이 된다 */
  const 병합된작성 = async (version: number) => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status) VALUES ($1, 'AUTHOR', '{}', 'xad-person', '검사', 'DONE') RETURNING id`,
      [서비스],
    );
    const id = Number(r.rows[0]!.id);
    await q(
      `INSERT INTO authoring_asset (request_id, position, kind, name, api_doc_version_id)
       SELECT $1, 1, 'API_DOC', '판', id FROM api_doc_version WHERE service_id = $2 AND version = $3`,
      [id, 서비스, version],
    );
    await q(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, finished_at) VALUES ($1, 'MERGE', $2, '{}', 'xad-person', '검사', 'DONE', now())`,
      [서비스, id],
    );
  };
  const 올리기 = (몸: string | Buffer, 이름 = 'openapi.json') =>
    app.inject({
      method: 'POST',
      url: `/api/services/${String(서비스)}/api-docs?name=${encodeURIComponent(이름)}`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: 몸,
    });

  const 치우기 = async () => {
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
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
    await app.register(decisionRoutes, { prefix: '/api' });
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
    const 이름둘 = await app.inject({
      method: 'POST',
      url: `/api/services/${String(서비스)}/api-docs?name=a&name=b`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: JSON.stringify(문서('1')),
    });
    expect(이름둘.json()).toEqual({ error: 'INVALID_REQUEST' });
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

  it('바뀐 API 다시 작성은 없어진 API 를 빼고 바뀐 API · 그 API 를 부르던 활성 케이스 · 새 판 자료를 싣고 결정 진행을 단다', async () => {
    await 올리기(JSON.stringify(문서('1', { '/v1/old': { delete: { responses: { '204': {} } } } })));
    await 올리기(JSON.stringify(문서('2', { '/v1/devices': { post: { responses: { '201': {} } } }, '/v1/pushes': { post: { responses: { '202': {} } } } })));
    await 병합된작성(1);
    await q(
      `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active)
       VALUES ('XAD-FN-001', '보내기', 'xad/a.spec.ts', '{}', '{}', true), ('XAD-FN-002', '꺼짐', 'xad/b.spec.ts', '{}', '{}', false)`,
    );
    await q(
      `INSERT INTO api_call_seen (service_id, tc_id, method, path, status, run_id) VALUES
         ($1, 'XAD-FN-001', 'POST', '/v1/pushes', 201, 11), ($1, 'XAD-FN-002', 'POST', '/v1/pushes', 400, 12)`,
      [서비스],
    );
    expect((await 바뀐API()).map((x) => [x.key, x.picks])).toEqual([['api:1:2', ['REDO']]]);
    const 답 = await 다시작성('api:1:2', 'stg');
    expect(답.statusCode).toBe(201);
    const id = 답.json<{ steps: { requestId: number }[] }>().steps[0]!.requestId;
    const 행 = (await q<{ kind: string; status: string; env: string; params: unknown }>('SELECT kind, status, env, params FROM authoring_request WHERE id = $1', [id])).rows[0];
    expect(행).toMatchObject({
      kind: 'AUTHOR',
      status: 'PENDING',
      env: 'stg',
      params: {
        apiApply: {
          fromVersion: 1,
          toVersion: 2,
          operations: [
            { method: 'POST', path: '/v1/devices', change: 'NEW', tcIds: [] },
            { method: 'POST', path: '/v1/pushes', change: 'CHANGED', tcIds: ['XAD-FN-001'] },
          ],
        },
        decision: { after: [], count: 1 },
      },
    });
    const 자료 = (await q<{ kind: string; version: number }>(
      'SELECT a.kind, v.version FROM authoring_asset a JOIN api_doc_version v ON v.id = a.api_doc_version_id WHERE a.request_id = $1',
      [id],
    )).rows;
    expect(자료).toEqual([{ kind: 'API_DOC', version: 2 }]);
  });

  it('다시 작성 — 없어진 API 뿐이면 항목이 없고, 대상 서버가 틀리거나 열린 작성이 있으면 400 BAD_PICK, 새 판이 오르면 고를 때 본 열쇠는 409', async () => {
    await 올리기(JSON.stringify(문서('1', { '/v1/old': { delete: { responses: { '204': {} } } } })));
    await 올리기(JSON.stringify(문서('2')));
    await 병합된작성(1);
    expect(await 바뀐API()).toEqual([]);
    await 올리기(JSON.stringify(문서('3', { '/v1/devices': { post: { responses: { '201': {} } } } })));
    const 틀린서버 = await 다시작성('api:1:3', 'prod');
    expect([틀린서버.statusCode, 틀린서버.json()]).toEqual([400, { error: 'BAD_PICK', detail: 'api:1:3' }]);
    expect((await 다시작성('api:1:3', 'stg')).statusCode).toBe(201);
    const 두번째 = await 다시작성('api:1:3', 'stg');
    expect([두번째.statusCode, 두번째.json()]).toEqual([400, { error: 'BAD_PICK', detail: 'api:1:3' }]);
    await 올리기(JSON.stringify(문서('4', { '/v1/devices': { post: { responses: { '201': {} } } }, '/v1/keys': { get: { responses: { '200': {} } } } })));
    expect((await 다시작성('api:1:3', 'stg')).json()).toEqual({ error: 'DECISIONS_STALE' });
    expect((await q("SELECT 1 FROM authoring_request WHERE service_id = $1 AND params ? 'apiApply'", [서비스])).rowCount).toBe(1);
  });
});
