// trace 적재 — 상태 줄 · 통과 zip 삭제 · 실패 항목 본문 · 가림 · 다시 풀어도 그대로 · 재기동 복구 (DB 접속이 있을 때만 돈다)
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import JSZip from 'jszip';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

const j = (...줄: unknown[]): string => 줄.map((l) => JSON.stringify(l)).join('\n');

// 단계 1 하나 · 로그인 API 하나 · 비밀번호 칸 채우기 하나 · 콘솔 오류 하나
async function 가짜zip(): Promise<Buffer> {
  const 묶음 = new JSZip();
  묶음.file(
    'test.trace',
    j(
      { type: 'context-options', monotonicTime: 0 },
      { type: 'before', callId: 'pw:api@1', method: 'pw:api', class: 'Test', title: 'Fill "xtc-비번"', params: { locator: "getByLabel('비밀번호')", value: 'xtc-비번' }, startTime: 10 },
      { type: 'after', callId: 'pw:api@1', endTime: 12 },
      { type: 'before', callId: 'test.attach@2', method: 'test.attach', class: 'Test', startTime: 100 },
      { type: 'after', callId: 'test.attach@2', attachments: [{ name: 'platform-step', file: 'attachments/s1' }] },
    ),
  );
  묶음.file('attachments/s1', '{"seq":1}');
  묶음.file(
    '1-trace.network',
    j({
      type: 'resource-snapshot',
      snapshot: {
        _monotonicTime: 20, _resourceType: 'fetch', time: 4,
        request: { method: 'POST', url: 'http://a/login?token=t0k', postData: { mimeType: 'application/json', text: '{"password":"xtc-비번"}' } },
        response: { status: 401, content: { mimeType: 'application/json', text: '{"error":"no"}' } },
      },
    }),
  );
  묶음.file('1-trace.trace', j({ type: 'console', messageType: 'error', text: '실패 xtc-비번', time: 30, location: { url: 'http://a/' } }));
  return 묶음.generateAsync({ type: 'nodebuffer' });
}

