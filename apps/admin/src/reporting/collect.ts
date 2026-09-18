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
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
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

// 할 일 1 은 라벨을 붙이지 않는다. 키 이름을 그대로 두고 값만 문자열로 편다 (할 일 2 가 스키마 라벨로 바꾼다)
function toFields(json: Record<string, unknown>): EvidenceField[] {
  return Object.entries(json).map(([label, value]) => ({ label, value: String(value) }));
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
            precondition, params, expected
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
      serviceName: run.service_name,
      testsRepo: run.tests_repo,
      title: run.title,
      startedAt: run.started_at.toISOString(),
      // 실행자 이름은 스냅샷이라 옛 행에서만 빈다. 머리말은 빈 칸이 아니라 빈 문자열을 받는다
      triggeredByName: run.triggered_by_name ?? '',
      env: run.env,
      baseUrl: run.base_url,
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
      params: toFields(row.params),
      expected: toFields(row.expected),
      steps: steps.rows.filter((s) => s.history_id === row.history_id).map(toStep),
    })),
  };
}
