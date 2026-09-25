// 미확정 항목을 박제하고 따로 세는지 본다 (SPEC 도메인/실행 §3.2 「미확정 항목은 따로 센다」).
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { notifyRun } from './notify.js';
import { findItem, findRun, listRuns } from './queries.js';
import { createRun } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 케이스 = `
  INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, unconfirmed)
  VALUES ($1, $2, '["desktop","mobile"]', '[]', $3, '{}', '{}', $4)
  ON CONFLICT (tc_id) DO UPDATE SET unconfirmed = EXCLUDED.unconfirmed`;

describe.skipIf(연결 === undefined)('미확정 항목', () => {
  let pool: Pool;

  async function 치운다(): Promise<void> {
    await pool.query("DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XBU%')");
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XBU%'");
  }

  async function 케이스를둔다(): Promise<void> {
    await pool.query(케이스, ['XBU-001', '확정 케이스', 'demo/XBU-001.spec.ts', null]);
    await pool.query(케이스, ['XBU-002', '미확정 케이스', 'demo/XBU-002.spec.ts', '기획서에 없는 안내 문구']);
    await pool.query(케이스, ['XBU-003', '또 미확정', 'demo/XBU-003.spec.ts', '버튼 이름이 기획과 다름']);
  }

  async function 실행(title: string, items: { tcId: string; platforms: ('desktop' | 'mobile')[] }[]): Promise<number> {
    const run = await createRun({
      title,
      triggeredBy: 'tester',
      env: 'qa',
      notifySlack: true,
      items: items.map((i) => ({ ...i, params: {}, expected: {} })),
    });
    return run.runId;
  }

  async function 끝낸다(runId: number, tcId: string, platform: string, status: 'PASS' | 'FAIL' | 'NA'): Promise<void> {
    await pool.query(
      'UPDATE run_item SET status = $4, finished_at = now() WHERE run_id = $1 AND tc_id = $2 AND platform = $3',
      [runId, tcId, platform, status],
    );
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    await pool.query(
      `WITH s AS (
         INSERT INTO service (prefix, name, color, tests_repo, tests_dir, slack_webhook)
         VALUES ('XBU', 'XBU 서비스', '#556677', 'https://xbu.example.com', 'xbu', 'https://hooks.example.com/xbu')
         ON CONFLICT (prefix) DO UPDATE SET is_active = true, slack_webhook = EXCLUDED.slack_webhook
         RETURNING id
       )
       INSERT INTO service_env (service_id, env, base_url)
       SELECT id, 'qa', 'https://qa.example.com' FROM s
       ON CONFLICT (service_id, env) DO UPDATE SET base_url = EXCLUDED.base_url`,
    );
  });

  afterAll(async () => {
    await 치운다();
    await pool.query("DELETE FROM test_case WHERE tc_id LIKE 'XBU-%'");
    await pool.query("DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix = 'XBU')");
    await pool.query("DELETE FROM service WHERE prefix = 'XBU'");
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  beforeEach(async () => {
    await 치운다();
    await 케이스를둔다();
  });

  it('실행을 만들 때 케이스의 미확정 사유를 항목에 박제하고, 케이스가 나중에 확정돼도 그대로 둔다', async () => {
    const runId = await 실행('XBU 박제', [
      { tcId: 'XBU-001', platforms: ['desktop'] },
      { tcId: 'XBU-002', platforms: ['desktop'] },
    ]);
    await pool.query("UPDATE test_case SET unconfirmed = NULL WHERE tc_id = 'XBU-002'");

    const { rows } = await pool.query<{ tc_id: string; unconfirmed: string | null }>(
      'SELECT tc_id, unconfirmed FROM run_item WHERE run_id = $1 ORDER BY tc_id',
      [runId],
    );
    expect(rows).toEqual([
      { tc_id: 'XBU-001', unconfirmed: null },
      { tc_id: 'XBU-002', unconfirmed: '기획서에 없는 안내 문구' },
    ]);
  });

  it('counts 의 통과·실패·미실행은 확정 항목만 세고, 끝난 미확정은 미확정 묶음에서 센다', async () => {
    const runId = await 실행('XBU 집계', [
      { tcId: 'XBU-001', platforms: ['desktop', 'mobile'] },
      { tcId: 'XBU-002', platforms: ['desktop', 'mobile'] },
      { tcId: 'XBU-003', platforms: ['desktop'] },
    ]);
    await 끝낸다(runId, 'XBU-001', 'desktop', 'PASS');
    await 끝낸다(runId, 'XBU-001', 'mobile', 'FAIL');
    await 끝낸다(runId, 'XBU-002', 'desktop', 'PASS');
    await 끝낸다(runId, 'XBU-002', 'mobile', 'FAIL');

    const 기대 = { total: 5, pass: 1, fail: 1, na: 0, running: 1, unconfirmed: { total: 3, pass: 1, fail: 1, na: 0 } };
    expect((await findRun(runId))?.counts).toEqual(기대);
    const 목록 = await listRuns('XBU', 1, 50);
    expect(목록.items.find((r) => r.runId === runId)?.counts).toEqual(기대);
  });

  it('미확정 실패만 있는 실행은 실패 거르개와 실패 집계에 안 들고, 미확정만 돌린 실행은 모두 통과에도 안 든다', async () => {
    const 미확정실패 = await 실행('XBU 미확정 실패', [
      { tcId: 'XBU-001', platforms: ['desktop'] },
      { tcId: 'XBU-002', platforms: ['desktop'] },
    ]);
    await 끝낸다(미확정실패, 'XBU-001', 'desktop', 'PASS');
    await 끝낸다(미확정실패, 'XBU-002', 'desktop', 'FAIL');
    const 미확정만 = await 실행('XBU 미확정만', [{ tcId: 'XBU-002', platforms: ['desktop'] }]);
    await 끝낸다(미확정만, 'XBU-002', 'desktop', 'PASS');

    expect((await listRuns('XBU', 1, 50, { state: 'failed' })).items).toEqual([]);
    const { summary } = await listRuns('XBU', 1, 50);
    expect(summary).toMatchObject({ runs: 2, allPass: 1, hasFail: 0 });
  });

  it('항목 목록과 항목 상세에 박제된 미확정 사유를 싣는다', async () => {
    const runId = await 실행('XBU 항목', [
      { tcId: 'XBU-001', platforms: ['desktop'] },
      { tcId: 'XBU-002', platforms: ['desktop'] },
    ]);
    const run = await findRun(runId);
    expect(run?.items.map((i) => [i.tcId, i.unconfirmed])).toEqual([
      ['XBU-001', null],
      ['XBU-002', '기획서에 없는 안내 문구'],
    ]);
    const 미확정 = run?.items.find((i) => i.tcId === 'XBU-002');
    expect((await findItem(runId, 미확정!.historyId))?.unconfirmed).toBe('기획서에 없는 안내 문구');
  });

  it('Slack 알림이 확정과 미확정을 갈라 세고 미확정 실패를 머리와 목록에 드러낸다', async () => {
    const runId = await 실행('XBU 알림', [
      { tcId: 'XBU-001', platforms: ['desktop'] },
      { tcId: 'XBU-002', platforms: ['desktop', 'mobile'] },
    ]);
    await 끝낸다(runId, 'XBU-001', 'desktop', 'PASS');
    await 끝낸다(runId, 'XBU-002', 'desktop', 'FAIL');
    await 끝낸다(runId, 'XBU-002', 'mobile', 'NA');
    await pool.query("UPDATE test_run SET status = 'FINISHED', finished_at = now() WHERE run_id = $1", [runId]);

    const 보낸것: string[] = [];
    vi.stubGlobal('fetch', async (_: string, init: { body: string }) => {
      보낸것.push((JSON.parse(init.body) as { text: string }).text);
      return new Response('ok');
    });
    try {
      expect(await notifyRun(runId)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }

    const 줄 = 보낸것[0]!.split('\n');
    expect(줄[0]).toBe(`[통과 · 미확정 실패 2] XBU 서비스 · RUN ${String(runId)} · XBU 알림`);
    expect(줄[1]).toMatch(/^통과 1 · 실패 0 · 미실행 0 · 미확정 2\(실패 1 · 미실행 1\) · /);
    expect(줄).toContain('  XBU-002  미확정 케이스  (미확정)');
  });
});
