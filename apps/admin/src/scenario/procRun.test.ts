// E2E 프로시저 단계 — 실행 만들기의 프로시저 펼치기 · 결과의 케이스 줄 맞추기 · 시험 실행 · 러너 능력 409 (SPEC 도메인/시나리오 §3.7 결정 17)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import Fastify from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { 시나리오시험 } from '../execution/trial.js';

import { 케이스재료 } from './parts.js';
import scenarioRoutes from './routes.js';
import { 시나리오분배 } from './runResult.js';
import { 시나리오결과 } from './runRoutes.js';
import { 실행만들기, 시나리오실행오류 } from './runStore.js';
import { 만들기 } from './store.js';
import { 시험시작 } from './trial.js';

const 연결 = process.env.DATABASE_URL;

const 가짜 = vi.hoisted(() => ({
  요청: [] as ScenarioExecuteRequest[],
  응답: null as ScenarioExecuteResponse | null,
  러너못돎: false,
}));
vi.mock('../execution/runner.js', async (원래) => ({
  ...(await 원래<typeof import('../execution/runner.js')>()),
  callScenarioRunner: async (요청: ScenarioExecuteRequest) => {
    가짜.요청.push(요청);
    return 가짜.응답 ?? { status: 'PASS', durationMs: 1, parts: [] };
  },
}));
vi.mock('../execution/runnerAddr.js', async (원래) => ({
  ...(await 원래<typeof import('../execution/runnerAddr.js')>()),
  프로시저못도는러너인가: async () => 가짜.러너못돎,
}));
vi.mock('../execution/farm.js', async (원래) => ({
  ...(await 원래<typeof import('../execution/farm.js')>()),
  팜주소: () => 'http://farm.xsq',
  팜폰으로: async <T,>(_팜: string, 일: (udid: string, 화면: string | undefined) => Promise<T>) => 일('UDID-XSQ', undefined),
}));

const 소스 = (tcId: string) => `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({ tcId: '${tcId}', name: 'x', precondition: [], params: null, expected: null });

test(spec, async () => {
  await test.step('한 건이다', async () => {
    await verify('한 건이다', 1, 1, { blocker: true });
  });
});
`;

