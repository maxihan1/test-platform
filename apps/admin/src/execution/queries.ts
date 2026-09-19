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
  // 그때의 이름을 박제한 값. 계정 이름을 바꾸거나 지워도 과거 기록이 흔들리지 않는다 (SPEC §6 · §8.7)
  triggeredByName: string | null;
  env: string;
  // 그날 실제로 친 주소. env→주소 대응표가 바뀌어도 남는다 (SPEC §6 · §8.3 RUN 머리)
  baseUrl: string;
  // 실행 시점 서비스 이름. 설정에서 이름을 고쳐도 과거 기록은 그대로다 (SPEC §6 · §8.4)
  serviceName: string;
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
  // 같은 케이스×디바이스를 몇 번째로 돌렸는지. 목록의 회차 요약이 이 값으로 센다 (SPEC §8.3)
  attempt: number;
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
  // 입력·기대결과 칸의 라벨. 카탈로그는 스캔 때마다 덮어쓰는 캐시라 못 믿는다 (SPEC §3.3 · §6)
  paramSchema: Record<string, unknown>;
  expectedSchema: Record<string, unknown>;
  steps: StepResult[];
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const iso = (v: Date | null): string | null => (v === null ? null : v.toISOString());

// 실행 묶음 한 줄에 판정 개수까지 붙인다. 없으면 목록 화면이 실행마다 항목을 또 불러야 한다
const RUN_COLUMNS = `
  r.run_id, r.title, r.triggered_by, r.triggered_by_name, r.env, r.base_url, r.service_name,
  r.status, r.started_at, r.finished_at,
  count(i.history_id)::int AS total,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'PASS')::int AS pass,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'FAIL')::int AS fail,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'NA')::int AS na,
  count(i.history_id) FILTER (WHERE i.finished_at IS NULL)::int AS running`;

interface RawRun {
  run_id: string;
  title: string;
  triggered_by: string;
  triggered_by_name: string | null;
  env: string;
  base_url: string;
  service_name: string;
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
    triggeredByName: row.triggered_by_name,
    env: row.env,
    baseUrl: row.base_url,
    serviceName: row.service_name,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    finishedAt: iso(row.finished_at),
    counts: { total: row.total, pass: row.pass, fail: row.fail, na: row.na, running: row.running },
  };
}

// 접두사가 등록된 활성 서비스인지 본다. 배정 판정은 로그인이 붙을 때 이 함수 안이 바뀐다 (SPEC §3.5)
export async function serviceExists(prefix: string): Promise<boolean> {
  const pool = await db();
  const rows = await pool.query('SELECT 1 FROM service WHERE prefix = $1 AND is_active', [prefix]);
  return (rows.rowCount ?? 0) > 0;
}

export async function listRuns(
  service: string,
  page: number,
  pageSize: number,
): Promise<{ items: RunSummary[]; total: number; page: number; pageSize: number }> {
  const pool = await db();
  // test_run.service_id 한 칸이 run_item 의 tc_id 접두사까지 따라가는 조인을 없앤다 (SPEC §6)
  const rows = await pool.query<RawRun>(
    `SELECT ${RUN_COLUMNS}, count(*) OVER ()::int AS grand_total
       FROM test_run r
       LEFT JOIN run_item i USING (run_id)
      WHERE r.service_id = (SELECT id FROM service WHERE prefix = $3)
      GROUP BY r.run_id
      ORDER BY r.run_id DESC
      LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize, service],
  );

  return { items: rows.rows.map(toRun), total: rows.rows[0]?.grand_total ?? 0, page, pageSize };
}

interface RawItem {
  history_id: string;
  tc_id: string;
  tc_name: string;
  platform: Platform;
  attempt: number;
  status: ItemStatus;
  duration_ms: number | null;
  error: { message: string; stack?: string } | null;
  started_at: Date;
  finished_at: Date | null;
}

const ITEM_COLUMNS = 'history_id, tc_id, tc_name, platform, attempt, status, duration_ms, error, started_at, finished_at';

function toItem(row: RawItem): RunItemSummary {
  return {
    historyId: Number(row.history_id),
    tcId: row.tc_id,
    tcName: row.tc_name,
    platform: row.platform,
    attempt: row.attempt,
    status: row.status,
    durationMs: row.duration_ms,
    error: row.error,
    startedAt: row.started_at.toISOString(),
    finishedAt: iso(row.finished_at),
  };
}

export interface EvidenceSummary {
  id: number;
  format: string;
  // PENDING | READY | FAILED. 화면의 버튼 문구가 이 값으로 갈린다 (SPEC §6 · §8.4)
  status: string;
  // PENDING·FAILED 면 파일이 아직 없다
  filePath: string | null;
  error: string | null;
  generatedAt: string;
}

export async function findRun(
  runId: number,
): Promise<(RunSummary & { items: RunItemSummary[]; evidence: EvidenceSummary[] }) | null> {
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

  // 증적 표는 리포팅 소유지만 읽기는 여기서 한다. §3.3 이 막은 것은 그쪽의 write 다
  const evidence = await pool.query<{
    id: string;
    format: string;
    status: string;
    file_path: string | null;
    error: string | null;
    generated_at: Date;
  }>('SELECT id, format, status, file_path, error, generated_at FROM evidence_document WHERE run_id = $1 ORDER BY id', [
    runId,
  ]);

  return {
    ...toRun(row),
    items: items.rows.map(toItem),
    evidence: evidence.rows.map((e) => ({
      id: Number(e.id),
      format: e.format,
      status: e.status,
      filePath: e.file_path,
      error: e.error,
      generatedAt: e.generated_at.toISOString(),
    })),
  };
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
  const rows = await pool.query<RawItem & { run_id: string; run_title: string; precondition: string[]; params: Record<string, unknown>; expected: Record<string, unknown>; param_schema: Record<string, unknown>; expected_schema: Record<string, unknown> }>(
    `SELECT i.${ITEM_COLUMNS.split(', ').join(', i.')}, i.run_id, r.title AS run_title, i.precondition, i.params, i.expected,
            i.param_schema, i.expected_schema
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
    paramSchema: row.param_schema,
    expectedSchema: row.expected_schema,
    steps: steps.rows.map(toStep),
  };
}
