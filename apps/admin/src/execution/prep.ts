// 실행 전 테스트 데이터 준비 — 준비 주소를 한 번 부르고, 준비 주소가 같은 실행끼리 하나씩 돌린다 (도메인/실행 §3.2 「실행 전 준비」)

import type { Pool } from 'pg';

import { 쓰는접두사 } from '../scenario/mixed.js';
import { 준비읽기, type 준비 } from '../settings/prep.js';

import { 글가린다 } from './traceIngest.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 앞뒤 공백과 끝의 `/` 를 뗀 글자가 열쇠다 — `https://x/prep` 와 `https://x/prep/` 는 같은 데이터를 되돌린다 */
export const 준비열쇠 = (url: string): string => url.trim().replace(/\/+$/, '');

// ponytail: 관리 서버 메모리 잠금이다. 관리 서버를 여러 대 띄우면 DB advisory lock 으로 옮긴다
const 꼬리들 = new Map<string, Promise<void>>();

const 끊길때 = (끊김: AbortSignal): Promise<void> =>
  new Promise((끝) => (끊김.aborted ? 끝() : 끊김.addEventListener('abort', () => 끝(), { once: true })));

/**
 * 열쇠들의 차례를 먼저 온 차례로 기다린다. 열쇠는 글자 차례로 잡는다 — 두 실행이 서로를 기다리며 멈추지 않게.
 * 끊기면 기다리기를 그만두고 잡음 false 다. 어느 쪽이든 놓기를 꼭 불러야 뒤 실행이 돈다
 */
export async function 차례를잡는다(열쇠들: readonly string[], 끊김: AbortSignal): Promise<{ 잡음: boolean; 놓기: () => void }> {
  const 놓기들: (() => void)[] = [];
  const 놓기 = (): void => {
    for (const 놓 of 놓기들) 놓();
  };
  for (const 열쇠 of [...new Set(열쇠들)].sort()) {
    if (끊김.aborted) return { 잡음: false, 놓기 };
    const 앞 = 꼬리들.get(열쇠) ?? Promise.resolve();
    let 놓!: () => void;
    const 내것 = new Promise<void>((끝) => (놓 = 끝));
    // 앞 실행이 끝나고 내가 놓아야 다음이 돈다. 내가 끊겨 먼저 놓아도 다음은 앞 실행을 기다린다 — 차례가 안 깨진다
    const 꼬리 = 앞.then(() => 내것);
    꼬리들.set(열쇠, 꼬리);
    void 꼬리.then(() => {
      if (꼬리들.get(열쇠) === 꼬리) 꼬리들.delete(열쇠);
    });
    놓기들.push(놓);
    await Promise.race([앞, 끊길때(끊김)]);
  }
  return { 잡음: !끊김.aborted, 놓기 };
}

export type 준비답 = { ok: true } | { ok: false; 끊김: true } | { ok: false; 끊김: false; note: string };

/** 실패 까닭은 300자까지 — 가린 뒤에 자른다. 먼저 자르면 잘린 자리에 걸친 비밀값 조각이 가림 무늬에 안 걸린다 */
const 까닭 = (글: string, 준비: 준비): string => 글가린다(글, [준비.value]).slice(0, 300);

/** POST 한 번. 2xx 면 성공이고 본문은 안 읽는다. 다른 곳으로 넘기는 응답(3xx)은 따라가지 않는다 — 비밀 헤더가 다른 주인에게 간다 */
export async function 준비를부른다(준비: 준비, 본문: object, 끊김: AbortSignal): Promise<준비답> {
  const 한도 = AbortSignal.timeout(준비.timeoutSec * 1000);
  try {
    const res = await fetch(준비.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [준비.header]: 준비.value },
      body: JSON.stringify(본문),
      redirect: 'manual',
      signal: AbortSignal.any([끊김, 한도]),
    });
    if (res.ok) {
      await res.body?.cancel();
      return { ok: true };
    }
    const 글 = await res.text().catch(() => '');
    return { ok: false, 끊김: false, note: 까닭(`HTTP ${String(res.status)} · ${글}`, 준비) };
  } catch (err) {
    if (끊김.aborted) return { ok: false, 끊김: true };
    if (한도.aborted) return { ok: false, 끊김: false, note: `시간 초과 ${String(준비.timeoutSec)}초` };
    const e = err instanceof Error ? err : new Error(String(err));
    const 원인 = e.cause instanceof Error ? ` (${e.cause.message})` : '';
    return { ok: false, 끊김: false, note: 까닭(`연결 오류 · ${e.message}${원인}`, 준비) };
  }
}

export interface 부를준비 {
  열쇠: string;
  준비: 준비;
  service: string;
}

/**
 * 이 실행이 부를 준비 주소들 — 케이스 실행은 그 애플리케이션 줄 하나, 시나리오 실행은 부품이 쓰는 애플리케이션마다 같은 env 줄.
 * 열쇠가 같으면 한 번만 부른다. service 는 그 주소를 가진 애플리케이션 접두사(실행의 애플리케이션이 있으면 그것)다
 */
