// 실행 결과 조회 (SPEC §7 Execution 읽기 경로). 화면이 한 번 물으면 한 화면을 채울 수 있게 모아서 준다
//
// **실행 결과 목록에는 입력값과 라벨을 싣는다** (SPEC §8.3, 2026-09-19).
// §8.1 의 「JSON 원문을 목록에 노출하지 않는다」는 **케이스 목록 규칙**이고 여기에는 적용되지 않는다 —
// §8.3 이 「라벨과 값을 붙여 쓴 한 줄은 JSON 원문이 아니다」라고 명시했다.
// 화면은 `web/mask.ts` 가 라벨을 붙이고 비밀값을 가린 뒤 한 줄로 만든다.
// 안 실으면 화면이 항목마다 상세를 부르게 되고 그것이 §8.1 이 이름 붙여 금지한 N+1 이다

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
  // 목록의 「어떤 값으로 돌린 결과인가」 한 줄이 쓴다 (SPEC §8.3).
  // 라벨은 항목에 박제된 스키마에서 읽는다 — 카탈로그를 읽으면 과거 증적의 라벨이 바뀐다 (§3.3)
  params: Record<string, unknown>;
  paramSchema: Record<string, unknown>;
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
  expected: Record<string, unknown>;
  // 기대결과 칸의 라벨. 카탈로그는 스캔 때마다 덮어쓰는 캐시라 못 믿는다 (SPEC §3.3 · §6).
  // params·paramSchema 는 RunItemSummary 에 있다 — 목록도 같은 값을 쓴다 (§8.3)
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

/**
 * 실행 목록의 거르개 (SPEC §8.7).
 *
 * **`state` 는 `test_run.status` 가 아니다.** `failed` 는 「실패 항목이 하나라도 있는 실행」이라
 * 집계에서 나오고, 그래서 `HAVING` 으로 걸린다. 칸 하나를 보는 것이 아니다.
 */
export interface 실행거르개 {
  q?: string;
  state?: 'running' | 'failed';
  env?: string;
}

/**
 * `WHERE` 와 `HAVING` 을 같이 만든다.
 *
 * **목록 질의와 집계 질의가 같은 함수를 쓴다.** 두 벌이면 거르개를 걸었을 때
 * 「보이는 것」과 「세는 것」이 갈려, 3줄만 보이는 화면이 「42회」라고 말하게 된다.
 */
function 거르는조건(거르개: 실행거르개, 시작번호: number): { where: string; having: string; 값: unknown[] } {
  const where: string[] = [];
  const 값: unknown[] = [];
  let n = 시작번호;

  if (거르개.q !== undefined && 거르개.q !== '') {
    where.push(`r.title ILIKE $${String(n)}`);
    // ILIKE 특수문자를 값으로 다룬다. 사람이 친 % 가 전체 일치로 바뀌지 않게 한다
    값.push(`%${거르개.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
    n += 1;
  }
  if (거르개.env !== undefined && 거르개.env !== '') {
    where.push(`r.env = $${String(n)}`);
    값.push(거르개.env);
    n += 1;
  }
  // 도는 것은 칸으로 갈리지만 실패 섞임은 집계로 갈린다. 그래서 둘이 다른 절에 붙는다
  if (거르개.state === 'running') where.push(`r.finished_at IS NULL`);
  const having =
    거르개.state === 'failed'
      ? `HAVING count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'FAIL') > 0`
      : '';

  return { where: where.length === 0 ? '' : `AND ${where.join(' AND ')}`, having, 값 };
}

/**
 * 실행 기록 화면 머리의 집계 (SPEC §8.7).
 *
 * **거르개를 건 뒤의 집합을 센다.** 전체를 세면 3줄만 보이는 화면이 「42회」라고 말한다.
 */
export interface 실행집계 {
  runs: number;
  /** 실패도 미실행도 없는 실행 */
  allPass: number;
  /** 실패 항목이 하나라도 있는 실행 */
  hasFail: number;
  /** 평균을 낸 실행 수. 도는 실행은 소요가 없어 빠진다 — 몇 회를 셌는지 화면이 적는다 */
  durationOf: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

export async function listRuns(
  service: string,
  page: number,
  pageSize: number,
  거르개: 실행거르개 = {},
): Promise<{ items: RunSummary[]; total: number; page: number; pageSize: number; summary: 실행집계 }> {
  const pool = await db();
  const 조건 = 거르는조건(거르개, 4);
  // test_run.service_id 한 칸이 run_item 의 tc_id 접두사까지 따라가는 조인을 없앤다 (SPEC §6)
  //
  // count(*) OVER () 가 HAVING 뒤·LIMIT 앞에서 돈다. 그래서 거르개를 걸어도 총건수가
  // **걸린 뒤의 수**다 (2026-09-22 실측 — 감싸는 서브질의로 바꿔도 결과가 같았다).
  // 계획 검토가 「HAVING 이전을 센다」고 의심했는데 재 보니 그렇지 않았다
  const rows = await pool.query<RawRun>(
    `SELECT ${RUN_COLUMNS}, count(*) OVER ()::int AS grand_total
       FROM test_run r
       LEFT JOIN run_item i USING (run_id)
      WHERE r.service_id = (SELECT id FROM service WHERE prefix = $3) ${조건.where}
      GROUP BY r.run_id
      ${조건.having}
      ORDER BY r.run_id DESC
      LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize, service, ...조건.값],
  );

  return {
    items: rows.rows.map(toRun),
    total: rows.rows[0]?.grand_total ?? 0,
    page,
    pageSize,
    summary: await runSummary(service, 거르개),
  };
}

