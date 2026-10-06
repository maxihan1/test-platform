// 시나리오 실행 통로 — 실행 요청 · 결과 조회 · 사진 · 케이스 단건 조회의 SCENARIO_RUN (SPEC 도메인/시나리오 §7). 문 없이 라우트만 띄운다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioPart } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import executionRoutes from '../execution/routes.js';
import scenarioRunRoutes from './runRoutes.js';
import { 만들기, 치우기 } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 소스 = `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: 'XSU-001', name: 'x', precondition: [], params: null, expected: null });

test(spec, async ({ page }) => {
  await test.step('상품을 담는다', async () => {
    await page.getByRole('button').click();
  });
  await test.step('장바구니에 한 건이다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
});
`;

describe.skipIf(연결 === undefined)('시나리오 실행 통로', () => {
  let app: FastifyInstance;
  let 러너: FastifyInstance;
  let 서비스 = 0;
  let 뿌리 = '';
  let 사진뿌리 = '';
  let 돌린 = 0;
  let 치운 = 0;
  let 못도는 = 0;
  let 실행번호 = 0;
  let 케이스실행번호 = 0;
  const 원래 = {
    tests: process.env.PLATFORM_TESTS_DIR,
    artifacts: process.env.PLATFORM_ARTIFACTS_DIR,
    runner: process.env.RUNNER_URL,
  };
  const 번호들 = ['XSU-001', 'XSU-002'];
  const 사람 = { username: 'xsu', displayName: 'XSU 검사 사람' };

  const q = async <T extends object = Record<string, unknown>>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 케이스 = (tcId: string, skipSteps: string[] = []): ScenarioPart => ({
    kind: 'case',
    tcId,
    params: { 수량: 2 },
    expected: {},
    skipSteps,
  });

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

  const 실행요청 = (id: number, payload: unknown) =>
    app.inject({ method: 'POST', url: `/api/scenarios/${id}/runs`, payload: payload as Record<string, unknown> });

  // 분배는 기다리지 않는다. afterAll 전에 닫혀야 RUNNING 찌꺼기가 다음 검사의 재기동 복구에 안 걸린다
  const 끝나기를 = async (runId: number) => {
    for (let i = 0; i < 100; i += 1) {
      const r = await q<{ status: string }>('SELECT status FROM test_run WHERE run_id = $1', [runId]);
      if (r.rows[0]?.status !== 'RUNNING') return r.rows[0]?.status;
      await new Promise((ok) => setTimeout(ok, 50));
    }
    throw new Error(`실행 ${runId} 이 끝나지 않았다`);
  };

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsu-'));
    사진뿌리 = await mkdtemp(join(tmpdir(), 'xsu-art-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    process.env.PLATFORM_ARTIFACTS_DIR = 사진뿌리;
    await mkdir(join(뿌리, 'xsu'));
    await writeFile(join(뿌리, 'xsu', 'a.spec.ts'), 소스);

    const r = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XSU', 'XSU 시나리오 통로 검사용', '#3A5FCD', '', 'xsu')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기표();
    await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://xsu.example')`, [서비스]);
    for (const [tcId, 켜짐] of [['XSU-001', true], ['XSU-002', false]] as const) {
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active)
         VALUES ($1, $1 || ' 이름', '["desktop","mobile"]', '["로그인했다"]', 'xsu/a.spec.ts', '{"type":"object"}', '{"type":"string"}', $2)
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = EXCLUDED.is_active`,
        [tcId, 켜짐],
      );
    }

    돌린 = (await 만들기(서비스, 'XSU 흐름', 'mobile', [케이스('XSU-001'), 케이스('XSU-001', ['상품을 담는다'])], 사람)).id;
    치운 = (await 만들기(서비스, 'XSU 치운 것', 'desktop', [케이스('XSU-001')], 사람)).id;
    await 치우기(치운);
    // 조립 검사를 안 거친 옛 버전처럼 넣는다 — 비활성 케이스라 못 돈다
    const s = await q<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XSU 못 도는 것', 'xsu') RETURNING id`,
      [서비스],
    );
    못도는 = Number(s.rows[0]!.id);
    await q(
      `INSERT INTO scenario_version (scenario_id, version, platform, parts, saved_by, saved_by_name)
       VALUES ($1, 1, 'desktop', $2, 'xsu', 'XSU 검사 사람')`,
      [못도는, JSON.stringify([케이스('XSU-002')])],
    );
    const 케 = await q<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url)
       VALUES ('XSU 케이스 실행', 'xsu', 'qa', 'FINISHED', $1, 'XSU', '', 'http://xsu.example') RETURNING run_id`,
      [서비스],
    );
    케이스실행번호 = Number(케.rows[0]!.run_id);

    // 부품 2 의 절차 순번은 부품 1 에 이어 3·4 다 — 사진 :seq 가 부품 순번이 아님을 본다
    러너 = Fastify();
    러너.post('/execute-scenario', async (req) => {
      const 요청 = req.body as ScenarioExecuteRequest;
      const 절차 = (seq: number, title: string, 건너뜀 = false) => ({
        seq,
        title,
        status: 'PASS',
        durationMs: 5,
        assertions: [],
        ...(건너뜀 ? { skipped: true } : {}),
        ...(seq === 4 ? { screenshotPath: `runs/${요청.runId}/scenario/4.png` } : {}),
      });
      return {
        status: 'PASS',
        durationMs: 20,
        parts: [
          { seq: 1, status: 'PASS', durationMs: 10, mocks: [], steps: [절차(1, '상품을 담는다'), 절차(2, '장바구니에 한 건이다')] },
          { seq: 2, status: 'PASS', durationMs: 10, mocks: ['**/api/pay'], steps: [절차(3, '상품을 담는다', true), 절차(4, '장바구니에 한 건이다')] },
        ],
      };
    });
    await 러너.listen({ port: 0, host: '127.0.0.1' });
    const addr = 러너.server.address();
    process.env.RUNNER_URL = `http://127.0.0.1:${typeof addr === 'object' && addr !== null ? addr.port : 0}`;

    app = Fastify();
    await app.register(scenarioRunRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 러너.close();
    await 치우기표();
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    await rm(사진뿌리, { recursive: true, force: true });
    for (const [키, 값] of [
      ['PLATFORM_TESTS_DIR', 원래.tests],
      ['PLATFORM_ARTIFACTS_DIR', 원래.artifacts],
      ['RUNNER_URL', 원래.runner],
    ] as const) {
      if (값 === undefined) delete process.env[키];
      else process.env[키] = 값;
    }
  });

  it('실행 요청은 201 { runId } 를 주고 기다리지 않은 분배가 실행을 닫는다', async () => {
    const res = await 실행요청(돌린, { env: 'qa' });
    expect(res.statusCode).toBe(201);
    실행번호 = res.json<{ runId: number }>().runId;
    expect(typeof 실행번호).toBe('number');
    expect(await 끝나기를(실행번호)).toBe('FINISHED');
  });

  it('실행 요청의 거절 — 본문 · 없음 · 치운 것 · 못 도는 것 · 대상 서버 없음', async () => {
    const 전 = (await q<{ n: string }>('SELECT count(*) AS n FROM test_run WHERE service_id = $1', [서비스])).rows[0]!.n;
    for (const [id, 본문, code, error] of [
      [돌린, {}, 400, 'INVALID_REQUEST'],
      [돌린, { env: '' }, 400, 'INVALID_REQUEST'],
      [999999999, { env: 'qa' }, 404, 'SCENARIO_NOT_FOUND'],
      [치운, { env: 'qa' }, 409, 'SCENARIO_ARCHIVED'],
      [못도는, { env: 'qa' }, 409, 'SCENARIO_NOT_RUNNABLE'],
      [돌린, { env: 'prod' }, 400, 'ENV_NOT_FOUND'],
    ] as const) {
      const res = await 실행요청(id, 본문);
      expect(res.statusCode, `${id} ${JSON.stringify(본문)}`).toBe(code);
      expect(res.json<{ error: string; detail: string }>()).toMatchObject({ error });
      expect(typeof res.json<{ detail: unknown }>().detail).toBe('string');
    }
    const 후 = (await q<{ n: string }>('SELECT count(*) AS n FROM test_run WHERE service_id = $1', [서비스])).rows[0]!.n;
    expect(후).toBe(전);
  });

  it('결과 조회는 실행 판정 · 디바이스 · 부품마다 스냅샷과 절차를 낸다', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/runs/${실행번호}/scenario` });
    expect(res.statusCode).toBe(200);
    const 몸 = res.json<Record<string, unknown> & { parts: Record<string, unknown>[] }>();
    expect(몸).toMatchObject({ scenarioId: 돌린, version: 1, status: 'FINISHED', platform: 'mobile' });
    expect(몸.parts).toHaveLength(2);
    expect(몸.parts[1]).toEqual({
      seq: 2,
      kind: 'case',
      tcId: 'XSU-001',
      tcName: 'XSU-001 이름',
      part: 케이스('XSU-001', ['상품을 담는다']),
      status: 'PASS',
      durationMs: 10,
      skippedSteps: ['상품을 담는다'],
      mocks: ['**/api/pay'],
      paramSchema: { type: 'object' },
      expectedSchema: { type: 'string' },
      precondition: ['로그인했다'],
      unconfirmed: null,
      bound: {},
      cleanup: [],
      steps: [
        { seq: 3, title: '상품을 담는다', status: 'PASS', durationMs: 5, assertions: [], skipped: true },
        {
          seq: 4,
          title: '장바구니에 한 건이다',
          status: 'PASS',
          durationMs: 5,
          assertions: [],
          screenshotPath: `runs/${실행번호}/scenario/4.png`,
        },
      ],
      error: null,
    });
    expect((몸.parts[0]!.steps as unknown[]).length).toBe(2);
  });

  it('결과 조회는 케이스 실행 번호 · 없는 번호에 404 RUN_NOT_FOUND 다', async () => {
    for (const 번호 of [케이스실행번호, 999999999]) {
      const res = await app.inject({ method: 'GET', url: `/api/runs/${번호}/scenario` });
      expect(res.statusCode, String(번호)).toBe(404);
      expect(res.json<{ error: string }>().error).toBe('RUN_NOT_FOUND');
    }
    expect((await app.inject({ method: 'GET', url: '/api/runs/abc/scenario' })).statusCode).toBe(400);
  });

  it('사진은 절차 순번으로 낸다 — 없으면 404 · 숫자가 아니면 400 · 케이스 실행이면 404', async () => {
    await mkdir(join(사진뿌리, 'runs', String(실행번호), 'scenario'), { recursive: true });
    await writeFile(join(사진뿌리, 'runs', String(실행번호), 'scenario', '4.png'), Buffer.from('png'));

    const 있음 = await app.inject({ method: 'GET', url: `/api/runs/${실행번호}/scenario/screenshots/4` });
    expect(있음.statusCode).toBe(200);
    expect(있음.headers['content-type']).toBe('image/png');
    expect(있음.rawPayload.toString()).toBe('png');

    const 없음 = await app.inject({ method: 'GET', url: `/api/runs/${실행번호}/scenario/screenshots/2` });
    expect(없음.statusCode).toBe(404);
    expect(없음.json<{ error: string }>().error).toBe('SCREENSHOT_NOT_FOUND');

    for (const url of [`/api/runs/${실행번호}/scenario/screenshots/..%2F4`, `/api/runs/${실행번호}/scenario/screenshots/4.png`]) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(400);
      expect(res.json<{ error: string }>().error).toBe('INVALID_REQUEST');
    }

    const 케이스것 = await app.inject({ method: 'GET', url: `/api/runs/${케이스실행번호}/scenario/screenshots/4` });
    expect(케이스것.statusCode).toBe(404);
  });

  it('케이스 단건 조회 GET /api/runs/:runId 는 시나리오 번호에 404 SCENARIO_RUN 이다', async () => {
    // 재기동 복구가 등록 때 돈다 — 우리 실행이 닫힌 뒤에 띄워야 그것을 ABORTED 로 덮지 않는다
    const 실행앱 = Fastify();
    await 실행앱.register(executionRoutes, { prefix: '/api' });
    await 실행앱.ready();
    try {
      const res = await 실행앱.inject({ method: 'GET', url: `/api/runs/${실행번호}` });
      expect(res.statusCode).toBe(404);
      expect(res.json<{ error: string; detail: string }>()).toMatchObject({ error: 'SCENARIO_RUN' });
      const 없음 = await 실행앱.inject({ method: 'GET', url: '/api/runs/999999999' });
      expect(없음.json<{ error: string }>().error).toBe('RUN_NOT_FOUND');
    } finally {
      await 실행앱.close();
    }
  });
});
