// 실행 결과 조회 (SPEC §7 Execution 읽기 경로). 화면이 한 번 물으면 한 화면을 채울 수 있게 모아서 준다
// 목록에는 입력값 원문을 싣지 않는다 — JSON 원문은 목록에 노출하지 않는다 (SPEC §8.1)

import type { ItemStatus, Platform, StepResult } from '@platform/kit';

import type { Pool } from 'pg';

export interface RunCounts {
  total: number;
  pass: number;
  fail: number;
  na: number;
  running: number;
}

export interface RunSummary {
  runId: number;
  title: string;
  triggeredBy: string;
  env: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  counts: RunCounts;
}

export interface RunItemSummary {
  historyId: number;
  tcId: string;
  tcName: string;
  platform: Platform;
  status: ItemStatus;
  durationMs: number | null;
  error: { message: string; stack?: string } | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface RunItemDetail extends RunItemSummary {
  runId: number;
  runTitle: string;
  precondition: string[];
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  steps: StepResult[];
}

export interface HistoryRow {
  historyId: number;
  runId: number;
  runTitle: string;
  platform: Platform;
  status: ItemStatus;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface LastResult {
  tcId: string;
  platform: Platform;
  status: ItemStatus;
  historyId: number;
  runId: number;
  durationMs: number | null;
  finishedAt: string;
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const iso = (v: Date | null): string | null => (v === null ? null : v.toISOString());

// 실행 묶음 한 줄에 판정 개수까지 붙인다. 없으면 목록 화면이 실행마다 항목을 또 불러야 한다
const RUN_COLUMNS = `
  r.run_id, r.title, r.triggered_by, r.env, r.status, r.started_at, r.finished_at,
  count(i.history_id)::int AS total,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'PASS')::int AS pass,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'FAIL')::int AS fail,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'NA')::int AS na,
  count(i.history_id) FILTER (WHERE i.finished_at IS NULL)::int AS running`;

interface RawRun {
  run_id: string;
  title: string;
  triggered_by: string;
  env: string;
  status: string;
  started_at: Date;
  finished_at: Date | null;
  total: number;
  pass: number;
  fail: number;
  na: number;
  running: number;
  grand_total?: number;
}

function toRun(row: RawRun): RunSummary {
  return {
    runId: Number(row.run_id),
    title: row.title,
    triggeredBy: row.triggered_by,
    env: row.env,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    finishedAt: iso(row.finished_at),
    counts: { total: row.total, pass: row.pass, fail: row.fail, na: row.na, running: row.running },
  };
}

export async function listRuns(
  page: number,
  pageSize: number,
): Promise<{ items: RunSummary[]; total: number; page: number; pageSize: number }> {
  const pool = await db();
  const rows = await pool.query<RawRun>(
    `SELECT ${RUN_COLUMNS}, count(*) OVER ()::int AS grand_total
       FROM test_run r
       LEFT JOIN run_item i USING (run_id)
      GROUP BY r.run_id
      ORDER BY r.run_id DESC
      LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize],
  );

  return { items: rows.rows.map(toRun), total: rows.rows[0]?.grand_total ?? 0, page, pageSize };
}

interface RawItem {
  history_id: string;
  tc_id: string;
  tc_name: string;
  platform: Platform;
  status: ItemStatus;
  duration_ms: number | null;
  error: { message: string; stack?: string } | null;
  started_at: Date;
  finished_at: Date | null;
}

const ITEM_COLUMNS = 'history_id, tc_id, tc_name, platform, status, duration_ms, error, started_at, finished_at';

function toItem(row: RawItem): RunItemSummary {
  return {
    historyId: Number(row.history_id),
    tcId: row.tc_id,
    tcName: row.tc_name,
    platform: row.platform,
    status: row.status,
    durationMs: row.duration_ms,
    error: row.error,
    startedAt: row.started_at.toISOString(),
    finishedAt: iso(row.finished_at),
  };
}

export async function findRun(runId: number): Promise<(RunSummary & { items: RunItemSummary[] }) | null> {
  const pool = await db();
  const runs = await pool.query<RawRun>(
    `SELECT ${RUN_COLUMNS} FROM test_run r LEFT JOIN run_item i USING (run_id) WHERE r.run_id = $1 GROUP BY r.run_id`,
    [runId],
  );
  const row = runs.rows[0];
  if (row === undefined) return null;

  const items = await pool.query<RawItem>(
    `SELECT ${ITEM_COLUMNS} FROM run_item WHERE run_id = $1 ORDER BY tc_id, platform`,
    [runId],
  );
  return { ...toRun(row), items: items.rows.map(toItem) };
}

interface RawStep {
  seq: number;
  title: string;
  status: ItemStatus;
  duration_ms: number | null;
  assertions: StepResult['assertions'];
  line: number | null;
  screenshot_path: string | null;
  http_trace: StepResult['httpTrace'] | null;
  error: StepResult['error'] | null;
}

// 저장할 때 StepResult를 컬럼으로 흩었으므로 읽을 때 같은 모양으로 되돌린다 (SPEC §5.1)
function toStep(row: RawStep): StepResult {
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
  };
}

export async function findItem(runId: number, historyId: number): Promise<RunItemDetail | null> {
  const pool = await db();
  const rows = await pool.query<RawItem & { run_id: string; run_title: string; precondition: string[]; params: Record<string, unknown>; expected: Record<string, unknown> }>(
    `SELECT i.${ITEM_COLUMNS.split(', ').join(', i.')}, i.run_id, r.title AS run_title, i.precondition, i.params, i.expected
       FROM run_item i JOIN test_run r ON r.run_id = i.run_id
      WHERE i.run_id = $1 AND i.history_id = $2`,
    [runId, historyId],
  );
  const row = rows.rows[0];
  if (row === undefined) return null;

  const steps = await pool.query<RawStep>(
    `SELECT seq, title, status, duration_ms, assertions, line, screenshot_path, http_trace, error
       FROM run_item_step WHERE history_id = $1 ORDER BY seq`,
    [historyId],
  );

  return {
    ...toItem(row),
    runId: Number(row.run_id),
    runTitle: row.run_title,
    precondition: row.precondition,
    params: row.params,
    expected: row.expected,
    steps: steps.rows.map(toStep),
  };
}

export async function caseHistory(
  tcId: string,
  platform: string | undefined,
  page: number,
  pageSize: number,
): Promise<{ items: HistoryRow[]; total: number; page: number; pageSize: number }> {
  const pool = await db();
  const rows = await pool.query<{
    history_id: string;
    run_id: string;
    run_title: string;
    platform: Platform;
    status: ItemStatus;
    duration_ms: number | null;
    started_at: Date;
    finished_at: Date | null;
    total: number;
  }>(
    `SELECT i.history_id, i.run_id, r.title AS run_title, i.platform, i.status, i.duration_ms,
            i.started_at, i.finished_at, count(*) OVER ()::int AS total
       FROM run_item i JOIN test_run r ON r.run_id = i.run_id
      WHERE i.tc_id = $1 AND ($2::text IS NULL OR i.platform = $2)
      ORDER BY i.started_at DESC, i.history_id DESC
      LIMIT $3 OFFSET $4`,
    [tcId, platform ?? null, pageSize, (page - 1) * pageSize],
  );

  return {
    items: rows.rows.map((row) => ({
      historyId: Number(row.history_id),
      runId: Number(row.run_id),
      runTitle: row.run_title,
      platform: row.platform,
      status: row.status,
      durationMs: row.duration_ms,
      startedAt: row.started_at.toISOString(),
      finishedAt: iso(row.finished_at),
    })),
    total: rows.rows[0]?.total ?? 0,
    page,
    pageSize,
  };
}

// 케이스 목록의 '마지막 결과' 칸을 한 번에 채운다 (SPEC §8.1).
// 아직 안 끝난 항목은 판정이 아직 없으므로 마지막 결과가 아니다
export async function lastByCase(): Promise<LastResult[]> {
  const pool = await db();
  const rows = await pool.query<{
    tc_id: string;
    platform: Platform;
    status: ItemStatus;
    history_id: string;
    run_id: string;
    duration_ms: number | null;
    finished_at: Date;
  }>(
    `SELECT DISTINCT ON (tc_id, platform) tc_id, platform, status, history_id, run_id, duration_ms, finished_at
       FROM run_item
      WHERE finished_at IS NOT NULL
      ORDER BY tc_id, platform, started_at DESC, history_id DESC`,
  );

  return rows.rows.map((row) => ({
    tcId: row.tc_id,
    platform: row.platform,
    status: row.status,
    historyId: Number(row.history_id),
    runId: Number(row.run_id),
    durationMs: row.duration_ms,
    finishedAt: row.finished_at.toISOString(),
  }));
}