/**
 * 집계는 쪽을 안 탄다. 목록과 **같은 거르개 함수**를 써서 둘이 갈라지지 않게 한다.
 *
 * 한 실행이 「모두 통과」인지는 항목 집계에서 나오므로 실행마다 한 번 접고 그것을 다시 센다.
 */
async function runSummary(service: string, 거르개: 실행거르개): Promise<실행집계> {
  const pool = await db();
  const 조건 = 거르는조건(거르개, 2);
  const { rows } = await pool.query<{
    runs: number;
    all_pass: number;
    has_fail: number;
    duration_of: number;
    avg_duration_ms: number | null;
    max_duration_ms: number | null;
  }>(
    `SELECT count(*)::int AS runs,
            count(*) FILTER (WHERE fail = 0 AND na = 0 AND running = 0 AND total > 0)::int AS all_pass,
            count(*) FILTER (WHERE fail > 0)::int AS has_fail,
            count(duration)::int AS duration_of,
            avg(duration)::int AS avg_duration_ms,
            max(duration)::int AS max_duration_ms
       FROM (
         SELECT count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'FAIL')::int AS fail,
                count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'NA')::int AS na,
                count(i.history_id) FILTER (WHERE i.finished_at IS NULL)::int AS running,
                count(i.history_id)::int AS total,
                -- 도는 실행은 끝난 시각이 없다. NULL 이면 avg·count 가 알아서 뺀다
                extract(epoch FROM (r.finished_at - r.started_at)) * 1000 AS duration
           FROM test_run r
           LEFT JOIN run_item i USING (run_id)
          WHERE r.service_id = (SELECT id FROM service WHERE prefix = $1) ${조건.where}
          GROUP BY r.run_id, r.started_at, r.finished_at
          ${조건.having}
       ) 실행마다`,
    [service, ...조건.값],
  );

  const 것 = rows[0];
  return {
    runs: 것?.runs ?? 0,
    allPass: 것?.all_pass ?? 0,
    hasFail: 것?.has_fail ?? 0,
    durationOf: 것?.duration_of ?? 0,
    avgDurationMs: 것?.avg_duration_ms ?? 0,
    maxDurationMs: 것?.max_duration_ms ?? 0,
  };
}

interface RawItem {
  history_id: string;
  tc_id: string;
  tc_name: string;
  platform: Platform;
  attempt: number;
  params: Record<string, unknown>;
  param_schema: Record<string, unknown>;
  status: ItemStatus;
  duration_ms: number | null;
  error: { message: string; stack?: string } | null;
  started_at: Date;
  finished_at: Date | null;
}

const ITEM_COLUMNS =
  'history_id, tc_id, tc_name, platform, attempt, params, param_schema, status, duration_ms, error, started_at, finished_at';

function toItem(row: RawItem): RunItemSummary {
  return {
    historyId: Number(row.history_id),
    tcId: row.tc_id,
    tcName: row.tc_name,
    platform: row.platform,
    attempt: row.attempt,
    params: row.params,
    paramSchema: row.param_schema,
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
  const rows = await pool.query<RawItem & { run_id: string; run_title: string; precondition: string[]; expected: Record<string, unknown>; expected_schema: Record<string, unknown> }>(
    `SELECT i.${ITEM_COLUMNS.split(', ').join(', i.')}, i.run_id, r.title AS run_title, i.precondition, i.expected,
            i.expected_schema
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
    expected: row.expected,
    expectedSchema: row.expected_schema,
    steps: steps.rows.map(toStep),
  };
}
