// 항목이 닫힌 뒤 trace.zip 을 풀어 가린 네트워크 · 조작 · 콘솔을 DB 에 넣는다 (SPEC 도메인/실행 §3.2 「trace」)
// 실행을 늦추지 않게 따로, 메모리를 아끼게 한 번에 하나씩 푼다. 다 풀면 통과 항목 zip 은 지우고 실패 항목 zip 은 에이전트 참고용으로 둔다

import { access, readdir, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Pool } from 'pg';

import { 케이스지도를넣는다, 지도줄들 } from '../prd/apiMap.js';
import { 가려야하나 } from '../web/mask.js';
import { 가린다, 항목비밀 } from './trial.js';
import { trace를푼다, type 풀린trace } from './traceParse.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const 가림 = '********';
const 본문상한 = 2000;

// kit 의 runDir 과 같은 자리다 — 리포터가 이 자리에 옮긴다. kit 의 값을 import 하면 @playwright/test 가 서버에 딸려 와
// 한 벌 더 두고 traceIngest.test.ts 가 같은지 지킨다
const 실행폴더 = (): string => resolve(process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts'), 'runs');

export function trace경로(runId: number, historyId: number): string {
  return resolve(실행폴더(), String(runId), String(historyId), 'trace.zip');
}

// 비밀 칸 이름에 붙은 값. 주소 물음표 뒤 · 폼 본문 · JSON 본문 · 콘솔 글이 다 이 둘 중 하나다. 이름에 대괄호(user[password])도 온다.
// 이름 판정은 화면 가림과 같은 함수에, 네트워크에만 나오는 이름(인증 머리 · 세션 · 쿠키 · api_key)을 더한다 (공통/2 §4.1)
const 이름값 = /([A-Za-z_][\w.\-[\]]*)=([^&\s"']*)/g;
const 제이슨값 = /"([^"\\]+)"(\s*:\s*)("(?:[^"\\]|\\.)*"|[^,}\]\s]+)/g;

const 네트워크비밀 = /authori[sz]ation|session|cookie|api[_-]?key|access[_-]?key|private[_-]?key/i;
const 인증값 = /\b(Bearer|Basic)\s+[\w.~+/-]+=*/g;
const 비밀이름 = (이름: string): boolean => 가려야하나(이름, {}) || 네트워크비밀.test(이름);

/** 실행 값 목록(항목비밀)을 먼저, 그다음 비밀 칸 이름에 붙은 값 · 인증 머리 꼴 값을 가린다 */
export function 글가린다(글: string, 비밀: string[]): string {
  return (가린다(글, 비밀) as string)
    .replace(이름값, (원래, 이름: string) => (비밀이름(이름) ? `${이름}=${가림}` : 원래))
    .replace(제이슨값, (원래, 이름: string, 사이: string) => (비밀이름(이름) ? `"${이름}"${사이}"${가림}"` : 원래))
    .replace(인증값, (_원래, 꼴: string) => `${꼴} ${가림}`);
}

// 가린 뒤에 자른다 — 먼저 자르면 잘린 자리에 걸친 비밀값 조각이 가림 무늬에 안 걸린다
const 본문 = (v: string | null, 비밀: string[]): string | null => (v === null ? null : 글가린다(v, 비밀).slice(0, 본문상한));
const 있으면 = (v: string | null, 비밀: string[]): string | null => (v === null ? null : 글가린다(v, 비밀));

export function trace가린다(풀림: 풀린trace, 비밀: string[]): 풀린trace {
  return {
    network: 풀림.network.map((n) => ({
      ...n,
      url: 글가린다(n.url, 비밀),
      failure: 있으면(n.failure, 비밀),
      requestBody: 본문(n.requestBody, 비밀),
      responseBody: 본문(n.responseBody, 비밀),
    })),
    actions: 풀림.actions.map((a) => {
      // Playwright 는 넣은 값을 이름의 따옴표 안에도 붙인다(「Fill "…"」 · 「Type "…"」). 그 자리만 바꾼다 — 짧은 값을 통째로 바꾸면 locator 글자까지 깨진다
      const 값 = a.value === null ? null : a.secretField ? 가림 : 글가린다(a.value, 비밀);
      const 이름 = a.value !== null && 값 !== null ? a.title.replace(`"${a.value}"`, `"${값}"`) : a.title;
      return { ...a, title: 글가린다(이름, 비밀), target: 있으면(a.target, 비밀), value: 값, error: 있으면(a.error, 비밀) };
    }),
    console: 풀림.console.map((c) => ({ ...c, text: 글가린다(c.text, 비밀), url: 있으면(c.url, 비밀) })),
  };
}

type 상태 = 'DONE' | 'NONE' | 'FAILED';

