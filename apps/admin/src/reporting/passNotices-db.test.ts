// 실행 하나의 「통과 · 알림」을 모으고 비밀값을 가리는지 DB 로 본다 (DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 통과알림모으기, 통과알림상한 } from './passNotices.js';

const 연결 = process.env.DATABASE_URL;

const 글자다름 = '기획서 문장과 글자가 다름';
const 확인 = (statement: string, 기대: string, 화면: string): Record<string, unknown> => ({
  statement,
  status: 'PASS',
  expected: 기대,
  actual: 화면,
  notice: 글자다름,
});

describe.skipIf(연결 === undefined)('insights 통과알림들 (도메인/리포팅 §7 · 도메인/실행 §8.3 「통과 · 알림」)', () => {
  let pool: Pool;
  let 실행: number;
  let 많은실행: number;
  const 항목: Record<string, number> = {};

  async function 지운다(): Promise<void> {
    const 있던 = await pool.query<{ id: string }>("SELECT id FROM service WHERE prefix = 'XDN'");
    const id = 있던.rows[0]?.id;
    if (id === undefined) return;
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [id]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [id]);
    await pool.query('DELETE FROM service WHERE id = $1', [id]);
  }

  async function 실행만든다(서비스: string, 제목: string): Promise<number> {
    const run = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ($2, 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com',
               $1, 'XDN 알림 서비스', 'https://github.com/example/xdn-tests', '2026-11-21T01:00:00Z')
       RETURNING run_id`,
      [서비스, 제목],
    );
    return Number(run.rows[0]!.run_id);
  }

  async function 항목넣는다(
    runId: number,
    tcId: string,
    status: string,
    절차들: Record<string, unknown>[][],
    params: Record<string, unknown> = {},
  ): Promise<void> {
    const row = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, finished_at)
       VALUES ($1, $2, 'android', 1, $3, $4, 300000, '[]', $5, '{}', '{}', '{}', $6, 100, now())
       RETURNING history_id`,
      [runId, tcId, `${tcId} 케이스`, `xdn/${tcId}.spec.ts`, JSON.stringify(params), status],
    );
    const historyId = Number(row.rows[0]!.history_id);
    for (const [i, assertions] of 절차들.entries()) {
      await pool.query(
        `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions)
         VALUES ($1, $2, $3, $4, 10, $5)`,
        [historyId, i + 1, `절차 ${String(i + 1)}`, status, JSON.stringify(assertions)],
      );
    }
    항목[tcId] = historyId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();
    const 만든 = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XDN', 'XDN 알림 서비스', '#445566', 'https://github.com/example/xdn-tests', 'xdn')
       RETURNING id`,
    );
    const 서비스 = 만든.rows[0]!.id;
    실행 = await 실행만든다(서비스, 'XDN 알림 실행');
    많은실행 = await 실행만든다(서비스, 'XDN 알림 많은 실행');

    await 항목넣는다(실행, 'XDN-FN-002', 'PASS', [
      [{ statement: '같은 글', status: 'PASS', actual: 'a', expected: 'a' }],
      [확인('레벨 줄이 보인다', 'Lv. · 골드 ', 'Lv.1 · 골드 200'), 확인('환영 글이 보인다', '환영합니다, P!', '환영합니다, P1!')],
    ]);
    await 항목넣는다(실행, 'XDN-FN-001', 'FAIL', [
      [확인('보스 처치 알림이 뜬다', '보스 처치! 획득', '보스 처치! 왕관 획득'), { statement: '골드가 는다', status: 'FAIL', actual: 100, expected: 200 }],
    ]);
    await 항목넣는다(
      실행,
      'XDN-FN-003',
      'PASS',
      [
        [
          확인('hunter2secret 로 들어간 이름이 보인다', '어서 오세요', '어서 오세요 hunter2secret 님'),
          확인('긴 화면 글', '보스', `보스 ${'가'.repeat(194)}hunter2secret 🎁 끝`),
        ],
      ],
      { password: 'hunter2secret' },
    );
    await 항목넣는다(많은실행, 'XDN-FN-009', 'PASS', [
      Array.from({ length: 통과알림상한 + 5 }, (_, i) => 확인(`알림 ${String(i)}`, '보스', '보스 처치')),
    ]);
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('알림이 붙은 확인 문장마다 한 줄을 케이스 · 절차 · 문장 차례로 모으고 기대 · 화면 글을 붙인다 — 같은 항목의 실패와 상관없다', async () => {
    const { 통과알림들, 통과알림수 } = await 통과알림모으기(실행);

    expect(통과알림수).toBe(5);
    expect(통과알림들.map((a) => [a.tcId, a.statement])).toEqual([
      ['XDN-FN-001', '보스 처치 알림이 뜬다'],
      ['XDN-FN-002', '레벨 줄이 보인다'],
      ['XDN-FN-002', '환영 글이 보인다'],
      ['XDN-FN-003', '******** 로 들어간 이름이 보인다'],
      ['XDN-FN-003', '긴 화면 글'],
    ]);
    expect(통과알림들[0]).toEqual({
      historyId: 항목['XDN-FN-001'],
      tcId: 'XDN-FN-001',
      tcName: 'XDN-FN-001 케이스',
      platform: 'android',
      statement: '보스 처치 알림이 뜬다',
      notice: '기획서 문장과 글자가 다름(기대 보스 처치! 획득 / 화면 보스 처치! 왕관 획득)',
    });
  });

  it('비밀값은 자르기 전에 가려 잘린 조각도 새지 않고, 긴 글은 글자 200개에서 자른다', async () => {
    const { 통과알림들 } = await 통과알림모으기(실행);
    const 긴 = 통과알림들.find((a) => a.statement === '긴 화면 글')!;

    expect(JSON.stringify(통과알림들)).not.toContain('hunter');
    expect(긴.notice).toBe(`${글자다름}(기대 보스 / 화면 ${`보스 ${'가'.repeat(194)}********`.slice(0, 200)}…)`);
  });

  it('상한을 넘으면 앞에서 자르고 전체 수는 따로 준다', async () => {
    const { 통과알림들, 통과알림수 } = await 통과알림모으기(많은실행);

    expect(통과알림들).toHaveLength(통과알림상한);
    expect(통과알림수).toBe(통과알림상한 + 5);
  });
});
