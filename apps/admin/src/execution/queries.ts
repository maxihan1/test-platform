// 실행 결과 조회 (SPEC §7 Execution 읽기 경로). 화면이 한 번 물으면 한 화면을 채울 수 있게 모아서 준다
//
// **실행 결과 목록에는 입력값과 라벨을 싣는다** (SPEC §8.3, 2026-09-19).
// §8.1 의 「JSON 원문을 목록에 노출하지 않는다」는 **케이스 목록 규칙**이고 여기에는 적용되지 않는다 —
// §8.3 이 「라벨과 값을 붙여 쓴 한 줄은 JSON 원문이 아니다」라고 명시했다.
// 화면은 `web/mask.ts` 가 라벨을 붙이고 비밀값을 가린 뒤 한 줄로 만든다.
// 안 실으면 화면이 항목마다 상세를 부르게 되고 그것이 §8.1 이 이름 붙여 금지한 N+1 이다

import type { ItemStatus, Platform, StepResult } from '@platform/kit';

import type { Pool } from 'pg';

import { 가린값들 } from '../web/mask.js';
import { runSummary, 거르는조건, 시나리오칸, type 시나리오실행줄, type 실행거르개, type 실행집계 } from './runSummary.js';

import { 종류조건 } from './runKind.js';
import { RUN_COLUMNS, toRun, to시나리오줄, type RawRun } from './runRow.js';
import type { RunItemDetail, RunItemSummary, RunSummary } from './runTypes.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const iso = (v: Date | null): string | null => (v === null ? null : v.toISOString());

// 접두사가 등록된 활성 서비스인지 본다. 배정 판정은 로그인이 붙을 때 이 함수 안이 바뀐다 (SPEC §3.5)
export async function serviceExists(prefix: string): Promise<boolean> {
  const pool = await db();
  const rows = await pool.query('SELECT 1 FROM service WHERE prefix = $1 AND is_active', [prefix]);
  return (rows.rowCount ?? 0) > 0;
}

type 실행목록<줄> = { items: 줄[]; total: number; page: number; pageSize: number; summary: 실행집계 };

export async function listRuns(
  service: string,
  page: number,
  pageSize: number,
  거르개?: 실행거르개 & { kind?: 'case' | 'ui' | 'fn' },
): Promise<실행목록<RunSummary>>;
export async function listRuns(
  service: string,
  page: number,
  pageSize: number,
  거르개: 실행거르개 & { kind: 'scenario' },
): Promise<실행목록<시나리오실행줄>>;
export async function listRuns(
  service: string,
  page: number,
  pageSize: number,
  거르개: 실행거르개,
): Promise<실행목록<RunSummary> | 실행목록<시나리오실행줄>>;
export async function listRuns(
  service: string,
  page: number,
  pageSize: number,
  거르개: 실행거르개 = {},
): Promise<실행목록<RunSummary> | 실행목록<시나리오실행줄>> {
  const pool = await db();
  const 시나리오 = 거르개.kind === 'scenario';
  const 조건 = 거르는조건(거르개, 4);
  // test_run.service_id 한 칸이 run_item 의 tc_id 접두사까지 따라가는 조인을 없앤다 (SPEC §6)
  //
  // count(*) OVER () 가 HAVING 뒤·LIMIT 앞에서 돈다. 그래서 거르개를 걸어도 총건수가
  // **걸린 뒤의 수**다 (2026-09-22 실측 — 감싸는 서브질의로 바꿔도 결과가 같았다).
  // 계획 검토가 「HAVING 이전을 센다」고 의심했는데 재 보니 그렇지 않았다
  const rows = await pool.query<Parameters<typeof to시나리오줄>[0]>(
    `SELECT ${RUN_COLUMNS}${시나리오 ? 시나리오칸 : ''}, count(*) OVER ()::int AS grand_total
       FROM test_run r
       LEFT JOIN run_item i USING (run_id)
      WHERE r.service_id = (SELECT id FROM service WHERE prefix = $3) ${조건.where}
      GROUP BY r.run_id
      ${조건.having}
      ORDER BY r.run_id DESC
      LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize, service, ...조건.값],
  );

  const 머리 = { total: rows.rows[0]?.grand_total ?? 0, page, pageSize, summary: await runSummary(service, 거르개) };
  return 시나리오 ? { items: rows.rows.map(to시나리오줄), ...머리 } : { items: rows.rows.map(toRun), ...머리 };
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
  unconfirmed: string | null;
}

const ITEM_COLUMNS =
  'history_id, tc_id, tc_name, platform, attempt, params, param_schema, status, duration_ms, error, started_at, finished_at, unconfirmed';

function toItem(row: RawItem): RunItemSummary {
  return {
    historyId: Number(row.history_id),
    tcId: row.tc_id,
    tcName: row.tc_name,
    platform: row.platform,
    attempt: row.attempt,
    params: 가린값들(row.params, row.param_schema),
    paramSchema: row.param_schema,
    status: row.status,
    durationMs: row.duration_ms,
    error: row.error,
    startedAt: row.started_at.toISOString(),
    finishedAt: iso(row.finished_at),
    unconfirmed: row.unconfirmed,
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
  // 시나리오 실행은 run_item 이 없어 케이스 모양이 비어 나온다. 번호가 맞아도 없는 실행으로 본다 (도메인/시나리오 §3.7 결정 10)
  const runs = await pool.query<RawRun>(
    `SELECT ${RUN_COLUMNS} FROM test_run r LEFT JOIN run_item i USING (run_id)
      WHERE r.run_id = $1 AND ${종류조건('case')} GROUP BY r.run_id`,
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
    expected: 가린값들(row.expected, row.expected_schema),
    expectedSchema: row.expected_schema,
    steps: steps.rows.map(toStep),
  };
}
