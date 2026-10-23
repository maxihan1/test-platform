// 스모크 표시 — 스캔 저장 · 목록 거르기 · 사람이 고치는 통로 · 권한을 본다 (도메인/게임 §3.10 「빌드마다 돌리기」 · GAME-F1-13)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import { 엑셀자료 } from './exportData.js';
import catalogRoutes, { 스모크읽기 } from './routes.js';
import { findCase, save } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 열쇠 = 'xsk-검사용-세션-열쇠-32글자를-넘긴다-넉넉히';
const 번호들 = ['XSK-001', 'XSK-002', 'XSK-003'];
const 계정들 = ['xsk-reader', 'xsk-writer'];

describe('스모크읽기', () => {
  it('1 은 true, 0 은 false, 그 밖은 조용히 버린다', () => {
    expect(['1', '0', undefined, '', 'true', '2'].map(스모크읽기)).toEqual([true, false, undefined, undefined, undefined, undefined]);
  });
});

function spec(tcId: string, smoke?: true): CaseSpec {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath: `xsk/${tcId}.spec.ts`,
    ...(smoke === undefined ? {} : { smoke }),
  };
}

describe.skipIf(연결 === undefined)('스모크 표시', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 빈뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 출입증 = new Map<string, string>();
  const pool = async () => (await import('../db/index.js')).pool;

  async function 계정(username: string, cases: 'read' | 'write'): Promise<void> {
    const p = await pool();
    await p.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, 'member', 'none', true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, is_approved = true, must_change_password = false`,
      [username, await 해시('열려라참깨')],
    );
    await p.query('DELETE FROM user_project WHERE username = $1', [username]);
    await p.query(
      `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring)
       SELECT $1, project_id, $3, 'none', 'none' FROM service WHERE id = $2`,
      [username, 서비스, cases],
    );
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    출입증.set(username, res.cookies[0]!.value);
  }

  async function 치우기(): Promise<void> {
    const p = await pool();
    await p.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await p.query('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await p.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
  }

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSK', 'XSK 스모크 검사용', '#3A5FCD', 'https://github.com/acme/xsk', 'xsk')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기();

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    // 라우트를 걸면 기동 스캔이 돈다 — 빈 폴더를 훑게 하고, 끝난 뒤에 케이스를 넣어 비활성으로 내려가지 않게 한다
    빈뿌리 = await mkdtemp(join(tmpdir(), 'xsk-'));
    process.env.PLATFORM_TESTS_DIR = 빈뿌리;
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(catalogRoutes, { prefix: '/api' });
    await app.ready();
    await 계정('xsk-reader', 'read');
    await 계정('xsk-writer', 'write');
    await app.inject({ method: 'GET', url: '/api/catalog/scan?service=XSK', cookies: { platform_session: 출입증.get('xsk-reader')! } });
  });

  afterAll(async () => {
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
    await rm(빈뿌리, { recursive: true, force: true });
    await 치우기();
    await (await pool()).query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  const 고치기 = (tcId: string, payload: unknown, 누구 = 'xsk-writer') =>
    app.inject({ method: 'PUT', url: `/api/cases/${tcId}/smoke`, payload: payload as object, cookies: { platform_session: 출입증.get(누구)! } });
  const 목록 = async (쿼리: string) => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/catalog/cases?service=XSK&active=false${쿼리}`,
      cookies: { platform_session: 출입증.get('xsk-reader')! },
    });
    expect(res.statusCode).toBe(200);
    return res.json<{ items: { tcId: string }[] }>().items.map((c) => c.tcId);
  };

  it('스캔 저장이 smoke 를 담고, 사람이 고친 값(smokeSet)은 다시 스캔해도 안 덮는다', async () => {
    await save([spec('XSK-001', true), spec('XSK-002'), spec('XSK-003', true)], false, 'XSK');
    expect(await findCase('XSK-001')).toMatchObject({ smoke: true, smokeSet: null });
    expect(await findCase('XSK-002')).toMatchObject({ smoke: false, smokeSet: null });

    expect((await 고치기('XSK-001', { smoke: false })).statusCode).toBe(204);
    expect((await 고치기('XSK-002', { smoke: true })).statusCode).toBe(204);
    await save([spec('XSK-001', true), spec('XSK-002'), spec('XSK-003')], false, 'XSK');
    expect(await findCase('XSK-001')).toMatchObject({ smoke: false, smokeSet: false });
    expect(await findCase('XSK-002')).toMatchObject({ smoke: true, smokeSet: true });
    expect(await findCase('XSK-003')).toMatchObject({ smoke: false, smokeSet: null });

    expect((await 고치기('XSK-001', { smoke: null })).statusCode).toBe(204);
    expect((await 고치기('XSK-002', { smoke: null })).statusCode).toBe(204);
    expect(await findCase('XSK-001')).toMatchObject({ smoke: true, smokeSet: null });
    expect(await findCase('XSK-002')).toMatchObject({ smoke: false, smokeSet: null });
  });

  it('?smoke=1 · 0 은 유효 값으로 거르고 그 밖의 값은 안 거른다', async () => {
    await save([spec('XSK-001', true), spec('XSK-002'), spec('XSK-003')], false, 'XSK');
    await 고치기('XSK-003', { smoke: true });
    await 고치기('XSK-001', { smoke: false });
    expect(await 목록('&smoke=1')).toEqual(['XSK-003']);
    expect(await 목록('&smoke=0')).toEqual(['XSK-001', 'XSK-002']);
    expect(await 목록('&smoke=yes')).toEqual(번호들);
    expect(await 목록('')).toEqual(번호들);
  });

  it('엑셀도 목록과 같은 스모크 조건을 탄다 — 버튼의 건수와 받은 파일의 건수가 같다 (카탈로그 §8.1 「스모크」)', async () => {
    await save([spec('XSK-001', true), spec('XSK-002'), spec('XSK-003')], false, 'XSK');
    for (const tcId of 번호들) await 고치기(tcId, { smoke: null });
    const 엑셀 = async (smoke: boolean | undefined) =>
      (await 엑셀자료({ service: 'XSK', serviceId: 서비스, q: '', activeOnly: false, smoke, canSeeRuns: false, canSeeAuthoring: false })).cases.map((c) => c.tcId);
    expect([await 엑셀(true), await 엑셀(false), await 엑셀(undefined)]).toEqual([['XSK-001'], ['XSK-002', 'XSK-003'], 번호들]);
  });

  it('비활성 케이스도 고치고, 없으면 404 · 본문이 틀리면 400', async () => {
    await (await pool()).query("UPDATE test_case SET is_active = false WHERE tc_id = 'XSK-002'");
    expect((await 고치기('XSK-002', { smoke: true })).statusCode).toBe(204);
    expect(await findCase('XSK-002')).toMatchObject({ smoke: true, isActive: false });

    const 없음 = await 고치기('XSK-404', { smoke: true });
    expect(없음.statusCode).toBe(404);
    expect(없음.json()).toMatchObject({ error: 'CASE_NOT_FOUND' });
    for (const 틀림 of [{}, { smoke: 'yes' }, { smoke: true, extra: 1 }]) {
      const res = await 고치기('XSK-001', 틀림);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: 'INVALID_REQUEST' });
    }
  });

  it('케이스 write 칸이 없으면 403 이고 값은 그대로다', async () => {
    const 앞 = await findCase('XSK-001');
    const res = await 고치기('XSK-001', { smoke: false }, 'xsk-reader');
    expect(res.statusCode).toBe(403);
    expect((await findCase('XSK-001'))?.smokeSet).toBe(앞?.smokeSet);
  });
});