describe.skipIf(연결 === undefined)('trace 적재', () => {
  let pool: Pool;
  let 서비스 = 0;
  let 실행 = 0;
  let 임시 = '';
  const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;

  const 비밀스키마 = JSON.stringify({ type: 'object', properties: { password: { type: 'string', secret: true } } });

  async function 항목(tcId: string, status: string, platform = 'desktop'): Promise<number> {
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, file_path, timeout_ms, precondition, params, expected,
                             param_schema, expected_schema, status, duration_ms, finished_at)
            VALUES ($1, $2, $3, $2, 'xtc.spec.ts', 5000, '[]', '{"password":"xtc-비번"}', '{}', $4, '{}', $5, 10, now())
         RETURNING history_id`,
      [실행, tcId, platform, 비밀스키마, status],
    );
    return Number(r.rows[0]!.history_id);
  }

  async function zip을둔다(historyId: number, 내용?: Buffer): Promise<string> {
    const { trace경로 } = await import('./traceIngest.js');
    const 경로 = trace경로(실행, historyId);
    mkdirSync(dirname(경로), { recursive: true });
    writeFileSync(경로, 내용 ?? (await 가짜zip()));
    return 경로;
  }

  const 상태 = async (historyId: number) =>
    (await pool.query<{ status: string; reason: string | null }>('SELECT status, reason FROM run_trace WHERE history_id = $1', [historyId])).rows[0];

  const 치우기 = async () => {
    // run_trace · run_network · run_action · run_console 은 run_item 을 지우면 같이 지워진다(ON DELETE CASCADE)
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
  };

  beforeAll(async () => {
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    임시 = mkdtempSync(join(tmpdir(), 'xtc-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XTC', 'XTC trace 적재 검사용', '#3A5FCD', '', 'xtc')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    await 치우기();
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id)
            VALUES ('XTC 실행', 'XTC', '', 'xtc', 'qa', 'https://qa.example.com', 'FINISHED', $1) RETURNING run_id`,
      [서비스],
    );
    실행 = Number(r.rows[0]!.run_id);
  });

  beforeEach(async () => {
    await 치우기();
  });

  afterAll(async () => {
    await 치우기();
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
    rmSync(임시, { recursive: true, force: true });
  });

  it('통과 항목은 세 기록을 넣고 본문은 안 남기고 zip 을 지운다', async () => {
    const { trace를적재한다, trace기록을읽는다 } = await import('./traceIngest.js');
    const h = await 항목('XTC-001', 'PASS');
    const 경로 = await zip을둔다(h);

    expect(await trace를적재한다(h)).toBe('DONE');

    const 기록 = await trace기록을읽는다(h);
    expect(기록).toMatchObject({ status: 'DONE', reason: null });
    expect(기록!.network).toEqual([
      { seq: 1, atMs: 20, method: 'POST', url: 'http://a/login?token=********', status: 401, resourceType: 'fetch', durationMs: 4, failure: null, requestBody: null, responseBody: null },
    ]);
    expect(기록!.actions).toEqual([
      { seq: 1, atMs: 10, title: 'Fill "********"', target: "getByLabel('비밀번호')", value: '********', durationMs: 2, error: null },
    ]);
    expect(기록!.console).toEqual([{ seq: 1, atMs: 30, level: 'error', text: '실패 ********', url: 'http://a/' }]);
    expect(existsSync(경로)).toBe(false);
  });

  it('실패 항목은 API 본문을 가려 남기고 zip 은 에이전트 참고용으로 둔다', async () => {
    const { trace를적재한다, trace기록을읽는다 } = await import('./traceIngest.js');
    const h = await 항목('XTC-002', 'FAIL');
    const 경로 = await zip을둔다(h);

    await trace를적재한다(h);

    expect((await trace기록을읽는다(h))!.network[0]).toMatchObject({ requestBody: '{"password":"********"}', responseBody: '{"error":"no"}' });
    expect(existsSync(경로)).toBe(true);
  });

  it('같은 항목을 다시 풀어도 줄이 늘지 않는다', async () => {
    const { trace를적재한다 } = await import('./traceIngest.js');
    const h = await 항목('XTC-003', 'FAIL');
    await zip을둔다(h);

    await trace를적재한다(h);
    await trace를적재한다(h);

    const 셈 = await pool.query<{ n: string }>('SELECT count(*) AS n FROM run_network WHERE history_id = $1', [h]);
    expect(Number(셈.rows[0]!.n)).toBe(1);
  });

  it('앱 실행 · 파일 없음은 「없음」, 깨진 zip 은 「실패」와 사유를 남긴다 — 깨진 zip 은 지우지 않는다', async () => {
    const { trace를적재한다 } = await import('./traceIngest.js');
    const 앱 = await 항목('XTC-004', 'PASS', 'android');
    const 없음 = await 항목('XTC-005', 'PASS');
    const 깨짐 = await 항목('XTC-006', 'PASS');
    const 깨진경로 = await zip을둔다(깨짐, Buffer.from('zip 아님'));
    const 끊김 = await 항목('XTC-009', 'NA');
    await pool.query(`UPDATE run_item SET error = '{"message":"TIMEOUT"}' WHERE history_id = $1`, [끊김]);

    for (const h of [앱, 없음, 깨짐, 끊김]) await trace를적재한다(h);

    expect((await 상태(끊김))!.reason).toContain('러너가 실행을 끊어');

    expect(await 상태(앱)).toEqual({ status: 'NONE', reason: 'Android 앱 실행은 trace 가 없다' });
    expect((await 상태(없음))!.status).toBe('NONE');
    expect((await 상태(없음))!.reason).toContain('다른 기계의 러너');
    expect((await 상태(깨짐))!.status).toBe('FAILED');
    expect(existsSync(깨진경로)).toBe(true);
  });

  it('재기동 복구는 상태 줄이 없는 zip 만 다시 푼다', async () => {
    const { trace를적재한다, 밀린trace를푼다 } = await import('./traceIngest.js');
    const 푼것 = await 항목('XTC-007', 'FAIL');
    await zip을둔다(푼것);
    await trace를적재한다(푼것);
    const 밀린것 = await 항목('XTC-008', 'FAIL');
    await zip을둔다(밀린것);

    expect(await 밀린trace를푼다()).toBe(1);
    await expect.poll(async () => (await 상태(밀린것))?.status).toBe('DONE');
  });
});
