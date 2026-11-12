// 한 묶음에서 센 오류를 상태와 함께 안정화 표에 넣는다 — 웹 · 앱 · 게임 집계가 같이 쓴다 (도메인/안정화 §3.15 「상태」 · 「견본」)

import type { PoolClient } from 'pg';

import type { 지문 } from './fingerprint.js';
import { 상태정하기, 해결확인인가, type 상태 } from './state.js';

export interface 발생 {
  historyId: number;
  tcId: string;
  itemStatus: string;
  seq: number | null;
  hits: number;
  crash: boolean;
  device: string | null;
}

export interface 견본 {
  historyId: number;
  tcId: string;
  text: string;
  page: string | null;
  device: string | null;
  at: Date;
}

export interface 모은오류 {
  지문: 지문;
  발생: 발생[];
  견본: 견본[];
}

/** 출처마다 읽어 온 것. 판정은 기록이 있는 케이스마다 — 그 케이스의 항목이 다 통과면 true */
export interface 수집 {
  판정: Map<string, boolean>;
  오류: Map<string, 모은오류>;
  crashes: number | null;
}

/** 집계 줄 하나의 자리. runId 는 묶음의 뒤 실행 번호, 시작은 묶음의 앞 실행 시작 시각이다 */
export interface 집계자리 {
  runId: number;
  serviceId: number;
  env: string;
  day: string;
  buildNo: string | null;
  시작: Date;
}

export const 견본글상한 = 8_000;

const 줄로 = (v: unknown): string => JSON.stringify(v);

