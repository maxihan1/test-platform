// 게임 하나에 플랫폼 하나 — 빌드 올리기는 애플리케이션 플랫폼과 같은 파일만 · PC 게임 실행도 build_id 에 고정 · windows 는 선언대로 지원 패드마다 펼친다
// (도메인/게임 §3.10 결정 27 · 「윈도우 PC」 · §7 마지막 블록). 분배는 가짜라 러너 · 팜에 닿지 않는다. DATABASE_URL 이 있을 때만 돈다

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
import { createRun } from './store.js';

vi.mock('./dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined), markAborted: vi.fn() }));

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XPW', 'XPWM', 'XPWA'];
const 케이스들 = ['XPW-FN-001', 'XPW-FN-002', 'XPW-FN-003', 'XPWM-FN-001', 'XPWM-FN-002', 'XPWA-FN-001'];

describe.skipIf(연결 === undefined)('게임 하나에 플랫폼 하나 — 빌드 · 실행', { timeout: 60_000 }, () => {
  let app: FastifyInstance;
  let pool: Pool;
  let 산출: string;
  const 서비스: Record<string, number> = {};
  const 토큰: Record<string, string> = {};
  const 옛환경 = { ...process.env };

  async function 치운다(): Promise<void> {
    const ids = `(SELECT id FROM service WHERE prefix = ANY($1))`;
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${ids})`, [접두사들]);
    await pool.query(`DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${ids})`, [접두사들]);
    await pool.query(`DELETE FROM test_run WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM app_build WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query(`DELETE FROM service_token WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await pool.query(`DELETE FROM service_env WHERE service_id IN ${ids}`, [접두사들]);
    await pool.query('DELETE FROM service WHERE prefix = ANY($1)', [접두사들]);
    await pool.query("DELETE FROM project WHERE name = 'XPW 프로젝트'");
    await pool.query("DELETE FROM app_user WHERE username = 'xpcb-admin'");
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
    (await pool.query<{ build_id: string | null; build_no: string | null; build_stage: string | null }>('SELECT build_id, build_no, build_stage FROM test_run WHERE run_id = $1', [runId])).rows[0]!;
  const 보낸항목 = () => vi.mocked(dispatch).mock.calls.flatMap((c) => c[1]).map((i) => [i.tcId, i.platform, i.buildId]);
  const 사람실행 = (tcId: string, platforms: string[], origin: 'MANUAL' | 'SCHEDULED' = 'MANUAL') =>
    createRun({ origin, triggeredBy: 'xpcb-admin', env: 'qa', items: [{ tcId, platforms: platforms as never, params: {}, expected: {} }] });

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
    await pool.query("INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ('xpcb-admin', 'xpw', 'x', 'admin', true, false)");
    const 프로젝트 = Number((await pool.query<{ id: string }>("INSERT INTO project (name) VALUES ('XPW 프로젝트') RETURNING id")).rows[0]!.id);
    for (const [prefix, kind, 플랫폼, 패드] of [['XPW', 'GAME', 'windows', '["ps5","xbox"]'], ['XPWM', 'GAME', 'android', '[]'], ['XPWA', 'APP', null, '[]']] as const) {
      서비스[prefix] = Number((await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind, game_platform, game_pads) VALUES ($1, $1, '#445566', '', $1, $2, $3, $4, $5) RETURNING id`,
        [prefix, 프로젝트, kind, 플랫폼, 패드],
      )).rows[0]!.id);
      await pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://qa.xpw.test')`, [서비스[prefix]]);
      토큰[prefix] = `cit_${prefix.padEnd(43, 'x')}`;
      await pool.query("INSERT INTO service_token (service_id, name, token_hash, created_by) VALUES ($1, 'CI', $2, 'xpcb-admin')", [서비스[prefix], 토큰해시(토큰[prefix]!)]);
    }
    for (const [tcId, platforms] of [
      ['XPW-FN-001', '["windows"]'],
      ['XPW-FN-002', '["windows-ps5","windows-ps4","windows-xbox"]'],
      ['XPW-FN-003', '["android"]'],
      ['XPWM-FN-001', '["android"]'],
      ['XPWM-FN-002', '["windows"]'],
      ['XPWA-FN-001', '["android"]'],
    ] as const) {
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

  it('PC 게임의 빌드 실행은 그 zip 을 build_id 에 고정하고 케이스를 선언대로 펼친다 — 지원 패드 밖 패드 · android 선언은 빠진다', async () => {
    vi.mocked(dispatch).mockClear();
    const 올림 = await 보낸다('XPW', '77', await 윈도우());
    expect(올림.statusCode).toBe(201);
    const { buildId, runIds } = 올림.json<{ buildId: number; runIds: number[] }>();
    expect(보낸항목()).toEqual([
      ['XPW-FN-001', 'windows', buildId],
      ['XPW-FN-002', 'windows-ps5', buildId],
      ['XPW-FN-002', 'windows-xbox', buildId],
    ]);
    expect(await 실행(runIds[0]!)).toMatchObject({ build_id: String(buildId), build_no: '77', build_stage: 'SMOKE' });
    expect((await 보낸다('XPW', '77', await 윈도우())).json()).toMatchObject({ error: 'BUILD_EXISTS' });
  });

  it('애플리케이션 플랫폼과 다른 파일은 400 BAD_FILE_TYPE — PC 게임의 APK · apkUrl, 모바일 게임 · Android 앱의 zip', async () => {
    expect((await 보낸다('XPW', '1', await 안드로이드(), 'application/octet-stream')).json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
    const 주소 = await app.inject({ method: 'POST', url: '/api/builds', headers: { authorization: `Bearer ${토큰.XPW!}` }, payload: { env: 'qa', buildNo: '1', apkUrl: 'https://repo.xpw.test/a.apk' } });
    expect(주소.json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
    expect((await 보낸다('XPWM', '1', await 윈도우())).json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
    expect((await 보낸다('XPWA', '1', await 윈도우())).json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
    expect((await 보낸다('XPW', '1', await zip(['A.exe', 'B.exe']))).json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
    expect((await 보낸다('XPWM', '1', await 안드로이드(), 'application/octet-stream')).statusCode).toBe(201);
    expect((await pool.query('SELECT 1 FROM app_build WHERE service_id = $1', [서비스.XPW])).rowCount).toBe(1);
  });

  it('PC 스모크가 다 통과하면 그 빌드로 회귀를 건다', async () => {
    const 스모크 = (await 보낸다('XPW', '78', await 윈도우())).json<{ buildId: number; runIds: number[] }>();
    await pool.query("UPDATE run_item SET status = 'PASS', finished_at = now() WHERE run_id = $1", [스모크.runIds[0]]);
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = now() WHERE run_id = $1", [스모크.runIds[0]]);
    await 스모크뒤(스모크.runIds[0]!);
    const 회귀 = await pool.query<{ run_id: string }>("SELECT run_id FROM test_run WHERE build_id = $1 AND build_stage = 'FULL'", [스모크.buildId]);
    expect(회귀.rowCount).toBe(1);
  });

  it('사람이 거는 실행 — windows 는 선언대로 펼치고 값 하나하나는 선언에 있어야 하며, 플랫폼 밖 값은 400 이다', async () => {
    const 최신 = Number((await pool.query<{ id: string }>("SELECT id FROM app_build WHERE service_id = $1 AND build_no = '78'", [서비스.XPW])).rows[0]!.id);
    const 펼침 = await 사람실행('XPW-FN-002', ['windows']);
    expect(펼침.items.map((i) => [i.platform, i.engine, i.buildId])).toEqual([
      ['windows-ps5', 'GAME', 최신],
      ['windows-xbox', 'GAME', 최신],
    ]);
    // 실패 다시 실행처럼 값 하나로 건 항목은 지원 패드를 안 본다
    expect((await 사람실행('XPW-FN-002', ['windows-ps4'])).items.map((i) => i.platform)).toEqual(['windows-ps4']);
    await expect(사람실행('XPW-FN-001', ['windows-ps5'])).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    await expect(사람실행('XPW-FN-003', ['android'])).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    await expect(사람실행('XPWM-FN-002', ['windows'])).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it('정기 · 빌드 실행은 플랫폼 밖 값만 빼고, 선언한 패드 값도 지원 패드로 다시 거른다', async () => {
    const 자동 = await createRun({
      origin: 'SCHEDULED',
      triggeredBy: 'xpcb-admin',
      env: 'qa',
      items: [
        { tcId: 'XPW-FN-002', platforms: ['windows-ps5', 'windows-ps4', 'windows-xbox'], params: {}, expected: {} },
        { tcId: 'XPW-FN-003', platforms: ['android'], params: {}, expected: {} },
      ],
    });
    expect(자동.items.map((i) => [i.tcId, i.platform])).toEqual([
      ['XPW-FN-002', 'windows-ps5'],
      ['XPW-FN-002', 'windows-xbox'],
    ]);
    // 지원 패드를 다 풀면 버튼 그림 케이스는 항목 없이 빠진다
    await pool.query("UPDATE service SET game_pads = '[]' WHERE id = $1", [서비스.XPW]);
    await expect(사람실행('XPW-FN-002', ['windows'])).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    await pool.query(`UPDATE service SET game_pads = '["ps5","xbox"]' WHERE id = $1`, [서비스.XPW]);
  });

  it('보관은 줄마다 최근 5개이고, 도는 실행이 쥔 빌드는 남긴다', async () => {
    for (const n of ['79', '80', '81', '82', '83', '84']) expect((await 보낸다('XPW', n, await 윈도우())).statusCode).toBe(201);
    const 남은 = (await pool.query<{ build_no: string }>('SELECT build_no FROM app_build WHERE service_id = $1 ORDER BY build_no', [서비스.XPW])).rows.map((r) => r.build_no);
    // 78 은 앞 검사의 회귀 · 사람 실행이 도는 중으로 쥐고 있다. 77 · 79 는 뒤 빌드가 오며 스모크가 멈춰 지워진다
    expect(남은).toEqual(['78', '80', '81', '82', '83', '84']);
  });

  it('지원 패드를 다 풀어 스모크에 돌 항목이 없어도 빌드 올리기는 실패가 아니다 — 빌드를 지우고 CI 가 영영 다시 부르지 않게', async () => {
    await pool.query("UPDATE service SET game_pads = '[]' WHERE id = $1", [서비스.XPW]);
    await pool.query("UPDATE test_case SET smoke = false WHERE tc_id = 'XPW-FN-001'");
    try {
      const 올림 = await 보낸다('XPW', '85', await 윈도우());
      expect(올림.statusCode).toBe(201);
      expect((await pool.query("SELECT 1 FROM app_build WHERE service_id = $1 AND build_no = '85'", [서비스.XPW])).rowCount).toBe(1);
    } finally {
      await pool.query("UPDATE test_case SET smoke = true WHERE tc_id = 'XPW-FN-001'");
      await pool.query(`UPDATE service SET game_pads = '["ps5","xbox"]' WHERE id = $1`, [서비스.XPW]);
    }
  });
});
