// 증적 자료 · 견주기 · 대시보드의 되비친 비밀값 검사 — 확인의 기대 · 실제 값, 판정 못 낸 사유, 실패 덩어리 대표 문장, 회귀 실패 사유에 실린 비밀 글자도 가린다 (공통/2 §4.1 · 진행판 WEB-F3-13)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다. fixture 접두사 XDK — 자기 service_id 로만 지운다 (apps/admin/CLAUDE.md)
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { collectRun } from './collect.js';
import { 대시보드 } from './dashboardResults.js';
import { compareWithPrevious } from './insights.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('증적 · 견주기 · 대시보드 — 되비친 비밀값', () => {
  let pool: Pool;
  let 실행 = 0;
  const 서비스 = "(SELECT id FROM service WHERE prefix = 'XDK')";

  async function 지운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item_step WHERE history_id IN (SELECT i.history_id FROM run_item i JOIN test_run r USING (run_id) WHERE r.service_id = ${서비스})`);
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XDK'");
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XDK', 'XDK 비밀값 서비스', '#334455', 'https://github.com/example/xdk-tests', 'xdk')`,
    );
    const 앞 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url, service_id, service_name, tests_repo, started_at)
       VALUES ('XDK 앞 실행', 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com', ${서비스},
               'XDK 비밀값 서비스', 'https://github.com/example/xdk-tests', now() - interval '1 hour')
       RETURNING run_id`,
    );
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition,
                             params, expected, param_schema, expected_schema, status, duration_ms, finished_at)
       VALUES ($1, 'XDK-002', 'desktop', 1, '로그인한다', 'xdk/XDK-002.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', 'PASS', 100, now())`,
      [앞.rows[0]!.run_id],
    );
    const run = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url, service_id, service_name, tests_repo)
       VALUES ('XDK 되비친 비밀값', 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com', ${서비스},
               'XDK 비밀값 서비스', 'https://github.com/example/xdk-tests')
       RETURNING run_id`,
    );
    실행 = Number(run.rows[0]!.run_id);
    const 항목 = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition,
                             params, expected, param_schema, expected_schema, status, duration_ms, finished_at, error)
       VALUES ($1, 'XDK-001', 'desktop', 1, '로그인한다', 'xdk/XDK-001.spec.ts', 300000, '[]',
               '{"아이디":"tester","password":"pa55word"}', '{"apiKey":"k3y-777"}',
               '{"type":"object","properties":{"password":{"type":"string","secret":true}}}',
               '{"type":"object","properties":{"apiKey":{"type":"string","secret":true}}}',
               'NA', 100, now(), '{"message":"pa55word 로 판정하지 못했다"}'),
              ($1, 'XDK-002', 'desktop', 1, '로그인한다', 'xdk/XDK-002.spec.ts', 300000, '[]',
               '{"password":"pa55word"}', '{}', '{"type":"object","properties":{"password":{"type":"string","secret":true}}}', '{}',
               'FAIL', 100, now(), '{"message":"pa55word 로 로그인하지 못했다\\nat login"}')
       RETURNING history_id`,
      [실행],
    );
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions)
       VALUES ($1, 1, '로그인한다', 'FAIL', 10, $2)`,
      [항목.rows[0]!.history_id, JSON.stringify([{ statement: '키가 맞다', status: 'FAIL', expected: 'k3y-777', actual: 'pa55word' }])],
    );
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
  });

  it('확인의 기대 · 실제 값과 판정 못 낸 사유에 되비친 비밀 글자가 ******** 다', async () => {
    const 항목 = (await collectRun(실행))?.items[0];
    expect(항목?.notRunReason).toBe('******** 로 판정하지 못했다');
    expect(항목?.steps[0]?.assertions[0]).toMatchObject({ statement: '키가 맞다', expected: '********', actual: '********' });
  });

  it('실패 덩어리의 대표 문장(오류 첫 줄)에 되비친 비밀 글자가 ******** 다', async () => {
    const 결과 = await compareWithPrevious(실행);
    expect(결과.실패덩어리들.map((d) => d.대표문장)).toEqual(['******** 로 로그인하지 못했다']);
  });

  it('대시보드 회귀 실패 사유도 견주기와 같이 ******** 다', async () => {
    const id = await pool.query<{ id: string }>(`SELECT id FROM service WHERE prefix = 'XDK'`);
    const 결과 = await 대시보드('UTC', [Number(id.rows[0]!.id)], []);
    expect(결과.newFailures.map((n) => n.reason)).toEqual(['******** 로 로그인하지 못했다']);
  });
});
