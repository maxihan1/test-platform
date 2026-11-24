// Slack 완료 알림 — 두 곳이 거의 같이 불러도 한 번만 가고, 보내기에 실패하면 「보내려다 실패한 것」으로 남는다 (DB 접속이 있을 때만 돈다)
import type { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { notifyRun } from './notify.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('notifyRun — 먼저 차지하고 보낸다', () => {
  let pool: Pool;
  let 서비스 = 0;

  async function 멈춘실행(): Promise<number> {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, finished_at, notify_slack)
            VALUES ('XNF 멈춘 실행', 'XNF', '', 'xnf', 'qa', 'https://qa.example.com', 'ABORTED', $1, now(), true)
         RETURNING run_id`,
      [서비스],
    );
    return Number(r.rows[0]!.run_id);
  }

  const 보낸때 = async (runId: number): Promise<Date | null> =>
    (await pool.query<{ notified_at: Date | null }>('SELECT notified_at FROM test_run WHERE run_id = $1', [runId])).rows[0]?.notified_at ?? null;

  beforeAll(async () => {
    const { pool: 풀 } = await import('../db/index.js');
    pool = 풀;
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, slack_webhook)
            VALUES ('XNF', 'XNF 알림 검사용', '#3A5FCD', '', 'xnf', 'https://hooks.example.com/xnf')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true, slack_webhook = EXCLUDED.slack_webhook
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('중단 통로와 디스패처가 거의 같이 불러도 한 번만 보낸다', async () => {
    const runId = await 멈춘실행();
    const 보냄 = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return new Response('ok');
    });
    vi.stubGlobal('fetch', 보냄);

    const 결과 = await Promise.all([notifyRun(runId), notifyRun(runId)]);

    expect(보냄).toHaveBeenCalledTimes(1);
    expect(결과.filter(Boolean)).toHaveLength(1);
    expect(await 보낸때(runId)).not.toBeNull();
  });

  it('웹훅이 거절하면 보낸 때를 비워 둔다', async () => {
    const runId = await 멈춘실행();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));

    expect(await notifyRun(runId)).toBe(false);
    expect(await 보낸때(runId)).toBeNull();
  });

  it('웹훅에 닿지 못하면 보낸 때를 비우고 오류를 그대로 올린다', async () => {
    const runId = await 멈춘실행();
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('연결 끊김');
    }));

    await expect(notifyRun(runId)).rejects.toThrow('연결 끊김');
    expect(await 보낸때(runId)).toBeNull();
  });

  it('이미 보낸 실행은 다시 보내지 않는다', async () => {
    const runId = await 멈춘실행();
    const 보냄 = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', 보냄);

    expect(await notifyRun(runId)).toBe(true);
    expect(await notifyRun(runId)).toBe(false);
    expect(보냄).toHaveBeenCalledTimes(1);
  });

  it('Blocked 수와 실행명을 질의에서 읽어 본문에 싣는다', async () => {
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_name, tests_repo, triggered_by, env, base_url, status, service_id, finished_at, notify_slack, kind, origin)
            VALUES ('XNF-UI-001 외 2건', 'XNF', '', 'xnf', 'qa', 'https://qa.example.com', 'FINISHED', $1, now(), true, 'UI', 'MANUAL')
         RETURNING run_id`,
      [서비스],
    );
    const runId = Number(r.rows[0]!.run_id);
    for (const [tcId, status, error] of [['XNF-UI-001', 'FAIL', null], ['XNF-UI-002', 'NA', '{"message":"BLOCKED"}'], ['XNF-UI-003', 'NA', '{"message":"BLOCKED"}']] as const) {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, error, finished_at)
         VALUES ($1, $2, 'desktop', 1, $2, 'xnf/a.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', $3, $4, now())`,
        [runId, tcId, status, error],
      );
    }
    const 보냄 = vi.fn(async (_주소: unknown, _옵션: { body: string }) => new Response('ok'));
    vi.stubGlobal('fetch', 보냄);

    expect(await notifyRun(runId)).toBe(true);
    const 글 = (JSON.parse(보냄.mock.calls[0]![1].body) as { text: string }).text.split('\n');
    expect(글[0]).toBe(`[Fail] XNF · RUN ${runId} · UI 테스트 3건`);
    expect(글[1]).toContain('Pass 0 · Fail 1 · Not tested 2 (Blocked 2)');
  });
});
