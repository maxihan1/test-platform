// 케이스 저장 입력값 — 저장·지우기 통로와 실행을 만들 때 빈 칸 채우기 (도메인/실행 §3.2 · §7)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import { 등급표 } from '../auth/routeTable.js';
import authRoutes from '../auth/routes.js';
import { 라우트표 } from '../auth/scope.js';
import { 세션등록 } from '../auth/session.js';
import executionRoutes from './routes.js';
import { createRun } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XSI';
const 열쇠 = 'xsi-검사용-세션-열쇠-32글자를-넘긴다-넉넉히';
const 케이스 = 'XSI-001';
const 계정들 = ['xsi-reader', 'xsi-writer'];

const 입력스키마 = {
  type: 'object',
  properties: {
    loginId: { type: 'string', minLength: 1, default: 'guest', description: '아이디' },
    password: { type: 'string', secret: true, default: '', description: '비밀번호' },
    count: { type: 'number', default: 1, description: '개수' },
  },
  required: ['loginId'],
};
const 기대스키마 = {
  type: 'object',
  properties: {
    homePath: { type: 'string', default: '/', description: '첫 화면' },
    flag: { type: 'boolean', default: true, description: '표시' },
  },
};

describe('등급과 경계', () => {
  it('저장·지우기는 (케이스, write) · 경로의 tcId 로 서비스를 찾는다', () => {
    expect(등급표['PUT /api/cases/:tcId/saved-input']).toEqual({ 기능: 'cases', 칸: 'write' });
    expect(등급표['DELETE /api/cases/:tcId/saved-input']).toEqual({ 기능: 'cases', 칸: 'write' });
    expect(라우트표['/api/cases/:tcId/saved-input']).toEqual({ 종류: '케이스', 칸: 'tcId' });
  });
});

