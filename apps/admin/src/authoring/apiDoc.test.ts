// API 애플리케이션 작성 요청 — 만들기 거절 · 판 자료 한 행 · 재실행 · 이어 작성이 env 를 물려받기 · 집기 응답의 target · apiDoc · 바뀐 API 만 다시 작성 (도메인/작성 §7 「AUTHOR API 문서 판」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 다시작성세우기 } from '../apidoc/rewrite.js';
import authoringAgentRoutes from './agentRoutes.js';
import { 이어작성준비, 제출 } from './assetStore.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAW';
const 화면접두사 = 'XAWS';
const 맥 = 'xaw-맥';
const 인증 = { name: '고객사 A', tokenUrl: '/v1/oauth/token', clientId: 'xaw-a', clientSecret: 'xaw-비밀-0001' };
const 문서 = { openapi: '3.0.3', info: { title: '알림', version: '1' }, paths: { '/v1/pushes': { post: { responses: { '201': { description: '됨' } } } } } };

describe.skipIf(연결 === undefined)('API 애플리케이션 작성 요청', { timeout: 30_000 }, () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 화면서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 만들기 = (몸: Record<string, unknown>, prefix = 접두사) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests?service=${prefix}`, payload: { kind: 'AUTHOR', ...몸 } });
  const 집기 = () => app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` });
  const 행 = async (id: number) =>
    (await q<{ env: string | null; compare: boolean; status: string }>('SELECT env, compare, status FROM authoring_request WHERE id = $1', [id])).rows[0]!;
  const 치우기 = () => q('DELETE FROM authoring_request WHERE service_id = ANY($1)', [[서비스, 화면서비스]]);

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XAW API 작성 검사용', '#3A5FCD', '', 'xaw', 'API') RETURNING id`,
      [접두사],
    );
    서비스 = Number(s.rows[0]!.id);
    const t = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, 'XAWS 화면 검사용', '#3A5FCD', '', 'xaws') RETURNING id`,
      [화면접두사],
    );
    화면서비스 = Number(t.rows[0]!.id);
    await q(
      `INSERT INTO service_env (service_id, env, base_url, api_auths, is_prod) VALUES
         ($1, 'stg', 'http://127.0.0.1:3003', $2, false), ($1, 'prod', 'https://push.example.com', $2, true)`,
      [서비스, JSON.stringify([인증])],
    );
    await q("INSERT INTO api_doc_version (service_id, version, source, file_name, fingerprint, doc) VALUES ($1, 1, 'FILE', 'a.json', 'xaw1', $2)", [서비스, JSON.stringify(문서)]);
    process.env.AUTHORING_AGENT_USER = 맥;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 맥, displayName: '맥', role: 'member', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM api_doc_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service WHERE id = ANY($1)', [[서비스, 화면서비스]]);
    await app.close();
  });

  it('API 애플리케이션 요청의 판 · 대상 서버가 틀리면 400 이고 DRAFT 도 안 남는다', async () => {
    const 거절 = async (몸: Record<string, unknown>, prefix?: string) => (await 만들기(몸, prefix)).json<{ error: string }>().error;
    expect(await 거절({ env: 'stg' })).toBe('API_DOC_REQUIRED');
    expect(await 거절({ apiDoc: 9, env: 'stg' })).toBe('BAD_API_DOC');
    expect(await 거절({ apiDoc: '1', env: 'stg' })).toBe('BAD_API_DOC');
    expect(await 거절({ apiDoc: 1 })).toBe('BAD_ENV');
    expect(await 거절({ apiDoc: 1, env: 'prod' })).toBe('BAD_ENV');
    expect(await 거절({ apiDoc: 1, env: 'stg', compare: true })).toBe('BAD_ENV');
    expect(await 거절({ apiDoc: 1, env: 'stg' }, 화면접두사)).toBe('NOT_API_SERVICE');
    expect((await q('SELECT 1 FROM authoring_request WHERE service_id = ANY($1)', [[서비스, 화면서비스]])).rowCount).toBe(0);
  });

  it('판 하나가 자료로 붙어 파일 없이도 줄에 서고, 집기가 그 판 원문과 대상 서버 인증을 싣는다', async () => {
    await 치우기();
    const 답 = await 만들기({ apiDoc: 1, env: 'stg' });
    expect(답.statusCode).toBe(201);
    const id = 답.json<{ id: number }>().id;
    expect(await 행(id)).toMatchObject({ env: 'stg', compare: false });
    const 자료 = await q<{ kind: string; name: string }>('SELECT kind, name FROM authoring_asset WHERE request_id = $1', [id]);
    expect(자료.rows).toEqual([{ kind: 'API_DOC', name: 'API 문서 판 1' }]);
    expect(await 제출(id)).toBe(true);

    const 집은 = (await 집기()).json<Record<string, unknown>>();
    expect(집은.id).toBe(id);
    expect(집은.target).toEqual({ env: 'stg', baseUrl: 'http://127.0.0.1:3003', apiAuths: [인증] });
    expect(집은.apiDoc).toEqual({ version: 1, doc: 문서 });
    expect(집은).not.toHaveProperty('accounts');
  });

  it('남은 요구로 이어 작성은 판 자료 행과 env 를 복사한다', async () => {
    const 원본 = Number((await q<{ id: string }>("SELECT id FROM authoring_request WHERE service_id = $1 AND kind = 'AUTHOR'", [서비스])).rows[0]!.id);
    const 새것 = await 이어작성준비({ 서비스, 원본: { id: 원본, specText: null, params: {} }, 누가: 맥, 이름: '맥', apiEnv: 'stg' });
    expect(await 행(새것.id)).toMatchObject({ env: 'stg', compare: false, status: 'DRAFT' });
    const 자료 = await q<{ kind: string; same: boolean }>(
      `SELECT n.kind, n.api_doc_version_id = o.api_doc_version_id AS same FROM authoring_asset n
         JOIN authoring_asset o ON o.request_id = $2 AND o.kind = 'API_DOC' WHERE n.request_id = $1`,
      [새것.id, 원본],
    );
    expect(자료.rows).toEqual([{ kind: 'API_DOC', same: true }]);
    expect(새것.파일).toEqual([]);
    await q('DELETE FROM authoring_request WHERE id = $1', [새것.id]);
  });

  it('재실행은 원본의 env 를 물려받고 원본 자료의 판을 싣는다 — 그 사이 실서비스 서버가 되면 400 BAD_ENV', async () => {
    const 원본 = (await q<{ id: string }>("SELECT id FROM authoring_request WHERE service_id = $1 AND kind = 'AUTHOR'", [서비스])).rows[0]!.id;
    await q("UPDATE authoring_request SET status = 'DONE' WHERE id = $1", [원본]);
    const 답 = await app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: { kind: 'RERUN', sourceId: Number(원본) } });
    expect(답.statusCode).toBe(201);
    expect(await 행(답.json<{ id: number }>().id)).toMatchObject({ env: 'stg', compare: false, status: 'PENDING' });
    const 집은 = (await 집기()).json<Record<string, unknown>>();
    expect(집은.kind).toBe('RERUN');
    expect(집은.target).toMatchObject({ env: 'stg', apiAuths: [인증] });
    expect(집은.apiDoc).toMatchObject({ version: 1 });

    await q("UPDATE authoring_request SET status = 'DONE' WHERE service_id = $1", [서비스]);
    await q("UPDATE service_env SET is_prod = true WHERE service_id = $1 AND env = 'stg'", [서비스]);
    try {
      const 막힘 = await app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: { kind: 'RERUN', sourceId: Number(원본) } });
      expect(막힘.json()).toEqual({ error: 'BAD_ENV' });
    } finally {
      await q("UPDATE service_env SET is_prod = false WHERE service_id = $1 AND env = 'stg'", [서비스]);
    }
  });

  it('바뀐 API 만 다시 작성 요청 — 집기가 apiApply 와 새 판을 싣고, 재실행은 apiApply 를 물려받고, 본문으로 실으면 400 BAD_API_APPLY', async () => {
    await 치우기();
    const 새문서 = { ...문서, paths: { ...문서.paths, '/v1/devices': { post: { responses: { '201': { description: '됨' } } } } } };
    await q("INSERT INTO api_doc_version (service_id, version, source, file_name, fingerprint, doc) VALUES ($1, 2, 'FILE', 'b.json', 'xaw2', $2)", [서비스, JSON.stringify(새문서)]);
    const 세움 = await 다시작성세우기({ 서비스, from: 1, to: 2, 고른: [{ method: 'POST', path: '/v1/devices' }], env: 'stg', 누가: 맥, 이름: '맥' });
    if (!('id' in 세움)) throw new Error(세움.error);
    const apiApply = { fromVersion: 1, toVersion: 2, operations: [{ method: 'POST', path: '/v1/devices', change: 'NEW', breaking: false, notes: [], tcIds: [] }] };
    const 집은 = (await 집기()).json<Record<string, unknown>>();
    expect(집은).toMatchObject({ id: 세움.id, params: { apiApply }, apiDoc: { version: 2 }, target: { env: 'stg' } });

    await q("UPDATE authoring_request SET status = 'DONE' WHERE id = $1", [세움.id]);
    const 다시 = await app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: { kind: 'RERUN', sourceId: 세움.id } });
    expect(다시.statusCode).toBe(201);
    expect((await q<{ params: unknown }>('SELECT params FROM authoring_request WHERE id = $1', [다시.json<{ id: number }>().id])).rows[0]!.params).toEqual({ apiApply });

    expect((await 만들기({ apiDoc: 1, env: 'stg', params: { apiApply } })).json()).toEqual({ error: 'BAD_API_APPLY' });
    const 실음 = await app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: { kind: 'RERUN', sourceId: 세움.id, params: { apiApply } } });
    expect(실음.json()).toEqual({ error: 'BAD_API_APPLY' });
  });
});
