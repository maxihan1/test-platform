// 실행 한 부를 읽어 증적 문서가 쓸 표시용 모델로 바꾼다 (SPEC §3.3)
// test_case 는 한 줄도 읽지 않는다. 카탈로그를 섞으면 케이스를 고친 날 과거 증적이 같이 흔들린다

import type { ItemStatus, Platform } from '@platform/kit';

import type { Pool } from 'pg';

export interface EvidenceField {
  label: string;
  value: string;
}

export interface EvidenceAssertion {
  statement: string;
  expected: string;
  actual: string;
  status: ItemStatus;
  blocker: boolean;
}

export interface EvidenceStep {
  seq: number;
  title: string;
  status: ItemStatus;
  durationMs: number | null;
  assertions: EvidenceAssertion[];
  screenshotPath: string | null;
}

export interface EvidenceItem {
  tcId: string;
  tcName: string;
  platform: Platform;
  attempt: number;
  /** 'NOT_RUN' 은 돌지 못한 항목이다 (할 일 3 이 채운다) */
  status: ItemStatus | 'NOT_RUN';
  durationMs: number | null;
  notRunReason: string | null;
  precondition: string[];
  params: EvidenceField[];
  expected: EvidenceField[];
  steps: EvidenceStep[];
}

export interface EvidenceHeader {
  serviceName: string;
  testsRepo: string;
  title: string;
  startedAt: string;
  triggeredByName: string;
  env: string;
  baseUrl: string;
}

export interface EvidenceDocument {
  runId: number;
  header: EvidenceHeader;
  items: EvidenceItem[];
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface RawRun {
  run_id: string;
  title: string;
  service_name: string;
  tests_repo: string;
  triggered_by_name: string | null;
  env: string;
  base_url: string;
  started_at: Date;
}

interface RawItem {
  history_id: string;
  tc_id: string;
  tc_name: string;
  platform: Platform;
  attempt: number;
  status: ItemStatus;
  duration_ms: number | null;
  precondition: string[];
  params: unknown;
  expected: unknown;
  param_schema: unknown;
  expected_schema: unknown;
}

interface RawAssertion {
  statement: string;
  status: ItemStatus;
  actual: unknown;
  expected: unknown;
  blocker?: boolean;
}

interface RawStep {
  history_id: string;
  seq: number;
  title: string;
  status: ItemStatus;
  duration_ms: number | null;
  assertions: RawAssertion[];
  screenshot_path: string | null;
}

/** 박제 이전 행의 빈 칸. 지어내지 말고 모른다고 적는다 (SPEC §6) */
const 기록없음 = '기록 없음';
/** 비밀값은 화면과 문서에서만 가린다. DB 에는 평문 그대로다 (SPEC §4.1) */
const 가림 = '********';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 라벨·마스킹을 여기서 끝낸다. 렌더러가 원본 JSON 에 닿으면 형식이 늘 때마다 마스킹이 새는 자리가 는다
function toFields(json: unknown, schema: unknown): EvidenceField[] {
  const values = isPlainObject(json) ? json : {};
  const properties =
    isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : {};

  return Object.entries(values).map(([key, value]) => {
    const raw = properties[key];
    const prop: Record<string, unknown> = isPlainObject(raw) ? raw : {};
    const description = prop.description;

    return {
      // 화면(web/schema.ts)과 같은 규약이다. 갈라지면 폼은 '아이디'인데 증적은 'username' 으로 찍힌다
      label: typeof description === 'string' && description !== '' ? description : key,
      value: prop.secret === true ? 가림 : String(value),
    };
  });
}

function toAssertion(a: RawAssertion): EvidenceAssertion {
  return {
    statement: a.statement,
    expected: String(a.expected),
    actual: String(a.actual),
    status: a.status,
    blocker: a.blocker === true,
  };
}

function toStep(row: RawStep): EvidenceStep {
  return {
    seq: row.seq,
    title: row.title,
    status: row.status,
    durationMs: row.duration_ms,
    assertions: row.assertions.map(toAssertion),
    screenshotPath: row.screenshot_path,
  };
}

export async function collectRun(runId: number): Promise<EvidenceDocument | null> {
  const pool = await db();
  const runs = await pool.query<RawRun>(
    `SELECT run_id, title, service_name, tests_repo, triggered_by_name, env, base_url, started_at
       FROM test_run WHERE run_id = $1`,
    [runId],
  );
  const run = runs.rows[0];
  if (run === undefined) return null;

  const items = await pool.query<RawItem>(
    `SELECT history_id, tc_id, tc_name, platform, attempt, status, duration_ms,
            precondition, params, expected, param_schema, expected_schema
       FROM run_item WHERE run_id = $1 ORDER BY history_id`,
    [runId],
  );

  const steps = await pool.query<RawStep>(
    `SELECT s.history_id, s.seq, s.title, s.status, s.duration_ms, s.assertions, s.screenshot_path
       FROM run_item_step s JOIN run_item i ON i.history_id = s.history_id
      WHERE i.run_id = $1 ORDER BY s.seq`,
    [runId],
  );

  return {
    runId: Number(run.run_id),
    header: {
      serviceName: run.service_name === '' ? 기록없음 : run.service_name,
      testsRepo: run.tests_repo === '' ? 기록없음 : run.tests_repo,
      title: run.title,
      startedAt: run.started_at.toISOString(),
      // 실행자만 문구가 다르다. 「기록이 없다」가 아니라 「그때는 로그인이 없었다」가 사실이다 (SPEC §8.4)
      triggeredByName:
        run.triggered_by_name === null || run.triggered_by_name === ''
          ? '실행자 미상 (인증 도입 이전)'
          : run.triggered_by_name,
      env: run.env,
      baseUrl: run.base_url === '' ? 기록없음 : run.base_url,
    },
    items: items.rows.map((row) => ({
      tcId: row.tc_id,
      tcName: row.tc_name,
      platform: row.platform,
      attempt: row.attempt,
      status: row.status,
      durationMs: row.duration_ms,
      notRunReason: null,
      precondition: row.precondition,
      params: toFields(row.params, row.param_schema),
      expected: toFields(row.expected, row.expected_schema),
      steps: steps.rows.filter((s) => s.history_id === row.history_id).map(toStep),
    })),
  };
}
