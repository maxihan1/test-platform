// 실행 한 부가 증적 문서의 표시용 모델로 온전히 옮겨지는지 본다 (SPEC §3.3 박제 불변식)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { readFileSync } from 'node:fs';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { collectRun } from './collect.js';

const 연결 = process.env.DATABASE_URL;

// §3.3 불변식을 지키는 유일한 장치는 「읽지 않는다」다. 쿼리가 하나라도 늘면 여기서 걸린다
it('증적 수집은 test_case 를 한 줄도 읽지 않는다', () => {
  const 소스 = readFileSync(new URL('./collect.ts', import.meta.url), 'utf8');
  // 주석은 뺀다. 파일 머리가 「test_case 를 읽지 않는다」고 적고 있어 그대로 보면 자기 자신에 걸린다
  expect(소스.replace(/^\s*\/\/.*$/gm, '')).not.toContain('test_case');
});

describe.skipIf(연결 === undefined)('증적 자료 수집', () => {
  let pool: Pool;
  let 실행: number;
  let 라벨실행: number;
  let 옛실행: number;
  let 중단실행: number;
  let 닫힌중단실행: number;
  let 진행실행: number;
  let 미기록실행: number;
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

    // 라벨·비밀값을 볼 실행. 앞 실행의 항목 수를 건드리지 않으려고 따로 만든다
    const 라벨 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ('XDC 라벨 확인', 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com',
               (SELECT id FROM service WHERE prefix = 'XDC'), 'XDC 결제 서비스',
               'https://github.com/example/xdc-tests', '2026-09-19T02:00:00Z')
       RETURNING run_id`,
    );
    라벨실행 = Number(라벨.rows[0]!.run_id);

    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, finished_at)
       VALUES ($1, 'XDC-002', 'desktop', 1, '로그인한다', 'demo/XDC-002.spec.ts', 300000, '[]',
               '{"username":"testuser","password":"hunter2","memo":"첫 시도"}',
               '{"hasToken":true}',
               '{"type":"object","properties":{
                  "username":{"type":"string","description":"아이디"},
                  "password":{"type":"string","description":"비밀번호","secret":true},
                  "memo":{"type":"string"}}}',
               '{"type":"object","properties":{
                  "hasToken":{"type":"boolean","description":"토큰이 발급된다","secret":true}}}',
               'PASS', 500, now())`,
      [라벨실행],
    );

    // 박제 이전 행. 새 칸이 ''·'{}'·NULL 로 남아 있다 (SPEC §6)
    const 옛것 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                             service_id, service_name, tests_repo, started_at)
       VALUES ('XDC 박제 이전', '', NULL, 'FINISHED', 'demo', '',
               NULL, '', '', '2026-09-19T03:00:00Z')
       RETURNING run_id`,
    );
    옛실행 = Number(옛것.rows[0]!.run_id);

    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, finished_at)
       VALUES ($1, 'XDC-101', 'desktop', 1, '옛 케이스', '', NULL, '[]',
               '{"loginId":"tester"}', '{}', '{}', '{}', 'PASS', 100, now()),
              ($1, 'XDC-102', 'desktop', 1, '입력 없는 옛 케이스', '', NULL, '[]',
               '{}', '{}', '{}', '{}', 'PASS', 100, now())`,
      [옛실행],
    );

    // 미실행 사유는 실행의 status 로 갈린다. 셋을 다 보려면 실행도 셋이어야 한다
    async function 실행만든다(title: string, status: string, env: string): Promise<number> {
      const row = await pool.query<{ run_id: string }>(
        `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url,
                               service_id, service_name, tests_repo, started_at)
         VALUES ($1, 'tester', '홍길동', $2, $3, 'https://qa.example.com',
                 (SELECT id FROM service WHERE prefix = 'XDC'), 'XDC 결제 서비스',
                 'https://github.com/example/xdc-tests', '2026-09-19T04:00:00Z')
         RETURNING run_id`,
        [title, status, env],
      );
      return Number(row.rows[0]!.run_id);
    }

    // finished_at 이 빈 행이 돌지 못한 항목이다. status 의 'NA' 만으로는 못 돈 것과 판정 없음이 안 갈린다
    async function 미실행항목(runId: number, tcId: string): Promise<void> {
      await pool.query(
        `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                               precondition, params, expected, param_schema, expected_schema,
                               status, duration_ms, finished_at)
         VALUES ($1, $2, 'desktop', 1, '못 돈 케이스', 'demo/not-run.spec.ts', 300000, '[]',
                 '{}', '{}', '{}', '{}', 'NA', NULL, NULL)`,
        [runId, tcId],
      );
    }

    중단실행 = await 실행만든다('XDC 중단된 실행', 'ABORTED', 'qa');
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, finished_at)
       VALUES ($1, 'XDC-201', 'desktop', 1, '멈추기 전에 돈 케이스', 'demo/XDC-201.spec.ts', 300000,
               '[]', '{}', '{}', '{}', '{}', 'PASS', 700, now())`,
      [중단실행],
    );
    await 미실행항목(중단실행, 'XDC-202');

    진행실행 = await 실행만든다('XDC 도는 중', 'RUNNING', 'qa');
    await 미실행항목(진행실행, 'XDC-301');

    // env 를 비워 둔다. 박제 이전 행의 빈 칸을 여기서 같이 본다 (SPEC §6)
    미기록실행 = await 실행만든다('XDC 결과 미기록', 'FINISHED', '');
    await 미실행항목(미기록실행, 'XDC-401');

    // 중단 처리(store.ts CLOSE_UNFINISHED)가 닫고 간 모습 그대로다 —
    // status 'NA', duration_ms 0, error 'ABORTED', finished_at 채워짐.
    // 같은 실행에 진짜 NA 를 나란히 둔다. 둘을 error 로만 가를 수 있다
    닫힌중단실행 = await 실행만든다('XDC 중단 처리 완료', 'ABORTED', 'qa');
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, error, finished_at)
       VALUES ($1, 'XDC-501', 'desktop', 1, '멈춤에 걸려 닫힌 케이스', 'demo/XDC-501.spec.ts', 300000,
               '[]', '{}', '{}', '{}', '{}', 'NA', 0, '{"message":"ABORTED"}', now()),
              ($1, 'XDC-502', 'desktop', 1, '러너가 판정을 못 준 케이스', 'demo/XDC-502.spec.ts', 300000,
               '[]', '{}', '{}', '{}', '{}', 'NA', 4200, '{"message":"러너에 닿지 못했습니다"}', now())`,
      [닫힌중단실행],
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

  it('라벨은 실행에 박제된 스키마의 description 에서 오고, 없으면 키 이름을 쓴다', async () => {
    const 문서 = await collectRun(라벨실행);
    // jsonb 는 키를 길이·바이트 순으로 다시 늘어놓는다. 선언한 차례가 아니라 그 차례로 온다
    expect(문서!.items[0]!.params.map((f) => f.label)).toEqual(['memo', '비밀번호', '아이디']);
    expect(문서!.items[0]!.expected[0]!.label).toBe('토큰이 발급된다');
  });

  it('비밀값 칸은 값만 가리고 라벨은 그대로 둔다', async () => {
    const 문서 = await collectRun(라벨실행);
    const 항목 = 문서!.items[0]!;
    expect(항목.params).toEqual([
      { label: 'memo', value: '첫 시도' },
      { label: '비밀번호', value: '********' },
      { label: '아이디', value: 'testuser' },
    ]);
    expect(항목.expected).toEqual([{ label: '토큰이 발급된다', value: '********' }]);
  });

  it('박제 이전 행은 라벨을 지어내지 않고, 입력이 없으면 빈 칸 목록이다', async () => {
    const 문서 = await collectRun(옛실행);
    // 스키마가 비면 라벨을 알 방법이 없다. 키 이름을 쓰되 값은 손대지 않는다
    expect(문서!.items[0]!.params).toEqual([{ label: 'loginId', value: 'tester' }]);
    // 빈 목록이 '입력 없음' 이다. 렌더러가 이 상태를 구분해 그린다 (SPEC §4.1)
    expect(문서!.items[1]!.params).toEqual([]);
    expect(문서!.items[1]!.expected).toEqual([]);
  });

  it('박제 이전 머리말은 기록 없음, 빈 실행자는 인증 도입 이전으로 적는다', async () => {
    const 문서 = await collectRun(옛실행);
    expect(문서!.header.serviceName).toBe('기록 없음');
    expect(문서!.header.testsRepo).toBe('기록 없음');
    expect(문서!.header.baseUrl).toBe('기록 없음');
    expect(문서!.header.triggeredByName).toBe('실행자 미상 (인증 도입 이전)');
  });

  it('중단된 실행은 못 돈 항목을 미실행과 사유로 남기고 끝난 항목은 그대로 둔다', async () => {
    const 문서 = await collectRun(중단실행);
    expect(문서!.items).toHaveLength(2);

    const 돈것 = 문서!.items[0]!;
    expect(돈것.tcId).toBe('XDC-201');
    expect(돈것.status).toBe('PASS');
    expect(돈것.durationMs).toBe(700);
    expect(돈것.notRunReason).toBeNull();

    const 못돈것 = 문서!.items[1]!;
    expect(못돈것.tcId).toBe('XDC-202');
    expect(못돈것.status).toBe('NOT_RUN');
    expect(못돈것.notRunReason).toBe('실행이 멈춰 돌지 못했습니다');
    expect(못돈것.durationMs).toBeNull();
    expect(못돈것.steps).toEqual([]);
  });

  it('아직 도는 실행의 미실행 사유는 실행 중이라고 적는다', async () => {
    const 문서 = await collectRun(진행실행);
    expect(문서!.items[0]!.status).toBe('NOT_RUN');
    expect(문서!.items[0]!.notRunReason).toBe('아직 실행 중입니다');
  });

  it('끝난 실행에 남은 미실행 항목은 결과가 안 적혔다고 적는다', async () => {
    const 문서 = await collectRun(미기록실행);
    expect(문서!.items[0]!.status).toBe('NOT_RUN');
    expect(문서!.items[0]!.notRunReason).toBe('실행이 끝났지만 결과가 기록되지 않았습니다');
  });

  it('중단 처리가 닫고 간 항목도 미실행이다 — finished_at 이 차 있어도', async () => {
    const 문서 = await collectRun(닫힌중단실행);
    const 닫힌것 = 문서!.items[0]!;
    expect(닫힌것.tcId).toBe('XDC-501');
    expect(닫힌것.status).toBe('NOT_RUN');
    // 사람이 멈춘 것인지 서버가 죽어 끊긴 것인지 DB 가 구분하지 못한다. 문장도 구분하지 않는다
    expect(닫힌것.notRunReason).toBe('실행이 멈춰 돌지 못했습니다');
    // 중단 처리가 박아 넣은 0 은 「0밀리초 걸렸다」가 아니라 「안 돌았다」다
    expect(닫힌것.durationMs).toBeNull();
  });

  it('러너가 판정을 못 준 NA 는 미실행이 아니다 — 돌다가 못 낸 것이다', async () => {
    const 문서 = await collectRun(닫힌중단실행);
    const 진짜NA = 문서!.items[1]!;
    expect(진짜NA.tcId).toBe('XDC-502');
    expect(진짜NA.status).toBe('NA');
    expect(진짜NA.notRunReason).toBeNull();
    expect(진짜NA.durationMs).toBe(4200);
  });

  it('빈 환경 칸도 기록 없음으로 적는다', async () => {
    const 문서 = await collectRun(미기록실행);
    expect(문서!.header.env).toBe('기록 없음');
  });

  it('같은 실행을 두 번 뽑으면 글자 하나 다르지 않다', async () => {
    const 하나 = await collectRun(라벨실행);
    const 둘 = await collectRun(라벨실행);
    expect(하나).toEqual(둘);
  });
});
