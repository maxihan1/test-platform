// 윈도우 PC 빌드 — zip 목차로 가르기 · 같은 번호를 폰 · PC 가 따로 · 빌드 실행은 올린 쪽 항목만 · 잇는 셈이 플랫폼마다 · 실행에 PC 빌드 고정
// (도메인/게임 §3.10 「빌드 — zip 하나」 · 공통/4 「윈도우 PC 빌드」). 분배는 가짜라 러너 · 팜에 닿지 않는다. DATABASE_URL 이 있을 때만 돈다

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 토큰해시 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 세션등록 } from '../auth/session.js';

import buildRoutes from './buildRoutes.js';
import { 스모크뒤 } from './buildRun.js';
import { dispatch } from './dispatcher.js';
import { createRun, RunInputError } from './store.js';

vi.mock('./dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined), markAborted: vi.fn() }));

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XPW', 'XPWA'];
const 케이스들 = ['XPW-FN-001', 'XPW-FN-002', 'XPWA-FN-001'];

describe.skipIf(연결 === undefined)('윈도우 PC 빌드', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 산출: string;
  const 서비스: Record<string, number> = {};
  const 토큰: Record<string, string> = {};
  const 옛환경 = { ...process.env };

  async function 치운다(): Promise<void> {
    const ids = `(SELECT id FROM service WHERE prefix = ANY($1))`;
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${ids})`, [접두사들]);
    await pool.query(`DELETE FROM test_run WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM app_build WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM service_token WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query(`DELETE FROM service_env WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query('DELETE FROM service WHERE prefix = ANY($1)', [접두사들]);
    await pool.query("DELETE FROM project WHERE name = 'XPW 프로젝트'");
    await pool.query("DELETE FROM app_user WHERE username = 'xpw-admin'");
  }

  const zip = async (파일들: string[]): Promise<Buffer> => {
    const z = new JSZip();
    for (const f of 파일들) z.file(f, 'x');
    return z.generateAsync({ type: 'nodebuffer' });
  };
  const 보낸다 = (prefix: string, buildNo: string, 몸: Buffer, 종류 = 'application/zip') =>
    app.inject({ method: 'POST', url: `/api/builds?env=qa&buildNo=${buildNo}`, headers: { authorization: `Bearer ${토큰[prefix]!}`, 'content-type': 종류 }, payload: 몸 });
  const 윈도우 = () => zip(['BossRoom/BossRoom.exe', 'BossRoom/UnityCrashHandler64.exe', 'BossRoom/UnityPlayer.dll']);
  const 안드로이드 = () => zip(['AndroidManifest.xml', 'classes.dex']);
  const 실행 = async (runId: number) =>
    (await pool.query<{ build_id: string | null; pc_build_id: string | null; pc_build_no: string | null; build_stage: string | null; status: string }>(
      'SELECT build_id, pc_build_id, pc_build_no, build_stage, status FROM test_run WHERE run_id = $1', [runId],
    )).rows[0]!;
  const 보낸항목 = () => vi.mocked(dispatch).mock.calls.flatMap((c) => c[1]).map((i) => ({ tcId: i.tcId, platform: i.platform, pcBuildId: i.pcBuildId }));

  beforeAll(async () => {
    pool = (await import('../db/index.js')).pool;
    산출 = await mkdtemp(join(tmpdir(), 'xpw-builds-'));
    Object.assign(process.env, { PLATFORM_ARTIFACTS_DIR: 산출, SESSION_SECRET: 'xpw-검사용-세션-열쇠-32바이트를-넉넉히-넘긴다', DEVICE_FARM_URL: 'http://farm.xpw.test' });
    app = Fastify();
    세션등록(app, process.env.SESSION_SECRET!);
    인증등록(app);
    await app.register(buildRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();

    // CI 토큰은 발급한 admin 계정에 묶인다
    await pool.query("INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ('xpw-admin', 'xpw', 'x', 'admin', true, false)");
    const 프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XPW 프로젝트') RETURNING id")).rows[0]!.id);
    for (const [prefix, kind] of [['XPW', 'GAME'], ['XPWA', 'APP']] as const) {
      서비스[prefix] = Number((await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ($1, $1, '#445566', '', $1, $2, $3) RETURNING id`,
        [prefix, 프로젝트, kind],
      )).rows[0]!.id);
      await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://qa.xpw.test')`, [서비스[prefix]]);
      토큰[prefix] = `cit_${prefix.padEnd(43, 'x')}`;
      await pool.query("INSERT INTO service_token (service_id, name, token_hash, created_by) VALUES ($1, 'CI', $2, 'xpw-admin')", [서비스[prefix], 토큰해시(토큰[prefix]!)]);
    }
    for (const [tcId, platforms] of [['XPW-FN-001', '["android","windows"]'], ['XPW-FN-002', '["android"]'], ['XPWA-FN-001', '["android","windows"]']] as const) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, smoke)
         VALUES ($1, $1, $2, '[]', 'xpw/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}', true)`,
        [tcId, platforms],
      );
    }
  });

  afterAll(async () => {
    await 치운다();
    await app.close();
    await rm(산출, { recursive: true, force: true });
    process.env = 옛환경;
    await pool.end();
  });

  it('게임은 같은 번호로 APK 와 윈도우 zip 을 따로 올리고, 빌드 실행은 올린 쪽 항목만 담는다', async () => {
    vi.mocked(dispatch).mockClear();
    const apk = await 보낸다('XPW', '77', await 안드로이드(), 'application/octet-stream');
    expect(apk.statusCode).toBe(201);
    expect(보낸항목()).toEqual([
      { tcId: 'XPW-FN-001', platform: 'android', pcBuildId: undefined },
      { tcId: 'XPW-FN-002', platform: 'android', pcBuildId: undefined },
    ]);

    vi.mocked(dispatch).mockClear();
    const pc = await 보낸다('XPW', '77', await 윈도우());
    expect(pc.statusCode).toBe(201);
    const { buildId, runIds } = pc.json<{ buildId: number; runIds: number[] }>();
    expect(보낸항목()).toEqual([{ tcId: 'XPW-FN-001', platform: 'windows', pcBuildId: buildId }]);
    // PC 빌드 실행은 폰 칸이 비고 PC 칸이 그 빌드다
    expect(await 실행(runIds[0]!)).toMatchObject({ build_id: null, pc_build_id: String(buildId), pc_build_no: '77', build_stage: 'SMOKE' });
    // 폰 빌드의 스모크는 PC zip 이 왔다고 멈추지 않는다 — CI 가 둘을 몇 초 사이에 올린다
    expect((await 실행(apk.json<{ runIds: number[] }>().runIds[0]!)).status).toBe('RUNNING');

    const 행 = await pool.query<{ platform: string }>("SELECT platform FROM app_build WHERE service_id = $1 AND build_no = '77' ORDER BY platform", [서비스.XPW]);
    expect(행.rows.map((r) => r.platform)).toEqual(['android', 'windows']);
    expect((await 보낸다('XPW', '77', await 윈도우())).json()).toMatchObject({ error: 'BUILD_EXISTS' });
  });

  it('윈도우 zip 은 게임만 받고, exe 가 없거나 둘이면 거절한다', async () => {
    expect((await 보낸다('XPWA', '1', await 윈도우())).json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
    expect((await 보낸다('XPW', '1', await zip(['A.exe', 'B.exe']))).json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
    expect((await 보낸다('XPW', '1', await zip(['readme.txt']))).json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
  });

  it('PC 스모크가 다 통과하면 그 PC 빌드로 회귀를 건다 — 폰 빌드가 뒤에 와도 막지 않는다', async () => {
    vi.mocked(dispatch).mockClear();
    const 스모크 = (await 보낸다('XPW', '78', await 윈도우())).json<{ buildId: number; runIds: number[] }>();
    await 보낸다('XPW', '78', await 안드로이드(), 'application/octet-stream');
    await pool.query("UPDATE run_item SET status = 'PASS', finished_at = now() WHERE run_id = $1", [스모크.runIds[0]]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = now() WHERE run_id = $1", [스모크.runIds[0]]);
    await 스모크뒤(스모크.runIds[0]!);
    const 회귀 = await pool.query<{ run_id: string }>("SELECT run_id FROM test_run WHERE pc_build_id = $1 AND build_stage = 'FULL'", [스모크.buildId]);
    expect(회귀.rowCount).toBe(1);
    expect(await 실행(Number(회귀.rows[0]!.run_id))).toMatchObject({ build_id: null, pc_build_no: '78' });
  });

  it('사람이 거는 실행은 패드 값을 받고 그 줄 최신 PC 빌드를 고정한다. 게임이 아니면 Windows 를 못 고른다', async () => {
    const { runId, items } = await createRun({
      origin: 'MANUAL',
      triggeredBy: 'xpw-admin',
      env: 'qa',
      items: [{ tcId: 'XPW-FN-001', platforms: ['android', 'windows-ps5'], params: {}, expected: {} }],
    });
    const 최신 = await pool.query<{ id: string }>("SELECT id FROM app_build WHERE service_id = $1 AND platform = 'windows' ORDER BY uploaded_at DESC, id DESC LIMIT 1", [서비스.XPW]);
    expect(await 실행(runId)).toMatchObject({ pc_build_id: 최신.rows[0]!.id, pc_build_no: '78' });
    expect(items.map((i) => [i.platform, i.engine, i.pcBuildId])).toEqual([
      ['android', 'GAME', undefined],
      ['windows-ps5', 'GAME', Number(최신.rows[0]!.id)],
    ]);

    const 막힘 = createRun({ origin: 'MANUAL', triggeredBy: 'xpw-admin', env: 'qa', items: [{ tcId: 'XPWA-FN-001', platforms: ['windows'], params: {}, expected: {} }] });
    await expect(막힘).rejects.toBeInstanceOf(RunInputError);
    await expect(막힘).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });
});
