// 실패 사진 통로가 프로시저 안 케이스의 줄 번호를 실행 단위 폴더로 바꿔 찾는지 본다 (도메인/실행 §7 · DATABASE_URL 이 있을 때만)

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 사진경로 } from './screenshotRoute.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실패 사진 통로', () => {
  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  let 뿌리 = '';
  let runId = 0;
  let execId = 0;
  let 프로시저줄 = 0;
  let 옛줄 = 0;

  async function 치운다(): Promise<void> {
    const 실행 = "(SELECT run_id FROM test_run WHERE service_id IN (SELECT id FROM service WHERE prefix = 'XRX'))";
    await q(`DELETE FROM run_item WHERE run_id IN ${실행}`);
    await q(`DELETE FROM run_exec WHERE run_id IN ${실행}`);
    await q("DELETE FROM test_run WHERE service_id IN (SELECT id FROM service WHERE prefix = 'XRX')");
    await q("DELETE FROM service WHERE prefix = 'XRX'");
  }

  const 줄넣기 = async (tcId: string, 단위: number | null) =>
    Number(
      (
        await q<{ history_id: string }>(
          `INSERT INTO run_item (run_id, tc_id, tc_name, platform, params, expected, status, file_path, param_schema, expected_schema, exec_id)
           VALUES ($1, $2, $2, 'android', '{}', '{}', 'FAIL', '', '{}', '{}', $3) RETURNING history_id`,
          [runId, tcId, 단위],
        )
      ).rows[0]!.history_id,
    );

  beforeAll(async () => {
    await 치운다();
    await q("INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ('XRX', 'XRX 앱', '#445566', '', 'xrx', 'APP')");
    runId = Number(
      (
        await q<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url)
           SELECT 'XRX 사진', 'xrx', 'qa', 'FINISHED', id, name, '', '' FROM service WHERE prefix = 'XRX' RETURNING run_id`,
        )
      ).rows[0]!.run_id,
    );
    execId = Number(
      (
        await q<{ exec_id: string }>(
          `INSERT INTO run_exec (run_id, file_path, proc_id, proc_name, platform, timeout_ms) VALUES ($1, 'xrx/XRX-TP-001.spec.ts', 'XRX-TP-001', '글쓰기', 'android', 300000) RETURNING exec_id`,
          [runId],
        )
      ).rows[0]!.exec_id,
    );
    프로시저줄 = await 줄넣기('XRX-FN-101', execId);
    옛줄 = await 줄넣기('XRX-FN-201', null);

    뿌리 = mkdtempSync(join(tmpdir(), 'xrx-shot-'));
    vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 뿌리);
    for (const 번호 of [execId, 옛줄]) {
      mkdirSync(join(뿌리, 'runs', String(runId), String(번호)), { recursive: true });
      writeFileSync(join(뿌리, 'runs', String(runId), String(번호), '4.png'), `${String(번호)} 사진`);
    }
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    rmSync(뿌리, { recursive: true, force: true });
    await 치운다();
    const { pool } = await import('../db/index.js');
    await pool.end();
  });

  it('케이스 줄 번호로 물으면 그 줄이 든 실행 단위 폴더에서 찾고, 옛 꼴 줄은 제 번호 폴더 그대로다', async () => {
    const app = Fastify();
    await app.register(사진경로, { prefix: '/api' });
    const 사진 = (번호: number) => app.inject({ method: 'GET', url: `/api/screenshots/${String(runId)}/${String(번호)}/4.png` });

    expect((await 사진(프로시저줄)).body).toBe(`${String(execId)} 사진`);
    expect((await 사진(옛줄)).body).toBe(`${String(옛줄)} 사진`);
    await app.close();
  });
});
