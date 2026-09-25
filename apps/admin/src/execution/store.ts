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
    readonly code:
      | 'CASE_NOT_FOUND'
      | 'INVALID_REQUEST'
      | 'MIXED_SERVICE'
      | 'ENV_NOT_FOUND'
      | 'SERVICE_FORBIDDEN'
      | 'TOO_MANY_ITEMS',
    message: string,
    // TOO_MANY_ITEMS 는 응답에 상한과 요청 건수를 같이 싣는다 (SPEC §8.2)
    readonly detail: { limit: number; requested: number } | undefined = undefined,
  ) {
    super(message);
    this.name = 'RunInputError';
  }
}

// 한 번에 만들어질 실행 항목의 상한. 설정값으로 빼지 않는다 — 설정이 늘면 「어느 값이었더라」가 는다.
// 숫자를 바꾸려면 SPEC §8.2 를 먼저 고친다
export const MAX_ITEMS = 1000;

export interface RunItemInput {
  tcId: string;
  platforms: Platform[];
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs?: number;
}

export interface CreateRunInput {
  title: string;
  // 로그인한 사람의 아이디. 요청 본문이 아니라 문(auth/gate.ts)이 실어 준 값에서 온다 (SPEC §3.5)
  triggeredBy: string;
  // 실행 당시의 사람 이름을 박제한다. 계정 이름이 바뀌거나 지워져도 과거 증적은 흔들리지 않는다.
  // 비어 있으면 인증 도입 이전 행이라는 표시다 (SPEC §3.5 · §6 · §8.6)
  triggeredByName?: string;
  // 대상 서버 키. 기본값을 두지 않는다 — 안 채우면 빈 칸이 아니라 틀린 값이 남는다 (SPEC §6)
  env: string;
  // 회차 수. 요청 최상위에 하나다 — 항목마다 다르면 「실행 항목이 N건 생깁니다」를 셀 수 없다 (SPEC §8.2)
  repeat?: number;
  // 끝났을 때 Slack 으로 알릴지. 기본은 꺼짐이고 정기 실행만 늘 켠다 (SPEC §8.9)
  notifySlack?: boolean;
  items: RunItemInput[];
}

// 디스패처가 러너를 부르는 데 필요한 것만 담는다 (SPEC §5.1 ExecuteRequest)
export interface PendingItem {
  historyId: number;
  tcId: string;
  platform: Platform;
  filePath: string;
  // 이번 실행이 두드릴 주소. 요청이 싣지 않고 서버가 service_env에서 찾는다 (SPEC §6 · §7)
  baseUrl: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs: number;
}

// tcId 접두사가 곧 서비스다. 요청이 서비스를 따로 싣게 두면 번호와 서비스가 어긋날 수 있다 (SPEC §7)
export function prefixOf(tcId: string): string {
  return tcId.split('-')[0] ?? '';
}

interface ServiceRow {
  id: string;
  name: string;
  tests_repo: string;
  base_url: string | null;
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
  param_schema: Record<string, unknown>;
  expected_schema: Record<string, unknown>;
  unconfirmed: string | null;
}

