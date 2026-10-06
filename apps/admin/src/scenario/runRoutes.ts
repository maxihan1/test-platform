// 시나리오 실행 통로 — 실행 요청 · 결과 조회 · 사진 (SPEC 도메인/시나리오 §7)
// 배정과 권한은 문(auth/gate.ts)이 이미 봤다. routes.ts 검사 파일이 300줄에 닿아 실행 통로만 뗐다

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ItemStatus, Platform, ScenarioCleanup, ScenarioPart, StepResult } from '@platform/kit';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { artifactsDir, 시나리오실행인가 } from '../execution/routes.js';
import { 가린다, 긴것부터, 비밀글자들 } from '../execution/trial.js';
import { 정수 } from '../routeParams.js';
import { 가린값들 } from '../web/mask.js';

import { 시나리오분배 } from './runResult.js';
import { 실행만들기, 시나리오실행오류 } from './runStore.js';

// 대상 서버 키. 주소는 요청이 싣지 않는다 — runStore 가 그 서비스의 service_env 에서 찾는다
const 실행본문 = z.object({ env: z.string().min(1) });

const 오류응답: Record<시나리오실행오류['code'], [number, string]> = {
  NOT_FOUND: [404, 'SCENARIO_NOT_FOUND'],
  ARCHIVED: [409, 'SCENARIO_ARCHIVED'],
  SERVICE_INACTIVE: [400, 'INVALID_REQUEST'],
  ENV_NOT_FOUND: [400, 'ENV_NOT_FOUND'],
  NOT_RUNNABLE: [409, 'SCENARIO_NOT_RUNNABLE'],
};

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });

interface 부품행 {
  id: string;
  seq: number;
  kind: ScenarioPart['kind'];
  tc_id: string | null;
  tc_name: string | null;
  part: ScenarioPart;
  status: ItemStatus;
  duration_ms: number | null;
  skipped_steps: string[];
  mocks: string[];
  error: { message: string; stack?: string } | null;
  param_schema: unknown;
  expected_schema: unknown;
  precondition: string[];
  unconfirmed: string | null;
  bound: Record<string, unknown>;
  cleanup: Omit<ScenarioCleanup, 'fromSeq'>[];
}

interface 절차행 {
  part_id: string;
  seq: number;
  title: string;
  status: ItemStatus;
  skipped: boolean;
  duration_ms: number | null;
  assertions: StepResult['assertions'];
  line: number | null;
  screenshot_path: string | null;
  http_trace: StepResult['httpTrace'] | null;
  error: StepResult['error'] | null;
}

// execution/queries.ts 의 toStep 과 같은 모양이다. 건너뜀 칸이 하나 더 있다
function 절차로(row: 절차행): StepResult {
  return {
    seq: row.seq,
    title: row.title,
    status: row.status,
    durationMs: row.duration_ms ?? 0,
    assertions: row.assertions,
    ...(row.line === null ? {} : { line: row.line }),
    ...(row.screenshot_path === null ? {} : { screenshotPath: row.screenshot_path }),
    ...(row.http_trace === null ? {} : { httpTrace: row.http_trace }),
    ...(row.error === null ? {} : { error: row.error }),
    ...(row.skipped ? { skipped: true as const } : {}),
  };
}

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

