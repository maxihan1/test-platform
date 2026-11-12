// 안정화 게임 집계 — 게임 오류 파일의 Exception · 단계 맞추기 · logcat 크래시 · 기록 없음 (DB 접속이 있을 때만 돈다)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR, GAME_ERRORS_FILE, runDir } from '@platform/kit';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('안정화 게임 집계', () => {
  let pool: Pool;
  let 서비스 = 0;
  let 임시 = '';
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;

  const 치우기 = async (): Promise<void> => {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_error WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    임시 = mkdtempSync(join(tmpdir(), 'stab-game-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, schedule_at, schedule_tz, schedule_env)
       VALUES ('XGX', 'XGX 안정화 게임 집계 검사용', '#3A5FCD', '', 'xgx', 'GAME', '03:00', 'Asia/Seoul', 'qa')
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
       VALUES ('XGX 정기', 'XGX', '', '스케줄러', $1, '', 'FINISHED', $2, $3, 'SCHEDULED', $4, $4::timestamptz + interval '1 hour')
       RETURNING run_id`,
      [env, 서비스, kind, 시작],
    );
    return Number(r.rows[0]!.run_id);
  }

  const 폰 = { model: 'SM-S911N', osVersion: '14', appPackage: 'com.xgx.game' };

  /** 파일이 null 이면 안 둔다. 단계는 시작 시각을 단다 */
  async function 항목(runId: number, tcId: string, status: string, 게임오류: string | null, logcat: string | null): Promise<number> {
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected,
                             param_schema, expected_schema, status, duration_ms, finished_at, device)
            VALUES ($1, $2, 'android', $2, 'xgx.spec.ts', 5000, '[]', '{"password":"s3cret-pw"}', '{}', '{}', '{}', $3, 1000, now(), $4)
         RETURNING history_id`,
      [runId, tcId, status, JSON.stringify(폰)],
    );
    const h = Number(r.rows[0]!.history_id);
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, started_at) VALUES
         ($1, 1, '로비에 들어간다', 'PASS', '2001-05-01T18:00:00Z'), ($1, 2, '보스를 공격한다', 'PASS', '2001-05-01T18:00:10Z')`,
      [h],
    );
    const 곳 = join(runDir(String(runId), String(h)), FARM_EVIDENCE_DIR);
    mkdirSync(곳, { recursive: true });
    if (게임오류 !== null) writeFileSync(join(곳, GAME_ERRORS_FILE), 게임오류);
    if (logcat !== null) writeFileSync(join(곳, 'logcat.txt'), logcat);
    return h;
  }

  const 머리 = '# 게임 Exception 1개 — 통과 항목이라 Exception 만 남겼습니다\n';
  const 예외 = (시각: string, 메시지 = 'NullReferenceException: token s3cret-pw'): string =>
    `${머리}\n#1 ${시각} Exception: ${메시지}\nUnity.BossRoom.Gameplay.ClientCharacter.OnAnimEvent (System.String id) [0x00012] in <abc>:0\n`;
  const 크래시 = [
    '11-12 10:00:03.123  4321  4321 E AndroidRuntime: FATAL EXCEPTION: main',
    '11-12 10:00:03.123  4321  4321 E AndroidRuntime: Process: com.xgx.game, PID: 4321',
    '11-12 10:00:03.123  4321  4321 E AndroidRuntime: java.lang.IllegalStateException: boom',
    '11-12 10:00:03.123  4321  4321 E AndroidRuntime: \tat com.xgx.game.Main.onCreate(Main.java:1)',
  ].join('\n');
  const 집계 = async (runId: number) => (await import('./aggregate.js')).집계한다(runId, 0, 1);
  const 집계줄 = async (runId: number) => (await pool.query('SELECT * FROM stab_run WHERE run_id = $1', [runId])).rows[0];

  it('통과 항목의 게임 Exception 을 단계와 함께 세고 견본의 비밀값을 가린다 — 크래시 칸은 logcat 만 센다', async () => {
    const ui = await 실행('qa', 'UI', '2001-05-01T17:00:00Z');
    const fn = await 실행('qa', 'FN', '2001-05-01T18:00:00Z');
    await 항목(ui, 'XGX-UI-001', 'PASS', 머리, null);
    await 항목(fn, 'XGX-FN-001', 'PASS', 예외('2001-05-01T18:00:12.000Z'), 크래시);
    // 게임이 크래시로 죽어 게임 오류 파일을 못 남겨도 logcat 이 있으면 기록이고 그 크래시를 센다
    await 항목(fn, 'XGX-FN-002', 'FAIL', null, 크래시);
    // 둘 다 없는 항목은 기록 없음 — 분모에서 빠진다
    await 항목(fn, 'XGX-FN-003', 'PASS', null, null);

    expect(await 집계(fn)).toBe('집계함');
    expect(await 집계줄(fn)).toMatchObject({ cases: 3, error_cases: 2, pass_error_cases: 1, crashes: 2, residual: 2, new_errors: 2 });
    const 종류 = (await pool.query("SELECT id, source, title FROM stab_error WHERE service_id = $1 AND env = 'qa' ORDER BY source", [서비스])).rows;
    expect(종류).toMatchObject([
      { source: 'APP_CRASH', title: 'IllegalStateException · Main.onCreate' },
      { source: 'GAME_EXCEPTION', title: 'NullReferenceException · ClientCharacter.OnAnimEvent' },
    ]);
    const 발생 = (await pool.query('SELECT tc_id, hits, crash, seq FROM stab_occurrence WHERE error_id = $1', [종류[1]!.id])).rows;
    // 같은 항목 logcat 에 크래시가 있어 「크래시 연결」이다
    expect(발생).toEqual([{ tc_id: 'XGX-FN-001', hits: 1, crash: true, seq: 2 }]);
    const 견본 = (await pool.query<{ text: string }>('SELECT text FROM stab_sample WHERE error_id = $1', [종류[1]!.id])).rows;
    expect(견본[0]?.text).toContain('Exception: NullReferenceException: token ********');
  });

  it('logcat 만 없는 게임 항목은 기록이 있고 크래시만 0 이다', async () => {
    const fn = await 실행('qa2', 'FN', '2001-05-02T18:00:00Z');
    await 항목(fn, 'XGX-FN-001', 'PASS', 예외('12:00:01'), null);
    expect(await 집계(fn)).toBe('집계함');
    expect(await 집계줄(fn)).toMatchObject({ cases: 1, crashes: 0, residual: 1 });
    const 발생 = (await pool.query("SELECT o.seq FROM stab_occurrence o JOIN stab_error e ON e.id = o.error_id WHERE e.service_id = $1 AND e.env = 'qa2'", [서비스])).rows;
    expect(발생).toEqual([{ seq: null }]);
    const 연결 = (await pool.query("SELECT o.crash FROM stab_occurrence o JOIN stab_error e ON e.id = o.error_id WHERE e.service_id = $1 AND e.env = 'qa2'", [서비스])).rows;
    expect(연결).toEqual([{ crash: false }]);
  });
});