// 라벨·제한 시간·파일 경로도 실행 시점 값으로 박제한다. 카탈로그는 스캔 때마다 덮어쓰는 캐시라
// 나중에 읽으면 그날 무엇으로 돌렸는지가 달라진다 (SPEC §3.3 · §6)
const INSERT_ITEM = `
  INSERT INTO run_item (run_id, tc_id, platform, tc_name, precondition, params, expected, status,
                        file_path, param_schema, expected_schema, timeout_ms, attempt, unconfirmed)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'NA', $8, $9, $10, $11, $12, $13)
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

  // 한 실행은 한 서비스다. 그래야 증적 머리말의 서비스 이름이 실행 전체를 대표한다 (SPEC §7)
  const prefixes = [...new Set(input.items.map((i) => prefixOf(i.tcId)))];
  if (prefixes.length > 1) {
    throw new RunInputError('MIXED_SERVICE', `한 실행에 서비스가 섞여 있다: ${prefixes.join(', ')}`);
  }
  const prefix = prefixes[0] ?? '';
  if (input.env.trim() === '') throw new RunInputError('INVALID_REQUEST', '대상 서버를 고르지 않았다');

  const repeat = input.repeat ?? 1;
  if (!Number.isInteger(repeat) || repeat < 1) {
    throw new RunInputError('INVALID_REQUEST', '반복 횟수는 1 이상의 정수여야 한다');
  }

  // 막는 것은 repeat 가 아니라 만들어질 건수다. 그래야 케이스 수가 늘어도 같이 보호된다 (SPEC §8.2).
  // 동시 실행 2 는 돌아가는 프로세스 수를 막지 INSERT 건수를 막지 않는다
  const requested = input.items.reduce((n, i) => n + i.platforms.length, 0) * repeat;
  if (requested > MAX_ITEMS) {
    throw new RunInputError(
      'TOO_MANY_ITEMS',
      `한 번에 ${MAX_ITEMS}건까지 만들 수 있는데 ${requested}건을 요청했다`,
      { limit: MAX_ITEMS, requested },
    );
  }

  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');

    // 서비스와 대상 주소는 표에서 찾는다. 요청이 주소를 싣게 두면 아무 데나 쏠 수 있다 (SPEC §6)
    const service = await client.query<ServiceRow>(
      `SELECT s.id, s.name, s.tests_repo, e.base_url
         FROM service s
         LEFT JOIN service_env e ON e.service_id = s.id AND e.env = $2
        WHERE s.prefix = $1 AND s.is_active`,
      [prefix, input.env],
    );
    const found서비스 = service.rows[0];
    if (found서비스 === undefined) {
      throw new RunInputError('SERVICE_FORBIDDEN', `${prefix} 서비스를 찾을 수 없다`);
    }
    if (found서비스.base_url === null) {
      throw new RunInputError('ENV_NOT_FOUND', `${prefix} 서비스에 ${input.env} 대상 서버가 없다`);
    }

    // 케이스명·사전조건·파일 경로는 카탈로그가 채운 캐시에서 SQL로 읽는다. 카탈로그 코드를 import 하지 않는다.
    // 미확정 사유도 여기서 박제한다 — 케이스가 나중에 확정돼도 그날의 집계가 바뀌면 안 된다 (SPEC 실행 §3.2)
    const found = await client.query<CaseRow>(
      'SELECT tc_id, name, precondition, file_path, param_schema, expected_schema, unconfirmed FROM test_case WHERE tc_id = ANY($1::text[])',
      [input.items.map((i) => i.tcId)],
    );
    const cases = new Map(found.rows.map((r) => [r.tc_id, r]));
    const missing = input.items.filter((i) => !cases.has(i.tcId)).map((i) => i.tcId);
    if (missing.length > 0) throw new RunInputError('CASE_NOT_FOUND', `카탈로그에 없는 케이스다: ${missing.join(', ')}`);

    // 서비스 이름·저장소·대상 주소는 실행 하나에 하나뿐인 사실이라 test_run에 박제한다 (SPEC §6)
    const run = await client.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, service_id, service_name, tests_repo, base_url, notify_slack)
       VALUES ($1, $2, $3, 'RUNNING', $4, $5, $6, $7, $8, $9) RETURNING run_id`,
      [
        input.title,
        input.triggeredBy,
        // NULL 이면 「실행자 미상 (인증 도입 이전)」으로 읽힌다. 모르는 것은 모른다고 적는다 (SPEC §8.6)
        input.triggeredByName ?? null,
        input.env,
        found서비스.id,
        found서비스.name,
        found서비스.tests_repo,
        found서비스.base_url,
        input.notifySlack ?? false,
      ],
    );
    const runId = Number(run.rows[0]!.run_id);

    const items: PendingItem[] = [];
    for (const item of input.items) {
      const spec = cases.get(item.tcId)!;
      const timeoutMs = item.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      for (const platform of item.platforms) {
        // 회차는 1부터다. 러너에는 보이지 않는다 — historyId 만 다른 같은 요청을 N번 보낼 뿐이다 (SPEC §5.2)
        for (let attempt = 1; attempt <= repeat; attempt += 1) {
          const row = await client.query<{ history_id: string }>(INSERT_ITEM, [
            runId,
            item.tcId,
            platform,
            spec.name,
            JSON.stringify(spec.precondition),
            JSON.stringify(item.params),
            JSON.stringify(item.expected),
            spec.file_path,
            JSON.stringify(spec.param_schema),
            JSON.stringify(spec.expected_schema),
            timeoutMs,
            attempt,
            spec.unconfirmed,
          ]);
          items.push({
            historyId: Number(row.rows[0]!.history_id),
            tcId: item.tcId,
            platform,
            filePath: spec.file_path,
            baseUrl: found서비스.base_url,
            params: item.params,
            expected: item.expected,
            timeoutMs,
          });
        }
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
    // 아래 CLOSE_UNFINISHED와 같은 규칙이다 — 닫는 UPDATE에는 언제나 AND finished_at IS NULL 을 붙인다.
    // 사람이 멈춘 직후에는 그 항목의 러너 호출이 이미 나가 있어 응답이 뒤늦게 도착한다
    const closed = await client.query(
      'UPDATE run_item SET status = $2, duration_ms = $3, error = $4, finished_at = now() WHERE history_id = $1 AND finished_at IS NULL',
      [historyId, result.status, result.durationMs, result.error === undefined ? null : JSON.stringify(result.error)],
    );
    if (closed.rowCount === 0) {
      // 먼저 닫힌 쪽이 이긴다. 절차 기록도 넣지 않는다 — 묶음은 ABORTED인데 절차만 PASS로 쌓이면 증적이 어긋난다
      await client.query('ROLLBACK');
      return;
    }
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
// 닫는 UPDATE에는 언제나 AND finished_at IS NULL 을 붙인다. 중단 처리와 러너 응답이 겹칠 수 있고,
// 조건이 없으면 나중에 온 쪽이 먼저 기록된 판정을 덮어쓴다 (SPEC §7.1)
const CLOSE_UNFINISHED = `
  UPDATE run_item
     SET status = 'NA', finished_at = now(), duration_ms = COALESCE(duration_ms, 0),
         error = jsonb_build_object('message', $2::text)
   WHERE run_id = $1 AND finished_at IS NULL`;

export interface AbortResult {
  aborted: number;
}

// 이미 끝났거나 이미 멈춘 실행은 다시 멈출 수 없다. 그 사실을 부르는 쪽이 409로 알린다 (SPEC §7)
export async function abortRun(runId: number): Promise<AbortResult | null> {
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');

    const run = await client.query<{ status: string }>(
      "SELECT status FROM test_run WHERE run_id = $1 FOR UPDATE",
      [runId],
    );
    if (run.rows[0]?.status !== 'RUNNING') {
      await client.query('ROLLBACK');
      return null;
    }

    const closed = await client.query(CLOSE_UNFINISHED, [runId, 'ABORTED']);
    // 끝까지 돌아서 끝난 것과 사람이 끊어서 끝난 것은 증적에서 구분돼야 한다 (SPEC §3.2)
    await client.query("UPDATE test_run SET status = 'ABORTED', finished_at = now() WHERE run_id = $1", [runId]);

    await client.query('COMMIT');
    return { aborted: closed.rowCount ?? 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 아직 끝나지 않은 항목의 historyId. 러너에 끊어 달라고 할 대상이다 (SPEC §5.2).
// 대기 중인지 도는 중인지 DB로는 갈리지 않으므로 전부에 보낸다 — 러너가 모르는 것은 false를 돌려준다
export async function unfinishedItems(runId: number): Promise<number[]> {
  const pool = await db();
  const rows = await pool.query<{ history_id: string }>(
    'SELECT history_id FROM run_item WHERE run_id = $1 AND finished_at IS NULL',
    [runId],
  );
  return rows.rows.map((r) => Number(r.history_id));
}

// 재기동으로 분배기가 사라지면 그 항목들은 영원히 끝나지 않아 FINISHED 조건이 결코 만족되지 않는다.
// 부팅 직후 한 번 닫는다 (SPEC §3.2)
export async function recoverRunning(): Promise<number> {
  const pool = await db();
  const running = await pool.query<{ run_id: string }>("SELECT run_id FROM test_run WHERE status = 'RUNNING'");
  for (const row of running.rows) {
    await pool.query(CLOSE_UNFINISHED, [Number(row.run_id), 'ABORTED']);
    await pool.query("UPDATE test_run SET status = 'ABORTED', finished_at = now() WHERE run_id = $1", [
      Number(row.run_id),
    ]);
  }
  return running.rowCount ?? 0;
}

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
