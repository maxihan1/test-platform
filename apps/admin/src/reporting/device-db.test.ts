// 러너가 준 폰 · 앱 판을 항목에 저장하고 증적 머리 · 항목에 싣는지 본다 (도메인/리포팅 §8.4 · APP-F1-05 — DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { finishItem } from '../execution/store.js';
import { collectRun } from './collect.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('증적의 기기 정보', () => {
  let pool: Pool;
  let 서비스: number;
  let 실행: number;

  async function 지운다(): Promise<void> {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  }

  async function 항목(tcId: string, platform: string): Promise<number> {
    const row = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema)
       VALUES ($1, $2, $3, 1, $2, 'xdm/a.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}')
       RETURNING history_id`,
      [실행, tcId, platform],
    );
    return Number(row.rows[0]!.history_id);
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await pool.query("DELETE FROM service WHERE prefix = 'XDM'");
    서비스 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
           VALUES ('XDM', 'XDM 서비스', '#445566', 'https://github.com/example/xdm-tests', 'xdm') RETURNING id`,
        )
      ).rows[0]!.id,
    );
    실행 = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url, service_id, service_name, tests_repo)
           VALUES ('XDM 실행', 'tester', '홍길동', 'RUNNING', 'qa', 'https://qa.example.com', $1, 'XDM 서비스', 'https://github.com/example/xdm-tests')
           RETURNING run_id`,
          [서비스],
        )
      ).rows[0]!.run_id,
    );
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('앱 항목은 기기 한 줄이 항목과 머리에 실리고, 같은 기기는 머리에 한 번만, 브라우저 항목은 없다', async () => {
    const 기기 = { model: 'SM-G996N', osVersion: '14', appVersion: null };
    const 앱1 = await 항목('XDM-001', 'android');
    const 앱2 = await 항목('XDM-002', 'android');
    const 웹 = await 항목('XDM-003', 'desktop');
    await finishItem(앱1, { historyId: 앱1, status: 'PASS', durationMs: 5, steps: [], device: 기기 });
    await finishItem(앱2, { historyId: 앱2, status: 'PASS', durationMs: 5, steps: [], device: 기기 });
    await finishItem(웹, { historyId: 웹, status: 'PASS', durationMs: 5, steps: [] });

    const 문서 = await collectRun(실행);
    expect([문서?.header.devices, 문서?.items.map((i) => i.device)]).toEqual([
      ['SM-G996N · Android 14 · 앱 판 모름'],
      ['SM-G996N · Android 14 · 앱 판 모름', 'SM-G996N · Android 14 · 앱 판 모름', null],
    ]);
  });
});
