// 실행 한 부가 증적 문서의 표시용 모델로 온전히 옮겨지는지 본다 (SPEC §3.3 박제 불변식)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { collectRun } from './collect.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('증적 자료 수집', () => {
  let pool: Pool;
  let 실행: number;
  let 데스크톱: number;
  let 모바일: number;

  async function 지운다(): Promise<void> {
    // 자식부터 지운다. run_item_step 은 CASCADE 지만 run_item 은 실행을 참조한다
    await pool.query(
      "DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XDC%')",
    );
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XDC%'");
    await pool.query("DELETE FROM service WHERE prefix = 'XDC'");
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 지운다();

    // service_name 을 채우려면 service 행이 먼저 있어야 한다 (test_run_service_pair 제약)
    await pool.query(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XDC', 'XDC 결제 서비스', '#334455', 'https://github.com/example/xdc-tests', 'xdc')`,
    );

    const run = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ('XDC 야간 회귀', 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com',
               (SELECT id FROM service WHERE prefix = 'XDC'), 'XDC 결제 서비스',
               'https://github.com/example/xdc-tests', '2026-09-19T01:02:03Z')
       RETURNING run_id`,
    );
    실행 = Number(run.rows[0]!.run_id);

    async function 항목(platform: string, status: string, ms: number): Promise<number> {
      const row = await pool.query<{ history_id: string }>(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                               precondition, params, expected, param_schema, expected_schema,
                               status, duration_ms, finished_at)
         VALUES ($1, 'XDC-001', $2, 1, '결제 수단을 등록한다', 'demo/XDC-001.spec.ts', 300000,
                 '["로그인 되어 있다", "결제 수단이 없다"]',
                 '{"loginId":"tester","retryCount":3}', '{"ok":true}',
                 '{"type":"object","properties":{}}', '{"type":"object","properties":{}}',
                 $3, $4, now())
         RETURNING history_id`,
        [실행, platform, status, ms],
      );
      return Number(row.rows[0]!.history_id);
    }

    데스크톱 = await 항목('desktop', 'PASS', 1200);
    모바일 = await 항목('mobile', 'FAIL', 900);

    // seq 를 뒤집어 넣는다. 정렬이 삽입 순서가 아니라 seq 를 따르는지 보려는 것이다
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, screenshot_path)
       VALUES ($1, 2, '카드 번호를 입력한다', 'PASS', 88,
               '[{"statement":"입력창이 채워진다","status":"PASS","actual":"4111","expected":"4111"}]', NULL),
              ($1, 1, '결제 화면을 연다', 'PASS', 312,
               '[{"statement":"응답 코드가 정상이다","status":"PASS","actual":200,"expected":200}]', NULL)`,
      [데스크톱],
    );
    await pool.query(
      `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, screenshot_path)
       VALUES ($1, 1, '결제 화면을 연다', 'FAIL', 45,
               '[{"statement":"등록 결과가 참이다","status":"FAIL","actual":false,"expected":true,"blocker":true}]',
               'artifacts/runs/1/2/1.png')`,
      [모바일],
    );
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: 공용 } = await import('../db/index.js');
    await 공용.end();
  });

  it('머리말 일곱 칸을 실행 스냅샷에서 그대로 가져온다', async () => {
    const 문서 = await collectRun(실행);
    expect(문서).not.toBeNull();
    expect(문서!.runId).toBe(실행);
    expect(문서!.header).toEqual({
      serviceName: 'XDC 결제 서비스',
      testsRepo: 'https://github.com/example/xdc-tests',
      title: 'XDC 야간 회귀',
      startedAt: '2026-09-19T01:02:03.000Z',
      triggeredByName: '홍길동',
      env: 'qa',
      baseUrl: 'https://qa.example.com',
    });
  });

  it('같은 케이스라도 환경마다 한 블록씩, history_id 순으로 담는다', async () => {
    const 문서 = await collectRun(실행);
    expect(문서!.items).toHaveLength(2);
    expect(문서!.items.map((i) => i.platform)).toEqual(['desktop', 'mobile']);

    const 첫째 = 문서!.items[0]!;
    expect(첫째.tcId).toBe('XDC-001');
    expect(첫째.tcName).toBe('결제 수단을 등록한다');
    expect(첫째.attempt).toBe(1);
    expect(첫째.status).toBe('PASS');
    expect(첫째.durationMs).toBe(1200);
    expect(첫째.notRunReason).toBeNull();
    expect(첫째.precondition).toEqual(['로그인 되어 있다', '결제 수단이 없다']);
  });

  it('입력값과 기대값은 JSON 을 문자열로 편 칸 목록으로 담는다', async () => {
    const 문서 = await collectRun(실행);
    const 첫째 = 문서!.items[0]!;
    // 할 일 1 은 라벨을 붙이지 않는다. 라벨 자리에는 키 이름이 그대로 온다
    expect(첫째.params).toEqual([
      { label: 'loginId', value: 'tester' },
      { label: 'retryCount', value: '3' },
    ]);
    expect(첫째.expected).toEqual([{ label: 'ok', value: 'true' }]);
  });

  it('절차는 seq 순으로, 검증 문장은 값을 문자열로 펴서 담는다', async () => {
    const 문서 = await collectRun(실행);
    const 첫째 = 문서!.items[0]!;
    expect(첫째.steps.map((s) => s.seq)).toEqual([1, 2]);
    expect(첫째.steps[0]).toEqual({
      seq: 1,
      title: '결제 화면을 연다',
      status: 'PASS',
      durationMs: 312,
      assertions: [
        {
          statement: '응답 코드가 정상이다',
          expected: '200',
          actual: '200',
          status: 'PASS',
          blocker: false,
        },
      ],
      screenshotPath: null,
    });
  });

  it('실패한 환경의 절차에는 blocker 와 화면 갈무리 경로가 실린다', async () => {
    const 문서 = await collectRun(실행);
    const 둘째 = 문서!.items[1]!;
    expect(둘째.status).toBe('FAIL');
    expect(둘째.steps[0]!.screenshotPath).toBe('artifacts/runs/1/2/1.png');
    expect(둘째.steps[0]!.assertions[0]).toEqual({
      statement: '등록 결과가 참이다',
      expected: 'true',
      actual: 'false',
      status: 'FAIL',
      blocker: true,
    });
  });

  it('없는 실행이면 null 을 돌려준다', async () => {
    expect(await collectRun(-1)).toBeNull();
  });
});
