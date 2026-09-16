// 실행 묶음과 실행 항목을 만들고 결과를 되쓴다 (SPEC §3.2)
// params·expected·케이스명·사전조건은 전부 실행 시점의 스냅샷이다. param_set을 참조만 하면
// 나중에 값이 바뀌었을 때 과거 증적이 거짓이 된다

import type { ExecuteResponse, Platform, StepResult } from '@platform/kit';

import type { Pool } from 'pg';

export const DEFAULT_TIMEOUT_MS = 300_000;

// 사람이 읽을 자리에서는 PC·모바일로 쓴다. desktop·mobile은 코드와 러너 사이에서만 쓰는 이름이다
const PLATFORM_LABEL: Record<Platform, string> = { desktop: 'PC', mobile: '모바일' };

// 요청이 잘못된 것과 서버가 고장난 것을 라우트가 문자열로 가려내지 않게 한다
export class RunInputError extends Error {
  constructor(
    readonly code: 'CASE_NOT_FOUND' | 'INVALID_REQUEST',
    message: string,
  ) {
    super(message);
    this.name = 'RunInputError';
  }
}

export interface RunItemInput {
  tcId: string;
  platforms: Platform[];
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs?: number;
}

export interface CreateRunInput {
  title: string;
  triggeredBy: string;
  items: RunItemInput[];
}

// 디스패처가 러너를 부르는 데 필요한 것만 담는다 (SPEC §5.1 ExecuteRequest)
export interface PendingItem {
  historyId: number;
  tcId: string;
  platform: Platform;
  filePath: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs: number;
}

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. 풀은 실제로 쓸 때 가져온다 (catalog/store.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface CaseRow {
  tc_id: string;
  name: string;
  precondition: string[];
  file_path: string;
}

const INSERT_ITEM = `
  INSERT INTO run_item (run_id, tc_id, platform, tc_name, precondition, params, expected, status)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'NA')
  RETURNING history_id`;

export async function createRun(input: CreateRunInput): Promise<{ runId: number; items: PendingItem[] }> {
  if (input.items.length === 0) throw new RunInputError('INVALID_REQUEST', '실행할 케이스가 하나도 없다');
  if (input.title.trim() === '') throw new RunInputError('INVALID_REQUEST', '실행 제목이 비어 있다');

  // 같은 실행 안에서 케이스×환경은 한 행뿐이다(run_item의 UNIQUE). 조용히 버리면 뒤에 넣은 입력값이 사라진다
  const seen = new Set<string>();
  for (const item of input.items) {
    if (item.platforms.length === 0) throw new RunInputError('INVALID_REQUEST', `${item.tcId}에 실행할 환경이 없다`);
    for (const platform of item.platforms) {
      const key = `${item.tcId}/${platform}`;
      if (seen.has(key)) {
        throw new RunInputError('INVALID_REQUEST', `${item.tcId}의 ${PLATFORM_LABEL[platform]} 환경이 두 번 들어 있다`);
      }
      seen.add(key);
    }
  }

  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');

    // 케이스명·사전조건·파일 경로는 카탈로그가 채운 캐시에서 SQL로 읽는다. 카탈로그 코드를 import 하지 않는다
    const found = await client.query<CaseRow>(
      'SELECT tc_id, name, precondition, file_path FROM test_case WHERE tc_id = ANY($1::text[])',
      [input.items.map((i) => i.tcId)],
    );
    const cases = new Map(found.rows.map((r) => [r.tc_id, r]));
    const missing = input.items.filter((i) => !cases.has(i.tcId)).map((i) => i.tcId);
    if (missing.length > 0) throw new RunInputError('CASE_NOT_FOUND', `카탈로그에 없는 케이스다: ${missing.join(', ')}`);

    const run = await client.query<{ run_id: string }>(
      "INSERT INTO test_run (title, triggered_by, status) VALUES ($1, $2, 'RUNNING') RETURNING run_id",
      [input.title, input.triggeredBy],
    );
    const runId = Number(run.rows[0]!.run_id);

    const items: PendingItem[] = [];
    for (const item of input.items) {
      const spec = cases.get(item.tcId)!;
      for (const platform of item.platforms) {
        const row = await client.query<{ history_id: string }>(INSERT_ITEM, [
          runId,
          item.tcId,
          platform,
          spec.name,
          JSON.stringify(spec.precondition),
          JSON.stringify(item.params),
          JSON.stringify(item.expected),
        ]);
        items.push({
          historyId: Number(row.rows[0]!.history_id),
          tcId: item.tcId,
          platform,
          filePath: spec.file_path,
          params: item.params,
          expected: item.expected,
          timeoutMs: item.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        });
      }
    }

    await client.query('COMMIT');
    return { runId, items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const INSERT_STEP = `
  INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, line, screenshot_path, http_trace, error)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  ON CONFLICT (history_id, seq) DO NOTHING`;

function stepValues(historyId: number, step: StepResult): unknown[] {
  return [
    historyId,
    step.seq,
    step.title,
    step.status,
    step.durationMs,
    JSON.stringify(step.assertions),
    step.line ?? null,
    step.screenshotPath ?? null,
    step.httpTrace === undefined ? null : JSON.stringify(step.httpTrace),
    step.error === undefined ? null : JSON.stringify(step.error),
  ];
}

export async function finishItem(historyId: number, result: ExecuteResponse): Promise<void> {
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE run_item SET status = $2, duration_ms = $3, error = $4, finished_at = now() WHERE history_id = $1',
      [historyId, result.status, result.durationMs, result.error === undefined ? null : JSON.stringify(result.error)],
    );
    for (const step of result.steps) {
      await client.query(INSERT_STEP, stepValues(historyId, step));
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 모든 항목이 끝나야 FINISHED다 (SPEC §3.2). 그 조건을 SQL에 박아 부르는 쪽이 세지 않게 한다
export async function finishRun(runId: number): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE test_run SET status = 'FINISHED', finished_at = now()
      WHERE run_id = $1
        AND status = 'RUNNING'
        AND NOT EXISTS (SELECT 1 FROM run_item WHERE run_id = $1 AND finished_at IS NULL)`,
    [runId],
  );
}