describe.skipIf(연결 === undefined)('E2E 프로시저 단계', () => {
  let 서비스 = 0;
  let 프로젝트 = 0;
  let 뿌리 = '';
  const 원래뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 프로시저: [string, string, number][] = [
    ['XSQ-FN-101', 'XSQ-TP-001', 1],
    ['XSQ-UI-102', 'XSQ-TP-001', 2],
    ['XSQ-FN-103', 'XSQ-TP-001', 3],
    ['XSQ-FN-201', 'XSQ-TP-002', 1],
  ];
  const 번호들 = [...프로시저.map(([t]) => t), 'XSQ-001'];
  const 사람 = { username: 'xsq', displayName: 'XSQ 검사 사람' };
  const 입력스키마 = { type: 'object', properties: { note: { type: 'string' } } };

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);
  const 케이스 = (tcId: string, 칸: Partial<Extract<ScenarioPart, { kind: 'case' }>> = {}): ScenarioPart => ({
    kind: 'case',
    tcId,
    params: {},
    expected: {},
    skipSteps: [],
    ...칸,
  });
  const 시나리오 = async (parts: ScenarioPart[]) => (await 만들기(서비스, 'XSQ 흐름', 'android', parts, 사람)).id;

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
  };

  beforeAll(async () => {
    뿌리 = await mkdtemp(join(tmpdir(), 'xsq-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xsq'));
    for (const tcId of 번호들) await writeFile(join(뿌리, 'xsq', `${tcId}.spec.ts`), 소스(tcId));

    프로젝트 = Number(((await q("INSERT INTO project (name) VALUES ('XSQ 프로젝트') RETURNING id")).rows[0] as { id: string }).id);
    const r = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind)
            VALUES ('XSQ', 'XSQ 검사용', '#3A5FCD', 'git@x:xsq.git', 'xsq', $1, 'APP')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true, project_id = EXCLUDED.project_id, kind = 'APP', game_platform = NULL RETURNING id`,
      [프로젝트],
    );
    서비스 = Number((r.rows[0] as { id: string }).id);
    await 치우기표();
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q("INSERT INTO service_env (service_id, env, base_url, app_path) VALUES ($1, 'stg', 'http://api.xsq.example', '/apps/xsq.apk')", [서비스]);
    for (const tcId of 번호들) {
      const 줄 = 프로시저.find(([t]) => t === tcId);
      await q(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, proc_id, proc_seq, proc_name)
         VALUES ($1, $1 || ' 이름', '["android"]', '["앱을 켰다"]', 'xsq/' || $1 || '.spec.ts', $2, '{"type":"object"}', $3, $4, $5)
         ON CONFLICT (tc_id) DO UPDATE SET file_path = EXCLUDED.file_path, is_active = true, platforms = EXCLUDED.platforms,
           param_schema = EXCLUDED.param_schema, proc_id = EXCLUDED.proc_id, proc_seq = EXCLUDED.proc_seq, proc_name = EXCLUDED.proc_name`,
        [tcId, JSON.stringify(입력스키마), 줄?.[1] ?? null, 줄?.[2] ?? null, 줄 === undefined ? null : `${줄[1]} 흐름`],
      );
    }
    await q("DELETE FROM case_input WHERE tc_id = 'XSQ-FN-103'");
    await q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ('XSQ-FN-103', '{"note":"저장한 값"}', '{}', 'xsq')`);
  });

  afterEach(() => {
    가짜.요청.length = 0;
    가짜.응답 = null;
    가짜.러너못돎 = false;
  });

  afterAll(async () => {
    await 치우기표();
    await q('DELETE FROM case_input WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await q('DELETE FROM project WHERE id = $1', [프로젝트]);
    await rm(뿌리, { recursive: true, force: true });
    if (원래뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 원래뿌리;
  });

  it('프로시저 안 케이스를 고른 단계는 그 프로시저의 케이스 전부를 도는 차례로 요청에 싣는다 — 고른 케이스만 조립 값, 나머지는 저장값', async () => {
    const id = await 시나리오([케이스('XSQ-FN-101', { params: { note: '조립한 값' } }), 케이스('XSQ-001')]);

    const { runId, 요청 } = await 실행만들기(id, 'stg', 사람);

    const 첫 = 요청.parts[0]!;
    expect(첫).toMatchObject({ kind: 'case', tcId: 'XSQ-FN-101', procId: 'XSQ-TP-001', skipSteps: [], appStep: true });
    expect(첫.cases).toEqual([
      { tcId: 'XSQ-FN-101', params: { note: '조립한 값' }, expected: {} },
      { tcId: 'XSQ-UI-102', params: {}, expected: {} },
      { tcId: 'XSQ-FN-103', params: { note: '저장한 값' }, expected: {} },
    ]);
    expect(요청.parts[1]).not.toHaveProperty('procId');
    expect(요청.parts[1]).not.toHaveProperty('cases');
    expect(요청.timeoutMs).toBe(3 * 120000 + 180000 + 300000);

    const 부품 = await q('SELECT seq, proc_id, proc_name, cases, timeout_ms, part FROM scenario_run_part WHERE run_id = $1 ORDER BY seq', [runId]);
    const [프, 옛] = 부품.rows as { proc_id: string | null; proc_name: string | null; cases: Record<string, unknown>[] | null; timeout_ms: number; part: object }[];
    expect([프!.proc_id, 프!.proc_name, 프!.timeout_ms]).toEqual(['XSQ-TP-001', 'XSQ-TP-001 흐름', 540000]);
    expect(프!.cases!.map((x) => x.tcId)).toEqual(['XSQ-FN-101', 'XSQ-UI-102', 'XSQ-FN-103']);
    expect(프!.cases![0]).toMatchObject({
      name: 'XSQ-FN-101 이름',
      params: { note: '조립한 값' },
      paramSchema: 입력스키마,
      precondition: ['앱을 켰다'],
    });
    expect(프!.cases![0]).not.toHaveProperty('status');
    expect(JSON.stringify(프!.part)).not.toContain('procId');
    expect([옛!.proc_id, 옛!.proc_name, 옛!.cases, 옛!.timeout_ms]).toEqual([null, null, null, 300000]);
  });

  it('러너가 프로시저를 못 돌리면 실행 행을 세우기 전에 RUNNER_NO_PROCEDURE 로 거절한다 — 옛 꼴 케이스만 있으면 그대로 간다', async () => {
    가짜.러너못돎 = true;
    const 프로시저단계 = await 시나리오([케이스('XSQ-FN-101')]);

    const 잡은 = await 실행만들기(프로시저단계, 'stg', 사람).then(() => null, (e: unknown) => e);

    expect(잡은).toBeInstanceOf(시나리오실행오류);
    expect((잡은 as 시나리오실행오류).code).toBe('RUNNER_NO_PROCEDURE');
    expect((await q('SELECT 1 FROM test_run WHERE scenario_id = $1', [프로시저단계])).rowCount).toBe(0);
    await expect(실행만들기(await 시나리오([케이스('XSQ-001')]), 'stg', 사람)).resolves.toMatchObject({ runId: expect.any(Number) });
  });

  it('결과의 케이스 줄을 박제한 줄에 tcId 로 맞춰 채우고 절차에 tcId 를 싣는다 — 안 돈 단계는 결과 칸이 빈다', async () => {
    const id = await 시나리오([케이스('XSQ-FN-101'), 케이스('XSQ-001')]);
    const { runId, 요청 } = await 실행만들기(id, 'stg', 사람);
    가짜.응답 = {
      status: 'FAIL',
      durationMs: 5,
      parts: [
        {
          seq: 1,
          status: 'FAIL',
          durationMs: 4,
          mocks: [],
          error: { message: '결제 버튼이 없다' },
          steps: [
            { seq: 1, title: '앱을 켠다', status: 'PASS', durationMs: 1, assertions: [], tcId: 'XSQ-FN-101' },
            { seq: 2, title: '결제한다', status: 'FAIL', durationMs: 2, assertions: [], tcId: 'XSQ-UI-102' },
          ],
          cases: [
            { tcId: 'XSQ-FN-101', status: 'PASS', durationMs: 1 },
            { tcId: 'XSQ-UI-102', status: 'FAIL', durationMs: 2, error: { message: '결제 버튼이 없다' } },
            { tcId: 'XSQ-FN-103', status: 'NA', durationMs: 0, error: { message: 'BLOCKED' }, blockedBy: 'XSQ-UI-102' },
          ],
        },
      ],
    };

    await 시나리오분배(runId, 요청);

    const 결과 = await 시나리오결과(runId);
    const [프, 옛] = 결과!.parts;
    expect(프).toMatchObject({ procId: 'XSQ-TP-001', procName: 'XSQ-TP-001 흐름', status: 'FAIL' });
    expect((프 as { cases: unknown }).cases).toEqual([
      { tcId: 'XSQ-FN-101', name: 'XSQ-FN-101 이름', status: 'PASS', durationMs: 1 },
      { tcId: 'XSQ-UI-102', name: 'XSQ-UI-102 이름', status: 'FAIL', durationMs: 2, error: { message: '결제 버튼이 없다' } },
      { tcId: 'XSQ-FN-103', name: 'XSQ-FN-103 이름', status: 'NA', durationMs: 0, error: { message: 'BLOCKED' }, blockedBy: 'XSQ-UI-102' },
    ]);
    expect(프!.steps.map((s) => (s as { tcId?: string }).tcId)).toEqual(['XSQ-FN-101', 'XSQ-UI-102']);
    expect(옛).not.toHaveProperty('procId');
    expect(옛).not.toHaveProperty('cases');
    const 절차 = await q('SELECT s.tc_id FROM scenario_run_step s JOIN scenario_run_part p ON p.id = s.part_id WHERE p.run_id = $1 ORDER BY s.seq', [runId]);
    expect(절차.rows).toEqual([{ tc_id: 'XSQ-FN-101' }, { tc_id: 'XSQ-UI-102' }]);
  });

  it('러너가 단계 결과를 안 돌려주면 케이스 줄은 이름만 있고 status 가 없다', async () => {
    const { runId, 요청 } = await 실행만들기(await 시나리오([케이스('XSQ-FN-101')]), 'stg', 사람);
    가짜.응답 = { status: 'NA', durationMs: 0, parts: [], error: { message: 'RUNNER_UNREACHABLE' } };

    await 시나리오분배(runId, 요청);

    const 프 = (await 시나리오결과(runId))!.parts[0] as { cases: { tcId: string; status?: string }[] };
    expect(프.cases.map((x) => [x.tcId, x.status])).toEqual([
      ['XSQ-FN-101', undefined],
      ['XSQ-UI-102', undefined],
      ['XSQ-FN-103', undefined],
    ]);
  });

  it('시험 실행도 프로시저를 통째로 싣고, 결과의 케이스 줄에 이름을 더해 돌려준다', async () => {
    가짜.응답 = {
      status: 'PASS',
      durationMs: 3,
      parts: [
        {
          seq: 1,
          status: 'PASS',
          durationMs: 3,
          mocks: [],
          steps: [],
          cases: [
            { tcId: 'XSQ-FN-103', status: 'PASS', durationMs: 1 },
            { tcId: 'XSQ-FN-101', status: 'PASS', durationMs: 1 },
            { tcId: 'XSQ-UI-102', status: 'PASS', durationMs: 1 },
          ],
        },
      ],
    };

    const trialId = await 시험시작(사람, { service: 'XSQ', env: 'stg', platform: 'android', parts: [케이스('XSQ-FN-103')] });
    await vi.waitFor(() => expect(시나리오시험.읽는다(사람.username, trialId)?.status).toBe('FINISHED'));

    expect(가짜.요청[0]!.parts[0]).toMatchObject({ procId: 'XSQ-TP-001', skipSteps: [] });
    expect(가짜.요청[0]!.parts[0]!.cases!.map((x) => x.tcId)).toEqual(['XSQ-FN-101', 'XSQ-UI-102', 'XSQ-FN-103']);
    expect(가짜.요청[0]!.timeoutMs).toBe(3 * 120000 + 180000);
    const 결과 = 시나리오시험.읽는다(사람.username, trialId) as { result: { parts: { procId?: string; procName?: string; cases?: unknown[] }[] } };
    expect(결과.result.parts[0]).toMatchObject({ procId: 'XSQ-TP-001', procName: 'XSQ-TP-001 흐름' });
    expect(결과.result.parts[0]!.cases).toEqual([
      { tcId: 'XSQ-FN-101', name: 'XSQ-FN-101 이름', status: 'PASS', durationMs: 1 },
      { tcId: 'XSQ-UI-102', name: 'XSQ-UI-102 이름', status: 'PASS', durationMs: 1 },
      { tcId: 'XSQ-FN-103', name: 'XSQ-FN-103 이름', status: 'PASS', durationMs: 1 },
    ]);
  });

  it('시험 실행은 같은 프로시저의 케이스가 둘이거나 건너뛸 제목이 있으면 400 이고, 러너가 못 돌리면 RUNNER_NO_PROCEDURE 다', async () => {
    const 본문 = (parts: ScenarioPart[]) => ({ service: 'XSQ', env: 'stg', platform: 'android' as const, parts });

    await expect(시험시작(사람, 본문([케이스('XSQ-FN-101'), 케이스('XSQ-FN-103')]))).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      message: expect.stringContaining('같은 프로시저'),
    });
    await expect(시험시작(사람, 본문([케이스('XSQ-FN-101', { skipSteps: ['한 건이다'] })]))).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      message: expect.stringContaining('프로시저 단계는 건너뛸 절차를 걸 수 없다'),
    });
    가짜.러너못돎 = true;
    await expect(시험시작(사람, 본문([케이스('XSQ-FN-101')]))).rejects.toMatchObject({ code: 'RUNNER_NO_PROCEDURE' });
    expect(가짜.요청).toHaveLength(0);
  });

  it('카탈로그 재료는 프로시저 안 케이스에 프로시저와 활성 케이스(UI 포함, 도는 차례)를 싣고 건너뛸 절차를 비운다', async () => {
    const { 카탈로그, 부품재료 } = await 케이스재료(['XSQ-FN-103', 'XSQ-001']);

    expect(카탈로그.get('XSQ-FN-103')?.proc).toEqual({
      procId: 'XSQ-TP-001',
      procName: 'XSQ-TP-001 흐름',
      cases: [
        { tcId: 'XSQ-FN-101', name: 'XSQ-FN-101 이름' },
        { tcId: 'XSQ-UI-102', name: 'XSQ-UI-102 이름' },
        { tcId: 'XSQ-FN-103', name: 'XSQ-FN-103 이름' },
      ],
    });
    expect(카탈로그.get('XSQ-FN-103')?.skippable).toEqual([]);
    expect(부품재료.get('XSQ-FN-103')).toMatchObject({ procId: 'XSQ-TP-001', r16: false });
    expect(카탈로그.get('XSQ-001')).not.toHaveProperty('proc');
    expect(부품재료.get('XSQ-001')).not.toHaveProperty('procId');
  });

  it('저장은 같은 프로시저의 케이스 둘 · 프로시저 단계의 건너뛰기를 400 으로 거절하고, 상세는 프로시저 단계에만 procId · procName · cases 를 싣는다', async () => {
    const app = Fastify();
    await app.register(scenarioRoutes, { prefix: '/api' });
    try {
      const 저장 = (parts: ScenarioPart[]) => app.inject({ method: 'POST', url: '/api/scenarios', payload: { service: 'XSQ', name: 'XSQ 저장', platform: 'android', parts } });

      const 둘 = await 저장([케이스('XSQ-FN-101'), 케이스('XSQ-FN-103')]);
      expect(둘.statusCode).toBe(400);
      expect(둘.json().detail).toContain('같은 프로시저');
      expect((await 저장([케이스('XSQ-FN-101', { skipSteps: ['한 건이다'] })])).statusCode).toBe(400);

      const 만듦 = await 저장([케이스('XSQ-FN-101'), 케이스('XSQ-001')]);
      expect(만듦.statusCode).toBe(201);
      const 상세 = (await app.inject({ method: 'GET', url: `/api/scenarios/${만듦.json().id}` })).json();
      expect(상세.parts[0]).toMatchObject({
        tcId: 'XSQ-FN-101',
        procId: 'XSQ-TP-001',
        procName: 'XSQ-TP-001 흐름',
        cases: [
          { tcId: 'XSQ-FN-101', name: 'XSQ-FN-101 이름' },
          { tcId: 'XSQ-UI-102', name: 'XSQ-UI-102 이름' },
          { tcId: 'XSQ-FN-103', name: 'XSQ-FN-103 이름' },
        ],
      });
      expect(상세.parts[1]).not.toHaveProperty('procId');
      expect(상세.parts[1]).not.toHaveProperty('cases');
      expect(상세.checks).toEqual([]);
    } finally {
      await app.close();
    }
  });
});
