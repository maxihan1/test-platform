// 시나리오 실행 만들기 — test_run(SCENARIO) 한 행 · 부품마다 NA 행 · 러너 요청 · 거절 다섯 · 결과 저장 · 분배 (SPEC 도메인/시나리오 §3.7 · §7)

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 결과저장, 시나리오분배 } from './runResult.js';
import { 실행만들기, 시나리오실행오류 } from './runStore.js';
import { 만들기, 고치기, 치우기 } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 소스 = `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSE-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('상품을 담는다', async () => {
    await page.getByRole('button').click();
  });
  await test.step('장바구니에 한 건이다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
});
`;

describe.skipIf(연결 === undefined)('시나리오 실행 만들기', () => {
  let 서비스 = 0;
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 번호들 = ['XSE-001', 'XSE-002', 'XSE-003'];
  const 사람 = { username: 'xse', displayName: 'XSE 검사 사람' };

  const q = async <T extends object = Record<string, unknown>>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 치우기표 = async () => {
    await q(
      `DELETE FROM scenario_run_step WHERE part_id IN (
         SELECT p.id FROM scenario_run_part p JOIN test_run r ON r.run_id = p.run_id WHERE r.service_id = $1)`,
      [서비스],
    );
    await q('DELETE FROM scenario_run_part WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await q('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM scenario WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
  };

  const 실행수 = async () => Number((await q<{ n: string }>('SELECT count(*) AS n FROM test_run WHERE service_id = $1', [서비스])).rows[0]!.n);

  const 케이스 = (tcId: string, params: Record<string, unknown> = {}): ScenarioPart => ({
    kind: 'case',
    tcId,
    params,
    expected: {},
    skipSteps: [],
  });

  // 되돌리기로 들어온 옛 버전처럼 조립 검사를 안 거친 버전을 만든다
  const 버전바로넣기 = async (parts: ScenarioPart[]) => {
    const s = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XSE 바로 넣은 것', 'xse') RETURNING id`,
      [서비스],
    );
    const id = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
       VALUES ($1, 1, 'desktop', $2, 'xse', 'XSE 검사 사람')`,
      [id, JSON.stringify(parts)],
    );
    return id;
  };

  const 거절 = async (id: number, env: string, code: string) => {
    const 전 = await 실행수();
    const 잡은 = await 실행만들기(id, env, 사람).then(
      () => null,
      (e: unknown) => e,
    );
    expect(잡은).toBeInstanceOf(시나리오실행오류);
    expect((잡은 as 시나리오실행오류).code).toBe(code);
    expect(await 실행수()).toBe(전);
    return 잡은 as 시나리오실행오류;
  };

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xse-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xse'));
    await writeFile(join(뿌리, 'xse', 'a.spec.ts'), 소스);

    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSE', 'XSE 시나리오 실행 검사용', '#3A5FCD', 'git@x:xse.git', 'xse')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기표();
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://xse.example')`, [서비스]);

    const 케이스넣기 = (tcId: string, filePath: string, isActive: boolean) =>
      q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
         VALUES ($1, $1 || ' 이름', '["desktop","mobile"]', '["로그인했다"]', $2, '{"type":"object"}', '{"type":"string"}', $3)
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = EXCLUDED.is_active`,
        [tcId, filePath, isActive],
      );
    await 케이스넣기('XSE-001', 'xse/a.spec.ts', true);
    await 케이스넣기('XSE-002', 'xse/a.spec.ts', false);
    await 케이스넣기('XSE-003', '../밖.spec.ts', true);
  });

  afterAll(async () => {
    await 치우기표();
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('최신 버전으로 test_run 한 행과 부품마다 NA 행을 만들고 러너 요청을 돌려준다', async () => {
    const { id } = await 만들기(서비스, 'XSE 옛 이름', 'desktop', [{ kind: 'wait', ms: 10 }], 사람);
    const 부품: ScenarioPart[] = [
      케이스('XSE-001', { 수량: 2 }),
      { kind: 'api', method: 'GET', path: '/health', expectStatus: 200 },
      { kind: 'wait', ms: 10 },
    ];
    await 고치기(id, { name: 'XSE 주문 흐름', platform: 'mobile', parts: 부품, baseVersion: 1 }, 사람);

    const { runId, 요청 } = await 실행만들기(id, 'qa', 사람);

    const run = (
      await q(
        `SELECT kind, scenario_id, scenario_version, title, service_id, service_name, tests_repo, env, status,
                triggered_by, triggered_by_name, notify_slack, base_url
           FROM test_run WHERE run_id = $1`,
        [runId],
      )
    ).rows[0];
    expect(run).toEqual({
      kind: 'SCENARIO',
      scenario_id: String(id),
      scenario_version: 2,
      title: 'XSE 주문 흐름',
      service_id: String(서비스),
      service_name: 'XSE 시나리오 실행 검사용',
      tests_repo: 'git@x:xse.git',
      env: 'qa',
      status: 'RUNNING',
      triggered_by: 'xse',
      triggered_by_name: 'XSE 검사 사람',
      notify_slack: false,
      base_url: 'http://xse.example',
    });

    const 행들 = (
      await q(
        `SELECT seq, kind, tc_id, tc_name, part, file_path, param_schema, expected_schema, timeout_ms, precondition,
                status, finished_at
           FROM scenario_run_part WHERE run_id = $1 ORDER BY seq`,
        [runId],
      )
    ).rows;
    expect(행들).toEqual([
      {
        seq: 1,
        kind: 'case',
        tc_id: 'XSE-001',
        tc_name: 'XSE-001 이름',
        part: 부품[0],
        file_path: 'xse/a.spec.ts',
        param_schema: { type: 'object' },
        expected_schema: { type: 'string' },
        timeout_ms: 300000,
        precondition: ['로그인했다'],
        status: 'NA',
        finished_at: null,
      },
      {
        seq: 2,
        kind: 'api',
        tc_id: null,
        tc_name: null,
        part: 부품[1],
        file_path: null,
        param_schema: null,
        expected_schema: null,
        timeout_ms: null,
        precondition: [],
        status: 'NA',
        finished_at: null,
      },
      {
        seq: 3,
        kind: 'wait',
        tc_id: null,
        tc_name: null,
        part: 부품[2],
        file_path: null,
        param_schema: null,
        expected_schema: null,
        timeout_ms: null,
        precondition: [],
        status: 'NA',
        finished_at: null,
      },
    ]);

    expect(요청).toEqual({
      runId,
      platform: 'mobile',
      baseUrl: 'http://xse.example',
      parts: [{ ...부품[0], filePath: 'xse/a.spec.ts' }, 부품[1], 부품[2]],
      timeoutMs: 330010,
    });
    expect(요청.parts[1]).not.toHaveProperty('filePath');
  });

  it('없는 시나리오는 NOT_FOUND 다', async () => {
    await 거절(0, 'qa', 'NOT_FOUND');
  });

  it('치운 시나리오는 ARCHIVED 다', async () => {
    const { id } = await 만들기(서비스, 'XSE 치운 것', 'desktop', [{ kind: 'wait', ms: 10 }], 사람);
    await 치우기(id);
    await 거절(id, 'qa', 'ARCHIVED');
  });

  it('비활성 서비스의 시나리오는 SERVICE_INACTIVE 다', async () => {
    const { id } = await 만들기(서비스, 'XSE 서비스 꺼짐', 'desktop', [{ kind: 'wait', ms: 10 }], 사람);
    await q('UPDATE service SET is_active = false WHERE id = $1', [서비스]);
    try {
      await 거절(id, 'qa', 'SERVICE_INACTIVE');
    } finally {
      await q('UPDATE service SET is_active = true WHERE id = $1', [서비스]);
    }
  });

  it('그 서비스에 없는 대상 서버는 ENV_NOT_FOUND 다', async () => {
    const { id } = await 만들기(서비스, 'XSE 대상 없음', 'desktop', [{ kind: 'wait', ms: 10 }], 사람);
    await 거절(id, 'stage', 'ENV_NOT_FOUND');
  });

  it('비활성 케이스 · 60분 초과 · tests 뿌리 밖 경로는 NOT_RUNNABLE 이다', async () => {
    const 비활성 = await 거절(await 버전바로넣기([케이스('XSE-002')]), 'qa', 'NOT_RUNNABLE');
    expect(비활성.message).toContain('XSE-002');

    const 길다 = Array.from({ length: 13 }, () => 케이스('XSE-001'));
    const 초과 = await 거절(await 버전바로넣기(길다), 'qa', 'NOT_RUNNABLE');
    expect(초과.message).toContain('3600000ms');

    const 밖 = await 거절(await 버전바로넣기([케이스('XSE-003')]), 'qa', 'NOT_RUNNABLE');
    expect(밖.message).toContain('tests 폴더 밖');
  });

  const 세부품 = async (): Promise<number> => {
    const { id } = await 만들기(
      서비스,
      'XSE 결과 저장',
      'desktop',
      [케이스('XSE-001'), { kind: 'api', method: 'GET', path: '/health', expectStatus: 200 }, { kind: 'wait', ms: 10 }],
      사람,
    );
    return (await 실행만들기(id, 'qa', 사람)).runId;
  };

  const 부품행 = async (runId: number) =>
    (
      await q<{ seq: number; status: string; duration_ms: number | null; error: unknown; finished_at: Date | null }>(
        `SELECT seq, status, duration_ms, error, mocks, skipped_steps, finished_at
           FROM scenario_run_part WHERE run_id = $1 ORDER BY seq`,
        [runId],
      )
    ).rows;

  const 실행상태 = async (runId: number) =>
    (await q<{ status: string; finished_at: Date | null }>('SELECT status, finished_at FROM test_run WHERE run_id = $1', [runId]))
      .rows[0]!;

  const 절차들 = async (runId: number) =>
    (
      await q(
        `SELECT p.seq AS part_seq, s.seq, s.title, s.status, s.skipped, s.duration_ms, s.assertions, s.line,
                s.screenshot_path, s.http_trace, s.error
           FROM scenario_run_step s JOIN scenario_run_part p ON p.id = s.part_id
          WHERE p.run_id = $1 ORDER BY s.seq`,
        [runId],
      )
    ).rows;

  it('결과저장이 부품·절차를 적고 실행을 FINISHED 로 닫는다', async () => {
    const runId = await 세부품();
    const 응답: ScenarioExecuteResponse = {
      status: 'FAIL',
      durationMs: 900,
      parts: [
        {
          seq: 1,
          status: 'FAIL',
          durationMs: 700,
          mocks: ['**/api/cart'],
          error: { message: '한 건이 아니다' },
          steps: [
            { seq: 1, title: '상품을 담는다', status: 'PASS', durationMs: 0, assertions: [], skipped: true },
            {
              seq: 2,
              title: '장바구니에 한 건이다',
              status: 'FAIL',
              durationMs: 40,
              assertions: [{ statement: '한 건이다', status: 'FAIL', expected: 1, actual: 2, blocker: true }],
              line: 9,
              screenshotPath: 'artifacts/runs/1/scenario/2.png',
              httpTrace: { request: { a: 1 }, response: { b: 2 } },
              error: { message: '한 건이 아니다', stack: 'at x' },
            },
          ],
        },
        { seq: 2, status: 'PASS', durationMs: 50, mocks: [], steps: [] },
        { seq: 3, status: 'PASS', durationMs: 10, mocks: [], steps: [] },
      ],
    };

    expect(await 결과저장(runId, 응답)).toBe(true);

    const 실행 = await 실행상태(runId);
    expect(실행.status).toBe('FINISHED');
    expect(실행.finished_at).not.toBeNull();

    const 행들 = await 부품행(runId);
    expect(행들.map(({ finished_at, ...r }) => ({ ...r, 닫힘: finished_at !== null }))).toEqual([
      { seq: 1, status: 'FAIL', duration_ms: 700, error: { message: '한 건이 아니다' }, mocks: ['**/api/cart'], skipped_steps: ['상품을 담는다'], 닫힘: true },
      { seq: 2, status: 'PASS', duration_ms: 50, error: null, mocks: [], skipped_steps: [], 닫힘: true },
      { seq: 3, status: 'PASS', duration_ms: 10, error: null, mocks: [], skipped_steps: [], 닫힘: true },
    ]);

    expect(await 절차들(runId)).toEqual([
      {
        part_seq: 1, seq: 1, title: '상품을 담는다', status: 'PASS', skipped: true, duration_ms: 0, assertions: [],
        line: null, screenshot_path: null, http_trace: null, error: null,
      },
      {
        part_seq: 1, seq: 2, title: '장바구니에 한 건이다', status: 'FAIL', skipped: false, duration_ms: 40,
        assertions: [{ statement: '한 건이다', status: 'FAIL', expected: 1, actual: 2, blocker: true }],
        line: 9, screenshot_path: 'artifacts/runs/1/scenario/2.png',
        http_trace: { request: { a: 1 }, response: { b: 2 } }, error: { message: '한 건이 아니다', stack: 'at x' },
      },
    ]);
  });

  it('이미 ABORTED 인 실행에 늦게 온 결과는 버린다. 아무 행도 안 바뀐다', async () => {
    const runId = await 세부품();
    await q("UPDATE test_run SET status = 'ABORTED', finished_at = now() WHERE run_id = $1", [runId]);
    const 전 = await 부품행(runId);

    const 응답: ScenarioExecuteResponse = {
      status: 'PASS',
      durationMs: 1,
      parts: [{ seq: 1, status: 'PASS', durationMs: 1, mocks: [], steps: [{ seq: 1, title: 't', status: 'PASS', durationMs: 1, assertions: [] }] }],
    };
    expect(await 결과저장(runId, 응답)).toBe(false);

    expect((await 실행상태(runId)).status).toBe('ABORTED');
    expect(await 부품행(runId)).toEqual(전);
    expect(await 절차들(runId)).toEqual([]);
  });

  it('응답에 없는 부품은 NA 와 사유로 닫고, 겹친 seq 는 첫 것만 · 모르는 seq 는 버린다', async () => {
    const runId = await 세부품();
    const 응답: ScenarioExecuteResponse = {
      status: 'FAIL',
      durationMs: 5,
      parts: [
        { seq: 1, status: 'PASS', durationMs: 3, mocks: [], steps: [] },
        { seq: 1, status: 'FAIL', durationMs: 4, mocks: ['x'], steps: [] },
        { seq: 9, status: 'FAIL', durationMs: 4, mocks: [], steps: [] },
      ],
    };
    expect(await 결과저장(runId, 응답)).toBe(true);

    const 행들 = await 부품행(runId);
    expect(행들.map((r) => [r.seq, r.status, r.error])).toEqual([
      [1, 'PASS', null],
      [2, 'NA', { message: '러너가 이 부품 결과를 돌려주지 않았다' }],
      [3, 'NA', { message: '러너가 이 부품 결과를 돌려주지 않았다' }],
    ]);
    expect(행들.every((r) => r.finished_at !== null)).toBe(true);
    expect((await 실행상태(runId)).status).toBe('FINISHED');
  });

  it('러너 고장(부품 없음 + error)이면 부품 전부 NA 에 같은 문장이다', async () => {
    const runId = await 세부품();
    expect(
      await 결과저장(runId, { status: 'NA', durationMs: 3, parts: [], error: { message: '러너에 닿지 못했습니다', stack: 'ECONNREFUSED' } }),
    ).toBe(true);

    const 행들 = await 부품행(runId);
    expect(행들.map((r) => [r.status, r.error])).toEqual(Array(3).fill(['NA', { message: '러너에 닿지 못했습니다' }]));
    expect((await 실행상태(runId)).status).toBe('FINISHED');
  });

  it('저장이 던지면 부품 전부 NA + 결과를 저장하지 못했다 로 닫는다', async () => {
    const runId = await 세부품();
    // title 이 NOT NULL 이라 절차 INSERT 가 던진다 — 부품 1 은 이미 고쳐진 뒤다
    const 깨진: ScenarioExecuteResponse = {
      status: 'PASS',
      durationMs: 1,
      parts: [
        { seq: 1, status: 'PASS', durationMs: 1, mocks: [], steps: [{ seq: 1, title: null as unknown as string, status: 'PASS', durationMs: 1, assertions: [] }] },
      ],
    };
    expect(await 결과저장(runId, 깨진)).toBe(false);

    const 행들 = await 부품행(runId);
    expect(행들.every((r) => r.status === 'NA' && r.finished_at !== null)).toBe(true);
    expect((행들[0]!.error as { message: string }).message).toMatch(/^결과를 저장하지 못했다: /);
    expect(await 절차들(runId)).toEqual([]);
    expect((await 실행상태(runId)).status).toBe('FINISHED');
  });

  it('시나리오분배가 러너를 불러 결과를 적고 실행을 닫는다', async () => {
    const runId = await 세부품();
    const 요청: ScenarioExecuteRequest = { runId, platform: 'desktop', baseUrl: 'http://xse.example', parts: [], timeoutMs: 60000 };
    const 받은: unknown[] = [];
    const app = Fastify();
    app.post('/execute-scenario', async (req) => {
      받은.push(req.body);
      return {
        status: 'PASS',
        durationMs: 30,
        parts: [1, 2, 3].map((seq) => ({ seq, status: 'PASS', durationMs: 10, mocks: [], steps: [] })),
      };
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    const 원래 = process.env.RUNNER_URL;
    const addr = app.server.address();
    process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;
    try {
      await 시나리오분배(runId, 요청);
    } finally {
      await app.close();
      if (원래 === undefined) delete process.env.RUNNER_URL;
      else process.env.RUNNER_URL = 원래;
    }

    expect(받은).toEqual([요청]);
    expect((await 실행상태(runId)).status).toBe('FINISHED');
    expect((await 부품행(runId)).map((r) => r.status)).toEqual(['PASS', 'PASS', 'PASS']);
  });
});