export async function 부를준비들(runId: number): Promise<{ 준비들: 부를준비[]; env: string; origin: string }> {
  const pool = await db();
  const r = await pool.query<{ kind: string; env: string; origin: string; prefix: string }>(
    'SELECT r.kind, r.env, r.origin, s.prefix FROM test_run r JOIN service s ON s.id = r.service_id WHERE r.run_id = $1',
    [runId],
  );
  const 행 = r.rows[0];
  if (행 === undefined) return { 준비들: [], env: '', origin: '' };
  const 시나리오 = 행.kind === 'SCENARIO';
  const 접두사들 = 시나리오
    ? 쓰는접두사((await pool.query<{ part: Parameters<typeof 쓰는접두사>[0][number] }>('SELECT part FROM scenario_run_part WHERE run_id = $1', [runId])).rows.map((p) => p.part), 행.prefix)
    : [행.prefix];
  const 줄 = await pool.query<{ prefix: string; prep: unknown }>(
    `SELECT s.prefix, e.prep FROM service s JOIN service_env e ON e.service_id = s.id AND e.env = $2
      WHERE s.prefix = ANY($1::text[]) AND e.prep IS NOT NULL ORDER BY s.prefix`,
    [접두사들, 행.env],
  );
  const 모음 = new Map<string, 부를준비>();
  for (const x of 줄.rows) {
    const 준비 = 준비읽기(x.prep);
    if (준비 === null) continue;
    const 열쇠 = 준비열쇠(준비.url);
    if (!모음.has(열쇠) || x.prefix === 행.prefix) 모음.set(열쇠, { 열쇠, 준비, service: x.prefix });
  }
  return { 준비들: [...모음.values()], env: 행.env, origin: 시나리오 ? 'SCENARIO' : 행.origin };
}

/**
 * 준비 실패로 닫는다 — RUNNING 일 때만이라 멈추기가 먼저 닫은 실행을 덮지 않는다. 한 문장이라 실행 · 항목이 같이 닫힌다.
 * 케이스 항목은 NA · PREP_FAILED, 시나리오 부품은 안 돈 것(NA · NOT_RUN) — 머리가 PREP_FAILED 다 (도메인/시나리오 §3.7 결정 9 표)
 */
export async function 준비실패로닫는다(runId: number, note: string): Promise<boolean> {
  const r = await (await db()).query<{ n: number }>(
    `WITH r AS (
       UPDATE test_run SET status = 'PREP_FAILED', finished_at = now(), prep_note = $2
        WHERE run_id = $1 AND status = 'RUNNING' RETURNING run_id),
     i AS (
       UPDATE run_item SET status = 'NA', finished_at = now(), duration_ms = COALESCE(duration_ms, 0),
              error = jsonb_build_object('message', 'PREP_FAILED')
        WHERE run_id IN (SELECT run_id FROM r) AND finished_at IS NULL),
     p AS (
       UPDATE scenario_run_part SET status = 'NA', finished_at = now(), duration_ms = COALESCE(duration_ms, 0),
              error = jsonb_build_object('message', 'NOT_RUN')
        WHERE run_id IN (SELECT run_id FROM r) AND finished_at IS NULL)
     SELECT count(*)::int AS n FROM r`,
    [runId, note],
  );
  return (r.rows[0]?.n ?? 0) > 0;
}

// 준비를 기다리거나 부르는 중인 실행. 멈추기가 이것을 끊는다
const 도는준비 = new Map<number, AbortController>();

/** 멈추기가 부른다. 잠금을 기다리는 중이면 준비를 안 부르고, 준비 요청이 가는 중이면 끊는다 */
export function 준비를끊는다(runId: number): void {
  도는준비.get(runId)?.abort();
}

export type 준비결과 = { 결과: '돎' } | { 결과: '멈춤' } | { 결과: '실패'; note: string };

/**
 * 준비 주소마다 차례를 잡고 한 번씩 부른 뒤, 다 성공하면 그 잠금 안에서 돌리기를 부른다 — 잠금은 모든 항목이 끝날 때까지 쥔다.
 * 준비 주소가 없으면 잠금 없이 바로 돌린다. 하나라도 실패하면 돌리지 않고 까닭을 돌려준다 — 닫는 것은 부르는 쪽이다.
 * 멈췄나는 등록 전에 온 멈추기를 잡는다(dispatch 가 막 시작했을 때 누른 멈춤)
 */
export async function 준비하고돌린다(runId: number, 멈췄나: () => boolean, 돌리기: () => Promise<void>): Promise<준비결과> {
  let 읽은것: Awaited<ReturnType<typeof 부를준비들>>;
  try {
    읽은것 = await 부를준비들(runId);
  } catch (err) {
    // 준비 주소를 못 읽었다 — 데이터가 처음 상태인지 모르니 돌리지 않는다. 돌리기에서 난 오류는 잡지 않고 부르는 쪽으로 간다
    const 글 = err instanceof Error ? err.message : String(err);
    console.error(`[execution] 실행 ${runId}의 준비 주소를 읽지 못했다: ${글}`);
    return { 결과: '실패', note: `준비 주소를 읽지 못했습니다 · ${글.slice(0, 200)}` };
  }
  const { 준비들, env, origin } = 읽은것;
  if (준비들.length === 0) {
    await 돌리기();
    return { 결과: '돎' };
  }
  const 끊개 = new AbortController();
  도는준비.set(runId, 끊개);
  if (멈췄나()) 끊개.abort();
  const { 잡음, 놓기 } = await 차례를잡는다(
    준비들.map((p) => p.열쇠),
    끊개.signal,
  );
  try {
    if (!잡음) return { 결과: '멈춤' };
    for (const p of 준비들) {
      const 답 = await 준비를부른다(p.준비, { runId, service: p.service, env, origin }, 끊개.signal);
      if (!답.ok) return 답.끊김 ? { 결과: '멈춤' } : { 결과: '실패', note: 답.note };
    }
    도는준비.delete(runId);
    if (멈췄나()) return { 결과: '멈춤' };
    await 돌리기();
    return { 결과: '돎' };
  } finally {
    도는준비.delete(runId);
    놓기();
  }
}