describe.skipIf(연결 === undefined)('케이스 저장 입력값', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 출입증 = new Map<string, string>();
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  async function 치우기(): Promise<void> {
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM case_input WHERE tc_id = $1', [케이스]);
  }

  async function 계정(username: string, cases: 'read' | 'write'): Promise<void> {
    await q(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, 'member', 'none', true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, is_approved = true, must_change_password = false`,
      [username, await 해시('열려라참깨')],
    );
    await q('DELETE FROM user_service WHERE username = $1', [username]);
    await q(
      `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, $3, 'write', 'none')`,
      [username, 서비스, cases],
    );
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    출입증.set(username, res.cookies[0]!.value);
  }

  beforeAll(async () => {
    const r = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XSI 저장값 검사용', '#3A5FCD', '', 'xsi')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number((r.rows[0] as { id: string }).id);
    await 치우기();
    await q(
      `INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'https://qa.example.com')
       ON CONFLICT (service_id, env) DO NOTHING`,
      [서비스],
    );
    await q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
       VALUES ($1, 'XSI 로그인', '["desktop"]', '[]', 'xsi/a.spec.ts', $2, $3)
       ON CONFLICT (tc_id) DO UPDATE SET param_schema = EXCLUDED.param_schema, expected_schema = EXCLUDED.expected_schema`,
      [케이스, JSON.stringify(입력스키마), JSON.stringify(기대스키마)],
    );

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(executionRoutes, { prefix: '/api' });
    await app.ready();

    await 계정('xsi-reader', 'read');
    await 계정('xsi-writer', 'write');
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM user_service WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = $1', [케이스]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  beforeEach(치우기);

  const 저장 = (body: unknown, 누구 = 'xsi-writer', tcId = 케이스) =>
    app.inject({
      method: 'PUT',
      url: `/api/cases/${tcId}/saved-input`,
      cookies: { platform_session: 출입증.get(누구)! },
      payload: body as object,
    });
  const 지우기 = (누구 = 'xsi-writer') =>
    app.inject({ method: 'DELETE', url: `/api/cases/${케이스}/saved-input`, cookies: { platform_session: 출입증.get(누구)! } });
  const 저장행 = async () =>
    (await q('SELECT params, expected, saved_by FROM case_input WHERE tc_id = $1', [케이스])).rows as {
      params: Record<string, unknown>;
      expected: Record<string, unknown>;
      saved_by: string;
    }[];
  const 직접저장 = (params: object, expected: object = {}) =>
    q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, $2, $3, 'xsi')`, [
      케이스,
      JSON.stringify(params),
      JSON.stringify(expected),
    ]);

  it('명세에 어긋나면 400 INVALID_PARAMS 와 칸별 사유다', async () => {
    const res = await 저장({ params: { loginId: 'u', count: '셋' }, expected: {} });
    expect(res.statusCode).toBe(400);
    const body = res.json<{ error: string; violations: { path: string }[] }>();
    expect(body.error).toBe('INVALID_PARAMS');
    expect(body.violations.map((v) => v.path)).toEqual(['count']);
    expect(await 저장행()).toEqual([]);
  });

  it('없는 케이스는 404 CASE_NOT_FOUND 다', async () => {
    const res = await 저장({ params: { loginId: 'u' } }, 'xsi-writer', 'XSI-999');
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: string }>().error).toBe('CASE_NOT_FOUND');
  });

  it('두 번 저장하면 한 벌만 남고 뒤엣것이다', async () => {
    expect((await 저장({ params: { loginId: 'a' }, expected: {} })).statusCode).toBe(200);
    const res = await 저장({ params: { loginId: 'b' }, expected: { homePath: '/home' } });
    expect(res.statusCode).toBe(200);
    const body = res.json<Record<string, unknown>>();
    expect(body).toMatchObject({
      params: { loginId: 'b' },
      expected: { homePath: '/home' },
      savedSecrets: [],
      savedBy: 'xsi-writer',
    });
    expect(typeof body.savedAt).toBe('string');
    expect(await 저장행()).toEqual([{ params: { loginId: 'b' }, expected: { homePath: '/home' }, saved_by: 'xsi-writer' }]);
  });

  it('코드 기본값과 같은 칸은 저장하지 않는다', async () => {
    await 저장({ params: { loginId: 'u', count: 1, password: '' }, expected: { homePath: '/', flag: false } });
    expect(await 저장행()).toEqual([{ params: { loginId: 'u' }, expected: { flag: false }, saved_by: 'xsi-writer' }]);
  });

  it('남는 칸이 없으면 행을 지우고 null 을 돌려준다', async () => {
    await 저장({ params: { loginId: 'u' } });
    const res = await 저장({ params: { loginId: 'guest', count: 1 }, expected: { homePath: '/', flag: true } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();
    expect(await 저장행()).toEqual([]);
  });

  it('비밀값은 응답에 싣지 않고 이름만 savedSecrets 에 둔다', async () => {
    const res = await 저장({ params: { loginId: 'u', password: 'pa55' } });
    const body = res.json<{ params: Record<string, unknown>; savedSecrets: string[] }>();
    expect(body.params).toEqual({ loginId: 'u' });
    expect(body.savedSecrets).toEqual(['password']);
    expect(JSON.stringify(body)).not.toContain('pa55');
    expect((await 저장행())[0]!.params).toEqual({ loginId: 'u', password: 'pa55' });
  });

  it('저장은 덮어쓴다 — 다시 저장하며 안 보낸 비밀값 칸은 사라진다', async () => {
    await 저장({ params: { loginId: 'u', password: 'pa55' } });
    await 저장({ params: { loginId: 'v' } });
    expect((await 저장행())[0]!.params).toEqual({ loginId: 'v' });
  });

  it('지우면 204 이고 행이 없다 — 없어도 204', async () => {
    await 저장({ params: { loginId: 'u' } });
    expect((await 지우기()).statusCode).toBe(204);
    expect(await 저장행()).toEqual([]);
    expect((await 지우기()).statusCode).toBe(204);
  });

  it('케이스 읽기 권한만 있으면 저장도 지우기도 403 이다', async () => {
    expect((await 저장({ params: { loginId: 'u' } }, 'xsi-reader')).statusCode).toBe(403);
    expect((await 지우기('xsi-reader')).statusCode).toBe(403);
  });

  const 실행 = (params: Record<string, unknown>, expected: Record<string, unknown> = {}) =>
    createRun({
      title: 'XSI 실행',
      triggeredBy: 'xsi',
      env: 'qa',
      items: [{ tcId: 케이스, platforms: ['desktop'], params, expected }],
    });
  const 항목값 = async (runId: number) =>
    (await q('SELECT params, expected FROM run_item WHERE run_id = $1', [runId])).rows[0] as {
      params: Record<string, unknown>;
      expected: Record<string, unknown>;
    };

  it('요청에 없는 칸을 저장값으로 채워 run_item 과 돌려주는 항목 둘 다에 넣는다', async () => {
    await 직접저장({ loginId: 'u', password: 'pa55' }, { flag: false });
    const run = await 실행({});
    expect(await 항목값(run.runId)).toEqual({ params: { loginId: 'u', password: 'pa55' }, expected: { flag: false } });
    expect(run.items[0]!.params).toEqual({ loginId: 'u', password: 'pa55' });
    expect(run.items[0]!.expected).toEqual({ flag: false });
  });

  it('요청에 있는 칸은 요청이 이긴다', async () => {
    await 직접저장({ loginId: 'u' });
    const run = await 실행({ loginId: 'x' });
    expect((await 항목값(run.runId)).params).toEqual({ loginId: 'x' });
  });

  it('명세에서 사라진 칸 · 규칙이 바뀐 칸은 채우지 않는다', async () => {
    await 직접저장({ loginId: 'u', oldField: 'y', count: '셋' }, { homePath: 7 });
    const run = await 실행({});
    expect(await 항목값(run.runId)).toEqual({ params: { loginId: 'u' }, expected: {} });
    expect(run.items[0]!.params).toEqual({ loginId: 'u' });
  });

  it('저장값이 없으면 요청 그대로다', async () => {
    const run = await 실행({ loginId: 'z' }, { flag: true });
    expect(await 항목값(run.runId)).toEqual({ params: { loginId: 'z' }, expected: { flag: true } });
  });
});
