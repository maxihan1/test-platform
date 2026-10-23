// 빌드마다 돌리기 — CI 토큰 발급 · 문 · 빌드 올리기 거절 코드 · 스모크 실행 · 앞 빌드 건너뛰기 · 스모크 뒤 회귀 · APK 서명 내려받기 · 보관 개수
// (도메인/실행 §3.11 · §7 · 도메인/인증 §7 「인증 적용 범위」). 분배는 가짜라 러너 · 팜에 닿지 않는다. DATABASE_URL 이 있을 때만 돈다

import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import serviceTokenRoutes from '../settings/serviceTokens.js';

import { 보관개수, 서명주소 } from './buildFile.js';
import buildRoutes from './buildRoutes.js';
import { 스모크뒤 } from './buildRun.js';
import { dispatch } from './dispatcher.js';

// 진짜 모듈을 불러 펼치면 dispatcher → buildRun → scheduled 고리에서 scheduled 가 진짜 dispatch 를 쥔다 — 쓰는 둘만 가짜로 둔다
vi.mock('./dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined), markAborted: vi.fn() }));

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XBD', 'XBA'];
const 케이스들 = ['XBD-FN-001', 'XBD-FN-002', 'XBA-FN-001'];
const 계정들 = ['xbd-admin', 'xbd-member'];

describe.skipIf(연결 === undefined)('빌드마다 돌리기', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 산출: string;
  let 관리자 = '';
  let 회원 = '';
  const 서비스: Record<string, number> = {};
  const 옛환경 = { ...process.env };

  async function 치운다(): Promise<void> {
    const ids = `(SELECT id FROM service WHERE prefix = ANY($1))`;
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${ids})`, [접두사들]);
    await pool.query(`DELETE FROM test_run WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM app_build WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM service_token WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query(`DELETE FROM service_env WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query('DELETE FROM service WHERE prefix = ANY($1)', [접두사들]);
    await pool.query("DELETE FROM project WHERE name = 'XBD 프로젝트'");
  }

  const 사람 = (cookie: string, method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie }, ...(payload === undefined ? {} : { payload }) });
  const 올린다 = (토큰: string, 본문: object) => app.inject({ method: 'POST', url: '/api/builds', headers: { authorization: `Bearer ${토큰}` }, payload: 본문 });
  async function 토큰(prefix: string): Promise<string> {
    const res = await 사람(관리자, 'POST', `/api/settings/services/${String(서비스[prefix])}/tokens`, { name: `${prefix} CI` });
    expect(res.statusCode).toBe(201);
    return res.json<{ token: string }>().token;
  }
  const 실행 = async (runId: number) =>
    (await pool.query<{ origin: string; build_stage: string | null; build_no: string | null; build_id: string | null; status: string; title: string; triggered_by: string }>(
      'SELECT origin, build_stage, build_no, build_id, status, title, triggered_by FROM test_run WHERE run_id = $1', [runId],
    )).rows[0]!;
  async function 끝낸다(runId: number, status: 'PASS' | 'FAIL'): Promise<void> {
    await pool.query('UPDATE run_item SET status = $2, finished_at = now() WHERE run_id = $1', [runId, status]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = now() WHERE run_id = $1", [runId]);
  }

  beforeAll(async () => {
    pool = (await import('../db/index.js')).pool;
    산출 = await mkdtemp(join(tmpdir(), 'xbd-builds-'));
    Object.assign(process.env, {
      PLATFORM_ARTIFACTS_DIR: 산출,
      PLATFORM_PUBLIC_URL: 'http://qahub.test',
      SESSION_SECRET: 'xbd-검사용-세션-열쇠-32바이트를-넉넉히-넘긴다',
      // 앱 케이스를 정기 · 빌드 실행에서 빼지 않게 — 분배가 가짜라 닿지는 않는다
      DEVICE_FARM_URL: 'http://farm.xbd.test',
    });
    app = Fastify();
    세션등록(app, process.env.SESSION_SECRET!);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(serviceTokenRoutes, { prefix: '/api' });
    await app.register(buildRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();

    const 프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XBD 프로젝트') RETURNING id")).rows[0]!.id);
    for (const [prefix, kind] of [['XBD', 'SCREEN'], ['XBA', 'APP']] as const) {
      서비스[prefix] = Number((await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ($1, $1, '#445566', '', $1, $2, $3) RETURNING id`,
        [prefix, 프로젝트, kind],
      )).rows[0]!.id);
      await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://qa.xbd.test'), ($1, 'live', 'http://live.xbd.test')`, [서비스[prefix]]);
      await pool.query(`UPDATE service_env SET is_prod = true WHERE service_id = $1 AND env = 'live'`, [서비스[prefix]]);
    }
    for (const [tcId, platforms, smoke] of [['XBD-FN-001', '["desktop"]', true], ['XBD-FN-002', '["desktop"]', false], ['XBA-FN-001', '["android"]', true]] as const) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, smoke)
         VALUES ($1, $1, $2, '[]', 'xbd/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}', $3)`,
        [tcId, platforms, smoke],
      );
    }
    for (const [username, role] of [['xbd-admin', 'admin'], ['xbd-member', 'member']] as const) {
      await pool.query(
        'INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ($1, $2, $3, $4, true, false)',
        [username, `${username} 이름`, await 해시('열려라참깨'), role],
      );
      await pool.query(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'write', 'write', 'write')`, [username, 프로젝트]);
    }
    const 로그인 = async (username: string) =>
      ((await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } })).headers['set-cookie'] as string).split(';')[0]!;
    관리자 = await 로그인('xbd-admin');
    회원 = await 로그인('xbd-member');
  });

  afterAll(async () => {
    await 치운다();
    await app.close();
    await rm(산출, { recursive: true, force: true });
    process.env = 옛환경;
    await pool.end();
  });

  it('토큰은 admin 만 발급하고 원문은 한 번만 준다. 목록에는 이름 · 만든 사람만, 끊으면 그 토큰은 못 쓴다', async () => {
    expect((await 사람(회원, 'POST', `/api/settings/services/${String(서비스.XBD)}/tokens`, { name: 'x' })).statusCode).toBe(403);
    const 원문 = await 토큰('XBD');
    expect(원문).toMatch(/^cit_[A-Za-z0-9_-]{43}$/);
    const 목록 = await 사람(관리자, 'GET', `/api/settings/services/${String(서비스.XBD)}/tokens`);
    expect(목록.body).not.toContain(원문);
    const 줄 = 목록.json<{ tokens: { tokenId: number; name: string; createdBy: string; lastUsedAt: string | null }[] }>().tokens[0]!;
    expect(줄).toMatchObject({ name: 'XBD CI', createdBy: 'xbd-admin 이름', lastUsedAt: null });
    expect((await 사람(관리자, 'DELETE', `/api/settings/services/${String(서비스.XBD)}/tokens/${String(줄.tokenId)}`)).statusCode).toBe(204);
    expect((await 올린다(원문, { env: 'qa', buildNo: '1' })).statusCode).toBe(401);
  });

  it('문 — 토큰이 없거나 틀리면 401, 로그인 쿠키로는 못 올리고, CI 토큰으로 다른 통로를 부르면 403', async () => {
    const 원문 = await 토큰('XBD');
    expect((await app.inject({ method: 'POST', url: '/api/builds', payload: { env: 'qa', buildNo: '1' } })).statusCode).toBe(401);
    expect((await 올린다(`cit_${'A'.repeat(43)}`, { env: 'qa', buildNo: '1' })).statusCode).toBe(401);
    expect((await 사람(관리자, 'POST', '/api/builds', { env: 'qa', buildNo: '1' })).statusCode).toBe(401);
    const 다른통로 = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization: `Bearer ${원문}` } });
    expect([다른통로.statusCode, 다른통로.json()]).toEqual([403, { error: 'AGENT_TOKEN_SCOPE' }]);
  });

  it('발급한 계정이 꺼지면 그 토큰도 못 쓴다', async () => {
    const 원문 = await 토큰('XBD');
    await pool.query("UPDATE app_user SET is_active = false WHERE username = 'xbd-admin'");
    try {
      expect((await 올린다(원문, { env: 'qa', buildNo: 'off-1' })).statusCode).toBe(401);
    } finally {
      await pool.query("UPDATE app_user SET is_active = true WHERE username = 'xbd-admin'");
    }
  });

  it('웹은 파일 없이 빌드 번호만 — 스모크 케이스만 담은 빌드 실행이 서고, 운영 줄 · 없는 줄 · 겹친 번호 · 파일은 거절한다', async () => {
    const 원문 = await 토큰('XBD');
    const res = await 올린다(원문, { env: 'qa', buildNo: '512' });
    expect(res.statusCode).toBe(201);
    const { runIds } = res.json<{ buildId: number; runIds: number[] }>();
    expect(runIds).toHaveLength(1);
    expect(await 실행(runIds[0]!)).toMatchObject({ origin: 'BUILD', build_stage: 'SMOKE', build_no: '512', triggered_by: 'xbd-admin', title: '빌드 512 · 스모크 · XBD-FN-001 XBD-FN-001' });

    const 거절 = async (본문: object) => { const r = await 올린다(원문, 본문); return [r.statusCode, r.json<{ error: string }>().error]; };
    expect(await 거절({ env: 'live', buildNo: '513' })).toEqual([400, 'PROD_ENV_BLOCKED']);
    expect(await 거절({ env: 'nope', buildNo: '513' })).toEqual([404, 'ENV_NOT_FOUND']);
    expect(await 거절({ env: 'qa', buildNo: '512' })).toEqual([409, 'BUILD_EXISTS']);
    expect(await 거절({ env: 'qa', buildNo: '513', apkUrl: 'https://s3.test/a.apk' })).toEqual([400, 'APK_NOT_ALLOWED']);
    expect(await 거절({ env: 'qa', buildNo: '../513' })).toEqual([400, 'INVALID_REQUEST']);
  });

  it('새 빌드가 오면 앞 빌드의 시작 안 한 실행은 멈추고, 스모크가 다 통과하면 회귀를 한 번만 건다', async () => {
    const 원문 = await 토큰('XBD');
    const 앞 = (await 올린다(원문, { env: 'qa', buildNo: '600' })).json<{ runIds: number[] }>().runIds[0]!;
    const 뒤 = (await 올린다(원문, { env: 'qa', buildNo: '601' })).json<{ runIds: number[] }>().runIds[0]!;
    expect((await 실행(앞)).status).toBe('ABORTED');

    await 끝낸다(뒤, 'PASS');
    await Promise.all([스모크뒤(뒤), 스모크뒤(뒤)]);
    const 회귀 = await pool.query<{ run_id: string; title: string }>("SELECT run_id, title FROM test_run WHERE build_no = '601' AND build_stage = 'FULL'");
    expect(회귀.rows.map((r) => r.title)).toEqual(['빌드 601 · 기능 전체 2건']);
  });

  it('스모크가 실패하거나 그사이 새 빌드가 왔으면 회귀를 걸지 않는다', async () => {
    const 원문 = await 토큰('XBD');
    const 실패 = (await 올린다(원문, { env: 'qa', buildNo: '700' })).json<{ runIds: number[] }>().runIds[0]!;
    await 끝낸다(실패, 'FAIL');
    await 스모크뒤(실패);
    const 늦음 = (await 올린다(원문, { env: 'qa', buildNo: '701' })).json<{ runIds: number[] }>().runIds[0]!;
    await 끝낸다(늦음, 'PASS');
    await 올린다(원문, { env: 'qa', buildNo: '702' });
    await 스모크뒤(늦음);
    const 회귀 = await pool.query("SELECT 1 FROM test_run WHERE build_no IN ('700', '701') AND build_stage = 'FULL'");
    expect(회귀.rowCount).toBe(0);
  });

  it('스모크 케이스가 없으면 바로 회귀를 건다', async () => {
    const 원문 = await 토큰('XBD');
    await pool.query("UPDATE test_case SET smoke_set = false WHERE tc_id = 'XBD-FN-001'");
    try {
      const { runIds } = (await 올린다(원문, { env: 'qa', buildNo: '800' })).json<{ runIds: number[] }>();
      expect(runIds).toHaveLength(1);
      expect(await 실행(runIds[0]!)).toMatchObject({ build_stage: 'FULL', title: '빌드 800 · 기능 전체 2건' });
    } finally {
      await pool.query("UPDATE test_case SET smoke_set = NULL WHERE tc_id = 'XBD-FN-001'");
    }
  });

  it('줄마다 최근 빌드만 남긴다', async () => {
    const r = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM app_build WHERE service_id = $1 AND env = 'qa'", [서비스.XBD]);
    expect(r.rows[0]!.n).toBe(보관개수);
  });

  it('Android 앱은 APK 를 꼭 보낸다 — AAB 는 거절하고, 올린 APK 는 실행에 고정되며 서명 주소로만 받는다', async () => {
    const 원문 = await 토큰('XBA');
    const apk = async (파일들: string[]) => { const z = new JSZip(); for (const f of 파일들) z.file(f, 'x'); return z.generateAsync({ type: 'nodebuffer' }); };
    const 보낸다 = async (buildNo: string, 몸: Buffer) =>
      app.inject({ method: 'POST', url: `/api/builds?env=qa&buildNo=${buildNo}`, headers: { authorization: `Bearer ${원문}`, 'content-type': 'application/octet-stream' }, payload: 몸 });

    expect((await 올린다(원문, { env: 'qa', buildNo: '88' })).json()).toMatchObject({ error: 'APK_REQUIRED' });
    expect((await 보낸다('88', await apk(['BundleConfig.pb', 'base/manifest/AndroidManifest.xml']))).json()).toMatchObject({ error: 'BAD_FILE_TYPE' });

    vi.mocked(dispatch).mockClear();
    const 몸 = await apk(['AndroidManifest.xml', 'classes.dex']);
    const res = await 보낸다('88', 몸);
    expect(res.statusCode).toBe(201);
    const { buildId, runIds } = res.json<{ buildId: number; runIds: number[] }>();
    expect(Number((await 실행(runIds[0]!)).build_id)).toBe(buildId);
    // 서명 주소는 폰을 잡은 뒤 만든다 — 실행 항목에는 빌드 번호만 실린다
    expect(vi.mocked(dispatch).mock.calls[0]![1]).toEqual([expect.objectContaining({ tcId: 'XBA-FN-001', buildId })]);

    const 주소 = new URL(서명주소(buildId)!);
    const 받음 = await app.inject({ method: 'GET', url: `${주소.pathname}${주소.search}` });
    expect([받음.statusCode, 받음.headers['content-type']]).toEqual([200, 'application/vnd.android.package-archive']);
    expect(Buffer.compare(받음.rawPayload, 몸)).toBe(0);
    const 위조 = await app.inject({ method: 'GET', url: `${주소.pathname}?exp=${주소.searchParams.get('exp')!}&sig=AAAA` });
    expect(위조.statusCode).toBe(403);

    // 케이스가 APK 자리를 바로가기로 바꿔쳐도 그 끝의 파일을 내주지 않는다
    const 자리 = join(산출, 'builds', `${String(buildId)}.apk`);
    await rm(자리);
    await symlink('/etc/hosts', 자리);
    expect((await app.inject({ method: 'GET', url: `${주소.pathname}${주소.search}` })).statusCode).toBe(404);
  });
});
