// 안정화 앱 집계 — 통과 항목 logcat 의 크래시 · ANR · 패키지 가르기 · 크래시 칸 · 디바이스 칸 · 견본 가림 · 기록 없음 · 기다림 (DB 접속이 있을 때만 돈다)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { APPIUM_SESSION_ID_FILE, FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('안정화 앱 집계', () => {
  let pool: Pool;
  let 서비스 = 0;
  let 임시 = '';
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;

  const 치우기 = async (): Promise<void> => {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_error WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    임시 = mkdtempSync(join(tmpdir(), 'stab-app-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, schedule_at, schedule_tz, schedule_env)
       VALUES ('XAN', 'XAN 안정화 앱 집계 검사용', '#3A5FCD', '', 'xan', 'APP', '03:00', 'Asia/Seoul', 'qa')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    rmSync(임시, { recursive: true, force: true });
  });

  async function 실행(env: string, kind: 'UI' | 'FN', 시작: string): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, origin, started_at, finished_at)
       VALUES ('XAN 정기', 'XAN', '', '스케줄러', $1, 'https://qa.xan.test', 'FINISHED', $2, $3, 'SCHEDULED', $4, $4::timestamptz + interval '1 hour')
       RETURNING run_id`,
      [env, 서비스, kind, 시작],
    );
    return Number(r.rows[0]!.run_id);
  }

  const 폰 = { model: 'SM-S911N', osVersion: '14', appVersion: '4.3', appBuild: '120', appPackage: 'org.xan.app' };

  /** logcat 이 null 이면 파일을 안 둔다. 번호 파일은 러너가 통과 항목에 남기는 것처럼 둘 수 있다 */
  async function 항목(runId: number, tcId: string, status: string, logcat: string | null, 번호파일 = false, device: object | null = 폰): Promise<number> {
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected,
                             param_schema, expected_schema, status, duration_ms, finished_at, device)
            VALUES ($1, $2, 'android', $2, 'xan.spec.ts', 5000, '[]', '{"password":"s3cret-pw"}', '{}', '{}', '{}', $3, 1000, now(), $4)
         RETURNING history_id`,
      [runId, tcId, status, device === null ? null : JSON.stringify(device)],
    );
    const h = Number(r.rows[0]!.history_id);
    const 곳 = runDir(String(runId), String(h));
    mkdirSync(곳, { recursive: true });
    if (logcat !== null) {
      mkdirSync(join(곳, FARM_EVIDENCE_DIR), { recursive: true });
      writeFileSync(join(곳, FARM_EVIDENCE_DIR, 'logcat.txt'), logcat);
    }
    if (번호파일) writeFileSync(join(곳, APPIUM_SESSION_ID_FILE), 'sess-1\n');
    return h;
  }

  const 줄 = (pid: number, 태그: string, 글: string): string => `11-12 10:00:03.123  ${pid}  ${pid} E ${태그}: ${글}`;
  const 크래시 = (프로세스 = 'org.xan.app', 메시지 = 'token s3cret-pw expired'): string =>
    [
      줄(4321, 'AndroidRuntime', 'FATAL EXCEPTION: main'),
      줄(4321, 'AndroidRuntime', `Process: ${프로세스}, PID: 4321`),
      줄(4321, 'AndroidRuntime', `java.lang.IllegalStateException: ${메시지}`),
      줄(4321, 'AndroidRuntime', '\tat org.xan.app.LoginActivity.onLogin(LoginActivity.kt:42)'),
    ].join('\n');
  const 집계 = async (runId: number, 상한 = 0) => (await import('./aggregate.js')).집계한다(runId, 상한, 1);
  const 집계줄 = async (runId: number) => (await pool.query('SELECT * FROM stab_run WHERE run_id = $1', [runId])).rows[0];

  it('통과 항목 logcat 의 그 앱 크래시를 세고 크래시 칸 · 디바이스 칸을 채우며 견본의 비밀값을 가린다', async () => {
    const ui = await 실행('qa', 'UI', '2001-05-01T18:00:00Z');
    const fn = await 실행('qa', 'FN', '2001-05-01T19:00:00Z');
    await 항목(ui, 'XAN-UI-001', 'PASS', '');
    await 항목(fn, 'XAN-FN-001', 'PASS', `${크래시()}\n${크래시()}`);
    await 항목(fn, 'XAN-FN-002', 'FAIL', 크래시('com.android.systemui'));
    // logcat 이 없는 항목은 기록 없음 — 분모에서 빠진다
    await 항목(fn, 'XAN-FN-003', 'PASS', null);

    expect(await 집계(ui)).toBe('집계함');
    expect(await 집계줄(fn)).toMatchObject({ cases: 3, error_cases: 1, pass_error_cases: 1, crashes: 2, residual: 1, new_errors: 1 });
    const 종류 = (await pool.query("SELECT id, source, title FROM stab_error WHERE service_id = $1 AND env = 'qa'", [서비스])).rows;
    expect(종류).toMatchObject([{ source: 'APP_CRASH', title: 'IllegalStateException · LoginActivity.onLogin' }]);
    const 발생 = (await pool.query('SELECT tc_id, hits, crash, device, seq FROM stab_occurrence WHERE error_id = $1', [종류[0]!.id])).rows;
    expect(발생).toEqual([{ tc_id: 'XAN-FN-001', hits: 2, crash: true, device: 'SM-S911N · Android 14', seq: null }]);
    const 견본 = (await pool.query<{ text: string; device: string }>('SELECT text, device FROM stab_sample WHERE error_id = $1', [종류[0]!.id])).rows;
    expect(견본[0]?.text).toContain('token ******** expired');
    expect(견본[0]?.text).not.toContain('s3cret-pw');
    expect(견본[0]?.device).toBe('SM-S911N · Android 14');
  });

  it('기기 정보에 패키지가 없으면 대상 서버 앱 경로의 패키지 이름으로 가른다', async () => {
    await pool.query("INSERT INTO service_env (service_id, env, base_url, app_path) VALUES ($1, 'qa2', 'https://qa.xan.test', 'org.xan.app')", [서비스]);
    const fn = await 실행('qa2', 'FN', '2001-05-02T18:00:00Z');
    await 항목(fn, 'XAN-FN-001', 'PASS', 크래시(), false, { model: 'SM-S911N', osVersion: '14', appVersion: null });
    expect(await 집계(fn)).toBe('집계함');
    expect(await 집계줄(fn)).toMatchObject({ crashes: 1, residual: 1 });
  });

  it('항목은 자기 연결이 연 패키지로 가른다 — 다른 앱을 연 케이스가 있어도 그 앱 크래시를 남의 항목에서 세지 않는다', async () => {
    const fn = await 실행('qa5', 'FN', '2001-05-05T18:00:00Z');
    await 항목(fn, 'XAN-FN-001', 'PASS', 크래시('com.android.settings'));
    await 항목(fn, 'XAN-FN-002', 'PASS', '', false, { ...폰, appPackage: 'com.android.settings' });
    expect(await 집계(fn)).toBe('집계함');
    expect(await 집계줄(fn)).toMatchObject({ cases: 2, crashes: 0, residual: 0 });
  });

  it('번호 파일만 있고 logcat 이 아직 없는 통과 항목은 상한까지 기다리고, 그동안 생기면 센다', async () => {
    const fn = await 실행('qa3', 'FN', '2001-05-03T18:00:00Z');
    const h = await 항목(fn, 'XAN-FN-001', 'PASS', null, true);
    const 집계중 = 집계(fn, 60_000);
    await new Promise((ok) => setTimeout(ok, 50));
    const 곳 = join(runDir(String(fn), String(h)), FARM_EVIDENCE_DIR);
    mkdirSync(곳, { recursive: true });
    writeFileSync(join(곳, 'logcat.txt'), 크래시());
    expect(await 집계중).toBe('집계함');
    expect(await 집계줄(fn)).toMatchObject({ cases: 1, crashes: 1 });
  });

  it('번호 파일도 logcat 도 없는 항목은 기다리지 않고 기록 없음이다 — 연결을 못 열었다', async () => {
    const fn = await 실행('qa4', 'FN', '2001-05-04T18:00:00Z');
    await 항목(fn, 'XAN-FN-001', 'NA', null);
    await 항목(fn, 'XAN-FN-002', 'PASS', '');
    const 앞 = Date.now();
    expect(await 집계(fn, 60_000)).toBe('집계함');
    expect(Date.now() - 앞).toBeLessThan(10_000);
    expect(await 집계줄(fn)).toMatchObject({ cases: 1, crashes: 0, residual: 0 });
  });
});