export async function 집계를저장한다(client: PoolClient, 자리: 집계자리, 모음: 수집): Promise<void> {
  const { runId, serviceId, env } = 자리;
  const 앞 = (
    await client.query<{ run_id: string }>(
      'SELECT run_id FROM stab_run WHERE service_id = $1 AND env = $2 AND run_id < $3 ORDER BY run_id DESC LIMIT 1',
      [serviceId, env, runId],
    )
  ).rows[0];
  const 앞케이스 = new Map<number, number>();
  if (앞 !== undefined) {
    for (const r of (await client.query<{ error_id: string; cases: number }>('SELECT error_id, cases FROM stab_run_error WHERE run_id = $1', [앞.run_id])).rows) {
      앞케이스.set(Number(r.error_id), r.cases);
    }
  }

  const 있던 = new Map<string, { id: number; resolvedAt: Date | null; confirmedRunId: number | null }>();
  for (const r of (
    await client.query<{ id: string; fingerprint: string; resolved_at: Date | null; confirmed_run_id: string | null }>(
      `SELECT id, fingerprint, resolved_at, confirmed_run_id FROM stab_error
        WHERE service_id = $1 AND env = $2 AND fingerprint = ANY($3) FOR UPDATE`,
      [serviceId, env, [...모음.오류.keys()]],
    )
  ).rows) {
    있던.set(r.fingerprint, { id: Number(r.id), resolvedAt: r.resolved_at, confirmedRunId: r.confirmed_run_id === null ? null : Number(r.confirmed_run_id) });
  }

  const 남은: { errorId: number; state: 상태; cases: number; hits: number; prevResolvedAt: Date | null; 오류: 모은오류 }[] = [];
  for (const 오류 of 모음.오류.values()) {
    const cases = new Set(오류.발생.map((o) => o.tcId)).size;
    const hits = 오류.발생.reduce((합, o) => 합 + o.hits, 0);
    const 기록 = 있던.get(오류.지문.fingerprint) ?? null;
    const state = 상태정하기(기록, cases, 기록 === null ? null : (앞케이스.get(기록.id) ?? null), 자리.시작);
    let errorId: number;
    if (기록 === null) {
      const { source, fingerprint, title, message } = 오류.지문;
      errorId = Number(
        (
          await client.query<{ id: string }>(
            `INSERT INTO stab_error (service_id, env, source, fingerprint, title, message, first_run_id, first_day, first_build_no)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [serviceId, env, source, fingerprint, title, message, runId, 자리.day, 자리.buildNo],
          )
        ).rows[0]!.id,
      );
    } else {
      errorId = 기록.id;
      // 실행 시작 전에 해결 처리된 것이 다시 남았다 — 해결 처리를 걷는다. 실행 중에 누른 것은 그대로 둔다(state.ts)
      if (state === 'REOPENED') {
        await client.query('UPDATE stab_error SET resolved_at = NULL, resolved_by = NULL, confirmed_run_id = NULL WHERE id = $1', [errorId]);
      }
    }
    남은.push({ errorId, state, cases, hits, prevResolvedAt: state === 'REOPENED' ? 기록!.resolvedAt : null, 오류 });
  }

  // 이번에 안 남은 해결 처리 종류 중 해결 처리 뒤에 시작한 묶음이 처음 보는 것
  const 남은번호 = new Set(남은.map((e) => e.errorId));
  const 확인 = (
    await client.query<{ id: string; resolved_at: Date; confirmed_run_id: string | null }>(
      'SELECT id, resolved_at, confirmed_run_id FROM stab_error WHERE service_id = $1 AND env = $2 AND resolved_at IS NOT NULL AND confirmed_run_id IS NULL',
      [serviceId, env],
    )
  ).rows
    .filter((r) => !남은번호.has(Number(r.id)) && 해결확인인가({ resolvedAt: r.resolved_at, confirmedRunId: null }, 자리.시작))
    .map((r) => Number(r.id));
  if (확인.length > 0) await client.query('UPDATE stab_error SET confirmed_run_id = $1 WHERE id = ANY($2)', [runId, 확인]);
  const 해결 = Number(
    (
      await client.query<{ n: string }>(
        'SELECT count(*) AS n FROM stab_error WHERE service_id = $1 AND env = $2 AND resolved_at IS NOT NULL AND confirmed_run_id IS NULL',
        [serviceId, env],
      )
    ).rows[0]!.n,
  );

  const 오류케이스 = new Set(남은.flatMap((e) => e.오류.발생.map((o) => o.tcId)));
  await client.query(
    `INSERT INTO stab_run (run_id, service_id, env, day, build_no, cases, error_cases, pass_error_cases, crashes, residual, new_errors, resolved, confirmed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      runId,
      serviceId,
      env,
      자리.day,
      자리.buildNo,
      모음.판정.size,
      오류케이스.size,
      [...오류케이스].filter((tc) => 모음.판정.get(tc) === true).length,
      모음.crashes,
      남은.length,
      남은.filter((e) => e.state === 'NEW').length,
      해결,
      확인.length,
    ],
  );
  if (남은.length === 0) return;

  await client.query(
    `INSERT INTO stab_run_error (run_id, error_id, state, cases, hits, prev_resolved_at)
     SELECT $1, x."errorId", x.state, x.cases, x.hits, x."prevResolvedAt"
       FROM json_to_recordset($2) AS x("errorId" bigint, state text, cases int, hits int, "prevResolvedAt" timestamptz)`,
    [runId, 줄로(남은.map(({ errorId, state, cases, hits, prevResolvedAt }) => ({ errorId, state, cases, hits, prevResolvedAt })))],
  );
  await client.query(
    `INSERT INTO stab_occurrence (run_id, error_id, history_id, tc_id, item_status, seq, hits, crash, device)
     SELECT $1, x."errorId", x."historyId", x."tcId", x."itemStatus", x.seq, x.hits, x.crash, x.device
       FROM json_to_recordset($2) AS x("errorId" bigint, "historyId" bigint, "tcId" text, "itemStatus" text, seq int, hits int, crash boolean, device text)`,
    [runId, 줄로(남은.flatMap((e) => e.오류.발생.map((o) => ({ ...o, errorId: e.errorId }))))],
  );
  for (const e of 남은) await 견본을갈아끼운다(client, e.errorId, runId, e.오류.견본);
}

/** 이번 묶음 것을 앞에, 있던 것을 뒤에 두고 셋만 — 가장 최근 셋이 남는다 */
async function 견본을갈아끼운다(client: PoolClient, errorId: number, runId: number, 새것: 견본[]): Promise<void> {
  const 있던 = (
    await client.query<{ run_id: string; history_id: string; tc_id: string; text: string; page: string | null; device: string | null; at: Date }>(
      'SELECT run_id, history_id, tc_id, text, page, device, at FROM stab_sample WHERE error_id = $1 ORDER BY ord',
      [errorId],
    )
  ).rows.map((r) => ({ runId: Number(r.run_id), historyId: Number(r.history_id), tcId: r.tc_id, text: r.text, page: r.page, device: r.device, at: r.at }));
  const 이번 = [...새것].sort((a, b) => b.at.getTime() - a.at.getTime()).map((s) => ({ ...s, runId, text: s.text.slice(0, 견본글상한) }));
  const 셋 = [...이번, ...있던].slice(0, 3);
  await client.query('DELETE FROM stab_sample WHERE error_id = $1', [errorId]);
  await client.query(
    `INSERT INTO stab_sample (error_id, ord, run_id, history_id, tc_id, text, page, device, at)
     SELECT $1, x.ord, x."runId", x."historyId", x."tcId", x.text, x.page, x.device, x.at
       FROM json_to_recordset($2) AS x(ord smallint, "runId" bigint, "historyId" bigint, "tcId" text, text text, page text, device text, at timestamptz)`,
    [errorId, 줄로(셋.map((s, i) => ({ ...s, ord: i + 1 })))],
  );
}
