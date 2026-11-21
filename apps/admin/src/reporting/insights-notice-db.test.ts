import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { compareWithPrevious } from './insights.js';

const 연결 = process.env.DATABASE_URL;

const 알림 = (기대: string, 화면: string): string => `기획서 문장과 글자가 다름(기대 ${기대} / 화면 ${화면})`;

describe.skipIf(연결 === undefined)('insights 통과알림들 (도메인/리포팅 §7 · 도메인/실행 §8.3 「통과 · 알림」)', () => {
  let pool: Pool;
  let 서비스: number;
  let 실행: number;
  const 항목: Record<string, number> = {};

  async function 지운다(): Promise<void> {
    const 있던 = await pool.query<{ id: string }>("SELECT id FROM service WHERE prefix = 'XDN'");
    const id = 있던.rows[0]?.id;
    if (id === undefined) return;
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [id]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [id]);
    await pool.query('DELETE FROM service WHERE id = $1', [id]);
  }

  async function 항목넣는다(
    tcId: string,
    platform: string,
    status: string,
    절차들: Record<string, unknown>[][],
    params: Record<string, unknown> = {},
  ): Promise<number> {
    const row = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, finished_at)
       VALUES ($1, $2, $3, 1, $4, $5, 300000, '[]', $6, '{}', '{}', '{}', $7, 100, now())
       RETURNING history_id`,
      [실행, tcId, platform, `${tcId} 케이스`, `xdn/${tcId}.spec.ts`, JSON.stringify(params), status],
    );
    const historyId = Number(row.rows[0]!.history_id);
    for (const [i, assertions] of 절차들.entries()) {
      await pool.query(
        `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions)
         VALUES ($1, $2, $3, $4, 10, $5)`,
        [historyId, i + 1, `절차 ${String(i + 1)}`, status, JSON.stringify(assertions)],
      );
    }
    항목[`${tcId}/${platform}`] = historyId;
    return historyId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();
    const 만든 = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XDN', 'XDN 알림 서비스', '#445566', 'https://github.com/example/xdn-tests', 'xdn')
       RETURNING id`,
    );
    서비스 = Number(만든.rows[0]!.id);
    const run = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ('XDN 알림 실행', 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com',
               $1, 'XDN 알림 서비스', 'https://github.com/example/xdn-tests', '2026-11-21T01:00:00Z')
       RETURNING run_id`,
      [서비스],
    );
    실행 = Number(run.rows[0]!.run_id);

    await 항목넣는다('XDN-FN-002', 'android', 'PASS', [
      [{ statement: '같은 글', status: 'PASS', actual: 'a', expected: 'a' }],
      [
        { statement: '레벨 줄이 보인다', status: 'PASS', actual: 'Lv.1 · 골드 200', expected: 'Lv. · 골드 ', notice: 알림('Lv. · 골드 ', 'Lv.1 · 골드 200') },
        { statement: '환영 글이 보인다', status: 'PASS', actual: '환영합니다, P1!', expected: '환영합니다, P!', notice: 알림('환영합니다, P!', '환영합니다, P1!') },
      ],
    ]);
    await 항목넣는다('XDN-FN-001', 'android', 'FAIL', [
      [
        { statement: '보스 처치 알림이 뜬다', status: 'PASS', actual: '보스 처치! 왕관 획득', expected: '보스 처치! 획득', notice: 알림('보스 처치! 획득', '보스 처치! 왕관 획득') },
        { statement: '골드가 는다', status: 'FAIL', actual: 100, expected: 200 },
      ],
    ]);
    await 항목넣는다(
      'XDN-FN-003',
      'android',
      'PASS',
      [[{ statement: 'hunter2 로 들어간 이름이 보인다', status: 'PASS', actual: '어서 오세요 hunter2 님', expected: '어서 오세요 hunter2', notice: 알림('어서 오세요 hunter2', '어서 오세요 hunter2 님') }]],
      { 비밀번호: 'hunter2' },
    );
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('알림이 붙은 확인 문장마다 한 줄을 케이스 · 절차 · 문장 차례로 모은다 — 같은 항목의 실패와 상관없다', async () => {
    const { 통과알림들 } = await compareWithPrevious(실행);

    expect(통과알림들.map((a) => [a.tcId, a.statement])).toEqual([
      ['XDN-FN-001', '보스 처치 알림이 뜬다'],
      ['XDN-FN-002', '레벨 줄이 보인다'],
      ['XDN-FN-002', '환영 글이 보인다'],
      ['XDN-FN-003', '******** 로 들어간 이름이 보인다'],
    ]);
    expect(통과알림들[0]).toEqual({
      historyId: 항목['XDN-FN-001/android'],
      tcId: 'XDN-FN-001',
      tcName: 'XDN-FN-001 케이스',
      platform: 'android',
      statement: '보스 처치 알림이 뜬다',
      notice: 알림('보스 처치! 획득', '보스 처치! 왕관 획득'),
    });
  });

  it('입력에 넣은 비밀값은 문장 · 알림 어디에도 새지 않는다', async () => {
    const { 통과알림들 } = await compareWithPrevious(실행);

    expect(JSON.stringify(통과알림들)).not.toContain('hunter2');
  });
});
