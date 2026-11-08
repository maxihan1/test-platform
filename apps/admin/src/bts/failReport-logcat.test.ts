// 앱 · 게임 항목의 이슈 본문에는 네트워크 · 콘솔 대신 폰 logcat 오류 줄을 싣는다 · 러너가 팜 증적을 받는 중이면 기다린다 (도메인/BTS 「버그 바퀴」)
// DATABASE_URL 이 있을 때만 돈다

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { APPIUM_SESSION_ID_FILE, FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 실패등록 } from './failReport.js';

const 연결 = process.env.DATABASE_URL;

const 폰기록 = [
  '--------- beginning of main',
  '11-04 10:00:00.100  1459  1568 I ActivityManager: Start proc 4321:com.xlg.app/u0a352 for next-top-activity {com.xlg.app/com.xlg.app.MainActivity}',
  "11-04 10:00:00.200  3110  3110 E adbd    : failed to connect to socket 'tcp:6790': Connection refused",
  '11-04 10:00:01.000  4321  4321 I XlgApp  : 주문 화면을 연다',
  '11-04 10:00:03.000  4321  4321 E AndroidRuntime: FATAL EXCEPTION: main',
  '11-04 10:00:03.000  4321  4321 E AndroidRuntime: Process: com.xlg.app, PID: 4321',
  '11-04 10:00:03.000  4321  4321 E AndroidRuntime: java.lang.IllegalStateException: 비밀번호 XLG-PW-55 를 거절했다',
  '',
].join('\n');

describe.skipIf(연결 === undefined)('실패 등록 — 앱 · 게임 항목의 폰 로그', () => {
  let pool: Pool;
  let 서비스 = 0;
  let 임시 = '';
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;

  async function 앱실패(tcId: string): Promise<[number, number]> {
    const runId = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, started_at, finished_at)
           VALUES ($2, 'xlg', 'qa', 'FINISHED', $1, 'XLG 앱', '', '', 'FN', now() - interval '1 minute', now()) RETURNING run_id`,
          [서비스, `XLG 실행 ${tcId}`],
        )
      ).rows[0]!.run_id,
    );
    const historyId = Number(
      (
        await pool.query<{ history_id: string }>(
          `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected,
                                 param_schema, expected_schema, status, duration_ms, finished_at)
           VALUES ($1, $2, 'android', 1, $3, 'xlg/a.spec.ts', 300000, '[]', $4, '{}', $5, '{}', 'FAIL', 100, now())
           RETURNING history_id`,
          [
            runId,
            tcId,
            `${tcId} 주문 목록`,
            JSON.stringify({ password: 'XLG-PW-55' }),
            JSON.stringify({ properties: { password: { type: 'string', secret: true } } }),
          ],
        )
      ).rows[0]!.history_id,
    );
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions) VALUES ($1, 1, '주문 목록을 연다', 'FAIL', 10, '[]')`,
      [historyId],
    );
    return [runId, historyId];
  }

  const 팜폴더 = (runId: number, historyId: number): string => join(runDir(String(runId), String(historyId)), FARM_EVIDENCE_DIR);

  const 본문 = async (tcId: string): Promise<string> =>
    (
      await pool.query<{ payload: { description: string } }>(
        `SELECT payload FROM bts_outbox WHERE service_id = $1 AND tc_id = $2 AND kind = 'CREATE'`,
        [서비스, tcId],
      )
    ).rows[0]!.payload.description;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    임시 = mkdtempSync(join(tmpdir(), 'xlg-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    const 프로젝트 = Number((await pool.query<{ id: string }>(`INSERT INTO project (name) VALUES ('XLG 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ('XLG', 'XLG 앱', '#112233', '', 'xlg', $1) RETURNING id`,
          [프로젝트],
        )
      ).rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'DM', 'qahub-xlg', 's', '{}', '{}', 'xlg')`,
      [프로젝트],
    );
  });

  afterAll(async () => {
    // bts_outbox 는 service 와, bts_link 는 project 와 같이 지워진다. 남은 애플리케이션이 없는 project 는 트리거가 지운다
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.end();
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    rmSync(임시, { recursive: true, force: true });
  });

  it('받아 둔 logcat 에서 앱 오류 줄을 비밀값을 가려 「폰 로그(logcat)」 절로 싣는다 — 네트워크 · 콘솔 절은 없다', async () => {
    const [runId, historyId] = await 앱실패('XLG-001');
    mkdirSync(팜폴더(runId, historyId), { recursive: true });
    writeFileSync(join(팜폴더(runId, historyId), 'logcat.txt'), 폰기록);

    expect(await 실패등록(runId)).toBe(1);
    const 글 = await 본문('XLG-001');
    expect(글).toContain('### 디바이스 로그(logcat)');
    expect(글).toContain('E AndroidRuntime: FATAL EXCEPTION: main');
    expect(글).toContain('java.lang.IllegalStateException: 비밀번호 ******** 를 거절했다');
    expect(글).not.toContain('XLG-PW-55');
    expect(글).not.toContain('adbd');
    expect(글).not.toContain('### 네트워크 · 콘솔');
  });

  it('러너가 팜 증적을 아직 받는 중이면(연결 번호 파일이 남았다) logcat 이 올 때까지 기다린다', async () => {
    const [runId, historyId] = await 앱실패('XLG-002');
    const 번호파일 = join(runDir(String(runId), String(historyId)), APPIUM_SESSION_ID_FILE);
    mkdirSync(runDir(String(runId), String(historyId)), { recursive: true });
    writeFileSync(번호파일, 'sess-xlg\n');
    const 받기끝 = setTimeout(() => {
      mkdirSync(팜폴더(runId, historyId), { recursive: true });
      writeFileSync(join(팜폴더(runId, historyId), 'logcat.txt'), 폰기록);
      rmSync(번호파일);
    }, 1500);
    try {
      expect(await 실패등록(runId)).toBe(1);
    } finally {
      clearTimeout(받기끝);
    }
    expect(await 본문('XLG-002')).toContain('E AndroidRuntime: FATAL EXCEPTION: main');
  });

  it('받는 중도 아닌데 logcat 이 없으면 기다리지 않고 「받아 둔 디바이스 로그가 없습니다」 한 줄이다', async () => {
    const [runId] = await 앱실패('XLG-003');
    const 시작 = Date.now();
    expect(await 실패등록(runId)).toBe(1);
    expect(Date.now() - 시작).toBeLessThan(3000);
    const 글 = await 본문('XLG-003');
    expect(글).toContain('### 디바이스 로그(logcat)');
    expect(글).toContain('이 항목은 받아 둔 디바이스 로그가 없습니다');
    expect(글).not.toContain('네트워크 · 콘솔');
  });
});