async function 상태를남긴다(pool: Pool, historyId: number, status: 상태, reason: string | null): Promise<void> {
  await pool.query(
    `INSERT INTO run_trace (history_id, status, reason) VALUES ($1, $2, $3)
     ON CONFLICT (history_id) DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason, loaded_at = now()`,
    [historyId, status, reason],
  );
}

const 차례붙임 = <T>(줄: T[]): (T & { ord: number })[] => 줄.map((l, i) => ({ ...l, ord: i + 1 }));

// 지도를 채울 자리 — 서비스 · 케이스 · 실행 · 그날 친 주소(같은 사이트를 가른다). 서비스 통합 전 실행은 서비스가 없어 안 채운다
interface 지도자리 { serviceId: number; tcId: string; runId: number; baseUrl: string }

async function 기록을넣는다(pool: Pool, historyId: number, 풀림: 풀린trace, 지도: 지도자리 | null): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 같은 항목을 다시 풀어도 줄이 늘지 않게 갈아 끼운다
    for (const 표 of ['run_network', 'run_action', 'run_console']) await client.query(`DELETE FROM ${표} WHERE history_id = $1`, [historyId]);
    await client.query(
      `INSERT INTO run_network (history_id, ord, seq, at_ms, method, url, status, resource_type, duration_ms, failure, request_body, response_body)
       SELECT $1, x.ord, x.seq, x."atMs", x.method, x.url, x.status, x."resourceType", x."durationMs", x.failure, x."requestBody", x."responseBody"
         FROM json_to_recordset($2) AS x(ord int, seq int, "atMs" int, method text, url text, status int, "resourceType" text,
                                          "durationMs" int, failure text, "requestBody" text, "responseBody" text)`,
      [historyId, JSON.stringify(차례붙임(풀림.network))],
    );
    await client.query(
      `INSERT INTO run_action (history_id, ord, seq, at_ms, title, target, value, duration_ms, error)
       SELECT $1, x.ord, x.seq, x."atMs", x.title, x.target, x.value, x."durationMs", x.error
         FROM json_to_recordset($2) AS x(ord int, seq int, "atMs" int, title text, target text, value text, "durationMs" int, error text)`,
      [historyId, JSON.stringify(차례붙임(풀림.actions))],
    );
    await client.query(
      `INSERT INTO run_console (history_id, ord, seq, at_ms, level, text, url)
       SELECT $1, x.ord, x.seq, x."atMs", x.level, x.text, x.url
         FROM json_to_recordset($2) AS x(ord int, seq int, "atMs" int, level text, text text, url text)`,
      [historyId, JSON.stringify(차례붙임(풀림.console))],
    );
    // 서비스 지도도 같은 묶음 안에서 — 기록과 지도가 어긋나지 않게 (도메인/작성 §3.6 「서비스 지도」)
    if (지도 !== null) await 케이스지도를넣는다(client, 지도.serviceId, 지도.tcId, 지도.runId, 지도줄들(풀림.network, 지도.baseUrl));
    await client.query(
      `INSERT INTO run_trace (history_id, status, reason) VALUES ($1, 'DONE', NULL)
       ON CONFLICT (history_id) DO UPDATE SET status = 'DONE', reason = NULL, loaded_at = now()`,
      [historyId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

interface 항목행 {
  run_id: string;
  tc_id: string;
  service_id: string | null;
  base_url: string;
  status: string;
  platform: string;
  params: unknown;
  expected: unknown;
  param_schema: unknown;
  expected_schema: unknown;
  error: { message?: unknown } | null;
}

/** 닫힌 항목 하나의 trace 를 푼다. 닫히지 않았거나 없는 항목이면 null */
export async function trace를적재한다(historyId: number): Promise<상태 | null> {
  const pool = await db();
  const r = await pool.query<항목행>(
    `SELECT i.run_id, i.tc_id, r.service_id, r.base_url, i.status, i.platform, i.params, i.expected, i.param_schema, i.expected_schema, i.error
       FROM run_item i JOIN test_run r ON r.run_id = i.run_id WHERE i.history_id = $1 AND i.finished_at IS NOT NULL`,
    [historyId],
  );
  const row = r.rows[0];
  if (row === undefined) return null;
  const 끊김 = typeof row.error?.message === 'string' && ['TIMEOUT', 'ABORTED'].includes(row.error.message);

  if (row.platform === 'android') {
    await 상태를남긴다(pool, historyId, 'NONE', 'Android 앱 실행은 trace 가 없다');
    return 'NONE';
  }
  const 경로 = trace경로(Number(row.run_id), historyId);
  let zip: Buffer;
  try {
    zip = await readFile(경로);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    // 러너가 자식을 끊으면 리포터가 옮길 틈이 없다. 그 밖은 다른 기계의 러너(공유 폴더 없음)이거나 리포터가 옮기다 실패한 것이다 (실행 §3.2 「trace」)
    const 사유 = 끊김
      ? '러너가 실행을 끊어(제한 시간 · 멈춤) trace 가 남지 않았다'
      : '러너가 trace 파일을 남기지 않았다 — 다른 기계의 러너이거나 옮기다 실패했다';
    await 상태를남긴다(pool, historyId, 'NONE', 사유);
    return 'NONE';
  }

  // 통과 항목은 본문을 안 남긴다. 실패를 가르는 데만 쓰는 값이다
  const 통과 = row.status === 'PASS';
  try {
    const 풀림 = await trace를푼다(zip, { 본문: !통과 });
    const 지도 = row.service_id === null ? null : { serviceId: Number(row.service_id), tcId: row.tc_id, runId: Number(row.run_id), baseUrl: row.base_url };
    await 기록을넣는다(pool, historyId, trace가린다(풀림, 항목비밀(row)), 지도);
  } catch (err) {
    // zip 은 남긴다 — 사람이 서버에서 직접 열어 볼 수 있다
    await 상태를남긴다(pool, historyId, 'FAILED', `trace 를 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    return 'FAILED';
  }
  if (통과) {
    await unlink(경로).catch((err: unknown) => {
      console.warn(`[execution] 통과 항목 ${historyId} 의 trace 를 지우지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
  return 'DONE';
}

// 한 번에 하나. 앞 일이 깨져도 줄은 계속 돈다
let 줄: Promise<unknown> = Promise.resolve();

export function trace적재를맡긴다(historyId: number): Promise<void> {
  const 일 = 줄.then(() => trace를적재한다(historyId)).then(
    () => undefined,
    (err: unknown) => {
      console.error(`[execution] 항목 ${historyId} 의 trace 를 적재하지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    },
  );
  줄 = 일;
  return 일;
}

/**
 * 서버가 다시 켜지면 상태 줄이 없는 zip 을 다시 푼다. 풀기 전에 꺼졌거나 줄에 남아 있던 것이다.
 * 통과 zip 은 풀자마자 지우고 실패 zip 은 상태 줄이 있으니, 상태 줄 없는 zip 이 곧 못 푼 것이다
 */
export async function 밀린trace를푼다(): Promise<number> {
  const root = 실행폴더();
  const 숫자 = /^[1-9]\d*$/;
  const 후보: number[] = [];
  // 시나리오(scenario) · 시험 실행(trial) 폴더는 숫자가 아니라 건너뛴다
  for (const run of await readdir(root).catch(() => [] as string[])) {
    if (!숫자.test(run)) continue;
    for (const history of await readdir(resolve(root, run)).catch(() => [] as string[])) {
      if (!숫자.test(history)) continue;
      const 있나 = await access(trace경로(Number(run), Number(history))).then(() => true, () => false);
      if (있나) 후보.push(Number(history));
    }
  }
  if (후보.length === 0) return 0;
  const pool = await db();
  const r = await pool.query<{ history_id: string }>(
    `SELECT i.history_id FROM run_item i
      WHERE i.history_id = ANY($1::bigint[]) AND i.finished_at IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM run_trace t WHERE t.history_id = i.history_id)
      ORDER BY i.history_id`,
    [후보],
  );
  for (const row of r.rows) void trace적재를맡긴다(Number(row.history_id));
  return r.rows.length;
}

export interface trace기록 {
  status: 상태;
  reason: string | null;
  network: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  console: Record<string, unknown>[];
}

/** 항목 상세에 싣는 세 기록. 상태 줄이 없으면 null — 아직 안 풀었거나 이 기능 전의 항목이다 */
export async function trace기록을읽는다(historyId: number): Promise<trace기록 | null> {
  const pool = await db();
  const 상태줄 = await pool.query<{ status: 상태; reason: string | null }>('SELECT status, reason FROM run_trace WHERE history_id = $1', [historyId]);
  const 머리 = 상태줄.rows[0];
  if (머리 === undefined) return null;
  const 읽기 = async (표: string, 칸: string): Promise<Record<string, unknown>[]> =>
    (await pool.query(`SELECT ${칸} FROM ${표} WHERE history_id = $1 ORDER BY ord`, [historyId])).rows;
  const [network, actions, console] = await Promise.all([
    읽기(
      'run_network',
      `seq, at_ms AS "atMs", method, url, status, resource_type AS "resourceType", duration_ms AS "durationMs", failure,
       request_body AS "requestBody", response_body AS "responseBody"`,
    ),
    읽기('run_action', 'seq, at_ms AS "atMs", title, target, value, duration_ms AS "durationMs", error'),
    읽기('run_console', 'seq, at_ms AS "atMs", level, text, url'),
  ]);
  return { ...머리, network, actions, console };
}