// kind 가 UI · FN 인 번호는 없는 것으로 본다 (§7)
async function 결과(runId: number) {
  const pool = await db();
  const 머리 = await pool.query<{ scenario_id: string; scenario_version: number; status: string; platform: Platform }>(
    `SELECT r.scenario_id, r.scenario_version, r.status, v.platform
       FROM test_run r
       JOIN scenario_version v ON v.scenario_id = r.scenario_id AND v.version = r.scenario_version
      WHERE r.run_id = $1 AND r.kind = 'SCENARIO'`,
    [runId],
  );
  const 행 = 머리.rows[0];
  if (행 === undefined) return null;

  const 부품 = await pool.query<부품행>(
    `SELECT id, seq, kind, tc_id, tc_name, part, status, duration_ms, skipped_steps, mocks, error,
            param_schema, expected_schema, precondition, unconfirmed, bound, cleanup
       FROM scenario_run_part WHERE run_id = $1 ORDER BY seq`,
    [runId],
  );
  const 절차 = await pool.query<절차행>(
    `SELECT s.part_id, s.seq, s.title, s.status, s.skipped, s.duration_ms, s.assertions, s.line, s.screenshot_path,
            s.http_trace, s.error
       FROM scenario_run_step s JOIN scenario_run_part p ON p.id = s.part_id
      WHERE p.run_id = $1 ORDER BY s.seq`,
    [runId],
  );

  // 키로 가린 칸 밖에도 같은 값이 실린다 — 절차 기록의 요청 본문 · 오류 문장 · 뒷정리 주소. 시험 실행(scenario/trial.ts)과 같은 규칙으로 모아 글자째 가린다
  const 비밀 = 부품.rows.flatMap((p) => {
    const 가린꽂은값 = 가린값들(p.bound, p.param_schema);
    // 숫자 비밀(pin: 1234)도 글자로 실린다
    const 꽂은비밀 = Object.entries(p.bound).flatMap(([k, v]) =>
      가린꽂은값[k] !== v && (typeof v === 'string' || typeof v === 'number') && v !== '' ? [String(v)] : [],
    );
    if (p.part.kind !== 'case') return 꽂은비밀;
    const 명세 = { paramSchema: p.param_schema, expectedSchema: p.expected_schema, params: p.part.params, expected: p.part.expected };
    return [...비밀글자들(명세), ...꽂은비밀];
  });

  const 본것 = {
    scenarioId: Number(행.scenario_id),
    version: 행.scenario_version,
    status: 행.status,
    platform: 행.platform,
    parts: 부품.rows.map((p) => ({
      seq: p.seq,
      kind: p.kind,
      tcId: p.tc_id,
      tcName: p.tc_name,
      // 부품 행에는 사람이 본 적 없는 저장 비밀번호가 채워져 있다. 화면만 가리면 개발자 도구로 원문이 보인다 (실행 §8.2)
      part:
        p.part.kind === 'case'
          ? { ...p.part, params: 가린값들(p.part.params, p.param_schema), expected: 가린값들(p.part.expected, p.expected_schema) }
          : p.part,
      status: p.status,
      durationMs: p.duration_ms,
      skippedSteps: p.skipped_steps,
      mocks: p.mocks,
      paramSchema: p.param_schema,
      expectedSchema: p.expected_schema,
      precondition: p.precondition,
      unconfirmed: p.unconfirmed,
      bound: 가린값들(p.bound, p.param_schema),
      cleanup: p.cleanup,
      steps: 절차.rows.filter((s) => s.part_id === p.id).map(절차로),
      error: p.error,
    })),
  };
  return 가린다(본것, 긴것부터(비밀)) as typeof 본것;
}

export default async function scenarioRunRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string } }>('/scenarios/:id/runs', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return 잘못(reply, req.params.id);
    const parsed = 실행본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);

    // 문 없이 라우트만 띄우는 검사에서만 사람이 빈다 (scenario/routes.ts 의 누가 와 같다)
    const 사람 = { username: req.user?.username ?? '알 수 없음', displayName: req.user?.displayName ?? '알 수 없음' };
    try {
      const { runId, 요청 } = await 실행만들기(id, parsed.data.env, 사람);
      // 기다리지 않는다. 시나리오 하나가 수십 분이면 응답이 그동안 열려 있게 된다 (§7)
      void 시나리오분배(runId, 요청).catch((err: unknown) => {
        app.log.error(`[scenario] 실행 ${runId} 분배가 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
      });
      return reply.code(201).send({ runId });
    } catch (err) {
      if (!(err instanceof 시나리오실행오류)) throw err;
      const [code, error] = 오류응답[err.code];
      return reply.code(code).send({ error, detail: err.message });
    }
  });

  app.get<{ Params: { runId: string } }>('/runs/:runId/scenario', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return 잘못(reply, req.params.runId);
    const 본것 = await 결과(runId);
    if (본것 === null) return reply.code(404).send({ error: 'RUN_NOT_FOUND', detail: req.params.runId });
    return 본것;
  });

  // :seq 는 절차 순번이다 — 시나리오 전체에서 이어지고 부품 순번이 아니다 (§7)
  app.get<{ Params: { runId: string; seq: string } }>('/runs/:runId/scenario/screenshots/:seq', async (req, reply) => {
    // 경로를 정수로만 조립한다. 볼륨 밖으로 올라가는 경로가 애초에 만들어지지 않는다
    const runId = 정수(req.params.runId);
    const seq = 정수(req.params.seq);
    if (runId === null || seq === null) return 잘못(reply, req.url);
    // 케이스 실행 폴더에 scenario 가 있을 리 없지만, 통로가 약속한 것은 시나리오 실행의 사진뿐이다
    if (!(await 시나리오실행인가(runId))) return reply.code(404).send({ error: 'SCREENSHOT_NOT_FOUND', detail: req.url });

    let png: Buffer;
    try {
      png = await readFile(join(artifactsDir(), 'runs', String(runId), 'scenario', `${seq}.png`));
    } catch {
      // 내보낼 것을 손에 쥔 뒤에 형식을 정한다. 먼저 image/png 로 박으면 404 본문을 png 로 쓰려다 500 이 난다
      return reply.code(404).send({ error: 'SCREENSHOT_NOT_FOUND', detail: req.url });
    }
    return reply.type('image/png').send(png);
  });
}
