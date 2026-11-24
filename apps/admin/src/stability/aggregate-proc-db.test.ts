// 안정화 게임 집계의 프로시저 줄 — 실행 단위 폴더 · 시작한 케이스만 분모 · Exception 은 시각으로 · 크래시는 깨진 케이스에 (DB 접속이 있을 때만 돈다)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR, GAME_ERRORS_FILE, runDir } from '@platform/kit';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 기준세트세우기, 기준세트지우기 } from './schedFixture.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('안정화 게임 집계 — 프로시저', () => {
  let pool: Pool;
  let 서비스 = 0;
  let 임시 = '';
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;

  const 치우기 = async (): Promise<void> => {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM stab_error WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    임시 = mkdtempSync(join(tmpdir(), 'stab-proc-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, game_platform)
       VALUES ('XGQ', 'XGQ 안정화 프로시저 집계 검사용', '#3A5FCD', '', 'xgq', 'GAME', 'android')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    await 기준세트지우기(pool, 서비스);
    await 기준세트세우기(pool, 서비스);
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    await 기준세트지우기(pool, 서비스);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    rmSync(임시, { recursive: true, force: true });
  });

  const 폰 = { model: 'SM-S911N', osVersion: '14', appPackage: 'com.xgq.game' };

  async function 실행(시작: string): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, kind, origin, started_at, finished_at)
       VALUES ('XGQ 정기', 'XGQ', '', '스케줄러', 'qa', '', 'FINISHED', $1, 'FN', 'SCHEDULED', $2, $2::timestamptz + interval '1 hour')
       RETURNING run_id`,
      [서비스, 시작],
    );
    return Number(r.rows[0]!.run_id);
  }

  async function 단위(runId: number, procId: string, 게임오류: string | null, logcat: string | null): Promise<number> {
    const r = await pool.query<{ exec_id: string }>(
      `INSERT INTO run_exec (run_id, file_path, proc_id, proc_name, platform, timeout_ms) VALUES ($1, $2, $3, '보스전', 'android', 900000) RETURNING exec_id`,
      [runId, `xgq/${procId}.spec.ts`, procId],
    );
    const 번호 = Number(r.rows[0]!.exec_id);
    const 곳 = join(runDir(String(runId), String(번호)), FARM_EVIDENCE_DIR);
    mkdirSync(곳, { recursive: true });
    if (게임오류 !== null) writeFileSync(join(곳, GAME_ERRORS_FILE), 게임오류);
    if (logcat !== null) writeFileSync(join(곳, 'logcat.txt'), logcat);
    return 번호;
  }

  interface 케이스줄 {
    tcId: string;
    seq: number;
    status: string;
    message: string | null;
    시작: string | null;
    단계: string[];
    비번: string;
  }

  async function 케이스(runId: number, execId: number, c: 케이스줄): Promise<void> {
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema,
                             status, error, duration_ms, finished_at, device, exec_id, exec_seq, case_started_at)
            VALUES ($1, $2, 'android', $2, 'xgq/XGQ-TP-001.spec.ts', 300000, '[]', $3, '{}', '{}', '{}', $4, $5, 1000, now(), $6, $7, $8, $9)
         RETURNING history_id`,
      [
        runId,
        c.tcId,
        JSON.stringify({ password: c.비번 }),
        c.status,
        c.message === null ? null : JSON.stringify({ message: c.message }),
        JSON.stringify(폰),
        execId,
        c.seq,
        c.시작,
      ],
    );
    const h = Number(r.rows[0]!.history_id);
    for (const [i, 시각] of c.단계.entries()) {
      await pool.query(`INSERT INTO run_item_step (history_id, seq, title, status, started_at) VALUES ($1, $2, '절차', 'PASS', $3)`, [h, i + 1, 시각]);
    }
  }

  const 머리 = '# 게임 오류 1개\n';
  const 예외 = (시각: string, 메시지: string): string =>
    `${머리}\n#1 ${시각} Exception: NullReferenceException: ${메시지}\nUnity.BossRoom.Gameplay.ClientCharacter.OnAnimEvent (System.String id) [0x00012] in <abc>:0\n`;
  const 크래시 = [
    '11-24 10:00:03.123  4321  4321 E AndroidRuntime: FATAL EXCEPTION: main',
    '11-24 10:00:03.123  4321  4321 E AndroidRuntime: Process: com.xgq.game, PID: 4321',
    '11-24 10:00:03.123  4321  4321 E AndroidRuntime: java.lang.IllegalStateException: boom',
    '11-24 10:00:03.123  4321  4321 E AndroidRuntime: \tat com.xgq.game.Main.onCreate(Main.java:1)',
  ].join('\n');

  it('실행 단위 폴더를 읽고 시작한 케이스만 세며 Exception 은 시각으로 · 크래시는 깨진 케이스에 붙인다', async () => {
    const fn = await 실행('2001-06-01T18:00:00Z');
    // 셋째 케이스의 비밀값이 둘째 케이스에 붙는 견본에 되비친다 — 실행 단위 비밀값을 합쳐 가린다
    const p1 = await 단위(fn, 'XGQ-TP-001', 예외('2001-06-01T18:00:06.000Z', 'token s3cret-103'), 크래시);
    await 케이스(fn, p1, { tcId: 'XGQ-FN-101', seq: 1, status: 'PASS', message: null, 시작: '2001-06-01T18:00:00Z', 단계: ['2001-06-01T18:00:01Z', '2001-06-01T18:00:05Z'], 비번: 's3cret-101' });
    await 케이스(fn, p1, { tcId: 'XGQ-FN-102', seq: 2, status: 'FAIL', message: 'boom', 시작: '2001-06-01T18:00:10Z', 단계: ['2001-06-01T18:00:11Z'], 비번: 's3cret-102' });
    await 케이스(fn, p1, { tcId: 'XGQ-FN-103', seq: 3, status: 'NA', message: 'BLOCKED', 시작: null, 단계: [], 비번: 's3cret-103' });
    // 기록은 있지만 시작한 케이스가 없는 실행 단위는 통째로 빠진다
    const p2 = await 단위(fn, 'XGQ-TP-002', null, 크래시);
    await 케이스(fn, p2, { tcId: 'XGQ-FN-201', seq: 1, status: 'NA', message: 'ABORTED', 시작: null, 단계: [], 비번: 's3cret-201' });

    expect(await (await import('./aggregate.js')).집계한다(fn, 0, 1)).toBe('집계함');
    const 집계줄 = (await pool.query('SELECT * FROM stab_run WHERE run_id = $1', [fn])).rows[0];
    expect(집계줄).toMatchObject({ cases: 2, error_cases: 2, pass_error_cases: 1, crashes: 1, residual: 2 });

    const 발생 = (
      await pool.query(
        `SELECT e.source, o.tc_id, o.seq, o.crash FROM stab_occurrence o JOIN stab_error e ON e.id = o.error_id
          WHERE e.service_id = $1 ORDER BY e.source`,
        [서비스],
      )
    ).rows;
    expect(발생).toEqual([
      { source: 'APP_CRASH', tc_id: 'XGQ-FN-102', seq: null, crash: true },
      { source: 'GAME_EXCEPTION', tc_id: 'XGQ-FN-101', seq: 2, crash: false },
    ]);
    const 견본 = (
      await pool.query<{ text: string }>(
        "SELECT s.text FROM stab_sample s JOIN stab_error e ON e.id = s.error_id WHERE e.service_id = $1 AND e.source = 'GAME_EXCEPTION'",
        [서비스],
      )
    ).rows;
    expect(견본[0]?.text).toContain('token ********');
    expect(견본[0]?.text).not.toContain('s3cret-103');
  });
});
